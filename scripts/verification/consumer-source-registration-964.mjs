// Exact-reader pattern reused from M929/M944; no consumer module is evaluated.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual as equal} from 'node:util';
import {M980_EXTENSION_PROFILE} from './imagery-source-registration-980.mjs';

export const M964_EXTENSION_PROFILE=M980_EXTENSION_PROFILE;
export const M957_SOURCE_REVIEW=Object.freeze({file:'scripts/verification/extension-evidence/m964/M957-REVIEW.json',sha256:'5ebed106488ffb3b37568bd6b2564f0324fb3b239a1c64ff34578a9ed3dece83',bytes:17920});
export const M957_SOURCE_MANIFEST=Object.freeze({file:'scripts/verification/extension-evidence/m964/M957-manifest.json',sha256:'9a149d12806b911b29d4efe0f0419df349f604591f42c3c825c5ea13e478347b',bytes:3658});
export const M964_REVIEW_ID='M957-CONSUMER-EXACT8';
export const M964_SOURCE_VERSION='m957-reviewed-consumer/1';
const tuples=Object.freeze([
 ['src/domain/candidate2-naming-consumer-v1.ts','consumer-foundation','pure-rule-or-rule-data'],
 ['src/shared/candidate2-naming-consumer-v1.ts','consumer-foundation','pure-rule-or-rule-data'],
 ['src/main/candidate2-naming-consumer-v1.ts','consumer-foundation','service-fixed-source-reader'],
 ['src/main/candidate2-naming-data-v1.ts','consumer-foundation','service-fixed-source-reader'],
 ['src/main/candidate2-naming-runtime-v1.ts','consumer-foundation','service-fixed-source-reader'],
 ['src/main/project-application-v132-r2-json.ts','consumer-foundation','pure-rule-or-rule-data'],
 ['src/main/candidate2-naming-eligibility-response-v1.ts','current-direct-support','pure-rule-or-rule-data'],
 ['src/shared/candidate2-naming-eligibility-v1.ts','current-direct-support','pure-rule-or-rule-data']
].map(row=>Object.freeze(row)));
export const M964_SOURCE_FILES=Object.freeze(tuples.map(row=>row[0]));
const sourceHead='f8e272b1b0d077019ca2d267709378df17e405d9',observedHead='841bddd49096a09f2b75b96a7976e70c638266c9';
const moduleRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const need=(ok,message)=>{if(!ok)throw Object.assign(new Error('M964 exact8 source registration: '+message),{code:'m964-exact8-rejected'});};
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const safe=file=>typeof file==='string'&&file&&!/[\\:\u0000-\u001f]/u.test(file)&&!file.startsWith('/')&&file.split('/').every(part=>part&&part!=='.'&&part!=='..');
function absolute(file,directory=false){need(typeof file==='string'&&path.isAbsolute(file),'absolute input required');const full=path.resolve(file),parsed=path.parse(full);let cursor=parsed.root;for(const part of full.slice(parsed.root.length).split(path.sep).filter(Boolean)){cursor=path.join(cursor,part);need(!fs.lstatSync(cursor).isSymbolicLink(),'linked input rejected');}const stat=fs.statSync(full);need(directory?stat.isDirectory():stat.isFile(),'ordinary input required');return full;}
function read(root,file){
 need(safe(file),'safe relative path required');const target=absolute(path.join(root,...file.split('/'))),fd=fs.openSync(target,'r');let before,after,bytes;
 try{before=fs.fstatSync(fd,{bigint:true});bytes=fs.readFileSync(fd);after=fs.fstatSync(fd,{bigint:true});}finally{fs.closeSync(fd);}
 const current=fs.statSync(target,{bigint:true});for(const key of ['dev','ino','size','mtimeNs','ctimeNs'])need(before[key]===after[key]&&after[key]===current[key],'input changed during read');need(BigInt(bytes.length)===current.size,'input size changed');return{bytes,ref:{file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}};
}
export function verifyConsumerSourceRegistration(options){
 need(plain(options)&&equal(Object.keys(options),['root']),'only the canonical root option is accepted');const root=absolute(options.root,true);need(path.relative(absolute(moduleRoot,true),root)==='','canonical module checkout required');
 const refs=new Map(),checked=ref=>{const actual=read(root,ref.file);need(equal(actual.ref,ref),'fixed input differs: '+ref.file);refs.set(ref.file,ref);return actual;};
 const profile=JSON.parse(checked(M964_EXTENSION_PROFILE).bytes),review=JSON.parse(checked(M957_SOURCE_REVIEW).bytes),manifest=JSON.parse(checked(M957_SOURCE_MANIFEST).bytes);
 need(profile.profileId==='raw138-source-extensions-m1066-qimen/1'&&profile.sourceRoles.length===88&&profile.reviews.length===19&&profile.productionAdmission===false&&profile.activation==='off','fixed combined source map scope/count differs');
 need(review.schema==='M957-consumer-source-review/1'&&review.fixedHead===sourceHead&&review.verdict==='pass-bounded-exact8-source-review'&&equal(review.scope,{total:8,foundation:6,support:2,allEightIndependentlyRead:true,externalDependencyApproval:false})&&equal(review.severityCounts,{P1:0,P2:0,P3:0})&&review.findings.length===0,'exact8 review or bounded scope differs');
 need(equal(review.authority,{exact8SourceReviewGranted:true,mayReferenceForExact8SourceRegistration:true,sourceRegistrationPerformed:false,activeGateChanged:false,sourceBuildApproved:false,wholeClosureApproved:false,fixedCoreEfficacyApproved:false,oldE01Or906IdentityChanged:false,productionAdmission:false,StoreSaveAuthority:false,packagingApproved:false,releaseApproved:false,completeTraditionalInterpretationCertified:false}),'review authority is source-only; build/Store/core/release grants are forbidden');
 need(manifest.schema==='m957-review-artifact-manifest/1'&&manifest.task==='M957-CONSUMER-SOURCE-REVIEW'&&manifest.fixedHead===sourceHead&&manifest.finalObservedHead===observedHead&&manifest.exact8CurrentStillMatched===true&&manifest.exact8WorkingTreeClean===true,'manifest source versions differ');
 const reviewRecords=manifest.artifacts.filter(row=>path.win32.basename(row.file)==='REVIEW.json');need(manifest.artifactCount===6&&manifest.artifacts.length===6&&reviewRecords.length===1&&reviewRecords[0].sha256===M957_SOURCE_REVIEW.sha256&&reviewRecords[0].bytes===M957_SOURCE_REVIEW.bytes,'manifest does not bind the original review bytes');
 const expected=[...M964_SOURCE_FILES].sort(),samePaths=rows=>Array.isArray(rows)&&rows.length===8&&new Set(rows.map(row=>row.file)).size===8&&equal(rows.map(row=>row.file).sort(),expected);
 need(samePaths(review.files)&&samePaths(manifest.scopeFiles),'missing, extra, duplicated or foreign review subject');
 const tagged=profile.sourceRoles.filter(row=>row.versions.some(v=>v.version===M964_SOURCE_VERSION||v.reviewIds.includes(M964_REVIEW_ID)));
 need(samePaths(tagged),'review or version borrowed by a non-group context source');
 const selected=tuples.map(([file,subgroup,readerClass])=>{
  const judgment=review.files.find(row=>row.file===file),sealed=manifest.scopeFiles.find(row=>row.file===file),roles=profile.sourceRoles.filter(row=>row.file===file);need(roles.length===1,'missing or duplicate source role');const role=roles[0];
  need(judgment.subgroup===subgroup&&judgment.judgment==='pass-bounded-source-review'&&judgment.matchesMap===true&&judgment.findings.length===0&&typeof judgment.rationale==='string'&&judgment.rationale.length>0&&typeof judgment.limits==='string'&&judgment.limits.length>0,'per-file actual review judgment/limits missing');
  need(equal(sealed,{file,bytes:judgment.bytes,sha256:judgment.sha256,gitBlob:judgment.gitBlob}),'manifest and review source pins differ');
  const actual=checked({file,sha256:judgment.sha256,bytes:judgment.bytes});need(createHash('sha1').update('blob '+actual.bytes.length+'\0').update(actual.bytes).digest('hex')===judgment.gitBlob,'reviewed Git blob differs');
  need(role.readerClass===readerClass&&role.compileScope==='main-service-bundle'&&role.storeRequiredSourceRole===false&&role.versions.length===1,'source compilation class or exact version count differs');
  need(equal(role.versions[0],{version:M964_SOURCE_VERSION,pin:{sha256:judgment.sha256,bytes:judgment.bytes},sourceCommit:sourceHead,reviewIds:[M964_REVIEW_ID]}),'wrong source version or review binding');
  return{...actual.ref,gitBlob:judgment.gitBlob,subgroup,role:role.role,readerClass,compileScope:role.compileScope,version:M964_SOURCE_VERSION,sourceCommit:sourceHead,reviewIds:[M964_REVIEW_ID],judgment:judgment.judgment,rationale:judgment.rationale,limits:judgment.limits,reviewRef:M957_SOURCE_REVIEW};
 });
 for(const ref of refs.values())checked(ref);
 return{status:'matched-exact8-reviewed-source-compatibility',scope:'6 consumer foundation +2 current eligibility support source files only',selected,sourceRegistrationMatched:true,reviewRef:M957_SOURCE_REVIEW,manifestRef:M957_SOURCE_MANIFEST,sourceReviewHead:sourceHead,laterSameByteHead:observedHead,externalContextFilesRegistered:0,oldE01Or906IdentityChanged:false,sourceBuildApproved:false,productionApproved:false,StoreSaveAuthority:false,wholeClosureApproved:false,activation:'off',traditionalStatus:'unknown',outerSealsResealed:false};
}
