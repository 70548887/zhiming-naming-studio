import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual as equal} from 'node:util';
import {M929_EXTENSION_PROFILE,M925_PRESERVED_VERSION_PATHS,verifyM925QiongtongRegistration} from './qiongtong-source-registration-929.mjs';
import {verifyProjectV132SourceRegistration} from './project-v132-registration-944.mjs';
import {verifyConsumerSourceRegistration} from './consumer-source-registration-964.mjs';
import {verifyImagerySourceRegistration} from './imagery-source-registration-980.mjs';
import {verifyCoverageSourceRegistration} from './coverage-source-registration-1011.mjs';
import {verifySemanticSourceRegistration} from './semantic-source-registration-1035.mjs';
import {verifyQimenCulturalSourceRegistration} from './qimen-cultural-source-registration-1066.mjs';

const moduleRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const ADMISSION_PATHS=Object.freeze({
 registry:'scripts/verification/source-profile-138-approvals.json',
 outer:'scripts/verification/admission/outer-target-m535.json',
 inner:'scripts/verification/admission/inner-target-m535.json',
 receipt:'scripts/verification/review-receipts/team-490-m535-admission.json',
 base:'scripts/verification/admission/m529-subject-baseline.json',
});
export const DETACHED_ADMISSION_INPUTS=Object.freeze([
 Object.freeze({kind:'registry',file:ADMISSION_PATHS.registry}),
 Object.freeze({kind:'independent-review-receipt',file:ADMISSION_PATHS.receipt}),
 Object.freeze({kind:'self-describing-target-manifest',file:ADMISSION_PATHS.outer}),
]);
const detached=new Set(DETACHED_ADMISSION_INPUTS.map(row=>row.file));
const generatedRoots=new Set(['.git','node_modules','dist','dist-electron','release']);
const profileFile='scripts/verification/review-source-profile-138-m480.json';
const contractFile='scripts/verification/review-resources-138.json';
const M529_BASELINE_SHA256='edca81a4e8e4096b94cab404d822ef5545c4e9691a1d1b8d7e063d52059e4d15';
const baseContractFile='scripts/verification/review-resources-138-m489-base.json';
export const SOURCE_EXTENSION_PROFILE=M929_EXTENSION_PROFILE;
const extraFiles=['index.html','scripts/fixed-moe-index.d.mts','scripts/fixed-moe-index.mjs','src/domain/naming-review-v7.mjs','src/main/m393-meaning-candidate-pins.mjs','src/main/m393-meaning-candidate.mjs','src/main/m460-publication-data.d.mts','src/main/m460-publication-data.mjs','src/main/m460-publication-pins.mjs','vite.config.ts'].sort();
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const encoded=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const need=(ok,message)=>{if(!ok)throw Object.assign(new Error('Outer source admission: '+message),{code:'raw138-outer-admission-rejected'});};
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
function keys(value,names){need(plain(value)&&equal(Object.keys(value).sort(),[...names].sort()),'missing or unknown fields');}
export function safeAdmissionPath(file){need(typeof file==='string'&&file&&!/[\\:]/.test(file)&&!file.startsWith('/')&&file.split('/').every(part=>part&&part!=='.'&&part!=='..'&&!['__proto__','prototype','constructor'].includes(part)),'safe checkout-relative path required');return file;}
function absolute(file,directory=false){need(typeof file==='string'&&path.isAbsolute(file),'absolute input required');const target=path.resolve(file);let current=path.parse(target).root;for(const part of target.slice(current.length).split(path.sep).filter(Boolean)){current=path.join(current,part);need(!fs.lstatSync(current).isSymbolicLink(),'linked admission input rejected');}const stat=fs.statSync(target);need(directory?stat.isDirectory():stat.isFile(),'ordinary admission input required');return target;}
function read(root,file){safeAdmissionPath(file);root=absolute(root,true);const target=absolute(path.join(root,...file.split('/'))),fd=fs.openSync(target,'r');let before,after,bytes;try{before=fs.fstatSync(fd,{bigint:true});bytes=fs.readFileSync(fd);after=fs.fstatSync(fd,{bigint:true});}finally{fs.closeSync(fd);}const now=fs.statSync(target,{bigint:true});need(before.isFile()&&before.dev===after.dev&&before.ino===after.ino&&before.size===after.size&&before.mtimeNs===after.mtimeNs&&before.ctimeNs===after.ctimeNs&&after.dev===now.dev&&after.ino===now.ino&&after.size===now.size&&after.mtimeNs===now.mtimeNs&&after.ctimeNs===now.ctimeNs&&BigInt(bytes.length)===now.size,'admission input changed during read');return{bytes,ref:{file,sha256:sha(bytes),bytes:bytes.length}};}
function json(raw){need(raw.bytes.length<=16*1024*1024,'admission JSON too large');return JSON.parse(raw.bytes.toString('utf8'));}
function identity(value){keys(value,['sha256','bytes']);need(/^[a-f0-9]{64}$/.test(value.sha256)&&Number.isSafeInteger(value.bytes)&&value.bytes>0,'exact positive byte identity required');return value;}
function reference(value){keys(value,['file','sha256','bytes']);safeAdmissionPath(value.file);identity({sha256:value.sha256,bytes:value.bytes});return value;}
/** This additive layer matches fixed source bytes and bounded review records.
 * It never registers an admission or upgrades a source review to data authority. */
