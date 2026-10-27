import type {
  ControlBudgetNode,ControlBudgetEdge,ControlBudgetInterval,ControlBudgetFixedCoefficient,
  ControlBudgetEdgeLoss,ControlBudgetIssue,ControlBudgetCertificate,ControlBudgetSettlement,
  UnclosedControlBudgetSettlement
} from './control-budget-types';

export const CONTROL_BUDGET_VERSION='control-budget/1.0.0' as const;
export const CONTROL_BUDGET_EPSILON=1e-9 as const;
export const CONTROL_BUDGET_MAX_ITERATIONS=64 as const;
export const CONTROL_BUDGET_FRACTION=0.25 as const;
export const CONTROL_BUDGET_MAX_LOSS_FRACTION=0.8 as const;

const bitsView=new DataView(new ArrayBuffer(8));
const QUARTER_UNITS=1n<<1072n;
const lexical=(a:string,b:string)=>a<b?-1:a>b?1:0;
const record=<T>(entries:Array<[string,T]>):Record<string,T>=>Object.fromEntries(entries);
const finite=(value:number)=>{if(!Number.isFinite(value))throw new Error('Non-finite intermediate arithmetic');return value;};

// Adjacent IEEE-754 doubles give conservative directed arithmetic, including
// gradual underflow. Zero operations are exact and do not inflate intervals.
function nextUp(value:number):number {
  if(value===Infinity)return value;
  if(value===0)return Number.MIN_VALUE;
  bitsView.setFloat64(0,value,false);
  bitsView.setBigUint64(0,bitsView.getBigUint64(0,false)+(value>0?1n:-1n),false);
  return bitsView.getFloat64(0,false);
}
function nextDown(value:number):number {
  if(value===-Infinity)return value;
  if(value===0)return -Number.MIN_VALUE;
  bitsView.setFloat64(0,value,false);
  bitsView.setBigUint64(0,bitsView.getBigUint64(0,false)+(value>0?-1n:1n),false);
  return bitsView.getFloat64(0,false);
}
function addUp(a:number,b:number):number {return a===0?b:b===0?a:finite(nextUp(finite(a+b)));}
function addDown(a:number,b:number):number {return a===0?b:b===0?a:Math.max(0,nextDown(finite(a+b)));}
function multiplyUp(a:number,b:number):number {return a===0||b===0?0:finite(nextUp(finite(a*b)));}
function multiplyDown(a:number,b:number):number {return a===0||b===0?0:Math.max(0,nextDown(finite(a*b)));}
function subtractUp(a:number,b:number):number {return b===0?a:a===b?0:finite(nextUp(finite(a-b)));}
function subtractDown(a:number,b:number):number {return b===0?a:a===b?0:finite(nextDown(finite(a-b)));}
function divideUp(a:number,b:number):number {return a===0?0:finite(nextUp(finite(a/b)));}
function divideDown(a:number,b:number):number {return a===0?0:Math.max(0,nextDown(finite(a/b)));}
function distanceUp(a:number,b:number):number {return a===b?0:finite(nextUp(Math.abs(finite(a-b))));}
function multiplyBounds(a:ControlBudgetInterval,b:ControlBudgetInterval):ControlBudgetInterval {
  return {lower:multiplyDown(a.lower,b.lower),upper:multiplyUp(a.upper,b.upper)};
}
function intervalDistance(value:number,bounds:ControlBudgetInterval):number {
  return Math.max(distanceUp(value,bounds.lower),distanceUp(value,bounds.upper));
}

/** A finite nonnegative double is an exact integer multiple of 2^-1074. */
function exactBinaryUnits(value:number):bigint {
  if(value===0)return 0n;
  bitsView.setFloat64(0,value,false);
  const bits=bitsView.getBigUint64(0,false),exponent=Number((bits>>52n)&0x7ffn),fraction=bits&((1n<<52n)-1n);
  return exponent===0?fraction:((1n<<52n)|fraction)<<BigInt(exponent-1);
}

