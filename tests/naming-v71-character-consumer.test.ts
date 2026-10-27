import{beforeAll,afterAll,describe,it,expect}from'vitest';
import fs from'node:fs';import path from'node:path';import os from'node:os';import{createHash}from'node:crypto';
import{loadNamingEditorialV71Data,NAMING_EDITORIAL_V71_PINS}from'../src/main/naming-editorial-v7-data';
import{createNamingCharacterReview71,createNamingReviewLookup}from'../src/domain/naming-review-v7.mjs';
import type{CharacterEntry}from'../src/shared/types';
import profile from'../data/naming-character-meanings-v7.1-profile.json';
import admission from'../data/naming-character-meanings-v7.1-admission.json';
import oldTable from'../data/naming-editorial-v7.json';
const data=path.resolve('data'),dataset=JSON.parse(fs.readFileSync(path.join(data,'dataset-v6.json'),'utf8')),character=(char:string):CharacterEntry=>dataset.characters.find((c:CharacterEntry)=>c.char===char),context={packSha256:'1875aa49dcfaeca0f266a3be7578e4d4b2a9b2c9c1f59fd79699a3e26d5d6b8b',activeVersion:'1875aa49dcfa'},hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const loaded=loadNamingEditorialV71Data(data),lookup=loaded.lookup;
let directory:string;const parent=fs.realpathSync.native(os.tmpdir());
beforeAll(()=>{directory=fs.realpathSync.native(fs.mkdtempSync(path.join(parent,'naming71-consumer-')));const lock=JSON.parse(fs.readFileSync(path.join(data,'naming-character-meanings-v7.1-source-lock.json'),'utf8')),files=[...lock.sources[0].files,'data/naming-character-meanings-v7.1-source-lock.json','data/naming-character-meanings-v7.1-manifest.json'];for(const file of files){const target=path.join(directory,file.slice(5));fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.resolve(file),target);fs.chmodSync(target,0o600);}});
afterAll(()=>{if(directory){if(!directory.startsWith(parent+path.sep))throw Error('Unsafe own-source cleanup');fs.rmSync(directory,{recursive:true,force:true});}});

