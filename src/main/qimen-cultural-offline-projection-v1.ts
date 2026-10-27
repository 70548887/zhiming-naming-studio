import {culturalCanonicalJson,culturalCanonicalDigest,culturalChartDigest} from '../domain/qimen-cultural-comparison-canonical';
import {CULTURAL_ELEMENT_PALACES,CULTURAL_JSON_LIMITS,CULTURAL_OUTER_PALACES} from '../shared/qimen-cultural-comparison-rules';
import {LEGACY_CHART_DIGEST_ALGORITHM,QIMEN_CULTURAL_PUBLICATION,QIMEN_CULTURAL_VERSION} from '../shared/qimen-cultural-comparison';
import {parseSnapshotJsonStrict} from './snapshot-json-spans';
import {bindCulturalOfflineCharacterV1} from './qimen-cultural-offline-pack-v1';
import type {CulturalOfflinePackV1} from './qimen-cultural-offline-pack-v1';
import type {CulturalOfflineSourceAuthenticationV1} from './qimen-cultural-offline-sources-v1';
import type {verifyCulturalOfflineBirthV1} from './qimen-cultural-offline-birth-v1';
import type {CulturalProviderMaterial} from '../shared/qimen-cultural-provider-v1';
import type {CulturalEvidenceRef,CulturalPalaceView,CulturalObservationCoverage,CulturalWholeChartObservation,CulturalRuleBasisDifference,PreparedCulturalComparisonInput,PreparedCulturalCharacter} from '../shared/qimen-cultural-comparison';
import type {CharacterEntry,NameCandidate,QimenMarkerRule,SourceRecord} from '../shared/types';

