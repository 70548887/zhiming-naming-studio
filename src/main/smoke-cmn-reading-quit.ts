/** Smoke-only observer for the actual production native dialog. No UI/IPC API
 * or synthetic choice is added;main forwards its real returned choice. */
export type CmnQuitKind='continue'|'discard';
export interface CmnQuitArmed{requestId:string;kind:CmnQuitKind;requestedAt:number}
export interface CmnQuitReceipt extends CmnQuitArmed{dialogSequence:number;dialogOpenedAt:number;choiceReturnedAt:number;choice:0|1}
export interface CmnQuitEvent extends Partial<CmnQuitReceipt>{phase:'requested'|'dialog-opened'|'choice-returned'|'rejected'|'unbound-dialog'|'ignored-stale-choice';message?:string}
export interface CmnDialogToken{readonly requestId:string;readonly dialogSequence:number}
export interface CmnQuitOptions{requestQuit:()=>void;isDestroyed:()=>boolean;onEvent:(event:CmnQuitEvent)=>void;timeoutMs?:number}
type Pending={armed:CmnQuitArmed;resolve:(receipt:CmnQuitReceipt)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>;token?:CmnDialogToken;dialogOpenedAt?:number};
export function createCmnReadingQuitObserver(options:CmnQuitOptions){
 const timeoutMs=options.timeoutMs??60000;
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>120000)throw new Error('CMN native observer requires a bounded timeout.');
 let pending:Pending|undefined,requestSequence=0,dialogSequence=0,disposed=false;
 const reject=(message:string)=>{
  const active=pending;if(!active)return;pending=undefined;clearTimeout(active.timer);
  try{options.onEvent({...active.armed,phase:'rejected',message});}finally{active.reject(new Error(message));}
 };
 return{
  request(kind:CmnQuitKind,onArmed:(armed:CmnQuitArmed)=>void):Promise<CmnQuitReceipt>{
   if(disposed||options.isDestroyed())return Promise.reject(new Error('CMN native request window is destroyed.'));
   if(pending)return Promise.reject(new Error('CMN native request already pending.'));
   if(kind!=='continue'&&kind!=='discard')return Promise.reject(new Error('CMN native request kind is invalid.'));
   const armed=Object.freeze({requestId:'cmn-native-quit-'+String(++requestSequence),kind,requestedAt:Date.now()});
   return new Promise<CmnQuitReceipt>((resolve,rejectPromise)=>{
    const timer=setTimeout(()=>reject('CMN real native dialog request timed out: '+armed.requestId),timeoutMs);
    pending={armed,resolve,reject:rejectPromise,timer};
    try{options.onEvent({...armed,phase:'requested'});onArmed(armed);options.requestQuit();}
    catch(error){reject('CMN quit initiation failed: '+String(error));}
   });
  },
  dialogOpened():CmnDialogToken|undefined{
   const active=pending;
   if(!active){options.onEvent({phase:'unbound-dialog'});return undefined;}
   if(active.token){reject('CMN duplicate dialog for one pending request.');return undefined;}
   active.token=Object.freeze({requestId:active.armed.requestId,dialogSequence:++dialogSequence});active.dialogOpenedAt=Date.now();
   options.onEvent({...active.armed,...active.token,dialogOpenedAt:active.dialogOpenedAt,phase:'dialog-opened'});return active.token;
  },
  choiceReturned(token:CmnDialogToken|undefined,choice:number):boolean{
   const active=pending;
   if(!active||!token||token!==active.token){options.onEvent({phase:'ignored-stale-choice',requestId:token?.requestId,dialogSequence:token?.dialogSequence});return false;}
   if(choice!==0&&choice!==1){reject('CMN native dialog returned an unexpected choice.');return false;}
   const receipt:CmnQuitReceipt={...active.armed,...token,dialogOpenedAt:active.dialogOpenedAt!,choiceReturnedAt:Date.now(),choice};
   options.onEvent({...receipt,phase:'choice-returned'});
   if((active.armed.kind==='continue'&&choice!==0)||(active.armed.kind==='discard'&&choice!==1)){
    reject('CMN actual native choice did not match requested stage: '+active.armed.requestId);return false;
   }
   pending=undefined;clearTimeout(active.timer);
   // Resolve after the unchanged production handler has finished returning.
   queueMicrotask(()=>{if(active.armed.kind==='continue'&&options.isDestroyed())active.reject(new Error('CMN window destroyed after continue choice.'));else active.resolve(receipt);});
   return true;
  },
  windowDestroyed(){reject('CMN window destroyed before its native choice completed.');},
  dispose(){disposed=true;reject('CMN native observer disposed.');},
  snapshot(){return{pending:pending?{...pending.armed,dialogSequence:pending.token?.dialogSequence}:null,disposed};},
 };
}
