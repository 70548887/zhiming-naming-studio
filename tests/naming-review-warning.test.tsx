import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import table from '../data/naming-editorial-v7.json';
import dataset from '../data/dataset-v6.json';
import {formatNamingReviewWarning} from '../src/shared/naming-review-warning';
import {createNamingMeaningReviewSnapshot} from '../src/main/naming-meaning-review';
import {NamingMeaningReviewView} from '../src/renderer/NamingMeaningReviewView';
import {namingMeaningReviewReport} from '../src/main/naming-meaning-review-report';
import type {CharacterEntry} from '../src/shared/types';

const codes=[...new Set(table.meaningReviews.flatMap(row=>row.warnings).filter(warning=>/^[a-z][a-z0-9-]*$/.test(warning)))];
const unknownMessage='本条审阅提示尚待核对，请结合字义范围与审阅理由确认。';
const context={packSha256:table.base.knowledgePackSha256,activeVersion:table.base.activeVersion};
function saved(){return createNamingMeaningReviewSnapshot('碧百',['碧','百'].map(char=>dataset.characters.find(row=>row.char===char)!)as CharacterEntry[],context)!;}
function render(snapshot:ReturnType<typeof saved>){return[renderToStaticMarkup(<NamingMeaningReviewView givenName={snapshot.givenName} recordState={snapshot.recordState} rows={snapshot.rows}/>),namingMeaningReviewReport(snapshot)];}

describe('display-only naming review warning translation',()=>{
 it('covers all37 codes in the fixed table with Chinese labels, preserving every original row',()=>{
  const before=JSON.stringify(table.meaningReviews);expect(codes).toHaveLength(37);
  for(const code of codes){const text=formatNamingReviewWarning(code);expect(text,code).toMatch(/[\p{Script=Han}]/u);expect(text,code).not.toBe(unknownMessage);expect(text,code).not.toContain(code);}
  expect(JSON.stringify(table.meaningReviews)).toBe(before);
 });
 it('keeps concrete semantic boundaries for composition, default pronunciation and referenced meanings',()=>{
  expect(formatNamingReviewWarning('composition-required')).toBe('需要结合完整名字确定语义。');
  expect(formatNamingReviewWarning('composition-preferred')).toContain('宜结合');
  expect(formatNamingReviewWarning('polyphonic-default-only')).toContain('不借用其他读音');
  expect(formatNamingReviewWarning('default-heteronym-reference-only')).toContain('实体释义仍待核对');
  expect(formatNamingReviewWarning('stone-not-jade')).toContain('美石，并非美玉');
  expect(formatNamingReviewWarning('not-construction-timber')).toContain('不能据此比作栋梁之材');
 });
 it('preserves every non-code warning in the fixed table exactly, including Chinese punctuation and whitespace',()=>{
  const prose=table.meaningReviews.flatMap(row=>row.warnings).filter(warning=>!/^[a-z][a-z0-9-]*$/.test(warning));
  for(const warning of [...prose,'  需结合家族习惯。  ','中文说明：保留原文。','', '<img src=x>'])expect(formatNamingReviewWarning(warning)).toBe(warning);
 });
 it('shows an unresolved Chinese notice for unknown code-shaped keys, including inherited Object names',()=>{
  for(const code of ['future-warning-code','constructor','tostring']){expect(formatNamingReviewWarning(code)).toBe(unknownMessage);expect(formatNamingReviewWarning(code)).not.toContain(code);}
 });
 it('renders real碧百manual/pending warnings in Chinese without changing saved scope, reasons or approval state',()=>{
  const snapshot=saved(),before=JSON.stringify(snapshot),bai=snapshot.rows.find(row=>row.char==='百')!,bi=snapshot.rows.find(row=>row.char==='碧')!;
  expect(bai.applicability.status).toBe('pending');expect(bi.applicability.status).toBe('manual-confirmation-required');expect(bai.review!.warnings).toContain('composition-required');
  for(const html of render(snapshot)){expect(html).toContain('需要结合完整名字确定语义。');expect(html).not.toContain('composition-required');expect(html).toContain(bai.review!.scope);expect(html).toContain(bai.review!.reason);expect(html).toContain('需人工确认');expect(html).toContain('待审');expect(html).not.toContain('逐字家庭期许（项目创作）：');expect(html).not.toContain('naming-review-wish');}
  expect(JSON.stringify(snapshot)).toBe(before);expect(bai.automaticMeaning).toBeUndefined();expect(bi.automaticMeaning).toBeUndefined();
 });
 it('does not turn an unknown warning into approval or mutate the snapshot during repeated UI/report rendering',()=>{
  const snapshot=structuredClone(saved());snapshot.rows.find(row=>row.char==='百')!.review!.warnings.push('new-review-condition');const before=JSON.stringify(snapshot);
  for(const html of render(snapshot)){expect(html).toContain(unknownMessage);expect(html).not.toContain('new-review-condition');expect(html).toContain('待审');expect(html).not.toContain('naming-review-wish');}
  expect(JSON.stringify(snapshot)).toBe(before);expect(snapshot.rows.find(row=>row.char==='百')!.applicability.status).toBe('pending');
 });
});
