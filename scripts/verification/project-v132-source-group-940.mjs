// Exact-reader routines adapted from qiongtong-source-registration-929.mjs.
// This candidate verifies one group; it is not imported by an active gate.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual as equal} from 'node:util';

const moduleRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const PROJECT_V132_CANDIDATE=Object.freeze({file:'scripts/verification/extension-evidence/m940/project-v132-correspondence-candidate.json',sha256:'00eb3e3b7a624d623e1c86a524c3eddc6f5d952e59857d2e107e7c48c8a761ee',bytes:18473});
export const PROJECT_V132_SOURCE_ROOT='src/domain/bazi-mainchain/project-v132';
const ASSET_ROOT='assets/bazi-root-feedback/1.3.2-r2';
const PREFIX='execution-source/'+PROJECT_V132_SOURCE_ROOT+'/';
const need=(ok,message)=>{if(!ok)throw Object.assign(new Error('M940 project-v132 group: '+message),{code:'m940-project-v132-rejected'});};
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
// Same canonical object-key ordering as the fixed r2 builder. JSON inputs only.
const canonical=value=>JSON.stringify(value&&typeof value==='object'?Array.isArray(value)?value.map(item=>JSON.parse(canonical(item))):Object.fromEntries(Object.keys(value).sort().map(key=>[key,JSON.parse(canonical(value[key]))])):value);
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
function tree(root,relative){
 const files=[];
 function walk(directory,prefix){absolute(directory,true);for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=prefix+'/'+entry.name;need(safe(file)&&!entry.isSymbolicLink(),'unsafe or linked group path');if(entry.isDirectory())walk(path.join(directory,entry.name),file);else{need(entry.isFile(),'non-file group path');files.push(file);}}}
 walk(path.join(root,...relative.split('/')),relative);return files.sort();
}
function exactPaths(actual,expected,label){need(expected.every(safe)&&new Set(expected).size===expected.length&&equal([...actual].sort(),[...expected].sort()),label+' missing, duplicate or extra source/path');}

/** Pure file inspection: 10 published mappings plus 5 source-only companions.
 * It never promotes publication integrity or caller flags into review authority. */
