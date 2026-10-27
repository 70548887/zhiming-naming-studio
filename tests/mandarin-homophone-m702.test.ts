import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {mandarinParentNameReference} from '../src/domain/naming-v7';
import type {BirthProfile,CharacterEntry} from '../src/shared/types';

const dataset=JSON.parse(fs.readFileSync(path.resolve('data/dataset-v6.json'),'utf8')) as {characters:CharacterEntry[]};
const base:BirthProfile={id:'m702',customerName:'普通话谐音边界',surname:'张',surnamePinyin:'zhāng',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'',fatherName:'',motherName:''};
const clone=(char:string,pinyin?:string,tone?:number):CharacterEntry=>{const original=dataset.characters.find(entry=>entry.char===char);if(!original)throw Error('missing '+char);return {...structuredClone(original),...(pinyin?{pinyin}:{}),...(tone===undefined?{}:{tone})};};
const chars=(...entries:CharacterEntry[])=>{const overrides=new Map(entries.map(entry=>[entry.char,entry]));return dataset.characters.map(entry=>overrides.get(entry.char)||entry);};

describe('M702 Mandarin parent-name homophone reference',()=>{
 it('matches complete given-name syllables across different glyphs and covers compound surnames',()=>{
  const result=mandarinParentNameReference({...base,fatherName:'林之元'},'知元',chars());
  expect(result.matches).toEqual(expect.arrayContaining([expect.objectContaining({role:'father',scope:'given-name',comparison:'exact',parentTokens:['zhi1','yuan2'],childTokens:['zhi1','yuan2']})]));
  const compound=mandarinParentNameReference({...base,surname:'欧阳',surnamePinyin:'ōu yáng',fatherName:'欧阳之元'},'知元',chars());
  expect(compound.matches).toEqual(expect.arrayContaining([expect.objectContaining({scope:'full-name',comparison:'exact'})]));
 });
 it('handles empty or unrecognized parent names without guessing',()=>{
  expect(mandarinParentNameReference({...base,fatherName:'',motherName:''},'知元',chars())).toEqual({matches:[],warnings:[]});
  const result=mandarinParentNameReference({...base,fatherName:'Alice'},'知元',chars());
  expect(result.matches).toEqual([]);expect(result.warnings).toEqual([]);
 });
 it('uses the candidate selected reading and distinguishes exact from tone-only near sound',()=>{
  const parent={...base,fatherName:'林之元'};
  expect(mandarinParentNameReference(parent,'知元',chars(clone('知','zhī',1))).matches[0].comparison).toBe('exact');
  expect(mandarinParentNameReference(parent,'知元',chars(clone('知','zhì',4))).matches[0].comparison).toBe('tone-only');
  expect(mandarinParentNameReference(parent,'知元',chars(clone('知','zhī',4))).matches[0].comparison).toBe('tone-only');
 });
 it('does not guess a polyphonic parent reading and does not match a substring',()=>{
  const result=mandarinParentNameReference({...base,fatherName:'林知远'},'知',chars());
  expect(result.matches).toEqual([]);expect(result.warnings.join(' ')).toContain('多音字');
  const short=mandarinParentNameReference({...base,fatherName:'林之元'},'知',chars());
  expect(short.matches).toEqual([]);
 });
 it('does not emit a false positive when only the parent surname overlaps',()=>{
  const result=mandarinParentNameReference({...base,fatherName:'张之元'},'知元',chars());
  expect(result.matches.some(match=>match.scope==='given-name')).toBe(true);
  const unrelated=mandarinParentNameReference({...base,fatherName:'张文博'},'知元',chars());
  expect(unrelated.matches).toEqual([]);
 });
});
