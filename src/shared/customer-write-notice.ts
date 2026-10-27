export const CUSTOMER_WRITE_NOTICE_SCHEMA='customer-write-notice/1' as const;
export const CUSTOMER_WRITE_COMMITTED_NOTICE='客户资料已保存，但保存收尾出现问题。请重新打开应用并核对最新档案，避免重复提交。';
export const CUSTOMER_WRITE_FAILED_NOTICE='本次操作的收尾出现问题。请重新打开应用，核对最新档案后再继续。';
export interface CustomerWriteNotice {
  schema:typeof CUSTOMER_WRITE_NOTICE_SCHEMA;
  kind:'committed-cleanup'|'failed-cleanup';
  id:string;
  sequence:number;
  message:string;
  requiresRestart:true;
}
/** Transport metadata only, never input to naming or source admission. */
export function validateCustomerWriteNotice(value:unknown):CustomerWriteNotice {
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error('客户写入提醒格式无效。');
  const keys=['schema','kind','id','sequence','message','requiresRestart'],own=Reflect.ownKeys(value);
  if(own.length!==keys.length||own.some(key=>typeof key!=='string'||!keys.includes(key)))throw new Error('客户写入提醒含未登记字段。');
  const fields=Object.create(null) as Record<string,unknown>;
  for(const key of keys){const descriptor=Object.getOwnPropertyDescriptor(value,key);if(!descriptor||!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error('客户写入提醒不接受隐藏字段或访问器。');fields[key]=descriptor.value;}
  if(fields.schema!==CUSTOMER_WRITE_NOTICE_SCHEMA||typeof fields.kind!=='string'||!['committed-cleanup','failed-cleanup'].includes(fields.kind)||typeof fields.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(fields.id)||!Number.isSafeInteger(fields.sequence)||(fields.sequence as number)<1||fields.requiresRestart!==true)throw new Error('客户写入提醒身份无效。');
  const message=fields.kind==='committed-cleanup'?CUSTOMER_WRITE_COMMITTED_NOTICE:CUSTOMER_WRITE_FAILED_NOTICE;
  if(fields.message!==message)throw new Error('客户写入提醒只接受固定提示，不传递异常或源数据。');
  return{schema:CUSTOMER_WRITE_NOTICE_SCHEMA,kind:fields.kind as CustomerWriteNotice['kind'],id:fields.id,sequence:fields.sequence as number,message,requiresRestart:true};
}
