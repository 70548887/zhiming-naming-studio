import React from 'react';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {renderToStaticMarkup} from 'react-dom/server';
import {SemanticCharacterEvidenceView,type SemanticCharacterEvidenceViewProps} from '../src/renderer/SemanticCharacterEvidenceView';
import {M923_FAMILY} from '../src/shared/naming-semantic-m923';
import {cloneM928,createM928RealFixtures,M928_FIXTURE_KEYS,type M928Seed} from './helpers/m928-semantic-character-fixtures';

/** Presentation and correlation checks only. These tests deliberately do not
 * assert production transport authentication, source admission, or App wiring. */
const evidenceDir=fs.mkdtempSync(path.join(process.env.M928_TEST_EVIDENCE_DIR??'D:/Codex-NamingStudio-Evidence/m928-semantic-evidence-view','ssr-'));
const observations:Array<{case:string;value:unknown}>=[];
let fixtures:ReturnType<typeof createM928RealFixtures>;
const htmlText=(value:string)=>renderToStaticMarkup(<span>{value}</span>).replace(/^<span>/,'').replace(/<\/span>$/,'');
const render=(seed:SemanticCharacterEvidenceViewProps)=>renderToStaticMarkup(<SemanticCharacterEvidenceView {...seed} id="m928-ssr"/>);
const frozen=<T,>(value:T):T=>{if(value&&typeof value==='object'){Object.freeze(value);for(const item of Object.values(value as Record<string,unknown>))frozen(item);}return value;};
const sample=(key='local:安明'):M928Seed=>cloneM928(fixtures.seeds[key]);
const unavailable=(props:SemanticCharacterEvidenceViewProps,label:string)=>{
 const before=cloneM928(props),html=render(frozen(props));
 expect(html,label).toContain('data-semantic-character-evidence="unavailable"');
 expect(html).toContain('当前单字说明不可用');
 expect(html).not.toContain('data-semantic-position');
 expect(html).not.toContain('<details');
 for(const name of [props.current?.fullName,props.candidate?.fullName,props.candidate?.semanticAdoptionM923?.fullName,'钱外客泄漏'])if(name)expect(html,label+' must not disclose '+name).not.toContain(htmlText(name));
 expect(props,label+' must not rewrite input').toEqual(before);
 observations.push({case:label,value:{unavailable:true,noCandidateBody:true}});
};

beforeAll(()=>{fixtures=createM928RealFixtures();observations.push({case:'actual-producer-prerequisites',value:fixtures.observations});},120000);
afterAll(()=>{
 const target=path.join(evidenceDir,'observations.json'),temporary=target+'.tmp';
 fs.writeFileSync(temporary,JSON.stringify({schema:'m928-semantic-character-ssr-observations/1',scope:'Read-only display consistency; real producer fixtures; upstream association is supplied test input, not authenticated transport.',observations},null,2)+'\n');
 fs.renameSync(temporary,target);
 console.info('M928_SSR_EVIDENCE '+evidenceDir);
});

