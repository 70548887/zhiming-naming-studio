import {describe,it,expect,beforeAll} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadNamingSemanticAdmissionV72,NAMING_V72_FIXED_PINS,semanticAdmissionDatasetV72} from '../src/main/naming-semantic-admission-v72-data';
import {createNamingSemanticGenerationV72} from '../src/main/naming-semantic-generation-v72';
import {assessNamingSemanticAdmission,createNamingSemanticAdmissionHandle,assertNamingSemanticOutput,assertSemanticLegacyReplayV72,semanticV72Canonical,semanticV72Hash} from '../src/domain/naming-semantic-admission-v72';
import {loadNamingEditorialV71Data} from '../src/main/naming-editorial-v7-data';
import {evaluateNameForRuleVersionWithContext} from '../src/domain/naming';
import {finalizeNamingCandidateForRuleVersion} from '../src/main/naming-meaning-review';
import {reviewedNamingSense} from '../src/domain/naming-semantics-v6';
import {createNamingReviewLookup} from '../src/domain/naming-review-v7.mjs';
import type {SupplementalReviewTable} from '../src/domain/naming-review-v7.mjs';
import {catalogSession} from './fixtures/catalog-session';
import {CURRENT_NAMING_RULE_VERSION} from '../src/shared/naming-rules';
import type {SemanticAdmissionContext,SemanticAdmissionHandle,SemanticAdmissionRecord,SemanticGenerationRequestV72,SemanticGeneratedCandidateV72} from '../src/shared/naming-semantic-admission-v72';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const decisionRoot='D:/Codex-NamingStudio-Evidence/m752-meaning-admission-decision/r2';
const m740Root='D:/Codex-NamingStudio-Evidence/m740-character-meanings';
const sourceDataDir=path.join(root,'data');
const config={decisionRoot,m740Root,sourceDataDir,m744AuditPath:'D:/Codex-NamingStudio-Evidence/m744-data-audit/M744-DATA-AUDIT.json'};
const evidence=path.join(root,'.local/m751-tests');fs.mkdirSync(evidence,{recursive:true});
const baseContext={packSha256:NAMING_V72_FIXED_PINS.pack,activeVersion:'1875aa49dcfa'};
let handle:SemanticAdmissionHandle,consumer:ReturnType<typeof createNamingSemanticGenerationV72>;
const executions:Array<Record<string,unknown>>=[];
const record=(kind:string,value:unknown)=>{executions.push({kind,value});fs.writeFileSync(path.join(evidence,'actual-results.json'),JSON.stringify(executions,null,2)+'\n');};
beforeAll(()=>{handle=loadNamingSemanticAdmissionV72(config);consumer=createNamingSemanticGenerationV72(handle);});
const themes=(row:SemanticAdmissionRecord)=>row.usage.mode==='explicit-themes'?[...row.usage.anyOf]:[];
const context=(row:SemanticAdmissionRecord,length:1|2=2,stage:SemanticAdmissionContext['stage']='local',themeIds:string[]=themes(row)):SemanticAdmissionContext=>({themeIds,requestedGivenNameLength:length,namePart:'given-name',stage,givenName:row.identity.char+(length===2?'安':''),fullName:'林'+row.identity.char+(length===2?'安':''),position:0,candidateId:'actual-'+row.identity.char});
const request=(givenName:string,themeIds:string[]=[]):SemanticGenerationRequestV72=>{
 const base=catalogSession();return{profile:{...base.profile,surname:'林',surnamePinyin:'lín',fatherName:'',motherName:''},preferences:{...base.preferences,length:[...givenName].length as 1|2,requiredChars:givenName,generationChar:'',forbiddenChars:'',elderTaboo:'',preferredElements:[],meanings:'',industry:'',numerology:false,zodiacRules:false,avoidParentNames:true},analysis:base.analysis,themeIds};
};
const entry=(char:string)=>semanticAdmissionDatasetV72(handle).characters.find(row=>row.char===char)!;
function legacy71(givenName:string){const r=request(givenName),data=semanticAdmissionDatasetV72(handle);const before=evaluateNameForRuleVersionWithContext('naming-editorial-7.0.0',baseContext,givenName,r.profile,r.preferences,r.analysis,data.characters,data.citations)!;expect(before).not.toBeNull();return finalizeNamingCandidateForRuleVersion('naming-editorial-7.1.0',before,r.profile,r.preferences,r.analysis,baseContext,loadNamingEditorialV71Data(sourceDataDir));}

