import {readFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {types,isDeepStrictEqual as equal} from 'node:util';
import {M970_MANUAL_QUERY_PINS} from './m970-manual-meaning-pins.mjs';
import {reconstructCoverage,classifyCharacters} from './m970-manual-meaning-coverage.mjs';

const need=(ok,message)=>{if(!ok)throw Error('M970 explicit manual query: '+message);};
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const PINS=freeze(structuredClone(M970_MANUAL_QUERY_PINS));
const EXPECTED='傲革司姿由尤';
const SCOPE='on-request-supplement-only';
const BOUNDARIES=freeze({wholeNameMeaning:null,automaticNameRecommendation:false,automaticSemanticCreditAllowed:false,scoreDelta:0,automaticMeaningAllowed:false,sourceAuthority:false,generationAuthority:false,admissionGranted:false,formalCoverageAdded:0,automaticCoverageAdded:0});
const BATCH=freeze({batchId:'M970-DATA',sourceId:'m970-manual-literal-reference',publicationState:'reviewed-literal-reference-manual-only',admission:'candidate-awaiting-independent-review',activation:'off',candidateOnly:true,productionApproved:false,manualOnly:true,individualAdmission:'not-granted',independentReview:'literal-scope-verified',publicationVersion:PINS.publicationVersion,sourceCommit:PINS.sourceCommit,reviewSha256:'2b3b937f806d9f2e18506881b8055a5cf4bf38ceee63efea60b5125813dab220'});

/** Read descriptors only after rejecting proxies; never execute request accessors. */
function fields(value,allowed,required=allowed){
 need(value!==null&&typeof value==='object'&&!types.isProxy(value),'plain non-Proxy input required');
 need([Object.prototype,null].includes(Object.getPrototypeOf(value)),'plain object required');
 const keys=Reflect.ownKeys(value);need(keys.every(key=>typeof key==='string'&&allowed.includes(key)),'extra, authority or symbol fields rejected');
 const output=Object.create(null);
 for(const key of keys){const descriptor=Object.getOwnPropertyDescriptor(value,key);need(descriptor?.enumerable&&Object.hasOwn(descriptor,'value'),'accessor or hidden field rejected');output[key]=descriptor.value;}
 need(required.every(key=>Object.hasOwn(output,key)),'missing explicit identity/request fields');return output;
}
function pathIn(directory,file){
 need(typeof file==='string'&&!file.startsWith('/')&&!file.includes('\\')&&!file.includes(':')&&file.split('/').every(p=>p&&p!=='.'&&p!=='..'),'unsafe fixed publication path');
 const root=resolve(directory),filePath=resolve(root,...file.split('/'));need(filePath.startsWith(root+sep),'publication path escaped configured directory');return filePath;
}
function pinned(directory,pin){const bytes=readFileSync(pathIn(directory,pin.file));need(bytes.length===pin.bytes&&hash(bytes)===pin.sha256,'fixed file identity differs: '+pin.file);return bytes;}
const parse=bytes=>{need(bytes instanceof Uint8Array,'required pinned resource missing');return JSON.parse(bytes.toString('utf8'));};
const closed=value=>value.candidateOnly===true&&value.activation==='off'&&value.productionApproved===false&&value.formalCoverageAdded===0;

/** Reauthenticate all bytes on every request; decode/cache only these verified immutable bytes. */
function authenticate(publicationDir,dataDir){
 const manifestBytes=pinned(publicationDir,PINS.manifest),manifest=parse(manifestBytes);
 need(manifest.schema==='m1024-manual-meaning-publication/1'&&manifest.publicationVersion===PINS.publicationVersion&&manifest.sourceCommit===PINS.sourceCommit&&manifest.sourceBatch==='M970-DATA'&&manifest.expectedChars===EXPECTED&&manifest.requestMode==='manual-request'&&manifest.scope===SCOPE&&manifest.usageStatus==='manual-context-required'&&manifest.individualAdmission==='not-granted'&&closed(manifest)&&manifest.automaticCoverageAdded===0&&manifest.automaticMeaningAllowed===false,'publication cannot grant automatic adoption');
 need(equal(manifest.files,PINS.files)&&equal(manifest.sourceFiles,PINS.sourceFiles)&&equal(manifest.reservationDescriptors,PINS.reservationDescriptors),'fixed full publication/source closure differs');
 const resources=new Map(PINS.files.map(pin=>[pin.file,pinned(publicationDir,pin)]));
 const sources=new Map(PINS.sourceFiles.map(pin=>[pin.file,pinned(dataDir,pin)]));
 // The configured data directory must contain the actual reviewed pack, even on an unknown request.
 need(hash(sources.get('knowledge-v6.sqlite'))===PINS.expectedPackSha256,'actual knowledge pack changed');
 return {manifest,manifestBytes,resources,sources};
}

function validatePublication({manifest,resources,sources}){
 const get=file=>parse(resources.get('m970/'+file));
 const oldManifest=get('candidate/manifest.json'),oldDelivery=get('M970-MANIFEST.json');
 need(hash(resources.get('m970/candidate/manifest.json'))===manifest.candidateManifestSha256&&hash(resources.get('m970/M970-MANIFEST.json'))===manifest.sourceManifestSha256,'reviewed original manifests differ');
 need(closed(oldManifest)&&oldManifest.admissionGranted===false&&oldManifest.selectedCount===6&&oldDelivery.finding==='M965-OVERLAP-01','reviewed six source manifest state differs');
 for(const pin of oldManifest.files){const bytes=resources.get('m970/'+pin.file);need(bytes&&bytes.length===pin.bytes&&hash(bytes)===pin.sha256,'exact reviewed M970 payload differs: '+pin.file);}
 const profile=get('candidate/profile.json'),subset=get('candidate/source-subset.json'),admission=get('candidate/admission.json'),sourceLock=get('candidate/source-lock.json'),coverage=get('coverage.json');
 need(profile.schema==='m970-character-reference-profile/1'&&profile.version==='1.0.0-candidate.1'&&closed(profile)&&profile.rows.map(r=>r.char).join('')===EXPECTED&&new Set(profile.rows.map(r=>r.candidateId)).size===6,'exact pending manual six profile required');
 need(admission.schema==='m970-candidate-admission/1'&&closed(admission)&&admission.admissionGranted===false&&admission.decision==='pending-independent-review'&&equal(admission.approvedCaseIds,[])&&admission.automaticMeaningAllowed===false&&admission.automaticSemanticCreditAllowed===false&&admission.automaticNameRecommendation===false&&admission.wholeNameMeaning===null&&admission.scoreDelta===0,'individual manual naming admission remains ungranted');
 need(subset.sourceAttribution==='教育部《重編國語辭典修訂本》'&&subset.dictionaryLicense==='CC-BY-ND-3.0-TW; original definitions/examples/quotes and complete entries unchanged'&&subset.projectLicense==='CC0-1.0; separate project notes only','original/project licenses differ');
 const review=parse(resources.get('review/M976-REVIEW.json')),reviewRows=parse(resources.get('review/six-character-review.json')),reviewReceipt=parse(resources.get('review/receipt.json'));
 need(hash(resources.get('review/M976-REVIEW.json'))===manifest.sourceReviewSha256&&reviewReceipt.reviewSha256===manifest.sourceReviewSha256&&reviewReceipt.head===PINS.sourceCommit&&reviewReceipt.result==='dedup-repair-accepted-six-literal-references-verified-manual-only'&&reviewReceipt.formalCoverageAdded===0&&reviewReceipt.automaticCoverageAdded===0&&reviewReceipt.activation==='off','scope-only source audit differs');
 need(review.commit===PINS.sourceCommit&&review.semanticReview.counts.manualContextRequired===6&&reviewRows.head===PINS.sourceCommit&&reviewRows.rows.length===6,'six-character independent literal review incomplete');
 const dataset=parse(sources.get('dataset-v6.json')),v7=parse(sources.get('naming-editorial-v7.json'));
 const reservations=PINS.reservationDescriptors.map(d=>{const bytes=resources.get('m970/'+d.inputCopy);need(hash(bytes)===d.sha256,'frozen reservation differs');const data=parse(bytes),rows=d.field?data[d.field]:data;return {...d,characters:rows.map(r=>typeof r==='string'?r:r.char??r.identity?.char)};});
 const recomputed=reconstructCoverage({dataset,v7,v4:parse(sources.get('naming-editorial-v4.json')),v5:parse(sources.get('naming-editorial-v5.json')),v6:parse(sources.get('naming-editorial-v6.json')),reservations});
 need(equal(recomputed,coverage),'complete legacy217/default521/reservation reconstruction differs');
 const onDemand=PINS.reservationDescriptors.find(r=>r.label==='on-demand60'),family=PINS.reservationDescriptors.find(r=>r.label==='M923-family40');
 need(equal(parse(sources.get('naming-character-meanings-v71-m460-b02-profile.json')),get(onDemand.inputCopy))&&equal(parse(sources.get('naming-semantic-m923/admission-records.json')),get(family.inputCopy)),'actual current on-demand/family reference changed');
 const oldTen=get('inputs/m959-selection-original.json'),oldProof=get('M959-RECLASSIFICATION.json');
 const classified=classifyCharacters(coverage,oldTen.selected.map(r=>r.char));need(classified.length===10&&classified.every(r=>r.inLegacy217&&r.inDefault521&&!r.unreserved)&&equal(classified,oldProof.original10),'old10 duplicate correction lost');
 const rawBytes=sources.get('raw/moe-revised.json.gz');need(hash(rawBytes)===sourceLock.rawMOESha256&&subset.rawMOESha256===sourceLock.rawMOESha256,'raw original hash differs');
 const raw=JSON.parse(gunzipSync(rawBytes));
 const rows=profile.rows.map((row,index)=>{
  const source=subset.entries[index],original=raw[source.rawEntryIndex],heteronym=original?.heteronyms?.[source.rawHeteronymIndex],definition=heteronym?.definitions?.[source.rawDefinitionIndex],entry=dataset.characters.find(r=>r.char===row.char),prior=v7.meaningReviews.find(r=>r.char===row.char),auditRow=reviewRows.rows[index];
  need(coverage.remainingUnreserved.includes(row.char)&&!coverage.default521.includes(row.char)&&!coverage.onDemand60.includes(row.char)&&!coverage.optInFamily40.includes(row.char)&&!coverage.notRecommended15.includes(row.char),'manual reference overlaps admitted/default or excluded scope');
  need(equal(row.baselineCharacter,entry)&&hash(JSON.stringify(entry))===row.baselineCharacterSha256&&entry.pinyin===row.pinyin&&entry.tone===row.tone&&row.sourceWord===row.char&&original?.title===row.char&&heteronym.pinyin===row.pinyin,'exact default source glyph/reading differs');
  need(source.candidateId===row.candidateId&&equal(row.sourceCoordinates,[source.rawEntryIndex,source.rawHeteronymIndex,source.rawDefinitionIndex])&&source.pinyin===row.pinyin&&source.selectedToneFromDataset===row.tone&&source.sourceId==='moe-revised'&&source.word===row.char,'source coordinates/reading identity differs');
  need(equal(original,source.completeOriginalEntry)&&hash(JSON.stringify(original))===source.parsedEntrySha256&&equal(definition,source.definition)&&hash(JSON.stringify(definition))===source.definitionSha256&&row.sourceEntrySha256===source.parsedEntrySha256&&row.sourceDefinitionSha256===source.definitionSha256&&definition.type===row.sourcePOS,'original entry/definition/POS differs');
  const selected=entry.readings.filter(r=>r.pinyin===row.pinyin&&r.tone===row.tone&&r.sourceId==='moe-revised'&&r.word===row.sourceWord&&r.referenceOnly!==true);
  need(selected.length===1&&equal(selected[0].meanings,heteronym.definitions.map(d=>d.def))&&selected[0].meanings.includes(definition.def),'complete direct selected reading differs');
  need(equal(source.allReadings,original.heteronyms.map((h,index)=>({index,pinyin:Object.hasOwn(h,'pinyin')?h.pinyin:null,tone:null,definitions:h.definitions??[]})))&&source.license==='CC-BY-ND-3.0-TW'&&row.project.license==='CC0-1.0'&&row.project.projectWish===null,'all original readings/license separation differs');
  need(equal(row.glyphBinding,{kind:'exact-source-glyph',char:row.char,sourceWord:row.char})&&prior.status==='approved'&&prior.automaticMeaningAllowed===false&&row.prior.automaticMeaningAllowed===false&&row.prior.mode==='manual-confirmation-required'&&row.prior.scope===prior.scope,'manual scope or glyph changed');
  need(row.usageStatus==='manual-context-required'&&row.candidateStatus==='pending-independent-review'&&row.admissionGranted===false&&row.automaticMeaningAllowed===false&&row.productionApproved===false&&row.wholeNameMeaning===null&&row.wholeNameAssessment==='not-assessed'&&row.automaticNameRecommendation===false&&row.automaticSemanticCreditAllowed===false&&row.scoreDelta===0,'manual row cannot confer name/score/generation authority');
  need(equal(admission.records[index],{candidateId:row.candidateId,char:row.char,state:'pending-independent-review',usageStatus:'manual-context-required',admissionGranted:false}),'per-row source/admission differs');
  need(auditRow.char===row.char&&auditRow.candidateId===row.candidateId&&auditRow.pinyin===row.pinyin&&auditRow.tone===row.tone&&equal(auditRow.sourceCoordinates,row.sourceCoordinates)&&equal(auditRow.sourceDefinition,source.definition)&&auditRow.sourceEntrySha256===source.parsedEntrySha256&&auditRow.projectExplanation===row.project.meaning&&equal(auditRow.projectLimits,row.project.limits)&&auditRow.projectWish===null&&auditRow.finalUsageStatus==='manual-context-required'&&auditRow.automaticAdmissionGranted===false&&auditRow.formalCoverageAdded===0&&auditRow.scoreDelta===0&&auditRow.activation==='off','reviewed exact literal/project scope differs');
  const senseId=`moe-revised:${source.rawEntryIndex}:${source.rawHeteronymIndex}:${source.rawDefinitionIndex}`;
  return {row,original:source,defaultReading:selected[0],senseId,audit:auditedManualScope(auditRow)};
 });
 return freeze({rows,publication:{publicationVersion:PINS.publicationVersion,sourceCommit:PINS.sourceCommit,manifestSha256:PINS.manifest.sha256,profileSha256:hash(resources.get('m970/candidate/profile.json')),sourceSubsetSha256:hash(resources.get('m970/candidate/source-subset.json')),admissionSha256:hash(resources.get('m970/candidate/admission.json')),reviewSha256:manifest.sourceReviewSha256},pack:{packSha256:PINS.expectedPackSha256,activeVersion:PINS.expectedActiveVersion},coverage:{default521:coverage.default521.length,legacy217:coverage.previous217.length,automatic304:coverage.automatic304.length,onDemand60:coverage.onDemand60.length,defaultAndOnDemandUnion:coverage.defaultAndOnDemandUnion.length,optInFamily40:coverage.optInFamily40.length,reservationUnion:coverage.occupied.length,old10Duplicates:10,exactManualReferences:6,formalCoverageAdded:0}});
}
function auditedManualScope(row){return {reviewId:'M976-DATA-DELTA-REVIEW',judgment:row.judgment,context:row.context,suitability:row.suitability,selectedSenseChangedFromPrior:row.selectedSenseChangedFromPrior,usageStatus:'manual-context-required',admissionGranted:false};}
function empty(input,reasonCode){return freeze({schema:'single-character-meaning-options/1',char:input.char,pinyin:input.pinyin,status:'not-covered',scope:SCOPE,options:[],source:null,limits:[],requestMode:'manual-request',reasonCode,usageStatus:'manual-context-required',...BOUNDARIES});}

/** Independent, explicit manual-only entry. It is not registered in Service or the old query router. */
export function createManualM970MeaningQuery(config){
 const args=fields(config,['dataDir','publicationDir'],['dataDir']);
 need(typeof args.dataDir==='string'&&args.dataDir.trim().length>0,'literal dataDir required');
 if(Object.hasOwn(args,'publicationDir'))need(typeof args.publicationDir==='string'&&args.publicationDir.trim().length>0,'literal publicationDir required');
 const dataDir=resolve(args.dataDir),publicationDir=Object.hasOwn(args,'publicationDir')?resolve(args.publicationDir):join(dataDir,...PINS.publicationDirectory.split('/'));
 let validated;
 return Object.freeze({
  getSingleCharacterMeaningOptions(request){
   const input=fields(request,['mode','char','pinyin','tone','senseId','packSha256','activeVersion']);
   need(input.mode==='manual-request','only explicit manual-request is allowed');
   need(typeof input.char==='string'&&[...input.char].length===1&&!/[\uD800-\uDFFF\u0000-\u001f]/u.test(input.char),'single Unicode scalar required');
   need(typeof input.pinyin==='string'&&input.pinyin.trim().length>0&&Number.isInteger(input.tone)&&input.tone>=1&&input.tone<=5,'explicit pinyin/tone required');
   need(typeof input.senseId==='string'&&input.senseId.length>0&&typeof input.packSha256==='string'&&/^[a-f0-9]{64}$/.test(input.packSha256)&&typeof input.activeVersion==='string'&&input.activeVersion.length>0,'explicit pack/sense identity required');
   const bytes=authenticate(publicationDir,dataDir);validated??=validatePublication(bytes);
   if(input.packSha256!==validated.pack.packSha256||input.activeVersion!==validated.pack.activeVersion)return empty(input,'pack-mismatch');
   const selected=validated.rows.find(r=>r.row.char===input.char);if(!selected)return empty(input,'not-covered');
   if(input.pinyin!==selected.row.pinyin||input.tone!==selected.row.tone)return empty(input,'reading-mismatch');
   if(input.senseId!==selected.senseId)return empty(input,'sense-mismatch');
   const row=selected.row,source=selected.original;
   const option={char:row.char,pinyin:row.pinyin,tone:row.tone,defaultReading:selected.defaultReading,meaning:row.project.meaning,source:{sourceId:source.sourceId,word:source.word,pinyin:source.pinyin,tone:source.selectedToneFromDataset,definition:source.definition,sourcePOS:row.sourcePOS,readings:row.baselineCharacter.readings,originalFile:source.rawFile,originalSha256:source.rawFileSha256,rawEntryIndex:source.rawEntryIndex,rawHeteronymIndex:source.rawHeteronymIndex,rawDefinitionIndex:source.rawDefinitionIndex,parsedEntrySha256:source.parsedEntrySha256,definitionSha256:source.definitionSha256,license:source.license,completeOriginalEntry:source.completeOriginalEntry,allOriginalReadings:source.allReadings},project:row.project,limits:row.project.limits,batch:BATCH,scope:SCOPE,candidateId:row.candidateId,senseId:selected.senseId,usageStatus:'manual-context-required',manualReason:row.project.manualReason,uncertainty:selected.audit,publication:validated.publication,pack:validated.pack,...BOUNDARIES};
   return freeze(structuredClone({schema:'single-character-meaning-options/1',char:row.char,pinyin:row.pinyin,status:'available',scope:SCOPE,options:[option],source:BATCH,limits:row.project.limits,requestMode:'manual-request',reasonCode:null,usageStatus:'manual-context-required',...BOUNDARIES}));
  },
 });
}
