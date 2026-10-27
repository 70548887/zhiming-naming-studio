import {compareQimenCultural} from '../../src/domain/qimen-cultural-comparison';
import {culturalCanonicalDigest,culturalChartDigest} from '../../src/domain/qimen-cultural-comparison-canonical';
import {LEGACY_CHART_DIGEST_ALGORITHM,QIMEN_CULTURAL_VERSION,type CulturalComparisonSnapshot,type CulturalEvidenceRef,type CulturalPalaceView,type OuterPalace,type PreparedCulturalComparisonInput} from '../../src/shared/qimen-cultural-comparison';
import type {Element as NamingElement,NamingSession,QimenChart,SourceRecord} from '../../src/shared/types';
import {catalogSession} from '../fixtures/catalog-session';
import fixedChart from '../fixtures/name-imagery-known-chart.json';
import dataset from '../../data/dataset.json';
import markerLock from '../../data/qimen-markers-source-lock.json';
import patternLock from '../../data/qimen-patterns-source-lock.json';
import tombLock from '../../data/qimen-stem-tombs-source-lock.json';

/** Existing chart/dictionary/comparator display fixtures. No live customer DB,
 * Store admission, Service execution or transport authentication is asserted. */
const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
const chartSources=[...markerLock.sources,...patternLock.sources,...tombLock.sources] as SourceRecord[];
const editorial=dataset.sources.find(source=>source.id==='editorial-rules')!;
const dictionary=dataset.sources.find(source=>source.id==='moe-revised')!;
const reference=(source:Pick<SourceRecord,'id'|'commit'|'sha256'|'license'>,authority:CulturalEvidenceRef['authority'],locator:string):CulturalEvidenceRef=>({id:source.id,version:source.commit,sha256:source.sha256,locator,authority,license:source.license,note:'M921 App native-DOM display fixture; no real Service/Store admission.'});
const dictionaryRef=reference(dictionary,'dictionary-fact','data/dataset.json:characters[].readings');
const labelRef=reference(editorial,'project-editorial-label','data/dataset.json:characters[].elementBasis');
const elementLabels=(values:readonly string[]):NamingElement[]=>values.map(value=>{if(!['木','火','土','金','水'].includes(value))throw Error('Unexpected fixture label');return value as NamingElement;});

function savedSession(id:string,profileId:string,customerName:string,token:string):NamingSession {
 const result=catalogSession(id,'2026-10-17T16:00:00Z',profileId);
 result.profile={...result.profile,customerName,surname:'林',surnamePinyin:'lín',fatherName:'',motherName:''};
 result.profile.namingPreferences=clone(result.preferences);
 result.reviewRevision=1;result.reviewToken=token;
 const template=result.candidates[0];
 result.candidates=['梓涵','沐清','清沐'].map((givenName,index)=>({...clone(template),id:`${id}-candidate-${index+1}`,givenName,fullName:'林'+givenName,pinyin:'lín '+givenName,meaning:'固定显示测试寓意',originalMeaning:'固定显示测试寓意'}));
 result.analysis.qimen=clone(fixedChart.chart) as QimenChart;
 return result;
}

function snapshot(session:NamingSession):CulturalComparisonSnapshot {
 const chart=clone(session.analysis.qimen),birth=session.profile;
 const labelPolicy={id:'m921-existing-editorial-display-fixture',version:dataset.version,manifestDigest:culturalCanonicalDigest(editorial),dependencies:[{sourceId:editorial.id,version:editorial.commit,sha256:editorial.sha256}]};
 const anchor={anchorId:'m921-anchor-'+session.id,ownerProfileId:birth.id,sourceSessionId:session.id,sourceRevision:session.reviewToken!,identity:{qimenVersion:chart.version,digest:culturalChartDigest(chart,LEGACY_CHART_DIGEST_ALGORITHM).digest,digestAlgorithm:LEGACY_CHART_DIGEST_ALGORITHM,sourceDigest:culturalCanonicalDigest(chartSources),birthInputDigest:culturalCanonicalDigest(birth),timeBasisDigest:culturalCanonicalDigest({timezone:birth.timezone,birthTime:birth.birthTime,timeUnknown:birth.timeUnknown})},available:chart.available,unavailableReasons:[],birthLabel:'M921 固定已保存方案 '+birth.customerName,timeBasisLabel:'出生地民用时间 Asia/Shanghai；既有固定记录',sourceReferences:chartSources.map(source=>reference(source,'saved-chart-rule','existing-fixed-source-lock'))};
 const binding={anchorId:anchor.anchorId,ownerProfileId:anchor.ownerProfileId,sourceSessionId:anchor.sourceSessionId,sourceRevision:anchor.sourceRevision,identity:anchor.identity};
 const palaceViews:CulturalPalaceView[]=([1,2,3,4,6,7,8,9] as OuterPalace[]).map(number=>{const raw=chart.palaces.find(palace=>palace.number===number)!;return{palace:number,trigram:raw.trigram,direction:raw.direction,star:raw.star,door:raw.door,god:raw.god,principalAndHostedStems:[raw.heaven],observations:[]};});
 const candidates=session.candidates.slice(0,2).map(candidate=>({candidateRef:candidate.id,kind:'saved' as const,fullName:candidate.fullName,givenName:candidate.givenName,anchorBinding:clone(binding),labelPolicy:clone(labelPolicy),rows:[...candidate.givenName].map((char,position)=>{const entry=dataset.characters.find(row=>row.char===char);if(!entry)throw Error('Missing existing dictionary fixture '+char);const mapped=entry.elements.length>0;return{position,char,pinyin:entry.pinyin,readingState:'selected' as const,sourceState:mapped?'ready' as const:'unknown' as const,labelPolicyId:labelPolicy.id,reviewedEvidenceId:mapped?'editorial:'+char:null,dictionarySense:entry.meaning,projectIntent:entry.elementBasis,elements:elementLabels(entry.elements),reasonCodes:mapped?[]:['existing-label-unknown'],sourceReferences:mapped?[clone(dictionaryRef),clone(labelRef)]:[clone(dictionaryRef)],adoptionReceiptDigest:null};})}));
 const input:PreparedCulturalComparisonInput={schema:QIMEN_CULTURAL_VERSION,enabled:true,requestId:'m921-dom-'+session.id,surname:birth.surname,anchor,qimen:chart,labelPolicy,candidates,palaceViews,chartWideObservations:[],observationCoverage:(['auxiliary','patterns','stem-tombs'] as const).map(module=>{const recorded=module==='auxiliary'?chart.auxiliary:module==='patterns'?chart.patterns:chart.stemTombs;return{module,status:recorded?'recorded' as const:'not-recorded' as const,version:recorded?recorded.version:null,reason:recorded?null:'原盘未登记'};}),ruleBasisDifferences:[],sourceReferences:[dictionaryRef,labelRef,...anchor.sourceReferences],evidenceCapsuleDigest:culturalCanonicalDigest({scope:'M921 App DOM stub, not a persisted capsule'})};
 const result=compareQimenCultural(input);if(result.kind!=='result')throw Error('Comparator display fixture failed');return clone(result.snapshot);
}
export function makeM921AppFixtures(){
 const a=savedSession('m921-saved-a','m921-baby-a','甲家长','11111111-1111-4111-8111-111111111111');
 const b=savedSession('m921-saved-b','m921-baby-b','乙家长','22222222-2222-4222-8222-222222222222');
 return {sessions:[a,b],snapshots:{[a.id]:snapshot(a),[b.id]:snapshot(b)}};
}
