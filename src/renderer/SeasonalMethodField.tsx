import React from 'react';
import type {SeasonalMethod} from '../shared/types';
import {normalizeSeasonalMethod} from '../shared/seasonal-method';
import {Field} from './Field';

export function SeasonalMethodField({value,onChange,error}:{value?:SeasonalMethod;onChange:(value:SeasonalMethod)=>void;error?:string}){
 return <Field label="逐月调候参考" controlId="birth-seasonal-method" error={error} hint="只读所选电子版的初始取用及条件事实；分开保留扶抑意见，不自动改变喜用或姓名排序。">
  <select id="birth-seasonal-method" value={normalizeSeasonalMethod(value)} onChange={event=>onChange(event.target.value as SeasonalMethod)}>
   <option value="no-monthly/1.0.0">不启用逐月调候参考（默认）</option>
   <option value="qiongtong-2294674-initial/1.0.0">《穷通宝鉴》固定电子版（初始取用参考）</option>
  </select>
 </Field>;
}
