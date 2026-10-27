/** Isolated lookalike-native counterexample. No fake constructor/method is
 * invoked by this driver. Their free identifier is an execution tripwire. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {isAbsolute} from 'node:path';

const descriptor=Object.getOwnPropertyDescriptor,defineOwn=Object.defineProperty;
const deleteOwn=Reflect.deleteProperty,parse=JSON.parse,stringify=JSON.stringify;
const call=Function.prototype.call,bind=Function.prototype.bind,toString=Function.prototype.toString;
const functionSource=bind.call(call,toString);
const [entry,entryPin,tableFile,tablePin,selfPin]=process.argv.slice(2);
const digest=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const expectedPin=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const restore=(target,key,original)=>{if(original)defineOwn(target,key,original);else if(!deleteOwn(target,key))throw new Error('M454 lookalike child cleanup failed');};
const sameDescriptor=(a,b)=>a===undefined?b===undefined:!!b
  &&a.value===b.value&&a.get===b.get&&a.set===b.set
  &&a.configurable===b.configurable&&a.enumerable===b.enumerable&&a.writable===b.writable;

// Valid ordinary JavaScript. Reading nativecode is forbidden, not the source read.
function WeakMap(){[nativecode]}
function get(){[nativecode]}
function set(){[nativecode]}

let result;
if(process.env.M454_LOOKALIKE_CHILD!=='1'){
  result={passed:false,phase:'gate',message:'M454 lookalike child gate is closed'};
}else{
  try{
    const self=fileURLToPath(import.meta.url);
    if(!isAbsolute(entry)||!isAbsolute(tableFile)||![entryPin,tablePin,selfPin].every(expectedPin))throw new Error('M454 child requires absolute pinned inputs');
    const observed={entry:digest(entry),table:digest(tableFile),child:digest(self)};
    if(observed.entry!==entryPin||observed.table!==tablePin||observed.child!==selfPin)throw new Error('M454 lookalike input SHA mismatch');
    const raw=parse(readFileSync(tableFile,'utf8')),importUrl=pathToFileURL(entry).href;
    const pending=raw.meaningReviews.find(row=>row.status==='pending');
    const baseline=pending&&raw.baselineCharacters.find(row=>row.char===pending.char);
    if(!pending||!baseline)throw new Error('M454 actual table must contain a pending baseline review');
    const context={packSha256:raw.base.knowledgePackSha256,activeVersion:raw.base.knowledgePackSha256.slice(0,12)};
    defineOwn(WeakMap.prototype,'get',{configurable:true,writable:true,value:get});
    defineOwn(WeakMap.prototype,'set',{configurable:true,writable:true,value:set});
    const sources={constructor:functionSource(WeakMap),get:functionSource(get),set:functionSource(set)};
    const ordinarySourcesExact=sources.constructor==='function WeakMap(){[nativecode]}'
      &&sources.get==='function get(){[nativecode]}'&&sources.set==='function set(){[nativecode]}';
    if(!ordinarySourcesExact)throw new Error('M454 lookalike source-text premise differs');
    const originalWeakMap=descriptor(globalThis,'WeakMap'),originalTripwire=descriptor(globalThis,'nativecode');
    let nativecodeGetterCalls=0,imported=false,publicLookupUsable=false,diagnosticUndefined=false,problem;
    try{
      defineOwn(globalThis,'nativecode',{configurable:true,get(){
        nativecodeGetterCalls++;throw new Error('M454 ordinary lookalike function was executed');
      }});
      defineOwn(globalThis,'WeakMap',{configurable:true,writable:true,value:WeakMap});
      try{
        const module=await import(importUrl);imported=true;
        const lookup=module.createNamingReviewLookup(raw),applicability=lookup.applicability(baseline,context);
        publicLookupUsable=applicability.status===pending.status&&applicability.reason===pending.reason&&applicability.scope===pending.scope;
        diagnosticUndefined=module.readNamingReviewLookupInputJson(lookup)===undefined;
      }catch(error){
        problem={name:error instanceof Error?error.name:typeof error,message:error instanceof Error?error.message:String(error)};
      }
    }finally{
      try{restore(globalThis,'WeakMap',originalWeakMap);}
      finally{restore(globalThis,'nativecode',originalTripwire);}
    }
    const descriptorsRestored=sameDescriptor(originalWeakMap,descriptor(globalThis,'WeakMap'))
      &&sameDescriptor(originalTripwire,descriptor(globalThis,'nativecode'));
    result={passed:ordinarySourcesExact&&imported&&publicLookupUsable&&diagnosticUndefined&&nativecodeGetterCalls===0&&descriptorsRestored&&!problem,phase:'lookalike',observed,sources,ordinarySourcesExact,imported,publicLookupUsable,diagnosticUndefined,nativecodeGetterCalls,descriptorsRestored,...(problem?{problem}:{})};
  }catch(error){
    result={passed:false,phase:'input-or-cleanup',problem:{name:error instanceof Error?error.name:typeof error,message:error instanceof Error?error.message:String(error)}};
  }
}
process.stdout.write(stringify(result)+'\n');
process.exitCode=result.passed?0:1;
