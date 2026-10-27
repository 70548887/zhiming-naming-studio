// Exact-reader pattern shared with M929/M944/M964. No imagery source runs here.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual as equal} from 'node:util';

import {M1011_EXTENSION_PROFILE} from './coverage-source-registration-1011.mjs';

export const M980_EXTENSION_PROFILE=M1011_EXTENSION_PROFILE;
export const M975_SOURCE_REVIEW=Object.freeze({file:'scripts/verification/extension-evidence/m980/M975-source-review.json',sha256:'0d5570de064c6c26c5d3a484245c56d1c1e732be3b0f45d53906f63f21fc86cc',bytes:14941});
export const M975_SOURCE_MANIFEST=Object.freeze({file:'scripts/verification/extension-evidence/m980/M975-manifest.json',sha256:'521afe71e6a371b69bf0dea65f7c85223a69f13d9ab050a95931fa13fc2a8fae',bytes:4024});
export const M980_REVIEW_ID='M975-M754-GROUP';
export const M980_SOURCE_VERSION='m975-reviewed-imagery/1';
const sourceHead='51d991fb965a9d4441ade64c7e58d2bb558871ef';
const subjectTuples=Object.freeze([
 ['src/domain/m754-element-imagery-generation.ts','foundation5','pure-rule-or-rule-data','main-service-bundle'],
 ['src/main/m754-element-imagery-generation.ts','foundation5','service-fixed-source-reader','main-service-bundle'],
 ['src/main/m754-element-imagery.ts','foundation5','service-fixed-source-reader','main-service-bundle'],
 ['src/shared/m754-element-imagery.ts','foundation5','type-contract','type-only'],
 ['src/shared/m754-element-imagery-pins.ts','foundation5','pure-rule-or-rule-data','main-service-bundle'],
 ['src/main/m779-admitted-element-imagery.ts','adjacent-admitted2','service-fixed-source-reader','main-service-bundle'],
 ['src/shared/m779-admitted-element-imagery.ts','adjacent-admitted2','type-contract','type-only']
].map(tuple=>Object.freeze(tuple)));
export const M980_SOURCE_FILES=Object.freeze(subjectTuples.map(tuple=>tuple[0]));
const moduleRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const need=(ok,message)=>{if(!ok)throw Object.assign(new Error('M980 exact7 imagery registration: '+message),{code:'m980-exact7-rejected'});};
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const safe=file=>typeof file==='string'&&file&&!/[\\:\u0000-\u001f]/u.test(file)&&!file.startsWith('/')&&file.split('/').every(part=>part&&part!=='.'&&part!=='..');
function absolute(file,directory=false){need(typeof file==='string'&&path.isAbsolute(file),'absolute input required');const full=path.resolve(file),parsed=path.parse(full);let cursor=parsed.root;for(const part of full.slice(parsed.root.length).split(path.sep).filter(Boolean)){cursor=path.join(cursor,part);need(!fs.lstatSync(cursor).isSymbolicLink(),'linked input rejected');}const stat=fs.statSync(full);need(directory?stat.isDirectory():stat.isFile(),'ordinary input required');return full;}
function read(root,file){
 need(safe(file),'safe relative path required');const target=absolute(path.join(root,...file.split('/'))),fd=fs.openSync(target,'r');let before,after,bytes;
 try{before=fs.fstatSync(fd,{bigint:true});bytes=fs.readFileSync(fd);after=fs.fstatSync(fd,{bigint:true});}finally{fs.closeSync(fd);}
 const current=fs.statSync(target,{bigint:true});for(const key of ['dev','ino','size','mtimeNs','ctimeNs'])need(before[key]===after[key]&&after[key]===current[key],'input changed during read');need(BigInt(bytes.length)===current.size,'input size changed');return{bytes,ref:{file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}};
}
export function verifyImagerySourceRegistration(options){
 need(plain(options)&&equal(Object.keys(options),['root']),'only the canonical root option is accepted');const root=absolute(options.root,true);need(path.relative(absolute(moduleRoot,true),root)==='','canonical module checkout required');
 const refs=new Map(),checked=ref=>{const actual=read(root,ref.file);need(equal(actual.ref,ref),'fixed input differs: '+ref.file);refs.set(ref.file,ref);return actual;};
 const profile=JSON.parse(checked(M980_EXTENSION_PROFILE).bytes),review=JSON.parse(checked(M975_SOURCE_REVIEW).bytes),manifest=JSON.parse(checked(M975_SOURCE_MANIFEST).bytes);
 need(profile.profileId==='raw138-source-extensions-m1066-qimen/1'&&profile.sourceRoles.length===88&&profile.reviews.length===19&&profile.productionAdmission===false&&profile.activation==='off','fixed combined source profile scope/count differs');
 need(review.schema==='independent-exact-source-review/1'&&review.reviewId===M980_REVIEW_ID&&review.commit===sourceHead&&review.result==='accepted-with-stated-source-scope'&&equal(review.subgroups,{foundation5:5,adjacentAdmitted2:2})&&review.newP1===0&&review.newP2===0&&review.findings.length===0,'exact7 bounded source review differs');
 need(equal(review.authority,{exactSevenMayBeReferencedBySeparateSourceRegistration:true,sourceRoleProfileModified:false,registryWritten:false,wholeSourceClosureApproved:false,sourceBuildApproved:false,serviceStoreApproved:false,uiApproved:false,persistenceApproved:false,globalDefaultEnabled:false,newScoreWeightsApproved:false,traditionalUniqueElementsApproved:false,releaseApproved:false}),'review does not grant sourcebuild/Store/default/weights/traditional/release authority');
 need(review.mappingScope.authority==='project-convention'&&review.mappingScope.formalKnown===257&&review.mappingScope.formalUnknown===522&&review.mappingScope.formalAdded===0,'formal coverage and mapping authority differ');
 need(manifest.schema==='m975-audit-artifacts/1'&&manifest.reviewId===M980_REVIEW_ID&&Array.isArray(manifest.files)&&manifest.files.length===23,'original source-review artifact manifest differs');
 const sealedReview=manifest.files.filter(row=>row.path==='source-review.json');need(sealedReview.length===1&&equal(sealedReview[0],{path:'source-review.json',sha256:M975_SOURCE_REVIEW.sha256,bytes:M975_SOURCE_REVIEW.bytes}),'manifest does not bind exact source-review bytes');
 const paths=[...M980_SOURCE_FILES].sort(),samePaths=(rows,key='file')=>Array.isArray(rows)&&rows.length===7&&new Set(rows.map(row=>row[key])).size===7&&equal(rows.map(row=>row[key]).sort(),paths);
 need(samePaths(review.rows),'missing, extra or duplicated source-review subject');
 const fixedRows=manifest.files.filter(row=>row.path.startsWith('fixed/src/')).map(row=>({...row,file:row.path.slice('fixed/'.length)}));need(samePaths(fixedRows),'manifest fixed source set differs from exact7');
 const tagged=profile.sourceRoles.filter(row=>row.versions.some(v=>v.version===M980_SOURCE_VERSION||v.reviewIds.includes(M980_REVIEW_ID)));need(samePaths(tagged),'source review borrowed by an external/context role');
 const contextCallers=review.currentExternalContext;
 need(contextCallers.fixedCommit===sourceHead&&equal(contextCallers.callers.map(row=>row.file),['src/main/qimen-cultural-provider-sources-v1.ts','src/main/reviewed-naming-data-resources.ts']),'known factory callers must be retained as external context');
 need(contextCallers.callers.every(row=>!paths.includes(row.file)),'external call-site context is not a source registration subject');
 const selected=subjectTuples.map(([file,subgroup,readerClass,compileScope])=>{
  const judgment=review.rows.find(row=>row.file===file),sealed=fixedRows.find(row=>row.file===file),roles=profile.sourceRoles.filter(row=>row.file===file);need(roles.length===1,'missing or duplicate registered role');const role=roles[0];
  need(judgment.subgroup===subgroup&&judgment.reviewId===M980_REVIEW_ID&&judgment.readerClass===readerClass&&judgment.compileScope===compileScope&&judgment.judgment==='accepted-for-exact-source-registration-with-trusted-main-scope'&&judgment.historicalBytesIdentical===true&&Array.isArray(judgment.verified)&&judgment.verified.length>0&&Array.isArray(judgment.limits)&&judgment.limits.length>0,'per-file source judgment/classification/limits differ');
  need(sealed.sha256===judgment.sha256&&sealed.bytes===judgment.bytes,'manifest and reviewed source pin differ');
  const actual=checked({file,sha256:judgment.sha256,bytes:judgment.bytes});need(createHash('sha1').update('blob '+actual.bytes.length+'\0').update(actual.bytes).digest('hex')===judgment.gitBlob,'reviewed Git postimage differs');
  need(role.readerClass===readerClass&&role.compileScope===compileScope&&role.storeRequiredSourceRole===false&&role.versions.length===1,'source role or exact version count differs');
  need(equal(role.versions[0],{version:M980_SOURCE_VERSION,pin:{sha256:judgment.sha256,bytes:judgment.bytes},sourceCommit:sourceHead,reviewIds:[M980_REVIEW_ID]}),'source version/review binding differs');
  return{...actual.ref,gitBlob:judgment.gitBlob,subgroup,role:role.role,readerClass,compileScope,version:M980_SOURCE_VERSION,sourceCommit:sourceHead,reviewIds:[M980_REVIEW_ID],judgment:judgment.judgment,verified:judgment.verified,limits:judgment.limits,reviewRef:M975_SOURCE_REVIEW};
 });
 for(const ref of refs.values())checked(ref);
 return{status:'matched-exact7-reviewed-imagery-source-compatibility',scope:'5foundation+2trusted-owner source files only; trusted-main opt-in projection',selected,sourceRegistrationMatched:true,reviewRef:M975_SOURCE_REVIEW,manifestRef:M975_SOURCE_MANIFEST,sourceReviewHead:sourceHead,externalFactoryCallSites:contextCallers.callers,externalFactoryCallersReviewed:false,externalContextFilesRegistered:0,projectedElementsEnterExistingFilteringAndTraditionalScoring:true,newScoreWeightsApproved:false,formalKnown:257,formalUnknown:522,formalCoverageAdded:0,sourceBuildApproved:false,productionApproved:false,serviceStoreApproved:false,uiApproved:false,persistenceApproved:false,globalDefaultEnabled:false,traditionalUniqueElementsApproved:false,releaseApproved:false,activation:'off',outerSealsResealed:false};
}
