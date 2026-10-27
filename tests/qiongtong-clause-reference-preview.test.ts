import {afterAll,afterEach,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {copyFileSync,mkdirSync,mkdtempSync,readFileSync,realpathSync,rmSync,unlinkSync,writeFileSync} from 'node:fs';
import {basename,dirname,join,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {StudioService} from '../src/main/service';
import {analyzeProfile} from '../src/domain/engine';
import {analyzeFreshWithGengSiReference} from '../src/main/geng-si-reference-explanation';
import type {BirthProfile} from '../src/shared/types';
import type {QiongtongClauseReferencePreview} from '../src/shared/qiongtong-clause-reference-preview';

// Authored only: contract/preview-contract.ts, formal M508 r2 shared/domain,
// existing GengSi preview and M508 real-birth fixtures were read; no test ran.
// No Service constructor, Store.init, SQL, Worker or whole-data copy is used.
const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sourceData=join(projectRoot,'data');
const MONTHLY_LOCK='data/monthly-seasonal-source-lock.json';
const BAZI_LOCK='data/bazi-evidence-source-lock.json';
const RAW='data/raw/classics-qiongtong-2294674.wiki';
const CONDITIONS='data/qiongtong-clause-conditions-v1.json';
const CONDITIONS_SHA='9df67435c2b63126d6bae24bcbb1d156ad4e362e07ecafbfd2bb430050fb8b41';
const RAW_SHA='8ba17242f116583de2e10172e006f5ce5f74b23ccfc0bd24b886be135e9f20bd';
type Span={start:number;end:number;unit:'unicode-codepoint';interval:'[start,end)'};
type CatalogRule={id:string;entry:string;existingConditionId:string;quote:string;quoteSpan:Span;contextQuote:string;contextSpan:Span;locator:string};
type Catalog={version:string;revision:string;rawSha256:string;rules:CatalogRule[]};
type SourceLock={sources:Array<{id:string;name:string;url:string;commit:string;license:string;files:string[];sha256:string;note:string;fileHashes:Record<string,string>}>};
type Table={entries:Array<{id:string;sourceQuote:string;sourceSpan:Span;conditions:Array<{id:string;sourceQuote:string;sourceSpan:Span;sourceLocator:string}>}>};
let fixtureParent='',fixtureRoot='',dataDirectory='',forbiddenStoreReads=0;
let catalog:Catalog,table:Table,rawPoints:string[],locks:SourceLock[];
const originalProjectHashes=new Map<string,string>();
const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const readJson=<T,>(file:string):T=>JSON.parse(readFileSync(file,'utf8')) as T;
function sourcePath(relative:string):string {
  if(!relative.startsWith('data/')||relative.includes('\\')||relative.split('/').some(part=>!part||part==='.'||part==='..'))throw Error('Unexpected fixture source path');
  return join(sourceData,relative.slice(5));
}
function ownedPath(relative:string):string {
  sourcePath(relative);
  const result=resolve(dataDirectory,relative.slice(5));
  if(!result.startsWith(resolve(dataDirectory)+sep))throw Error('Fixture path escaped the exact owned data directory');
  return result;
}
function forbidden(key:PropertyKey):never {forbiddenStoreReads++;throw Error('M561 forbidden Store dependency: '+String(key));}
const storeOwner=new Proxy({}, {
  get(_target,key){if(key==='dataDir')return dataDirectory;return forbidden(key);},
  set(_target,key){return forbidden(key);},
  ownKeys(){return forbidden('ownKeys');},
});
const service=Object.create(StudioService.prototype) as StudioService;
Object.defineProperty(service,'store',{value:storeOwner,writable:false,enumerable:false,configurable:false});
function profile(date='2000-11-12',time='08:00:00',extra:Partial<BirthProfile>={}):BirthProfile {
  return {id:'m561-clause-profile',customerName:'M561 三条字面条件预览',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:date,birthTime:time,timeUnknown:time==='',leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:'',...extra};
}
const preview=(input:BirthProfile)=>service.previewQiongtongClauseReferences(input);
function freezePlain<T>(value:T):T {if(value&&typeof value==='object'){for(const child of Object.values(value))freezePlain(child);Object.freeze(value);}return value;}

beforeAll(()=>{
  const local=join(projectRoot,'.local');mkdirSync(local,{recursive:true});
  if(realpathSync(local).toLowerCase()!==local.toLowerCase())throw Error('Test fixture parent must not redirect outside this work');
  fixtureParent=join(local,'m561-clause-reference-tests');mkdirSync(fixtureParent,{recursive:true});
  fixtureRoot=mkdtempSync(join(fixtureParent,'case-'));dataDirectory=join(fixtureRoot,'data');
  locks=[readJson<SourceLock>(sourcePath(MONTHLY_LOCK)),readJson<SourceLock>(sourcePath(BAZI_LOCK))];
  const files=new Set<string>([MONTHLY_LOCK,BAZI_LOCK,RAW,CONDITIONS]);
  for(const lock of locks)for(const source of lock.sources)for(const file of source.files)files.add(file);
  const jiaManifest='data/qiongtong-jia-v11/manifest.json';files.add(jiaManifest);
  const jiaInputs=readJson<{inputs:{file:string}[]}>(sourcePath(jiaManifest));
  for(const entry of jiaInputs.inputs)files.add('data/qiongtong-jia-v11/'+entry.file);
  for(const relative of files){
    const source=sourcePath(relative),target=ownedPath(relative);
    originalProjectHashes.set(relative,digest(readFileSync(source)));
    mkdirSync(dirname(target),{recursive:true});copyFileSync(source,target);
  }
  expect(digest(readFileSync(ownedPath(CONDITIONS)))).toBe(CONDITIONS_SHA);
  const raw=readFileSync(ownedPath(RAW));expect(digest(raw)).toBe(RAW_SHA);rawPoints=Array.from(raw.toString('utf8'));
  catalog=readJson<Catalog>(ownedPath(CONDITIONS));table=readJson<Table>(ownedPath('data/monthly-seasonal-table.json'));
  expect(catalog.version).toBe('qiongtong-literal-conditions/1.0.0');expect(catalog.rules).toHaveLength(3);
});
beforeEach(()=>{forbiddenStoreReads=0;});
afterEach(()=>{expect(forbiddenStoreReads).toBe(0);});
afterAll(()=>{
  try{for(const [relative,expected]of originalProjectHashes)expect(digest(readFileSync(sourcePath(relative)))).toBe(expected);}
  finally{
    if(fixtureRoot){
      const actual=realpathSync(fixtureRoot),parent=realpathSync(fixtureParent);
      if(dirname(actual)!==parent||!basename(actual).startsWith('case-'))throw Error('Unsafe owned fixture cleanup');
      rmSync(actual,{recursive:true,force:false});
    }
  }
});

function assertVerified(result:QiongtongClauseReferencePreview):void {
  expect(Object.keys(result).sort()).toEqual(['schema','profileId','analysis','reference','sourceVerification','jiaChapter','jiaSourceVerification'].sort());
  expect(result.schema).toBe('qiongtong-clause-reference-preview/1.0.0');
  expect(result.reference.schema).toBe('qiongtong-literal-conditions/1.0.1');
  expect(result.reference.namingImpact).toBe('none');
  const verification=result.sourceVerification;
  expect(verification.status).toBe('verified-fixed-resources');
  expect(verification.school).toBe('qiongtong-wikisource-2294674');
  expect(verification.revision).toBe('wikisource-revision/2294674');
  expect(verification.scanCollation).toBe(false);
  expect(verification.conditions).toEqual({file:CONDITIONS,schema:'qiongtong-literal-conditions/1.0.0',sha256:CONDITIONS_SHA});
  expect(verification.sources.map(source=>source.id)).toContain('bazi-monthly-qiongtong-2294674');
  for(const source of verification.sources){
    const fixed=locks.flatMap(lock=>lock.sources).find(row=>row.id===source.id);
    if(!fixed)throw Error('Unexpected verified source id: '+source.id);
    const {fileHashes:_fileHashes,...record}=fixed;
    expect(source).toEqual(record);
  }
  expect(result.reference.rules.map(rule=>rule.id)).toEqual(catalog.rules.map(rule=>rule.id));
  expect(verification.rules.map(rule=>rule.ruleId)).toEqual(catalog.rules.map(rule=>rule.id));
  for(const fixed of catalog.rules){
    const rule=result.reference.rules.find(row=>row.id===fixed.id)!;
    const receipt=verification.rules.find(row=>row.ruleId===fixed.id)!;
    const entry=table.entries.find(row=>row.id===fixed.entry)!;
    const condition=entry.conditions.find(row=>row.id===fixed.existingConditionId)!;
    expect(rule.existingConditionId).toBe(fixed.existingConditionId);
    expect(rule.source).toEqual({id:'bazi-monthly-qiongtong-2294674',revision:'wikisource-revision/2294674',rawSha256:RAW_SHA,quote:fixed.quote,locator:fixed.locator,quoteSpan:fixed.quoteSpan,contextQuote:fixed.contextQuote,contextSpan:fixed.contextSpan,scanCollation:false});
    expect(receipt).toEqual({ruleId:fixed.id,existingConditionId:fixed.existingConditionId,entryId:fixed.entry,source:rule.source});
    expect(condition.sourceQuote).toBe(fixed.quote);expect(condition.sourceSpan).toEqual(fixed.quoteSpan);expect(condition.sourceLocator).toBe(fixed.locator);
    expect(entry.sourceQuote).toBe(fixed.contextQuote);expect(entry.sourceSpan).toEqual(fixed.contextSpan);
    // Quote and context are independently recorded codepoint spans; the quote
    // need not be contained in the earlier paragraph's context span.
    expect(rawPoints.slice(rule.source.quoteSpan.start,rule.source.quoteSpan.end).join('')).toBe(rule.source.quote);
    expect(rawPoints.slice(rule.source.contextSpan.start,rule.source.contextSpan.end).join('')).toBe(rule.source.contextQuote);
    expect(rule.actionEvaluation).toBe('not-evaluated');expect(rule.usefulGodDecision).toBe('not-evaluated');
    expect(rule.textReferences.every(use=>use.status==='recorded-text')).toBe(true);
  }
}

const realBirths=[
  {date:'2000-11-12',time:'08:00:00',pillars:['庚辰','丁亥','甲戌','戊辰'],condition:'jia-hai-three-exposed',status:'condition-met'},
  {date:'2000-11-12',time:'00:00:00',pillars:['庚辰','丁亥','甲戌','甲子'],condition:'jia-hai-three-exposed',status:'condition-not-met'},
  {date:'2000-01-07',time:'12:00:00',pillars:['己卯','丁丑','甲子','庚午'],condition:'jia-chou-geng-exposed-ding-hidden',status:'condition-met'},
  {date:'2000-01-07',time:'00:00:00',pillars:['己卯','丁丑','甲子','甲子'],condition:'jia-chou-geng-exposed-ding-hidden',status:'condition-not-met'},
  {date:'2000-12-23',time:'02:00:00',pillars:['庚辰','戊子','乙卯','丁丑'],condition:'yi-zi-no-bing-anywhere',status:'condition-met'},
  {date:'2000-12-13',time:'00:00:00',pillars:['庚辰','戊子','乙巳','丙子'],condition:'yi-zi-no-bing-anywhere',status:'condition-not-met'},
] as const;
const faultFiles=[
  MONTHLY_LOCK,'data/monthly-seasonal-table.json','data/monthly-seasonal-editorial.json',
  'data/raw/monthly-seasonal-qiongtong-excerpts.json','data/raw/monthly-seasonal-qiongtong-source.json',
  'data/raw/monthly-seasonal-ATTRIBUTION.md','data/raw/CC-BY-SA-4.0.txt',RAW,CONDITIONS,
  BAZI_LOCK,'data/raw/bazi-evidence-lunar-LICENSE.txt',
] as const;

describe('M561 constructor-free real Service Qiongtong clause preview',()=>{
  it.each(realBirths)('returns all three verified references for $date $time ($status)',async row=>{
    const input=profile(row.date,row.time),before=structuredClone(input),pending=preview(input);
    expect(typeof pending.then).toBe('function');
    const result=await pending;
    expect(result.profileId).toBe(input.id);expect(input).toEqual(before);
    expect(result.analysis).toEqual(analyzeProfile(before));
    expect(result.analysis.bazi.pillars.map(pillar=>pillar.gan+pillar.zhi)).toEqual(row.pillars);
    expect(result.reference.rules.find(rule=>rule.existingConditionId===row.condition)?.status).toBe(row.status);
    assertVerified(result);
  });

  it('keeps an absent hour unknown rather than inventing the missing exposed stem',async()=>{
    const input=profile('2000-11-12',''),result=await preview(input);
    expect(result.analysis).toEqual(analyzeProfile(input));
    expect(result.reference.input.complete).toBe(false);expect(result.reference.input.unknownPositions).toContain('时柱');
    expect(result.reference.rules.find(rule=>rule.existingConditionId==='jia-hai-three-exposed')?.status).toBe('unknown');
    expect(result.analysis.bazi.pillars.some(pillar=>pillar.label==='时柱')).toBe(false);assertVerified(result);
  });

  it('returns not-applicable rules while still verifying their complete original sources',async()=>{
    const input=profile('2020-05-07','12:00:00'),result=await preview(input);
    expect(result.analysis).toEqual(analyzeProfile(input));
    expect(result.reference.rules.map(rule=>rule.status)).toEqual(['not-applicable','not-applicable','not-applicable']);
    expect(result.reference.rules.every(rule=>rule.literalFact.result==='not-evaluated')).toBe(true);assertVerified(result);
  });

  it('rejects extra arguments and extra fields before accessing request data',async()=>{
    await expect((service.previewQiongtongClauseReferences as (...args:unknown[])=>Promise<unknown>)(profile(),{})).rejects.toThrow();
    await expect(preview({...profile(),hiddenStems:[]} as never)).rejects.toThrow();
    await expect(preview({...profile(),sourceVerification:{status:'verified-fixed-resources'}} as never)).rejects.toThrow();
  });

  it('rejects accessors and proxies without running their getters or traps',async()=>{
    let reads=0;
    const accessor=Object.defineProperty(profile(),'birthDate',{enumerable:true,get(){reads++;return '2000-11-12';}});
    await expect(preview(accessor)).rejects.toThrow();expect(reads).toBe(0);
    const proxy=new Proxy(profile(),{getPrototypeOf(){reads++;throw Error('proxy trap');},ownKeys(){reads++;throw Error('proxy trap');}});
    await expect(preview(proxy)).rejects.toThrow();expect(reads).toBe(0);
    const nested=profile();nested.namingPreferences=Object.defineProperty({},'preferredElements',{enumerable:true,get(){reads++;return [];}}) as never;
    await expect(preview(nested)).rejects.toThrow();expect(reads).toBe(0);
  });

  it('preserves detached input and the original GengSi/default analysis without broader Store access',async()=>{
    const input=profile('2020-05-07','12:00:00',{parentNameReadings:[]}),snapshot=structuredClone(input);
    const defaultBefore=analyzeProfile(snapshot),gengBefore=analyzeFreshWithGengSiReference(snapshot);
    const defaultSnapshot=structuredClone(defaultBefore),gengSnapshot=structuredClone(gengBefore);
    const result=await preview(freezePlain(input));
    expect(input).toEqual(snapshot);expect(result.profileId).toBe(snapshot.id);expect(result.analysis).toEqual(defaultSnapshot);
    expect(defaultBefore).toEqual(defaultSnapshot);expect(gengBefore).toEqual(gengSnapshot);
    expect(analyzeProfile(snapshot)).toEqual(defaultSnapshot);expect(analyzeFreshWithGengSiReference(snapshot)).toEqual(gengSnapshot);
    assertVerified(result);
  });

  it('does not let a previous returned verified label become authority for another request',async()=>{
    const first=await preview(profile()),expected=structuredClone(first);
    try{(first.sourceVerification.conditions as {sha256:string}).sha256='f'.repeat(64);}catch{/* immutable DTOs are also acceptable */}
    const second=await preview(profile());expect(second).toEqual(expected);expect(second).not.toBe(first);assertVerified(second);
  });

  for(const fault of ['tampered','missing'] as const)it.each(faultFiles)(`rejects ${fault} %s after a successful request and accepts exact restoration`,async relative=>{
    const file=ownedPath(relative),original=readFileSync(file),before=await preview(profile());
    expect(before.sourceVerification.status).toBe('verified-fixed-resources');
    try{
      if(fault==='missing')unlinkSync(file);else writeFileSync(file,Buffer.concat([original,Buffer.from(' ')]));
      await expect(preview(profile())).rejects.toThrow();
    }finally{writeFileSync(file,original);}
    expect(digest(readFileSync(file))).toBe(digest(original));
    expect(digest(readFileSync(sourcePath(relative)))).toBe(originalProjectHashes.get(relative));
    expect(await preview(profile())).toEqual(before);
  });
});