export function verifyManagedSourceExtensions(options){
 keys(options,['root']);const root=absolute(options.root,true);
 need(path.relative(absolute(moduleRoot,true),root)==='','source extensions require the canonical module checkout');
 const checked=(ref)=>{reference(ref);const actual=read(root,ref.file);need(equal(actual.ref,ref),'source extensions fixed input differs: '+ref.file);return actual;};
 const raw=checked(SOURCE_EXTENSION_PROFILE),profile=json(raw);
 keys(profile,['schema','profileId','applicationVersion','scope','activation','productionAdmission','authority','productBase','historicalSourceInventory','historicalResourceContract','reviews','sourceRoles','resources','readerCompanions','packageProjection','readerTransitions','limits']);
 need(profile.schema==='naming-source-extension-profile/1'&&profile.profileId==='raw138-source-extensions-m1066-qimen/1'&&profile.applicationVersion==='1.0.38'&&profile.scope==='source-compatibility-candidate-only'&&profile.activation==='off'&&profile.productionAdmission===false,'source extensions scope is not a production admission');
 need(equal(profile.authority,{automaticNameRecommendation:false,wholeNameAssessment:false,scoreDelta:0,rankingDelta:0,traditionalRuleAuthority:false}),'source extensions cannot grant business authority');
 keys(profile.productBase,['commit','scope']);need(/^[a-f0-9]{40}$/.test(profile.productBase.commit),'source extensions product commit required');
 need(profile.historicalSourceInventory.file===ADMISSION_PATHS.base&&profile.historicalSourceInventory.sha256===M529_BASELINE_SHA256,'source extensions historical source inventory differs');
 const historical=json(checked(profile.historicalSourceInventory));need(Array.isArray(historical.files),'source extensions historical paths required');
 need(profile.historicalResourceContract.file===baseContractFile&&profile.historicalResourceContract.sha256==='21950ab68f842ece26980496203250530e1811cdc6cb742f280bf94a4bb22886','source extensions historical resource contract differs');
 const originalContract=checked(profile.historicalResourceContract);
 need(equal(read(root,contractFile).bytes,originalContract.bytes),'source extensions may not rewrite the historical137 contract');
 need(Array.isArray(profile.reviews)&&profile.reviews.length===19,'source extensions exact bounded review set required');
 const reviews=new Map();
 for(const row of profile.reviews){
  keys(row,['id','file','sha256','bytes','decision','scope','productionApproval']);need(typeof row.id==='string'&&!reviews.has(row.id)&&row.productionApproval===false,'source extensions unique non-production review required');
  need(row.file.startsWith('scripts/verification/extension-evidence/')||['scripts/verification/publication-evidence/M518-source-review.json','scripts/verification/publication-evidence/M541-reader-migration.json'].includes(row.file),'source extensions unmanaged review path');
  const doc=json(checked({file:row.file,sha256:row.sha256,bytes:row.bytes}));keys(row.decision,['pointer','value']);
  need(typeof row.decision.pointer==='string'&&row.decision.pointer.startsWith('/'),'source extensions exact review decision pointer required');
  let value=doc;for(const part of row.decision.pointer.slice(1).split('/')){need(plain(value)&&Object.hasOwn(value,part),'source extensions review decision missing');value=value[part];}
  need(equal(value,row.decision.value),'source extensions bounded review decision differs');reviews.set(row.id,row);
 }
 const qiongtongRegistration=verifyM925QiongtongRegistration({root});
 const projectV132Registration=verifyProjectV132SourceRegistration({root});
 const consumerRegistration=verifyConsumerSourceRegistration({root});
 const imageryRegistration=verifyImagerySourceRegistration({root});
 const coverageRegistration=verifyCoverageSourceRegistration({root});
 const semanticRegistration=verifySemanticSourceRegistration({root});
 const qimenCulturalRegistration=verifyQimenCulturalSourceRegistration({root});
 const knownIds=(ids)=>{need(Array.isArray(ids)&&ids.length>0&&new Set(ids).size===ids.length&&ids.every(id=>reviews.has(id)),'source extensions unknown or duplicate review reference');};
 const files=new Set(),roleIds=new Set();
 const select=(row,{transition=false}={})=>{
  safeAdmissionPath(row.file);need(!files.has(row.file),'source extensions duplicate source/resource path');files.add(row.file);
  need(Array.isArray(row.versions)&&row.versions.length===(transition||M925_PRESERVED_VERSION_PATHS.includes(row.file)?2:1),'source extensions exact supported versions required');
  const actual=read(root,row.file).ref,versions=new Set();let selected=null;
  for(const version of row.versions){
   keys(version,transition?['version','pin','reviewIds']:['version','pin','sourceCommit','reviewIds']);
   need(typeof version.version==='string'&&version.version&&!versions.has(version.version),'source extensions duplicate version');versions.add(version.version);identity(version.pin);knownIds(version.reviewIds);
   if(!transition)need(/^[a-f0-9]{40}$/.test(version.sourceCommit),'source extensions source commit required');
   if(actual.bytes===version.pin.bytes&&actual.sha256===version.pin.sha256)selected=version;
  }
  need(selected!==null,'source extensions unknown bytes/version: '+row.file);
  return{file:row.file,sha256:actual.sha256,bytes:actual.bytes,version:selected.version,sourceCommit:selected.sourceCommit??null,reviewIds:[...selected.reviewIds]};
 };
 need(Array.isArray(profile.sourceRoles)&&profile.sourceRoles.length===88&&Array.isArray(profile.resources)&&profile.resources.length===9&&Array.isArray(profile.readerCompanions)&&profile.readerCompanions.length===3,'source extensions exact88sources/9resources/3companions required');
 const sourceRoles=profile.sourceRoles.map(row=>{keys(row,['role','file','readerClass','compileScope','storeRequiredSourceRole','versions']);need(row.file.startsWith('src/')&&typeof row.role==='string'&&!roleIds.has(row.role)&&row.storeRequiredSourceRole===false,'source extensions role path or legacy compile authority differs');roleIds.add(row.role);need(['type-contract','private-byte-digest','service-fixed-source-reader','read-only-renderer','pure-rule-or-rule-data','analysis-presentation','source-only-notice','source-only-license'].includes(row.readerClass)&&['type-only','main-store-bundle','renderer-bundle','main-service-bundle','source-only'].includes(row.compileScope),'source extensions unknown reader classification');return{...select(row),role:row.role,readerClass:row.readerClass,compileScope:row.compileScope};});
 const readerCompanions=profile.readerCompanions.map(row=>{keys(row,['role','file','readerClass','versions']);need(row.file.startsWith('scripts/meaning-context-m460-b04-')&&['type-contract','service-fixed-source-reader'].includes(row.readerClass),'source extensions unknown reader companion');return{...select(row),role:row.role,readerClass:row.readerClass};});
 const readerPaths=new Set([...sourceRoles,...readerCompanions].map(row=>row.file));
 const resources=profile.resources.map(row=>{keys(row,['role','file','group','readerFiles','versions']);need(row.file.startsWith('data/')&&['qiongtong-three-clause-reference','b04-full-word-context-candidate'].includes(row.group)&&Array.isArray(row.readerFiles)&&row.readerFiles.length>0&&row.readerFiles.every(file=>readerPaths.has(file)),'source extensions resource reader closure missing');return{...select(row),role:row.role,group:row.group,readerFiles:[...row.readerFiles]};});
 const historicalSources=new Set(historical.files.filter(row=>row.file.startsWith('src/')).map(row=>row.file)),newPaths=new Set(sourceRoles.map(row=>row.file));
 const walk=(dir,prefix)=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=prefix+'/'+entry.name;safeAdmissionPath(file);need(!entry.isSymbolicLink(),'source extensions linked source rejected');if(entry.isDirectory())walk(path.join(dir,entry.name),file);else need(historicalSources.has(file)||newPaths.has(file),'source extensions unknown source path: '+file);}};walk(path.join(root,'src'),'src');
 keys(profile.packageProjection,['legacySourceCommit','legacyBuildFiles','explicitAppends']);need(/^[a-f0-9]{40}$/.test(profile.packageProjection.legacySourceCommit),'source extensions package origin commit required');
 const pkg=json(read(root,'package.json')),legacy=profile.packageProjection.legacyBuildFiles,appends=profile.packageProjection.explicitAppends;
 need(pkg.version==='1.0.38'&&Array.isArray(legacy)&&Array.isArray(appends)&&appends.length===12&&Array.isArray(pkg.build?.files),'source extensions explicit package projection required');
 need(new Set([...legacy,...appends]).size===legacy.length+appends.length&&equal(pkg.build.files.filter(file=>!appends.includes(file)),legacy)&&equal(pkg.build.files.filter(file=>!legacy.includes(file)),appends),'source extensions unknown or changed package projection');
 need(resources.every(row=>appends.includes(row.file)&&pkg.build.files.includes(row.file))&&readerCompanions.every(row=>appends.includes(row.file)),'source extensions package reader/resource closure incomplete');
 need(Array.isArray(profile.readerTransitions)&&profile.readerTransitions.length===1,'source extensions exact reviewed source transition required');
 const transitions=profile.readerTransitions.map(row=>{keys(row,['file','scope','versions']);need(row.file==='src/main/m393-meaning-candidate.mjs'&&row.scope==='reuse-fixed-M541-M518-exact-source-only-transition','source extensions unknown reader transition');return select(row,{transition:true});});
 // A closing profile read prevents a selected map being exchanged mid-check.
 need(equal(checked(SOURCE_EXTENSION_PROFILE).ref,raw.ref),'source extensions profile changed');
 return{status:'matched-source-only',profileRef:raw.ref,scope:profile.scope,productionApproved:false,activation:'off',sourceRoles,resources,readerCompanions,readerTransitions:transitions,qiongtongRegistration,projectV132Registration,consumerRegistration,imageryRegistration,coverageRegistration,semanticRegistration,qimenCulturalRegistration};
}
const digest=value=>({sha256:sha(encoded(value)),bytes:encoded(value).length});
function exactRows(rows,expectedFiles,label){need(Array.isArray(rows)&&rows.length===expectedFiles.length,label+' set/count differs');const files=rows.map(row=>reference(row).file);need(new Set(files).size===files.length&&equal([...files].sort(),[...expectedFiles].sort()),label+' missing, duplicate or unknown reference');}
function ciFile(file){return file.startsWith('fixtures/publication-roots/')||file.startsWith('.github/')||file.startsWith('scripts/ci/')||file.startsWith('scripts/verification/')||['data/publication-lock-baseline.json','data/publication-roots.json','data/publication-roots.example.json'].includes(file);}