describe('M928 real producer character evidence in SSR',{timeout:120000},()=>{
 it.each(M928_FIXTURE_KEYS)('%s renders actual row adoption without changing scores, warnings or receipts',key=>{
  const seed=sample(key),before=cloneM928(seed),snapshot=seed.candidate.semanticAdoptionM923;
  expect(seed.current.contextKey).not.toBe(snapshot.constraintContextSHA256);
  const html=render(frozen(seed)),adopted=snapshot.rows.filter(row=>row.adoption!==null).length;
  expect(html).toContain('data-semantic-character-evidence="available"');
  expect(html).toContain(seed.candidate.fullName);
  expect(html).toContain(`${adopted}/${snapshot.rows.length}`);
  expect(html).not.toMatch(/\b(?:0|1|2)\/40\b/);
  expect((html.match(/data-semantic-position=/g)??[]).length).toBe(snapshot.rows.length);
  for(const [position,row] of snapshot.rows.entries()){
   const entry=seed.candidate.characters[position];
   expect(html).toContain(htmlText(entry.meaning));expect(html).toContain(htmlText(entry.sourceId));
   if(row.adoption&&row.project){
    expect(html).toContain(htmlText(row.project.meaning));
    for(const limit of row.project.limits)expect(html).toContain(htmlText(limit));
    for(const value of [row.adoption.pinyin,row.adoption.senseId,row.adoption.reviewId,row.adoption.candidateCaseId,...Object.values(M923_FAMILY)])expect(html).toContain(htmlText(value));
    expect(html).toContain(`${row.adoption.tone} 声`);
   }
  }
  if(adopted===0)expect(html).toContain('未采用本批新增说明');
  expect(html).toContain('整名含义需人工核对');
  expect(html).not.toMatch(/来源已认证|来源认证通过|签名验证通过|已获整名授权/);
  expect(html).not.toMatch(/<button\b|<input\b|<form\b|<select\b|<textarea\b|type="submit"/);
  expect(seed,'SSR must preserve all candidate fields, evaluation, warnings and receipt bytes').toEqual(before);
  observations.push({case:key,value:{adopted,rowCount:snapshot.rows.length,origin:seed.candidate.origin,immutable:true}});
 });

 it('separates baseline meanings, project wording and source references; raw definitions are not invented',()=>{
  const seed=sample(),snapshot=seed.candidate.semanticAdoptionM923,html=render(seed);
  expect(html).toContain('候选原有通用字义');expect(html).toContain('本次采用的单字取意');
  expect(html.indexOf('候选原有通用字义')).toBeLessThan(html.indexOf('本次采用的单字取意'));
  expect(html).toContain('此公开回执未包含辞典原始释义全文');
  expect(snapshot.wholeNameMeaning).toBeNull();expect(snapshot.projectWish).toBeNull();
  for(const row of snapshot.rows){expect(row.project?.projectWish??null).toBeNull();expect(Object.hasOwn(row,'sourceDefinition')).toBe(false);if(row.adoption)expect(Object.hasOwn(row.adoption,'sourceDefinition')).toBe(false);}
  expect(html).not.toContain('sourceDefinition</');
  expect(html).toContain('本快照没有提供整名寓意或项目愿景');
 });

 it('keeps digests, constraint engine and owner context out of the default surface',()=>{
  const seed=sample('local:安'),html=render(seed);
  const details=[...html.matchAll(/<details(?:\s[^>]*)?>[\s\S]*?<\/details>/g)].map(match=>match[0]);
  expect(details.length).toBeGreaterThan(0);
  for(const detail of details)expect(detail).not.toMatch(/^<details\b[^>]*\bopen(?:=|\s|>)/);
  const defaultSurface=html.replace(/<details(?:\s[^>]*)?>[\s\S]*?<\/details>/g,'');
  for(const value of [seed.candidate.semanticAdoptionM923.constraintEngineId,seed.candidate.semanticAdoptionM923.constraintContextSHA256,...Object.entries(seed.candidate.semanticAdoptionM923.rows[0].adoption!).filter(([field])=>field.endsWith('SHA256')).map(([,value])=>String(value))]){
   expect(html).toContain(value);expect(defaultSurface).not.toContain(value);
  }
  expect(defaultSurface).not.toContain(seed.current.contextKey);
  expect(html).not.toContain('open=""');
 });

 it('accepts a coherently supplied opaque owner context without interpreting it as a digest',()=>{
  const seed=sample();seed.current.contextKey='independent-owner-selection-epoch-2';seed.association={status:'upstream-associated',...seed.current};
  expect(render(seed)).toContain('data-semantic-character-evidence="available"');
 });
});

