// Bounded exact-source registration only. Product modules are read as bytes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual as equal} from 'node:util';

import {M1035_EXTENSION_PROFILE} from './semantic-source-registration-1035.mjs';

export const M1011_EXTENSION_PROFILE=M1035_EXTENSION_PROFILE;
export const M1011_BASELINE_PROFILE=Object.freeze({file:'scripts/verification/extension-evidence/m1011/source-profile-m980-original.json',sha256:'6a5a23316970f84c90a82aa63ae849d4d8f51f7d22c0f96b51ca02afc43dd580',bytes:67273});
export const M1003_SOURCE_REVIEW=Object.freeze({file:'scripts/verification/extension-evidence/m1011/M1003-REVIEW.json',sha256:'ab8262ec798d912e8f1422890783ccabd9d72cdb145a27d4d176aafa0e2da766',bytes:29011});
export const M1003_SOURCE_MANIFEST=Object.freeze({file:'scripts/verification/extension-evidence/m1011/manifest.json',sha256:'50fa12c31371e42ef14c6101de7435087973ef03895262c4426a3a872fcc82b1',bytes:9561});
export const M1003_SOURCE_RECEIPT=Object.freeze({file:'scripts/verification/extension-evidence/m1011/receipt.json',sha256:'fd577aa767cb329f18583e95667a2fd03c2db44bd95322897080b61ea9d63b24',bytes:1508});
export const M1011_REVIEW_ID='M1003-COVERAGE-EXACT11';
export const M1011_SOURCE_VERSION='m1003-reviewed-coverage/1';
const sourceHead='c86600dcb9f51e02aeffa48ec74922fe983d6121',baseHead='b848a8cc88f12555d5cb80c0c8cf2ea435588c69';
const tuples=Object.freeze([
 ['src/domain/naming-coverage.ts','coverage-core4','coverage-set-aggregator','pure-rule-or-rule-data','main-service-bundle'],
 ['src/shared/naming-coverage.ts','coverage-core4','coverage-dto','type-contract','type-only'],
 ['src/shared/naming-coverage-api.ts','coverage-core4','coverage-api-runtime-guard','read-only-renderer','renderer-bundle'],
 ['src/main/naming-coverage-provider.ts','coverage-core4','coverage-trusted-provider','service-fixed-source-reader','main-service-bundle'],
 ['src/domain/naming-semantics-v6.ts','direct-qualification-support7','coverage-semantics-v6','pure-rule-or-rule-data','main-service-bundle'],
 ['src/domain/naming-semantics-v5.ts','direct-qualification-support7','coverage-semantics-v5','pure-rule-or-rule-data','main-service-bundle'],
 ['src/shared/character-reading.ts','direct-qualification-support7','coverage-character-reading','pure-rule-or-rule-data','main-service-bundle'],
 ['src/shared/character-reading-reference.ts','direct-qualification-support7','coverage-character-reading-reference','pure-rule-or-rule-data','main-service-bundle'],
 ['src/domain/naming-review-v7.mjs','direct-qualification-support7','coverage-review-v7','pure-rule-or-rule-data','main-service-bundle'],
 ['src/domain/naming-review-v7.d.mts','direct-qualification-support7','coverage-review-v7-types','type-contract','type-only'],
 ['src/main/naming-editorial-v7-data.ts','direct-qualification-support7','coverage-editorial-v7-reader','service-fixed-source-reader','main-service-bundle']
].map(row=>Object.freeze(row)));
export const M1011_SOURCE_FILES=Object.freeze(tuples.map(row=>row[0]));
export const M1011_CONTEXT_FILES=Object.freeze([
 'src/shared/types.ts','src/domain/meaning-context-next.mjs','src/main/m460-publication-data.mjs','src/main/meaning-context-data.ts','scripts/meaning-context-m460-b04-candidate.mjs','data/element-object/load-verified-element-package.mjs','src/shared/element-assessment.ts','data/naming-editorial-v6.json','data/naming-editorial-v4.json','data/naming-editorial-v5.json','src/shared/candidate-facts.ts','src/shared/naming-rules.ts','data/naming-character-meanings-v7.1-profile.json','data/naming-character-meanings-v7.1-admission.json','data/naming-character-meanings-v7.1-source-lock.json','data/naming-character-meanings-v7.1-manifest.json','data/raw/naming-character-meanings-v7.1-subset.json','src/main/source-byte-digest.mjs','data/naming-editorial-v7.json','data/naming-editorial-meanings-v7-source-lock.json'
]);
const moduleRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const need=(ok,message)=>{if(!ok)throw Object.assign(new Error('M1011 exact11 coverage registration: '+message),{code:'m1011-exact11-rejected'});};
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const safe=file=>typeof file==='string'&&file&&!/[\\:\u0000-\u001f]/u.test(file)&&!file.startsWith('/')&&file.split('/').every(part=>part&&part!=='.'&&part!=='..'&&!['__proto__','prototype','constructor'].includes(part));
function absolute(file,directory=false){need(typeof file==='string'&&path.isAbsolute(file),'absolute input required');const full=path.resolve(file),parsed=path.parse(full);let cursor=parsed.root;for(const part of full.slice(parsed.root.length).split(path.sep).filter(Boolean)){cursor=path.join(cursor,part);need(!fs.lstatSync(cursor).isSymbolicLink(),'linked input rejected');}const stat=fs.statSync(full);need(directory?stat.isDirectory():stat.isFile(),'ordinary input required');return full;}
function read(root,file){
 need(safe(file),'safe relative path required');const target=absolute(path.join(root,...file.split('/'))),fd=fs.openSync(target,'r');let before,after,bytes;
 try{before=fs.fstatSync(fd,{bigint:true});need(before.isFile(),'ordinary file required');bytes=fs.readFileSync(fd);after=fs.fstatSync(fd,{bigint:true});}finally{fs.closeSync(fd);}
 const current=fs.statSync(target,{bigint:true});for(const key of ['dev','ino','size','mtimeNs','ctimeNs'])need(before[key]===after[key]&&after[key]===current[key],'input changed during read');need(BigInt(bytes.length)===current.size,'input size changed');return{bytes,ref:{file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}};
}
export function verifyCoverageSourceRegistration(options){
 need(plain(options)&&equal(Object.keys(options),['root']),'only the canonical root option is accepted');const root=absolute(options.root,true);need(path.relative(absolute(moduleRoot,true),root)==='','canonical module checkout required');
 const refs=new Map(),checked=ref=>{const actual=read(root,ref.file);need(equal(actual.ref,ref),'fixed input differs: '+ref.file);refs.set(ref.file,ref);return actual;};
 const profile=JSON.parse(checked(M1011_EXTENSION_PROFILE).bytes),baseline=JSON.parse(checked(M1011_BASELINE_PROFILE).bytes),review=JSON.parse(checked(M1003_SOURCE_REVIEW).bytes),manifest=JSON.parse(checked(M1003_SOURCE_MANIFEST).bytes),receipt=JSON.parse(checked(M1003_SOURCE_RECEIPT).bytes);
 need(profile.profileId==='raw138-source-extensions-m1066-qimen/1'&&profile.sourceRoles.length===88&&profile.reviews.length===19&&profile.activation==='off'&&profile.productionAdmission===false,'fixed combined source scope/count differs');
 need(baseline.profileId==='raw138-source-extensions-m980-m754/1'&&baseline.sourceRoles.length===59&&baseline.reviews.length===16,'original59roles/16reviews baseline differs');
 need(equal(profile.sourceRoles.slice(0,59),baseline.sourceRoles)&&equal(profile.reviews.slice(0,16),baseline.reviews),'historical role/version or review objects changed');
 const unchanged=value=>Object.fromEntries(Object.entries(value).filter(([key])=>!['profileId','sourceRoles','reviews'].includes(key)));
 need(equal(unchanged(profile),unchanged(baseline)),'registration may only append exact11roles and one review');
 need(equal(profile.reviews[16],{id:M1011_REVIEW_ID,...M1003_SOURCE_REVIEW,decision:{pointer:'/result',value:'accepted-with-trusted-readonly-source-scope'},scope:'exact11 coverage4 plus direct qualification7; trusted read-only source only; external20 context only; no data/default/Store/Service/UI/build/release authority',productionApproval:false}),'exact source-review registration differs');
 need(review.schema==='m1003-exact11-source-review/1'&&review.reviewId===M1011_REVIEW_ID&&review.result==='accepted-with-trusted-readonly-source-scope'&&review.sourceCommit===sourceHead&&review.baseCommit===baseHead&&review.newP1===0&&review.newP2===0&&review.findings.length===0,'bounded exact11 source judgment differs');
 need(equal(review.scope,{total:11,coverageCore:4,qualificationSupport:7,allSourceFilesActuallyReadByPrimary:true,externalDependenciesApproved:false}),'source group scope differs');
 need(equal(review.authority,{exact11MayBeReferencedForSeparateSourceRegistration:true,registrationApplied:false,srcModified:false,profileModified:false,wholeSourceClosureApproved:false,sourceBuildApproved:false,dataSemanticsNewlyApproved:false,formalCoverageAdded:0,automaticRecommendationsApproved:false,traditionalUniqueElementsApproved:false,StoreSaveApproved:false,ServiceOrUIApproved:false,releaseApproved:false}),'review grants no data/default/Store/Service/UI/build/release authority');
 need(equal(review.counts,{baseMeaning:217,supplementalAutomatic:304,defaultIntersection:0,defaultUnion:521,onRequest:60,onRequestDefaultIntersection:0,displayMaterialUnion:581,originalElementLabels:257,originalUnknown:522,formalCoverageAdded:0}),'historical coverage labels differ');
 need(equal(review.qualification,{defaultReadingOnly:true,manualNotAutomaticallyIncluded:true,unknownNotGranted:true,wrongReadingOrPackRejected:true,onRequestIsNotAutomatic:true,completeWordCasesNotAddedToCharacterTotals:true,B04CandidateOff:true,imageryCandidateOff:true,traditionalUniqueElementsApproved:false,saveAuthority:false}),'coverage qualification or off/manual boundary differs');
 need(manifest.schema==='m1003-review-artifact-manifest/1'&&manifest.reviewId===M1011_REVIEW_ID&&manifest.files.length===54,'fixed source-review manifest differs');
 const reviewPins=manifest.files.filter(row=>row.path==='M1003-REVIEW.json');need(equal(reviewPins,[{path:'M1003-REVIEW.json',sha256:M1003_SOURCE_REVIEW.sha256,bytes:M1003_SOURCE_REVIEW.bytes}]),'manifest does not bind exact source-review bytes');
 need(receipt.schema==='m1003-source-review-receipt/1'&&receipt.reviewId===M1011_REVIEW_ID&&receipt.result===review.result&&receipt.sourceCommit===sourceHead&&receipt.baseCommit===baseHead&&receipt.files===11&&receipt.newP1===0&&receipt.newP2===0&&receipt.reviewSha256===M1003_SOURCE_REVIEW.sha256&&receipt.manifestSha256===M1003_SOURCE_MANIFEST.sha256&&equal(receipt.authority,review.authority)&&equal(receipt.counts,review.counts),'receipt does not match the fixed bounded review');
 const paths=[...M1011_SOURCE_FILES].sort(),samePaths=(rows,key='file')=>Array.isArray(rows)&&rows.length===11&&new Set(rows.map(row=>row[key])).size===11&&equal(rows.map(row=>row[key]).sort(),paths);
 need(samePaths(review.rows)&&samePaths(profile.sourceRoles.slice(59,70)),'missing, extra, duplicated or foreign registration subject');
 const fixedRows=manifest.files.filter(row=>row.path.startsWith('fixed/src/')).map(row=>({...row,file:row.path.slice('fixed/'.length)}));need(samePaths(fixedRows),'manifest fixed source set differs from exact11');
 const tagged=profile.sourceRoles.filter(row=>row.versions.some(v=>v.version===M1011_SOURCE_VERSION||v.reviewIds.includes(M1011_REVIEW_ID)));need(samePaths(tagged),'review/version borrowed by an external context role');
 need(equal(review.externalContext.direct20,M1011_CONTEXT_FILES)&&review.externalContext.additionalApproval===0&&!M1011_CONTEXT_FILES.some(file=>paths.includes(file)),'external20 remain context only');
 const selected=tuples.map(([file,subgroup,roleId,readerClass,compileScope])=>{
  const judgment=review.rows.find(row=>row.file===file),sealed=fixedRows.find(row=>row.file===file),roles=profile.sourceRoles.filter(row=>row.file===file);need(roles.length===1,'missing or duplicate source role');const role=roles[0];
  need(judgment.subgroup===subgroup&&judgment.reviewId===M1011_REVIEW_ID&&judgment.sourceCommit===sourceHead&&judgment.baseCommit===baseHead&&judgment.baseByteIdentical===true&&judgment.readerClass===readerClass&&judgment.compileScope===compileScope&&judgment.judgment==='accepted-for-bounded-readonly-source-registration'&&Array.isArray(judgment.verified)&&judgment.verified.length>0&&Array.isArray(judgment.limits)&&judgment.limits.length>0,'per-file judgment/classification/limits differ');
  need(sealed.sha256===judgment.sha256&&sealed.bytes===judgment.bytes,'manifest and source-review pin differ');
  const actual=checked({file,sha256:judgment.sha256,bytes:judgment.bytes});need(createHash('sha1').update('blob '+actual.bytes.length+'\0').update(actual.bytes).digest('hex')===judgment.gitBlob,'reviewed Git blob differs');
  need(role.role===roleId&&role.readerClass===readerClass&&role.compileScope===compileScope&&role.storeRequiredSourceRole===false&&role.versions.length===1,'source role/type-runtime classification differs');
  need(equal(role.versions[0],{version:M1011_SOURCE_VERSION,pin:{sha256:judgment.sha256,bytes:judgment.bytes},sourceCommit:sourceHead,reviewIds:[M1011_REVIEW_ID]}),'source version or review binding differs');
  return{...actual.ref,gitBlob:judgment.gitBlob,subgroup,role:roleId,readerClass,compileScope,version:M1011_SOURCE_VERSION,sourceCommit:sourceHead,reviewIds:[M1011_REVIEW_ID],judgment:judgment.judgment,verified:judgment.verified,limits:judgment.limits,reviewRef:M1003_SOURCE_REVIEW};
 });
 for(const ref of refs.values())checked(ref);
 return{status:'matched-exact11-reviewed-coverage-source-compatibility',scope:'4coverage+7direct qualification source files; trusted readonly/known inputs only',selected,sourceRegistrationMatched:true,sourceReviewHead:sourceHead,reviewRef:M1003_SOURCE_REVIEW,manifestRef:M1003_SOURCE_MANIFEST,receiptRef:M1003_SOURCE_RECEIPT,baselineRef:M1011_BASELINE_PROFILE,preservedSourceRoles:59,preservedReviews:16,externalContextFiles:[...M1011_CONTEXT_FILES],externalContextFilesNewlyRegistered:0,reviewedCoverageLabels:{...review.counts},coverageRecountExecuted:false,manualCoverageAdded:0,defaultOffCoverageAdded:0,formalCoverageAdded:0,sourceBuildApproved:false,wholeSourceClosureApproved:false,dataSemanticsNewlyApproved:false,productionApproved:false,StoreSaveApproved:false,ServiceOrUIApproved:false,releaseApproved:false,activation:'off',outerSealsResealed:false};
}