/** Enumerates every source/data subject. Only exact detached documents and
 * explicit generated/VCS/dependency roots are outside the source subject. */
export function inventoryAdmissionSubjects(root){
 root=absolute(root,true);const rows=[];
 function walk(dir,prefix=''){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const file=prefix?prefix+'/'+entry.name:entry.name;safeAdmissionPath(file);
  if(!prefix&&generatedRoots.has(entry.name))continue;
  if(file==='verification-output'){need(entry.isDirectory()&&!entry.isSymbolicLink(),'ordinary generated evidence directory required');evidence(path.join(dir,entry.name));continue;}
  if(detached.has(file))continue;
  need(!entry.isSymbolicLink(),'linked subject rejected: '+file);
  if(entry.isDirectory())walk(path.join(dir,entry.name),file);else rows.push(read(root,file).ref);
 }}
 function evidence(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){need(!entry.isSymbolicLink(),'linked evidence rejected');const p=path.join(dir,entry.name);if(entry.isDirectory())evidence(p);else need(/\.(?:json|log|txt)$/i.test(entry.name),'source code is not an evidence exclusion');}}
 walk(root);rows.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);return rows;
}
function sameRef(a,b,message){reference(a);reference(b);need(equal(a,b),message);}
function validateInner(inner,baseProfile,baseContract,baseProfileRef,baseContractRef){
 keys(inner,['schema','profileId','applicationVersion','baseProfile','baseContract','sourceLockBaseline','sourceLockVerifier','roles','sourceReaders']);
 need(inner.schema==='naming-source-reseal-targets/1'&&inner.profileId==='raw138-m489/1'&&inner.applicationVersion==='1.0.38','unknown inner target');
 sameRef(inner.baseProfile,baseProfileRef,'historical profile identity differs');keys(inner.baseContract,['file','before','after']);need(inner.baseContract.file===contractFile&&equal(inner.baseContract.before,{sha256:baseContractRef.sha256,bytes:baseContractRef.bytes}),'inner historical contract differs');identity(inner.baseContract.after);
 need(Array.isArray(inner.roles)&&inner.roles.length===19&&baseProfile.approvedRoles.length===19,'exact19roles required');
 for(let i=0;i<19;i++){const row=inner.roles[i],old=baseProfile.approvedRoles[i];keys(row,['role','file','readerRequired','sourceGate','before','after']);safeAdmissionPath(row.file);identity(row.before);identity(row.after);need(row.role===old.role&&row.file===old.file&&row.readerRequired===old.readerRequired&&equal(row.before,{sha256:old.sha256,bytes:old.bytes})&&equal(row.sourceGate,old.sourceGate),'inner source role/provenance differs');}
 const readers=new Map(baseContract.sourceReaders.map(row=>[row.file,row]));for(const row of baseProfile.approvedRoles)readers.set(row.file,row);
 need(readers.size===34&&Array.isArray(inner.sourceReaders)&&inner.sourceReaders.length===34,'exact34readers required');
 const seen=new Set();for(const row of inner.sourceReaders){keys(row,['file','before','after']);safeAdmissionPath(row.file);const old=readers.get(row.file);need(old&&!seen.has(row.file),'unknown or duplicate inner reader');seen.add(row.file);need(equal(row.before,{sha256:old.sha256,...(old.bytes===undefined?{}:{bytes:old.bytes})}),'inner historical reader differs');identity(row.after);}
 for(const row of inner.roles){const reader=inner.sourceReaders.find(item=>item.file===row.file);need(reader&&equal(reader.after,row.after),'inner role/reader identity differs');}
 return inner;
}
function components(target){return{sourceRoles:digest(target.sourceRoles),effectiveSourceReaders:digest(target.effectiveSourceReaders),nonSourceReaderContractFields:digest(target.nonSourceReaderContractFields),additionalSourcePins:digest(target.additionalSourcePins),ciPostimages:digest(target.ciPostimages),subjectFiles:digest(target.subjectFiles),declaredSourceChanges:digest(target.declaredSourceChanges),comparisonBase:digest(target.comparisonBase)};}
function changed(inner){const rows=new Map();for(const row of inner.sourceReaders)if(row.before.sha256!==row.after.sha256||(row.before.bytes!==undefined&&row.before.bytes!==row.after.bytes))rows.set(row.file,{file:row.file,before:row.before,after:row.after});return[...rows.values()].sort((a,b)=>a.file<b.file?-1:1);}

