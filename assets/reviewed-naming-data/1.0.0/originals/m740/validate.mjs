import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual as equal,types} from 'node:util';
import {ROOT,BASE_HEAD,BOUNDARY,hash,readJson,need,sourceSpecs,readInputs,coverageInventory,makeCases,atomicWrite} from './lib.mjs';
import {MANIFEST_SHA256,SOURCE_LOCK_SHA256,EXPECTED_CHARACTERS} from './pins.mjs';

export function assertPlainJson(value,stack=new Set()) {
 if(value===null||typeof value==='string'||typeof value==='boolean')return;
 if(typeof value==='number'){need(Number.isFinite(value),'nonfinite JSON');return;}
 need(typeof value==='object'&&!types.isProxy(value),'plain JSON object required');
 need(!stack.has(value),'cyclic JSON');
 const prototype=Object.getPrototypeOf(value);
 need(Array.isArray(value)?prototype===Array.prototype:prototype===Object.prototype||prototype===null,'custom prototype');
 stack.add(value);
 for(const key of Reflect.ownKeys(value)){
  if(Array.isArray(value)&&key==='length')continue;
  need(typeof key==='string','symbol property');
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  need(descriptor.enumerable&&Object.hasOwn(descriptor,'value'),'accessor/nonenumerable property');
  assertPlainJson(descriptor.value,stack);
 }
 stack.delete(value);
}
export function validateProfile(profile,input,selection,coverage) {
 assertPlainJson(profile);
 need(profile.schema==='m740-default-meaning-profile/1'&&profile.batchId==='M740-D02'&&profile.version==='m740-default-meanings/1.0.0'&&profile.sourceId==='naming-character-meanings-m740-candidate','profile identity');
 for(const [key,value]of Object.entries(BOUNDARY))need(equal(profile[key],value),'profile authority '+key);
 need(profile.generationAuthority===false&&profile.sourceAuthority===false&&profile.defaultDatasetChanged===false&&profile.scope==='on-request-supplement-only','profile scope');
 need(profile.count===10&&profile.cases.length===10&&equal(profile.cases.map(r=>r.char),EXPECTED_CHARACTERS),'fixed 10 selection');
 const expected=makeCases(input,selection,coverage);
 need(equal(profile.cases,expected),'profile rows differ from reproducible source/project bindings');
 return {rowCount:expected.length,directSingleCharacterTitles:expected.filter(r=>[...r.source.word].length===1).length,allSourcePOSPreserved:true,completeOriginalEntriesPreserved:true,allHistoricalStatusesRetained:true};
}
export function verifyM740Candidate() {
 const manifestBytes=fs.readFileSync(path.join(ROOT,'data/manifest.json')),lockBytes=fs.readFileSync(path.join(ROOT,'data/source-lock.json'));
 need(hash(manifestBytes)===MANIFEST_SHA256,'fixed manifest bytes');need(hash(lockBytes)===SOURCE_LOCK_SHA256,'fixed source-lock bytes');
 const manifest=JSON.parse(manifestBytes),lock=JSON.parse(lockBytes);
 assertPlainJson(manifest);assertPlainJson(lock);
 need(manifest.schema==='m740-candidate-manifest/1'&&manifest.batchId==='M740-D02'&&manifest.count===10&&manifest.state==='candidate-source-bound-not-admitted','manifest identity');
 for(const [key,value]of Object.entries(BOUNDARY))need(equal(manifest[key],value),'manifest authority '+key);
 need(lock.schema==='m740-source-lock/1'&&lock.batchId==='M740-D02'&&lock.baselineHead===BASE_HEAD,'lock identity');
 need(equal(lock.sourceFiles,manifest.sourceFiles),'source closure lock/manifest');
 const expectedFiles=['data/profile.json','data/rows.jsonl','data/coverage.json','data/pending-review.json','data/NOTICE.md','selection.json','inventory-sources.json','data/source-lock.json'];
 need(equal(manifest.candidateFiles.map(r=>r.file),expectedFiles)&&equal(lock.candidateFiles,manifest.candidateFiles.slice(0,-1)),'candidate closure');
 for(const row of manifest.candidateFiles){need(expectedFiles.includes(row.file),'unexpected candidate path');const bytes=fs.readFileSync(path.join(ROOT,row.file));need(bytes.length===row.bytes&&hash(bytes)===row.sha256,'candidate bytes '+row.file);}
 const specs=sourceSpecs();need(equal(manifest.sourceFiles.map(({root,file,absolute})=>({root,file,absolute})),specs),'fixed source path closure');
 for(const row of manifest.sourceFiles){const bytes=fs.readFileSync(row.absolute);need(bytes.length===row.bytes&&hash(bytes)===row.sha256,'original source bytes '+row.root+':'+row.file);}
 const input=readInputs(specs),selection=readJson(path.join(ROOT,'selection.json')),inventory=coverageInventory(input),profile=readJson(path.join(ROOT,'data/profile.json'));
 const profileValidation=validateProfile(profile,input,selection,inventory);
 const coverage=readJson(path.join(ROOT,'data/coverage.json'));
 for(const key of Object.keys(inventory))need(equal(coverage[key],inventory[key]),'recomputed coverage '+key);
 need(coverage.delta.candidateDefaultDirectRows===10&&coverage.delta.formalCoverageAdded===0&&coverage.delta.automaticDefaultCoverageAdded===0&&coverage.delta.wholeWordCoverageAdded===0,'coverage delta authority');
 need(equal(coverage.selected.characters,EXPECTED_CHARACTERS)&&coverage.selected.alreadySelectedOverlap.length===0&&coverage.selected.automaticCoverageOverlap.length===0,'coverage selection');
 const lines=fs.readFileSync(path.join(ROOT,'data/rows.jsonl'),'utf8').trimEnd().split('\n');need(lines.length===10&&equal(lines.map(line=>JSON.parse(line)),profile.cases),'ten consumable JSONL rows');
 const queue=readJson(path.join(ROOT,'data/pending-review.json'));
 need(queue.rows.length===10&&queue.status==='pending-independent-review'&&queue.formalCoverageAdded===0,'review queue boundary');
 for(const [i,row]of queue.rows.entries())need(row.caseId===profile.cases[i].caseId&&row.senseReview==='pending'&&row.projectReview==='pending'&&row.glyphReview==='pending'&&row.historicalApplicability===profile.cases[i].priorV7Status,'per-row pending review');
 return {schema:'m740-validation-receipt/1',status:'passed',...profileValidation,sourceFileCount:specs.length,sourceHashesVerified:true,candidateHashesVerified:true,noExistingSelectedOverlap:true,sourceSha256:profile.cases[0].source.originalSha256,baselineHead:BASE_HEAD,formalCoverageAdded:0,actualQueryWiring:'not-executed',actualGenerationWiring:'not-executed'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const receipt=verifyM740Candidate();atomicWrite('validation/verify-receipt.json',receipt);console.log(JSON.stringify(receipt));
}
