import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import data from '../data/official-name-popularity.json';
import lock from '../data/official-name-popularity-source-lock.json';
import type {OfficialNamePopularityCatalog,OfficialNamePopularitySexCohort} from '../src/shared/official-name-popularity';
import {createOfficialNamePopularityReferenceDTO,lookupOfficialNamePopularityReference} from '../src/shared/official-name-popularity-reference';
import {OfficialPopularityCatalogView,OfficialPopularityResults,OfficialPopularitySourceDetails} from '../src/renderer/OfficialNamePopularity';

const {fileHashes:_,...source}=lock.sources[0];
const catalog={...data,source} as unknown as OfficialNamePopularityCatalog;
const reference=createOfficialNamePopularityReferenceDTO(catalog);
const lookup=(givenName:string,sexCohorts?:OfficialNamePopularitySexCohort[])=>lookupOfficialNamePopularityReference(reference,sexCohorts?{givenName,sexCohorts}:{givenName});
const results=(name:string,sexCohorts?:OfficialNamePopularitySexCohort[])=>renderToStaticMarkup(<OfficialPopularityResults result={lookup(name,sexCohorts)}/>);
const expectedFacts:[OfficialNamePopularitySexCohort,string,number][]=[
 ['male','沐宸',22958],['male','浩宇',15722],['male','沐辰',15660],['male','茗泽',13175],['male','奕辰',12583],
 ['male','宇泽',12191],['male','浩然',11808],['male','奕泽',10899],['male','宇轩',10825],['male','沐阳',10212],
 ['female','若汐',18293],['female','一诺',16884],['female','艺涵',15388],['female','依诺',15208],['female','梓涵',14221],
 ['female','苡沫',13352],['female','雨桐',11916],['female','欣怡',11742],['female','语桐',10795],['female','语汐',10573],
];

describe('official historical given-name presentation through the reference DTO',()=>{
 it('shows both complete ten-name rankings with all exact counts and a source link for each table',()=>{
  const html=renderToStaticMarkup(<OfficialPopularityCatalogView reference={reference} selection="all" onChoose={()=>{}}/>);
  expect(reference.schemaVersion).toBe('official-name-popularity-reference-dto/1.1.0');expect(reference).not.toHaveProperty('integritySha256');
  expect((html.match(/class="official-popularity-row"/g)||[])).toHaveLength(20);
  for(const [sexCohort,givenName,reportedPeople] of expectedFacts){expect(html).toContain(`data-sex-cohort="${sexCohort}" data-given-name="${givenName}" data-reported-people="${reportedPeople}"`);expect(html).toContain(reportedPeople.toLocaleString('zh-CN'));}
  expect(html).toContain('aria-label="查询给名沐宸"');expect(html).toContain('22,958');
  expect((html.match(/查看官方报告/g)||[])).toHaveLength(2);expect(html).toContain(reference.source.url);expect(html).toContain('2021-12-31');expect(html).toContain('给名不含姓氏');
 });
 it('keeps male and female DTO results separate, with unpublished counts rather than zero',()=>{
  const result=lookup('沐宸');expect(result.records).toEqual([{sexCohort:'male',status:'listed',rank:1,reportedPeople:22958},{sexCohort:'female',status:'not-listed',rank:null,reportedPeople:null}]);
  expect(result.boundaries).toMatchObject({nameUnit:'given-name-excluding-surname',currentNationalDuplicateRate:null,wholePopulationFullNameCount:null,allBirthsCoverageRate:null,scoringEffect:'none',unlistedMeansZero:false});
  const html=renderToStaticMarkup(<OfficialPopularityResults result={result}/>);expect(html).toContain('data-given-name="沐宸" data-sex-cohort="male" data-result-status="listed" data-reported-people="22958"');
  expect(html).toContain('data-sex-cohort="female" data-result-status="not-listed"');expect(html).toContain('人数未公布');expect(html).toContain('不代表零人');expect(html).not.toContain('data-reported-people="0"');
 });
 it('does not merge differently written given names or remove a surname',()=>{
  expect(results('沐辰')).toContain('data-reported-people="15660"');
  for(const name of ['王沐宸','牧宸','藝涵','知远']){const html=results(name);expect(html).toContain('data-given-name="'+name+'"');expect((html.match(/data-result-status="not-listed"/g)||[])).toHaveLength(2);expect(html).not.toContain('data-reported-people=');}
  expect(results('艺涵')).toContain('data-reported-people="15388"');
 });
 it('preserves historical scope, name unit and source URL from the DTO for every query card',()=>{
  const result=lookup('知远');expect(result.historicalScope).toMatchObject({statisticalYear:2021,birthYear:2021,registeredBy:'2021-12-31',nameUnit:'given-name-excluding-surname'});
  const html=renderToStaticMarkup(<OfficialPopularityResults result={result}/>);expect((html.match(/2021-12-31/g)||[])).toHaveLength(2);expect((html.match(/仅统计给名，不含姓氏/g)||[])).toHaveLength(2);
  expect((html.match(/查看官方报告/g)||[])).toHaveLength(2);expect(html).toContain(result.source.url);expect(html).toContain('rel="noopener noreferrer"');expect(html).not.toContain('2026-12-31');
 });
 it('explains the reported rounded denominators without publishing a computed duplicate rate or raw digests',()=>{
  const html=renderToStaticMarkup(<OfficialPopularitySourceDetails catalog={catalog}/>);
  expect(html).toContain('数据版本与统计口径');expect(html).toContain('1.0.0');expect(html).toContain('887.3万');expect(html).toContain('468.1万');expect(html).toContain('419.2万');expect(html).toContain('1,000');expect(html).toContain('未公布精确人数与舍入规则');expect(html).toContain('未上榜');expect(html).toContain('2022-01-24 09:16');
  expect(html).not.toContain(catalog.source.sha256);expect(html).not.toContain('SHA');expect(html).not.toContain('0.49%');expect(html).not.toContain('2025-10-10');
 });
 it('filters only the selected ranking and result cohort while keeping queried text escaped',()=>{
  const html=renderToStaticMarkup(<OfficialPopularityCatalogView reference={reference} selection="female" onChoose={()=>{}}/>);expect((html.match(/class="official-popularity-row"/g)||[])).toHaveLength(10);expect(html).not.toContain('data-sex-cohort="male"');
  const female=results('一诺',['female']);expect((female.match(/data-result-status="listed"/g)||[])).toHaveLength(1);expect(female).toContain('data-reported-people="16884"');expect(female).not.toContain('data-sex-cohort="male"');
  const escaped=results('<script>alert(1)</script>');expect(escaped).toContain('&lt;script&gt;');expect(escaped).not.toContain('<script>');expect(escaped).toContain('人数未公布');
 });
});