/** Same core for production and explicit fixtures. No CLI or environment flag
 * can select fixture scope in either production entrypoint. */
function evaluate({root,scope,registry,outerRaw,innerRaw,receiptRaw,baseProfile,baseContract,baseProfileRef,baseContractRef}){
 const fixture=scope==='test-fixture';need(fixture||scope==='production','unknown admission scope');
 keys(registry,['schema','scope','admissions']);need(registry.schema==='naming-outer-source-admission-registry/1'&&registry.scope===scope&&Array.isArray(registry.admissions),'unknown registry scope/schema');
 need(registry.admissions.length===1,'one exact outer admission is required; empty/subset/duplicate registry rejected');
 const entry=registry.admissions[0];keys(entry,['targetId','outer','inner','receipt','reviewer','taskId']);need(['targetId','reviewer','taskId'].every(key=>typeof entry[key]==='string'&&entry[key].length>0),'complete registry identity required');
 for(const [kind,raw]of [['outer',outerRaw],['inner',innerRaw],['receipt',receiptRaw]]){need(raw,'missing '+kind+' admission input');sameRef(entry[kind],raw.ref,kind+' registered bytes/SHA differ');need(entry[kind].file===ADMISSION_PATHS[kind],'unmanaged admission reference');}
 const target=json(outerRaw),inner=json(innerRaw),receipt=json(receiptRaw);
 keys(target,['schema','scope','targetId','applicationVersion','detachedAdmissionInputs','innerTarget','comparisonBase','subjectFiles','sourceRoles','effectiveSourceReaders','resourceContract','nonSourceReaderContractFields','additionalSourcePins','ciPostimages','declaredSourceChanges']);
 need(target.schema==='naming-outer-source-target/1'&&target.scope===scope&&target.targetId===entry.targetId&&target.applicationVersion==='1.0.38','unknown outer target');
 need(equal(target.detachedAdmissionInputs,DETACHED_ADMISSION_INPUTS),'detached admission inputs missing, subset, duplicate or broad exclusion');
 sameRef(target.innerTarget,innerRaw.ref,'outer/inner exact target mismatch');validateInner(inner,baseProfile,baseContract,baseProfileRef,baseContractRef);
 need(equal(target.sourceRoles,inner.roles)&&equal(target.effectiveSourceReaders,inner.sourceReaders)&&equal(target.declaredSourceChanges,changed(inner)),'complete19/34/source delta binding differs');
 const observed=inventoryAdmissionSubjects(root);exactRows(target.subjectFiles,observed.map(row=>row.file),'source freeze');need(equal(target.subjectFiles,observed),'actual subject path/bytes/SHA differs');
 const subjects=new Map(observed.map(row=>[row.file,row]));need(subjects.has(ADMISSION_PATHS.inner)&&equal(subjects.get(ADMISSION_PATHS.inner),innerRaw.ref),'inner target is not a hashed source subject');
 for(const row of [...inner.roles,...inner.sourceReaders])sameRef(subjects.get(row.file),{file:row.file,...row.after},'actual declared source SHA differs: '+row.file);
 for(const row of inner.roles)sameRef(subjects.get(row.sourceGate.file),row.sourceGate,'historical review receipt differs');
 for(const row of target.declaredSourceChanges)sameRef(read(root,row.file).ref,{file:row.file,...row.after},'declared delta differs from actual source: '+row.file);
 for(const expected of [inner.sourceLockBaseline,inner.sourceLockVerifier])sameRef(subjects.get(expected.file),expected,'source-lock checker/baseline differs');
 const contractRaw=read(root,contractFile),contract=json(contractRaw);sameRef(target.resourceContract,contractRaw.ref,'resource contract identity differs');sameRef({file:inner.baseContract.file,...inner.baseContract.after},contractRaw.ref,'inner actual contract differs');
 const nonReaders=value=>Object.fromEntries(Object.entries(value).filter(([key])=>key!=='sourceReaders'));
 need(Object.keys(nonReaders(contract)).length===12&&equal(target.nonSourceReaderContractFields,nonReaders(contract))&&equal(nonReaders(contract),nonReaders(baseContract)),'all12non-sourceReader contract fields differ');
 for(const [file,expected]of Object.entries(contract.files))sameRef(subjects.get(file),{file,sha256:expected.sha256,bytes:expected.bytes},'original resource/data subject differs: '+file);
 exactRows(target.additionalSourcePins,extraFiles,'additional source pins');for(const row of target.additionalSourcePins)sameRef(subjects.get(row.file),row,'extra source pin differs: '+row.file);
 const ci=observed.filter(row=>ciFile(row.file));exactRows(target.ciPostimages,ci.map(row=>row.file),'CI postimages');need(equal(target.ciPostimages,ci),'CI actual postimage differs');
 const baseRaw=read(root,ADMISSION_PATHS.base);sameRef(target.comparisonBase,baseRaw.ref,'comparison baseline identity differs');if(!fixture)need(baseRaw.ref.sha256===M529_BASELINE_SHA256,'canonical comparison baseline differs');const base=json(baseRaw);need(Array.isArray(base.files),'comparison baseline files required');
 for(const row of base.files){reference(row);if(!detached.has(row.file))need(subjects.has(row.file),'original source/data/rootDecision/pin omitted from subject: '+row.file);}
 keys(receipt,['schema','scope','synthetic','decision','targetId','outer','inner','approvedBindings','reviewer','taskId','limitations']);
 need(receipt.schema==='naming-outer-source-review/1'&&receipt.scope===scope&&receipt.synthetic===fixture&&receipt.decision===(fixture?'TEST-FIXTURE-ONLY':'APPROVED-EXACT-OUTER-SOURCE')&&receipt.targetId===target.targetId&&receipt.reviewer===entry.reviewer&&receipt.taskId===entry.taskId&&Array.isArray(receipt.limitations),'independent exact outer receipt required; fixture cannot approve production');
 sameRef(receipt.outer,outerRaw.ref,'receipt outer differs');sameRef(receipt.inner,innerRaw.ref,'receipt inner differs');need(equal(receipt.approvedBindings,components(target)),'receipt omitted or changed complete target bindings');
 // Closing reads prevent an admission document being exchanged during hashing.
 for(const raw of [outerRaw,innerRaw,receiptRaw])sameRef(read(root,raw.ref.file).ref,raw.ref,'admission input changed during verification');
 return{scope,status:fixture?'test-fixture-admitted':'production-source-admitted',productionApproved:!fixture,target,inner,outerRef:outerRaw.ref,innerRef:innerRaw.ref,receiptRef:receiptRaw.ref,checkedSubjectFiles:observed.length};
}
function context(root,scope){
 const profileRaw=read(root,profileFile),baseRaw=read(root,baseContractFile);
 if(scope==='production')need(profileRaw.ref.sha256==='393d423ba8212cfc2deab2f5a7c669b2b9a2953597c75a3db906e187419cd2b2'&&baseRaw.ref.sha256==='21950ab68f842ece26980496203250530e1811cdc6cb742f280bf94a4bb22886','canonical historical admission source differs');
 return{baseProfile:json(profileRaw),baseContract:json(baseRaw),baseProfileRef:profileRaw.ref,baseContractRef:baseRaw.ref};
}
function managed(root,scope){
 root=absolute(root,true);if(scope==='production')need(path.relative(absolute(moduleRoot,true),root)==='','production registry must come from the canonical module checkout');
 if(scope==='production')verifyManagedSourceExtensions({root});
 const registryRaw=read(root,ADMISSION_PATHS.registry),registry=json(registryRaw);keys(registry,['schema','scope','admissions']);need(registry.scope===scope&&Array.isArray(registry.admissions),'managed registry scope differs');
 need(registry.admissions.length===1,'one exact outer admission is required; current managed registry is empty or duplicated');
 const entry=registry.admissions[0];keys(entry,['targetId','outer','inner','receipt','reviewer','taskId']);
 for(const kind of ['outer','inner','receipt']){reference(entry[kind]);need(entry[kind].file===ADMISSION_PATHS[kind],'arbitrary admission path rejected');}
 const result=evaluate({root,scope,registry,outerRaw:read(root,ADMISSION_PATHS.outer),innerRaw:read(root,ADMISSION_PATHS.inner),receiptRaw:read(root,ADMISSION_PATHS.receipt),...context(root,scope)});
 sameRef(read(root,ADMISSION_PATHS.registry).ref,registryRaw.ref,'managed registry changed during admission');return result;
}
export function requireManagedOuterAdmission({root}){return managed(root,'production');}
export function evaluateFixtureOuterAdmission({root,scope}){need(scope==='test-fixture','explicit test-fixture scope required');return managed(root,'test-fixture');}

