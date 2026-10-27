import{beforeAll,afterAll,describe,it,expect,vi}from'vitest';
const ruleState=vi.hoisted(()=>({version:'naming-editorial-7.0.0'}));
vi.mock('../src/shared/naming-rules',async importOriginal=>{const actual=await importOriginal<typeof import('../src/shared/naming-rules')>();return{...actual,get CURRENT_NAMING_RULE_VERSION(){return ruleState.version;},get NAMING_RULE_SOURCE_ID(){return ruleState.version===actual.NAMING_RULE_V71_VERSION?actual.NAMING_RULE_V71_SOURCE_ID:actual.NAMING_RULE_V7_SOURCE_ID;}};});
import fs from'node:fs';import path from'node:path';import os from'node:os';import{createRequire}from'node:module';
import{Store}from'../src/main/store';import{StudioService}from'../src/main/service';
import{evaluateNameForRuleVersionWithContext}from'../src/domain/naming';
import{NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION,NAMING_RULE_V71_SOURCE_ID,ALL_NAMING_RULE_SOURCE_IDS}from'../src/shared/naming-rules';
import{loadNamingEditorialV71Data}from'../src/main/naming-editorial-v7-data';
import{modernRecordView}from'../src/shared/modern-practical-evidence';
import type{BirthProfile,NamingPreferences,NamingSession}from'../src/shared/types';
const parent=fs.realpathSync.native(os.tmpdir()),data=path.resolve('data'),wasm=createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm'),published=loadNamingEditorialV71Data(data);
const profile=(id:string):BirthProfile=>({id,customerName:'命名7.1隔离虚构家庭',surname:'林',surnamePinyin:'lín',fatherName:'林文舟',motherName:'陈若兰',gender:'中性',calendar:'solar',birthDate:'2026-10-17',leapMonth:false,birthTime:'09:30',timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'仅测试，不是客户资料',timeBasis:'civil',renMethod:'none',monthAuthorityMethod:'no-fixed-day/1.0.0',seasonalMethod:'no-monthly/1.0.0'});
const preferences=(name:string):NamingPreferences=>({length:[...name].length as 1|2,generationChar:[...name][0],requiredChars:[...name].slice(1).join(''),forbiddenChars:'',elderTaboo:'',style:'自然',meanings:'',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false,avoidParentNames:true,yueReading:false,yueHomophones:'none',imageryReading:false,wordPronunciationReference:false,elementAssessment:false});
interface OwnedStore{directory:string;prefix:string;store:Store;service:StudioService;}
const ownedDirectories=new Map<string,string>();
function removeOwnedDirectory(directory:string,prefix:string){
 if(ownedDirectories.get(directory)!==prefix||path.dirname(directory)!==parent||!path.basename(directory).startsWith(prefix))throw Error('Unsafe owned Service directory identity');
 const stat=fs.lstatSync(directory);if(!stat.isDirectory()||stat.isSymbolicLink()||fs.realpathSync.native(directory)!==directory)throw Error('Unsafe owned Service directory boundary');
 fs.rmSync(directory,{recursive:true,force:false});ownedDirectories.delete(directory);
}
async function closeOwnedStore(context:OwnedStore){
 try{await context.service.closeCmnReadingWorker();}finally{try{context.store.db?.close();}finally{removeOwnedDirectory(context.directory,context.prefix);}}
}
async function openOwnedStore(prefix:string):Promise<OwnedStore>{
 if(!/^naming71-service-(?:lifecycle-|batch-[1-8]-)$/.test(prefix))throw Error('Unknown owned Service fixture prefix');
 const directory=fs.realpathSync.native(fs.mkdtempSync(path.join(parent,prefix)));ownedDirectories.set(directory,prefix);
 const store=new Store(directory,data,wasm);let service:StudioService|undefined;
 try{await store.init();service=new StudioService(store,{read:()=>'',write:()=>{}},false);return{directory,prefix,store,service};}
 catch(error){try{await service?.closeCmnReadingWorker();}finally{try{store.db?.close();}finally{removeOwnedDirectory(directory,prefix);}}throw error;}
}

