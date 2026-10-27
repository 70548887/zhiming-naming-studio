import {afterAll,afterEach,beforeAll,describe,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {M923_FAMILY} from '../src/shared/naming-semantic-m923';
import type {M923GeneratedCandidate,M923GenerationRequest,M923GenerationSnapshot} from '../src/shared/naming-semantic-m923';
import {loadM921M923Family,getAuthenticatedM923Resources} from '../src/main/naming-semantic-m923-data';
import {createNamingSemanticGenerationM923} from '../src/main/naming-semantic-generation-m923';
import * as constraintApi from '../src/main/naming-semantic-m923-constraints';
import * as receiptApi from '../src/main/naming-semantic-m923';
import {normalizePreferences} from '../src/shared/workflow';
import {catalogSession} from './fixtures/catalog-session';

const root=fileURLToPath(new URL('../',import.meta.url));
const evidenceDir=process.env.M924_ZERO_ADOPTION_TEST_EVIDENCE_DIR??'D:/Codex-NamingStudio-Evidence/m924-zero-adoption-fix/evidence';
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
const stages=['save','restore'] as const;
const origins=['local','ai'] as const;
const currentSchema='m921-m923-character-generation-snapshot/2';
const retiredSchema='m921-m923-character-generation-snapshot/1';
const observations:Array<{case:string;value:unknown}>=[];
let consumer:ReturnType<typeof createNamingSemanticGenerationM923>;
let dataset:ReturnType<typeof getAuthenticatedM923Resources>['dataset'];
const fixtures=new Map<string,{request:M923GenerationRequest;candidate:M923GeneratedCandidate}>();

function request(givenName='明'):M923GenerationRequest {
 const source=catalogSession('m924-zero-adoption-session','2026-10-17T16:00:00Z','m924-zero-adoption-baby-a');
 return {
  profile:{...source.profile,surname:'赵',surnamePinyin:'zhào',fatherName:'',motherName:''},
  preferences:normalizePreferences({...source.preferences,length:[...givenName].length as 1|2,requiredChars:'',generationChar:'',forbiddenChars:'',elderTaboo:'',preferredElements:[],meanings:'',industry:'',numerology:false,zodiacRules:false,avoidParentNames:true}),
  familySelection:{...M923_FAMILY,enabled:true},themeIds:[],
 };
}
function actual(input:M923GenerationRequest,givenName:string,origin:'local'|'ai'):M923GeneratedCandidate {
 if(origin==='local'&&givenName==='明'){
  const result=consumer.generateLocal(input,7),candidate=result.candidates.find(row=>row.fullName==='赵明');
  expect(candidate,'Actual generateLocal must produce the zero-adoption 赵明').toBeDefined();
  if(!candidate)throw Error('Actual local generator did not produce 赵明');
  return candidate;
 }
 const result=origin==='ai'?consumer.evaluateAiProposals(input,[{givenName}])[0]:consumer.evaluate(input,givenName,'local');
 expect(result,`${origin} ${givenName}: real producer prerequisite`).toMatchObject({status:'generated'});
 if(result.status!=='generated')throw Error(`Actual ${origin} producer blocked ${givenName}: ${result.code}`);
 return result.candidate;
}
function fixture(givenName='明',origin:'local'|'ai'='local') {
 const value=fixtures.get(`${origin}:${givenName}`);
 if(!value)throw Error('Missing real producer fixture');
 return {request:clone(value.request),candidate:clone(value.candidate)};
}
function verifyRejectedUnchanged(candidate:M923GeneratedCandidate,input:M923GenerationRequest) {
 const before=clone(candidate),beforeInput=clone(input);
 for(const stage of stages)expect(consumer.verifySaved(candidate,input,stage),stage).toEqual({ok:false,code:'M923_REJECTED_INTEGRITY'});
 expect(candidate,'Rejected replay must not upgrade or reseal its input').toEqual(before);
 expect(input,'Rejected replay must not rewrite its request').toEqual(beforeInput);
}
function namingOutput(candidate:M923GeneratedCandidate) {
 const output=clone(candidate);
 // A real local generator allocates a new UUID on each call.
 delete (output as Partial<M923GeneratedCandidate>).id;
 delete (output as Partial<M923GeneratedCandidate>).semanticAdoptionM923;
 return output;
}

beforeAll(()=>{
 const loaded=loadM921M923Family();expect(loaded.ok).toBe(true);
 if(!loaded.ok)throw Error(loaded.code);
 const resources=getAuthenticatedM923Resources(loaded.handle);dataset=resources.dataset;
 expect(resources.records).toHaveLength(40);
 expect(resources.records.some(row=>row.identity.char==='明')).toBe(false);
 expect(resources.records.some(row=>row.identity.char==='安')).toBe(true);
 consumer=createNamingSemanticGenerationM923(loaded.handle);
 for(const origin of origins)for(const givenName of ['明','安','安明','明明','安安']){
  const input=request(givenName);
  if(origin==='local'&&givenName==='明')input.preferences.requiredChars='明';
  const candidate=actual(input,givenName,origin);
  fixtures.set(`${origin}:${givenName}`,{request:input,candidate});
 }
},120000);
afterEach(()=>vi.restoreAllMocks());
afterAll(()=>{
 fs.mkdirSync(evidenceDir,{recursive:true});
 const file=path.join(evidenceDir,'m924-zero-adoption-binding-observations.json'),temporary=file+'.tmp';
 fs.writeFileSync(temporary,JSON.stringify({schema:'m924-zero-adoption-binding-test-observations/1',testFile:path.join(root,'tests/m924-zero-adoption-binding.test.ts'),observations},null,2)+'\n');
 fs.renameSync(temporary,file);
});

describe('M924 real zero-adoption producer and complete constraint binding',{timeout:120000},()=>{
 it.each(origins)('%s 明 remains a legitimate zero-receipt name for both save and restore',origin=>{
  const {candidate,request:input}=fixture('明',origin),snapshot=candidate.semanticAdoptionM923;
  expect(candidate.origin).toBe(origin);expect(candidate.fullName).toBe('赵明');
  expect(input.profile.id).toBe('m924-zero-adoption-baby-a');expect(input.preferences.requiredChars).toBe(origin==='local'?'明':'');
  expect(snapshot.schema).toBe(currentSchema);
  expect(snapshot.rows).toEqual([{position:0,char:'明',adoption:null,project:null}]);
  expect(snapshot.constraintEngineId).toBe('m923-existing-constraints-v1');
  expect(snapshot.constraintContextSHA256).toMatch(/^[0-9a-f]{64}$/);
  const normalized=constraintApi.normalizeM923Constraints({profile:input.profile,preferences:input.preferences},dataset);
  expect(snapshot.constraintContextSHA256).toBe(normalized.constraintContextSHA256);
  const before=clone(candidate);
  for(const stage of stages)expect(consumer.verifySaved(candidate,input,stage)).toEqual({ok:true,stage,receiptCount:0});
  expect(candidate).toEqual(before);expect(snapshot.rows.every(row=>row.adoption===null)).toBe(true);
  observations.push({case:`real-${origin}-zero-adoption-save-restore`,value:{producer:origin==='local'?'generateLocal':'evaluateAiProposals',fullName:candidate.fullName,profileId:input.profile.id,schema:snapshot.schema,receiptCount:0,rows:snapshot.rows,constraintContextSHA256:snapshot.constraintContextSHA256}});
 });

 const requestMutations:Array<[string,(input:M923GenerationRequest)=>void]>=[
  ['same-surname other baby ID',input=>{input.profile.id='m924-zero-adoption-baby-b';}],
  ['father name',input=>{input.profile.fatherName='赵文';}],
  ['mother name',input=>{input.profile.motherName='陈清';}],
  ['customer name',input=>{input.profile.customerName='另一位家长';}],
  ['profile notes',input=>{input.profile.notes='本次仅更改备注';}],
  ['unmatched forbidden character',input=>{input.preferences.forbiddenChars='晨';}],
  ['matched forbidden character',input=>{input.preferences.forbiddenChars='明';}],
  ['unmatched elder taboo',input=>{input.preferences.elderTaboo='晨';}],
  ['equivalent matching required character',input=>{input.preferences.requiredChars=input.preferences.requiredChars==='明'?' 明 ':'明';}],
  ['mismatched required character',input=>{input.preferences.requiredChars='晨';}],
  ['matching generation character',input=>{input.preferences.generationChar='明';}],
  ['priority',input=>{input.preferences.priority='sound';}],
  ['industry',input=>{input.preferences.industry='建筑';}],
  ['meanings',input=>{input.preferences.meanings='光明';}],
  ['style',input=>{input.preferences.style='自然';}],
  ['parent avoidance preference',input=>{input.preferences.avoidParentNames=false;}],
 ];
 for(const origin of origins)it.each(requestMutations)(`${origin} zero-adoption replay rejects changed %s`,(label,mutate)=>{
  const {candidate,request:input}=fixture('明',origin);mutate(input);
  const qualifier=vi.spyOn(constraintApi,'checkM923CandidateConstraints');
  const receiptValidator=vi.spyOn(receiptApi,'validateM921M923Receipt');
  const receiptIssuer=vi.spyOn(receiptApi,'issueM921M923Receipt');
  verifyRejectedUnchanged(candidate,input);
  expect(qualifier,'Binding must fail before a fresh name qualification').not.toHaveBeenCalled();
  expect(receiptValidator).not.toHaveBeenCalled();expect(receiptIssuer).not.toHaveBeenCalled();
  observations.push({case:`${origin}-request-mutation-rejected`,value:label});
 });

 it.each(['profile.id','profile.customerName','profile.notes','preferences.forbiddenChars'] as const)('binds %s even when a fresh real producer returns the same naming output',field=>{
  const {candidate,request:input}=fixture();
  if(field==='profile.id')input.profile.id='m924-zero-adoption-baby-b';
  if(field==='profile.customerName')input.profile.customerName='另一位家长';
  if(field==='profile.notes')input.profile.notes='备注变化不改变名字输出';
  if(field==='preferences.forbiddenChars')input.preferences.forbiddenChars='晨';
  const fresh=actual(input,'明','local');
  expect(namingOutput(fresh)).toEqual(namingOutput(candidate));
  expect(fresh.semanticAdoptionM923.constraintContextSHA256).not.toBe(candidate.semanticAdoptionM923.constraintContextSHA256);
  verifyRejectedUnchanged(candidate,input);
  for(const stage of stages)expect(consumer.verifySaved(fresh,input,stage)).toEqual({ok:true,stage,receiptCount:0});
  observations.push({case:'output-invisible-effective-input-change',value:field});
 });

 const snapshotMutations:Array<[string,(snapshot:Record<string,unknown>)=>void]>=[
  ['missing constraint engine',snapshot=>{delete snapshot.constraintEngineId;}],
  ['missing constraint digest',snapshot=>{delete snapshot.constraintContextSHA256;}],
  ['caller-chosen constraint engine',snapshot=>{snapshot.constraintEngineId='caller-engine';}],
  ['wrong constraint digest',snapshot=>{snapshot.constraintContextSHA256='0'.repeat(64);}],
  ['non-hex constraint digest',snapshot=>{snapshot.constraintContextSHA256='g'.repeat(64);}],
  ['short constraint digest',snapshot=>{snapshot.constraintContextSHA256='a'.repeat(63);}],
  ['extra snapshot property',snapshot=>{snapshot.extra=true;}],
  ['retired snapshot schema',snapshot=>{snapshot.schema=retiredSchema;}],
  ['retired unbound snapshot schema',snapshot=>{snapshot.schema=retiredSchema;delete snapshot.constraintEngineId;delete snapshot.constraintContextSHA256;}],
 ];
 it.each(snapshotMutations)('rejects %s without upgrading or issuing receipts',(label,mutate)=>{
  const {candidate,request:input}=fixture();
  mutate(candidate.semanticAdoptionM923 as unknown as Record<string,unknown>);
  const issuer=vi.spyOn(receiptApi,'issueM921M923Receipt');
  verifyRejectedUnchanged(candidate,input);expect(issuer).not.toHaveBeenCalled();
  observations.push({case:'snapshot-shape-or-binding-rejected',value:label});
 });

 it.each(['constraintEngineId','constraintContextSHA256'] as const)('rejects adopted-name %s before any receipt validator or name qualifier',field=>{
  const {candidate,request:input}=fixture('安');
  (candidate.semanticAdoptionM923 as unknown as Record<string,unknown>)[field]=field==='constraintEngineId'?'caller-engine':'0'.repeat(64);
  const validate=vi.spyOn(receiptApi,'validateM921M923Receipt'),assess=vi.spyOn(receiptApi,'validateAndAssessM921M923Saved');
  const qualify=vi.spyOn(constraintApi,'checkM923CandidateConstraints'),issue=vi.spyOn(receiptApi,'issueM921M923Receipt');
  verifyRejectedUnchanged(candidate,input);
  expect(validate).not.toHaveBeenCalled();expect(assess).not.toHaveBeenCalled();expect(qualify).not.toHaveBeenCalled();expect(issue).not.toHaveBeenCalled();
 });

 it('does not accept a caller constraint hash or engine grafted onto the request',()=>{
  const {candidate,request:input}=fixture();
  for(const supplied of [{constraintEngineId:'m923-existing-constraints-v1'},{constraintContextSHA256:candidate.semanticAdoptionM923.constraintContextSHA256}]){
   const forged={...input,...supplied} as M923GenerationRequest;
   verifyRejectedUnchanged(candidate,forged);
  }
 });
});

describe('M924 adopted, mixed and repeated-name regression',{timeout:120000},()=>{
 const cases=[['安',1],['安明',1],['明明',0],['安安',2]] as const;
 for(const origin of origins)it.each(cases)(`${origin} %s retains exactly %i original per-character receipts`,(givenName,count)=>{
  const {candidate,request:input}=fixture(givenName,origin),snapshot=candidate.semanticAdoptionM923;
  expect(snapshot.schema).toBe(currentSchema);expect(snapshot.rows.map(row=>row.char)).toEqual([...givenName]);
  expect(snapshot.rows.filter(row=>row.adoption!==null)).toHaveLength(count);
  for(const [position,char] of [...givenName].entries()){
   const row=snapshot.rows[position];expect(row.position).toBe(position);
   if(char==='明'){expect(row.adoption).toBeNull();expect(row.project).toBeNull();}
   else {
    expect(row.adoption).toMatchObject({schema:'m921-m923-character-generation-adoption/1',...M923_FAMILY,char,position,constraintEngineId:snapshot.constraintEngineId,constraintContextSHA256:snapshot.constraintContextSHA256});
    expect(row.project).not.toBeNull();
   }
  }
  const before=clone(candidate);
  for(const stage of stages)expect(consumer.verifySaved(candidate,input,stage)).toEqual({ok:true,stage,receiptCount:count});
  expect(candidate).toEqual(before);
  observations.push({case:`${origin}-adoption-regression`,value:{givenName,receiptCount:count}});
 });

 it('still validates every field of the original adopted receipt',()=>{
  const {candidate:base,request:input}=fixture('安明'),original=base.semanticAdoptionM923.rows[0].adoption!;
  const fields=Object.keys(original);
  expect(fields.length).toBeGreaterThan(30);
  for(const field of fields){
   const candidate=clone(base),receipt=candidate.semanticAdoptionM923.rows[0].adoption as unknown as Record<string,unknown>;
   const value=receipt[field];receipt[field]=typeof value==='string'?value+'-tampered':typeof value==='number'?value+1:value===null?'forged':false;
   verifyRejectedUnchanged(candidate,input);
  }
  observations.push({case:'every-original-adoption-field-rejected-after-mutation',value:fields});
 });

 const rowMutations:Array<[string,string,(candidate:M923GeneratedCandidate)=>void]>=[
  ['drop adopted receipt','安明',candidate=>{(candidate.semanticAdoptionM923.rows[0] as {adoption:unknown}).adoption=null;}],
  ['graft adopted receipt onto unadopted 明','安明',candidate=>{(candidate.semanticAdoptionM923.rows[1] as {adoption:unknown}).adoption=clone(candidate.semanticAdoptionM923.rows[0].adoption);}],
  ['extra adopted receipt field','安明',candidate=>{(candidate.semanticAdoptionM923.rows[0].adoption as unknown as Record<string,unknown>).extra=true;}],
  ['swap repeated adopted occurrences','安安',candidate=>{const first=candidate.semanticAdoptionM923.rows[0] as {adoption:unknown},second=candidate.semanticAdoptionM923.rows[1] as {adoption:unknown};[first.adoption,second.adoption]=[second.adoption,first.adoption];}],
  ['change repeated unadopted occurrence position','明明',candidate=>{(candidate.semanticAdoptionM923.rows[1] as {position:number}).position=0;}],
  ['replace unadopted null with empty receipt','明',candidate=>{(candidate.semanticAdoptionM923.rows[0] as {adoption:unknown}).adoption={};}],
 ];
 it.each(rowMutations)('rejects %s',(label,givenName,mutate)=>{
  const {candidate,request:input}=fixture(givenName);mutate(candidate);
  verifyRejectedUnchanged(candidate,input);
  observations.push({case:'original-adoption-row-rejected-after-mutation',value:label});
 });

 it('exposes only snapshot/2 with mandatory code-owned constraint binding in TypeScript',()=>{
  const {candidate}=fixture(),snapshot=candidate.semanticAdoptionM923;
  const schema:'m921-m923-character-generation-snapshot/2'=snapshot.schema;
  const engine:'m923-existing-constraints-v1'=snapshot.constraintEngineId;
  const digest:string=snapshot.constraintContextSHA256;
  if(false){
   // @ts-expect-error The unpublished snapshot/1 is rejected rather than migrated.
   const retired:M923GenerationSnapshot={...snapshot,schema:'m921-m923-character-generation-snapshot/1'};
   // @ts-expect-error The engine is code-owned and cannot be selected by a caller.
   const callerEngine:M923GenerationSnapshot={...snapshot,constraintEngineId:'caller-engine'};
   const {constraintEngineId:removedEngine,...withoutEngine}=snapshot;
   // @ts-expect-error Every snapshot, including a zero-receipt snapshot, needs the engine.
   const missingEngine:M923GenerationSnapshot=withoutEngine;
   const {constraintContextSHA256:removedDigest,...withoutDigest}=snapshot;
   // @ts-expect-error Every snapshot, including a zero-receipt snapshot, needs the digest.
   const missingDigest:M923GenerationSnapshot=withoutDigest;
   void [retired,callerEngine,removedEngine,missingEngine,removedDigest,missingDigest];
  }
  expect({schema,engine,digest}).toEqual({schema:currentSchema,engine:'m923-existing-constraints-v1',digest:snapshot.constraintContextSHA256});
 });
});
