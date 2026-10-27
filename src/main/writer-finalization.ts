import {AsyncLocalStorage} from 'node:async_hooks';
import {randomUUID} from 'node:crypto';
import {CUSTOMER_WRITE_NOTICE_SCHEMA,CUSTOMER_WRITE_COMMITTED_NOTICE,CUSTOMER_WRITE_FAILED_NOTICE,validateCustomerWriteNotice,type CustomerWriteNotice} from '../shared/customer-write-notice';

declare const scopeBrand:unique symbol;
export interface CustomerWriteNoticeScope {readonly [scopeBrand]:true;}
type NoticeState={owner:object;started:boolean;closed:boolean;notice?:CustomerWriteNotice};
const noticeStates=new WeakMap<object,NoticeState>(),noticeContext=new AsyncLocalStorage<NoticeState>();
let noticeSequence=0;
export function createCustomerWriteNoticeScope(owner:object):CustomerWriteNoticeScope {
  const scope=Object.freeze(Object.create(null)) as CustomerWriteNoticeScope;
  noticeStates.set(scope,{owner,started:false,closed:false});return scope;
}
function noticeState(scope:CustomerWriteNoticeScope):NoticeState {
  const state=scope&&typeof scope==='object'?noticeStates.get(scope):undefined;
  if(!state)throw new Error('客户写入提醒仅接受本进程创建的调用范围。');return state;
}
/** Await the provider inside this scope; result and original error remain exact. */
export async function runWithCustomerWriteNoticeScope<T>(scope:CustomerWriteNoticeScope,action:()=>T|PromiseLike<T>):Promise<T> {
  const state=noticeState(scope);if(state.started)throw new Error('客户写入提醒调用范围不得重复执行。');state.started=true;
  try{return await noticeContext.run(state,action);}finally{state.closed=true;}
}
export function readCustomerWriteNotice(scope:CustomerWriteNoticeScope,owner:object):CustomerWriteNotice|undefined {
  const state=noticeState(scope);if(state.owner!==owner)throw new Error('客户写入提醒与服务实例不一致。');
  return state.notice?validateCustomerWriteNotice(state.notice):undefined;
}
/** No last-global-notice fallback: unrelated requests cannot inherit metadata. */
export function recordCustomerWriteNotice(owner:object,kind:CustomerWriteNotice['kind']):void {
  const state=noticeContext.getStore();if(!state||state.owner!==owner||state.closed)return;
  noticeSequence=noticeSequence>=Number.MAX_SAFE_INTEGER?1:noticeSequence+1;
  state.notice=validateCustomerWriteNotice({schema:CUSTOMER_WRITE_NOTICE_SCHEMA,kind,id:randomUUID(),sequence:noticeSequence,message:kind==='committed-cleanup'?CUSTOMER_WRITE_COMMITTED_NOTICE:CUSTOMER_WRITE_FAILED_NOTICE,requiresRestart:true});
}

/** Main-only error diagnostics. They convey secondary failures without changing
 * the identity, code, message or cause of the primary thrown value. */
export interface WriterSecondaryFailure {
  readonly phase:'lock-close'|'lock-unlink'|'rollback-close'|'rollback-reopen'|'result-recovery'|'atomic-temp-close'|'atomic-temp-unlink'|'replacement-close';
  readonly error:unknown;
}
const objectFailures=new WeakMap<object,readonly WriterSecondaryFailure[]>();
let primitiveFailure:{primary:unknown;failures:readonly WriterSecondaryFailure[]}|undefined;
let activeInvocation:Map<unknown,readonly WriterSecondaryFailure[]>|undefined;

export function writerSecondaryFailures(primary:unknown):readonly WriterSecondaryFailure[] {
  return primary!==null&&(typeof primary==='object'||typeof primary==='function')
    ?objectFailures.get(primary as object)??[]
    :primitiveFailure&&Object.is(primitiveFailure.primary,primary)?primitiveFailure.failures:[];
}
export function retainWriterSecondaryFailures(primary:unknown,failures:readonly WriterSecondaryFailure[]):void {
  // Only combine phases from this invocation, never an earlier throw of the
  // same Error object or primitive value.
  const recorded=Object.freeze([...(activeInvocation?.get(primary)??[]),...failures].map(item=>Object.freeze({...item})));
  activeInvocation?.set(primary,recorded);
  if(primary!==null&&(typeof primary==='object'||typeof primary==='function'))objectFailures.set(primary as object,recorded);
  else primitiveFailure={primary,failures:recorded};
}

