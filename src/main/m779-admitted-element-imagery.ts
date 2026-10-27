import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {types} from 'node:util';
import {loadM754ElementImagery,listM754ImageryCandidates,projectM754GenerationCharacters} from './m754-element-imagery';
import {generateM754ProjectedLocalPreview} from '../domain/m754-element-imagery-generation';
import {canonicalPlainJson} from '../shared/plain-json';
import {M754_IMAGERY_LOCK,M754_IMAGERY_PROFILE,M754_BASELINE_SHA} from '../shared/m754-element-imagery-pins';
import {NAMING_RULE_V71_VERSION} from '../shared/naming-rules';
import type {CharacterEntry,SourceRecord} from '../shared/types';
import type {M754ObjectTheme} from '../shared/m754-element-imagery';
import type {M779PublicationIdentity,M779ModuleCoverage,M779NameBinding,M779NameProvenance,M779PositionProvenance,M779AdmittedProjection} from '../shared/m779-admitted-element-imagery';

// Fixed registration in trusted main code. No caller or environment review/publication override exists.
const PUBLICATION_PATH='assets/project-element-imagery/1.0.0';
const MANIFEST_SHA='79fc7b9c1ffb4098c960cbd65ff0a9b92c69a41d680ed581380457c1180209f9';
const REVIEW_PATH='data/element-imagery-m770/independent-review.json';
const REVIEW_SHA='89ad0ade1a15adb0f801649b650888f376d84f51c469de4f1455bf42a4280509';
const AUDIT_PATH='data/element-imagery-m770/m777-admission-decision.json';
const AUDIT_SHA='abbdac6c87e14c033de43e40acada9ac2ddcf4ae90761066b6f036cb4e57c64e';
const GENERAL=['枫','卉','麓','菘','珉'],THEMED=['川','石','枝','棉','蕤'];
const fail=(code:string):never=>{throw Error('M779 '+code);};
const hash=(bytes:crypto.BinaryLike)=>crypto.createHash('sha256').update(bytes).digest('hex');
const freeze=<T>(value:T):T=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const digest=(value:unknown)=>hash(canonicalPlainJson(value));
const parse=(bytes:Buffer)=>JSON.parse(bytes.toString('utf8'));
type ObjectThemes=Readonly<Partial<Record<string,M754ObjectTheme>>>;
type GenerationArgs=Parameters<typeof generateM754ProjectedLocalPreview> extends [unknown,...infer Rest]?Rest:never;

/** Own every accepted byte of data before later validation/use. Never call input array methods, getters, iterators or toJSON. */
function ownedJson<T>(value:T,code:string):T {
 const ancestors=new WeakSet<object>();let nodes=0,stringUnits=0;
 const copy=(input:unknown,depth:number):unknown=>{
  if(++nodes>500000||depth>64||types.isProxy(input))return fail(code);
  if(typeof input==='string'){stringUnits+=input.length;if(stringUnits>16*1024*1024)return fail(code);return input;}
  if(input===null||typeof input==='boolean'||typeof input==='number'&&Number.isFinite(input))return input;
  if(!input||typeof input!=='object'||ancestors.has(input))return fail(code);
  const array=Array.isArray(input),prototype=Object.getPrototypeOf(input);
  if(array?prototype!==Array.prototype:prototype!==Object.prototype&&prototype!==null)return fail(code);
  const keys=Reflect.ownKeys(input);if(keys.length>100001)return fail(code);
  ancestors.add(input);
  try{
   if(array){
    const lengthDescriptor=Object.getOwnPropertyDescriptor(input,'length');
    if(!lengthDescriptor||!Object.hasOwn(lengthDescriptor,'value')||!Number.isSafeInteger(lengthDescriptor.value)||lengthDescriptor.value<0||lengthDescriptor.value>100000||keys.length!==lengthDescriptor.value+1)return fail(code);
    const length=lengthDescriptor.value as number,result:unknown[]=[];
    for(let index=0;index<length;index++){
     const descriptor=Object.getOwnPropertyDescriptor(input,String(index));
     if(!descriptor||!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))return fail(code);
     Object.defineProperty(result,String(index),{value:copy(descriptor.value,depth+1),enumerable:true,configurable:true,writable:true});
    }
    return Object.freeze(result);
   }
   const result:Record<string,unknown>={};
   for(const key of keys){
    if(typeof key!=='string')return fail(code);
    stringUnits+=key.length;if(stringUnits>16*1024*1024)return fail(code);
    const descriptor=Object.getOwnPropertyDescriptor(input,key);
    if(!descriptor||!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))return fail(code);
    Object.defineProperty(result,key,{value:copy(descriptor.value,depth+1),enumerable:true,configurable:true,writable:true});
   }
   return Object.freeze(result);
  }finally{ancestors.delete(input);}
 };
 return copy(value,0) as T;
}
function ownedCharacters(value:readonly CharacterEntry[]):readonly CharacterEntry[] {
 if(types.isProxy(value)||!Array.isArray(value))return fail('invalid-character-data');
 const length=Object.getOwnPropertyDescriptor(value,'length');
 if(!length||!Object.hasOwn(length,'value')||length.value>779)return fail('invalid-character-data');
 return ownedJson(value,'invalid-character-data');
}
function checkedBinding(value:M779NameBinding):M779NameBinding {
 const checked=ownedJson(value,'invalid-provenance-data');
 if(!checked||typeof checked!=='object'||Array.isArray(checked)||Object.keys(checked).sort().join('|')!=='candidateId|givenName'||typeof checked.candidateId!=='string'||!checked.candidateId.trim()||typeof checked.givenName!=='string'||![1,2].includes(Array.from(checked.givenName).length))return fail('invalid-name-binding');
 return checked;
}