describe('real71 Service Store reopen history backup and modern core; no UI/PDF claim',()=>{
 let lifecycle:OwnedStore|undefined,directory:string,store:Store,service:StudioService,old70:NamingSession,new71:NamingSession;
 beforeAll(async()=>{lifecycle=await openOwnedStore('naming71-service-lifecycle-');directory=lifecycle.directory;store=lifecycle.store;service=lifecycle.service;},60000);
 afterAll(async()=>{if(lifecycle)await closeOwnedStore(lifecycle);});
 it('saves old70 then regenerates the same constrained mixed name under71 without rewriting the old record',async()=>{
  ruleState.version='naming-editorial-7.0.0';const p=profile('m148-dual-version');old70=(await service.generate(p,preferences('南安'))).session;const oldBytes=JSON.stringify(old70);expect(old70.namingRules?.version).toBe('naming-editorial-7.0.0');expect(old70.candidates).toHaveLength(1);
  ruleState.version='naming-editorial-7.1.0';new71=(await service.generate(p,preferences('南安'))).session;expect(new71.namingRules?.version).toBe('naming-editorial-7.1.0');expect(new71.candidates).toHaveLength(1);expect(new71.candidates[0].givenName).toBe(old70.candidates[0].givenName);expect(new71.candidates[0].evaluation).toEqual(old70.candidates[0].evaluation);expect(new71.candidates[0].characters).toEqual(old70.candidates[0].characters);expect(new71.candidates[0].meaning).not.toBe(old70.candidates[0].meaning);expect(JSON.stringify(store.readVerifiedSession(old70.id))).toBe(oldBytes);
  const dedicated=new71.sourceSnapshot!.sources.filter(s=>s.id.startsWith('naming-editorial-')||s.id==='naming-character-meanings-v7.1-fixed').filter(s=>['naming-editorial-readings-v4-fixed','naming-editorial-names-v5-fixed','naming-editorial-dictionary-v6-fixed','naming-editorial-meanings-v7-fixed','naming-character-meanings-v7.1-fixed'].includes(s.id));expect(dedicated.map(s=>s.id)).toEqual(['naming-character-meanings-v7.1-fixed']);
 },60000);
 it('ordinary manual prose edit keeps71 snapshot immutable and history restores its exact saved version',()=>{
  const before=store.readVerifiedSession(new71.id)!;const changed=structuredClone(before);changed.candidates[0].meaning='人工编辑的家庭祝愿，不改逐字来源';changed.reviewNote='真实Service审阅';const saved=service.saveSession(changed);expect(saved.candidates[0].namingMeaningReview).toEqual(before.candidates[0].namingMeaningReview);const history=service.listHistory(saved.id),target=history.find(r=>r.session.reviewRevision===before.reviewRevision)!;expect(target).toBeTruthy();const restored=service.restoreHistory(saved.id,target.id,saved.reviewRevision,saved.reviewToken);expect(restored.candidates).toEqual(before.candidates);expect(restored.namingRules).toEqual(before.namingRules);new71=restored;const forged=structuredClone(restored);forged.candidates[0].namingMeaningReview!.rows[0].char='木';expect(()=>service.saveSession(forged)).toThrow();
 },30000);
 it('modern71 records its real71 identity while reusing explicit old70 scoring basis with no note score credit',()=>{
  const before=store.readVerifiedSession(new71.id)!;const saved=service.recordModernPracticalEvidence(before.id,before.candidates[0].id,before.reviewRevision!,before.reviewToken),view=modernRecordView(saved.candidates[0]);expect(view.state).toBe('current');expect(saved.candidates[0].evaluation).toEqual(before.candidates[0].evaluation);if(view.record?.evidence.status!=='recorded-evidence')throw Error('Modern evidence unavailable');const observations=view.record.evidence.observations;expect(observations.meaningIndustry.industry.ruleVersion).toBe('naming-editorial-7.1.0');expect(observations.distinctiveness.recordedRuleVersion).toBe('naming-editorial-7.1.0');const ref=observations.meaningIndustry.industry.implementationReference;expect(ref).toMatchObject({consumedByRuleVersion:'naming-editorial-7.1.0',baseScoringRuleVersion:'naming-editorial-7.0.0',additionalCharacterNotesAffectScoring:false});new71=saved;
 },30000);
 it('backup restore and a fresh Store reread preserve old70 and new71 raw snapshots together',async()=>{
  const oldBefore=store.readVerifiedSession(old70.id)!,newBefore=store.readVerifiedSession(new71.id)!,backup=store.backupBytes();store.restore(backup);const reader=await new Store(directory,data,wasm).init();try{const a=reader.readVerifiedSession(old70.id)!,b=reader.readVerifiedSession(new71.id)!;expect(a.candidates).toEqual(oldBefore.candidates);expect(b.candidates).toEqual(newBefore.candidates);expect(a.namingRules?.version).toBe('naming-editorial-7.0.0');expect(b.namingRules?.version).toBe('naming-editorial-7.1.0');expect(a.candidates[0].namingMeaningReview).not.toHaveProperty('scope');expect(b.candidates[0].namingMeaningReview!.version).toBe('naming-editorial-7.1.0');expect(a.reviewToken).not.toBe(oldBefore.reviewToken);expect(b.reviewToken).not.toBe(newBefore.reviewToken);}finally{reader.db.close();}
 },60000);
});