const bad=():never=>{throw Error('OFFLINE_INTEGRITY');};
const same=(a:unknown,b:unknown)=>culturalCanonicalJson(a)===culturalCanonicalJson(b);
const exact=(v:object,keys:readonly string[])=>same(Object.keys(v).sort(),[...keys].sort());
const hex=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const sourceRef=(s:SourceRecord,authority:CulturalEvidenceRef['authority'],locator:string):CulturalEvidenceRef=>({id:s.id,version:s.commit,sha256:s.sha256,locator,authority,license:s.license,note:s.note});
export function readCulturalOfflineJsonV1<T>(material:CulturalProviderMaterial,id:string,schemaId?:string):T{
 const row=material.jsons.find(r=>r.id===id);if(!row||schemaId!==undefined&&row.schemaId!==schemaId||row.codecVersion!=='exact-utf8-json/1')return bad();return parseSnapshotJsonStrict(row.exactUtf8Json) as T;
}
/** Rebuild all derived provider fields, not merely hashes of caller-supplied rows. */
export function rederiveCulturalPreparedV1(material:CulturalProviderMaterial,birth:ReturnType<typeof verifyCulturalOfflineBirthV1>,sources:CulturalOfflineSourceAuthenticationV1['sourceMetadata'],pack:CulturalOfflinePackV1|null):Omit<PreparedCulturalComparisonInput,'evidenceCapsuleDigest'>{
 const base=readCulturalOfflineJsonV1<Omit<PreparedCulturalComparisonInput,'evidenceCapsuleDigest'>>(material,'prepared-comparison','cultural-provider-prepared-input/1');
 const selection=readCulturalOfflineJsonV1<{candidateTokens:string[];selections:{candidateToken:string;position:number;evidenceId:string}[]}>(material,'selected-evidence','cultural-provider-selection/1');
 if(!base||!exact(base,['schema','enabled','requestId','surname','anchor','qimen','labelPolicy','candidates','palaceViews','chartWideObservations','observationCoverage','ruleBasisDifferences','sourceReferences'])||base.schema!==QIMEN_CULTURAL_VERSION||base.enabled!==true||!uuid(base.requestId)||!base.anchor||!uuid(base.anchor.anchorId)||!hex(material.sourceRevision)||!Array.isArray(base.candidates)||base.candidates.length<1||base.candidates.length>4)return bad();
 if(!selection||!exact(selection,['candidateTokens','selections'])||!Array.isArray(selection.candidateTokens)||selection.candidateTokens.length!==base.candidates.length||selection.candidateTokens.some(t=>!hex(t))||new Set(selection.candidateTokens).size!==selection.candidateTokens.length||!Array.isArray(selection.selections)||selection.selections.length>8)return bad();
 const expectedAnchor={anchorId:base.anchor.anchorId,ownerProfileId:birth.profile.id,sourceSessionId:birth.session?.id??null,sourceRevision:material.sourceRevision,identity:{qimenVersion:birth.qimen.version,digest:culturalChartDigest(birth.qimen,LEGACY_CHART_DIGEST_ALGORITHM).digest,digestAlgorithm:LEGACY_CHART_DIGEST_ALGORITHM,sourceDigest:sources.revision,birthInputDigest:culturalCanonicalDigest(birth.profile),timeBasisDigest:culturalCanonicalDigest(birth.timeBasis)},available:birth.qimen.available,unavailableReasons:birth.qimen.available?[]:[birth.qimen.reason??'出生盘尚未确定'],birthLabel:birth.profile.birthDate+' '+(birth.profile.timeUnknown?'时辰未知':birth.profile.birthTime),timeBasisLabel:birth.profile.timeBasis==='apparent-solar'?'原资料真太阳时依据':'原资料民用时间依据',sourceReferences:sources.sourceReferences};
 if(!same(base.anchor,expectedAnchor)||base.surname!==birth.profile.surname||!same(base.labelPolicy,sources.labelPolicy)||JSON.stringify(base.qimen)!==JSON.stringify(birth.qimen)||!same(base.sourceReferences,sources.sourceReferences))return bad();
 if(!same(readCulturalOfflineJsonV1(material,'cultural-comparison-rule',QIMEN_CULTURAL_PUBLICATION),{publication:QIMEN_CULTURAL_PUBLICATION,elementPalaces:CULTURAL_ELEMENT_PALACES,jsonLimits:CULTURAL_JSON_LIMITS}))return bad();
 const selected=new Map<string,string>(),evidenceScopes=new Map<string,string>();
 for(const s of selection.selections){if(!s||!exact(s,['candidateToken','position','evidenceId'])||!selection.candidateTokens.includes(s.candidateToken)||!Number.isInteger(s.position)||s.position<0||s.position>1||!hex(s.evidenceId))return bad();const key=s.candidateToken+':'+s.position;if(selected.has(key)||evidenceScopes.has(s.evidenceId))return bad();selected.set(key,s.evidenceId);evidenceScopes.set(s.evidenceId,key);}
 const allowedJsons=new Set(['original-profile','original-qimen','original-time-basis','original-source-snapshot','provider-source-snapshot','fixed-label-policy','fixed-mapping-profile','cultural-comparison-rule','selected-evidence','prepared-comparison',...(birth.session?['original-session']:[]),...sources.sourceJsons.map(j=>'source:'+j.id)]);
 const editorial=sources.baselineSources.find(s=>s.id==='editorial-rules');if(!editorial)return bad();
 for(let index=0;index<selection.candidateTokens.length;index++){
  const token=selection.candidateTokens[index],candidate=base.candidates[index];allowedJsons.add('candidate:'+token);allowedJsons.add('occurrences:'+token);
  const original=readCulturalOfflineJsonV1<NameCandidate|{kind:'draft';draftId:string;givenName:string}>(material,'candidate:'+token,'cultural-provider-original-candidate/1');
  const rows=readCulturalOfflineJsonV1<PreparedCulturalCharacter[]>(material,'occurrences:'+token,'cultural-provider-selected-occurrences/1');
  if(!candidate||!exact(candidate,['candidateRef','kind','fullName','givenName','anchorBinding','labelPolicy','rows'])||!Array.isArray(rows)||!same(rows,candidate.rows)||!same(candidate.labelPolicy,sources.labelPolicy)||!same(candidate.anchorBinding,{anchorId:expectedAnchor.anchorId,ownerProfileId:expectedAnchor.ownerProfileId,sourceSessionId:expectedAnchor.sourceSessionId,sourceRevision:expectedAnchor.sourceRevision,identity:expectedAnchor.identity})||typeof candidate.givenName!=='string'||!/^\p{Script=Han}{1,2}$/u.test(candidate.givenName)||candidate.fullName!==birth.profile.surname+candidate.givenName||rows.length!==[...candidate.givenName].length)return bad();
  let originals:readonly CharacterEntry[]|null=null;
  if(candidate.kind==='saved'){
   if(!birth.session||!pack)return bad();const saved=birth.session.candidates.find(c=>c.id===candidate.candidateRef);if(!saved||!same(saved,original)||saved.givenName!==candidate.givenName||saved.fullName!==candidate.fullName||!Array.isArray(saved.characters)||saved.characters.length!==[...candidate.givenName].length||saved.characters.some((entry,position)=>!entry||entry.char!==[...candidate.givenName][position]))return bad();originals=saved.characters;
   for(const entry of originals){bindCulturalOfflineCharacterV1(entry,pack);const fixed=sources.baselineSources.find(s=>s.id===entry.sourceId),recorded=pack.sources.find(s=>s.id===entry.sourceId);if(fixed&&(!recorded||!same(fixed,recorded)))return bad();}
  }else if(candidate.kind==='draft'){
   if(!original||!exact(original,['kind','draftId','givenName'])||!('kind'in original)||original.kind!=='draft'||original.draftId!==candidate.candidateRef||original.givenName!==candidate.givenName)return bad();
  }else return bad();
  for(let position=0;position<rows.length;position++){
   const row=rows[position],char=[...candidate.givenName][position],fixed=sources.baselineCharacters.find(c=>c.char===char),isSaved=originals!==null,entry=originals===null?fixed:originals[position],key=token+':'+position,explicit=selected.get(key);
   if(!row||!exact(row,['position','char','pinyin','readingState','sourceState','labelPolicyId','reviewedEvidenceId','dictionarySense','projectIntent','elements','reasonCodes','sourceReferences','adoptionReceiptDigest'])||row.position!==position||row.char!==char||row.adoptionReceiptDigest!==null)return bad();
   const matches=!!(fixed&&entry&&same(entry,fixed));const source=entry?sources.baselineSources.find(s=>s.id===entry.sourceId):undefined;if(entry&&!source)return bad();
   const state=!entry?'no-mapping':isSaved&&!matches?'disputed':sources.pendingCharacters.includes(char)?'pending':fixed?.elements.length?'ready':'unknown';
   const reason=state==='no-mapping'?'no-lexical-record':state==='disputed'?'saved-record-outside-fixed-label-provider':state==='pending'?'separate-object-provider-not-enabled-here':'existing-label-unknown';
   const dictionaryRefs=source&&(!isSaved||matches)?[sourceRef(source,'dictionary-fact','fixed-baseline/character/'+char)]:[];
   const common={position,char,labelPolicyId:sources.labelPolicy.id,adoptionReceiptDigest:null};
   if(!entry){if(explicit!==undefined||!same(row,{...common,pinyin:null,readingState:'selected',sourceState:'no-mapping',reviewedEvidenceId:null,dictionarySense:null,projectIntent:null,elements:[],reasonCodes:[reason],sourceReferences:[]}))return bad();continue;}
   const readings=isSaved?[entry.pinyin]:[...new Set([entry.pinyin,...(entry.readings??[]).filter(r=>r.word===char&&!r.referenceOnly).map(r=>r.pinyin)])];
   if(row.readingState==='required'){
    if(isSaved||readings.length<2||explicit!==undefined||!same(row,{...common,pinyin:null,readingState:'required',sourceState:state,reviewedEvidenceId:null,dictionarySense:null,projectIntent:null,elements:[],reasonCodes:['reading-selection-required'],sourceReferences:[]}))return bad();continue;
   }
   if(row.readingState!=='selected'||typeof row.pinyin!=='string'||!readings.includes(row.pinyin)||!isSaved&&readings.length>1&&explicit===undefined)return bad();
   if(explicit===undefined&&row.pinyin!==entry.pinyin)return bad();
   const optionState=state==='ready'&&row.pinyin!==fixed?.pinyin?'unknown':state;
   const reading=entry.readings?.find(r=>r.pinyin===row.pinyin&&r.word===char&&!r.referenceOnly),readingSource=reading&&row.pinyin!==entry.pinyin?sources.baselineSources.find(s=>s.id===reading.sourceId):undefined;
   if(reading&&row.pinyin!==entry.pinyin&&!readingSource)return bad();
   const chosenRefs=isSaved&&!matches?[]:readingSource?[sourceRef(readingSource,'dictionary-fact','fixed-baseline/character/'+char+'/reading/'+row.pinyin)]:dictionaryRefs;
   if(optionState==='ready'){
    if(!hex(row.reviewedEvidenceId)||explicit!==undefined&&explicit!==row.reviewedEvidenceId)return bad();const bound=evidenceScopes.get(row.reviewedEvidenceId);if(bound!==undefined&&bound!==key)return bad();evidenceScopes.set(row.reviewedEvidenceId,key);
   }else if(row.reviewedEvidenceId!==null)return bad();
   const expected={...common,pinyin:row.pinyin,readingState:'selected',sourceState:optionState,reviewedEvidenceId:optionState==='ready'?row.reviewedEvidenceId:null,dictionarySense:row.pinyin===entry.pinyin?entry.meaning:reading?.meanings.join('；')??null,projectIntent:entry.elementBasis,elements:optionState==='ready'?fixed!.elements:[],reasonCodes:optionState==='ready'?[]:[row.pinyin!==fixed?.pinyin?'reading-not-admitted-for-label':reason],sourceReferences:optionState==='ready'?[...chosenRefs,sourceRef(editorial,'project-editorial-label','fixed-baseline/character/'+char+'/elements')]:chosenRefs};
   if(!same(row,expected))return bad();
  }
  if(selection.selections.some(s=>s.candidateToken===token&&s.position>=rows.length))return bad();
 }
 if(material.jsons.length!==allowedJsons.size||material.jsons.some(j=>!allowedJsons.has(j.id)))return bad();
 const q=birth.qimen;
 const refs=(rule:QimenMarkerRule):CulturalEvidenceRef[]=>rule.sources.map(s=>{const r=sources.sourceReferences.find(x=>x.authority==='saved-chart-rule'&&x.id===s.id&&x.version===s.commit);if(!r)return bad();return{...r,locator:s.locator};});
 const rule=(rules:QimenMarkerRule[],id:string)=>{const r=rules.find(x=>x.id===id);if(!r)return bad();return r;};
 const coverage:CulturalObservationCoverage[]=(['auxiliary','patterns','stem-tombs'] as const).map(module=>{const v=module==='auxiliary'?q.auxiliary:module==='patterns'?q.patterns:q.stemTombs;return{module,status:!q.available?'not-assessed':v?'recorded':'not-recorded',version:q.available&&v?v.version:null,reason:!q.available?'没有唯一出生盘，未补盘。':v?null:'原保存盘未登记该模块，未重新计算。'};});
 const palaceViews:CulturalPalaceView[]=q.available?CULTURAL_OUTER_PALACES.map(palace=>{
  const p=q.palaces.find(p=>p.number===palace);if(!p)return bad();const observations:CulturalPalaceView['observations'][number][]=[];
  for(const m of q.auxiliary?.markers??[])if(m.palaces.includes(palace))observations.push({palace,ruleId:m.ruleId,ruleVersion:m.ruleVersion,scope:'palace-position',label:m.label,subjects:[...m.branches],evidence:[...m.evidence],sourceReferences:refs(rule(q.auxiliary!.rules,m.ruleId)),nameEffect:'not-evaluated'});
  for(const f of q.patterns?.findings??[])if(['menpo','jixing','rumu'].includes(f.kind)&&f.palaces.includes(palace))observations.push({palace,ruleId:f.ruleId,ruleVersion:f.ruleVersion,scope:'palace-position',label:f.label,subjects:[...f.subjects],evidence:[...f.evidence],sourceReferences:refs(rule(q.patterns!.rules,f.ruleId)),nameEffect:'not-evaluated'});
  for(const f of q.stemTombs?.findings??[])if(f.palace===palace)observations.push({palace,ruleId:f.ruleId,ruleVersion:f.ruleVersion,scope:'palace-position',label:'独立十干墓支表 · '+f.role,subjects:[f.stem,f.targetBranch],evidence:[...f.evidence],sourceReferences:refs(rule(q.stemTombs!.rules,f.ruleId)),nameEffect:'not-evaluated'});
  return{palace,trigram:p.trigram,direction:p.direction,star:p.star,door:p.door,god:p.god,principalAndHostedStems:[p.heaven],observations};
 }):[];
 const whole:CulturalWholeChartObservation[]=q.available?(q.patterns?.findings??[]).filter(f=>['fuyin','fanyin'].includes(f.kind)).map(f=>({ruleId:f.ruleId,ruleVersion:f.ruleVersion,kind:f.kind,layer:f.layer==='stars'?'stars':f.layer==='doors'?'doors':'other',label:f.label,subjects:[...f.subjects],evidence:[...f.evidence],sourceReferences:refs(rule(q.patterns!.rules,f.ruleId)),scope:'whole-chart',assignedToName:false})):[];
 const differences:CulturalRuleBasisDifference[]=[],a=q.patterns?.rules.find(r=>r.id==='qimen-heaven-qi-rumu'),b=q.stemTombs?.rules.find(r=>r.id==='qimen-go-heaven-explicit-stem-tombs');
 if(q.available&&a&&b)differences.push({kind:'different-rule-bases',ruleRefs:[...refs(a),...refs(b)],note:'三奇入墓结构规则与独立十干墓支表分别保留来源和适用范围，不合并真假墓判定。',mergedVerdict:null});
 if(!same(base.palaceViews,palaceViews)||!same(base.chartWideObservations,whole)||!same(base.observationCoverage,coverage)||!same(base.ruleBasisDifferences,differences))return bad();
 return base;
}
