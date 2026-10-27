import {createCustomerWriteNoticeScope,runWithCustomerWriteNoticeScope,readCustomerWriteNotice} from './writer-finalization';
import {validateCustomerWriteNotice,type CustomerWriteNotice} from '../shared/customer-write-notice';
import {observeCustomerWriteInvocation} from './customer-write-notice-invocation';

export interface CustomerWriteNoticeInvocation<T>{result:T;notice?:CustomerWriteNotice;}

/** The owner module authenticates scope identity. Do not inspect error/result
 * JSON for committed flags or manufacture a recovered result in this bridge. */
export async function invokeWithCustomerWriteNotice<T>(owner:object,action:()=>T|PromiseLike<T>,publish?:(notice:CustomerWriteNotice)=>void|PromiseLike<void>):Promise<CustomerWriteNoticeInvocation<T>> {
  const scope=createCustomerWriteNoticeScope(owner);
  const notice=()=>{try{return validateCustomerWriteNotice(readCustomerWriteNotice(scope,owner));}catch{return undefined;}};
  const emit=(value:CustomerWriteNotice|undefined)=>{if(value&&publish)try{const pending=publish(value);if(pending)void Promise.resolve(pending).catch(()=>{});}catch{/* Secondary publication must not replace the primary outcome. */}};
  let warning:CustomerWriteNotice|undefined;
  const result=await observeCustomerWriteInvocation(()=>runWithCustomerWriteNoticeScope(scope,action),()=>{warning=notice();emit(warning);});
  return warning?{result,notice:warning}:{result};
}