/** Observation tool: does not register or approve anything. Final subjects must
 * be regenerated after code and owner06 r3 are frozen. */
export function observeOuterTarget({root,scope='production',targetId='raw138-m535/M519/1'}){
 root=absolute(root,true);if(scope==='production')need(path.relative(moduleRoot,root)==='','production observation uses canonical checkout');else need(scope==='test-fixture','unknown observation scope');
 const {baseProfile,baseContract,baseProfileRef,baseContractRef}=context(root,scope),innerRaw=read(root,ADMISSION_PATHS.inner),inner=validateInner(json(innerRaw),baseProfile,baseContract,baseProfileRef,baseContractRef),subjects=inventoryAdmissionSubjects(root),contractRaw=read(root,contractFile),contract=json(contractRaw),withoutReaders=Object.fromEntries(Object.entries(contract).filter(([key])=>key!=='sourceReaders'));
 const byFile=new Map(subjects.map(row=>[row.file,row]));for(const row of [...inner.roles,...inner.sourceReaders])sameRef(byFile.get(row.file),{file:row.file,...row.after},'observed inner source differs');
 return{schema:'naming-outer-source-target/1',scope,targetId,applicationVersion:'1.0.38',detachedAdmissionInputs:DETACHED_ADMISSION_INPUTS,innerTarget:innerRaw.ref,comparisonBase:read(root,ADMISSION_PATHS.base).ref,subjectFiles:subjects,sourceRoles:inner.roles,effectiveSourceReaders:inner.sourceReaders,resourceContract:contractRaw.ref,nonSourceReaderContractFields:withoutReaders,additionalSourcePins:extraFiles.map(file=>{need(byFile.has(file),'extra source missing: '+file);return byFile.get(file);}),ciPostimages:subjects.filter(row=>ciFile(row.file)),declaredSourceChanges:changed(inner)};
}
export function fixtureReviewBindings(target){need(target.scope==='test-fixture','fixture binding API is test-only');return components(target);}
function writeNew(file,bytes){need(!fs.existsSync(file)&&!fs.existsSync(file+'.new'),'preserve existing admission output');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.new',bytes,{flag:'wx'});fs.renameSync(file+'.new',file);}
export function sealManagedOuterAdmission({root,output}){
 const admission=requireManagedOuterAdmission({root});need(path.isAbsolute(output)&&!fs.existsSync(output),'fresh absolute seal output required');absolute(path.dirname(output),true);const outputRelation=path.relative(path.resolve(root),path.resolve(output));need(outputRelation.startsWith('..'+path.sep)||outputRelation==='..'||path.isAbsolute(outputRelation),'seal output must be outside the authenticated source subject');
 // No code/profile SHA changes on admission: only the exact detached documents
 // are transported. Subject files already bind loader, sealer and all CI code.
 const files=[];for(const file of [ADMISSION_PATHS.registry,ADMISSION_PATHS.outer,ADMISSION_PATHS.inner,ADMISSION_PATHS.receipt]){const actual=read(root,file);writeNew(path.join(output,...file.split('/')),actual.bytes);files.push(actual.ref);}
 const result={schema:'naming-managed-outer-seal/1',scope:'production',status:'independent-exact-outer-admission-bound;full-source-gate-not-run',outer:admission.outerRef,inner:admission.innerRef,receipt:admission.receiptRef,checkedSubjectFiles:admission.checkedSubjectFiles,files};writeNew(path.join(output,'MANIFEST.json'),encoded(result));return result;
}
