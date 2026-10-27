import type {NamingSession,StudioAPI} from './types';
export type ModernAction='record'|'clear';
export type ModernActionState={pending:false|'record'|'clear';error:string};
export function modernActionError(error:unknown){const text=error instanceof Error?error.message:String(error);return /[A-Za-z]:[\\/]|\.local[\\/]|\b(?:ENOENT|EPERM|node:|file:\/\/)/.test(text)?'操作未完成，当前草稿仍保留。请核对已保存版本和应用资料后重试。':text;}
/** A per-mounted-view controller, with a synchronous latch for duplicate clicks. */
export function createModernActionController(notify:(state:ModernActionState)=>void){
 let active=false;
 return {async run(action:ModernAction,callback:undefined|(()=>Promise<boolean>),blocked:boolean){
  if(blocked||active)return false;active=true;notify({pending:action,error:''});
  try{if(!callback||!await callback()){notify({pending:false,error:'操作未保存，当前草稿仍保留。请核对已保存版本后重试。'});return false;}notify({pending:false,error:''});return true;}
  catch(error){notify({pending:false,error:modernActionError(error)});return false;}
  finally{active=false;}
 }};
}
/** Bridge arguments are only persisted identities and CAS, never a candidate or evidence object. */
export function invokeModernAction(api:Pick<StudioAPI,'recordModernPracticalEvidence'|'clearModernPracticalEvidence'>,action:ModernAction,session:Pick<NamingSession,'id'|'reviewRevision'|'reviewToken'>,candidateId:string){
 const args=[session.id,candidateId,session.reviewRevision??0,session.reviewToken] as const;
 return action==='record'?api.recordModernPracticalEvidence(...args):api.clearModernPracticalEvidence(...args);
}
