// Exact source byte/review correspondence only. No product module is evaluated.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual as equal} from 'node:util';

import {M1066_EXTENSION_PROFILE} from './qimen-cultural-source-registration-1066.mjs';

export const M1035_EXTENSION_PROFILE=M1066_EXTENSION_PROFILE;
export const M1035_BASELINE_PROFILE=Object.freeze({file:'scripts/verification/extension-evidence/m1035/source-profile-m1011-original.json',sha256:'bac98a05d14b8206fe8022d0c4b8145569e971596efe942c50bfe813e1b51d7e',bytes:74721});
export const M1025_SOURCE_REVIEW=Object.freeze({file:'scripts/verification/extension-evidence/m1035/M1025-REVIEW.json',sha256:'ca7167e935cfec61a56f3dd98b79a5f19463aa7c7e9ba33416921ce7ba1031f8',bytes:17501});
export const M1025_SOURCE_MANIFEST=Object.freeze({file:'scripts/verification/extension-evidence/m1035/manifest.json',sha256:'3edbd3b7dbdf936371c7c80a0bb17f7b2ea8217644e59e14a13321130cbec44a',bytes:6572});
export const M1025_SOURCE_RECEIPT=Object.freeze({file:'scripts/verification/extension-evidence/m1035/receipt.json',sha256:'c61e2c8f24e16448b290b17d5b4fdaccccf96e0e0c5d59bd5c175ea8808c6db4',bytes:1045});
export const M1035_REVIEW_ID='M1025-SEMANTIC-EXACT3';
export const M1035_SOURCE_VERSION='m1025-reviewed-semantic/1';
const sourceHead='c86600dcb9f51e02aeffa48ec74922fe983d6121';
const tuples=Object.freeze([
 ['src/domain/naming-semantic-admission-v72.ts','policy-domain','semantic-v72-policy-domain','pure-rule-or-rule-data','accepted-for-bounded-exact-source-registration'],
 ['src/shared/naming-semantic-admission-v72.ts','runtime-and-type-contract','semantic-v72-runtime-contract','pure-rule-or-rule-data','accepted-runtime-contract-not-type-only'],
 ['src/main/naming-semantic-admission-v72-data.ts','authenticated-resource-owner','semantic-v72-fixed-publication-owner','service-fixed-source-reader','accepted-for-trusted-owner-fixed-resource-source-scope']
].map(row=>Object.freeze(row)));
export const M1035_SOURCE_FILES=Object.freeze(tuples.map(row=>row[0]));
const legacyFacade='src/main/naming-semantic-generation-v72.ts';
const contextCallers=Object.freeze([legacyFacade,'src/main/naming-semantic-generation-m923.ts','src/main/naming-semantic-m923.ts','src/main/reviewed-naming-data-generation.ts','src/main/reviewed-naming-data-resources.ts','src/main/reviewed-naming-data-verification.ts','src/renderer/SemanticCharacterEvidenceView.tsx','src/shared/candidate2-semantic-composition-v1.ts','src/shared/naming-semantic-m923.ts','src/shared/reviewed-naming-data.ts']);
const legacySupports=Object.freeze(['src/domain/naming.ts','src/domain/naming-v7.ts','src/main/naming-editorial-v7-data.ts','src/main/naming-meaning-review.ts','src/shared/naming-rules.ts']);
const moduleRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const need=(ok,message)=>{if(!ok)throw Object.assign(new Error('M1035 exact3 semantic registration: '+message),{code:'m1035-exact3-rejected'});};
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const safe=file=>typeof file==='string'&&file&&!/[\\:\u0000-\u001f]/u.test(file)&&!file.startsWith('/')&&file.split('/').every(part=>part&&part!=='.'&&part!=='..'&&!['__proto__','prototype','constructor'].includes(part));
function absolute(file,directory=false){need(typeof file==='string'&&path.isAbsolute(file),'absolute input required');const full=path.resolve(file),parsed=path.parse(full);let cursor=parsed.root;for(const part of full.slice(parsed.root.length).split(path.sep).filter(Boolean)){cursor=path.join(cursor,part);need(!fs.lstatSync(cursor).isSymbolicLink(),'linked input rejected');}const stat=fs.statSync(full);need(directory?stat.isDirectory():stat.isFile(),'ordinary input required');return full;}
function read(root,file){
 need(safe(file),'safe relative path required');const target=absolute(path.join(root,...file.split('/'))),fd=fs.openSync(target,'r');let before,after,bytes;
 try{before=fs.fstatSync(fd,{bigint:true});need(before.isFile(),'ordinary file required');bytes=fs.readFileSync(fd);after=fs.fstatSync(fd,{bigint:true});}finally{fs.closeSync(fd);}
 const current=fs.statSync(target,{bigint:true});for(const key of ['dev','ino','size','mtimeNs','ctimeNs'])need(before[key]===after[key]&&after[key]===current[key],'input changed during read');need(BigInt(bytes.length)===current.size,'input size changed');return{bytes,ref:{file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}};
}
export function verifySemanticSourceRegistration(options){
 need(plain(options)&&equal(Object.keys(options),['root']),'only the canonical root option is accepted');const root=absolute(options.root,true);need(path.relative(absolute(moduleRoot,true),root)==='','canonical module checkout required');
 const refs=new Map(),checked=ref=>{const actual=read(root,ref.file);need(equal(actual.ref,ref),'fixed input differs: '+ref.file);refs.set(ref.file,ref);return actual;};
 const profile=JSON.parse(checked(M1035_EXTENSION_PROFILE).bytes),baseline=JSON.parse(checked(M1035_BASELINE_PROFILE).bytes),review=JSON.parse(checked(M1025_SOURCE_REVIEW).bytes),manifest=JSON.parse(checked(M1025_SOURCE_MANIFEST).bytes),receipt=JSON.parse(checked(M1025_SOURCE_RECEIPT).bytes);
 need(profile.profileId==='raw138-source-extensions-m1066-qimen/1'&&profile.sourceRoles.length===88&&profile.reviews.length===19&&profile.activation==='off'&&profile.productionAdmission===false,'fixed combined source scope/count differs');
 need(baseline.profileId==='raw138-source-extensions-m1011-coverage/1'&&baseline.sourceRoles.length===70&&baseline.sourceRoles.reduce((n,r)=>n+r.versions.length,0)===75&&baseline.reviews.length===17,'original70roles/75versions/17reviews baseline differs');
 need(equal(profile.sourceRoles.slice(0,70),baseline.sourceRoles)&&equal(profile.reviews.slice(0,17),baseline.reviews),'historical role/version or review objects changed');
 const unchanged=value=>Object.fromEntries(Object.entries(value).filter(([key])=>!['profileId','sourceRoles','reviews'].includes(key)));
 need(equal(unchanged(profile),unchanged(baseline)),'registration may only append exact3roles and one review');
 need(equal(profile.reviews[17],{id:M1035_REVIEW_ID,...M1025_SOURCE_REVIEW,decision:{pointer:'/result',value:'accepted-bounded-exact3-source-scope'},scope:'exact3 semantic policy/runtime contract/trusted main owner only; facade and external context excluded; no data/default/Store/Service/UI/build/release authority',productionApproval:false}),'exact source-review registration differs');
 need(review.schema==='m1025-exact3-source-review/1'&&review.reviewId===M1035_REVIEW_ID&&review.result==='accepted-bounded-exact3-source-scope'&&review.sourceCommit===sourceHead&&review.newP1===0&&review.newP2===0&&review.findings.length===0,'bounded exact3 source judgment differs');
 need(equal(review.scope,{exactSourceFiles:3,runtimeSourceFiles:3,typeOnlySourceFiles:0,mainCapabilitySeparateFromStructuralHandle:true}),'source group/type-runtime scope differs');
 need(equal(review.authority,{exact3MayBeReferencedBySeparateSourceRegistration:true,registrationPerformed:false,adjacentFacadeRegistration:false,externalContextApproval:false,wholeSourceClosureApproved:false,sourceBuildApproved:false,StoreSaveApproved:false,automaticRecommendationsApproved:false,traditionalAuthority:false,formalCoverageAdded:0,family40Approval:false,releaseApproved:false}),'review grants no facade/external/default/Store/build/release authority');
 need(equal(review.policyScope,{dataReview:'M744 original9 manual-reference suitability,叶pending; no generation/source/automatic/default permission from data review.',editorialPolicy:'Separate fixedM752-r2 project editorial intent decisions; nine conditional/reusable single-character intents, not dictionary authority or whole-name endorsement.',general:['纪','年','岁'],explicitTheme:{邦:'civic-homeland',沫:'water-bubbles',纶:'textile-ribbon',农:'agriculture',作:'literary-artwork',萧:'herb-plant'},requiresDoubleGivenName:['纶','作','萧'],pending:['叶'],scoreDelta:0,wholeNameMeaning:null,traditionalAuthority:false,automaticRecommendation:false,newCoverage:0,currentActivation:'not-current',productionApproved:false}),'manual/source versus fixed project-intent policy boundary differs');
 need(equal(review.countSeparation,{M1003:{default521:521,onRequest60:60,displayUnion581:581},oldCompatibilityPools:{withoutThemes:524,allThemes:530,basis:'old policy-pool checks with supplied legacy521, not current default coverage or a fresh generator allowlist'},currentAudit:{policyOnlyEmptyPoolNoThemes:3,policyOnlyEmptyPoolAllThemes:9,defaultCoverageAdded:0},family40Included:false}),'distinct fixed coverage labels differ');
 need(manifest.schema==='m1025-source-audit-manifest/1'&&manifest.reviewId===M1035_REVIEW_ID&&manifest.files.length===38,'fixed source-review manifest differs');
 const reviewPins=manifest.files.filter(row=>row.path==='M1025-REVIEW.json');need(equal(reviewPins,[{path:'M1025-REVIEW.json',bytes:M1025_SOURCE_REVIEW.bytes,sha256:M1025_SOURCE_REVIEW.sha256}]),'manifest does not bind exact review bytes');
 need(receipt.schema==='m1025-source-audit-receipt/1'&&receipt.reviewId===M1035_REVIEW_ID&&receipt.result===review.result&&receipt.sourceCommit===sourceHead&&receipt.files===3&&receipt.runtimeFiles===3&&receipt.typeOnlyFiles===0&&receipt.newP1===0&&receipt.newP2===0&&receipt.reviewSha256===M1025_SOURCE_REVIEW.sha256&&receipt.manifestSha256===M1025_SOURCE_MANIFEST.sha256&&equal(receipt.authority,review.authority),'receipt does not match fixed bounded review');
 const paths=[...M1035_SOURCE_FILES].sort(),samePaths=(rows,key='file')=>Array.isArray(rows)&&rows.length===3&&new Set(rows.map(row=>row[key])).size===3&&equal(rows.map(row=>row[key]).sort(),paths);
 need(samePaths(review.rows)&&samePaths(profile.sourceRoles.slice(70,73)),'missing, extra, duplicated or foreign registration subject');
 const fixedRows=manifest.files.filter(row=>row.path.startsWith('fixed/src/')).map(row=>({...row,file:row.path.slice('fixed/'.length)}));need(samePaths(fixedRows),'manifest fixed source set differs from exact3');
 const tagged=profile.sourceRoles.filter(row=>row.versions.some(v=>v.version===M1035_SOURCE_VERSION||v.reviewIds.includes(M1035_REVIEW_ID)));need(samePaths(tagged),'review/version borrowed by facade or external context');
 need(review.adjacent.file===legacyFacade&&review.adjacent.reviewedAsNewSubject===false&&review.adjacent.registrationGranted===false&&review.adjacent.additionalSourceReview===null&&review.adjacent.actualSrcImporterFound===false&&!profile.sourceRoles.some(row=>row.file===legacyFacade),'old test-only facade is not registered by association');
 need(equal(review.externalContext.directType.map(r=>r.file),['src/shared/types.ts'])&&equal(review.externalContext.legacyRuntimeSupport.map(r=>r.file),legacySupports)&&equal(review.externalContext.reverseCallers,contextCallers)&&review.externalContext.reverseCallerCount===10&&review.externalContext.newlyApprovedFiles===0&&review.externalContext.fullTransitiveCompositionApproved===false,'external context authority differs');
 const selected=tuples.map(([file,subgroup,roleId,readerClass,judgmentCode])=>{
  const judgment=review.rows.find(row=>row.file===file),sealed=fixedRows.find(row=>row.file===file),roles=profile.sourceRoles.filter(row=>row.file===file);need(roles.length===1,'missing or duplicate source role');const role=roles[0];
  need(judgment.scope==='subject-exact3'&&judgment.subgroup===subgroup&&judgment.reviewId===M1035_REVIEW_ID&&judgment.sourceCommit===sourceHead&&judgment.readerClass===readerClass&&judgment.compileScope==='main-service-bundle'&&judgment.storeRequiredSourceRole===false&&judgment.judgment===judgmentCode&&Array.isArray(judgment.verified)&&judgment.verified.length>0&&Array.isArray(judgment.limits)&&judgment.limits.length>0,'per-file judgment/classification/limits differ');
  need(sealed.sha256===judgment.sha256&&sealed.bytes===judgment.bytes,'manifest and source-review pin differ');
  const actual=checked({file,sha256:judgment.sha256,bytes:judgment.bytes});need(createHash('sha1').update('blob '+actual.bytes.length+'\0').update(actual.bytes).digest('hex')===judgment.gitBlob,'reviewed Git blob differs');
  need(role.role===roleId&&role.readerClass===readerClass&&role.compileScope==='main-service-bundle'&&role.storeRequiredSourceRole===false&&role.versions.length===1,'source role/runtime classification differs');
  need(equal(role.versions[0],{version:M1035_SOURCE_VERSION,pin:{sha256:judgment.sha256,bytes:judgment.bytes},sourceCommit:sourceHead,reviewIds:[M1035_REVIEW_ID]}),'source version or review binding differs');
  return{...actual.ref,gitBlob:judgment.gitBlob,subgroup,role:roleId,readerClass,compileScope:role.compileScope,version:M1035_SOURCE_VERSION,sourceCommit:sourceHead,reviewIds:[M1035_REVIEW_ID],judgment:judgment.judgment,verified:judgment.verified,limits:judgment.limits,reviewRef:M1025_SOURCE_REVIEW};
 });
 for(const ref of refs.values())checked(ref);
 return{status:'matched-exact3-reviewed-semantic-source-compatibility',scope:'3runtime source files only; bounded policy and trusted main-owned fixed-resource reader',selected,sourceRegistrationMatched:true,sourceReviewHead:sourceHead,reviewRef:M1025_SOURCE_REVIEW,manifestRef:M1025_SOURCE_MANIFEST,receiptRef:M1025_SOURCE_RECEIPT,baselineRef:M1035_BASELINE_PROFILE,preservedSourceRoles:70,preservedSourceVersions:75,preservedReviews:17,legacyFacadeRegistered:false,externalContextFilesNewlyRegistered:0,policyScope:review.policyScope,reviewedCountSeparation:review.countSeparation,coverageRecountExecuted:false,manualCoverageAdded:0,defaultCoverageAdded:0,formalCoverageAdded:0,sourceBuildApproved:false,wholeSourceClosureApproved:false,productionApproved:false,StoreSaveApproved:false,family40Approval:false,traditionalAuthority:false,releaseApproved:false,activation:'off',outerSealsResealed:false};
}
