/** Transport-only observation. It never infers commit from returned JSON or
 * recovers an exception: the Service owner remains responsible for that. */
export type CustomerWriteInvocationOutcome=
 |{status:'fulfilled';value:unknown}
 |{status:'rejected';reason:unknown};

/** Keep synchronous calls synchronous and retain each invocation's own outcome.
 * Notice lookup/publication is best effort and cannot replace its result/error. */
export function observeCustomerWriteInvocation<T>(invoke:()=>T,after:(outcome:CustomerWriteInvocationOutcome)=>void):T {
  const observe=(outcome:CustomerWriteInvocationOutcome)=>{try{after(outcome);}catch{/* The invocation outcome is authoritative. */}};
  let result:T;
  try{result=invoke();}catch(reason){observe({status:'rejected',reason});throw reason;}
  if(result instanceof Promise)return result.then(value=>{observe({status:'fulfilled',value});return value;},reason=>{observe({status:'rejected',reason});throw reason;}) as T;
  observe({status:'fulfilled',value:result});return result;
}
