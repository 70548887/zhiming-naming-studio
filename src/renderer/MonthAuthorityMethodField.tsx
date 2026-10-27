import React from 'react';
import type { MonthAuthorityMethod } from '../shared/types';
import { normalizeMonthAuthorityMethod } from '../shared/month-authority-method';
import { Field } from './Field';

export function MonthAuthorityMethodField({value,onChange,error}:{value?:MonthAuthorityMethod;onChange:(value:MonthAuthorityMethod)=>void;error?:string}) {
 return <Field label="月令参考方法" controlId="birth-month-authority" error={error} hint="分日表按交节后实际24小时定位，结果单独展示，不改变现有扶抑和名字排序。">
   <select id="birth-month-authority" value={normalizeMonthAuthorityMethod(value)} onChange={event=>onChange(event.target.value as MonthAuthorityMethod)}>
     <option value="no-fixed-day/1.0.0">不定日限（默认，不按分日表定位）</option>
     <option value="sanming-first-paragraph/1.0.0">《三命通会》首段分日表（转录参考）</option>
   </select>
 </Field>;
}
