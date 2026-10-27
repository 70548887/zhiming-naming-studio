import {describe,expect,it} from 'vitest';
import {canApplyDraftResult,createDraftTicket,namingInputKey,normalizePreferences} from '../src/shared/workflow';
import type {BirthProfile} from '../src/shared/types';
import type {ParentNameReading} from '../src/shared/parent-name-phonetics';

const profile:BirthProfile={id:'family-input',customerName:'测试家庭',surname:'林',surnamePinyin:'lin2',gender:'中性',calendar:'solar',birthDate:'2024-02-10',leapMonth:false,birthTime:'09:30',timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'',fatherName:'林志远',motherName:'陈安宁'};
const father:ParentNameReading={version:'parent-name-reading/1.0.0',role:'father',fullName:'林志远',surnameLength:1,givenName:'志远',readings:[{index:0,char:'志',confirmed:true,token:'zhi4',origin:'family-confirmed'},{index:1,char:'远',confirmed:true,token:'yuan3',origin:'family-confirmed'}]};
const mother:ParentNameReading={version:'parent-name-reading/1.0.0',role:'mother',fullName:'陈安宁',surnameLength:1,givenName:'安宁',readings:[{index:0,char:'安',confirmed:true,token:'an1',origin:'family-confirmed'},{index:1,char:'宁',confirmed:true,token:'ning2',origin:'family-confirmed'}]};

describe('family confirmation is part of the real naming draft ticket',()=>{
 it('keeps legacy absence and an empty confirmation list equivalent without adding a mode',()=>{
  const preferences=normalizePreferences();
  expect(Object.hasOwn(preferences,'parentNamePhonetics')).toBe(false);
  const ticket=createDraftTicket(4,profile,preferences);
  expect(canApplyDraftResult(ticket,4,{...profile,parentNameReadings:[]},preferences)).toBe(true);
 });
 it('rejects a late generation result when only the confirmed pronunciation changed',()=>{
  const before={...profile,parentNameReadings:[structuredClone(father)]},preferences=normalizePreferences({parentNamePhonetics:'strict'});
  const ticket=createDraftTicket(7,before,preferences),after=structuredClone(before);
  after.parentNameReadings[0].readings[0].token='zhi1';
  expect(after.fatherName).toBe(before.fatherName);
  expect(canApplyDraftResult(ticket,7,after,preferences)).toBe(false);
 });
 it('rejects a late result after changing comparison mode with the same names and readings',()=>{
  const draft={...profile,parentNameReadings:[father]},strict=normalizePreferences({parentNamePhonetics:'strict'});
  const ticket=createDraftTicket(8,draft,strict);
  expect(canApplyDraftResult(ticket,8,draft,normalizePreferences({parentNamePhonetics:'ignore-tone'}))).toBe(false);
 });
 it('compares independent parent records consistently without rewriting their stored order',()=>{
  const a={...profile,parentNameReadings:[mother,father]},b={...profile,parentNameReadings:[father,mother]},preferences=normalizePreferences();
  const original=JSON.stringify(a.parentNameReadings);
  expect(namingInputKey(a,preferences)).toBe(namingInputKey(b,preferences));
  expect(JSON.stringify(a.parentNameReadings)).toBe(original);
 });
 it('rejects accessor confirmation metadata before executing its getter',()=>{
  const bad=structuredClone(father);let invoked=0;
  Object.defineProperty(bad,'givenName',{enumerable:true,get(){invoked++;return '志远';}});
  expect(()=>namingInputKey({...profile,parentNameReadings:[bad]},normalizePreferences())).toThrow(/访问器/);
  expect(invoked).toBe(0);
 });
 it('rejects an accessor mode and unsupported values before preference spreading',()=>{
  let invoked=0;const accessor={};Object.defineProperty(accessor,'parentNamePhonetics',{enumerable:true,get(){invoked++;return 'strict';}});
  expect(()=>normalizePreferences(accessor)).toThrow('命名偏好只接受自身可枚举数据字段，不接受访问器或隐藏字段。');
  expect(invoked).toBe(0);
  for(const value of [null,undefined,true,'auto','STRICT'])expect(()=>normalizePreferences({parentNamePhonetics:value} as never)).toThrow(/家庭给名读音模式/);
 });
});
