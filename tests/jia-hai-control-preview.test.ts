import {afterAll,afterEach,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {copyFileSync,mkdirSync,mkdtempSync,readFileSync,realpathSync,rmSync,writeFileSync} from 'node:fs';
import {basename,dirname,join,relative,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {StudioService} from '../src/main/service';
import {analyzeProfile} from '../src/domain/engine';
import * as projectSolver from '../src/domain/bazi-mainchain/project-v13';
import * as rootSolver from '../src/domain/bazi-mainchain/project-v13/root-feedback';
import type {BirthProfile,SourceRecord} from '../src/shared/types';
import type {JiaHaiControlOptions,JiaHaiControlPreview} from '../src/shared/jia-hai-control-preview';

// M689 source-only API tests. The reviewed M625 seventeen cases are not rerun.
// The real Service prototype is used without its constructor. Its Store proxy
// permits dataDir alone; no SQL, Worker, persistence, AI or browser is started.
const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const MONTHLY_LOCK='data/monthly-seasonal-source-lock.json',BAZI_LOCK='data/bazi-evidence-source-lock.json';
const RAW='data/raw/classics-qiongtong-2294674.wiki',MANAGED_ROOT='data/jia-hai-control-v1/';
const MANAGED_NAMES=['manifest.json','source.json','rule-input.ts','types-input.ts'];
const PROJECT_ROOT='assets/bazi-root-feedback/1.3.1/',PROJECT_MANIFEST=PROJECT_ROOT+'resource-manifest.json';
const PARAMETER=PROJECT_ROOT+'runtime-source/src/domain/bazi-mainchain/project-v13/rules/project-mainchain-1.3.1.json';
const SOLVER_RUNTIME=PROJECT_ROOT+'runtime-source/src/domain/bazi-mainchain/kernel-v12-fixed/control-budget.ts';
const RAW_SHA='8ba17242f116583de2e10172e006f5ce5f74b23ccfc0bd24b886be135e9f20bd';
type SourceLock={sources:Array<SourceRecord&{fileHashes:Record<string,string>}>};
type ProjectManifest={
  methodId:string;applicationPolicyVersion:string;publicationId:string;sourceRevision:string;
  kernel:{methodId:string;sourceRevision:string};
  files:Array<{path:string;bytes:number;sha256:string;kind:string}>;sources:SourceRecord[];
};
type FixedSource={rawSha256:string;revision:string;quote:string;quoteSpan:{start:number;end:number;unit:string;interval:string};counterControlQuote:string;counterControlSpan:{start:number;end:number;unit:string;interval:string}};
let fixtureParent='',fixtureRoot='',dataDirectory='',forbiddenStoreReads=0;
let monthly:SourceLock,projectManifest:ProjectManifest,fixedSource:FixedSource,rawPoints:string[];
const originals=new Map<string,string>();
const digest=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
const valueDigest=(value:unknown)=>digest(JSON.stringify(value));
const json=<T,>(file:string)=>JSON.parse(readFileSync(file,'utf8')) as T;
function safeRelative(file:string):void {
  if(!/^(data|assets)\//.test(file)||file.includes('\\')||file.includes(':')||file.split('/').some(part=>!part||part==='.'||part==='..'))throw Error('Unexpected fixed test path: '+file);
}
function sourcePath(file:string){safeRelative(file);return join(projectRoot,...file.split('/'));}
function ownedPath(file:string){
  safeRelative(file);const target=resolve(fixtureRoot,...file.split('/'));
  if(!target.startsWith(resolve(fixtureRoot)+sep))throw Error('Fixture path escaped its exact owned root');return target;
}
function denied(key:PropertyKey):never{forbiddenStoreReads++;throw Error('M689 forbidden Store dependency: '+String(key));}
const storeOwner=new Proxy({}, {
  get(_target,key){if(key==='dataDir')return dataDirectory;return denied(key);},
  set(_target,key){return denied(key);},ownKeys(){return denied('ownKeys');},
  getOwnPropertyDescriptor(_target,key){return denied(key);},getPrototypeOf(){return denied('getPrototypeOf');},
});
const service=Object.create(StudioService.prototype) as StudioService;
Object.defineProperty(service,'store',{value:storeOwner,writable:false,enumerable:false,configurable:false});
function profile(date='2000-11-12',time='08:00:00',extra:Partial<BirthProfile>={}):BirthProfile {
  return {id:'m689-preview-'+date+'-'+time,customerName:'甲亥戊壬项目预览𠮷😀',surname:'林',surnamePinyin:'lín',
    gender:'中性',calendar:'solar',birthDate:date,birthTime:time,timeUnknown:time==='',leapMonth:false,
    birthPlace:'上海',timezone:'Asia/Shanghai',notes:'父母原输入保留；仅独立项目比较。',fatherName:'林安',motherName:'陈宁',
    parentNameReadings:[
      {version:'parent-name-reading/1.0.0',role:'father',fullName:'林安',surnameLength:1,givenName:'安',readings:[{index:0,char:'安',confirmed:true,token:'an1',origin:'family-confirmed'}]},
      {version:'parent-name-reading/1.0.0',role:'mother',fullName:'陈宁',surnameLength:1,givenName:'宁',readings:[{index:0,char:'宁',confirmed:true,token:'ning2',origin:'family-confirmed'}]},
    ],...extra};
}
function freezePlain<T>(value:T):T{if(value&&typeof value==='object'){for(const child of Object.values(value))freezePlain(child);Object.freeze(value);}return value;}
const preview=(input:BirthProfile,options?:JiaHaiControlOptions):Promise<JiaHaiControlPreview>=>options===undefined
  ?service.previewJiaHaiControl(input):service.previewJiaHaiControl(input,options);
function normalized(source:SourceLock['sources'][number]):SourceRecord{const {fileHashes:_hashes,...record}=source;return record;}

beforeAll(()=>{
  const local=join(projectRoot,'.local');mkdirSync(local,{recursive:true});
  if(realpathSync(local).toLowerCase()!==local.toLowerCase())throw Error('Fixture parent redirects outside this work');
  fixtureParent=join(local,'m689-jia-hai-preview-tests');mkdirSync(fixtureParent,{recursive:true});
  fixtureRoot=mkdtempSync(join(fixtureParent,'case-'));dataDirectory=join(fixtureRoot,'data');
  monthly=json<SourceLock>(sourcePath(MONTHLY_LOCK));const bazi=json<SourceLock>(sourcePath(BAZI_LOCK));
  projectManifest=json<ProjectManifest>(sourcePath(PROJECT_MANIFEST));
  const files=new Set([MONTHLY_LOCK,BAZI_LOCK,RAW,PROJECT_MANIFEST,...MANAGED_NAMES.map(name=>MANAGED_ROOT+name)]);
  for(const lock of [monthly,bazi])for(const source of lock.sources)for(const file of source.files)files.add(file);
  for(const row of projectManifest.files)files.add(PROJECT_ROOT+row.path);
  for(const file of files){
    const original=sourcePath(file),target=ownedPath(file);originals.set(file,digest(readFileSync(original)));
    mkdirSync(dirname(target),{recursive:true});copyFileSync(original,target);
  }
  // The fixture carries the entire fixed project resource closure, not merely
  // the selected solver and parameter files used for the four faults below.
  for(const row of projectManifest.files){const bytes=readFileSync(ownedPath(PROJECT_ROOT+row.path));expect(bytes.length).toBe(row.bytes);expect(digest(bytes)).toBe(row.sha256);}
  fixedSource=json<FixedSource>(ownedPath(MANAGED_ROOT+'source.json'));
  const raw=readFileSync(ownedPath(RAW));expect(digest(raw)).toBe(RAW_SHA);rawPoints=Array.from(raw.toString('utf8'));
});
beforeEach(()=>{forbiddenStoreReads=0;});
afterEach(()=>{try{expect(forbiddenStoreReads).toBe(0);}finally{vi.restoreAllMocks();}});
afterAll(()=>{
  try{for(const [file,sha]of originals)expect(digest(readFileSync(sourcePath(file)))).toBe(sha);}
  finally{if(fixtureRoot){const actual=realpathSync(fixtureRoot),parent=realpathSync(fixtureParent);if(dirname(actual)!==parent||!basename(actual).startsWith('case-'))throw Error('Unsafe owned fixture cleanup');rmSync(actual,{recursive:true,force:false});}}
});

function assertVerified(result:JiaHaiControlPreview,input:BirthProfile,enabled:boolean):void {
  expect(Object.keys(result).sort()).toEqual(['schema','profileId','request','projection','sourceVerification'].sort());
  expect(result.schema).toBe('jia-hai-control-preview/1.0.0');expect(result.profileId).toBe(input.id);
  expect(result.request.enabled).toBe(enabled);expect(result.projection.project.enabled).toBe(enabled);
  const projection=result.projection,verification=result.sourceVerification;
  expect(projection.schema).toBe('jia-hai-wu-ren-project-intervention/1.0.0');
  expect(projection.birth.profile.id).toBe(input.id);expect(projection.birth.originalAnalysisDigest).toBe(valueDigest(analyzeProfile(input)));
  expect(projection.traditional.status).toBe('traditional-unknown');expect(projection.traditional.usefulGodDecision).toBe('not-evaluated');
  expect(projection.traditional.namingImpact).toBe('none');expect(projection.project.scoreMutation).toBe(false);
  expect(verification.schema).toBe('jia-hai-control-source-verification/1.0.0');expect(verification.status).toBe('verified-fixed-resources');
  expect(verification.school).toBe('qiongtong-wikisource-2294674');expect(verification.sourceId).toBe('bazi-monthly-qiongtong-2294674');
  expect(verification.revision).toBe('wikisource-revision/2294674');expect(verification.rawSha256).toBe(RAW_SHA);expect(verification.scanCollation).toBe(false);
  expect(verification.quote).toBe(fixedSource.quote);expect(verification.quoteSpan).toEqual(fixedSource.quoteSpan);
  expect(rawPoints.slice(verification.quoteSpan.start,verification.quoteSpan.end).join('')).toBe(verification.quote);
  expect(digest(rawPoints.slice(verification.context.span.start,verification.context.span.end).join(''))).toBe(verification.context.sha256);
  expect(verification.counterControl).toEqual({quote:fixedSource.counterControlQuote,span:fixedSource.counterControlSpan});
  expect(rawPoints.slice(verification.counterControl.span.start,verification.counterControl.span.end).join('')).toBe(verification.counterControl.quote);
  expect(projection.source).toMatchObject({sourceId:verification.sourceId,revision:verification.revision,rawSha256:verification.rawSha256,quote:verification.quote,quoteSpan:verification.quoteSpan});
  expect(verification.monthlySources).toEqual(monthly.sources.map(normalized));
  expect(verification.managedInputs.map(row=>row.file).sort()).toEqual(MANAGED_NAMES.map(name=>MANAGED_ROOT+name).sort());
  for(const row of verification.managedInputs){const bytes=readFileSync(ownedPath(row.file));expect(bytes.length).toBe(row.bytes);expect(digest(bytes)).toBe(row.sha256);}
  expect(verification.project.methodId).toBe('project-bazi-mainchain-145/1.3.1');expect(projection.project.methodId).toBe(verification.project.methodId);
  expect(verification.project.sources).toEqual(projectManifest.sources);
  expect(verification.project.resourceIdentity).toEqual({schema:'bazi-root-feedback-resource-identity/1',methodId:projectManifest.methodId,
    applicationPolicyVersion:projectManifest.applicationPolicyVersion,publicationId:projectManifest.publicationId,
    manifestSha256:originals.get(PROJECT_MANIFEST),sourceRevision:projectManifest.sourceRevision,kernel:projectManifest.kernel,files:projectManifest.files});
  expect(verification.binding).toEqual({profileId:input.id,projectionSchema:projection.schema,originalAnalysisDigest:projection.birth.originalAnalysisDigest});
  expect(JSON.stringify(result)).not.toContain('contractClaims');expect(JSON.stringify(result)).not.toMatch(/平常人也|富贵|科甲|残疾|寿命|淫/);
}

describe('M689 constructor-free verified Jia-Hai control preview',()=>{
  it('defaults off and keeps explicit false off while still verifying the full resource receipt',async()=>{
    const compare=vi.spyOn(projectSolver,'compareRootFeedbackIntervention145'),discover=vi.spyOn(rootSolver,'resolveRootFeedback');
    const input=profile(),before=structuredClone(input),analysis=analyzeProfile(input);
    for(const options of [undefined,{enabled:false}] as const){
      const pending=preview(input,options);expect(typeof pending.then).toBe('function');const result=await pending;assertVerified(result,before,false);
      expect(result.request).toEqual({enabled:false,selector:null});expect(result.projection.project.status).toBe('disabled');
      expect(result.projection.project.discovery).toBeNull();expect(result.projection.project.legacyComparison).toBeNull();
    }
    expect(compare).not.toHaveBeenCalled();expect(discover).not.toHaveBeenCalled();expect(input).toEqual(before);expect(analyzeProfile(input)).toEqual(analysis);
  });

  it('returns the actual unique 08:00 canonical projected-only chain and preserves full paired results separately',async()=>{
    const input=profile(),before=structuredClone(input),analysis=analyzeProfile(input),result=await preview(freezePlain(input),{enabled:true});
    assertVerified(result,before,true);const projection=result.projection;
    expect(projection.birth.knownPillars.map(row=>row.gan+row.zhi)).toEqual(['庚辰','丁亥','甲戌','戊辰']);
    expect(projection.project.status).toBe('projected-only');expect(projection.project.candidates).toHaveLength(1);
    expect(projection.project.selected).toMatchObject({canonicalEdgeId:'control:hour:stem:month:hidden:壬',attackerToHiddenEdgeId:'control:month:hidden:壬:day:hidden:丁',
      controller:{id:'hour:stem',kind:'exposed',stem:'戊'},attacker:{id:'month:hidden:壬',stem:'壬'},hiddenCarrier:{id:'day:hidden:丁',stem:'丁'}});
    expect(projection.project.legacyComparison?.disabledControlEdgeIds).toEqual(['control:hour:stem:month:hidden:壬']);
    expect(projection.project.pairedRegimes).toHaveLength(16);expect(projection.project.pairedRegimes.every(row=>row.invariants.valid)).toBe(true);
    expect(projection.project.comparisonResolution).toBe('two-unique-regime-comparison');
    expect(input).toEqual(before);expect(input.parentNameReadings).toEqual(before.parentNameReadings);expect(analyzeProfile(input)).toEqual(analysis);
  });

  it('does not substitute hidden 戊, an unknown hour or a calendar-null chart with invented pillars',async()=>{
    const without=profile('2000-11-12','16:00:00'),withoutResult=await preview(without,{enabled:true});assertVerified(withoutResult,without,true);
    expect(withoutResult.projection.birth.knownPillars.map(row=>row.gan+row.zhi)).toEqual(['庚辰','丁亥','甲戌','壬申']);
    expect(withoutResult.projection.literal.exposedWu).toBe('not-seen');expect(withoutResult.projection.project.status).toBe('no-eligible-path');
    expect(withoutResult.projection.project.candidates).toEqual([]);expect(withoutResult.projection.project.legacyComparison).toBeNull();
    const unknown=profile('2000-11-12',''),unknownBefore=structuredClone(unknown),unknownResult=await preview(unknown,{enabled:true});assertVerified(unknownResult,unknownBefore,true);
    expect(unknownResult.projection.birth.chart?.pillars.hour).toBeNull();expect(unknownResult.projection.birth.knownPillars).toHaveLength(3);
    expect(unknownResult.projection.project.status).toBe('pending-incomplete-graph');expect(unknownResult.projection.project.selected).toBeNull();
    expect(unknownResult.projection.project.legacyComparison).toBeNull();expect(unknown).toEqual(unknownBefore);
    const unresolved=profile('2000-11-12','',{timeBasis:'apparent-solar',birthLongitude:87.6168}),unresolvedBefore=structuredClone(unresolved);
    const nullResult=await preview(unresolved,{enabled:true});assertVerified(nullResult,unresolvedBefore,true);
    expect(nullResult.projection.project.status).toBe('calendar-unknown');expect(nullResult.projection.birth.chart).toBeNull();
    expect(nullResult.projection.birth.knownPillars.some(row=>row.label==='时柱')).toBe(false);expect(unresolved).toEqual(unresolvedBefore);
  });

  it('retains ambiguous 1970 candidates until a genuine typed candidate selector chooses one chain',async()=>{
    const input=profile('1970-11-10','08:00:00'),before=structuredClone(input),discovery=await preview(input,{enabled:true});assertVerified(discovery,before,true);
    expect(discovery.projection.project.status).toBe('ambiguous-selector');expect(discovery.projection.project.candidates.length).toBeGreaterThan(1);
    expect(discovery.projection.project.selected).toBeNull();expect(discovery.projection.project.legacyComparison).toBeNull();
    const candidate=discovery.projection.project.candidates.find(row=>row.hiddenCarrier.id==='day:hidden:丁');if(!candidate)throw Error('Actual reviewed candidate missing');
    const selected=await preview(input,{enabled:true,selector:candidate.selector});assertVerified(selected,before,true);
    expect(selected.request.selector).toEqual(candidate.selector);expect(selected.projection.project.status).toBe('projected-only');
    expect(selected.projection.project.selected?.selector).toEqual(candidate.selector);
    expect(selected.projection.project.legacyComparison?.disabledControlEdgeIds).toEqual([candidate.canonicalEdgeId]);
    expect(input).toEqual(before);
  });

  it('rejects wrong selectors, raw graph/edge claims and accessors or proxies without invoking their traps',async()=>{
    const input=profile(),before=structuredClone(input);
    const wrong=await preview(input,{enabled:true,selector:{controllerId:'day:stem',attackerId:'month:hidden:壬',hiddenCarrierId:'day:hidden:丁'}});
    assertVerified(wrong,before,true);expect(wrong.projection.project.status).toBe('selector-rejected');expect(wrong.projection.project.legacyComparison).toBeNull();
    for(const options of [{enabled:true,edgeId:'control:any'},{enabled:true,disabledControlEdgeIds:['x']},{enabled:true,graph:{}},{enabled:true,selector:{controllerId:'hour:stem',attackerId:'month:hidden:壬',hiddenCarrierId:'day:hidden:丁',edgeId:'x'}}]){
      await expect(preview(input,options as never)).rejects.toThrow();
    }
    await expect(preview({...input,graph:{}} as never,{enabled:true})).rejects.toThrow();
    let traps=0;const trap=()=>{traps++;throw Error('Trap must not run');};
    const accessor=Object.defineProperty(profile(),'birthDate',{enumerable:true,get:trap});
    const optionAccessor=Object.defineProperty({},'enabled',{enumerable:true,get:trap});
    const handler:ProxyHandler<object>={get:trap,getPrototypeOf:trap,ownKeys:trap,getOwnPropertyDescriptor:trap};
    await expect(preview(accessor)).rejects.toThrow();await expect(preview(input,optionAccessor)).rejects.toThrow();
    await expect(preview(new Proxy(profile(),handler) as unknown as BirthProfile)).rejects.toThrow();await expect(preview(input,new Proxy({enabled:true},handler) as never)).rejects.toThrow();
    expect(traps).toBe(0);expect(input).toEqual(before);
  });

  it('does not let returned projection/verification mutations alter another reply or the parent/default input',async()=>{
    const input=profile(),beforeInput=structuredClone(input),analysis=analyzeProfile(input),first=await preview(input),expected=structuredClone(first);
    // Both frozen replies and mutable detached receipts satisfy isolation; the
    // next request must authenticate its resources and return pristine values.
    Reflect.set(first.sourceVerification as object,'rawSha256','0'.repeat(64));
    Reflect.set(first.sourceVerification.binding as object,'originalAnalysisDigest','1'.repeat(64));
    Reflect.set(first.projection.project as object,'status','injected');
    const second=await preview(input);expect(second).toEqual(expected);expect(second).not.toBe(first);assertVerified(second,beforeInput,false);
    expect(input).toEqual(beforeInput);expect(input.parentNameReadings).toEqual(beforeInput.parentNameReadings);expect(analyzeProfile(input)).toEqual(analysis);
  });

  it.each([MANAGED_ROOT+'source.json',MANAGED_ROOT+'rule-input.ts',PARAMETER,SOLVER_RUNTIME])('rejects one changed byte in %s after a warm successful API and accepts exact restoration',async file=>{
    const input=profile(),beforeInput=structuredClone(input),before=await preview(input);assertVerified(before,beforeInput,false);
    const target=ownedPath(file),original=readFileSync(target);if(!original.length)throw Error('Fixed fault target is empty');
    const changed=Buffer.from(original);changed[changed.length-1]^=1;
    try{writeFileSync(target,changed);await expect(preview(input)).rejects.toThrow();}
    finally{writeFileSync(target,original);}
    expect(digest(readFileSync(target))).toBe(digest(original));expect(digest(readFileSync(sourcePath(file)))).toBe(originals.get(file));
    expect(await preview(input)).toEqual(before);expect(input).toEqual(beforeInput);
  });
});