function inspectFixedGroup(options,publicationPinsReference=null){
 need(plain(options)&&equal(Object.keys(options),['root']),'only the canonical root option is accepted');
 const root=absolute(options.root,true);need(path.relative(absolute(moduleRoot,true),root)==='','canonical module checkout required');
 const checkedRefs=new Map();
 const checked=ref=>{need(plain(ref)&&safe(ref.file)&&/^[a-f0-9]{64}$/u.test(ref.sha256)&&Number.isSafeInteger(ref.bytes)&&ref.bytes>0,'exact fixed reference required');const actual=read(root,ref.file);need(equal(actual.ref,{file:ref.file,sha256:ref.sha256,bytes:ref.bytes}),'fixed bytes differ: '+ref.file);checkedRefs.set(ref.file,actual.ref);return actual;};
 const rawCandidate=checked(PROJECT_V132_CANDIDATE),candidate=JSON.parse(rawCandidate.bytes);
 need(candidate.schema==='project-v132-correspondence-candidate/1'&&candidate.sourceBase==='d46ebc65b738e6b76e9495875534b3f50dd47659'&&candidate.sourceRoot===PROJECT_V132_SOURCE_ROOT&&candidate.publicationRoot===ASSET_ROOT,'fixed group or source base differs');
 need(equal(candidate.authority,{activation:'off',sourceBuildApproved:false,productionAdmission:false,registrationAllowed:false,traditionalConclusion:'unknown',methodScope:'project-proposal-only',scoreChange:0}),'candidate cannot grant registration or naming authority');
 need(candidate.mapped.length===10&&candidate.companions.length===5&&candidate.mapped.every(row=>row.review.status==='pending-exact-group-source-review'&&row.review.reference===null)&&candidate.companions.every(row=>row.review.status==='pending-exact-companion-source-review'&&row.review.reference===null),'unreviewed candidate scope cannot be widened or marked reviewed');
 const manifestBytes=checked(candidate.manifest).bytes,manifestCopy=checked(candidate.manifestCopy).bytes;
 need(manifestBytes.equals(manifestCopy),'original and copied manifest differ');const manifest=JSON.parse(manifestBytes);
 if(publicationPinsReference)need(publicationPinsReference.sha256===candidate.buildPins.sha256&&publicationPinsReference.bytes===candidate.buildPins.bytes,'context publication pins must retain original bytes');
 const pins=JSON.parse(checked(publicationPinsReference??candidate.buildPins).bytes);
 const tuple={schema:manifest.schema,methodId:manifest.methodId,applicationPolicyVersion:manifest.applicationPolicyVersion,publicationId:manifest.publicationId,fullClosureSha256:manifest.fullClosureSha256,kernel:manifest.kernel,closureSchema:manifest.closure.schema};
 need(equal(tuple,candidate.tuple)&&pins.schema==='bazi-root-feedback-build-pins/2'&&pins.manifestSha256===candidate.manifest.sha256&&pins.publicationId===tuple.publicationId&&pins.fullClosureSha256===tuple.fullClosureSha256&&equal(pins.closure,manifest.closure)&&hash(canonical(manifest.closure))===tuple.fullClosureSha256,'version, double-manifest or full closure tuple differs');
 need(manifest.files.length===142&&manifest.closure.files.length===138&&manifest.closure.executionInputs.length===133,'fixed publication metadata counts differ');
 const published=manifest.files.filter(row=>row.path.startsWith(PREFIX)),closure=manifest.closure.files.filter(row=>row.sourcePath.startsWith(PROJECT_V132_SOURCE_ROOT+'/'));
 exactPaths(published.map(row=>row.path),candidate.mapped.map(row=>row.manifestPath),'published group');
 exactPaths(closure.map(row=>row.sourcePath),candidate.mapped.map(row=>row.sourceFile),'closure group');
 need(published.length===10&&closure.length===10,'exact ten published tuples required');
 const expectedSources=[...candidate.mapped.map(row=>row.sourceFile),...candidate.companions.map(row=>row.file)];
 exactPaths(tree(root,PROJECT_V132_SOURCE_ROOT),expectedSources,'actual source group');
 const publishedGroup=ASSET_ROOT+'/execution-source/'+PROJECT_V132_SOURCE_ROOT;
 exactPaths(tree(root,publishedGroup),candidate.mapped.map(row=>row.resourceFile),'actual published group');
 const sourceRecord=manifest.sources[0];need(manifest.sources.length===1&&sourceRecord.id==='project-bazi-mainchain-145-v132-r2-preview'&&sourceRecord.commit===tuple.fullClosureSha256,'fixed source attribution version differs');
 const selected=candidate.mapped.map(row=>{
  need(safe(row.sourceFile)&&row.sourceFile.startsWith(PROJECT_V132_SOURCE_ROOT+'/')&&row.manifestPath==='execution-source/'+row.sourceFile&&row.resourceFile===ASSET_ROOT+'/'+row.manifestPath,'source to execution asset remapping rejected');
  const expected={sourcePath:row.sourceFile,resourcePath:row.manifestPath,bytes:row.bytes,sha256:row.sha256,role:row.executionInput?'execution':'resolution'};
  need(equal(row.closureTuple,expected)&&equal(closure.find(value=>value.sourcePath===row.sourceFile),expected),'source closure mapping differs');
  need(row.category===(row.executionInput?'published-execution':'published-resolution')&&['execution','resolution'].includes(expected.role),'published role classification differs');
  const entries=published.filter(value=>value.path===row.manifestPath);need(entries.length===1&&equal(entries[0],{path:row.manifestPath,bytes:row.bytes,sha256:row.sha256,kind:row.kind}),'published file identity or kind differs');
  need(sourceRecord.files.filter(file=>file===row.manifestPath).length===1&&manifest.closure.executionInputs.filter(file=>file===row.sourceFile).length===(row.executionInput?1:0),'source attribution or execution input membership differs');
  const source=checked({file:row.sourceFile,sha256:row.sha256,bytes:row.bytes}),asset=checked({file:row.resourceFile,sha256:row.sha256,bytes:row.bytes});need(source.bytes.equals(asset.bytes),'source and published counterpart bytes differ');
  return{file:row.sourceFile,resourceFile:row.resourceFile,sha256:row.sha256,bytes:row.bytes,category:row.category,closureTuple:expected,sourceReviewStatus:'pending',reviewRef:null,registrationAllowed:false};
 });
 need(selected.filter(row=>row.category==='published-execution').length===9&&selected.filter(row=>row.category==='published-resolution').length===1,'execution9/resolution1 role mapping differs');
 const roles=new Map([
  [PROJECT_V132_SOURCE_ROOT+'/root-feedback-types.ts','type-only-source'],[PROJECT_V132_SOURCE_ROOT+'/types-v13-consumers.ts','type-only-source'],
  [PROJECT_V132_SOURCE_ROOT+'/NOTICE.md','project-proposal-notice'],[PROJECT_V132_SOURCE_ROOT+'/rules/CC-BY-SA-4.0.txt','license-CC-BY-SA-4.0'],[PROJECT_V132_SOURCE_ROOT+'/rules/lunar-typescript-LICENSE.txt','license-lunar-typescript-MIT']
 ]);
 const companions=candidate.companions.map(row=>{
  need(roles.get(row.file)===row.role&&row.category==='source-only-companion'&&row.executionAssetCounterpart===null&&row.gitSourceCommit===candidate.sourceBase&&/^[a-f0-9]{40}$/u.test(row.gitBlob),'source-only companion role, provenance or invented asset mapping differs');
  const actual=checked({file:row.file,sha256:row.sha256,bytes:row.bytes});
  need(createHash('sha1').update('blob '+actual.bytes.length+'\0').update(actual.bytes).digest('hex')===row.gitBlob,'companion fixed Git blob differs');
  need(!closure.some(value=>value.sourcePath===row.file),'source-only companion unexpectedly promoted to execution closure');
  return{file:row.file,sha256:row.sha256,bytes:row.bytes,category:row.category,role:row.role,executionAssetCounterpart:null,sourceReviewStatus:'pending-exact-independent-ref',reviewRef:null,registrationAllowed:false};
 });
 const lock=JSON.parse(read(root,PROJECT_V132_SOURCE_ROOT+'/rules/source-lock-1.3.2.json').bytes),rule=JSON.parse(read(root,PROJECT_V132_SOURCE_ROOT+'/rules/project-mainchain-1.3.2.json').bytes);
 need(rule.status==='independent-project-proposal'&&rule.defaultProductIntegration===false,'project proposal/default-off boundary differs');
 for(const row of companions.filter(row=>row.role==='type-only-source'))need(Object.values(lock).some(value=>plain(value)&&value[row.file]===row.sha256),'type companion missing from fixed source-lock record');
 const prior=candidate.priorEvidence.map(ref=>{checked({file:ref.file,sha256:ref.sha256,bytes:ref.bytes});need(ref.exactCurrentGroupSourceReview===false&&ref.grantsRegistration===false,'prior limited review cannot grant current group registration');return ref;});
 const priorResources=JSON.parse(read(root,prior.find(row=>row.id==='M786-publication-bytes').file).bytes).resources;
 const priorPublicationMatches=selected.map(row=>{
  const values=priorResources.filter(value=>value.path==='assets/project-naming-application/1.3.2-candidate.2/execution-source/'+row.file&&value.sha256===row.sha256&&value.bytes===row.bytes);
  need(values.length===1,'M786 publication pin is not an exact match');return{file:row.file,evidenceId:'M786-publication-bytes',sha256:row.sha256,bytes:row.bytes,basis:'same-byte publication integrity only; not current group source review',sourceReviewGranted:false};
 });
 exactPaths(tree(root,PROJECT_V132_SOURCE_ROOT),expectedSources,'closing source group');
 exactPaths(tree(root,publishedGroup),candidate.mapped.map(row=>row.resourceFile),'closing published group');
 for(const ref of checkedRefs.values())checked(ref);
 return{status:'matched-fixed-group-bytes-source-review-pending',sourceBase:candidate.sourceBase,scope:PROJECT_V132_SOURCE_ROOT+' only',sourceFiles:15,publishedCorrespondence:{matched:10,execution:9,resolution:1},sourceOnlyCompanions:5,selected,companions,priorPublicationMatches,sourceReviewStatus:'pending-actual15-source-independent-review',registrationAllowed:false,sourceBuildApproved:false,productionAdmission:false,activation:'off',traditionalConclusion:'unknown',methodScope:'project-proposal-only',scoreChange:0,activeGateModified:false,fullApplicationClosureVerified:false};
}

export function inspectProjectV132SourceGroup(options){return inspectFixedGroup(options);}
/** Source-group registration reads the exact original publication pins from a
 * fixed evidence copy. It does not register or attest the current root pins.ts/json.
 * The original M940 entry above continues to inspect that root context file. */
export function inspectProjectV132RegistrationCorrespondence(options){
 return inspectFixedGroup(options,{file:'scripts/verification/extension-evidence/m944/M940-build-pins-original.json',sha256:'e613b83ff2ff8432127ac80dcca4ca8fb968178933a007aa3f43365a39967c8b',bytes:53389});
}

/** A byte-identical publication is insufficient to register the current group. */
export function requireProjectV132SourceRegistration(options){
 const inspected=inspectProjectV132SourceGroup(options);
 need(inspected.sourceReviewStatus!=='pending-actual15-source-independent-review'&&inspected.registrationAllowed===true,'registration pending: exact independent review references for all10published and5source-only companions are not bound');
 return inspected;
}