/** Only this fixed published review can issue the returned module. The generic M754 resource handle stays private. */
export function createM779AdmittedElementImagery(applicationResourcesRoot:string){
 if(arguments.length!==1||typeof applicationResourcesRoot!=='string')return fail('invalid-factory-configuration');
 const applicationRoot=fs.realpathSync(applicationResourcesRoot),publicationRoot=fs.realpathSync(path.join(applicationRoot,PUBLICATION_PATH));
 if(!publicationRoot.startsWith(applicationRoot+path.sep))return fail('publication-path-escape');
 const buffers=new Map<string,Buffer>();
 const read=(relative:string):Buffer=>{
  if(path.isAbsolute(relative)||relative.split(/[\\/]/).includes('..'))return fail('invalid-publication-path');
  if(!buffers.has(relative)){const file=fs.realpathSync(path.join(publicationRoot,relative));if(!file.startsWith(publicationRoot+path.sep))return fail('publication-file-escape');buffers.set(relative,fs.readFileSync(file));}
  return buffers.get(relative)!;
 };
 const manifestBytes=read('manifest.json');if(hash(manifestBytes)!==MANIFEST_SHA)return fail('publication-manifest-mismatch');
 const manifest=parse(manifestBytes) as {schemaVersion:string;publicationId:string;files:{path:string;bytes:number;sha256:string}[]};
 if(manifest.schemaVersion!=='m779-admitted-element-imagery-manifest/1.0.0'||manifest.publicationId!=='project-element-imagery/1.0.0'||new Set(manifest.files.map(row=>row.path)).size!==21)return fail('publication-identity-mismatch');
 for(const file of manifest.files){const bytes=read(file.path);if(bytes.length!==file.bytes||hash(bytes)!==file.sha256)return fail('publication-file-mismatch:'+file.path);}
 if(hash(read(REVIEW_PATH))!==REVIEW_SHA||hash(read(AUDIT_PATH))!==AUDIT_SHA)return fail('fixed-admission-evidence-mismatch');
 const audit=parse(read(AUDIT_PATH));
 if(audit.decision!=='approve-exact-M770-review-for-trusted-main-mapping-pin'||audit.reviewedInput.sha256!==REVIEW_SHA||audit.reviewedInput.packageLockSha256!==M754_IMAGERY_LOCK||audit.summary.approved!==10||audit.summary.general!==5||audit.summary.explicitTheme!==5||audit.summary.blockingSemanticIssues!==0)return fail('semantic-admission-mismatch');
 const resources=loadM754ElementImagery(publicationRoot,{relativePath:REVIEW_PATH,expectedSha256:REVIEW_SHA});
 if(resources.approvedCount!==10||resources.reviewId!=='M770-object-element-review/1.0.0')return fail('fixed-review-not-approved');
 const entries=listM754ImageryCandidates(resources),byChar=new Map(entries.map(row=>[row.candidate.char,row]));
 if(entries.filter(row=>row.candidate.autoAdoption.scope==='default-reading-direct-object').map(row=>row.candidate.char).join('')!==GENERAL.join('')||entries.filter(row=>row.candidate.autoAdoption.scope==='explicit-naming-theme').map(row=>row.candidate.char).join('')!==THEMED.join(''))return fail('admitted-scope-mismatch');
 const datasetBytes=read('data/dataset-v6.json');if(hash(datasetBytes)!==M754_BASELINE_SHA)return fail('baseline-mismatch');
 const baseline=freeze((parse(datasetBytes) as {characters:CharacterEntry[]}).characters);
 const identity:M779PublicationIdentity=freeze({publicationId:'project-element-imagery/1.0.0',manifestSha256:MANIFEST_SHA,authority:'project-convention',mappingProfileId:M754_IMAGERY_PROFILE,mappingPackageLockSha256:M754_IMAGERY_LOCK,reviewId:'M770-object-element-review/1.0.0',reviewSha256:REVIEW_SHA,reviewerId:'M770-DECISION',semanticAuditId:'M777-element-admission-audit/1.0.0',semanticAuditSha256:AUDIT_SHA});
 const coverage:M779ModuleCoverage=freeze({baseline:{total:779,tagged:257,untagged:522},admitted:{general:5,explicitTheme:5,generalCharacters:[...GENERAL],themeCharacters:[...THEMED]},activation:'explicit-trusted-factory',productionServiceConnected:false,productionStoreConnected:false});
 const sourceRecords:readonly SourceRecord[]=freeze([
  {id:'m770-admitted-project-element-imagery-1',name:'已准入辞书直接物象项目约定',url:'',commit:M754_IMAGERY_PROFILE,license:'CC0-1.0 project mapping/editorial; MOE text CC-BY-ND-3.0-TW; Unicode-3.0',files:[PUBLICATION_PATH+'/manifest.json',PUBLICATION_PATH+'/NOTICE.md'],sha256:MANIFEST_SHA,note:'受信固定 publication；通用5、精确主题5。投影元素参与现有筛选与传统分，不证明传统唯一归属或吉凶。'},
  {id:'m770-independent-object-element-review',name:'M770 精确物象准入审查',url:'',commit:identity.reviewId,license:'Internal project review evidence; no new license grant asserted',files:[PUBLICATION_PATH+'/'+REVIEW_PATH],sha256:REVIEW_SHA,note:'封存已审同一原始字节；5条固定默认对象、5条显式主题；作者与审查人分离。'},
  {id:'m777-object-element-admission-audit',name:'M777 独立逐条物象准入复核',url:'',commit:identity.semanticAuditId,license:'Internal project audit evidence; no new license grant asserted',files:[PUBLICATION_PATH+'/'+AUDIT_PATH,PUBLICATION_PATH+'/data/element-imagery-m770/m777-report.md'],sha256:AUDIT_SHA,note:'十条项目映射批准；不授予命名义、整名语义、保存链或产品发布许可。'}
 ]);
 const projectOwned=(characters:readonly CharacterEntry[],themes:ObjectThemes):M779AdmittedProjection=>{
  const projection=projectM754GenerationCharacters(resources,characters,themes);
  const decisions=projection.decisions.map(row=>{
   if(row.status!=='eligible'&&row.status!=='theme-required'||!row.adoptionScope)return fail('unexpected-admitted-decision');
   return {char:row.char,pinyin:row.pinyin,status:row.status,effectiveElements:[...row.effectiveElements],scope:row.adoptionScope,requiredTheme:row.requiredTheme,requestedTheme:row.status==='eligible'?row.requiredTheme:null};
  });
  return {characters:projection.characters,decisions,publication:identity,coverage,sourceRecords};
 };
 const project=(characters:readonly CharacterEntry[],themes:ObjectThemes={}):M779AdmittedProjection=>projectOwned(ownedCharacters(characters),ownedJson(themes,'invalid-object-theme'));
 const snapshot=(checked:M779NameBinding,originals:readonly CharacterEntry[],projection:M779AdmittedProjection):M779NameProvenance=>{
  const originalByChar=new Map(originals.map(row=>[row.char,row])),projectedByChar=new Map(projection.characters.map(row=>[row.char,row]));
  const rows:M779PositionProvenance[]=Array.from(checked.givenName).map((char,index)=>{
   const original=originalByChar.get(char),projected=projectedByChar.get(char);if(!original||!projected)return fail('name-outside-projected-pool');
   const admitted=byChar.get(char),decision=projection.decisions.find(row=>row.char===char);
   let mapping:M779PositionProvenance['mapping']=null;
   if(admitted){
    if(!decision)return fail('missing-admitted-decision');
    const {candidate,dictionaryFact:fact}=admitted;
    mapping={authority:'project-convention',profileId:M754_IMAGERY_PROFILE,candidateSha256:candidate.candidateSha256,factId:fact.factId,dictionaryWord:fact.dictionaryWord,sourceRecordId:fact.sourceRecordId,senseRecordId:fact.senseRecordId,sourceEntrySha256:fact.sourceEntrySha256,sourceReadingSha256:fact.sourceReadingSha256,sourceDefinitionSha256:fact.sourceDefinitionSha256,mappingRuleId:candidate.projectMapping.ruleId,objectClass:candidate.projectMapping.objectClass,element:candidate.projectMapping.element,scope:decision.scope,requiredTheme:decision.requiredTheme,requestedTheme:decision.requestedTheme,condition:candidate.autoAdoption.condition,status:decision.status};
   }
   return {position:index+1,char,pinyin:original.pinyin,baselineCharacterSha256:digest(original),projectedCharacterSha256:digest(projected),baselineElements:[...original.elements],effectiveElements:[...projected.elements],mapping};
  });
  return freeze({schemaVersion:'m779-admitted-element-imagery-provenance/1.0.0',publication:identity,binding:checked,namingRulesVersion:NAMING_RULE_V71_VERSION,scoreEffect:'projected-elements-enter-existing-shortlist-and-traditional-score',rows});
 };
 return Object.freeze({
  identity,coverage,sourceRecords,
  baselineCharacters:():CharacterEntry[]=>structuredClone(baseline),
  project,
  captureNameProvenance(binding:M779NameBinding,characters:readonly CharacterEntry[],themes:ObjectThemes={}):M779NameProvenance{
   const originals=ownedCharacters(characters),checked=checkedBinding(binding),selected=ownedJson(themes,'invalid-object-theme');
   return snapshot(checked,originals,projectOwned(originals,selected));
  },
  /** Expected binding/themes must come from the main process's actual saved plan preferences, never from the supplied snapshot. */
  verifyNameProvenance(value:unknown,expectedBinding:M779NameBinding,characters:readonly CharacterEntry[],expectedThemes:ObjectThemes={}):M779NameProvenance{
   const originals=ownedCharacters(characters),checked=checkedBinding(expectedBinding),selected=ownedJson(expectedThemes,'invalid-object-theme'),saved=ownedJson(value,'invalid-provenance-data');
   const actual=canonicalPlainJson(saved),expected=snapshot(checked,originals,projectOwned(originals,selected));
   if(actual!==canonicalPlainJson(expected))return fail('provenance-replay-mismatch');return expected;
  },
  generateLocal(characters:readonly CharacterEntry[],themes:ObjectThemes,...args:GenerationArgs){
   const originals=ownedCharacters(characters),selected=ownedJson(themes,'invalid-object-theme');
   if(args[0]!==NAMING_RULE_V71_VERSION)return fail('unsupported-naming-rule');
   const projection=projectOwned(originals,selected),result=generateM754ProjectedLocalPreview(projection,...args);
   return {...result,publication:identity,coverage,sourceRecords,provenance:result.candidates.map(candidate=>snapshot(checkedBinding({candidateId:candidate.id,givenName:candidate.givenName}),originals,projection)),persistence:'not-written' as const};
  }
 });
}
export type M779AdmittedElementImagery=ReturnType<typeof createM779AdmittedElementImagery>;
