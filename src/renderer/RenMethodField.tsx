import React from 'react';
import type {RenMethod} from '../shared/types';
import {normalizeRenMethod,REN_METHOD,LEGACY_REN_METHOD,REN_ACTION_METHOD,REN_CAPACITY_METHOD,REN_DIRECTION_METHOD,REN_JOINT_BATTLE_METHOD} from '../shared/ren-method';
import {Field} from './Field';

export function RenMethodField({value,onChange,error}:{value?:RenMethod;onChange:(value:RenMethod)=>void;error?:string}) {
  return <Field label="任注独立参考" controlId="birth-ren-method" error={error} hint="独立列出《滴天髓阐微》任注条文、结构观察与原书例证；有效生扶和制化未定时保留待审，不改喜用或姓名排序。">
    <select id="birth-ren-method" value={normalizeRenMethod(value)} onChange={event=>onChange(event.target.value as RenMethod)}>
      <option value="none">不启用任注独立参考（默认）</option>
      <option value={LEGACY_REN_METHOD}>《滴天髓阐微》任注1.0（保留原取法）</option>
      <option value={REN_METHOD}>《滴天髓阐微》任注1.1（必要条件、结构与例证）</option>
      <option value={REN_ACTION_METHOD}>《滴天髓阐微》任注1.2（根联系与条件作用核查）</option>
      <option value={REN_CAPACITY_METHOD}>《滴天髓阐微》任注1.3（木局旺势与辰生助的限定能力）</option>
      <option value={REN_DIRECTION_METHOD}>《滴天髓阐微》任注1.4（木方与火方的原句局部旺势）</option>
      <option value={REN_JOINT_BATTLE_METHOD}>《滴天髓阐微》任注1.5（天地冲克与方会的限定核查）</option>
    </select>
  </Field>;
}
