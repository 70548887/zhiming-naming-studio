import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual as equal} from 'node:util';
import {M944_EXTENSION_PROFILE} from './project-v132-registration-944.mjs';

const moduleRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
// The immutable combined map adds M944; this reader still attests only its seven.
export const M929_EXTENSION_PROFILE=M944_EXTENSION_PROFILE;
export const M925_REVIEW=Object.freeze({file:'scripts/verification/extension-evidence/m929/M925-REVIEW.json',sha256:'5aab8d7a9a5b4cedfd8495b14403d308c86db53b968b48cba2398f2ca6d1f285',bytes:16759});
export const M925_SOURCE_PINS=Object.freeze({file:'scripts/verification/extension-evidence/m929/M925-SOURCE-PINS.json',sha256:'d4fc9360a0610fe6c94e2731ee128e12a5f2b2969d86fd91b4293742e9770ce9',bytes:1788});
export const M925_REVIEW_ID='M925-QIONGTONG-SOURCE';
export const M925_VERSION='m925-reviewed-source/1';
const sourceCommit='b6773530ef941d48b72a451f5d7ab5831abe074a';
const direct=Object.freeze([
 ['src/main/qiongtong-clause-reference-preview.ts','primary','service-fixed-source-reader','main-service-bundle',true],
 ['src/shared/qiongtong-clause-reference-preview.ts','primary','service-fixed-source-reader','type-only',true],
 ['src/renderer/qiongtong-clause-preview-bindings.ts','primary','read-only-renderer','renderer-bundle',false],
 ['src/renderer/QiongtongClausePreviewPanel.tsx','ui','read-only-renderer','renderer-bundle',true],
 ['src/renderer/QiongtongClauseReferenceView.tsx','ui','read-only-renderer','renderer-bundle',true],
 ['src/renderer/QiongtongJiaChapterView.tsx','ui','read-only-renderer','renderer-bundle',false],
 ['src/renderer/QiongtongClauseReferenceView.css','ui','read-only-renderer','renderer-bundle',true],
].map(row=>Object.freeze(row)));
export const M925_DIRECT_FILES=Object.freeze(direct.map(row=>row[0]));
export const M925_PRESERVED_VERSION_PATHS=Object.freeze(direct.filter(row=>row[4]).map(row=>row[0]));
const need=(ok,message)=>{if(!ok)throw Object.assign(new Error('M929 qiongtong source registration: '+message),{code:'m929-qiongtong-registration-rejected'});};
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
function absolute(file,directory=false){
 need(typeof file==='string'&&path.isAbsolute(file),'absolute root/input required');const target=path.resolve(file),parsed=path.parse(target);let cursor=parsed.root;
 for(const part of target.slice(parsed.root.length).split(path.sep).filter(Boolean)){cursor=path.join(cursor,part);need(!fs.lstatSync(cursor).isSymbolicLink(),'linked input rejected');}
 const stat=fs.statSync(target);need(directory?stat.isDirectory():stat.isFile(),'ordinary input required');return target;
}
function read(root,file){
 need(typeof file==='string'&&file&&!/[\\:\u0000-\u001f]/u.test(file)&&!file.startsWith('/')&&file.split('/').every(part=>part&&part!=='.'&&part!=='..'),'safe relative input required');
 const target=absolute(path.join(root,...file.split('/'))),fd=fs.openSync(target,'r');let before,after,bytes;
 try{before=fs.fstatSync(fd,{bigint:true});bytes=fs.readFileSync(fd);after=fs.fstatSync(fd,{bigint:true});}finally{fs.closeSync(fd);}
 const now=fs.statSync(target,{bigint:true});for(const key of ['dev','ino','size','mtimeNs','ctimeNs'])need(before[key]===after[key]&&after[key]===now[key],'input changed during read');
 need(BigInt(bytes.length)===now.size,'input byte count changed');return {bytes,ref:{file,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length}};
}
/** Seven-source compatibility only. No source-build, naming or outer admission. */
export function verifyM925QiongtongRegistration(options){
 need(plain(options)&&equal(Object.keys(options),['root']),'only the canonical root option is accepted');
 const root=absolute(options.root,true);need(path.relative(absolute(moduleRoot,true),root)==='','canonical module checkout required');
 const checked=ref=>{const actual=read(root,ref.file);need(equal(actual.ref,ref),'fixed input differs: '+ref.file);return actual;};
 const rawProfile=checked(M929_EXTENSION_PROFILE),rawReview=checked(M925_REVIEW),rawPins=checked(M925_SOURCE_PINS);
 const profile=JSON.parse(rawProfile.bytes),review=JSON.parse(rawReview.bytes),pins=JSON.parse(rawPins.bytes);
 need(profile.profileId==='raw138-source-extensions-m1066-qimen/1'&&profile.scope==='source-compatibility-candidate-only'&&profile.activation==='off'&&profile.productionAdmission===false,'candidate profile scope differs');
 need(review.verdict==='PASS_BOUNDED_CURRENT_SOURCE_GROUP_WITH_TEST_MAINTENANCE_GAPS'&&Array.isArray(review.confirmedP1)&&review.confirmedP1.length===0&&Array.isArray(review.confirmedP2)&&review.confirmedP2.length===0&&review.frozenCommit===sourceCommit&&pins.commit===sourceCommit,'original bounded review differs');
 need(review.admission.sourceBuildApproved===false&&review.admission.productionAdmission===false&&pins.sourceBuildApproved===false&&pins.activation==='off'&&pins.registrationApplied===false,'original review is not a production admission');
 need(equal(pins.review,{file:'REVIEW.json',sha256:M925_REVIEW.sha256,bytes:M925_REVIEW.bytes}),'original review/pins cross-reference differs');
 need(Array.isArray(pins.files)&&pins.files.length===7&&equal(pins.files.map(row=>[row.file,row.kind]),direct.map(row=>row.slice(0,2))),'unknown eighth or missing source in reviewed group');
 need(equal([...review.exactScope.primary,...review.exactScope.uiImportClosure],pins.files),'reviewed primary/UI postimages differ');
 need(profile.sourceRoles.length===88&&profile.reviews.length===19,'exact combined declaration counts differ');
 const tagged=profile.sourceRoles.flatMap(row=>row.versions.filter(version=>version.reviewIds.includes(M925_REVIEW_ID)||version.version===M925_VERSION).map(version=>({row,version})));
 need(tagged.length===7&&equal(tagged.map(value=>value.row.file).sort(),[...M925_DIRECT_FILES].sort()),'M925 review used outside exact seven-source scope');
 const selected=direct.map(([file,kind,readerClass,compileScope,preserved],index)=>{
  const pin=pins.files[index],rows=profile.sourceRoles.filter(row=>row.file===file);need(rows.length===1,'missing or duplicate group role');const row=rows[0];
  need(row.readerClass===readerClass&&row.compileScope===compileScope&&row.storeRequiredSourceRole===false&&row.versions.length===(preserved?2:1),'source role classification or exact version count differs');
  const added=row.versions.filter(version=>version.version===M925_VERSION);need(added.length===1&&equal(added[0],{version:M925_VERSION,pin:{sha256:pin.sha256,bytes:pin.bytes},sourceCommit,reviewIds:[M925_REVIEW_ID]}),'reviewed source version differs');
  if(preserved)need(row.versions[0].version==='source-current/1'&&!row.versions[0].reviewIds.includes(M925_REVIEW_ID),'historical source version was not preserved');
  const actual=read(root,file),version=row.versions.find(version=>version.pin.sha256===actual.ref.sha256&&version.pin.bytes===actual.ref.bytes);
  need(version,'unknown bytes/version: '+file);
  return {...actual.ref,kind,role:row.role,readerClass,compileScope,version:version.version,sourceCommit:version.sourceCommit,reviewIds:[...version.reviewIds],m925CurrentPostimage:version.version===M925_VERSION};
 });
 // Closing reads bind the declaration, immutable originals and selected bytes.
 for(const ref of [M929_EXTENSION_PROFILE,M925_REVIEW,M925_SOURCE_PINS,...selected.map(({file,sha256,bytes})=>({file,sha256,bytes}))])checked(ref);
 return {status:selected.every(row=>row.m925CurrentPostimage)?'matched-m925-seven-source-postimages':'matched-exact-preserved-source-versions',scope:'M9253primary+4UI/CSS exact source compatibility only',productionApproved:false,sourceBuildApproved:false,activation:'off',outerSealsResealed:false,reviewRef:M925_REVIEW,pinsRef:M925_SOURCE_PINS,currentReviewedPostimages:selected.filter(row=>row.m925CurrentPostimage).length,selected,historicalFixtureMaintenanceGaps:review.testMaintenanceGaps.length,supportFilesRegistered:0};
}
