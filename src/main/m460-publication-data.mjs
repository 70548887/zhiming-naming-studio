import {readFileSync,lstatSync} from 'node:fs';
import {resolve,sep,join} from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual as equal,types as nodeUtilTypes} from 'node:util';
import {createNamingCharacterReview71,assertPlainJson} from '../domain/naming-review-v7.mjs';
import {verifyM393MeaningCandidate} from './m393-meaning-candidate.mjs';
import {M460_PUBLICATION_PINS} from './m460-publication-pins.mjs';
import {digestSourceBytes} from './source-byte-digest.mjs';

const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const pins=freeze(structuredClone(M460_PUBLICATION_PINS));
const hash=b=>createHash('sha256').update(b).digest('hex');
const need=(ok,message)=>{if(!ok)throw Error('M460 7.1 publication: '+message);};
const authenticated=new WeakSet(),savedRegistry=new Map();
const normalizedSource=s=>({id:s.id,name:s.name,url:s.url,commit:s.commit,license:s.license,files:[...s.files],sha256:s.sha256,note:s.note});
const displayLimit='仅作独立逐字词义展示；姓名用途待语境确认，不替换整名解释、待审提醒或评分。';
export const isM460PublicationData=value=>value!==null&&typeof value==='object'&&authenticated.has(value);
export const m460PublicationForSaved=sha256=>savedRegistry.get(sha256);

const optionalCoreFiles=Object.freeze(Object.values(pins.files).map(row=>row.file).sort());
const missingOptionalFile=error=>{
 if(error===null||typeof error!=='object'||nodeUtilTypes.isProxy(error)||!nodeUtilTypes.isNativeError(error))return false;
 const descriptor=Object.getOwnPropertyDescriptor(error,'code');
 return !!descriptor&&Object.hasOwn(descriptor,'value')&&descriptor.value==='ENOENT';
};
/** Fresh filesystem description only. Never an admission or caller-supplied authority. */
export function probeM460PublicationPresence(directory){
 need(arguments.length===1&&typeof directory==='string','presence requires one literal directory string');
 const base=resolve(directory),files=[];
 for(const file of optionalCoreFiles){
  const absolute=resolve(base,...file.slice(5).split('/'));need(absolute.startsWith(base+sep),'optional file escaped data directory');
  let info;try{info=lstatSync(absolute);}catch(error){if(missingOptionalFile(error)){files.push({file,state:'absent'});continue;}throw error;}
  need(info.isFile(),'optional publication is not a regular file: '+file);
  let bytes;try{bytes=readFileSync(absolute);}catch(error){if(missingOptionalFile(error)){files.push({file,state:'absent'});continue;}throw error;}
  files.push({file,state:'present',bytes:bytes.length,sha256:hash(bytes)});
 }
 const count=files.filter(row=>row.state==='present').length;
 need(count===0||count===optionalCoreFiles.length,'partial optional publication: '+count+' of '+optionalCoreFiles.length+' core files present');
 return freeze({schema:'m460-publication-presence/1',mode:count===0?'all-absent':'all-present',files});
}

/** The same existing schemas are used for the old40 and proposed60 publications.
 * No caller DTO, hash or boolean can select an approved publication. */
