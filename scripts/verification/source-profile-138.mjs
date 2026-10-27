import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {requireManagedOuterAdmission,verifyManagedSourceExtensions} from './outer-source-admission-138.mjs';
import {verifyPublicationInventory} from './m491-publication-locks.mjs';

// This separate source revision never changes the historical137-resource union.
// M365/M480 remain historical provenance; current production always requires outer-m535 admission.
export const RAW138_SOURCE_ADMISSION_SCOPE='outer-m535/1';
export const RAW138_SOURCE_PROFILE_ID='raw138-m480/1';
export const RAW138_SOURCE_PROFILE_FILE='review-source-profile-138-m480.json';
export const RAW138_SOURCE_PROFILE_SHA256='393d423ba8212cfc2deab2f5a7c669b2b9a2953597c75a3db906e187419cd2b2';
const BASE_CONTRACT_SHA256='21950ab68f842ece26980496203250530e1811cdc6cb742f280bf94a4bb22886';
const readerRoles=['store','naming-dispatcher','naming-v7','candidate-facts','writer-finalization','customer-atomic-write','customer-write-notice'];
const noticeFiles=['src/main/main.ts','src/main/preload.ts','src/shared/browser-api.ts','scripts/dev-plugin.ts','src/renderer/main.tsx','src/main/customer-write-notice-invocation.ts','src/main/customer-write-notice-transport.ts','src/renderer/customer-write-notice-feed.ts','src/renderer/CustomerWriteNoticeBanner.css','src/renderer/CustomerWriteNoticeBanner.tsx','src/shared/customer-write-notice-delivery.ts'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function need(ok,message,code='invalid-raw138-source-profile'){if(!ok)throw Object.assign(new Error('Raw138 source profile: '+message),{code});}
function record(value){return value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;}
function keys(value,required,optional=[]){need(record(value),'plain JSON record required');need(required.every(name=>Object.hasOwn(value,name))&&Object.keys(value).every(name=>required.includes(name)||optional.includes(name)),'missing or unknown profile fields');return value;}
function relative(file){need(typeof file==='string'&&file.length>0&&!/[\\:]/.test(file)&&!file.startsWith('/')&&file.split('/').every(part=>part&&part!=='.'&&part!=='..'&&!['__proto__','prototype','constructor'].includes(part)),'safe project-relative source path required');return file;}
function absolute(file){need(typeof file==='string'&&path.isAbsolute(file),'absolute ordinary file path required');const target=path.resolve(file);let current=path.parse(target).root;for(const part of target.slice(current.length).split(path.sep)){current=path.join(current,part);const stat=fs.lstatSync(current);need(!stat.isSymbolicLink(),'source aliases are not admitted');}return target;}
function readFile(file){file=absolute(file);const fd=fs.openSync(file,'r');let bytes,before,after;try{before=fs.fstatSync(fd,{bigint:true});need(before.isFile(),'ordinary source file required');bytes=fs.readFileSync(fd);after=fs.fstatSync(fd,{bigint:true});}finally{fs.closeSync(fd);}const current=fs.statSync(file,{bigint:true});need(before.dev===after.dev&&before.ino===after.ino&&before.size===after.size&&before.mtimeNs===after.mtimeNs&&before.ctimeNs===after.ctimeNs&&after.dev===current.dev&&after.ino===current.ino&&after.size===current.size&&after.mtimeNs===current.mtimeNs&&after.ctimeNs===current.ctimeNs&&BigInt(bytes.length)===after.size,'source changed during authenticated read');return{ref:{file,sha256:hash(bytes),bytes:bytes.length},bytes};}
function fullRef(value){keys(value,['file','sha256','bytes']);need(typeof value.file==='string'&&path.isAbsolute(value.file)&&typeof value.sha256==='string'&&/^[a-f0-9]{64}$/.test(value.sha256)&&Number.isSafeInteger(value.bytes)&&value.bytes>0,'complete positive-byte source reference required');return value;}
function readRef(value){fullRef(value);const actual=readFile(value.file);need(actual.ref.sha256===value.sha256&&actual.ref.bytes===value.bytes,'fixed reference differs: '+value.file);return actual;}
function readGateRef(root,value){
 keys(value,['file','sha256','bytes']);relative(value.file);
 need(value.file.startsWith('scripts/verification/review-receipts/'),'review receipt must be in the fixed checkout directory');
 need(typeof value.sha256==='string'&&/^[a-f0-9]{64}$/.test(value.sha256)&&Number.isSafeInteger(value.bytes)&&value.bytes>0,'complete positive-byte review reference required');
 const resolvedRoot=fs.realpathSync.native(root),target=path.join(resolvedRoot,...value.file.split('/'));
 need(target.startsWith(resolvedRoot+path.sep),'review receipt escapes selected root');
 const actual=readFile(target);
 need(actual.ref.sha256===value.sha256&&actual.ref.bytes===value.bytes,'fixed review reference differs: '+value.file);
 return actual;
}
function json(actual){need(actual.bytes.length<=8*1024*1024,'source-profile JSON exceeds8MiB');return JSON.parse(actual.bytes.toString('utf8'));}

/** Fixed raw38-only admission. The draft deliberately refuses compilation until
 * every pending role has an independently reviewed, explicitly sealed revision.
 * verifySources=false omits only the legacy duplicate reader loop.
 * The current outer source freeze is always authenticated before admission. */
export function loadRaw138SourceProfile({root,file,sha256,requireReady=true,verifySources=true}){
 need(typeof root==='string'&&path.isAbsolute(root),'absolute selected root required');root=path.resolve(root);
 need(sha256===RAW138_SOURCE_PROFILE_SHA256&&/^[a-f0-9]{64}$/.test(sha256),'selected source-profile SHA is not the sealed registered revision');
 const selectedRoot=fs.realpathSync.native(root),selectedPath=path.join(selectedRoot,'scripts','verification',RAW138_SOURCE_PROFILE_FILE);
 need(path.relative(selectedPath,path.resolve(file))==='','profile must be the selected checkout fixed path');
 const actual=readFile(file);need(path.basename(actual.ref.file)===RAW138_SOURCE_PROFILE_FILE&&actual.ref.sha256===sha256,'selected profile path or bytes differ');
 const profile=json(actual);keys(profile,['schema','profileId','applicationVersion','status','baseContract','approvedRoles','pendingRoles'],['unchangedSourceReaders','provenance','limitations','reseal']);
 need(profile.schema==='naming-review-source-profile/1'&&profile.profileId===RAW138_SOURCE_PROFILE_ID&&profile.applicationVersion==='1.0.38','unknown source profile or application version');
 need(Array.isArray(profile.approvedRoles)&&Array.isArray(profile.pendingRoles),'explicit approved and pending role lists required');
 if(requireReady)need(profile.status==='ready'&&profile.pendingRoles.length===0,'source admission is pending; no old-reader or observed-SHA fallback is allowed','raw138-source-profile-pending');
 const base=keys(profile.baseContract,['file','sha256','bytes']);need(base.file==='scripts/verification/review-resources-138.json'&&base.sha256===BASE_CONTRACT_SHA256,'historical raw38 payload contract differs');
 // The contract is a fixed declared input beside the profile. This also works
 // when an extracted payload has no source tree and verification runs from C.
 const contractFile=path.join(path.dirname(actual.ref.file),'review-resources-138.json');const baseDocument=json(readRef({...base,file:contractFile}));
 need(baseDocument.applicationVersion==='1.0.38'&&baseDocument.profile==='naming-review-resources/1.0.38'&&Object.keys(baseDocument.files??{}).length===137&&Array.isArray(baseDocument.sourceReaders),'historical raw38 resource contract incomplete');
 // The historical profile supplies provenance only. Every normal current
 // admission, including verifySources=false callers, requires the full outer gate.
 const sourceExtensions=verifyManagedSourceExtensions({root});
 const publicationInventory=verifyPublicationInventory();
 need(publicationInventory.status==='passed','current publication originals or actual runtime reader compatibility failed: '+JSON.stringify(publicationInventory.errors),'raw138-publication-source-compatibility');
 const outerAdmission=requireManagedOuterAdmission({root});
 profile.approvedRoles=outerAdmission.inner.roles.map(row=>({role:row.role,file:row.file,...row.after,sourceGate:row.sourceGate,readerRequired:row.readerRequired}));
 profile.profileId='raw138-m535/1';
 const resealedReaders=outerAdmission.inner.sourceReaders.map(row=>({file:row.file,...row.after,scope:'exact-outer-m535-source-admission;not-runtime-or-release-proof'}));
 const readers=new Map(baseDocument.sourceReaders.map(row=>[relative(row.file),{...row}])),roles=new Map(),paths=new Set(),requiredReaderSources=[];
 for(const row of profile.approvedRoles){
  keys(row,['role','file','sha256','bytes','sourceGate','readerRequired']);need(typeof row.role==='string'&&row.role&&!roles.has(row.role),'unique source role required');relative(row.file);need(!paths.has(row.file),'duplicate source-role path');paths.add(row.file);
  need(typeof row.sha256==='string'&&/^[a-f0-9]{64}$/.test(row.sha256)&&Number.isSafeInteger(row.bytes)&&row.bytes>0&&typeof row.readerRequired==='boolean','fixed source-role identity required');
  const gate=json(readGateRef(root,row.sourceGate)),decision=gate.decision??gate.conclusion??gate.verdict;
  const exactNoticeGate=row.sourceGate.sha256==='8f6c87318089bf22c0aa728636e835f0ddcf06fb6c88036a685e4c72c7533806'&&gate.schema==='M368-independent-raw-notice-source-review/1'&&decision==='LIMITED-RAW-NOTICE-SOURCE-PASS'&&gate.newP1===0&&gate.newP2===0&&Array.isArray(gate.findings)&&gate.findings.length===0;
  need(typeof decision==='string'&&(decision.startsWith('PASS_LIMITED_')||decision==='LIMITED-SOURCE-PARITY-PASS'||exactNoticeGate),'role has no exact limited source review');
  const sourceRef={file:path.join(root,...row.file.split('/')),sha256:row.sha256,bytes:row.bytes};if(verifySources)readRef(sourceRef);
  roles.set(row.role,{...row,ref:sourceRef});readers.set(row.file,{file:row.file,sha256:row.sha256,bytes:row.bytes,scope:'exact-raw138-m480-reviewed-source-identity;not-compiled-or-runtime-proof'});
  if(row.readerRequired)requiredReaderSources.push(sourceRef);
 }
 if(resealedReaders)for(const row of resealedReaders)readers.set(row.file,row);
 for(const row of [...sourceExtensions.sourceRoles,...sourceExtensions.readerCompanions])readers.set(row.file,{file:row.file,sha256:row.sha256,bytes:row.bytes,scope:'exact-managed-source-extension;not-production-admission-or-runtime-proof'});
 for(const role of readerRoles)need(roles.has(role)&&roles.get(role).readerRequired,'required actual reader source role missing: '+role);
 need(roles.has('service')&&!roles.get('service').readerRequired,'raw Service identity must be fixed separately from the Store compile closure');
 if(requireReady)for(const file of noticeFiles)need(paths.has(file),'notice integration source role missing: '+file);
 if(verifySources){const pkg=json(readFile(path.join(root,'package.json')));need(pkg.version==='1.0.38','raw38 profile may not be used by next140 or another version');for(const row of readers.values()){const current=readFile(path.join(root,...row.file.split('/'))).ref;need(current.sha256===row.sha256&&(row.bytes===undefined||current.bytes===row.bytes),'source-reader identity differs: '+row.file);}}
 const closing=readFile(actual.ref.file);need(closing.ref.sha256===actual.ref.sha256&&closing.ref.bytes===actual.ref.bytes,'source profile changed during selection');
 return{profile,sourceExtensions,publicationInventory:{summary:publicationInventory.summary,runtimeReaderVersion:publicationInventory.runtimeReaderVersion},outerAdmission:{scope:outerAdmission.scope,outer:outerAdmission.outerRef,inner:outerAdmission.innerRef,receipt:outerAdmission.receiptRef},ref:actual.ref,sourceReaders:[...readers.values()],requiredReaderSources,storeSource:roles.get('store').ref};
}
