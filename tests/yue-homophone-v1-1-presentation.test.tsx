import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename,dirname,join,resolve} from 'node:path';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {YueHomophoneView} from '../src/renderer/YueHomophoneView';
import {yueHomophoneReport} from '../src/main/yue-homophone-report';
import {normalizePreferences} from '../src/shared/workflow';
import {YUE_HOMOPHONE_EXPANDED_VERSION} from '../src/main/yue-homophone-expanded-data';
import type {BirthProfile,NamingSession,YueReadingSelection,YueReadingUnit} from '../src/shared/types';
import type {YueHomophoneReview} from '../src/shared/yue-homophone-types';

const dictionary=(unit:YueReadingUnit,token:string):YueReadingSelection=>{const item=unit.candidates.find(row=>row.tokens.length===1&&row.tokens[0]===token);if(!item)throw new Error('Expected actual dictionary option '+unit.text+'/'+token);return{tokens:[token],origin:'dictionary',confirmed:true,dictionaryId:item.id};};
const sha=(value:string)=>createHash('sha256').update(value).digest('hex');
let directory:string,store:Store,initial:NamingSession,confirmed:NamingSession;
beforeAll(async()=>{
 directory=mkdtempSync(join(tmpdir(),'yue11-presentation-'));store=await new Store(directory,resolve('data'),resolve('node_modules/sql.js/dist/sql-wasm.wasm')).init();const service=new StudioService(store,{read:()=>'',write:()=>{}},false);
 const profile:BirthProfile={id:'actual-yue11-presentation',customerName:'粤语1.1真实生成展示测试',surname:'刘',surnamePinyin:'liú',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:'09:30:00',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''};
 initial=(await service.generate(profile,normalizePreferences({length:1,requiredChars:'文',yueReading:true,yueHomophones:'strict',yueHomophoneRuleVersion:YUE_HOMOPHONE_EXPANDED_VERSION,zodiacRules:false}))).session;
 expect(initial.candidates[0].fullName).toBe('刘文');const reading=initial.candidates[0].yueReading!;confirmed=service.updateYueReading(initial.id,initial.candidates[0].id,{surname:dictionary(reading.surname,'lau4'),given:[dictionary(reading.given[0],'man4')]},initial.reviewRevision,initial.reviewToken);
});
afterAll(()=>{store?.db.close();if(directory){if(dirname(resolve(directory))!==resolve(tmpdir())||!basename(directory).startsWith('yue11-presentation-'))throw new Error('Unexpected temporary target');rmSync(directory,{recursive:true,force:true});}});

describe('actual service1.1 review presentation and frozen published1.0 report bytes',()=>{
 it('shows actual28-term/29-rule scope and unconfirmed status without a passed or safe claim',()=>{
  const review=initial.candidates[0].yueHomophones!,html=yueHomophoneReport(review),view=renderToStaticMarkup(<YueHomophoneView review={review}/>);
  expect(review).toMatchObject({version:YUE_HOMOPHONE_EXPANDED_VERSION,status:'not-assessed',matches:[]});
  for(const output of [html,view]){expect(output).toContain('28');expect(output).toContain('29');expect(output).toContain('暂未检查');expect(output).not.toContain('已通过');expect(output).not.toContain('全粤语无风险');}
 });
 it('separates original raw labels and source sense text without a personal-attribute or score conclusion',()=>{
  const review=confirmed.candidates[0].yueHomophones!,html=yueHomophoneReport(review),view=renderToStaticMarkup(<YueHomophoneView review={review}/>),match=review.matches[0];
  expect(match.term).toBe('流氓');expect(match.glosses[1]).toMatchObject({tags:[],rawTags:['延伸']});
  for(const output of [html,view]){expect(output).toContain('流氓');expect(output).toContain('lau4 man4');expect(output).toContain('原词典标签：延伸');expect(output).toContain('不据此推断地区使用频率');expect(output).toContain('不描述孩子的属性');expect(output).not.toContain('此人');expect(output).not.toContain('降低评分已执行');for(const source of match.sourceRefs){expect(output).toContain(source.locator);expect(output).toContain(source.license);}}
  expect(confirmed.analysis).toEqual(initial.analysis);expect(confirmed.candidates[0].evaluation).toEqual(initial.candidates[0].evaluation);
 });
 it('escapes raw labels at both saved-review display boundaries',()=>{
  const review=structuredClone(confirmed.candidates[0].yueHomophones!);review.matches[0].glosses[1].rawTags=['<img src=x onerror=alert(1)>'];
  for(const output of [yueHomophoneReport(review),renderToStaticMarkup(<YueHomophoneView review={review}/>)]){expect(output).not.toContain('<img');expect(output).toContain('&lt;img');}
 });
 it('keeps all11 report HTML byte hashes identical to the preserved delivered1.0.25 modules',()=>{
  const published=JSON.parse(readFileSync(resolve('tests/fixtures/yue-homophone-v1-actual-sessions.json'),'utf8')) as {records:{table:string;rowId:string;rawJson:string;rawSha256:string}[]};
  const frozen=JSON.parse(readFileSync(resolve('tests/fixtures/yue-homophone-v1-report-html-hashes.json'),'utf8')) as {source:{policy:string};cases:{table:string;rowId:string;rawSha256:string;reports:{candidateId:string;bytes:number;sha256:string}[]}[]};
  expect(frozen.source.policy).toContain('no current report generator');expect(frozen.cases).toHaveLength(7);let checked=0;
  for(const item of frozen.cases){const record=published.records.find(row=>row.table===item.table&&row.rowId===item.rowId)!;expect(sha(record.rawJson)).toBe(item.rawSha256);const session=JSON.parse(record.rawJson) as NamingSession;for(const expected of item.reports){const candidate=session.candidates.find(row=>row.id===expected.candidateId)!,html=yueHomophoneReport(candidate.yueHomophones as YueHomophoneReview);expect(Buffer.byteLength(html)).toBe(expected.bytes);expect(sha(html)).toBe(expected.sha256);checked++;}}
  expect(checked).toBe(11);
 });
});
