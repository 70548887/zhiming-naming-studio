import {readCustomerRestoreResult,type CustomerRestoreResult} from '../shared/restore-result';

export interface CustomerRestoreDependencies {
  restore:()=>Promise<CustomerRestoreResult>;
  refresh:()=>Promise<unknown>;
  reset:()=>void;
  notice:(text:string,error?:boolean)=>void;
}

const refreshFailureNotice='客户档案已恢复，但当前界面读取失败。请关闭并重新打开应用。';

/** Reset drafts only after the committed archive has been read successfully. */
export async function completeCustomerRestore(deps:CustomerRestoreDependencies):Promise<void> {
  const result=readCustomerRestoreResult(await deps.restore());
  if(result===false){
    deps.notice('已取消恢复备份，当前数据未改变。');
    return;
  }
  try{
    await deps.refresh();
  }catch{
    deps.notice(refreshFailureNotice,true);
    return;
  }
  deps.reset();
  if(result===true)deps.notice('备份已恢复，当前界面已重新读取。');
  else deps.notice(result.warning,true);
}