interface ValidatedGraph {
  nodes:ControlBudgetNode[];edges:ControlBudgetFixedCoefficient[];sourceIds:string[];disabledEdgeIds:string[];
  columnSums:Record<string,number>;columnSumUpperBounds:Record<string,number>;q:number;
  sourceIndices:number[];targetIndices:number[];incoming:number[][];
}
function validateGraph(nodesInput:readonly ControlBudgetNode[],edgesInput:readonly ControlBudgetEdge[],disabledInput:readonly string[]):
  {graph:ValidatedGraph|null;issues:ControlBudgetIssue[]} {
  const issues:ControlBudgetIssue[]=[],nodes:ControlBudgetNode[]=[],edges:ControlBudgetEdge[]=[];
  const issue=(code:string,message:string,extra:Partial<ControlBudgetIssue>={})=>issues.push({code,message,...extra});
  if(!Array.isArray(nodesInput)||!Array.isArray(edgesInput)||!Array.isArray(disabledInput))return {graph:null,issues:[{code:'invalid-arrays',message:'Nodes, edges and disabled edge IDs must be arrays.'}]};
  const nodeIds=new Set<string>(),edgeIds=new Set<string>(),disabledIds=new Set<string>();
  const validId=(value:unknown):value is string=>typeof value==='string'&&value.trim().length>0;
  for(const raw of nodesInput){
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||!validId(raw.id)){issue('invalid-node','Each node needs a nonempty string ID.');continue;}
    if(nodeIds.has(raw.id))issue('duplicate-node-id','Duplicate node ID.',{nodeId:raw.id});
    nodeIds.add(raw.id);
    if(typeof raw.capacity!=='number'||!Number.isFinite(raw.capacity)||raw.capacity<0)issue('invalid-capacity','Capacity must be finite and nonnegative.',{nodeId:raw.id});
    else nodes.push({id:raw.id,capacity:raw.capacity});
  }
  for(const raw of edgesInput){
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||!validId(raw.id)){issue('invalid-edge','Each edge needs a nonempty string ID.');continue;}
    if(edgeIds.has(raw.id))issue('duplicate-edge-id','Duplicate edge ID.',{edgeId:raw.id});
    edgeIds.add(raw.id);
    if(!validId(raw.source)||!nodeIds.has(raw.source))issue('unknown-source','Edge source must name an existing node.',{edgeId:raw.id});
    if(!validId(raw.target)||!nodeIds.has(raw.target))issue('unknown-target','Edge target must name an existing node.',{edgeId:raw.id});
    if(typeof raw.coefficient!=='number'||!Number.isFinite(raw.coefficient)||raw.coefficient<0)issue('invalid-coefficient','Coefficient must be finite and nonnegative.',{edgeId:raw.id});
    if(raw.pathFactor!==undefined&&(typeof raw.pathFactor!=='number'||!Number.isFinite(raw.pathFactor)||raw.pathFactor<0))issue('invalid-path-factor','Path metadata must be finite and nonnegative.',{edgeId:raw.id});
    edges.push({id:raw.id,source:raw.source,target:raw.target,coefficient:raw.coefficient,...(raw.pathFactor===undefined?{}:{pathFactor:raw.pathFactor})});
  }
  for(const id of disabledInput){
    if(!validId(id)||!edgeIds.has(id))issue('unknown-disabled-edge','Disabled IDs must name existing edges.',typeof id==='string'?{edgeId:id}:{});
    if(disabledIds.has(id))issue('duplicate-disabled-edge','Disabled edge IDs must not repeat.',{edgeId:id});
    disabledIds.add(id);
  }
  if(issues.length)return {graph:null,issues};
  nodes.sort((a,b)=>lexical(a.id,b.id));edges.sort((a,b)=>lexical(a.id,b.id));
  const index=new Map(nodes.map((node,i)=>[node.id,i])),columnSums:Record<string,number>=record(nodes.map(node=>[node.id,0]));
  const columnSumUpperBounds:Record<string,number>=record(nodes.map(node=>[node.id,0]));
  const exactSums=new Map(nodes.map(node=>[node.id,0n]));
  for(const edge of edges)exactSums.set(edge.source,exactSums.get(edge.source)!+exactBinaryUnits(edge.coefficient));
  for(const node of nodes)if(exactSums.get(node.id)!>QUARTER_UNITS)issue('column-budget-exceeded','Exact binary coefficient column sum exceeds 0.25.',{nodeId:node.id});
  if(issues.length)return {graph:null,issues};
  // The exact integer comparison above proves q<=.25. Outward accumulation is
  // therefore safely intersected with that independently proved upper bound.
  for(const edge of edges){
    columnSums[edge.source]=finite(columnSums[edge.source]+edge.coefficient);
    columnSumUpperBounds[edge.source]=Math.min(0.25,addUp(columnSumUpperBounds[edge.source],edge.coefficient));
  }
  const fixed=edges.map(edge=>({...edge,disabled:disabledIds.has(edge.id)}));
  const incoming=nodes.map(()=>[] as number[]),sourceIndices=fixed.map(edge=>index.get(edge.source)!),targetIndices=fixed.map(edge=>index.get(edge.target)!);
  fixed.forEach((_,i)=>incoming[targetIndices[i]].push(i));
  return {graph:{nodes,edges:fixed,sourceIds:[...new Set(edges.map(edge=>edge.source))].sort(lexical),disabledEdgeIds:[...disabledIds].sort(lexical),
    columnSums,columnSumUpperBounds,q:Math.max(0,...Object.values(columnSumUpperBounds)),sourceIndices,targetIndices,incoming},issues};
}