/** A successful lock action alone is not proof of any customer DB commit. */
export class WriterLockCleanupError extends AggregateError {
  readonly failures:readonly WriterSecondaryFailure[];
  constructor(failures:readonly WriterSecondaryFailure[]){
    super(failures.map(item=>item.error),'客户库写锁清理失败，请重新读取当前档案后处理。');
    this.name='WriterLockCleanupError';
    this.failures=Object.freeze(failures.map(item=>Object.freeze({...item})));
    retainWriterSecondaryFailures(this,this.failures);
  }
}

/** Only the local mutation which observed persist() return may create this. */
export class CustomerWriteCommittedError extends Error {
  readonly code='CUSTOMER_WRITE_COMMITTED';
  readonly operation='customer-write';
  readonly committed=true;
  readonly secondaryFailures:readonly WriterSecondaryFailure[];
  readonly resultFinalized:boolean;
  readonly failurePhase:'cleanup'|'result-finalization';
  constructor(cause:unknown,resultFinalized=false){
    super(resultFinalized===true?'本次客户库写入已提交，未回滚；保存清理失败。请重新读取最新档案和方案后继续，勿直接重复生成或提交。':'本次客户库写入已提交，未回滚；结果凭据回填未完成，需要重新读取最新档案和方案核实，勿直接重复生成或提交。',{cause});
    this.name='CustomerWriteCommittedError';
    this.secondaryFailures=writerSecondaryFailures(cause);
    this.resultFinalized=resultFinalized===true;
    this.failurePhase=this.resultFinalized?'cleanup':'result-finalization';
  }
}
const committedErrors=new WeakSet<object>(),committedOwners=new WeakMap<object,WeakSet<object>>();
/** The Store claims this once in a real JS private field during construction.
 * Constructing an Error with an owner argument does not grant commit identity. */
export function createCustomerWriteCommitIssuer(owner:object):(cause:unknown,resultFinalized:boolean)=>CustomerWriteCommittedError {
  if(committedOwners.has(owner))throw new Error('客户写入提交身份已绑定，不接受外部重新领取。');
  const issued=new WeakSet<object>();committedOwners.set(owner,issued);
  return(cause,resultFinalized)=>{const error=new CustomerWriteCommittedError(cause,resultFinalized);issued.add(error);committedErrors.add(error);return error;};
}
export function isCustomerWriteCommittedError(value:unknown,owner?:object):value is CustomerWriteCommittedError {
  return !!value&&typeof value==='object'&&committedErrors.has(value)&&(owner===undefined||committedOwners.get(owner)?.has(value)===true);
}

/** Always attempt both cleanups. Preserve a primary failure verbatim; retain
 * all secondary errors in a main-only diagnostic side channel, including for
 * frozen Error objects. Primitive diagnostics use one bounded last slot. */
export function runWriterWithCleanup<T>(action:()=>T,close:()=>void,unlink:()=>void):T {
  const parent=activeInvocation,invocation=new Map<unknown,readonly WriterSecondaryFailure[]>();
  activeInvocation=invocation;
  try{
    let completed=false,result!:T,primary:unknown;
    try{result=action();completed=true;}catch(error){primary=error;}
    const failures:WriterSecondaryFailure[]=[];
    try{close();}catch(error){failures.push({phase:'lock-close',error});}
    try{unlink();}catch(error){failures.push({phase:'lock-unlink',error});}
    if(!completed){retainWriterSecondaryFailures(primary,failures);throw primary;}
    if(failures.length)throw new WriterLockCleanupError(failures);
    return result;
  }catch(error){
    const nested=invocation.get(error);
    if(parent&&nested)parent.set(error,Object.freeze([...(parent.get(error)??[]),...nested]));
    throw error;
  }finally{activeInvocation=parent;}
}
