import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {Store} from './store';
import {parseSnapshotJsonStrict} from './snapshot-json-spans';
import {readCulturalStoredProfile} from './qimen-cultural-provider-profile-v1';
import {loadCulturalProviderSources} from './qimen-cultural-provider-sources-v1';
import {analyzeProfile} from '../domain/engine';
import {compareQimenCultural} from '../domain/qimen-cultural-comparison';
import {culturalCanonicalDigest,culturalCanonicalJson,culturalChartDigest,ownCulturalJson} from '../domain/qimen-cultural-comparison-canonical';
import {CULTURAL_ELEMENT_PALACES,CULTURAL_JSON_LIMITS,CULTURAL_OUTER_PALACES} from '../shared/qimen-cultural-comparison-rules';
import {CULTURAL_PROVIDER_VERSION} from '../shared/qimen-cultural-provider-v1';
import {QIMEN_CULTURAL_PUBLICATION,QIMEN_CULTURAL_VERSION,LEGACY_CHART_DIGEST_ALGORITHM} from '../shared/qimen-cultural-comparison';
import type {Analysis,BirthProfile,CharacterEntry,NamingSession,QimenChart,QimenMarkerRule,SourceRecord} from '../shared/types';
import type {CulturalBirthAnchorView,CulturalEvidenceRef,CulturalObservationCoverage,CulturalPalaceView,CulturalRuleBasisDifference,CulturalSourceState,CulturalWholeChartObservation,PreparedCulturalCandidate,PreparedCulturalCharacter,PreparedCulturalComparisonInput} from '../shared/qimen-cultural-comparison';
import type {CulturalAnchorRequest,CulturalProviderAPI,CulturalProviderAnchor,CulturalProviderBlobReference,CulturalProviderCandidateRequest,CulturalProviderEvidenceOption,CulturalProviderFailureReason,CulturalProviderJsonMaterial,CulturalProviderMaterial,CulturalProviderOptions,CulturalProviderPreview,CulturalProviderPreviewRequest,CulturalProviderReply} from '../shared/qimen-cultural-provider-v1';

type Sources=ReturnType<typeof loadCulturalProviderSources>;
type SourceMetadata=Omit<Sources,'blobs'>;
const storePrototype=Store.prototype,storeDescriptors=Object.getOwnPropertyDescriptors(storePrototype);
const storeMethods={init:storeDescriptors.init.value as Store['init'],read:storeDescriptors.readVerifiedSession.value as Store['readVerifiedSession'],rows:storeDescriptors.rows.value as Store['rows'],pack:storeDescriptors.readPack.value as Store['readPack']};
const sha=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
const same=(a:unknown,b:unknown)=>culturalCanonicalJson(a)===culturalCanonicalJson(b);
const text=(v:unknown,max=1000):v is string=>typeof v==='string'&&v.length>0&&v.length<=max;
const exact=(value:object,keys:readonly string[])=>same(Object.keys(value).sort(),[...keys].sort());
const opaque=()=>randomBytes(32).toString('hex');
const copy=<T>(value:T):T=>ownCulturalJson<T>(value);
class Failure extends Error{constructor(readonly reason:CulturalProviderFailureReason,message:string){super(message);}}
const fail=(reason:CulturalProviderFailureReason,message:string):never=>{throw new Failure(reason,message);};
const invalid=():never=>fail('invalid-input','只接受已保存资料引用、同方案候选编号或1–2字给名及本次签发的证据编号。');
const rejected=():never=>fail('rejected-integrity','记录、归属、字位或固定来源绑定未通过核验。');
const sourceFailure=():never=>fail('source-unavailable','固定来源不可用或内容不一致，未把来源错误当成正常未知标签。');
const json=(id:string,schemaId:string,value:unknown,raw?:string):CulturalProviderJsonMaterial=>{const exactUtf8Json=raw??JSON.stringify(value);parseSnapshotJsonStrict(exactUtf8Json);return{id,schemaId,codecVersion:'exact-utf8-json/1',sha256:sha(exactUtf8Json),exactUtf8Json};};
function fixedStoreIdentity():void{
 const prototype=Object.getOwnPropertyDescriptor(Store,'prototype');if(!prototype||!Object.hasOwn(prototype,'value')||prototype.value!==storePrototype)rejected();
 for(const [key,method] of [['init',storeMethods.init],['readVerifiedSession',storeMethods.read],['rows',storeMethods.rows],['readPack',storeMethods.pack]] as const){const d=Object.getOwnPropertyDescriptor(storePrototype,key);if(!d||!Object.hasOwn(d,'value')||typeof method!=='function'||d.value!==method)rejected();}
}
function denyProviderWrite():never{return fail('stale-source','准备读取期间原客户库不可用，已拒绝新建或覆盖客户库。');}
function reference(source:SourceRecord,authority:CulturalEvidenceRef['authority'],locator:string):CulturalEvidenceRef{return{id:source.id,version:source.commit,sha256:source.sha256,locator,authority,license:source.license,note:source.note};}
interface CandidateState {view:CulturalProviderOptions;kind:'saved'|'draft';original:unknown;rows:readonly {base:PreparedCulturalCharacter;options:readonly {public:CulturalProviderEvidenceOption;row:PreparedCulturalCharacter}[]}[];}
interface AnchorState {view:CulturalBirthAnchorView;handle:string;databaseSha:string;profile:BirthProfile;analysis:Analysis;session:NamingSession|null;sources:SourceMetadata;material:CulturalProviderMaterial;candidates:Map<string,CandidateState>;}
interface PreviewState {anchor:AnchorState;material:CulturalProviderMaterial;digest:string;snapshotDigest:string;}