describe('M751 next-version fixed source and reusable semantic gate',()=>{
 it('authenticates the real nine independent editorial grants and unchanged M740 ten',()=>{
  expect(handle.publication.records.filter(row=>row.decision==='allow-single-character-generation')).toHaveLength(9);
  expect(handle.publication.rows.filter(row=>row.candidateOnly&&row.activation==='off')).toHaveLength(10);
  expect(handle.publication.identity.decisionSha256).toBe('ecfb610b2c3467b9326e45c25fa4581870f6b3a2087b6490af08bd77d39ccbe6');
  expect(handle.publication.activation).toBe('not-current');record('loaded-publication',handle.publication.identity);
 });
 it('uses the same real gate for all10 rows and all6 qualification stages, including 叶 pending',()=>{
  const actual=[];
  for(const row of handle.publication.records)for(const stage of ['pool','required','local','ai','save','restore'] as const){
   const output=assessNamingSemanticAdmission(handle,entry(row.identity.char),context(row,2,stage));
   expect(output.status).toBe(row.decision==='pending'?'pending-source-identity':'eligible');
   actual.push({char:row.identity.char,stage,status:output.status});
  }
  record('sixty-runtime-qualifications-not-storage',actual);
 });
 it('allows 纪年岁 without themes or future family signatures',()=>{
  for(const char of ['纪','年','岁']){const row=handle.publication.records.find(row=>row.identity.char===char)!;for(const length of [1,2] as const)expect(assessNamingSemanticAdmission(handle,entry(char),context(row,length,'local',[])).status).toBe('eligible');}
 });
 it('requires the six exact explicit themes and the three two-character restrictions',()=>{
  for(const row of handle.publication.records.filter(row=>row.decision==='allow-single-character-generation'&&row.usage.mode==='explicit-themes')){
   expect(assessNamingSemanticAdmission(handle,entry(row.identity.char),context(row,2,'ai',[])).status).toBe('needs-theme');
   expect(assessNamingSemanticAdmission(handle,entry(row.identity.char),context(row,2,'ai',['自然'])).status).toBe('rejected-integrity');
   expect(assessNamingSemanticAdmission(handle,entry(row.identity.char),context(row,2,'local')).status).toBe('eligible');
   if(['纶','作','萧'].includes(row.identity.char))expect(assessNamingSemanticAdmission(handle,entry(row.identity.char),context(row,1,'required')).status).toBe('candidate-scope-mismatch');
  }
 });
 it('rejects changed default reading, full reading metadata, source and unsupported caller claims',()=>{
  const row=handle.publication.records.find(row=>row.identity.char==='纪')!,baseline=entry('纪');
  expect(assessNamingSemanticAdmission(handle,{...baseline,pinyin:'jǐ',tone:3},context(row)).status).toBe('reading-mismatch');
  const altered=structuredClone(baseline);altered.readings![0].meanings=['伪造'];
  expect(assessNamingSemanticAdmission(handle,altered,context(row)).status).toBe('rejected-integrity');
  expect(assessNamingSemanticAdmission(handle,{...baseline,sourceId:'self-signed'},context(row)).status).toBe('rejected-integrity');
  expect(()=>assessNamingSemanticAdmission(handle,baseline,{...context(row),approved:true} as any)).toThrow('unknown field');
  expect(()=>assessNamingSemanticAdmission(handle,baseline,{...context(row),themeIds:null} as any)).toThrow();
 });
 it('does not convert missing/manual/reject rows or unsupported predicates into approval',()=>{
  const row=handle.publication.records.find(row=>row.identity.char==='纪')!;
  for(const decision of ['manual-only','reject'] as const){
   const fixture=structuredClone(handle.publication);(fixture.records.find(r=>r.identity.char==='纪') as any).decision=decision;
   const pure=createNamingSemanticAdmissionHandle(fixture);
   expect(assessNamingSemanticAdmission(pure,entry('纪'),context(row)).status).toBe(decision==='manual-only'?'manual-only':'not-admitted');
   expect(()=>createNamingSemanticGenerationV72(pure)).toThrow('main-authenticated');
  }
  const missing=structuredClone(handle.publication);(missing as any).records=missing.records.filter(r=>r.identity.char!=='纪');(missing as any).rows=missing.rows.filter(r=>r.char!=='纪');
  expect(assessNamingSemanticAdmission(createNamingSemanticAdmissionHandle(missing),entry('纪'),context(row)).status).toBe('not-admitted');
  const unsupported=structuredClone(handle.publication);(unsupported.records.find(r=>r.identity.char==='纪') as any).machineConditions.requiresSecretApproval=true;
  expect(assessNamingSemanticAdmission(createNamingSemanticAdmissionHandle(unsupported),entry('纪'),context(row)).status).toBe('condition-not-supported');
 });
 it('does not interpret conflict labels as a new blanket blocker or family-signature predicate',()=>{
  const row=handle.publication.records.find(row=>row.identity.char==='萧')!;
  expect(row.conflictIds).toContain('alt-sense:desolate-solemn');
  const result=assessNamingSemanticAdmission(handle,entry('萧'),context(row));expect(result.status).toBe('eligible');
  expect(result.project!.limits.join('')).toContain('萧条');
 });
 it('preserves actual old217+304 explanation set in a union, with3 no-theme /9 all-theme additions',()=>{
  const dataset=semanticAdmissionDatasetV72(handle),table=JSON.parse(fs.readFileSync(path.join(sourceDataDir,'naming-editorial-v7.json'),'utf8'));
  const lookup=createNamingReviewLookup(table as SupplementalReviewTable);
  const legacy=dataset.characters.filter(row=>!!reviewedNamingSense(row)||!!lookup.lookupMeaning(row,baseContext));
  expect(legacy).toHaveLength(521);
  const noTheme=consumer.pool(legacy,{themeIds:[],requestedGivenNameLength:2,namePart:'given-name',stage:'pool'});
  const all=consumer.pool(legacy,{themeIds:[...handle.publication.themes],requestedGivenNameLength:2,namePart:'given-name',stage:'pool'});
  expect(noTheme).toHaveLength(524);expect(all).toHaveLength(530);
  expect(legacy.every(before=>all.some(after=>after.char===before.char))).toBe(true);
  record('runtime-sets-not-production-coverage',{legacy:legacy.length,noTheme:noTheme.length,allThemes:all.length,activatedFormalCoverageAdded:0});
 });
});

