import {afterAll,afterEach,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {copyFileSync,mkdirSync,mkdtempSync,readFileSync,realpathSync,rmSync,unlinkSync,writeFileSync} from 'node:fs';
import {basename,dirname,join,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {StudioService} from '../src/main/service';
import {analyzeFreshQiongtongClauseReferences} from '../src/main/qiongtong-clause-reference';
import {evaluateQiongtongJiaConditionsV11,type SafeChartInput140} from '../src/domain/traditional/qiongtong-jia-conditions-v11';
import type {JiaLiteralReferenceV11,JiaSourceSpan} from '../src/domain/traditional/qiongtong-jia-v11-types';
import type {BirthProfile,SourceRecord} from '../src/shared/types';
import type {QiongtongClauseReferencePreview} from '../src/shared/qiongtong-clause-reference-preview';

// Source-only M607 tests. These use M588's recorded real calendar profiles and
// the additive API contract; neither Service nor Store is constructed. No SQL,
// Worker, save, AI or whole-data copy is used. Execution belongs to root.
const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..'),sourceData=join(projectRoot,'data');
const MONTHLY_LOCK='data/monthly-seasonal-source-lock.json',BAZI_LOCK='data/bazi-evidence-source-lock.json';
const RAW='data/raw/classics-qiongtong-2294674.wiki',CONDITIONS='data/qiongtong-clause-conditions-v1.json';
const JIA_ROOT='data/qiongtong-jia-v11/',MANIFEST=JIA_ROOT+'manifest.json';
const JIA_INPUT_NAMES=['catalog.json','rule-input.ts','types-input.ts','ATTRIBUTION.md','CC-BY-SA-4.0.txt'] as const;
const RAW_SHA='8ba17242f116583de2e10172e006f5ce5f74b23ccfc0bd24b886be135e9f20bd';
const RULE_IDS=['jia-yin-gui-hidden-bing-exposed','jia-chen-geng-ren-exposed','jia-si-gui-ding-geng-exposed','jia-you-bing-geng-exposed'];
type FixedSource=SourceRecord&{fileHashes:Record<string,string>};
type SourceLock={sources:FixedSource[]};
type OldCatalog={version:string;rules:Array<{id:string;entry:string;existingConditionId:string;quote:string;locator:string;quoteSpan:JiaSourceSpan;contextQuote:string;contextSpan:JiaSourceSpan}>};
type JiaCatalog={version:string;source:{chapterSpan:JiaSourceSpan};executable:Array<{id:string;source:{quote:string;locator:string;quoteSpan:JiaSourceSpan;contextSpan:JiaSourceSpan;contextSha256:string}}>};
type ManagedRow={file:string;role:string;sha256:string;bytes:number};
type ManagedManifest={schema:string;version:string;inputs:ManagedRow[];chapterSpan:JiaSourceSpan;chapterSha256:string};
type JiaVerification={
  schema:string;status:string;sourceId:string;revision:string;rawSha256:string;scanCollation:boolean;
  monthlySources:readonly SourceRecord[];catalog:{file:string;version:string;sha256:string;bytes:number};
  managedInputs:readonly {file:string;sha256:string;bytes:number}[];
  chapter:{span:JiaSourceSpan;sha256:string};
  rules:readonly {id:string;quote:string;locator:string;quoteSpan:JiaSourceSpan;contextSpan:JiaSourceSpan;contextSha256:string}[];
};
type ExtendedPreview=QiongtongClauseReferencePreview&{jiaChapter?:JiaLiteralReferenceV11;jiaSourceVerification?:JiaVerification};
let fixtureParent='',fixtureRoot='',dataDirectory='',forbiddenReads=0;
let monthly:SourceLock,bazi:SourceLock,oldCatalog:OldCatalog,jiaCatalog:JiaCatalog,manifest:ManagedManifest,rawPoints:string[];
const projectHashes=new Map<string,string>();
const digest=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
const json=<T,>(file:string):T=>JSON.parse(readFileSync(file,'utf8')) as T;
function sourcePath(relative:string){
  if(!relative.startsWith('data/')||relative.includes('\\')||relative.split('/').some(part=>!part||part==='.'||part==='..'))throw Error('Unexpected fixed fixture path');
  return join(sourceData,relative.slice(5));
}
function ownedPath(relative:string){
  sourcePath(relative);const target=resolve(dataDirectory,relative.slice(5));
  if(!target.startsWith(resolve(dataDirectory)+sep))throw Error('Fixture escaped its owned data directory');return target;
}
function forbidden(key:PropertyKey):never{forbiddenReads++;throw Error('M607 forbidden Store dependency: '+String(key));}
const storeOwner=new Proxy({}, {
  get(_target,key){if(key==='dataDir')return dataDirectory;return forbidden(key);},
  set(_target,key){return forbidden(key);},ownKeys(){return forbidden('ownKeys');},
  getOwnPropertyDescriptor(_target,key){return forbidden(key);},getPrototypeOf(){return forbidden('getPrototypeOf');},
});
const service=Object.create(StudioService.prototype) as StudioService;
Object.defineProperty(service,'store',{value:storeOwner,writable:false,enumerable:false,configurable:false});
function profile(date:string,time:string):BirthProfile {
  return {id:'m607-jia-'+date+'-'+time,customerName:'M607 甲木逐条参考𠮷😀',surname:'林',surnamePinyin:'lín',
    gender:'中性',calendar:'solar',birthDate:date,birthTime:time,timeUnknown:time==='',leapMonth:false,
    birthPlace:'上海',timezone:'Asia/Shanghai',notes:'保留父母姓名和逐字确认输入。',fatherName:'林安',motherName:'陈宁',
    parentNameReadings:[
      {version:'parent-name-reading/1.0.0',role:'father',fullName:'林安',surnameLength:1,givenName:'安',readings:[{index:0,char:'安',confirmed:true,token:'an1',origin:'family-confirmed'}]},
      {version:'parent-name-reading/1.0.0',role:'mother',fullName:'陈宁',surnameLength:1,givenName:'宁',readings:[{index:0,char:'宁',confirmed:true,token:'ning2',origin:'family-confirmed'}]},
    ]};
}
function freezePlain<T>(value:T):T{if(value&&typeof value==='object'){for(const child of Object.values(value))freezePlain(child);Object.freeze(value);}return value;}
const preview=(input:BirthProfile)=>service.previewQiongtongClauseReferences(input) as Promise<ExtendedPreview>;
function normalized(source:FixedSource):SourceRecord{const {fileHashes:_hashes,...record}=source;return record;}
function pair(result:ExtendedPreview):{chapter:JiaLiteralReferenceV11;verification:JiaVerification}{
  expect(result.jiaChapter).toBeDefined();expect(result.jiaSourceVerification).toBeDefined();
  if(!result.jiaChapter||!result.jiaSourceVerification)throw Error('Successful M607 reply must contain the verified pair');
  return{chapter:result.jiaChapter,verification:result.jiaSourceVerification};
}

beforeAll(()=>{
  const local=join(projectRoot,'.local');mkdirSync(local,{recursive:true});
  if(realpathSync(local).toLowerCase()!==local.toLowerCase())throw Error('Fixture parent redirects outside this work');
  fixtureParent=join(local,'m607-jia-preview-tests');mkdirSync(fixtureParent,{recursive:true});
  fixtureRoot=mkdtempSync(join(fixtureParent,'case-'));dataDirectory=join(fixtureRoot,'data');
  monthly=json<SourceLock>(sourcePath(MONTHLY_LOCK));bazi=json<SourceLock>(sourcePath(BAZI_LOCK));
  manifest=json<ManagedManifest>(sourcePath(MANIFEST));
  expect(manifest.schema).toBe('qiongtong-jia-managed-inputs/1.0.0');
  expect(manifest.inputs.map(row=>row.file)).toEqual([...JIA_INPUT_NAMES]);
  const files=new Set([MONTHLY_LOCK,BAZI_LOCK,RAW,CONDITIONS,MANIFEST,...JIA_INPUT_NAMES.map(name=>JIA_ROOT+name)]);
  for(const lock of [monthly,bazi])for(const source of lock.sources)for(const file of source.files)files.add(file);
  for(const relative of files){
    const original=sourcePath(relative),target=ownedPath(relative);projectHashes.set(relative,digest(readFileSync(original)));
    mkdirSync(dirname(target),{recursive:true});copyFileSync(original,target);
  }
  for(const row of manifest.inputs){const value=readFileSync(ownedPath(JIA_ROOT+row.file));expect(value.length).toBe(row.bytes);expect(digest(value)).toBe(row.sha256);}
  oldCatalog=json<OldCatalog>(ownedPath(CONDITIONS));jiaCatalog=json<JiaCatalog>(ownedPath(JIA_ROOT+'catalog.json'));
  const raw=readFileSync(ownedPath(RAW));expect(digest(raw)).toBe(RAW_SHA);rawPoints=Array.from(raw.toString('utf8'));
});
beforeEach(()=>{forbiddenReads=0;});
afterEach(()=>{expect(forbiddenReads).toBe(0);});
afterAll(()=>{
  try{for(const [relative,sha]of projectHashes)expect(digest(readFileSync(sourcePath(relative)))).toBe(sha);}
  finally{if(fixtureRoot){const actual=realpathSync(fixtureRoot),parent=realpathSync(fixtureParent);if(dirname(actual)!==parent||!basename(actual).startsWith('case-'))throw Error('Unsafe fixture cleanup');rmSync(actual,{recursive:true,force:false});}}
});

function assertEnvelope(result:ExtendedPreview,input:BirthProfile):JiaLiteralReferenceV11 {
  const baseline=analyzeFreshQiongtongClauseReferences(input);
  expect(Object.keys(result).sort()).toEqual(['schema','profileId','analysis','reference','sourceVerification','jiaChapter','jiaSourceVerification'].sort());
  expect(result.schema).toBe('qiongtong-clause-reference-preview/1.0.0');expect(result.profileId).toBe(input.id);
  expect(result.analysis).toEqual(baseline.analysis);expect(result.reference).toEqual(baseline.reference);
  expect(result.reference.schema).toBe('qiongtong-literal-conditions/1.0.1');expect(result.reference.rules).toHaveLength(3);
  const lunar=bazi.sources.find(source=>source.id==='bazi-evidence-lunar186');if(!lunar)throw Error('Actual fixed lunar source missing');
  expect(result.sourceVerification).toEqual({
    status:'verified-fixed-resources',school:'qiongtong-wikisource-2294674',revision:'wikisource-revision/2294674',
    label:'《穷通宝鉴》固定电子修订2294674 · 三条字面条件参考',scanCollation:false,
    sources:[...monthly.sources.map(normalized),normalized(lunar)],
    conditions:{file:CONDITIONS,schema:oldCatalog.version,sha256:projectHashes.get(CONDITIONS)},
    rules:oldCatalog.rules.map(row=>({ruleId:row.id,existingConditionId:row.existingConditionId,entryId:row.entry,
      source:{id:'bazi-monthly-qiongtong-2294674',revision:'wikisource-revision/2294674',rawSha256:RAW_SHA,
        quote:row.quote,locator:row.locator,quoteSpan:row.quoteSpan,contextQuote:row.contextQuote,contextSpan:row.contextSpan,scanCollation:false}})),
  });
  const {chapter,verification}=pair(result);
  const positions=['年柱','月柱','日柱','时柱'];
  const declared={pillars:baseline.analysis.bazi.pillars.map(row=>({position:row.label,gan:row.gan,zhi:row.zhi})),
    unknownPositions:positions.filter(position=>!baseline.analysis.bazi.pillars.some(row=>row.label===position))} as SafeChartInput140;
  expect(chapter).toEqual(evaluateQiongtongJiaConditionsV11(declared));
  expect(chapter.schema).toBe('qiongtong-jia-literal-conditions/1.1.0');expect(chapter.namingImpact).toBe('none');
  expect(chapter.checks.map(row=>row.id)).toEqual(RULE_IDS);
  for(const check of chapter.checks){expect(check.decisionLevel).toBe('selected-literal-subclause-only');expect(check.wholeSourceBranchDecision).toBe('not-evaluated');expect(check.actionEvaluation).toBe('not-evaluated');expect(check.usefulGodDecision).toBe('not-evaluated');}
  const catalogRow=manifest.inputs.find(row=>row.file==='catalog.json')!;
  expect(verification).toEqual({
    schema:'qiongtong-jia-source-verification/1.0.0',status:'verified-fixed-resources',sourceId:'bazi-monthly-qiongtong-2294674',
    revision:'wikisource-revision/2294674',rawSha256:RAW_SHA,scanCollation:false,monthlySources:monthly.sources.map(normalized),
    catalog:{file:JIA_ROOT+'catalog.json',version:'qiongtong-jia-literal-conditions/1.1.0',sha256:catalogRow.sha256,bytes:catalogRow.bytes},
    managedInputs:[{file:JIA_ROOT+'manifest.json',sha256:digest(readFileSync(ownedPath(MANIFEST))),bytes:readFileSync(ownedPath(MANIFEST)).length},...manifest.inputs.map(row=>({file:JIA_ROOT+row.file,sha256:row.sha256,bytes:row.bytes}))],
    chapter:{span:manifest.chapterSpan,sha256:manifest.chapterSha256},
    rules:jiaCatalog.executable.map(row=>({id:row.id,quote:row.source.quote,locator:row.source.locator,
      quoteSpan:row.source.quoteSpan,contextSpan:row.source.contextSpan,contextSha256:row.source.contextSha256})),
  });
  expect(digest(rawPoints.slice(verification.chapter.span.start,verification.chapter.span.end).join(''))).toBe(verification.chapter.sha256);
  for(const row of verification.rules){expect(rawPoints.slice(row.quoteSpan.start,row.quoteSpan.end).join('')).toBe(row.quote);expect(digest(rawPoints.slice(row.contextSpan.start,row.contextSpan.end).join(''))).toBe(row.contextSha256);expect(Object.hasOwn(row,'contextQuote')).toBe(false);}
  return chapter;
}

const recorded=[
  {id:RULE_IDS[0],positive:{date:'2024-02-10',time:'04:00:00',pillars:['甲辰','丙寅','甲辰','丙寅']},negative:{date:'2023-02-05',time:'04:00:00',pillars:['癸卯','甲寅','甲午','丙寅']},unknownDate:'2023-02-05'},
  {id:RULE_IDS[1],positive:{date:'2021-04-06',time:'12:00:00',pillars:['辛丑','壬辰','甲申','庚午']},negative:{date:'2021-04-06',time:'00:00:00',pillars:['辛丑','壬辰','甲申','甲子']},unknownDate:'2021-04-06'},
  {id:RULE_IDS[2],positive:{date:'2003-05-11',time:'12:00:00',pillars:['癸未','丁巳','甲申','庚午']},negative:{date:'2003-05-11',time:'00:00:00',pillars:['癸未','丁巳','甲申','甲子']},unknownDate:'2003-05-11'},
  {id:RULE_IDS[3],positive:{date:'2020-09-08',time:'04:00:00',pillars:['庚子','乙酉','甲寅','丙寅']},negative:{date:'2020-09-08',time:'00:00:00',pillars:['庚子','乙酉','甲寅','甲子']},unknownDate:'2020-09-08'},
];
const apiCases=recorded.flatMap(row=>[
  {id:row.id,...row.positive,status:'condition-met'},
  {id:row.id,...row.negative,status:'condition-not-met'},
  {id:row.id,date:row.unknownDate,time:'',pillars:row.negative.pillars.slice(0,3),status:'unknown'},
]);
const faultFiles=[MANIFEST,...JIA_INPUT_NAMES.map(name=>JIA_ROOT+name),RAW];

describe('M607 constructor-free Service verified Jia extension',()=>{
  it.each(apiCases)('$id $date $time returns $status without replacing old references or mutating parents',async row=>{
    const input=profile(row.date,row.time),before=structuredClone(input),pending=preview(freezePlain(input));
    expect(typeof pending.then).toBe('function');const result=await pending,chapter=assertEnvelope(result,before);
    expect(result.analysis.bazi.pillars.map(pillar=>pillar.gan+pillar.zhi)).toEqual(row.pillars);
    expect(chapter.checks.find(check=>check.id===row.id)?.status).toBe(row.status);
    expect(input).toEqual(before);expect(input.parentNameReadings).toEqual(before.parentNameReadings);
  });
  it('keeps a sufficient known partial chart positive and reports non-甲 or unselected-month exclusions',async()=>{
    const partial=profile('2024-02-10',''),partialBefore=structuredClone(partial);
    const partialResult=await preview(partial),partialChapter=assertEnvelope(partialResult,partialBefore);
    expect(partialChapter.input.complete).toBe(false);expect(partialChapter.checks[0].status).toBe('condition-met');expect(partial).toEqual(partialBefore);
    for(const [date,time,kind]of [['2024-02-11','04:00:00','non-jia'],['2000-11-12','08:00:00','unselected-month']] as const){
      const input=profile(date,time),before=structuredClone(input),result=await preview(input),chapter=assertEnvelope(result,before);
      if(kind==='non-jia')expect(chapter.input.dayStem).not.toBe('甲');else{expect(chapter.input.dayStem).toBe('甲');expect(chapter.input.monthBranch).toBe('亥');}
      expect(chapter.checks.every(check=>check.status==='not-applicable')).toBe(true);expect(input).toEqual(before);
    }
  });
  it('isolates mutable verification receipts and frozen Jia mutation attempts from the next request',async()=>{
    const input=profile('2024-02-10','04:00:00'),beforeInput=structuredClone(input),first=await preview(input),expected=structuredClone(first);
    const {chapter,verification}=pair(first);
    first.sourceVerification.conditions.sha256='0'.repeat(64);verification.catalog.sha256='1'.repeat(64);
    expect(first.sourceVerification.conditions.sha256).toBe('0'.repeat(64));expect(verification.catalog.sha256).toBe('1'.repeat(64));
    expect(Object.isFrozen(chapter)).toBe(true);expect(Object.isFrozen(chapter.checks)).toBe(true);
    expect(Reflect.set(chapter.checks[0].source,'quote','injected')).toBe(false);
    expect(Reflect.set(chapter.coverage.months[0],'newExecutablePredicates',99)).toBe(false);
    expect(()=>((chapter.checks as unknown as unknown[]).push('injected'))).toThrow();
    const second=await preview(input);expect(second).toEqual(expected);expect(second).not.toBe(first);assertEnvelope(second,beforeInput);
    expect(input).toEqual(beforeInput);
  });
  for(const fault of ['one-byte-change','missing'] as const)it.each(faultFiles)(`rejects ${fault} %s after a real warm success and recovers after exact restoration`,async relative=>{
    const input=profile('2024-02-10','04:00:00'),beforeInput=structuredClone(input),before=await preview(input);
    expect(pair(before).verification.status).toBe('verified-fixed-resources');
    const target=ownedPath(relative),original=readFileSync(target);if(!original.length)throw Error('Fixed fault target must be nonempty');
    try{
      if(fault==='missing')unlinkSync(target);else{const changed=Buffer.from(original);changed[changed.length-1]^=1;writeFileSync(target,changed);}
      await expect(preview(input)).rejects.toThrow();
    }finally{writeFileSync(target,original);}
    expect(digest(readFileSync(target))).toBe(digest(original));expect(input).toEqual(beforeInput);
    expect(await preview(input)).toEqual(before);
  });
});