const characterBatches=Array.from({length:8},(_,index)=>published.profile.cases.slice(index*5,index*5+5));
const flattenedCases=characterBatches.flat();
if(published.profile.cases.length!==40||characterBatches.some(batch=>batch.length!==5)||new Set(flattenedCases.map(row=>row.caseId)).size!==40||new Set(flattenedCases.map(row=>row.char)).size!==40||flattenedCases.some((row,index)=>row.caseId!==published.profile.cases[index].caseId))throw Error('Character batches must cover the exact ordered40 admitted cases once');
describe('real71 independent character batches; functional coverage is not a cumulative performance benchmark',()=>{
 for(const[batchIndex,rows]of characterBatches.entries()){
  it(`actual71 characters batch ${batchIndex+1}/8 [${rows.map(row=>row.char).join('')}]`,async()=>{
   ruleState.version=NAMING_RULE_V71_VERSION;const owned=await openOwnedStore(`naming71-service-batch-${batchIndex+1}-`);
   try{for(const[offset,row]of rows.entries()){
    const session=(await owned.service.generate(profile('m148-char-'+(batchIndex*5+offset)),preferences(row.char))).session;expect(session.candidates).toHaveLength(1);const candidate=session.candidates[0],snapshot=candidate.namingMeaningReview!;
    expect(candidate.givenName).toBe(row.char);expect(candidate.originalMeaning).toBe(candidate.meaning);expect(candidate.meaning).toContain(row.editorial.meaning.replace(/[。；;]+$/g,''));expect(snapshot.version).toBe('naming-editorial-7.1.0');if(snapshot.version!=='naming-editorial-7.1.0')throw Error('Wrong version');const note=snapshot.rows[0];if(note.kind!=='character-level-project-explanation'||note.characterExplanation.status!=='character-explanations-ready')throw Error('Missing actual stored note');expect(note.characterExplanation.rows[0].caseId).toBe(row.caseId);expect(candidate.characters[0]).toEqual(row.baselineCharacter);
    expect(snapshot.sourceId).toBe(NAMING_RULE_V71_SOURCE_ID);expect(snapshot.packSha256).toBe(published.profile.base.packSha256);expect(snapshot.scoreDelta).toBe(0);expect(snapshot.automaticSemanticCreditAllowed).toBe(false);
    const dedicated=session.sourceSnapshot!.sources.filter(source=>(ALL_NAMING_RULE_SOURCE_IDS as readonly string[]).includes(source.id));expect(dedicated.map(source=>source.id)).toEqual([NAMING_RULE_V71_SOURCE_ID]);
    const generationPreferences=session.profile.namingPreferences;if(!generationPreferences)throw Error('Actual generated preferences missing');const original=evaluateNameForRuleVersionWithContext(NAMING_RULE_V7_VERSION,{packSha256:published.profile.base.packSha256,activeVersion:published.profile.base.activeVersion},row.char,session.profile,generationPreferences,session.analysis,owned.store.dataset.characters,owned.store.dataset.citations);expect(original).not.toBeNull();expect(candidate.evaluation).toEqual(original!.evaluation);
    expect(owned.store.readVerifiedSession(session.id)).toEqual(session);
   }}finally{await closeOwnedStore(owned);}
  },180000);
 }
});