describe('same v7 module narrow71 character consumer and fixed main loader, not product generation acceptance',()=>{
 it('loads exact six-publication closure with one new active source and trusted pins',()=>{expect(loaded.sources).toHaveLength(1);expect(loaded.source.id).toBe('naming-character-meanings-v7.1-fixed');expect(loaded.identity.profileSha256).toBe(NAMING_EDITORIAL_V71_PINS.profile.sha256);expect(loaded.identity.admissionSha256).toBe(NAMING_EDITORIAL_V71_PINS.admission.sha256);expect(loaded.profile.cases).toHaveLength(40);});
 it('all exact40 default original characters reach independent source-bound explanations',()=>{
  for(const row of loaded.profile.cases){const entry=character(row.char),before=JSON.stringify(entry),r=lookup.characterExplanation(entry,context);expect(r.status).toBe('character-explanations-ready');if(r.status!=='character-explanations-ready')throw Error('No note '+row.char);expect(r.givenNameContext).toBe(row.char);expect(r.rows).toHaveLength(1);expect(r.rows[0].caseId).toBe(row.caseId);expect(r.rows[0].originalSourceBinding).toEqual(row.original);expect(r.rows[0].projectMeaning).toBe(row.editorial.meaning);expect(r.rows[0].projectWish).toBe(row.editorial.projectWish);expect(r.rows[0].limits).toEqual(row.editorial.limits);expect(r.rows[0].dictionaryOriginal).toBe(row.original.definition.def);expect(r.wholeNameMeaning).toBeNull();expect(r.wholeNameAssessment).toBe('not-assessed');expect(r.automaticNameRecommendation).toBe(false);expect(r.automaticSemanticCreditAllowed).toBe(false);expect(r.scoreDelta).toBe(0);expect(r).not.toHaveProperty('canPublish');expect(r).not.toHaveProperty('meaning');expect(JSON.stringify(entry)).toBe(before);}
 });
 it('full mixed-name request remains all-covered-only while independent single-position requests expose only 南',()=>{
  const request={ruleVersion:'naming-editorial-7.1.0',givenName:'南安',characters:[character('南'),character('安')],context};expect(lookup.generateCharacterNotes(request).status).toBe('not-covered');const perPosition=request.characters.map(c=>lookup.characterExplanation(c,context));expect(perPosition.map(r=>r.status)).toEqual(['character-explanations-ready','not-covered']);if(perPosition[0].status==='character-explanations-ready')expect(perPosition[0].givenNameContext).toBe('南');expect(lookup.generateCharacterNotes({...request,givenName:'南燚',characters:[character('南'),character('燚')]}).status).toBe('not-covered');
 });
 it('two fully admitted characters still have no whole-name permission or meaning',()=>{const r=lookup.generateCharacterNotes({ruleVersion:'naming-editorial-7.1.0',givenName:'南木',characters:[character('南'),character('木')],context});expect(r.status).toBe('character-explanations-ready');if(r.status==='character-explanations-ready'){expect(r.rows.map(r=>r.char)).toEqual(['南','木']);expect(r.wholeNameMeaning).toBeNull();expect(r.wholeNameAssessment).toBe('not-assessed');expect(r.automaticNameRecommendation).toBe(false);}});
 it('wrong reading/tone/source/word/meaning/complete reading or glyph cannot borrow the default note',()=>{
  const mutations=[(c:CharacterEntry)=>{c.pinyin='nàn';},(c:CharacterEntry)=>{c.tone=4;},(c:CharacterEntry)=>{c.sourceId='unknown';},(c:CharacterEntry)=>{c.readings![0].word='楠';},(c:CharacterEntry)=>{c.meaning='different';},(c:CharacterEntry)=>{c.readings![0].meanings=['different'];},(c:CharacterEntry)=>{c.traditional='楠';}];for(const change of mutations){const c=structuredClone(character('南'));change(c);expect(lookup.characterExplanation(c,context).status).toBe('not-applicable');}
 });
 it('request approval injection, wrong pack, wrong rule and character order are rejected',()=>{
  const r={ruleVersion:'naming-editorial-7.1.0',givenName:'南',characters:[character('南')],context};expect(lookup.generateCharacterNotes({...r,admission:{approved:true}} as unknown as typeof r).status).toBe('not-applicable');expect(lookup.generateCharacterNotes({...r,context:{...context,activeVersion:'changed'}}).status).toBe('not-applicable');expect(lookup.generateCharacterNotes({...r,ruleVersion:'naming-editorial-7.0.0'}).status).toBe('wrong-rule-version');expect(lookup.generateCharacterNotes({...r,givenName:'木'}).status).toBe('not-applicable');
 });
 it('pending/test-only/missing/duplicate/extra case or mismatched profile admissions fail before any query',()=>{
  for(const mutate of [(a:typeof admission)=>{a.decision='pending';},(a:typeof admission)=>{a.testOnly=true;},(a:typeof admission)=>{a.activation='none';},(a:typeof admission)=>{a.approvedCaseIds.pop();},(a:typeof admission)=>{a.approvedCaseIds[0]=a.approvedCaseIds[1];},(a:typeof admission)=>{a.approvedCaseIds.push('unreviewed');},(a:typeof admission)=>{a.profileSha256='0'.repeat(64);}]){const a=structuredClone(admission);mutate(a);expect(()=>createNamingCharacterReview71(profile,a,loaded.identity)).toThrow();}
 });
 it('caller objects cannot poison a captured lookup and returned notes are independent copies',()=>{
  const p=structuredClone(profile),a=structuredClone(admission),consumer=createNamingCharacterReview71(p,a,loaded.identity);p.cases[20].editorial.meaning='poison';a.approvedCaseIds=[];const r=consumer.characterExplanation(character('南'),context);expect(r.status).toBe('character-explanations-ready');if(r.status==='character-explanations-ready')r.rows[0].projectMeaning='poison';const again=consumer.characterExplanation(character('南'),context);if(again.status!=='character-explanations-ready')throw Error('lost admission');expect(again.rows[0].projectMeaning).not.toBe('poison');
 });
 it('getter and hidden permission keys never execute or flow into result metadata',()=>{
  let reads=0;const c=structuredClone(character('南'));Object.defineProperty(c,'pinyin',{enumerable:true,get(){reads++;return'nán';}});expect(lookup.characterExplanation(c,context).status).toBe('not-applicable');expect(reads).toBe(0);expect(()=>createNamingCharacterReview71(profile,admission,{...loaded.identity,canPublish:true} as unknown as typeof loaded.identity)).toThrow();
 });
 it('six corrections preserve exact reviewed text and original source contexts',()=>{
  for(const char of ['绪','朔','霆','中','黎','彩']){const row=loaded.profile.cases.find(r=>r.char===char)!,r=lookup.characterExplanation(character(char),context);if(r.status!=='character-explanations-ready')throw Error('missing corrected row');expect(r.rows[0].projectMeaning).toBe(row.editorial.meaning);expect(r.rows[0].limits).toEqual(row.editorial.limits);expect(r.rows[0].originalSourceBinding.definition).toEqual(row.original.definition);}
 });
 it('disk pending admission, deleted admission, changed original or missing manifest fail closed without fallback',()=>{
  for(const relative of ['naming-character-meanings-v7.1-admission.json','raw/moe-revised.json.gz','naming-character-meanings-v7.1-manifest.json']){const file=path.join(directory,relative),bytes=fs.readFileSync(file);fs.appendFileSync(file,'x');try{expect(()=>loadNamingEditorialV71Data(directory)).toThrow();}finally{fs.writeFileSync(file,bytes);}}
  const file=path.join(directory,'naming-character-meanings-v7.1-admission.json'),held=file+'.held';fs.renameSync(file,held);try{expect(()=>loadNamingEditorialV71Data(directory)).toThrow();}finally{fs.renameSync(held,file);}
 });
 it('old7 consumer stays at its exact old rows with no injected40 or generation adoption',()=>{
  const old=createNamingReviewLookup(oldTable as unknown as Parameters<typeof createNamingReviewLookup>[0]);expect(old.lookupMeaning(character('南'),context)).toBeUndefined();expect(oldTable.meaningReviews.filter(r=>r.automaticMeaningAllowed)).toHaveLength(304);expect(loaded.profile.cases.filter(r=>oldTable.meaningReviews.find(x=>x.char===r.char)?.automaticMeaningAllowed)).toHaveLength(0);expect(hash(fs.readFileSync(path.join(data,'naming-editorial-v7.json')))).toBe('392fa47441a0c410b0903c3e85853081225a1a5e9f540b5467e4ea4e2151cc48');
 });
});
