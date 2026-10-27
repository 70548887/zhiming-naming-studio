import type{BrowserWindow}from'electron';

export interface CmnSmokeWorkerSnapshot{active:boolean;pending:number;closed:boolean}
export interface CmnSmokeRequestRecord{
 id:number;requestId:string;char:string;startedAt:number;before:CmnSmokeWorkerSnapshot|null;
 dispatchedAt?:number;dispatched?:CmnSmokeWorkerSnapshot|null;finishedAt?:number;status?:string;settled?:CmnSmokeWorkerSnapshot|null;
}
export interface CmnSmokeRequestArm{armId:string;char:string;afterId:number;armedAt:number}
/** Observes real Service calls and real snapshots only. The caller starts the
 * original request before dispatched(),without adding any response delay. */
export interface CmnSmokeEvidenceFailure{phase:string;requestId?:string;at:number;message:string}
export function createCmnSmokeRequestWitness(snapshot:()=>CmnSmokeWorkerSnapshot,persist:(rows:readonly CmnSmokeRequestRecord[])=>void,reportFailure?:(failure:CmnSmokeEvidenceFailure)=>void){
 const records:CmnSmokeRequestRecord[]=[],arms=new Set<CmnSmokeRequestArm>(),waiters=new Map<CmnSmokeRequestArm,{resolve:(row:CmnSmokeRequestRecord)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>();let sequence=0,armSequence=0;
 const matching=(arm:CmnSmokeRequestArm)=>records.find(row=>row.id>arm.afterId&&row.char===arm.char&&row.dispatchedAt!==undefined);
 const failures:CmnSmokeEvidenceFailure[]=[],message=(error:unknown)=>{try{return String(error);}catch{return 'Unprintable diagnostic callback failure';}};
 const failed=(phase:string,row:CmnSmokeRequestRecord|undefined,error:unknown)=>{const failure=Object.freeze({phase,requestId:row?.requestId,at:Date.now(),message:message(error)});failures.push(failure);if(reportFailure)try{reportFailure(failure);}catch(reportError){failures.push(Object.freeze({phase:'failure-report',requestId:row?.requestId,at:Date.now(),message:message(reportError)}));}};
 const readSnapshot=(phase:string,row?:CmnSmokeRequestRecord):CmnSmokeWorkerSnapshot|null=>{try{return{...snapshot()};}catch(error){failed(phase+':snapshot',row,error);return null;}};
 const persistTrace=(phase:string,row:CmnSmokeRequestRecord)=>{try{persist(records);}catch(error){failed(phase+':persist',row,error);}};
 return{
  records,
  evidenceFailures(){return failures.map(f=>({...f}));},
  assertTraceComplete(){if(failures.length)throw new Error('CMN smoke observer evidence incomplete: '+failures.length+' failure(s); '+failures[0].phase+'; '+failures[0].message);},
  arm(char:string){const value=Object.freeze({armId:'cmn-real-arm-'+String(++armSequence),char,afterId:sequence,armedAt:Date.now()});arms.add(value);return value;},
  begin(char:string){const row:CmnSmokeRequestRecord={id:++sequence,requestId:'cmn-real-request-'+String(sequence),char,startedAt:Date.now(),before:null};records.push(row);row.before=readSnapshot('begin',row);persistTrace('begin',row);return row;},
  dispatched(row:CmnSmokeRequestRecord){row.dispatchedAt=Date.now();row.dispatched=readSnapshot('dispatched',row);persistTrace('dispatched',row);for(const[arm,waiter]of waiters){if(matching(arm)===row){clearTimeout(waiter.timer);waiters.delete(arm);arms.delete(arm);waiter.resolve(row);}}},
  settled(row:CmnSmokeRequestRecord,status:string){row.finishedAt=Date.now();row.status=status;row.settled=readSnapshot('settled',row);persistTrace('settled',row);},
  async observe<T extends{status:string}>(char:string,request:()=>Promise<T>):Promise<T>{
   const row=this.begin(char);let dispatched=false;
   try{const pending=request();this.dispatched(row);dispatched=true;const result=await pending;this.settled(row,result.status);return result;}
   catch(error){if(!dispatched)this.dispatched(row);this.settled(row,'rejected');throw error;}
  },
  waitForDispatched(arm:CmnSmokeRequestArm,timeoutMs=15000):Promise<CmnSmokeRequestRecord>{
   if(!arms.has(arm)||waiters.has(arm))return Promise.reject(new Error('CMN smoke request arm is stale or already consumed.'));
   const found=matching(arm);if(found){arms.delete(arm);return Promise.resolve(found);}
   if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>15000)return Promise.reject(new Error('CMN smoke request witness requires its existing bounded timeout.'));
   return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{waiters.delete(arm);arms.delete(arm);reject(new Error('CMN smoke observed no matching actual request dispatch: '+arm.armId));},timeoutMs);waiters.set(arm,{resolve,reject,timer});});
  },
  dispose(){for(const[arm,waiter]of waiters){clearTimeout(waiter.timer);waiter.reject(new Error('CMN smoke witness disposed.'));arms.delete(arm);}waiters.clear();arms.clear();},
 };
}
/** Actual native focus is a keyboard input precondition,not a synthetic key or
 * dialog response. DOM summary focus is still performed by the existing view. */
export async function focusCmnSmokeNativeWindow(window:BrowserWindow,timeoutMs=3000){
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>3000)throw Error('CMN native focus wait must be bounded.');
 if(window.isDestroyed())throw Error('CMN native keyboard window is destroyed.');
 const before={windowFocused:window.isFocused(),contentsFocused:window.webContents.isFocused()};
 if(!window.isFocused()){
  let focused:(()=>void)|undefined,destroyed:(()=>void)|undefined,timer:ReturnType<typeof setTimeout>|undefined;
  try{await new Promise<void>((resolve,reject)=>{
   focused=()=>resolve();destroyed=()=>reject(new Error('CMN keyboard window destroyed while requesting focus.'));
   window.once('focus',focused);window.once('closed',destroyed);
   timer=setTimeout(()=>reject(new Error('CMN actual native window did not acquire focus.')),timeoutMs);
   window.focus();if(window.isFocused())resolve();
  });}finally{if(timer)clearTimeout(timer);if(focused)window.removeListener('focus',focused);if(destroyed)window.removeListener('closed',destroyed);}
 }
 window.webContents.focus();
 const after={windowFocused:window.isFocused(),contentsFocused:window.webContents.isFocused()};
 if(!after.windowFocused||!after.contentsFocused)throw Error('CMN real keyboard focus precondition not satisfied.');
 return{before,after};
}
