import {types} from 'node:util';
import type {BirthProfile} from '../shared/types';

export const QIONGTONG_CLAUSE_INPUT_LIMITS=Object.freeze({maxDepth:24,maxArrayLength:4096,maxNodes:25000,maxScalarBytes:200000});
const PROFILE_FIELDS=['id','customerName','surname','surnamePinyin','gender','calendar','birthDate','leapMonth','birthTime','timeUnknown','birthPlace','timezone','notes','fatherName','motherName','parentNameReadings','namingPreferences','monthAuthorityMethod','seasonalMethod','timeBasis','birthLongitude','renMethod'];
const OPTIONAL_PROFILE_FIELDS=['fatherName','motherName','parentNameReadings','namingPreferences','monthAuthorityMethod','seasonalMethod','timeBasis','birthLongitude','renMethod'];

export function readQiongtongClausePreviewProfile(input:unknown):BirthProfile {
  if(types.isProxy(input))throw new Error('字面条件预览拒绝代理输入。');
  if(!input||typeof input!=='object'||Array.isArray(input)||![Object.prototype,null].includes(Object.getPrototypeOf(input)))throw new Error('字面条件预览输入须为普通出生资料。');
  const budget={nodes:0,scalarBytes:0};
  function charge(text:string):void {
    const remaining=QIONGTONG_CLAUSE_INPUT_LIMITS.maxScalarBytes-budget.scalarBytes;
    if(text.length>remaining)throw new Error('字面条件预览累计字符串/标量字节超出预算。');
    budget.scalarBytes+=Buffer.byteLength(text,'utf8');
    if(budget.scalarBytes>QIONGTONG_CLAUSE_INPUT_LIMITS.maxScalarBytes)throw new Error('字面条件预览累计字符串/标量字节超出预算。');
  }
  function copy(value:unknown,depth:number,ancestors:Set<object>):unknown {
    if(depth>QIONGTONG_CLAUSE_INPUT_LIMITS.maxDepth)throw new Error('字面条件预览嵌套深度超出预算。');
    if(++budget.nodes>QIONGTONG_CLAUSE_INPUT_LIMITS.maxNodes)throw new Error('字面条件预览累计节点超出预算。');
    if(value===null){charge('null');return value;}
    if(typeof value==='string'){charge(value);return value;}
    if(typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value)){charge(String(value));return value;}
    if(!value||typeof value!=='object'||types.isProxy(value)||ancestors.has(value))throw new Error('字面条件预览拒绝代理、循环或非JSON数据。');
    const array=Array.isArray(value),prototype=Object.getPrototypeOf(value);
    if(depth===0&&array||(array?prototype!==Array.prototype:![Object.prototype,null].includes(prototype)))throw new Error('字面条件预览输入须为普通资料。');
    ancestors.add(value);
    try {
      const output:Record<string,unknown>|unknown[]=array?[]:{};
      if(array){
        const descriptor=Object.getOwnPropertyDescriptor(value,'length'),length=descriptor?.value as number;
        if(!Number.isSafeInteger(length)||length<0||length>QIONGTONG_CLAUSE_INPUT_LIMITS.maxArrayLength)throw new Error('字面条件预览数组长度超出预算。');
        if(length>QIONGTONG_CLAUSE_INPUT_LIMITS.maxNodes-budget.nodes)throw new Error('字面条件预览累计节点超出预算。');
        if(Reflect.ownKeys(value).length!==length+1)throw new Error('字面条件预览数组不完整。');
        for(let index=0;index<length;index++){
          const item=Object.getOwnPropertyDescriptor(value,String(index));
          if(!item||!Object.hasOwn(item,'value')||!item.enumerable)throw new Error('字面条件预览拒绝访问器、隐藏项或空位。');
          (output as unknown[]).push(copy(item.value,depth+1,ancestors));
        }
      }else{
        const keys=Reflect.ownKeys(value);
        if(keys.length>QIONGTONG_CLAUSE_INPUT_LIMITS.maxNodes-budget.nodes)throw new Error('字面条件预览累计节点超出预算。');
        for(const key of keys){
          if(typeof key!=='string'||key==='__proto__'||depth===0&&!PROFILE_FIELDS.includes(key))throw new Error('字面条件预览包含未允许字段。');
          const item=Object.getOwnPropertyDescriptor(value,key)!;
          if(!Object.hasOwn(item,'value')||!item.enumerable)throw new Error('字面条件预览拒绝访问器或隐藏字段。');
          charge(key);
          if(depth===0&&item.value===undefined&&OPTIONAL_PROFILE_FIELDS.includes(key))continue;
          Object.defineProperty(output,key,{value:copy(item.value,depth+1,ancestors),enumerable:true,writable:true,configurable:true});
        }
      }
      return output;
    }finally{ancestors.delete(value);}
  }
  return copy(input,0,new Set()) as BirthProfile;
}

