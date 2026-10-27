import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {convert,config,plain,need,same,hash,THEMES,STAGES,PACKAGE_ROOT,VERSION} from './convert.mjs';
import {INPUT_PINS} from './pins.mjs';

export const ARTIFACT_FILES=Object.freeze([...Object.keys(INPUT_PINS),'publication.json','lineage.json','revision-proposals.json','source-lock.json','convert.mjs','verify.mjs','pins.mjs','seal.mjs','tests.mjs','interface-check.ts','integration-contract.json','registration-hunk.txt','README.md']);
export function verifyContent(options={}){
 plain(options);need(options&&typeof options==='object'&&!Array.isArray(options)&&Object.keys(options).every(k=>['packageRoot','sourceRoot','publication'].includes(k)),'VERIFY_CONFIG');
 const {publication,...address}=options,c=config(address),expected=convert(c),raw=fs.readFileSync(path.join(c.packageRoot,'publication.json'),'utf8');
 need(raw===JSON.stringify(expected.publication,null,2)+'\n','PUBLICATION_BYTES');
 const actual=publication===undefined?JSON.parse(raw):publication;
 plain(actual);need(same(actual,expected.publication),'PUBLICATION_REPLAY');
 for(const [key,file]of [['lineage','lineage.json'],['revisionProposals','revision-proposals.json'],['sourceLock','source-lock.json']]){
  const text=fs.readFileSync(path.join(c.packageRoot,file),'utf8');need(text===JSON.stringify(expected[key],null,2)+'\n','ARTIFACT_BYTES_'+key);const saved=JSON.parse(text);plain(saved);need(same(saved,expected[key]),'ARTIFACT_REPLAY_'+key);
 }
 return{ok:true,publicationVersion:VERSION,rows:40,sourceGeneral:38,sourcePending:2,semanticClear:37,migrationHold:1,pendingRevisions:3,runtimeProjectWish:null,activation:'off',admissionGranted:false,formalCoverageAdded:0,defaultAutomaticCoverageAdded:0,authority:'candidate-artifact-verification-only'};
}
/** Fixed source rederivation runs even when a caller has resealed every visible
 * output hash. A manifest is a closure check, never source/admission authority. */
export function verify(options={}){
 const result=verifyContent(options),{publication,...address}=options,c=config(address);void publication;
 const manifest=JSON.parse(fs.readFileSync(path.join(c.packageRoot,'manifest.json'),'utf8'));plain(manifest);
 need(same(Object.keys(manifest).sort(),['schema','version','activation','admissionGranted','productionApproved','formalCoverageAdded','defaultAutomaticCoverageAdded','files'].sort()),'MANIFEST_KEYS');
 need(manifest.schema==='m921-publication-manifest/1'&&manifest.version===VERSION&&manifest.activation==='off'&&manifest.admissionGranted===false&&manifest.productionApproved===false&&manifest.formalCoverageAdded===0&&manifest.defaultAutomaticCoverageAdded===0,'MANIFEST_AUTHORITY');
 need(Array.isArray(manifest.files)&&same(manifest.files.map(p=>p.file),ARTIFACT_FILES),'MANIFEST_CLOSURE');
 for(const pin of manifest.files){need(same(Object.keys(pin).sort(),['bytes','file','sha256']),'MANIFEST_PIN');const bytes=fs.readFileSync(path.join(c.packageRoot,pin.file));need(bytes.length===pin.bytes&&hash(bytes)===pin.sha256,'MANIFEST_BYTES_'+pin.file);}
 return result;
}
/** Review-only tool. It deliberately issues no authenticated runtime handle or
 * generation receipt. All six existing stage names enforce the same denial. */
export function assessReview(options,request){
 verify(options);plain(request);need(request&&typeof request==='object'&&!Array.isArray(request),'REQUEST');
 need(same(Object.keys(request).sort(),['candidateCaseId','char','pinyin','tone','senseId','stage','themeIds','requestedGivenNameLength','namePart'].sort()),'REQUEST_KEYS');
 need(STAGES.includes(request.stage)&&[1,2].includes(request.requestedGivenNameLength)&&request.namePart==='given-name','CONTEXT');
 need(Array.isArray(request.themeIds)&&new Set(request.themeIds).size===request.themeIds.length&&request.themeIds.every(t=>THEMES.includes(t)),'UNREGISTERED_THEME');
 const {publication,...address}=options??{},c=config(address),p=publication??JSON.parse(fs.readFileSync(path.join(c.packageRoot,'publication.json'),'utf8')),record=p.records.find(r=>r.candidateCaseId===request.candidateCaseId);need(record,'UNKNOWN_CASE');
 need(record.identity.char===request.char&&record.identity.pinyin===request.pinyin&&record.identity.tone===request.tone&&record.identity.senseId===request.senseId,'REQUEST_SOURCE_IDENTITY');
 return{status:record.decision==='pending'?'pending-independent-decision':'manual-only',candidateCaseId:record.candidateCaseId,generationEligible:false,admissionGranted:false,runtimeProjectWish:null,wholeNameMeaning:null,scoreDelta:0,automaticSemanticCreditAllowed:false,elementModification:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(verify(),null,2));