/** Trusted composition-root factory, never an IPC constructor. It owns a fresh
 * real Store reader for each anchor; callers cannot inject Store, SQL, sources,
 * charts, elements or a trust callback. Existing customer bytes are never written.
 */
export function createQimenCulturalProvider(configuration:{userDir:string;dataDir:string}):CulturalProviderAPI{
 const config=copy(configuration);
 if(!config||!exact(config,['userDir','dataDir'])||!text(config.userDir,4096)||!text(config.dataDir,4096)||!path.isAbsolute(config.userDir)||!path.isAbsolute(config.dataDir))invalid();
 const userDir=fs.realpathSync(config.userDir),dataDir=fs.realpathSync(config.dataDir),databasePath=path.join(userDir,'customers.sqlite');
 const wasmPath=createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm');
 const anchors=new Map<string,AnchorState>(),previews=new Map<string,PreviewState>(),blobs=new Map<string,Buffer>(),sourceMetadata=new Map<string,SourceMetadata>();
 let closed=false,blobBytes=0;
 const ensureOpen=()=>{if(closed)fail('closed','文化比较读取实例已关闭，请重新准备出生资料。');};
 const failure=(error:unknown):CulturalProviderReply<never>=>error instanceof Failure?{kind:'unavailable',reason:error.reason,sourceState:error.reason==='source-unavailable'?'source-error':null,message:error.message}:{kind:'unavailable',reason:'rejected-integrity',sourceState:null,message:'读取或输入核验未完成，未签发比较依据。'};
 const operation=<T>(body:()=>T):CulturalProviderReply<T>=>{try{ensureOpen();return{kind:'ok',value:body()};}catch(error){return failure(error);}};
 const diskSha=()=>{try{const real=fs.realpathSync(databasePath);if(path.dirname(real)!==userDir||!fs.statSync(real).isFile())rejected();return sha(fs.readFileSync(real));}catch(error){if(error instanceof Failure)throw error;return fail('not-found','未找到已有客户数据库，请先保存档案。');}};
 const freshSources=():Sources=>{try{return loadCulturalProviderSources(dataDir);}catch{return sourceFailure();}};
 function retain(bytes:Uint8Array):string{const digest=sha(bytes);if(!blobs.has(digest)){if(blobBytes+bytes.byteLength>128*1024*1024)fail('capacity','本次进程保留材料已达上限，请关闭实例后重新准备。');blobs.set(digest,Buffer.from(bytes));blobBytes+=bytes.byteLength;}return digest;}
 function fresh(anchor:AnchorState):void{ensureOpen();if(diskSha()!==anchor.databaseSha)fail('stale-source','客户资料或原方案已变化，请重新准备出生资料。');if(freshSources().revision!==anchor.sources.revision)fail('stale-source','固定来源版本已变化，请重新准备出生资料。');}
 function get(handle:string):AnchorState{if(!text(handle,128))invalid();const anchor=anchors.get(handle);if(!anchor)fail('rejected-integrity','出生资料凭据无效，公开摘要不能替代服务端材料。');fresh(anchor!);return anchor!;}
 function refsForRule(anchor:AnchorState,rule:QimenMarkerRule):CulturalEvidenceRef[]{return rule.sources.map(s=>{const row=anchor.sources.sourceReferences.find(r=>r.authority==='saved-chart-rule'&&r.id===s.id&&r.version===s.commit);if(!row)sourceFailure();return{...row!,locator:s.locator};});}
 function chartViews(anchor:AnchorState):{palaceViews:CulturalPalaceView[];whole:CulturalWholeChartObservation[];coverage:CulturalObservationCoverage[];differences:CulturalRuleBasisDifference[]}{
  const q=anchor.analysis.qimen;
  const coverage:CulturalObservationCoverage[]=(['auxiliary','patterns','stem-tombs'] as const).map(module=>{const value=module==='auxiliary'?q.auxiliary:module==='patterns'?q.patterns:q.stemTombs;return{module,status:!q.available?'not-assessed':value?'recorded':'not-recorded',version:q.available&&value?value.version:null,reason:!q.available?'没有唯一出生盘，未补盘。':value?null:'原保存盘未登记该模块，未重新计算。'};});
  if(!q.available)return{palaceViews:[],whole:[],coverage,differences:[]};
  const needRule=(rules:QimenMarkerRule[],id:string)=>{const rule=rules.find(r=>r.id===id);if(!rule)sourceFailure();return rule!;};
  const palaceViews:CulturalPalaceView[]=CULTURAL_OUTER_PALACES.map(palace=>{
   const raw=q.palaces.find(p=>p.number===palace);if(!raw)rejected();const observations:CulturalPalaceView['observations'][number][]=[];
   for(const m of q.auxiliary?.markers??[])if(m.palaces.includes(palace)){const rule=needRule(q.auxiliary!.rules,m.ruleId);observations.push({palace,ruleId:m.ruleId,ruleVersion:m.ruleVersion,scope:'palace-position',label:m.label,subjects:[...m.branches],evidence:[...m.evidence],sourceReferences:refsForRule(anchor,rule),nameEffect:'not-evaluated'});}
   for(const f of q.patterns?.findings??[])if(['menpo','jixing','rumu'].includes(f.kind)&&f.palaces.includes(palace)){const rule=needRule(q.patterns!.rules,f.ruleId);observations.push({palace,ruleId:f.ruleId,ruleVersion:f.ruleVersion,scope:'palace-position',label:f.label,subjects:[...f.subjects],evidence:[...f.evidence],sourceReferences:refsForRule(anchor,rule),nameEffect:'not-evaluated'});}
   for(const f of q.stemTombs?.findings??[])if(f.palace===palace){const rule=needRule(q.stemTombs!.rules,f.ruleId);observations.push({palace,ruleId:f.ruleId,ruleVersion:f.ruleVersion,scope:'palace-position',label:'独立十干墓支表 · '+f.role,subjects:[f.stem,f.targetBranch],evidence:[...f.evidence],sourceReferences:refsForRule(anchor,rule),nameEffect:'not-evaluated'});}
   return{palace,trigram:raw!.trigram,direction:raw!.direction,star:raw!.star,door:raw!.door,god:raw!.god,principalAndHostedStems:[raw!.heaven],observations};
  });
  const whole:CulturalWholeChartObservation[]=(q.patterns?.findings??[]).filter(f=>['fuyin','fanyin'].includes(f.kind)).map(f=>({ruleId:f.ruleId,ruleVersion:f.ruleVersion,kind:f.kind,layer:f.layer==='stars'?'stars':f.layer==='doors'?'doors':'other',label:f.label,subjects:[...f.subjects],evidence:[...f.evidence],sourceReferences:refsForRule(anchor,needRule(q.patterns!.rules,f.ruleId)),scope:'whole-chart',assignedToName:false}));
  const differences:CulturalRuleBasisDifference[]=[];
  const a=q.patterns?.rules.find(r=>r.id==='qimen-heaven-qi-rumu'),b=q.stemTombs?.rules.find(r=>r.id==='qimen-go-heaven-explicit-stem-tombs');
  if(a&&b)differences.push({kind:'different-rule-bases',ruleRefs:[...refsForRule(anchor,a),...refsForRule(anchor,b)],note:'三奇入墓结构规则与独立十干墓支表分别保留来源和适用范围，不合并真假墓判定。',mergedVerdict:null});
  return{palaceViews,whole,coverage,differences};
 }
 function baselineRow(anchor:AnchorState,original:CharacterEntry|undefined,char:string,position:number,saved:boolean):{base:PreparedCulturalCharacter;options:readonly {public:CulturalProviderEvidenceOption;row:PreparedCulturalCharacter}[];defaultEvidenceId:string|null}{
  const fixed=anchor.sources.baselineCharacters.find(c=>c.char===char),entry=original??fixed;
  const source=entry?anchor.sources.baselineSources.find(s=>s.id===entry.sourceId):undefined;
  const editorial=anchor.sources.baselineSources.find(s=>s.id==='editorial-rules');if(!editorial)sourceFailure();
  // A dictionary name/meaning/reading must not borrow the fixed provider's
  // attribution while keeping merely the same element-bearing subset.
  const matches=!!(fixed&&entry&&same(entry,fixed));
  if(entry&&!source)sourceFailure();
  const dictionaryRefs=source&&(!saved||matches)?[reference(source,'dictionary-fact','fixed-baseline/character/'+char)]:[];
  let state:Exclude<CulturalSourceState,'source-error'>=!entry?'no-mapping':saved&&!matches?'disputed':anchor.sources.pendingCharacters.includes(char)?'pending':fixed?.elements.length?'ready':'unknown';
  const reason=state==='no-mapping'?'no-lexical-record':state==='disputed'?'saved-record-outside-fixed-label-provider':state==='pending'?'separate-object-provider-not-enabled-here':'existing-label-unknown';
  const base:PreparedCulturalCharacter={position,char,pinyin:saved&&entry?entry.pinyin:null,readingState:'selected',sourceState:state,labelPolicyId:anchor.sources.labelPolicy.id,reviewedEvidenceId:null,dictionarySense:entry?.meaning??null,projectIntent:entry?.elementBasis??null,elements:[],reasonCodes:[reason],sourceReferences:dictionaryRefs,adoptionReceiptDigest:null};
  if(!entry)return{base,options:[],defaultEvidenceId:null};
  const readings=saved?[entry.pinyin]:[...new Set([entry.pinyin,...(entry.readings??[]).filter(r=>r.word===char&&!r.referenceOnly).map(r=>r.pinyin)])];
  if(readings.some(p=>!text(p,200))||readings.length>64)sourceFailure();
  const options=readings.map(pinyin=>{
   const optionState:Exclude<CulturalSourceState,'source-error'>=state==='ready'&&pinyin!==fixed?.pinyin?'unknown':state;
   const reading=entry.readings?.find(r=>r.pinyin===pinyin&&r.word===char&&!r.referenceOnly);
   const readingSource=reading&&pinyin!==entry.pinyin?anchor.sources.baselineSources.find(s=>s.id===reading.sourceId):undefined;
   if(reading&&pinyin!==entry.pinyin&&!readingSource)sourceFailure();
   const selectedDictionaryRefs=saved&&!matches?[]:readingSource?[reference(readingSource,'dictionary-fact','fixed-baseline/character/'+char+'/reading/'+pinyin)]:dictionaryRefs;
   const row:PreparedCulturalCharacter={...base,pinyin,sourceState:optionState,reviewedEvidenceId:null,dictionarySense:pinyin===entry.pinyin?entry.meaning:reading?.meanings.join('；')??null,elements:optionState==='ready'?[...fixed!.elements]:[],reasonCodes:optionState==='ready'?[]:[pinyin!==fixed?.pinyin?'reading-not-admitted-for-label':reason],sourceReferences:optionState==='ready'?[...selectedDictionaryRefs,reference(editorial!,'project-editorial-label','fixed-baseline/character/'+char+'/elements')]:selectedDictionaryRefs};
   const evidenceId=opaque();row.reviewedEvidenceId=optionState==='ready'?evidenceId:null;
   return{public:{evidenceId,position,char,pinyin,sourceState:optionState,elements:[...row.elements],dictionarySense:row.dictionarySense,projectIntent:row.projectIntent},row};
  });
  const auto=saved||readings.length===1?options[0]:null;
  return{base:auto?auto.row:{...base,pinyin:null,readingState:'required',dictionarySense:null,projectIntent:null,sourceReferences:[],reasonCodes:['reading-selection-required']},options,defaultEvidenceId:auto?.public.evidenceId??null};
 }
 function material(anchor:AnchorState,extra:readonly CulturalProviderJsonMaterial[]=[]):CulturalProviderMaterial{return copy({...anchor.material,jsons:[...anchor.material.jsons,...extra]});}
 async function prepareBirthAnchor(request:CulturalAnchorRequest):Promise<CulturalProviderReply<CulturalProviderAnchor>>{
  let reader:Store|undefined;
  try{
   ensureOpen();fixedStoreIdentity();const req=copy(request);
   if(!req||typeof req!=='object'||!(req.kind==='session'?exact(req,['kind','sessionId','expectedReviewToken'])&&text(req.sessionId)&&text(req.expectedReviewToken):req.kind==='profile'?(exact(req,['kind','profileId'])||exact(req,['kind','profileId','expectedBirthInputDigest']))&&text(req.profileId)&&(req.expectedBirthInputDigest===undefined||/^[a-f0-9]{64}$/.test(req.expectedBirthInputDigest)):false))invalid();
   if(anchors.size>=16)fail('capacity','出生资料读取凭据已达上限，请关闭实例后重新准备。');
   const before=diskSha(),sources=freshSources();
   reader=new Store(userDir,dataDir,wasmPath);
   // init awaits SQL before reopening the path. A disappearing file must never
   // reach its normal create-empty/flush branch in this read-only adapter.
   Object.defineProperty(reader,'flush',{value:denyProviderWrite,writable:false,configurable:false,enumerable:false});
   await storeMethods.init.call(reader);fixedStoreIdentity();
   const db=reader.db,execDescriptor=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(db),'exec');
   if(!execDescriptor||!Object.hasOwn(execDescriptor,'value')||typeof execDescriptor.value!=='function')return rejected();
   const nativeExec=execDescriptor.value as typeof db.exec;
   const read=(sql:string,params:string[]=[])=>nativeExec.call(db,sql,params)[0]?.values??[];
   let session:NamingSession|null=null,profile:BirthProfile,analysis:Analysis,rawProfile:string,rawSession:string|undefined;
   const additionalBlobs:{id:string;role:string;bytes:Uint8Array;mediaType:string}[]=[];
   if(req.kind==='session'){
    session=storeMethods.read.call(reader,req.sessionId)??null;if(!session)fail('not-found','未找到原保存方案。');
    if(session!.reviewToken!==req.expectedReviewToken)fail('stale-source','方案审阅版本已变化，请重新选择。');
    const raw=read('SELECT json FROM sessions WHERE id=?',[req.sessionId])[0]?.[0];if(typeof raw!=='string')rejected();rawSession=raw as string;
    const parsed=copy(parseSnapshotJsonStrict(rawSession)) as NamingSession;
    const left={...copy(session)},right={...parsed};delete left.factVerification;delete right.factVerification;if(!same(left,right))rejected();
    profile=readCulturalStoredProfile(parsed.profile,parsed.profileId);analysis=copy(parsed.analysis);session=parsed;rawProfile=JSON.stringify(parsed.profile);
    const archived=read('SELECT sha256,version,pack FROM knowledge_archives WHERE version=?',[session.dataVersion])[0];
    let pack:Uint8Array|undefined;
    if(archived){const bytes=archived[2];if(typeof archived[0]!=='string'||archived[1]!==session.dataVersion||!(bytes instanceof Uint8Array))return rejected();if(sha(bytes)!==archived[0])return rejected();pack=new Uint8Array(bytes);}
    else for(const file of ['knowledge.sqlite','knowledge-v5.sqlite','knowledge-v6.sqlite']){const bytes=fs.readFileSync(path.join(dataDir,file));if(sha(bytes).slice(0,12)===session.dataVersion){pack=bytes;break;}}
    if(!pack||sha(pack).slice(0,12)!==session.dataVersion)rejected();
    const archive=storeMethods.pack.call(reader,pack!);if(archive.version!==session.dataVersion)rejected();
    for(const candidate of session.candidates)for(const character of candidate.characters){const fixedSource=sources.baselineSources.find(s=>s.id===character.sourceId),originalSource=archive.sources.find(s=>s.id===character.sourceId);if(fixedSource&&originalSource&&!same(fixedSource,originalSource))rejected();}
    additionalBlobs.push({id:'original-knowledge-pack',role:'verified-session-knowledge-archive',bytes:pack!,mediaType:'application/vnd.sqlite3'});
   }else{
    const raw=read('SELECT json FROM profiles WHERE id=?',[req.profileId])[0]?.[0];if(typeof raw!=='string')fail('not-found','未找到已保存档案。');rawProfile=raw as string;
    const parsed=copy(parseSnapshotJsonStrict(rawProfile)),readProfiles=storeMethods.rows.call(reader,'profiles') as BirthProfile[];
    if(!same(parsed,readProfiles.find(p=>p.id===req.profileId)))rejected();
    profile=readCulturalStoredProfile(parsed,req.profileId);
    if(req.expectedBirthInputDigest!==undefined&&req.expectedBirthInputDigest!==culturalCanonicalDigest(profile))fail('stale-source','已保存出生资料已变化，请重新确认。');
    // Exactly one current analyzer call in profile mode. Session mode never
    // enters this branch or replaces a saved chart with a new calculation.
    analysis=copy(analyzeProfile(profile));
   }
   if(profile.timeUnknown&&(analysis.qimen.available||analysis.qimen.palaces.length))rejected();
   if(diskSha()!==before)fail('stale-source','读取期间客户库已变化，请重新准备。');ensureOpen();
   if(anchors.size>=16)fail('capacity','出生资料读取凭据已达上限，请关闭实例后重新准备。');
   const blobReferences:CulturalProviderBlobReference[]=[];
   for(const b of sources.blobs){const digest=retain(b.bytes);if(digest!==b.sha256)sourceFailure();blobReferences.push({id:'source:'+b.id,role:b.relativePath,sha256:digest,byteLength:b.bytes.byteLength,mediaType:b.mediaType});}
   for(const b of additionalBlobs)blobReferences.push({id:b.id,role:b.role,sha256:retain(b.bytes),byteLength:b.bytes.byteLength,mediaType:b.mediaType});
   let metadata=sourceMetadata.get(sources.revision);if(!metadata){const {blobs:unused,...rest}=sources;metadata=rest;sourceMetadata.set(sources.revision,metadata);}
   const sourceRevision=culturalCanonicalDigest({databaseSha:before,sourceRevision:sources.revision,recordId:req.kind==='session'?req.sessionId:req.profileId,reviewToken:session?.reviewToken??null});
   const anchor:CulturalBirthAnchorView={anchorId:randomUUID(),ownerProfileId:profile.id,sourceSessionId:session?.id??null,sourceRevision,identity:{qimenVersion:analysis.qimen.version,digest:culturalChartDigest(analysis.qimen,LEGACY_CHART_DIGEST_ALGORITHM).digest,digestAlgorithm:LEGACY_CHART_DIGEST_ALGORITHM,sourceDigest:sources.revision,birthInputDigest:culturalCanonicalDigest(profile),timeBasisDigest:culturalCanonicalDigest(analysis.bazi.timeBasis??{timezone:profile.timezone,timeUnknown:profile.timeUnknown})},available:analysis.qimen.available,unavailableReasons:analysis.qimen.available?[]:[analysis.qimen.reason??'出生盘尚未确定'],birthLabel:profile.birthDate+' '+(profile.timeUnknown?'时辰未知':profile.birthTime),timeBasisLabel:profile.timeBasis==='apparent-solar'?'原资料真太阳时依据':'原资料民用时间依据',sourceReferences:[...sources.sourceReferences]};
   const jsons:CulturalProviderJsonMaterial[]=[json('original-profile','birth-profile/stored',profile,rawProfile),json('original-qimen',analysis.qimen.version,analysis.qimen),json('original-time-basis','birth-time-basis/stored',analysis.bazi.timeBasis??{timezone:profile.timezone,timeUnknown:profile.timeUnknown}),json('original-source-snapshot',session?'session-source-snapshot/'+String(session.sourceSnapshot?.version??'legacy'):'cultural-provider-sources/1',session?.sourceSnapshot??{state:session?'not-recorded':'profile-mode',sourceSnapshot:null}),json('provider-source-snapshot','cultural-provider-sources/1',sources.sourceReferences),json('fixed-label-policy',sources.labelPolicy.version,sources.labelPolicy),json('fixed-mapping-profile',sources.mappingProfile.version,sources.mappingProfile),json('cultural-comparison-rule',QIMEN_CULTURAL_PUBLICATION,{publication:QIMEN_CULTURAL_PUBLICATION,elementPalaces:CULTURAL_ELEMENT_PALACES,jsonLimits:CULTURAL_JSON_LIMITS}),...sources.sourceJsons.map(j=>({...j,id:'source:'+j.id}))];
   if(rawSession)jsons.push(json('original-session','naming-session/stored',session,rawSession));
   const descriptor:CulturalProviderMaterial=copy({schema:'qimen-cultural-provider-material/1.0.0',providerVersion:CULTURAL_PROVIDER_VERSION,ownerProfileId:profile.id,sourceSessionId:session?.id??null,sourceRevision,storage:'memory-only',jsons,blobs:blobReferences});
   const handle=opaque(),state:AnchorState={view:copy(anchor),handle,databaseSha:before,profile,analysis,session,sources:metadata,material:descriptor,candidates:new Map()};anchors.set(handle,state);
   return{kind:'ok',value:copy({handle,anchor})};
  }catch(error){return failure(error);}finally{try{reader?.db?.close();}catch{}}
 }
 function queryCharacterOptions(handle:string,candidate:CulturalProviderCandidateRequest):CulturalProviderReply<CulturalProviderOptions>{return operation(()=>{
  const anchor=get(handle),request=copy(candidate);if(!request||typeof request!=='object'||anchor.candidates.size>=64)invalid();
  let givenName:string,original:unknown,entries:CharacterEntry[]|undefined,kind:'saved'|'draft',candidateRef:string;
  if(request.kind==='saved'){
   if(!exact(request,['kind','candidateId'])||!text(request.candidateId)||!anchor.session)invalid();
   const saved=anchor.session!.candidates.find(c=>c.id===request.candidateId);if(!saved)rejected();givenName=saved!.givenName;entries=saved!.characters;original=saved;kind='saved';candidateRef=saved!.id;
  }else if(request.kind==='draft'){
   if(!exact(request,['kind','draftId','givenName'])||!text(request.draftId)||typeof request.givenName!=='string'||!/^\p{Script=Han}{1,2}$/u.test(request.givenName))invalid();
   givenName=request.givenName;original={kind:'draft',draftId:request.draftId,givenName};kind='draft';candidateRef=request.draftId;
  }else return invalid();
  const prepared=[...givenName].map((char,position)=>baselineRow(anchor,entries?.[position],char,position,kind==='saved'));
  const candidateToken=opaque(),view:CulturalProviderOptions=copy({candidateToken,candidateRef,anchorId:anchor.view.anchorId,selectionRevision:randomUUID(),givenName,fullName:anchor.profile.surname+givenName,positions:prepared.map((r,position)=>({position,char:[...givenName][position],status:r.base.readingState==='required'?'reading-selection-required':r.base.sourceState==='ready'?'options-available':r.base.sourceState==='unknown'?'unknown-label':r.base.sourceState==='no-mapping'?'unmapped':r.base.sourceState==='pending'?'pending-admission':'source-conflict',defaultEvidenceId:r.defaultEvidenceId,options:r.options.map(o=>o.public)}))});
  anchor.candidates.set(candidateToken,{view,kind,original:copy(original),rows:prepared.map(r=>({base:copy(r.base),options:copy(r.options)}))});return copy(view);
 });}
 function preview(handle:string,request:CulturalProviderPreviewRequest):CulturalProviderReply<CulturalProviderPreview>{return operation(()=>{
  const anchor=get(handle),req=copy(request);
  if(!req||!exact(req,['candidateTokens','selections'])||!Array.isArray(req.candidateTokens)||req.candidateTokens.length<1||req.candidateTokens.length>4||req.candidateTokens.some(t=>!text(t,128))||new Set(req.candidateTokens).size!==req.candidateTokens.length||!Array.isArray(req.selections)||req.selections.length>8)invalid();
  if(previews.size>=32)fail('capacity','本次预览材料已达上限，请关闭实例后重新准备。');
  const selected=new Map<string,string>();
  for(const s of req.selections){if(!s||!exact(s,['candidateToken','position','evidenceId'])||!req.candidateTokens.includes(s.candidateToken)||!Number.isInteger(s.position)||s.position<0||s.position>1||!text(s.evidenceId,128))invalid();const key=s.candidateToken+':'+s.position;if(selected.has(key))invalid();selected.set(key,s.evidenceId);}
  const extra:CulturalProviderJsonMaterial[]=[],candidates:PreparedCulturalCandidate[]=req.candidateTokens.map(token=>{
   const candidate=anchor.candidates.get(token);if(!candidate)rejected();
   const rows=candidate!.rows.map((position,index)=>{const id=selected.get(token+':'+index);if(id===undefined)return position.base;const option=position.options.find(o=>o.public.evidenceId===id);if(!option)rejected();return option!.row;});
   if(req.selections.some(s=>s.candidateToken===token&&s.position>=rows.length))invalid();
   extra.push(json('candidate:'+token,'cultural-provider-original-candidate/1',candidate!.original),json('occurrences:'+token,'cultural-provider-selected-occurrences/1',rows));
   return{candidateRef:candidate!.view.candidateRef,kind:candidate!.kind,fullName:candidate!.view.fullName,givenName:candidate!.view.givenName,anchorBinding:{anchorId:anchor.view.anchorId,ownerProfileId:anchor.view.ownerProfileId,sourceSessionId:anchor.view.sourceSessionId,sourceRevision:anchor.view.sourceRevision,identity:anchor.view.identity},labelPolicy:anchor.sources.labelPolicy,rows};
  });
  extra.push(json('selected-evidence','cultural-provider-selection/1',req));
  const views=chartViews(anchor),base:Omit<PreparedCulturalComparisonInput,'evidenceCapsuleDigest'>={schema:QIMEN_CULTURAL_VERSION,enabled:true,requestId:randomUUID(),surname:anchor.profile.surname,anchor:anchor.view,qimen:anchor.analysis.qimen,labelPolicy:anchor.sources.labelPolicy,candidates,palaceViews:views.palaceViews,chartWideObservations:views.whole,observationCoverage:views.coverage,ruleBasisDifferences:views.differences,sourceReferences:anchor.sources.sourceReferences};
  extra.push(json('prepared-comparison','cultural-provider-prepared-input/1',base));
  const retained=material(anchor,extra),materialDigest=culturalCanonicalDigest(retained),result=compareQimenCultural({...base,evidenceCapsuleDigest:materialDigest});
  if(result.kind!=='result')return rejected();const previewHandle=opaque();previews.set(previewHandle,{anchor,material:retained,digest:materialDigest,snapshotDigest:result.snapshot.snapshotDigest});
  return copy({previewHandle,snapshot:result.snapshot,materialDigest});
 });}
 return Object.freeze({prepareBirthAnchor,queryCharacterOptions,preview,
  readAnchorMaterial(handle:string){return operation(()=>copy(get(handle).material));},
  readMaterial(previewHandle:string){return operation(()=>{const retained=previews.get(previewHandle);if(!retained)rejected();fresh(retained!.anchor);return copy(retained!.material);});},
  verifyOwnedPreview(previewHandle:string){return operation(()=>{
   if(!text(previewHandle,128))invalid();const retained=previews.get(previewHandle);if(!retained)rejected();
   const current=retained!;fresh(current.anchor);
   if(culturalCanonicalDigest(current.material)!==current.digest||current.material.ownerProfileId!==current.anchor.view.ownerProfileId||current.material.sourceSessionId!==current.anchor.view.sourceSessionId||current.material.sourceRevision!==current.anchor.view.sourceRevision)rejected();
   for(const ref of current.material.blobs){const bytes=blobs.get(ref.sha256);if(!bytes||bytes.byteLength!==ref.byteLength||sha(bytes)!==ref.sha256)rejected();}
   return copy({validation:'live-main-owned-preview' as const,previewHandle,anchorId:current.anchor.view.anchorId,ownerProfileId:current.anchor.view.ownerProfileId,sourceSessionId:current.anchor.view.sourceSessionId,sourceRevision:current.anchor.view.sourceRevision,databaseRevision:current.anchor.databaseSha,sourceDigest:current.anchor.sources.revision,materialDigest:current.digest,snapshotDigest:current.snapshotDigest});
  });},
  readMaterialBlob(handle:string,blobId:string){return operation(()=>{if(!text(handle,128)||!text(blobId,2000))invalid();const retained=anchors.get(handle)?.material??previews.get(handle)?.material,ref=retained?.blobs.find(b=>b.id===blobId);if(!ref)rejected();const bytes=blobs.get(ref!.sha256);if(!bytes||bytes.length!==ref!.byteLength||sha(bytes)!==ref!.sha256)rejected();return new Uint8Array(bytes!);});},
  close(){closed=true;anchors.clear();previews.clear();blobs.clear();sourceMetadata.clear();blobBytes=0;},
 });
}
