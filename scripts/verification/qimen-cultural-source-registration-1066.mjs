// Fixed reviewed source correspondence only; product modules are never evaluated.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual as equal} from 'node:util';

export const M1066_EXTENSION_PROFILE=Object.freeze({file:'scripts/verification/source-profile-138-extensions.json',sha256:'14e07f9fca754447241b71a3f04137003a8e55d01c50d8614687ece49947874f',bytes:87801});
export const M1066_BASELINE_PROFILE=Object.freeze({file:'scripts/verification/extension-evidence/m1066/source-profile-m1035-original.json',sha256:'6d8d7d42f5c83e9b5f97d6e9b14a69aa48a6fbb25eb37f43a4742307d6ab56f5',bytes:77225});
export const M1051_SOURCE_REVIEW=Object.freeze({file:'scripts/verification/extension-evidence/m1066/REVIEW.json',sha256:'241bd575f44e90d1fe155579b3e2f46e40f155f64b8e8f5337301654d124f835',bytes:52125});
export const M1051_SOURCE_PINS=Object.freeze({file:'scripts/verification/extension-evidence/m1066/SOURCE-PINS.json',sha256:'a99e4c20f2d1a452e1da3eeb895b34e7c03e90effd11f557f09084734fc0ab12',bytes:7227});
export const M1051_SOURCE_RECEIPT=Object.freeze({file:'scripts/verification/extension-evidence/m1066/receipt.json',sha256:'1dc7b817648a1523df9d41b4814f1b1314d078378fde0d77d83c88da6e7b453b',bytes:1250});
export const M1066_REVIEW_ID='M1051-QIMEN-CULTURAL-EXACT15';
export const M1066_SOURCE_VERSION='m1051-reviewed-qimen-cultural/1';
const sourceHead='1e2d737f9c03c28184e8ec89ad2755a0f22ba8d4',checkedHead='ad7e0b2f02992d0837c6a6ab0ea24c7816afd828';
const tuples=Object.freeze([
 ['src/domain/qimen-cultural-comparison-canonical.ts','qimen-cultural-canonical-data','pure-rule-or-rule-data'],
 ['src/domain/qimen-cultural-comparison.ts','qimen-cultural-comparison-domain','pure-rule-or-rule-data'],
 ['src/main/qimen-cultural-offline-birth-v1.ts','qimen-cultural-offline-birth-check','pure-rule-or-rule-data'],
 ['src/main/qimen-cultural-offline-input-v1.ts','qimen-cultural-offline-input-capture','pure-rule-or-rule-data'],
 ['src/main/qimen-cultural-offline-pack-v1.ts','qimen-cultural-offline-pack-reader','service-fixed-source-reader'],
 ['src/main/qimen-cultural-offline-projection-v1.ts','qimen-cultural-offline-projection-check','pure-rule-or-rule-data'],
 ['src/main/qimen-cultural-offline-sources-v1.ts','qimen-cultural-offline-fixed-source-reader','service-fixed-source-reader'],
 ['src/main/qimen-cultural-offline-v1.ts','qimen-cultural-offline-replay-owner','service-fixed-source-reader'],
 ['src/main/qimen-cultural-provider-profile-v1.ts','qimen-cultural-stored-profile-gate','pure-rule-or-rule-data'],
 ['src/main/qimen-cultural-provider-sources-v1.ts','qimen-cultural-live-fixed-source-reader','service-fixed-source-reader'],
 ['src/main/qimen-cultural-provider-v1.ts','qimen-cultural-live-provider-owner','service-fixed-source-reader'],
 ['src/shared/qimen-cultural-comparison-rules.ts','qimen-cultural-outer-palace-rules','pure-rule-or-rule-data'],
 ['src/shared/qimen-cultural-comparison.ts','qimen-cultural-comparison-runtime-contract','pure-rule-or-rule-data'],
 ['src/shared/qimen-cultural-offline-v1.ts','qimen-cultural-offline-runtime-contract','pure-rule-or-rule-data'],
 ['src/shared/qimen-cultural-provider-v1.ts','qimen-cultural-provider-runtime-contract','pure-rule-or-rule-data']
].map(row=>Object.freeze(row)));
export const M1066_SOURCE_FILES=Object.freeze(tuples.map(row=>row[0]));
export const M1066_EXCLUDED_CONTEXT=Object.freeze(['src/main/qimen-cultural-offline-store-boundary-v1.ts','src/renderer/qimen-cultural-comparison-view.css']);
const moduleRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const need=(ok,message)=>{if(!ok)throw Object.assign(new Error('M1066 exact15 cultural registration: '+message),{code:'m1066-exact15-rejected'});};
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const safe=file=>typeof file==='string'&&file&&!/[\\:\u0000-\u001f]/u.test(file)&&!file.startsWith('/')&&file.split('/').every(part=>part&&part!=='.'&&part!=='..'&&!['__proto__','prototype','constructor'].includes(part));
function absolute(file,directory=false){need(typeof file==='string'&&path.isAbsolute(file),'absolute input required');const full=path.resolve(file),parsed=path.parse(full);let cursor=parsed.root;for(const part of full.slice(parsed.root.length).split(path.sep).filter(Boolean)){cursor=path.join(cursor,part);need(!fs.lstatSync(cursor).isSymbolicLink(),'linked input rejected');}const stat=fs.statSync(full);need(directory?stat.isDirectory():stat.isFile(),'ordinary input required');return full;}
function read(root,file){
 need(safe(file),'safe relative path required');const target=absolute(path.join(root,...file.split('/'))),fd=fs.openSync(target,'r');let before,after,bytes;
 try{before=fs.fstatSync(fd,{bigint:true});need(before.isFile(),'ordinary file required');bytes=fs.readFileSync(fd);after=fs.fstatSync(fd,{bigint:true});}finally{fs.closeSync(fd);}
 const current=fs.statSync(target,{bigint:true});for(const key of ['dev','ino','size','mtimeNs','ctimeNs'])need(before[key]===after[key]&&after[key]===current[key],'input changed during read');need(BigInt(bytes.length)===current.size,'input size changed');return{bytes,ref:{file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}};
}
export function verifyQimenCulturalSourceRegistration(options){
 need(plain(options)&&equal(Object.keys(options),['root']),'only the canonical root option is accepted');const root=absolute(options.root,true);need(path.relative(absolute(moduleRoot,true),root)==='','canonical module checkout required');
 const refs=new Map(),checked=ref=>{const actual=read(root,ref.file);need(equal(actual.ref,ref),'fixed input differs: '+ref.file);refs.set(ref.file,ref);return actual;};
 const profile=JSON.parse(checked(M1066_EXTENSION_PROFILE).bytes),baseline=JSON.parse(checked(M1066_BASELINE_PROFILE).bytes),review=JSON.parse(checked(M1051_SOURCE_REVIEW).bytes),pins=JSON.parse(checked(M1051_SOURCE_PINS).bytes),receipt=JSON.parse(checked(M1051_SOURCE_RECEIPT).bytes);
 need(profile.profileId==='raw138-source-extensions-m1066-qimen/1'&&profile.sourceRoles.length===88&&profile.sourceRoles.reduce((n,r)=>n+r.versions.length,0)===93&&profile.reviews.length===19&&profile.activation==='off'&&profile.productionAdmission===false,'fixed combined source scope/count differs');
 need(baseline.profileId==='raw138-source-extensions-m1035-semantic/1'&&baseline.sourceRoles.length===73&&baseline.sourceRoles.reduce((n,r)=>n+r.versions.length,0)===78&&baseline.reviews.length===18,'original73roles/78versions/18reviews baseline differs');
 need(equal(profile.sourceRoles.slice(0,73),baseline.sourceRoles)&&equal(profile.reviews.slice(0,18),baseline.reviews),'historical role/version or review objects changed');
 const unchanged=value=>Object.fromEntries(Object.entries(value).filter(([key])=>!['profileId','sourceRoles','reviews'].includes(key)));
 need(equal(unchanged(profile),unchanged(baseline)),'registration may only append exact15roles and one review');
 need(equal(profile.reviews[18],{id:M1066_REVIEW_ID,...M1051_SOURCE_REVIEW,decision:{pointer:'/result',value:'accepted-with-trusted-internal-source-scope'},scope:'exact15 project-cultural main/internal source identities only; excluded2,external24,reverse16 and currentStore outside approval; no traditional-name,score,generation,storage,Electron/PDF/build/release authority',productionApproval:false}),'exact source-review registration differs');
 need(review.schema==='m1051-qimen-cultural-exact15-source-review/1'&&review.reviewId===M1066_REVIEW_ID&&review.result==='accepted-with-trusted-internal-source-scope'&&review.sourceCommit===sourceHead&&review.currentCheckedCommit===checkedHead&&review.currentPostimagesByteIdentical===true&&review.newP1===0&&review.newP2===0&&review.findings.length===0,'bounded exact15 source judgment differs');
 need(equal(review.scope,{total:15,pureRuleFiles:10,fixedSourceReaders:5,typeOnlyFiles:0,sharedRuntimeFiles:4,sharedRuntimeExports:10,compileScope:'main-service-bundle',all15SourceFilesActuallyReadByPrimary:true,excludedContextCount:2,externalDependenciesApproved:false}),'source runtime/classification scope differs');
 need(equal(review.authority,{exact15MayBeReferencedForSeparateSourceRegistration:true,registrationApplied:false,profileModified:false,srcModified:false,dataModified:false,wholeSourceClosureApproved:false,sourceBuildApproved:false,standardElectronOrPdfApproved:false,dataSemanticsNewlyApproved:false,generationAuthority:false,automaticNameRecommendation:false,storageAuthority:false,StoreOrCASApproved:false,ServiceOrUIApproved:false,traditionalNameMethodEstablished:false,formalCoverageAdded:0,defaultCoverageAdded:0,releaseApproved:false}),'review grants no traditional/generation/storage/PDF/build/release authority');
 need(equal(review.behavior,{cultureMode:'project-convention-only',outerPalaces:[1,2,3,4,6,7,8,9],elementPalaces:{木:[3,4],火:[9],土:[2,8],金:[6,7],水:[1]},surnameProjection:false,center5Relocation:false,strokeNamePlacement:false,traditional:{status:'not-admitted',verdict:'not-evaluated',namePalaceMethod:'not-established'},score:null,ranking:'input-order',scoreMutation:false,filtering:false,nameEffect:'not-evaluated',fourHarmRemoval:'not-performed',sourceError:'refused/source-unavailable not ordinary unknown',unknownBirthChart:'only static known character sets, no fabricated chart or complete intersection/exclusive verdict',manualReadingSelection:'fixed options/opaque process ownership only;not traditional name-palace or fortune authority'}),'project culture/unknown/score/traditional boundary differs');
 need(equal(review.baselineScope,{characters:779,existingLabels:257,unknownLabels:522,newGeneral:5,newTheme:5,newTenConsumed:false,formalCoverageAdded:0,defaultCoverageAdded:0,freshDataRecount:false,origin:'fixed source assertions only'}),'fixed label/coverage scope differs');
 need(pins.schema==='m1051-exact15-source-pins/1'&&pins.reviewId===M1066_REVIEW_ID&&pins.sourceCommit===sourceHead&&pins.currentCheckedCommit===checkedHead,'source-pin artifact scope differs');
 need(receipt.schema==='m1051-exact15-source-review-receipt/1'&&receipt.reviewId===M1066_REVIEW_ID&&receipt.result===review.result&&receipt.sourceCommit===sourceHead&&receipt.currentCheckedCommit===checkedHead&&receipt.files===15&&receipt.pure===10&&receipt.fixedReader===5&&receipt.newP1===0&&receipt.newP2===0&&receipt.reviewSha256===M1051_SOURCE_REVIEW.sha256&&equal(receipt.authority,review.authority),'receipt does not bind fixed source review');
 const paths=[...M1066_SOURCE_FILES].sort(),samePaths=rows=>Array.isArray(rows)&&rows.length===15&&new Set(rows.map(row=>row.file)).size===15&&equal(rows.map(row=>row.file).sort(),paths);
 need(samePaths(review.rows)&&samePaths(pins.files)&&samePaths(profile.sourceRoles.slice(73)),'missing, extra, duplicated or foreign source subject');
 const tagged=profile.sourceRoles.filter(row=>row.versions.some(v=>v.version===M1066_SOURCE_VERSION||v.reviewIds.includes(M1066_REVIEW_ID)));need(samePaths(tagged),'review/version borrowed by excluded or external context');
 need(equal(review.excludedContext.map(row=>row.file),M1066_EXCLUDED_CONTEXT)&&review.excludedContext.every(row=>row.newSourceApproval===false&&!profile.sourceRoles.some(role=>role.file===row.file)),'excluded wrapper/CSS must not be registered');
 const graph=review.sourceGraph;need(equal(graph.roots,['src/main/qimen-cultural-provider-v1.ts','src/main/qimen-cultural-offline-v1.ts'])&&graph.all15RuntimeReachable===true&&graph.externalDependencyCount===24&&graph.externalDependencies.length===24&&new Set(graph.externalDependencies.map(row=>row.file)).size===24&&graph.externalDependencies.every(row=>row.newAuthority===false&&!paths.includes(row.file))&&graph.reverseCallerCount===16&&graph.reverseContextNewAuthority===false&&graph.currentStoreByteChangedFromM918===true&&typeof graph.currentStoreScope==='string'&&graph.currentStoreScope.length>0,'external24/reverse16/currentStore context cannot gain authority');
 const selected=tuples.map(([file,roleId,readerClass])=>{
  const judgment=review.rows.find(row=>row.file===file),pin=pins.files.find(row=>row.file===file),roles=profile.sourceRoles.filter(row=>row.file===file);need(roles.length===1,'missing or duplicate source role');const role=roles[0];
  need(judgment.role===roleId&&judgment.readerClass===readerClass&&judgment.compileScope==='main-service-bundle'&&judgment.storeRequiredSourceRole===false&&judgment.reviewId===M1066_REVIEW_ID&&judgment.sourceCommit===sourceHead&&judgment.currentCheckedCommit===checkedHead&&judgment.currentByteIdentical===true&&judgment.judgment==='accepted-for-bounded-trusted-internal-source-registration'&&Array.isArray(judgment.verified)&&judgment.verified.length>0&&Array.isArray(judgment.limits)&&judgment.limits.length>0,'per-file judgment/classification/limits differ');
  need(equal(pin,{file,bytes:judgment.bytes,sha256:judgment.sha256,gitBlob:judgment.gitBlob,role:roleId,readerClass,compileScope:'main-service-bundle',judgment:judgment.judgment}),'source pins and reviewed postimage differ');
  const actual=checked({file,sha256:pin.sha256,bytes:pin.bytes});need(createHash('sha1').update('blob '+actual.bytes.length+'\0').update(actual.bytes).digest('hex')===pin.gitBlob,'reviewed Git blob differs');
  need(role.role===roleId&&role.readerClass===readerClass&&role.compileScope==='main-service-bundle'&&role.storeRequiredSourceRole===false&&role.versions.length===1,'source role/runtime classification differs');
  need(equal(role.versions[0],{version:M1066_SOURCE_VERSION,pin:{sha256:pin.sha256,bytes:pin.bytes},sourceCommit:sourceHead,reviewIds:[M1066_REVIEW_ID]}),'source version or review binding differs');
  return{...actual.ref,gitBlob:pin.gitBlob,role:roleId,readerClass,compileScope:role.compileScope,version:M1066_SOURCE_VERSION,sourceCommit:sourceHead,reviewIds:[M1066_REVIEW_ID],judgment:judgment.judgment,verified:judgment.verified,limits:judgment.limits,reviewRef:M1051_SOURCE_REVIEW};
 });
 for(const ref of refs.values())checked(ref);
 return{status:'matched-exact15-reviewed-cultural-source-compatibility',scope:'15 trusted internal/main project-cultural source identities only',selected,sourceRegistrationMatched:true,reviewRef:M1051_SOURCE_REVIEW,sourcePinsRef:M1051_SOURCE_PINS,receiptRef:M1051_SOURCE_RECEIPT,baselineRef:M1066_BASELINE_PROFILE,sourceReviewHead:sourceHead,currentReviewedHead:checkedHead,preservedSourceRoles:73,preservedSourceVersions:78,preservedReviews:18,excludedContextFiles:[...M1066_EXCLUDED_CONTEXT],excludedContextNewlyRegistered:0,externalContextFilesNewlyRegistered:0,externalDependencyCount:24,reverseCallerCount:16,currentStoreCompositionNewlyApproved:false,behavior:review.behavior,reviewedBaselineScope:review.baselineScope,coverageRecountExecuted:false,formalCoverageAdded:0,defaultCoverageAdded:0,wholeSourceClosureApproved:false,sourceBuildApproved:false,standardElectronOrPdfApproved:false,generationAuthority:false,automaticNameRecommendation:false,storageAuthority:false,StoreOrCASApproved:false,ServiceOrUIApproved:false,traditionalNameMethodEstablished:false,productionApproved:false,releaseApproved:false,activation:'off',outerSealsResealed:false};
}
