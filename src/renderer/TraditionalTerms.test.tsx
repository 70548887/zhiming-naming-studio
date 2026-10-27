import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TraditionalTerms } from './TraditionalTerms';
describe('local traditional terminology help',()=>{
 it('uses collapsed native details with a named summary and explicit close action',()=>{
  const html=renderToStaticMarkup(<TraditionalTerms terms={['日主','藏干','透干','通根','月令','扶抑','调候','合化']} context="本次所选规则"/>);
  for(const value of ['<details','<summary','术语说明','收起术语说明','本次所选规则','日主与十神','藏干与司权','透干','通根','月令','扶抑与季节意象','调候','合与合化','同名术语在不同流派或表中可能不同'])expect(html).toContain(value);
  expect(html).not.toContain('<details open');expect(html).toContain('aria-labelledby=');
 });
 it('keeps Qimen terms distinct and does not equate either tomb convention with a verdict on the name',()=>{
  const html=renderToStaticMarkup(<TraditionalTerms terms={['三奇','六仪','旬空','入墓']}/>);
  for(const value of ['乙、丙、丁','戊、己、庚、辛、壬、癸','时柱辅助关系','原三奇表乙取坤二','独立十干表乙取戌、乾六','不混作姓名验局'])expect(html).toContain(value);
 });
});
