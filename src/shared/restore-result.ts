/** Only the committed recovery warning crosses the public bridge; local error details stay in main. */
export interface CustomerRestoreCommittedWarning {
  status:'committed-with-warning';
  warning:string;
}
export type CustomerRestoreResult=boolean|CustomerRestoreCommittedWarning;

export const CUSTOMER_RESTORE_COMMITTED_WARNING='客户备份已恢复，新客户库已启用；后续收尾发生错误。请关闭并重新打开应用，核对当前档案。';

/** Read a narrow public result without invoking accessors or silently treating an object as true. */
export function readCustomerRestoreResult(value:unknown):CustomerRestoreResult {
  if(typeof value==='boolean')return value;
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('恢复结果格式无效，请重新读取当前档案。');
  const prototype=Object.getPrototypeOf(value),keys=Reflect.ownKeys(value);
  if(prototype!==Object.prototype&&prototype!==null||keys.length!==2||!keys.includes('status')||!keys.includes('warning'))throw new Error('恢复结果格式无效，请重新读取当前档案。');
  const status=Object.getOwnPropertyDescriptor(value,'status'),warning=Object.getOwnPropertyDescriptor(value,'warning');
  if(!status||!warning||!Object.hasOwn(status,'value')||!Object.hasOwn(warning,'value')||!status.enumerable||!warning.enumerable||status.value!=='committed-with-warning'||typeof warning.value!=='string'||!warning.value.trim())throw new Error('恢复结果格式无效，请重新读取当前档案。');
  return{status:'committed-with-warning',warning:warning.value};
}
