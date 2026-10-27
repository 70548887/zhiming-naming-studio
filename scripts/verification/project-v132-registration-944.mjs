// Binds the unchanged M940 correspondence checker to the actual exact15 review.
// Source compatibility only: outer build/publication admission stays separate.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual as equal} from 'node:util';
import {inspectProjectV132RegistrationCorrespondence,PROJECT_V132_SOURCE_ROOT} from './project-v132-source-group-940.mjs';
import {M964_EXTENSION_PROFILE} from './consumer-source-registration-964.mjs';

export const M944_EXTENSION_PROFILE=M964_EXTENSION_PROFILE;
export const M940_EXACT15_REVIEW=Object.freeze({file:'scripts/verification/extension-evidence/m944/M940-REVIEW.json',sha256:'b4343a3b181f21de58f40852d2dc4e295db4c08db459a685cb5d7070e3016172',bytes:17831});
export const M940_EXACT15_MANIFEST=Object.freeze({file:'scripts/verification/extension-evidence/m944/M940-MANIFEST.json',sha256:'d0c6d991330f6c13a8b91e7037723a2d413b121256c4388640c2c3a58e42f27c',bytes:13642});
export const M944_REVIEW_ID='M940-PROJECT-V132-EXACT15';
export const M944_SOURCE_VERSION='m940-reviewed-project-v132/1';
const moduleRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const need=(ok,message)=>{if(!ok)throw Object.assign(new Error('M944 project-v132 registration: '+message),{code:'m944-project-v132-rejected'});};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const safe=file=>typeof file==='string'&&file&&!/[\\:\u0000-\u001f]/u.test(file)&&!file.startsWith('/')&&file.split('/').every(part=>part&&part!=='.'&&part!=='..');
function absolute(file,directory=false){
 need(typeof file==='string'&&path.isAbsolute(file),'absolute root/input required');const target=path.resolve(file),parsed=path.parse(target);let cursor=parsed.root;
 for(const part of target.slice(parsed.root.length).split(path.sep).filter(Boolean)){cursor=path.join(cursor,part);need(!fs.lstatSync(cursor).isSymbolicLink(),'linked input rejected');}
 const stat=fs.statSync(target);need(directory?stat.isDirectory():stat.isFile(),'ordinary input required');return target;
}
function read(root,file){
 need(safe(file),'safe relative input required');const target=absolute(path.join(root,...file.split('/'))),fd=fs.openSync(target,'r');let before,after,bytes;
 try{before=fs.fstatSync(fd,{bigint:true});bytes=fs.readFileSync(fd);after=fs.fstatSync(fd,{bigint:true});}finally{fs.closeSync(fd);}
 const now=fs.statSync(target,{bigint:true});for(const key of ['dev','ino','size','mtimeNs','ctimeNs'])need(before[key]===after[key]&&after[key]===now[key],'input changed during read');
 need(BigInt(bytes.length)===now.size,'input byte count changed');return{bytes,ref:{file,sha256:hash(bytes),bytes:bytes.length}};
}
export function verifyProjectV132SourceRegistration(options){
 need(plain(options)&&equal(Object.keys(options),['root']),'only the canonical root option is accepted');const root=absolute(options.root,true);need(path.relative(absolute(moduleRoot,true),root)==='','canonical module checkout required');
 const checkedRefs=new Map(),checked=ref=>{const actual=read(root,ref.file);need(equal(actual.ref,ref),'fixed input differs: '+ref.file);checkedRefs.set(ref.file,ref);return actual;};
 const profile=JSON.parse(checked(M944_EXTENSION_PROFILE).bytes),review=JSON.parse(checked(M940_EXACT15_REVIEW).bytes),manifest=JSON.parse(checked(M940_EXACT15_MANIFEST).bytes);
 need(profile.profileId==='raw138-source-extensions-m1066-qimen/1'&&profile.activation==='off'&&profile.productionAdmission===false&&profile.sourceRoles.length===88&&profile.reviews.length===19,'fixed combined source map scope/count differs');
 need(review.schema==='m940-exact15-project-v132-source-review/1'&&review.fixedCommit==='d46ebc65b738e6b76e9495875534b3f50dd47659'&&review.verdict==='PASS_BOUNDED_EXACT15_PROJECT_SOURCE_REVIEW'&&review.exactFileCount===15&&review.files.length===15,'wrong exact15 review verdict or scope');
 need(Array.isArray(review.confirmedP1)&&review.confirmedP1.length===0&&Array.isArray(review.confirmedP2)&&review.confirmedP2.length===0,'original review findings differ');
 need(equal(review.authority,{sourceReviewOnly:true,registrationApplied:false,activeProfileChanged:false,officialSourceBuildApproved:false,productionAdmission:false,StoreWriterApproved:false,methodEffectOnFateAssessed:false}),'original review grants no product/build/Store authority');
 need(review.semanticReview.methodScope==='project-proposal-only'&&review.semanticReview.fullTraditionalUseConclusion==='unknown'&&review.semanticReview.defaultIntegration===false&&review.semanticReview.scorePermissionGranted===false,'project/defaultoff/traditionalunknown scope differs');
 need(review.numericReview.outerUniversalExistenceUniqueness===false&&review.numericReview.roundoffExhaustiveMachineProof===false,'bounded numeric review is not universal or exhaustive machine proof');
 need(manifest.task==='M940-ACTUAL15-SOURCE-AUDIT'&&Array.isArray(manifest.files)&&manifest.files.length===76,'original evidence manifest differs');
 const reviewEntries=manifest.files.filter(row=>row.file==='REVIEW.json');need(reviewEntries.length===1&&equal(reviewEntries[0],{file:'REVIEW.json',sha256:M940_EXACT15_REVIEW.sha256,bytes:M940_EXACT15_REVIEW.bytes}),'manifest does not bind the exact original review');
 const inspected=inspectProjectV132RegistrationCorrespondence({root}),original=[...inspected.selected,...inspected.companions],expectedPaths=original.map(row=>row.file).sort();
 need(new Set(review.files.map(row=>row.file)).size===15&&equal(review.files.map(row=>row.file).sort(),expectedPaths),'review files are missing, duplicated or outside the actual15');
 const frozen=manifest.files.filter(row=>row.file.startsWith('frozen/'+PROJECT_V132_SOURCE_ROOT+'/'));need(frozen.length===15&&equal(frozen.map(row=>row.file.slice('frozen/'.length)).sort(),expectedPaths),'manifest frozen group differs');
 const rows=profile.sourceRoles.filter(row=>row.file.startsWith(PROJECT_V132_SOURCE_ROOT+'/'));
 need(rows.length===15&&equal(rows.map(row=>row.file).sort(),expectedPaths),'registered source group missing or expanded beyond15');
 const tagged=profile.sourceRoles.filter(row=>row.versions.some(version=>version.version===M944_SOURCE_VERSION||version.reviewIds.includes(M944_REVIEW_ID)));
 need(tagged.length===15&&equal(tagged.map(row=>row.file).sort(),expectedPaths),'review/version borrowed outside15;context dependencies are not registration subjects');
 const ids=new Set();
 const selected=original.map(actual=>{
  const reviewed=review.files.find(row=>row.file===actual.file),declared=rows.find(row=>row.file===actual.file),pin=manifest.files.find(row=>row.file==='frozen/'+actual.file);
  need(reviewed.sha256===actual.sha256&&reviewed.bytes===actual.bytes&&pin.sha256===actual.sha256&&pin.bytes===actual.bytes,'review or frozen source identity differs: '+actual.file);
  need(/^M940-SOURCE-\d{2}$/u.test(reviewed.reviewId)&&!ids.has(reviewed.reviewId)&&typeof reviewed.judgment==='string'&&reviewed.judgment.length>0&&reviewed.findingIds.length===0&&reviewed.sourceRegistrationMutation===false,'per-file exact bounded judgment missing');ids.add(reviewed.reviewId);
  const bytes=checked({file:actual.file,sha256:actual.sha256,bytes:actual.bytes}).bytes;need(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')===reviewed.gitBlob,'reviewed Git postimage differs');
  let readerClass,compileScope;
  if(actual.category==='source-only-companion'){
   const expectedRole=actual.role==='type-only-source'?'type-only-companion':actual.role==='project-proposal-notice'?'source-only-notice':'source-only-license';
   need(reviewed.classification==='source-only'&&reviewed.counterpart===null&&reviewed.closureRole===null&&reviewed.executionInput===false&&reviewed.role===expectedRole&&reviewed.reviewStatus==='reviewed-source-only-companion','source-only companion must not be runtime execution');
   readerClass=expectedRole==='type-only-companion'?'type-contract':expectedRole;compileScope=expectedRole==='type-only-companion'?'type-only':'source-only';
  }else{
   need(reviewed.classification==='mapped'&&reviewed.counterpart===actual.resourceFile&&reviewed.closureRole===actual.closureTuple.role&&reviewed.executionInput===(actual.category==='published-execution')&&reviewed.byteEqual===true&&reviewed.reviewStatus==='reviewed-bounded-project-implementation','published execution/resolution correspondence differs');
   readerClass=reviewed.role==='runtime-code'&&actual.file.endsWith('/presentation.ts')?'analysis-presentation':'pure-rule-or-rule-data';compileScope='main-service-bundle';
  }
  need(declared.readerClass===readerClass&&declared.compileScope===compileScope&&declared.storeRequiredSourceRole===false&&declared.versions.length===1,'registered exact class/scope/version count differs');
  need(equal(declared.versions[0],{version:M944_SOURCE_VERSION,pin:{sha256:actual.sha256,bytes:actual.bytes},sourceCommit:review.fixedCommit,reviewIds:[M944_REVIEW_ID]}),'source version or exact review binding differs');
  return{...actual,readerClass,compileScope,version:M944_SOURCE_VERSION,sourceCommit:review.fixedCommit,reviewIds:[M944_REVIEW_ID],sourceReviewStatus:reviewed.reviewStatus,perFileReviewId:reviewed.reviewId,judgment:reviewed.judgment,reviewRef:M940_EXACT15_REVIEW,registrationAllowed:false};
 });
 // Recheck the entire source/publication correspondence and review refs at close.
 const closing=inspectProjectV132RegistrationCorrespondence({root});need(equal(closing.selected,inspected.selected)&&equal(closing.companions,inspected.companions),'source/publication changed during review binding');for(const ref of checkedRefs.values())checked(ref);
 return{status:'matched-exact15-reviewed-source-compatibility',scope:PROJECT_V132_SOURCE_ROOT+' exact15 only',sourceRegistrationMatched:true,sourceReviewStatus:'bound-exact15-independent-review',sourceBase:review.fixedCommit,reviewRef:M940_EXACT15_REVIEW,manifestRef:M940_EXACT15_MANIFEST,publishedFiles:10,execution:9,resolution:1,sourceOnlyCompanions:5,selected,contextDependenciesRegistered:0,productionApproved:false,sourceBuildApproved:false,activation:'off',traditionalConclusion:'unknown',methodScope:'project-proposal-only',scoreChange:0,outerSealsResealed:false};
}