export function loadM460V71Publication(directory){
 need(arguments.length===1&&typeof directory==='string','optional loader requires one literal directory string');
 const presence=probeM460PublicationPresence(directory);if(presence.mode==='all-absent')return undefined;
 const cache=new Map(),base=resolve(directory);
 const bytes=file=>{
  need(typeof file==='string'&&file.startsWith('data/')&&!file.includes('\\')&&!file.includes(':')&&file.split('/').every(p=>p&&p!=='.'&&p!=='..'),'unsafe source path');
  const p=resolve(base,...file.slice(5).split('/'));need(p.startsWith(base+sep),'source escaped data directory');
  if(!cache.has(file))cache.set(file,readFileSync(p));return cache.get(file);
 };
 const parse=file=>{const v=JSON.parse(bytes(file).toString('utf8'));assertPlainJson(v);return v;};
 for(const row of Object.values(pins.files))need(digestSourceBytes(bytes(row.file))===row.sha256,'fixed profile/admission/manifest identity differs: '+row.file);
 const profile=parse(pins.files.profile.file),admission=parse(pins.files.admission.file),lock=parse(pins.files['source-lock'].file),manifest=parse(pins.files.manifest.file),subset=parse(pins.files.subset.file);
 need(lock.version===pins.ruleVersion&&lock.profileVersion===pins.profileVersion&&lock.hashConvention==='sha256(JSON.stringify(fileHashes)); sorted relative path keys'&&lock.sources.length===1,'existing source-lock schema/version differs');
 const source=lock.sources[0];need(source.id===pins.sourceId&&equal(source.files,pins.sourceFiles)&&equal(Object.keys(source.fileHashes).sort(),pins.sourceFiles),'source closure differs');
 const actual={};for(const file of source.files){actual[file]=digestSourceBytes(bytes(file));need(actual[file]===source.fileHashes[file],'source file differs: '+file);}
 need(hash(JSON.stringify(actual))===pins.sourceAggregateSha256&&source.sha256===pins.sourceAggregateSha256,'source aggregate differs');
 const published=[...source.files,pins.files['source-lock'].file].sort();
 need(manifest.schema==='naming-character-meanings-v7.1-publication/1'&&manifest.ruleVersion===pins.ruleVersion&&manifest.profileVersion===pins.profileVersion&&manifest.sourceId===pins.sourceId&&manifest.exactCharacterRows===60&&equal(manifest.files.map(r=>r.file),published),'existing publication manifest closure differs');
 for(const row of manifest.files)need(digestSourceBytes(bytes(row.file))===row.sha256&&bytes(row.file).length===row.bytes,'publication file bytes differ: '+row.file);
 need(profile.schema==='naming-character-meanings-profile/1'&&subset.schema==='naming-character-meanings-v7.1-subset/1'&&equal(profile.cases,subset.cases)&&equal(profile.cases.map(r=>r.caseId).sort(),pins.exactCaseIds),'existing profile/subset identity differs');
 const rootDecision=parse(pins.files.decision.file);
 need(rootDecision.schema==='naming-root-admission-decision/1'&&rootDecision.decision==='approved-for-controlled-integration'&&rootDecision.publicationDecision==='approved-character-notes'&&rootDecision.ruleVersion===pins.ruleVersion&&rootDecision.testOnly===false&&rootDecision.count===60&&rootDecision.additionalCharacterNotes===20&&equal(rootDecision.approvedCaseIds,pins.exactCaseIds),'actual root exact60 approval absent');
 need(rootDecision.profile.sha256===pins.files.profile.sha256&&rootDecision.review.sha256===pins.approvalAuthority.independentReviewSha256&&rootDecision.candidateManifest.sha256===pins.approvalAuthority.candidateManifestSha256&&rootDecision.scope===pins.approvalAuthority.scope&&equal(rootDecision.usageReviewRequired,pins.approvalAuthority.usageReviewRequired),'root approval provenance/scope differs');
 need(rootDecision.wholeNameAssessment==='not-assessed'&&rootDecision.wholeNameMeaning===null&&rootDecision.automaticNameRecommendation===false&&rootDecision.automaticSemanticCreditAllowed===false&&rootDecision.scoreDelta===0&&rootDecision.rankingDelta===0&&admission.reviewedSelection.rootDecisionSha256===pins.files.decision.sha256,'root approval acquired name authority or lost byte binding');
 const old=parse('data/naming-character-meanings-v7.1-profile.json');
 need(equal(profile.cases.slice(0,40),old.cases),'historical40 rows were changed');
 const lexical=verifyM393MeaningCandidate(join(directory,'m460-lexical'),directory);
 const expectedAdditions=lexical.cases.map(r=>{const copy=structuredClone(r);delete copy.usageReviewRequired;copy.editorial.limits=[...copy.editorial.limits,displayLimit];return copy;});
 need(equal(profile.cases.slice(40),expectedAdditions),'new20 source/reading/POS/glyph/editorial scope differs from reviewed r3 plus display-only limit');
 need(admission.schema==='naming-character-meanings-admission/1'&&admission.profileVersion===pins.profileVersion&&admission.ruleVersion===pins.ruleVersion&&admission.sourceId===pins.sourceId&&admission.profileSha256===pins.files.profile.sha256,'existing admission identity differs');
 need(admission.scope==='per-character-project-explanation-only'&&admission.wholeNameAssessment==='not-assessed'&&admission.wholeNameMeaning===null&&admission.automaticNameRecommendation===false&&admission.automaticSemanticCreditAllowed===false&&admission.scoreDelta===0,'admission acquired name/score authority');
 const pending=admission.decision==='candidate-awaiting-independent-review'&&admission.activation==='off'&&admission.testOnly===true&&equal(admission.approvedCaseIds,[]);
 if(pending){need(manifest.publicationState==='candidate-awaiting-independent-admission','pending publication state differs');return undefined;}
 need(admission.decision==='approved-character-notes'&&admission.activation===pins.ruleVersion&&admission.testOnly===false&&equal(admission.approvedCaseIds,pins.exactCaseIds)&&manifest.publicationState==='fixed-approved-character-display-publication','explicit full publication admission absent');
 const identity=freeze({ruleVersion:pins.ruleVersion,profileVersion:pins.profileVersion,sourceId:pins.sourceId,subsetSha256:pins.files.subset.sha256,profileSha256:pins.files.profile.sha256,admissionSha256:pins.files.admission.sha256,lockSha256:pins.files['source-lock'].sha256,manifestSha256:pins.files.manifest.sha256,sourceSha256:pins.sourceAggregateSha256});
 const record=freeze(normalizedSource(source));
 const data=freeze({sources:[record],source:record,identity,lookup:createNamingCharacterReview71(profile,admission,identity),profile,admission,subset});
 authenticated.add(data);savedRegistry.set(source.sha256,data);return data;
}