interface Evaluation {
  proposals:number[];proposalBounds:ControlBudgetInterval[];raw:number[];rawBounds:ControlBudgetInterval[];
  caps:number[];capBounds:ControlBudgetInterval[];losses:number[];lossBounds:ControlBudgetInterval[];
  next:number[];nextBounds:ControlBudgetInterval[];
}
function evaluate(graph:ValidatedGraph,x:readonly number[],bounds?:readonly ControlBudgetInterval[]):Evaluation {
  const proposals:number[]=[],proposalBounds:ControlBudgetInterval[]=[];
  graph.edges.forEach((edge,i)=>{
    const source=graph.sourceIndices[i];
    proposals.push(edge.disabled?0:finite(edge.coefficient*x[source]));
    proposalBounds.push(edge.disabled?{lower:0,upper:0}:multiplyBounds({lower:edge.coefficient,upper:edge.coefficient},bounds?.[source]??{lower:x[source],upper:x[source]}));
  });
  const raw:number[]=[],rawBounds:ControlBudgetInterval[]=[],caps:number[]=[],capBounds:ControlBudgetInterval[]=[];
  const losses:number[]=[],lossBounds:ControlBudgetInterval[]=[],next:number[]=[],nextBounds:ControlBudgetInterval[]=[];
  graph.nodes.forEach((node,i)=>{
    let nominal=0,lower=0,upper=0;
    for(const edgeIndex of graph.incoming[i]){
      nominal=finite(nominal+proposals[edgeIndex]);
      lower=addDown(lower,proposalBounds[edgeIndex].lower);upper=addUp(upper,proposalBounds[edgeIndex].upper);
    }
    const cap=finite(0.8*node.capacity),capInterval=multiplyBounds({lower:nextDown(0.8),upper:nextUp(0.8)},{lower:node.capacity,upper:node.capacity});
    capInterval.lower=Math.max(0,capInterval.lower);capInterval.upper=Math.min(node.capacity,capInterval.upper);
    const loss=Math.min(cap,nominal),lossInterval={lower:Math.min(capInterval.lower,lower),upper:Math.min(capInterval.upper,upper)};
    raw.push(nominal);rawBounds.push({lower,upper});caps.push(cap);capBounds.push(capInterval);losses.push(loss);lossBounds.push(lossInterval);
    next.push(finite(node.capacity-loss));
    nextBounds.push({lower:Math.max(0,subtractDown(node.capacity,lossInterval.upper)),upper:Math.min(node.capacity,subtractUp(node.capacity,lossInterval.lower))});
  });
  return {proposals,proposalBounds,raw,rawBounds,caps,capBounds,losses,lossBounds,next,nextBounds};
}

function blankCertificate():ControlBudgetCertificate {
  return {version:CONTROL_BUDGET_VERSION,epsilon:CONTROL_BUDGET_EPSILON,maxIterations:CONTROL_BUDGET_MAX_ITERATIONS,
    controlFraction:CONTROL_BUDGET_FRACTION,maxLossFraction:CONTROL_BUDGET_MAX_LOSS_FRACTION,
    nodes:[],fixedCoefficients:[],sourceIds:[],disabledEdgeIds:[],columnSums:{},columnSumUpperBounds:{},iterations:0,
    lastL1Delta:null,lastL1DeltaUpperBound:null,theoreticalIterationErrorBound:null,contractionUpperBound:null,
    roundoffBound:null,iterationErrorBound:null,roundoffErrorBound:null,errorBound:null,residualL1UpperBound:null,issues:[]};
}
function unclosed(certificate:ControlBudgetCertificate,failureReason:UnclosedControlBudgetSettlement['failureReason']):UnclosedControlBudgetSettlement {
  return {...certificate,status:'unclosed',failureReason,remaining:null,remainingBounds:null,totalLossByNode:null,totalLossBoundsByNode:null,lossByEdge:[]};
}
function edgeLosses(graph:ValidatedGraph,settled:Evaluation):ControlBudgetEdgeLoss[] {
  return graph.edges.map((edge,i)=>{
    const target=graph.targetIndices[i],raw=settled.raw[target],cap=settled.caps[target],proposal=settled.proposals[i];
    const p=settled.proposalBounds[i],sum=settled.rawBounds[target],k=settled.capBounds[target];
    const targetScale=raw<=cap?1:finite(cap/raw);
    // Use the finite scale when representable; otherwise form the share first.
    // Either K/S or p/S can underflow before a representable final product.
    // Unused capped budget is never redistributed.
    const loss=raw===0?0:raw<=cap?proposal:targetScale>0?finite(proposal*targetScale):finite(cap*finite(proposal/raw));
    let lower=0,upper=0;
    if(sum.upper>0){
      const shareLower=divideDown(p.lower,sum.upper),shareUpper=p.upper>=sum.lower?1:Math.min(1,divideUp(p.upper,sum.lower));
      lower=Math.min(p.lower,multiplyDown(k.lower,shareLower));
      upper=Math.min(p.upper,multiplyUp(k.upper,shareUpper));
    }
    return {...edge,proposal,proposalLowerBound:p.lower,proposalUpperBound:p.upper,loss,lossLowerBound:lower,lossUpperBound:upper,targetScale};
  });
}