type Mutation={name:string;change:(seed:M928Seed)=>void};
const mutations:Mutation[]=[
 {name:'snapshot/1',change:seed=>{(seed.candidate.semanticAdoptionM923 as unknown as Record<string,unknown>).schema='m921-m923-character-generation-snapshot/1';}},
 {name:'missing snapshot',change:seed=>{delete (seed.candidate as unknown as Record<string,unknown>).semanticAdoptionM923;}},
 {name:'null snapshot',change:seed=>{(seed.candidate as unknown as Record<string,unknown>).semanticAdoptionM923=null;}},
 {name:'malformed rows',change:seed=>{(seed.candidate.semanticAdoptionM923 as unknown as Record<string,unknown>).rows='rows';}},
 {name:'missing row',change:seed=>{(seed.candidate.semanticAdoptionM923.rows as unknown[]).pop();}},
 {name:'wrong row char',change:seed=>{(seed.candidate.semanticAdoptionM923.rows[0] as {char:string}).char='宁';}},
 {name:'wrong row position',change:seed=>{(seed.candidate.semanticAdoptionM923.rows[0] as {position:number}).position=1;}},
 {name:'wrong candidate id',change:seed=>{seed.candidate.id='other-candidate';}},
 {name:'wrong candidate fullName',change:seed=>{seed.candidate.fullName='钱外客泄漏';}},
 {name:'wrong candidate givenName',change:seed=>{seed.candidate.givenName='宁';}},
 {name:'wrong snapshot candidateId',change:seed=>{seed.candidate.semanticAdoptionM923.candidateId='other-candidate';}},
 {name:'wrong snapshot fullName',change:seed=>{seed.candidate.semanticAdoptionM923.fullName='钱外客泄漏';}},
 {name:'wrong snapshot givenName',change:seed=>{seed.candidate.semanticAdoptionM923.givenName='宁';}},
 {name:'wrong current candidateId',change:seed=>{seed.current.candidateId='other-candidate';}},
 {name:'wrong current fullName',change:seed=>{seed.current.fullName='钱外客泄漏';}},
 {name:'wrong current givenName',change:seed=>{seed.current.givenName='宁';}},
 {name:'stale current context',change:seed=>{seed.current.contextKey='owner-selection-epoch-2';}},
 {name:'old upstream association context',change:seed=>{if(seed.association.status==='upstream-associated')seed.association.contextKey='old-owner-selection-epoch';}},
 {name:'wrong association candidateId',change:seed=>{if(seed.association.status==='upstream-associated')seed.association.candidateId='other-candidate';}},
 {name:'wrong association fullName',change:seed=>{if(seed.association.status==='upstream-associated')seed.association.fullName='钱外客泄漏';}},
 {name:'wrong association givenName',change:seed=>{if(seed.association.status==='upstream-associated')seed.association.givenName='宁';}},
 {name:'wrong receipt candidateId',change:seed=>{seed.candidate.semanticAdoptionM923.rows[0].adoption!.candidateId='other-candidate';}},
 {name:'wrong receipt fullName',change:seed=>{seed.candidate.semanticAdoptionM923.rows[0].adoption!.fullName='钱外客泄漏';}},
 {name:'wrong receipt givenName',change:seed=>{seed.candidate.semanticAdoptionM923.rows[0].adoption!.givenName='宁';}},
 {name:'wrong receipt position',change:seed=>{seed.candidate.semanticAdoptionM923.rows[0].adoption!.position=1;}},
 {name:'wrong receipt char',change:seed=>{seed.candidate.semanticAdoptionM923.rows[0].adoption!.char='宁';}},
 {name:'receipt reading outside candidate readings',change:seed=>{seed.candidate.semanticAdoptionM923.rows[0].adoption!.pinyin='wěi';}},
 {name:'receipt tone outside candidate readings',change:seed=>{seed.candidate.semanticAdoptionM923.rows[0].adoption!.tone=4;}},
 {name:'receipt constraint mismatch',change:seed=>{seed.candidate.semanticAdoptionM923.rows[0].adoption!.constraintContextSHA256='0'.repeat(64);}},
 {name:'malformed receipt digest',change:seed=>{seed.candidate.semanticAdoptionM923.rows[0].adoption!.sourceDefinitionSHA256='malformed';}},
 {name:'null receipt with non-null project',change:seed=>{(seed.candidate.semanticAdoptionM923.rows[0] as {adoption:unknown}).adoption=null;}},
 {name:'missing project',change:seed=>{(seed.candidate.semanticAdoptionM923.rows[0] as {project:unknown}).project=null;}},
 {name:'invented whole name meaning',change:seed=>{(seed.candidate.semanticAdoptionM923 as unknown as Record<string,unknown>).wholeNameMeaning='伪造全名承诺';}},
 {name:'invented project wish',change:seed=>{(seed.candidate.semanticAdoptionM923.rows[0].project as unknown as Record<string,unknown>).projectWish='伪造家庭愿景';}},
 {name:'mismatched generation origin',change:seed=>{seed.candidate.semanticAdoptionM923.generationOrigin='ai';}},
];
describe('M928 fail-closed display correlation and malformed inputs',()=>{
 it.each(['pending','unavailable','stale'] as const)('%s association has only generic unavailable content',status=>{const seed=sample();seed.association={status};unavailable(seed,status);});
 it('missing candidate has generic unavailable content',()=>{const seed=sample();unavailable({current:seed.current,association:seed.association},'missing candidate');});
 it.each(mutations)('$name has only generic unavailable content',({name,change})=>{const seed=sample();change(seed);unavailable(seed,name);});
 it('repeated characters preserve occurrence identity instead of exchanging receipts',()=>{const seed=sample('local:安安'),rows=seed.candidate.semanticAdoptionM923.rows;[rows[0].adoption,rows[1].adoption]=[rows[1].adoption,rows[0].adoption];unavailable(seed,'swapped repeated receipts');});
});
