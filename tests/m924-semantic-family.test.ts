import {afterAll,afterEach,beforeAll,describe,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import initSqlJs from 'sql.js';
import {M923_FAMILY} from '../src/shared/naming-semantic-m923';
import type {M921M923FamilyHandle,M923Context,M923PoolContext,M923ConstraintInputs,M923GeneratedCandidate,M923GenerationRequest,M923Receipt} from '../src/shared/naming-semantic-m923';
import {loadM921M923Family,refreshM921M923Family,getAuthenticatedM923Resources} from '../src/main/naming-semantic-m923-data';
import {assessM921M923,issueM921M923Receipt,validateM921M923Receipt,validateAndAssessM921M923Saved} from '../src/main/naming-semantic-m923';
import {createNamingSemanticGenerationM923} from '../src/main/naming-semantic-generation-m923';
import {loadNamingSemanticAdmissionV72} from '../src/main/naming-semantic-admission-v72-data';
import {createNamingSemanticAdmissionHandle} from '../src/domain/naming-semantic-admission-v72';
import {createNamingSemanticGenerationV72} from '../src/main/naming-semantic-generation-v72';
import {normalizePreferences} from '../src/shared/workflow';
import {catalogSession} from './fixtures/catalog-session';
import spec from './fixtures/m924-runtime-expectations.json';

const root=fileURLToPath(new URL('../',import.meta.url)),familyDir=path.join(root,'data/naming-semantic-m923');
const dataDir=path.join(root,'data'),require=createRequire(import.meta.url);
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
const sha=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
const absolute=(value:unknown)=>path.resolve(String(value)).replaceAll('\\','/').toLowerCase();
type Baseline=typeof spec.baselines[number];
const baseline=(char='安')=>spec.baselines.find(row=>row.char===char)!;
const selection={...M923_FAMILY,enabled:true as const};
let handle:M921M923FamilyHandle,consumer:ReturnType<typeof createNamingSemanticGenerationM923>;
const completed=new Map<string,{status:'covered'|'partial';details:string}>();
const observations:Array<{kind:string;value:unknown}>=[];
const cover=(ids:string[],details:string,status:'covered'|'partial'='covered')=>ids.forEach(id=>completed.set(id,{status,details}));
const observe=(kind:string,value:unknown)=>observations.push({kind,value});

function request(givenName='安'):M923GenerationRequest {
 const source=catalogSession();
 return{profile:{...source.profile,id:'m924-real-birth',surname:'赵',surnamePinyin:'zhào',fatherName:'',motherName:''},
  preferences:normalizePreferences({length:[...givenName].length as 1|2,requiredChars:givenName,generationChar:'',forbiddenChars:'',elderTaboo:'',preferredElements:[],meanings:'',industry:'',numerology:false,zodiacRules:false,avoidParentNames:true}),
  familySelection:{...selection},themeIds:[]};
}
function constraints(givenName='安',length?:1|2):M923ConstraintInputs {const r=request(givenName);if(length)r.preferences.length=length;return{profile:r.profile,preferences:r.preferences};}
function pool(row:Baseline=baseline(),length:1|2=1):M923PoolContext {
 return{stage:'pool',candidateCaseId:row.candidateCaseId,char:row.char,...row.sourceQualification,requestedGivenNameLength:length,familySelection:{...selection},themeIds:[]} as M923PoolContext;
}
function context<S extends M923Context['stage']='local'>(row:Baseline=baseline(),givenName=row.char,position=0,stage:S='local' as S):M923Context&{stage:S} {
 return{stage,candidateCaseId:row.candidateCaseId,candidateId:'m924-actual-'+givenName,fullName:'赵'+givenName,surname:'赵',givenName,position,char:row.char,
  ...row.sourceQualification,givenNameLength:[...givenName].length as 1|2,familySelection:{...selection},themeIds:[]} as M923Context&{stage:S};
}
function expectBlocked(value:unknown,code:string) {expect(value).toMatchObject({ok:false,code});}
function expectRejected(action:()=>unknown,codes:readonly string[]) {
 try{const output=action() as {ok?:boolean;status?:string;code?:string};expect(output?.ok===false||output?.status==='blocked').toBe(true);expect(codes).toContain(output.code);}
 catch(error){expect(codes.some(code=>String((error as Error).message).includes(code)||(error as {code?:string}).code===code)).toBe(true);}
}
function withReads<T>(replacements:Map<string,Buffer|Error>,action:()=>T):T {
 const actual=fs.readFileSync;
 const spy=vi.spyOn(fs,'readFileSync').mockImplementation(((filename:unknown,options:unknown)=>{
  const replacement=replacements.get(absolute(filename));if(replacement instanceof Error)throw replacement;
  if(replacement)return typeof options==='string'||options&&typeof options==='object'&&'encoding' in options?replacement.toString('utf8'):Buffer.from(replacement);
  return actual(filename as fs.PathOrFileDescriptor,options as any);
 }) as typeof fs.readFileSync);
 try{return action();}finally{spy.mockRestore();}
}
function intercepted(file:string,value:Buffer|Error,action:()=>unknown) {return withReads(new Map([[absolute(file),value]]),action);}
function finalized(givenName='安',origin:'local'|'ai'='local'):M923GeneratedCandidate {
 const result=consumer.evaluate(request(givenName),givenName,origin);expect(result.status,givenName).toBe('generated');
 if(result.status!=='generated')throw Error('test prerequisite: actual finalizer blocked '+givenName);
 return result.candidate;
}
function savedContext(candidate:M923GeneratedCandidate,position=0,stage:'save'|'restore'='restore'):M923Context {
 const receipt=candidate.semanticAdoptionM923.rows[position].adoption!;
 return{...context(baseline(receipt.char),candidate.givenName,position,stage),candidateId:candidate.id,fullName:candidate.fullName};
}
function mutatedPrimitive(value:unknown):unknown {if(value===null)return'forged';if(typeof value==='number')return value+1;if(typeof value==='string')return value+'-tampered';return false;}

beforeAll(()=>{const loaded=loadM921M923Family();expect(loaded.ok).toBe(true);if(!loaded.ok)throw Error(loaded.code);handle=loaded.handle;consumer=createNamingSemanticGenerationM923(handle);},120000);
afterEach(()=>vi.restoreAllMocks());
afterAll(()=>{
 const evidence=process.env.M924_TEST_EVIDENCE_DIR??path.join(root,'.local/m924-runtime-tests');fs.mkdirSync(evidence,{recursive:true});
 const cases=spec.cases.map(row=>({id:row.id,scenario:row.scenario,...completed.get(row.id),...(!completed.has(row.id)?{status:'pending',details:'未执行；实际 Store/IPC/安装验收或该规格余项未接线。'}:{})}));
 const file=path.join(evidence,'case-coverage.json'),temporary=file+'.tmp';
 fs.writeFileSync(temporary,JSON.stringify({schema:'m924-actual-runtime-test-coverage/1',cases,observations,limits:['Actual Store save/read/backup/restore is pending.','Native application, IPC and installer acceptance is pending.','SQL is independently read by this test; the loader pins SQLite bytes and does not execute SQL.']},null,2)+'\n');fs.renameSync(temporary,file);
});

describe('M924 fixed main resource authentication',{timeout:120000},()=>{
 it('L01 authenticates all40 fixed rows and independently reads all4 SQLite tables',async()=>{
  expect(getAuthenticatedM923Resources(handle)).toBeTruthy();expect(spec.baselines).toHaveLength(40);
  const dataset=JSON.parse(fs.readFileSync(path.join(dataDir,'dataset-v6.json'),'utf8'));
  const SQL=await initSqlJs({locateFile:filename=>path.join(path.dirname(require.resolve('sql.js')),...[filename])});
  const db=new SQL.Database(fs.readFileSync(path.join(dataDir,'knowledge-v6.sqlite')));
  try{
   db.run('PRAGMA query_only=ON');expect(db.exec('PRAGMA integrity_check')[0].values).toEqual([['ok']]);
   const actual:Record<string,number>={};
   for(const table of ['characters','citations','knowledge','sources']){
    const rows=db.exec(`SELECT json FROM ${table} ORDER BY rowid`)[0]?.values.map(([json])=>JSON.parse(String(json)))??[];
    expect(rows).toEqual(dataset[table]);actual[table]=rows.length;
   }
   for(const row of spec.baselines){const entry=dataset.characters.find((entry:any)=>entry.char===row.char);expect(entry.pinyin).toBe(row.sourceQualification.selectedPinyin);expect(entry.tone).toBe(row.sourceQualification.tone);}
   observe('independent-sqlite-four-table-read-not-loader-sql',actual);
  }finally{db.close();}
  cover(['L01'],'Actual fixed loader returned private handle; independent query-only SQLite integrity and all four row arrays equal fixed dataset.');
 });
 it('L02 fails when the actual original gzip is unavailable',()=>{
  const error=Object.assign(Error('fixture original unavailable'),{code:'ENOENT'});
  expect(intercepted(path.join(dataDir,'raw/moe-revised.json.gz'),error,()=>loadM921M923Family())).toEqual({ok:false,code:'M923_SOURCE_UNAVAILABLE'});
  cover(['L02'],'Intercepted fixed gzip read with ENOENT; original files untouched.');
 });
 it('L03 rejects changed records even when supplied registry pins are resealed',()=>{
  const records=JSON.parse(fs.readFileSync(path.join(familyDir,'admission-records.json'),'utf8'));
  records.records[0].project.meaning='名字保证财富与健康';const changed=Buffer.from(JSON.stringify(records));
  const registry=JSON.parse(fs.readFileSync(path.join(familyDir,'registry-entry.json'),'utf8'));registry.records.sha256=sha(changed);
  const output=withReads(new Map([[absolute(path.join(familyDir,'admission-records.json')),changed],[absolute(path.join(familyDir,'registry-entry.json')),Buffer.from(JSON.stringify(registry))]]),()=>loadM921M923Family());
  expect(output).toEqual({ok:false,code:'M923_REJECTED_INTEGRITY'});cover(['L03'],'Tampered project plus attacker-resealed JSON registry rejected by compiled pins.');
 });
 it('L04 rejects substitution of old M752 identity into new family data',()=>{
  const registry=JSON.parse(fs.readFileSync(path.join(familyDir,'registry-entry.json'),'utf8'));registry.familyIdentity.sourceId='naming-semantic-admission-v72-M752';
  expect(intercepted(path.join(familyDir,'registry-entry.json'),Buffer.from(JSON.stringify(registry)),()=>loadM921M923Family())).toEqual({ok:false,code:'M923_REJECTED_INTEGRITY'});
  cover(['L04'],'New fixed resource dispatch rejected old M752 source literal.');
 });
 it('L08 exposes no accepted caller path, authority flag or expected pin configuration',()=>{
  for(const arg of [{trusted:true},{expectedPins:{registryEntrySHA256:'0'.repeat(64)}},{sourceDataDir:dataDir},{sourceId:M923_FAMILY.sourceId}])
   expectRejected(()=>(loadM921M923Family as (...args:unknown[])=>unknown)(arg),['M923_REJECTED_INTEGRITY']);
  cover(['L08'],'Attempted source paths, source ID, trusted flag and expectedPins through extra loader argument.');
 });
 it('L09/L10 rejects altered notice, license, dataset, both Unicode directions and lineage bytes',()=>{
  const files=['raw/moe-README.md','raw/CC-BY-ND-3.0-TW.html','raw/unicode-LICENSE','dataset-v6.json','raw/kTraditionalVariant.txt','raw/kSimplifiedVariant.txt'];
  for(const relative of files){const file=path.join(dataDir,relative),bytes=fs.readFileSync(file);expect(intercepted(file,Buffer.concat([bytes,Buffer.from('\n# changed')]),()=>loadM921M923Family()),relative).toEqual({ok:false,code:'M923_REJECTED_INTEGRITY'});}
  const lineage=path.join(familyDir,'inputs/m921/lineage.json');expect(intercepted(lineage,Buffer.concat([fs.readFileSync(lineage),Buffer.from(' ')]),()=>loadM921M923Family())).toEqual({ok:false,code:'M923_REJECTED_INTEGRITY'});
  cover(['L09'],'All three exact notices/license files rejected after byte alteration.');cover(['L10'],'Dataset baseline, both Unicode variant direction resources, lineage bytes rejected before capability registration.');
 });
 it('L11 reads archived scripts as inert pinned evidence',()=>{
  const file=path.join(familyDir,'inputs/m921/verify.mjs'),marker='__m924ArchivedScriptExecuted';delete (globalThis as any)[marker];
  const source=Buffer.concat([fs.readFileSync(file),Buffer.from(`\nglobalThis.${marker}=true;throw Error('must never execute');`)]);
  expect(intercepted(file,source,()=>loadM921M923Family())).toEqual({ok:false,code:'M923_REJECTED_INTEGRITY'});expect((globalThis as any)[marker]).toBeUndefined();
  cover(['L11'],'Altered archived script contains inert side-effect marker; loader rejected bytes; marker absent.');
 });
 it('L12 refresh rejects changed resources rather than retaining cached authority',()=>{
  const loaded=loadM921M923Family();expect(loaded.ok).toBe(true);if(!loaded.ok)return;
  const file=path.join(familyDir,'family-policy.json'),changed=Buffer.concat([fs.readFileSync(file),Buffer.from(' ')]);
  expect(intercepted(file,changed,()=>refreshM921M923Family(loaded.handle))).toEqual({ok:false,code:'M923_REJECTED_INTEGRITY'});
  cover(['L12'],'Existing private handle refresh re-read this family and rejected changed policy bytes.');
 });
});

describe('M924 exact opt-in and source qualification',{timeout:120000},()=>{
 it('Q01 admits all40 real pool rows at lengths1/2 without full names or receipts',()=>{
  const actual=[];
  for(const row of spec.baselines)for(const length of [1,2] as const){const output=assessM921M923(handle,pool(row,length),constraints(row.char,length));expect(output,row.char).toMatchObject({ok:true,status:'eligible',project:row.expectedProject,wholeNameMeaning:null,scoreDelta:0});expect(output).not.toHaveProperty('receipt');expect(output).not.toHaveProperty('fullName');actual.push({char:row.char,length,status:output.status});}
  observe('eighty-real-pool-assessments',actual);cover(['Q01'],'80 actual private-main pool assessments; 40 records × lengths1/2, empty themes, no fabricated name/receipt.');
 });
 it('Q02 checks every exact family identity and explicit enabled value',()=>{
  for(const selectionValue of [undefined,{enabled:false},{...selection,enabled:false},...Object.keys(M923_FAMILY).map(key=>({...selection,[key]:'wrong-version'})),{...selection,extra:true}]){
   const ctx={...pool(),familySelection:selectionValue};expectRejected(()=>assessM921M923(handle,ctx as any,constraints()),['M923_FAMILY_NOT_ENABLED','M923_CONTEXT_INVALID']);
  }
  cover(['Q02'],'Absent/false selection, each of five identity/version fields and extra property fail closed.');
 });
 it('Q03 rejects pinyin, tone and sense mismatches for each admitted row including 长zhǎng',()=>{
  for(const row of spec.baselines)for(const change of [{selectedPinyin:row.char==='长'?'zhǎng':'wrong'},{tone:row.sourceQualification.tone===1?2:1},{senseId:'moe-revised:wrong:0:0'}])expectBlocked(assessM921M923(handle,{...pool(row),...change} as any,constraints(row.char)),'M923_READING_MISMATCH');
  cover(['Q03'],'120 actual reading/sense mismatches (40 × pinyin/tone/sense), including 长 zhǎng.');
 });
 it('Q04 rejects unknown, duplicated and free-text themes',()=>{
  for(const ids of [['自然'],['unknown-id'],['civic-homeland','civic-homeland']])expectBlocked(assessM921M923(handle,{...pool(),themeIds:ids} as any,constraints()),'M923_CONTEXT_INVALID');
  expect(assessM921M923(handle,{...pool(),themeIds:[...spec.knownThemes]} as any,constraints()).ok).toBe(true);cover(['Q04'],'Unknown/free text/duplicate explicit IDs rejected; six registered IDs also accepted with no mandatory theme.');
 });
 it('Q05 binds given-name scope, codepoint position, length and compound surname',()=>{
  for(const change of [{namePart:'surname'},{givenNameLength:3},{position:-1},{position:1},{fullName:'李安'},{givenName:'晨',fullName:'赵晨'}])expectBlocked(assessM921M923(handle,{...context(),...change} as any,constraints()),'M923_CANDIDATE_SCOPE_MISMATCH');
  expectBlocked(assessM921M923(handle,{...pool(),requestedGivenNameLength:3} as any,constraints()),'M923_CANDIDATE_SCOPE_MISMATCH');
  const c=context(),input=constraints();c.surname='欧阳';c.fullName='欧阳安';(input.profile as any).surname='欧阳';(input.profile as any).surnamePinyin='ōu yáng';
  expect(assessM921M923(handle,c,input).ok).toBe(true);cover(['Q05'],'Surname adoption/length3/invalid occurrence/full-name mismatches blocked; compound surname retains given-name position0.');
 });
 it('Q06 uses the same opted-in gate for required/local/AI and never fills exhaustion',()=>{
  for(const stage of ['required','local','ai'] as const)expect(assessM921M923(handle,context(baseline(),'安',0,stage),constraints()).ok).toBe(true);
  const r=request();r.familySelection={...selection,enabled:false} as any;
  for(const action of [()=>consumer.required(r),()=>consumer.evaluate(r,'安','local'),()=>consumer.evaluateAiProposals(r,[{givenName:'安'}]),()=>consumer.generateLocal(r)])expectRejected(action,['M923_FAMILY_NOT_ENABLED','M923_CONTEXT_INVALID']);
  expect(()=>consumer.evaluate({...request(),analysis:catalogSession().analysis} as any,'安','local')).toThrow();
  expect(()=>consumer.evaluateAiProposals(request(),[{givenName:'安',meaning:'保证财富健康'}])).toThrow();
  expectBlocked(assessM921M923(handle,{...pool(),constraintPass:true} as any,constraints()),'M923_CONTEXT_INVALID');
  expect(consumer.generateLocal(request(),1,['赵安']).candidates).toEqual([]);
  cover(['Q06'],'Required/local/AI share eligibility and disabled-family rejection; excluded only possible name yields no fallback candidates.');
 });
 it('L05/L06/L07 rejects pure-domain, cloned, serialized and other-family capabilities',()=>{
  const old=loadNamingSemanticAdmissionV72({decisionRoot:'D:/Codex-NamingStudio-Evidence/m752-meaning-admission-decision/r2',m740Root:'D:/Codex-NamingStudio-Evidence/m740-character-meanings',sourceDataDir:dataDir,m744AuditPath:'D:/Codex-NamingStudio-Evidence/m744-data-audit/M744-DATA-AUDIT.json'});
  const pure=createNamingSemanticAdmissionHandle(clone(old.publication));
  for(const fake of [pure,clone(handle),structuredClone(handle),old,{},selection])expectBlocked(assessM921M923(fake as any,pool(),constraints()),'M923_UNTRUSTED_HANDLE');
  expect(old.publication.rows).toHaveLength(10);expect(old.publication.records.filter(row=>row.decision==='allow-single-character-generation')).toHaveLength(9);
  const oldConsumer=createNamingSemanticGenerationV72(old),source=catalogSession(),legacyRequest={...request('纪'),analysis:source.analysis};delete (legacyRequest as any).familySelection;
  const legacy=oldConsumer.evaluate(legacyRequest as any,'纪');expect(legacy.status).toBe('generated');expect(legacy.candidate).toHaveProperty('semanticAdoption72');expect(legacy.candidate).not.toHaveProperty('semanticAdoptionM923');
  cover(['L05','L06','L07'],'Actual pure-domain M752-derived, copied/serialized real handle, and authenticated M752 handle fail new private registry.');
  cover(['P05'],'Actual M752 ten rows/nine allows and real legacy finalizer remain separate; historical Store replay not executed.','partial');
  cover(['C03'],'New independent family types and actual old10/9 consumer regression executed; native/installer acceptance pending.','partial');
 });
});

describe('M924 actual finalization and adoption replay',{timeout:120000},()=>{
 it('O01/P01 locally finalizes all40 with exact project wording and produces actual AI/local receipts',()=>{
  const candidates=[];
  for(const row of spec.baselines){const candidate=finalized(row.char),snapshot=candidate.semanticAdoptionM923;expect(candidate.meaning).toContain(row.expectedProject.meaning);expect(snapshot.rows[0].project).toEqual(row.expectedProject);expect(snapshot.rows[0].adoption).toMatchObject({schema:'m921-m923-character-generation-adoption/1',...M923_FAMILY,reviewId:row.reviewId,char:row.char,projectWish:null,wholeNameMeaning:null,scoreDelta:0});expect(Object.keys(snapshot.rows[0].adoption!).sort()).toEqual([...spec.receiptFields].sort());candidates.push({name:candidate.fullName,origin:candidate.origin,meaning:candidate.meaning});}
  for(const char of ['方','锋','川'])expect(finalized(char).semanticAdoptionM923.rows[0].project!.meaning).toBe(baseline(char).expectedProject.meaning);
  const local=consumer.generateLocal(request(),7);expect(local.candidates.map(candidate=>candidate.givenName)).toEqual(['安']);
  const [ai]=consumer.evaluateAiProposals(request(),[{givenName:'安'}]);expect(ai.status).toBe('generated');if(ai.status==='generated')expect(ai.candidate.origin).toBe('ai');
  expect(consumer.required(request())[0].result).not.toHaveProperty('receipt');observe('forty-actual-local-finalizations',candidates);
  cover(['O01'],'All40 actual finalized project values checked against independent acceptance fixture; 方/锋/川 exact new narrow text.');cover(['P01'],'All40 actual local finalizers + actual local generator + AI proposal finalizer issue complete new receipts; pool/required no receipt.');
 });
 it('O03 keeps parent glyph variants, taboos, required and generation-position hard constraints',()=>{
  const cases=[{kind:'father-name',change:(r:M923GenerationRequest)=>{r.profile.fatherName='赵安';}},{kind:'mother-variant',change:(r:M923GenerationRequest)=>{r.profile.motherName='陈寧';}},{kind:'forbidden',change:(r:M923GenerationRequest)=>{r.preferences.forbiddenChars='安';}},{kind:'elder-taboo',change:(r:M923GenerationRequest)=>{r.preferences.elderTaboo='安';}},{kind:'required-missing',change:(r:M923GenerationRequest)=>{r.preferences.requiredChars='晨';}},{kind:'generation-position',change:(r:M923GenerationRequest)=>{r.preferences.generationChar='晨';}}];
  for(const test of cases){const name=test.kind==='mother-variant'?'宁':'安',r=request(name);r.preferences.requiredChars='';test.change(r);expect(consumer.evaluate(r,name,'local'),test.kind).toMatchObject({status:'blocked',code:'M923_BLOCKED_EXISTING_CONSTRAINTS'});}
  const awkward=request('建');awkward.profile.surname='范';awkward.profile.surnamePinyin='fàn';expect(consumer.evaluate(awkward,'建','ai')).toMatchObject({status:'blocked',code:'M923_BLOCKED_EXISTING_CONSTRAINTS'});
  cover(['O03'],'Actual finalizer preserves parent glyph/variant, taboo, required and generation-position hard constraints; unchanged awkward full-name 范建 also blocks. Parent phonetic comparison remains a warning, not a new hard blocker.');
 });
 it('P03 mutates every receipt field, removes every field and adds an unrecognized field',()=>{
  const candidate=finalized(),original=candidate.semanticAdoptionM923.rows[0].adoption!,ctx=savedContext(candidate),inputs=constraints();
  expect(validateM921M923Receipt(handle,original,ctx,inputs)).toEqual({ok:true});
  for(const field of spec.receiptFields){const altered=clone(original) as any;altered[field]=mutatedPrimitive(altered[field]);expectBlocked(validateM921M923Receipt(handle,altered,ctx,inputs),'M923_REJECTED_INTEGRITY');const missing=clone(original) as any;delete missing[field];expectBlocked(validateM921M923Receipt(handle,missing,ctx,inputs),'M923_REJECTED_INTEGRITY');}
  expectBlocked(validateM921M923Receipt(handle,{...original,extra:true},ctx,inputs),'M923_REJECTED_INTEGRITY');cover(['P03'],'Every required receipt field independently changed and independently removed; extra field rejected.');
 });
 it('P04 binds all occurrence fields, repeated-character positions, surname, themes and reading',()=>{
  const candidate=finalized(),receipt=candidate.semanticAdoptionM923.rows[0].adoption!,ctx=savedContext(candidate);
  for(const field of ['candidateId','candidateCaseId','fullName','surname','givenName','position','char','selectedPinyin','tone','senseId','givenNameLength','namePart','familySelection','themeIds'] as const){const changed=clone(ctx) as any;changed[field]=field==='themeIds'?['civic-homeland']:field==='familySelection'?{...selection,decisionVersion:'wrong'}:mutatedPrimitive(changed[field]);expectBlocked(validateM921M923Receipt(handle,receipt,changed,constraints()),'M923_REJECTED_INTEGRITY');}
  const repeated=finalized('安安'),first=repeated.semanticAdoptionM923.rows[0].adoption!,second=repeated.semanticAdoptionM923.rows[1].adoption!;expect(first.position).toBe(0);expect(second.position).toBe(1);expectBlocked(validateM921M923Receipt(handle,first,savedContext(repeated,1),constraints('安安')),'M923_REJECTED_INTEGRITY');
  cover(['P04'],'All14 bound caller context fields independently changed; duplicated 安 positions produce distinct receipt binding and swap rejects.');
 });
 it('P07 binds normalized complete saved profile and preference inputs',()=>{
  const candidate=finalized(),receipt=candidate.semanticAdoptionM923.rows[0].adoption!,ctx=savedContext(candidate);
  const changes=[(i:any)=>{i.profile.fatherName='赵晨';},(i:any)=>{i.profile.motherName='陈宁';},(i:any)=>{i.profile.birthDate='2026-10-18';},(i:any)=>{i.profile.surnamePinyin='lǐ';},(i:any)=>{i.preferences.requiredChars='晨';},(i:any)=>{i.preferences.forbiddenChars='安';},(i:any)=>{i.preferences.elderTaboo='安';},(i:any)=>{i.preferences.avoidParentNames=false;},(i:any)=>{i.preferences.style='自然';}];
  for(const change of changes){const input=constraints();change(input);expectBlocked(validateM921M923Receipt(handle,receipt,ctx,input),'M923_REJECTED_INTEGRITY');}
  cover(['P07'],'Saved father/mother/birth/surname reading, required/forbidden/taboo/avoidance/style input changes rejected.');
 });
 it('P08 validates receipt before qualification and rejects saved stages in assess-only API',()=>{
  const candidate=finalized(),ctx=savedContext(candidate);expectBlocked(assessM921M923(handle,ctx as any,constraints()),'M923_CONTEXT_INVALID');
  if(false){
   // @ts-expect-error Saved stages require the receipt-validation entry point.
   assessM921M923(handle,context(baseline(),'安',0,'save'),constraints());
   // @ts-expect-error Required qualification cannot issue an adoption receipt.
   issueM921M923Receipt(handle,context(baseline(),'安',0,'required'),constraints());
  }
  for(const stage of ['required','save','restore'] as const)expectRejected(()=>issueM921M923Receipt(handle,{...ctx,stage} as any,constraints()),['M923_CONTEXT_INVALID']);
  for(const stage of ['save','restore'] as const){const input={...ctx,stage};expect(validateAndAssessM921M923Saved(handle,{context:input,receipt:candidate.semanticAdoptionM923.rows[0].adoption,constraints:constraints()}).ok).toBe(true);expectBlocked(validateAndAssessM921M923Saved(handle,{context:{...input,selectedPinyin:'wrong'},receipt:null,constraints:constraints()}),'M923_REJECTED_INTEGRITY');}
  cover(['P08'],'Assess-only save/restore rejected; receipt-required entry validated actual receipt then qualified; invalid receipt + bad reading yields integrity failure first.');
 });
 it('P09 accepts exact deterministic receipt reconstruction without giving cloned handle authority',()=>{
  const candidate=finalized(),original=candidate.semanticAdoptionM923.rows[0].adoption!,reconstructed=Object.fromEntries(Object.entries(original).reverse()) as unknown as M923Receipt,ctx=savedContext(candidate);
  expect(validateM921M923Receipt(handle,reconstructed,ctx,constraints())).toEqual({ok:true});expectBlocked(validateM921M923Receipt(clone(handle),reconstructed,ctx,constraints()),'M923_UNTRUSTED_HANDLE');
  cover(['P09'],'Equivalent key-reordered canonical reconstruction verifies; identical receipt with cloned handle remains untrusted.');
 });
 it('P10 rejects caller hashes, pass flags and changed constraint engine ID',()=>{
  for(const injected of [{constraintPass:true},{constraintContextSHA256:'0'.repeat(64)},{engineId:'caller-engine'},{trusted:true}])expectRejected(()=>assessM921M923(handle,pool(),{...constraints(),...injected} as any),['M923_CONTEXT_INVALID','M923_REJECTED_INTEGRITY']);
  const candidate=finalized(),receipt={...candidate.semanticAdoptionM923.rows[0].adoption!,constraintEngineId:'old-engine'};expectBlocked(validateM921M923Receipt(handle,receipt,savedContext(candidate),constraints()),'M923_REJECTED_INTEGRITY');cover(['P10'],'Unknown constraint input/pass/hash/engine flags rejected and receipt engine is code-owned.');
 });
 it('O02 rejects meaning, scores, project wish, full-name meaning and metadata mutations at replay',()=>{
  const base=finalized();
  for(const mutate of [(c:any)=>{c.meaning+='人格高尚且命运顺遂';},(c:any)=>{c.originalMeaning='伪造';},(c:any)=>{c.evaluation.meaning++;},(c:any)=>{c.semanticAdoptionM923.projectWish='必定平安';},(c:any)=>{c.semanticAdoptionM923.wholeNameMeaning='全名保证成功';},(c:any)=>{c.semanticAdoptionM923.scoreDelta=1;},(c:any)=>{c.semanticAdoptionM923.rows[0].project.meaning='财富健康长寿';},(c:any)=>{c.characters[0].elements=['金'];}]){const candidate=clone(base);mutate(candidate);expect(consumer.verifySaved(candidate,request(),'restore')).toMatchObject({ok:false,code:'M923_REJECTED_INTEGRITY'});}
  for(const warning of base.semanticAdoptionM923.baseWarnings)expect(base.warnings).toContain(warning);
  cover(['O02'],'Actual saved finalizer replay rejects output meaning/originalMeaning/score/wish/whole-name/project/character-element mutations; unrelated baseline warnings preserved.');
 });
 it('P06 replays saved explicit request while a new current request stays disabled',()=>{
  const savedRequest=request(),candidate=finalized(),current={...request(),familySelection:{enabled:false}};
  expect(consumer.verifySaved(candidate,savedRequest,'save')).toMatchObject({ok:true});expect(consumer.verifySaved(candidate,savedRequest,'restore')).toMatchObject({ok:true});
  expectRejected(()=>consumer.evaluate(current as any,'安','local'),['M923_FAMILY_NOT_ENABLED','M923_CONTEXT_INVALID']);expect(current.familySelection).toEqual({enabled:false});
  cover(['P06'],'Scoped consumer replays saved exact opt-in, independently rejects disabled new generation; actual Store historical replay still pending.','partial');
 });
 it('C01/C02 measures the actual request union with default delta0 and repeats next request',()=>{
  const dataset=JSON.parse(fs.readFileSync(path.join(dataDir,'dataset-v6.json'),'utf8')),legacy=dataset.characters.filter((entry:any)=>['知','安'].includes(entry.char));
  const cleanRequest=request();cleanRequest.preferences.requiredChars='';
  const result=consumer.pool(cleanRequest,legacy),expected=new Set([...legacy.map((entry:any)=>entry.char),...spec.baselines.map(row=>row.char)]);
  expect(new Set(result.pool.map(entry=>entry.char))).toEqual(expected);expect(result.eligibleAdopted).toHaveLength(40);expect(result.defaultCoverageDelta).toBe(0);expect(legacy.map((entry:any)=>entry.char)).toEqual(['安','知'].sort((a,b)=>dataset.characters.findIndex((r:any)=>r.char===a)-dataset.characters.findIndex((r:any)=>r.char===b)));
  const next=finalized();expect(next.semanticAdoptionM923.rows[0].project!.meaning).toBe(baseline().expectedProject.meaning);observe('actual-opt-in-pool-union',{legacy:legacy.length,optIn:result.pool.length,distinctExpected:expected.size,eligible:result.eligibleAdopted.length,defaultCoverageDelta:result.defaultCoverageDelta});
  cover(['C01'],'Measured actual distinct legacy union and40 admitted rows for clean request; reported default delta0 without addition to historical coverage.');cover(['C02'],'A second actual request/finalization reuses exact reviewed text with fresh explicit opt-in and no extra approval field.');
 });
 it('C01 filters inherited legacy pool rows through current taboo, parent and occupied-slot constraints',()=>{
  const dataset=JSON.parse(fs.readFileSync(path.join(dataDir,'dataset-v6.json'),'utf8'));
  const legacy=dataset.characters.filter((entry:any)=>['安','晨'].includes(entry.char));
  expect(legacy).toHaveLength(2);
  for(const kind of ['forbidden','parent','required'] as const){
   const r=request();r.preferences.requiredChars='';
   if(kind==='forbidden')r.preferences.forbiddenChars='安';
   if(kind==='parent')r.profile.fatherName='赵安';
   if(kind==='required')r.preferences.requiredChars='晨';
   const result=consumer.pool(r,legacy),chars=result.pool.map(entry=>entry.char);
   expect(chars,kind).not.toContain('安');expect(chars,kind).toContain('晨');
   expect(result.eligibleAdopted,kind).not.toContain(baseline('安').candidateCaseId);
  }
  expect(legacy.map((entry:any)=>entry.char)).toEqual(['安','晨']);
  cover(['C01'],'Actual union measured separately; inherited legacy 安 is also removed for active forbidden/parent/required-slot constraints while valid 晨 remains.');
 });
 it.skip('P02 pending: actual Store save/read/backup/restore paths are not integrated',()=>{});
});