describe('M751 actual opt-in generation and save/restore consumer',{timeout:120000},()=>{
 it('produces all nine true local candidates with pinned project text, no new score/whole-name grant',()=>{
  const generated=[];
  for(const row of handle.publication.records.filter(row=>row.decision==='allow-single-character-generation')){
   const name=row.identity.char+'安',r=request(name,themes(row));
   const output=consumer.evaluate(r,name,'local');expect(output.status,row.identity.char).toBe('generated');
   const candidate=output.candidate!;expect(candidate.meaning).toContain(row.project.meaning);
   expect(candidate.semanticAdoption72.rows[0].adoption!.reviewId).toBe(row.reviewId);
   expect(candidate.evaluation).toEqual(legacy71(name).evaluation);
   expect(candidate.characters[0]).toEqual(entry(row.identity.char));
   const revisions=candidate.semanticAdoption72.warningRevisions;
   for(const revision of revisions){expect(candidate.warnings).not.toContain(revision.from);expect(candidate.warnings).toContain(revision.to);expect(candidate.semanticAdoption72.baseWarnings).toContain(revision.from);}
   expect(candidate.warnings.some(w=>w.startsWith(row.identity.char+'的限定用途需人工确认'))).toBe(false);
   expect(candidate.semanticAdoption72.wholeNameMeaning).toBeNull();expect(candidate.semanticAdoption72.scoreDelta).toBe(0);
   generated.push(candidate);
  }
  record('nine-actual-local-evaluations',generated);
 });
 it('required chars cannot force 叶, missing theme or one-character restricted meaning into generation',()=>{
  for(const [name,ids,status] of [['叶',[],'pending-source-identity'],['邦',[],'needs-theme'],['纶',['textile-ribbon'],'candidate-scope-mismatch']] as const){
   const r=request(name,[...ids]),required=consumer.required(r);expect(required[0].result.status).toBe(status);
   const local=consumer.generateLocal(r);expect(local.candidates).toEqual([]);
   expect(consumer.evaluate(r,name,'ai').status).toBe('blocked-admission');
  }
 });
 it('actual local generator selects general/default and explicit theme candidates without expanding pending',()=>{
  const general=consumer.generateLocal(request('纪'),7);expect(general.candidates.map(c=>c.givenName)).toEqual(['纪']);
  const conditional=consumer.generateLocal(request('邦',['civic-homeland']),7);expect(conditional.candidates.map(c=>c.givenName)).toEqual(['邦']);
  expect(general.candidates[0].meaning).toContain('丝线头绪');expect(conditional.candidates[0].meaning).toContain('国家');
  record('actual-local-generation',{general,conditional});
 });
 it('replaces only precisely bound historical scope warnings; current neutral meanings need no family/full-name signature',()=>{
  for(const char of ['纪','年','岁']){
   const candidate=consumer.evaluate(request(char),char).candidate!;
   expect(candidate.semanticAdoption72.warningRevisions).toHaveLength(1);
   const revision=candidate.semanticAdoption72.warningRevisions[0];
   expect(revision.char).toBe(char);expect(revision.reason).toBe('versioned-admission-replaces-old-scope');
   const oldWarnings=legacy71(char).warnings;
   expect(oldWarnings).toContain(revision.from);
   for(const old of oldWarnings)if(old!==revision.from&&!old.startsWith(`${char}尚未建立`))expect(candidate.warnings).toContain(old);
   expect(consumer.verifySaved(candidate,request(char),'restore').ok).toBe(true);
  }
 });
 it('AI proposal path consumes only glyph strings, applies same policy and renders no AI prose',()=>{
  const r=request('作安',['literary-artwork']);
  const [actual]=consumer.evaluateAiProposals(r,[{givenName:'作安'}]);expect(actual.candidate!.origin).toBe('ai');
  expect(actual.candidate!.meaning).toContain('艺术作品');
  expect(()=>consumer.evaluateAiProposals(r,[{givenName:'作安',meaning:'孩子必定才华横溢',approved:true}])).toThrow('unknown field');
  record('actual-ai-offline-consumer',actual);
 });
 it('preserves old parent avoidance, forbiddens and score semantics',()=>{
  const r=request('纪');r.profile.fatherName='林纪';
  expect(consumer.evaluate(r,'纪').status).toBe('blocked-existing-constraints');
  const forbidden=request('年');forbidden.preferences.forbiddenChars='年';expect(consumer.evaluate(forbidden,'年').status).toBe('blocked-existing-constraints');
 });
 it('does not apply pending给名叶 or jì restrictions to a surname',()=>{
  const r=request('年');r.profile.surname='叶';r.profile.surnamePinyin='yè';
  const actual=consumer.evaluate(r,'年');expect(actual.candidate!.fullName).toBe('叶年');
  const ji=request('年');ji.profile.surname='纪';ji.profile.surnamePinyin='jǐ';expect(consumer.evaluate(ji,'年').candidate!.fullName).toBe('纪年');
 });
 it.each([['纪',[]],['邦',['civic-homeland']]] as const)('checks actual %s producer receipts at save and restore, including on-disk roundtrip', (name,ids)=>{
  const r=request(name,[...ids]),candidate=consumer.evaluate(r,name).candidate!;
  const file=path.join(evidence,`saved-${name}.json`);fs.writeFileSync(file,JSON.stringify(candidate,null,2)+'\n');
  const saved=JSON.parse(fs.readFileSync(file,'utf8')) as SemanticGeneratedCandidateV72;
  const save=consumer.verifySaved(saved,r,'save'),restore=consumer.verifySaved(saved,r,'restore');
  expect(save.receiptCount).toBe(1);expect(restore.receiptCount).toBe(1);
  const forged=structuredClone(saved);forged.semanticAdoption72.rows[0].adoption!.projectSha256='f'.repeat(64);
  expect(()=>consumer.verifySaved(forged,r,'restore')).toThrow('receipt');
  for(const [field,value] of [['traditionalReason','全名已审，未来必定长寿'],['style','伪造风格']] as const){
   const altered=structuredClone(saved);altered[field]=value;
   expect(()=>consumer.verifySaved(altered,r,'restore')).toThrow('saved candidate fact '+field);
  }
  const relabelled=structuredClone(saved);relabelled.origin='ai';
  expect(()=>consumer.verifySaved(relabelled,r,'restore')).toThrow('saved generation origin');
  const invalidOrigin=structuredClone(saved);(invalidOrigin as any).origin='trusted';
  expect(()=>consumer.verifySaved(invalidOrigin,r,'restore')).toThrow('saved generation origin');
  const editable=structuredClone(saved);editable.favorite=!editable.favorite;editable.reviewNote='家人备注';
  expect(consumer.verifySaved(editable,r,'restore').ok).toBe(true);
  const changedContext={...r,themeIds:[]};
  if(name==='邦')expect(()=>consumer.verifySaved(saved,changedContext,'restore')).toThrow();
  record('real-producer-receipt-save-restore',{name,save,restore,file,sha256:semanticV72Hash(fs.readFileSync(file))});
 });
 it('retains actual old7.1 candidate bytes and no new receipt; new policy cannot backfill it',()=>{
  const old=legacy71('南安'),before=JSON.stringify(old),replay=consumer.replayLegacy(old);
  expect(JSON.stringify(replay.candidate)).toBe(before);
  expect(replay.assertion).toEqual({ok:true,assertionKind:'preserve-legacy',oldBytesUnchanged:true,noNewReceipt:true});
  expect(Object.hasOwn(old,'semanticAdoption72')).toBe(false);
  record('actual-legacy71-replay',{old,replayed:replay.candidate,assertion:replay.assertion,beforeSha256:semanticV72Hash(before),afterSha256:semanticV72Hash(JSON.stringify(replay.candidate))});
 });
 it('separates output assertions from qualification; only exact pinned output is accepted',()=>{
  expect(assertNamingSemanticOutput('row',{scoreDelta:0,wholeNameMeaning:null,generatedText:'取时光意象。',expectedText:'取时光意象。'})).toEqual({ok:true,assertionKind:null});
  expect(assertNamingSemanticOutput('row',{scoreDelta:10,wholeNameMeaning:null,generatedText:'a',expectedText:'a'})).toMatchObject({ok:false,assertionKind:'reject-semantic-credit'});
  expect(assertNamingSemanticOutput('row',{scoreDelta:0,wholeNameMeaning:'全名已审',generatedText:'a',expectedText:'a'})).toMatchObject({ok:false,assertionKind:'reject-unreviewed-claim'});
  expect(assertNamingSemanticOutput('row',{scoreDelta:0,wholeNameMeaning:null,generatedText:'孩子必定长寿',expectedText:'时光'})).toMatchObject({ok:false,assertionKind:'reject-unreviewed-claim'});
 });
 it('rejects forged main handle and accessors/Proxy without running traps',()=>{
  const pure=createNamingSemanticAdmissionHandle(handle.publication);expect(()=>createNamingSemanticGenerationV72(pure)).toThrow('main-authenticated');
  let calls=0;const configGetter:any={...config};Object.defineProperty(configGetter,'decisionRoot',{enumerable:true,get(){calls++;return config.decisionRoot;}});
  expect(()=>loadNamingSemanticAdmissionV72(configGetter)).toThrow('own enumerable');expect(calls).toBe(0);
  const proxy=new Proxy({...config},{getPrototypeOf(){calls++;throw Error('trap');}});expect(()=>loadNamingSemanticAdmissionV72(proxy)).toThrow('Proxy');expect(calls).toBe(0);
 });
 it('fails closed on a tampered policy or source without changing original resources',()=>{
  const copied=fs.mkdtempSync(path.join(evidence,'bad-policy-'));
  try{
   fs.copyFileSync(path.join(decisionRoot,'manifest.json'),path.join(copied,'manifest.json'));fs.appendFileSync(path.join(copied,'manifest.json'),'\n');
   expect(()=>loadNamingSemanticAdmissionV72({...config,decisionRoot:copied})).toThrow('fixed bytes');
   expect(()=>loadNamingSemanticAdmissionV72({...config,sourceDataDir:copied})).toThrow();
  }finally{fs.rmSync(copied,{recursive:true,force:true});}
 });
 it('revalidates fixed sources in a relocated directory and rejects changed dataset bytes',()=>{
  const relocated=fs.mkdtempSync(path.join(evidence,'source-')),dataDir=path.join(relocated,'data');
  fs.mkdirSync(dataDir);
  const manifest=JSON.parse(fs.readFileSync(path.join(m740Root,'data/manifest.json'),'utf8'));
  try{
   for(const pin of manifest.sourceFiles.filter((pin:any)=>pin.root==='product-data'||pin.root==='product-root')){
    const source=pin.root==='product-data'?path.join(sourceDataDir,pin.file):path.join(root,pin.file),target=pin.root==='product-data'?path.join(dataDir,pin.file):path.join(relocated,pin.file);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    if(pin.file==='raw/moe-revised.json.gz')fs.linkSync(source,target);else fs.copyFileSync(source,target);
   }
   fs.copyFileSync(path.join(sourceDataDir,'knowledge-v6.sqlite'),path.join(dataDir,'knowledge-v6.sqlite'));
   const moved=loadNamingSemanticAdmissionV72({...config,sourceDataDir:dataDir});
   expect(assessNamingSemanticAdmission(moved,entry('年'),context(handle.publication.records.find(row=>row.identity.char==='年')!,1)).status).toBe('eligible');
   fs.appendFileSync(path.join(dataDir,'dataset-v6.json'),'\n');
   expect(()=>loadNamingSemanticAdmissionV72({...config,sourceDataDir:dataDir})).toThrow('fixed bytes');
  }finally{fs.rmSync(relocated,{recursive:true,force:true});}
 });
 it('keeps Current/7.1 fixed publication files and every M740 delivered artifact unchanged',()=>{
  expect(CURRENT_NAMING_RULE_VERSION).toBe('naming-editorial-7.1.0');
  const current=JSON.parse(fs.readFileSync(path.join(m740Root,'M740-MANIFEST.json'),'utf8'));
  for(const pin of current.files){const bytes=fs.readFileSync(path.join(m740Root,pin.file));expect(bytes.length).toBe(pin.bytes);expect(semanticV72Hash(bytes)).toBe(pin.sha256);}
  const pinned=JSON.parse(fs.readFileSync(path.join(m740Root,'data/source-lock.json'),'utf8'));
  const targets=pinned.sourceFiles.filter((pin:any)=>pin.root==='product-data'&&(pin.file.startsWith('naming-character-meanings-v7')||pin.file==='dataset-v6.json'||pin.file==='naming-editorial-v7.json'));
  for(const pin of targets)expect(semanticV72Hash(fs.readFileSync(path.join(sourceDataDir,pin.file)))).toBe(pin.sha256);
  record('frozen-artifact-check',{M740Files:current.files.length,oldPublicationFiles:targets.map((pin:any)=>pin.file),currentVersion:CURRENT_NAMING_RULE_VERSION,formalCoverageAdded:0});
 });
});