/**
 * Solve one frozen graph with synchronous Jacobi updates from C. Disabling an
 * edge zeros only its proposal; original coefficients, column sums and paths
 * are neither recomputed nor redistributed. No legacy fallback is supplied.
 */
export function settleControlBudget(
  nodes:readonly ControlBudgetNode[],edges:readonly ControlBudgetEdge[],disabledEdgeIds:readonly string[]=[]
):ControlBudgetSettlement {
  const certificate=blankCertificate();
  let graph:ValidatedGraph;
  try{
    const validated=validateGraph(nodes,edges,disabledEdgeIds);
    certificate.issues=validated.issues;
    if(!validated.graph)return unclosed(certificate,'invalid-graph');
    graph=validated.graph;
  }catch(error){certificate.issues=[{code:'invalid-graph',message:error instanceof Error?error.message:String(error)}];return unclosed(certificate,'invalid-graph');}
  Object.assign(certificate,{nodes:graph.nodes,fixedCoefficients:graph.edges,sourceIds:graph.sourceIds,disabledEdgeIds:graph.disabledEdgeIds,
    columnSums:graph.columnSums,columnSumUpperBounds:graph.columnSumUpperBounds,contractionUpperBound:graph.q});
  let x=graph.nodes.map(node=>node.capacity);
  try{
    const denominator=subtractDown(1,graph.q);
    for(let iteration=1;iteration<=CONTROL_BUDGET_MAX_ITERATIONS;iteration++){
      certificate.iterations=iteration;
      const step=evaluate(graph,x);
      let delta=0,deltaUpper=0,roundoff=0;
      step.next.forEach((value,i)=>{
        delta=finite(delta+Math.abs(finite(value-x[i])));
        deltaUpper=addUp(deltaUpper,distanceUp(value,x[i]));
        roundoff=addUp(roundoff,intervalDistance(value,step.nextBounds[i]));
      });
      const iterationErrorBound=divideUp(multiplyUp(graph.q,deltaUpper),denominator),roundoffErrorBound=divideUp(roundoff,denominator);
      const errorBound=addUp(iterationErrorBound,roundoffErrorBound);
      Object.assign(certificate,{lastL1Delta:delta,lastL1DeltaUpperBound:deltaUpper,theoreticalIterationErrorBound:finite(delta/3),
        roundoffBound:roundoff,iterationErrorBound,roundoffErrorBound,errorBound});
      x=step.next;
      if(delta>CONTROL_BUDGET_EPSILON||errorBound>CONTROL_BUDGET_EPSILON)continue;

      const remainingBounds=graph.nodes.map((node,i)=>({lower:Math.max(0,subtractDown(x[i],errorBound)),upper:Math.min(node.capacity,addUp(x[i],errorBound))}));
      const settled=evaluate(graph,x,remainingBounds),atReturned=evaluate(graph,x);
      let residual=0;atReturned.nextBounds.forEach((bounds,i)=>{residual=addUp(residual,intervalDistance(x[i],bounds));});
      certificate.residualL1UpperBound=residual;
      const lossByEdge=edgeLosses(graph,settled);
      return {...certificate,status:'closed',failureReason:null,lastL1Delta:delta,lastL1DeltaUpperBound:deltaUpper,
        theoreticalIterationErrorBound:finite(delta/3),contractionUpperBound:graph.q,roundoffBound:roundoff,iterationErrorBound,roundoffErrorBound,errorBound,
        residualL1UpperBound:residual,remaining:record(graph.nodes.map((node,i)=>[node.id,x[i]])),
        remainingBounds:record(graph.nodes.map((node,i)=>[node.id,remainingBounds[i]])),
        totalLossByNode:record(graph.nodes.map((node,i)=>[node.id,settled.losses[i]])),
        totalLossBoundsByNode:record(graph.nodes.map((node,i)=>[node.id,settled.lossBounds[i]])),lossByEdge};
    }
    certificate.issues.push({code:'convergence-unverified',message:'The fixed graph did not meet both delta and complete error bounds within 64 iterations.'});
    return unclosed(certificate,certificate.lastL1Delta!==null&&certificate.lastL1Delta<=CONTROL_BUDGET_EPSILON?'uncertified-roundoff':'not-converged');
  }catch(error){
    // Retain frozen graph identity and completed diagnostics, but no budgets.
    certificate.issues.push({code:'non-finite-arithmetic',message:error instanceof Error?error.message:String(error)});
    return unclosed(certificate,'non-finite');
  }
}
