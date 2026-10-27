import{describe,it,expect}from'vitest';
import{createCmnSmokeRequestWitness,type CmnSmokeEvidenceFailure}from'../src/main/smoke-cmn-reading-witness';

/** Pure observation-fault unit tests. No Service,worker,IPC,GUI or native
 * process executes here,and results are not counted as native acceptance. */
describe('trace sink failure is separate from the original request settlement',()=>{
 for(const outcome of['resolved','rejected']as const)for(const faultAt of[1,2,3])it(outcome+' request retains its exact settlement when trace write'+faultAt+' throws',async()=>{
  const answer={status:'available',identity:'original answer'},originalError=Error('original Service error'),sinkError=Error('diagnostic disk failure'),reports:CmnSmokeEvidenceFailure[]=[];let calls=0,writes=0;
  const witness=createCmnSmokeRequestWitness(()=>({active:true,pending:1,closed:false}),()=>{writes++;if(writes===faultAt)throw sinkError;},failure=>reports.push(failure));
  const pending=witness.observe('长',()=>{calls++;return outcome==='resolved'?Promise.resolve(answer):Promise.reject(originalError);});
  if(outcome==='resolved')expect(await pending).toBe(answer);else await expect(pending).rejects.toBe(originalError);
  expect(calls).toBe(1);expect(writes).toBe(3);expect(witness.records[0].status).toBe(outcome==='resolved'?'available':'rejected');expect(witness.records[0].status==='rejected').toBe(outcome==='rejected');
  expect(witness.evidenceFailures()).toHaveLength(1);expect(reports).toHaveLength(1);expect(reports[0].phase).toBe(['begin:persist','dispatched:persist','settled:persist'][faultAt-1]);expect(reports[0].requestId).toBe('cmn-real-request-1');
  expect(()=>witness.assertTraceComplete()).toThrow('observer evidence incomplete');witness.dispose();
 });
 it('keeps a successful answer even when snapshot callbacks fail,while exposing unknown snapshots as null',async()=>{
  const answer={status:'available'},w=createCmnSmokeRequestWitness(()=>{throw Error('snapshot failure');},()=>{});let calls=0;
  expect(await w.observe('长',async()=>{calls++;return answer;})).toBe(answer);expect(calls).toBe(1);expect(w.records[0].status).toBe('available');expect(w.records[0].before).toBeNull();expect(w.records[0].dispatched).toBeNull();expect(w.records[0].settled).toBeNull();expect(w.evidenceFailures()).toHaveLength(3);expect(()=>w.assertTraceComplete()).toThrow('evidence incomplete');w.dispose();
 });
 it('isolates a failing secondary error reporter as another evidence failure,not a new Service error',async()=>{
  const original=Error('original request failure'),sink=Error('sink failure'),report=Error('secondary reporter failure');let writes=0,calls=0;
  const w=createCmnSmokeRequestWitness(()=>({active:true,pending:0,closed:false}),()=>{if(++writes===3)throw sink;},()=>{throw report;});
  await expect(w.observe('沈',()=>{calls++;return Promise.reject(original);})).rejects.toBe(original);
  expect(calls).toBe(1);expect(w.records[0].status).toBe('rejected');expect(w.evidenceFailures().map(f=>f.phase)).toEqual(['settled:persist','failure-report']);expect(()=>w.assertTraceComplete()).toThrow('2 failure(s)');w.dispose();
 });
 it('an entirely broken trace sink cannot prevent or duplicate the real request,or allow harness acceptance',async()=>{
  const answer={status:'available'};let calls=0,accepted=false;const reported:CmnSmokeEvidenceFailure[]=[],w=createCmnSmokeRequestWitness(()=>({active:true,pending:1,closed:false}),()=>{throw Error('all trace writes failed');},f=>reported.push(f));
  expect(await w.observe('长',async()=>{calls++;return answer;})).toBe(answer);try{w.assertTraceComplete();accepted=true;}catch{/* Separate harness result rejects incomplete evidence. */}
  expect(calls).toBe(1);expect(accepted).toBe(false);expect(w.records[0].status).toBe('available');expect(reported).toHaveLength(3);w.dispose();
 });
 it('stable observations remain complete and retain the real dispatch snapshot',async()=>{
  let pending=0;const answer={status:'available'},w=createCmnSmokeRequestWitness(()=>({active:true,pending,closed:false}),()=>{}),arm=w.arm('长');
  expect(await w.observe('长',()=>{pending=1;return Promise.resolve(answer).then(value=>{pending=0;return value;});})).toBe(answer);
  const row=await w.waitForDispatched(arm);expect(row.dispatched?.pending).toBe(1);expect(row.settled?.pending).toBe(0);expect(w.evidenceFailures()).toEqual([]);expect(()=>w.assertTraceComplete()).not.toThrow();w.dispose();
 });
});
