import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {build} from './build.mjs';
import {lookupElementAssessment as lookup,confirmElementAssessment,isCanonicalElementAssessment} from './lookup-element-assessment.mjs';
import {loadVerifiedElementPackage} from './load-verified-element-package.mjs';

const dir=path.dirname(fileURLToPath(import.meta.url));const root=path.resolve(process.env.ELEMENT_SOURCE_ROOT||path.resolve(dir,'../../../..'));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const jhash=o=>hash(JSON.stringify(o));
const datasetPath=path.join(root,'data/dataset-v6.json');const baselineBefore=hash(fs.readFileSync(datasetPath));
const baseline=read(datasetPath);const manifest=read(path.join(dir,'review-manifest.json'));const overlay=read(path.join(dir,'element-overlay.json'));const profile=read(path.join(dir,'profile.json'));const lock=read(path.join(dir,'source-lock.json'));
const raw=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,'data/raw/moe-revised.json.gz'))));
const byChar=new Map(overlay.rows.map(r=>[r.char,r]));
const clean=s=>(s||'').replace(/（[^）]*）|\([^)]*\)/g,'').replace(/\s+/g,'').trim();
const tests=[];const test=(name,fn)=>{fn();tests.push(name);};
const input=(char,extra={})=>{const r=byChar.get(char);return {char,pinyin:r.defaultPinyin,sourceEntrySha256:r.sourceBinding.sourceEntrySha256,...extra};};
const run=(char,extra={})=>lookup(overlay,input(char,extra));
const choose=(char,predicate)=>byChar.get(char).evidenceBySense.find(predicate).evidenceId;

test('exact baseline empty set, 522 unique notes, manifest and overlay',()=>{
 const expected=baseline.characters.filter(c=>c.elements.length===0).map(c=>c.char).sort();assert.equal(expected.length,522);
 for(const rows of [manifest.rows,overlay.rows]){assert.equal(rows.length,522);assert.equal(new Set(rows.map(r=>r.char)).size,522);assert.deepEqual(rows.map(r=>r.char).sort(),expected);}
 assert.equal(manifest.baseline.sha256,baselineBefore);assert.equal(overlay.baseline.sha256,baselineBefore);
 const notes=fs.readFileSync(path.join(dir,'review-notes.txt'),'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/);assert.equal(notes.length,522);assert.deepEqual(notes.map(l=>l.split(' ')[0]).sort(),expected);
});
test('all 522 full-entry hashes, default-reading hashes, exact raw definition records and quotes',()=>{
 for(const row of manifest.rows){const b=row.sourceBinding,e=raw[b.entryArrayIndex];assert.equal(e.title,row.word);assert.equal(jhash(e),b.sourceEntrySha256);assert.equal(jhash(e.heteronyms[b.readingIndex]),b.sourceReadingSha256);assert.equal(e.heteronyms[b.readingIndex].pinyin,b.rawPinyin);assert.equal(clean(b.rawPinyin),row.defaultPinyin);
  const c=baseline.characters.find(c=>c.char===row.char),r=c.readings.find(r=>r.pinyin===c.pinyin);assert.equal(r.word,row.word);assert.deepEqual(row.defaultDefinitions.map(d=>d.quote),r.meanings);assert.deepEqual(row.oldElements,c.elements);assert.equal(row.oldElementBasis,c.elementBasis);assert(row.reason.includes(row.char+'/'+row.defaultPinyin));assert(row.reasonCategory);assert.deepEqual(row.effectiveElements,[]);assert.equal(row.traditionalAssessment.status,'pending');
  for(const def of row.defaultDefinitions){const origin=e.heteronyms[def.originReadingIndex];assert.deepEqual(def.verbatimDefinition,origin.definitions[def.originDefinitionIndex]);assert.equal(def.quote,origin.definitions[def.originDefinitionIndex].def);assert.equal(def.originRawPinyin,origin.pinyin);assert(def.sourceRecordId.endsWith(`/heteronyms/${def.originReadingIndex}/definitions/${def.originDefinitionIndex}`));}
  for(const ev of row.evidenceBySense){const def=row.defaultDefinitions[ev.senseIndex];assert.equal(ev.quote,def.quote);assert.equal(ev.sourceRecordId,def.sourceRecordId);assert.equal(ev.sourceEntrySha256,b.sourceEntrySha256);assert.equal(ev.sourceReadingSha256,b.sourceReadingSha256);assert(ev.condition.length>12);}
  if(row.char!==row.word)assert(b.variantEvidence.length>0);
 }
});
test('no effective elements for any of 522 default lookups',()=>{for(const row of overlay.rows)assert.deepEqual(run(row.char).effectiveElements,[]);});
test('all original source excerpt entries unmodified',()=>{const excerpts=read(path.join(dir,'source-excerpts.json'));assert.equal(excerpts.entries.length,522);for(const r of excerpts.entries){const row=byChar.get(r.char);assert.deepEqual(r.verbatimEntry,raw[row.sourceBinding.entryArrayIndex]);assert.equal(jhash(r.verbatimEntry),r.sourceEntrySha256);}});
test('all source lock raw assets and project file byte hashes',()=>{for(const src of lock.rawSources)assert.equal(hash(fs.readFileSync(path.join(root,src.path))),src.sha256);for(const [f,h]of Object.entries(lock.projectFiles))assert.equal(hash(fs.readFileSync(path.join(dir,f))),h);assert.equal(jhash(lock.projectFiles),lock.aggregateSha256);});
test('single-sense evidence is descriptive and still requires explicit source sense choice',()=>{
 assert.deepEqual(overlay.rows.filter(r=>r.coverageTier==='single-sense-evidence').map(r=>r.char).sort(),[...profile.singleSenseChars].sort());
 for(const ch of profile.singleSenseChars){const row=manifest.rows.find(r=>r.char===ch);assert.equal(row.defaultDefinitions.length,1);assert.deepEqual(run(ch,{profileOptIn:true}).effectiveElements,[]);const selected=row.evidenceBySense.map(e=>e.evidenceId);assert.deepEqual(run(ch,{confirmedEvidenceIds:selected}).effectiveElements,[]);assert.deepEqual(run(ch,{profileOptIn:true,confirmedEvidenceIds:selected}).effectiveElements,row.availableElements);}
});
test('all522opt-in-onlylookups retain an empty effective set',()=>{for(const row of overlay.rows){const assessment=run(row.char,{profileOptIn:true});assert.deepEqual(assessment.effectiveElements,[]);assert.deepEqual(assessment.activeEvidenceIds,[]);assert.equal(assessment.selectionStatus,'not-selected');assert.equal(assessment.conditionalAssessment.requiresSenseConfirmation,true);}});
test('枫 requires both profile opt in and exact source sense, never truthy coercion',()=>{const id=choose('枫',()=>true);assert.deepEqual(run('枫').effectiveElements,[]);assert.deepEqual(run('枫',{profileOptIn:'true',confirmedEvidenceIds:[id]}).effectiveElements,[]);assert.deepEqual(run('枫',{profileOptIn:true}).effectiveElements,[]);const confirmed=run('枫',{profileOptIn:true,confirmedEvidenceIds:[id]});assert.deepEqual(confirmed.effectiveElements,['木']);assert.equal(confirmed.selectionStatus,'sense-confirmed');assert.deepEqual(confirmed.confirmedEvidenceIds,[id]);});
for(const [char,sense,expected] of [['心',6,['木']],['仁',4,['木']],['桥',2,['木']],['然',0,['火']],['陶',0,['土']],['鼎',0,['金']],['川',0,['水']],['碧',0,['土']],['贝',3,['木']],['新',3,['木']],['辛',1,['木']],['实',4,['木']],['缨',4,['木']],['粲',0,['木']]]){
 test(`${char}: profile-only never infers intended sense, exact confirmed evidence can activate`,()=>{assert.deepEqual(run(char,{profileOptIn:true}).effectiveElements,[]);const id=choose(char,e=>e.senseIndex===sense);assert.deepEqual(run(char,{confirmedEvidenceIds:[id]}).effectiveElements,[]);assert.deepEqual(run(char,{profileOptIn:true,confirmedEvidenceIds:[id]}).effectiveElements,expected);});
}
test('青: separate original referents, never auto merge plant/mountain/color',()=>{assert.deepEqual(run('青',{profileOptIn:true}).effectiveElements,[]);const plant=choose('青',e=>e.senseIndex===1&&e.elements[0]==='木'),mountain=choose('青',e=>e.senseIndex===1&&e.elements[0]==='土');assert.deepEqual(run('青',{profileOptIn:true,confirmedEvidenceIds:[plant]}).effectiveElements,['木']);assert.deepEqual(run('青',{profileOptIn:true,confirmedEvidenceIds:[mountain]}).effectiveElements,['土']);assert.equal(run('青',{profileOptIn:true,confirmedEvidenceIds:[plant,mountain]}).status,'ambiguous-referent-selection');});
test('印: wood, metal, stone material alternatives cannot auto merge',()=>{assert.deepEqual(byChar.get('印').availableElements,['木','金','土']);assert.deepEqual(run('印',{profileOptIn:true}).effectiveElements,[]);for(const ev of byChar.get('印').evidenceBySense)assert.deepEqual(run('印',{profileOptIn:true,confirmedEvidenceIds:[ev.evidenceId]}).effectiveElements,ev.elements);assert.equal(run('印',{profileOptIn:true,confirmedEvidenceIds:byChar.get('印').evidenceBySense.map(e=>e.evidenceId)}).status,'ambiguous-referent-selection');});
for(const char of ['甲','索','子'])test(`${char}: heterogeneous referent is conditional`,()=>{assert.deepEqual(run(char,{profileOptIn:true}).effectiveElements,[]);const e=byChar.get(char).evidenceBySense[0];assert(e.condition.includes('必须确认'));assert.deepEqual(run(char,{profileOptIn:true,confirmedEvidenceIds:[e.evidenceId]}).effectiveElements,e.elements);});
test('白: verbatim explicit color correspondence retained, no project metal or traditional assertion',()=>{const a=run('白',{profileOptIn:true});assert.equal(a.correspondenceEvidence.length,1);assert.equal(a.correspondenceEvidence[0].statedElement,'金');assert(a.correspondenceEvidence[0].quote.startsWith('代表五行中金的顏色'));assert.deepEqual(a.effectiveElements,[]);assert.deepEqual(a.traditionalAssessment.elements,[]);});
for(const char of ['燎','沈','乔','柔','茁','攸','理','俞','耕','农','耘','甄','光','辉','耀','阳','月','虹','雷','燊','旺','颍','浙','玛','菡','苒','剑','舟','琴','佩','园','苑','素','岁','庚','申','辰','乾','中','东','西','慈']){
 test(`${char}: negative boundary preserves unresolved status`,()=>{const a=run(char,{profileOptIn:true});assert.equal(a.status,'pending');assert.deepEqual(a.conditionalAssessment.availableElements,[]);assert.deepEqual(a.effectiveElements,[]);});
}
for(const [char,pinyin]of [['燎','liǎo'],['沈','chén'],['同','tóng'],['华','huā'],['殷','yān'],['夕','xī'],['乐','yuè'],['隽','jùn']])test(`${char}: other reading cannot reuse default source binding`,()=>{const a=run(char,{pinyin,profileOptIn:true});assert.equal(a.status,'binding-mismatch');assert.deepEqual(a.effectiveElements,[]);});
for(const [char,word]of [['同','衕'],['采','採'],['余','餘'],['向','嚮'],['于','於'],['克','剋']])test(`${char}: actual source dictionary word is ${word}`,()=>assert.equal(byChar.get(char).word,word));
test('wrong full source entry hash rejects the complete assessment',()=>{assert.equal(run('枫',{sourceEntrySha256:'0'.repeat(64),profileOptIn:true}).status,'binding-mismatch');});
test('wrong optional source reading hash rejects',()=>assert.equal(run('枫',{sourceReadingSha256:'0'.repeat(64),profileOptIn:true}).status,'binding-mismatch'));
test('uncovered old-tag character remains outside independent overlay',()=>{const old=baseline.characters.find(c=>c.elements.length);assert.equal(lookup(overlay,{char:old.char,pinyin:old.pinyin,sourceEntrySha256:'0'.repeat(64)}).status,'not-covered');});
test('unknown, foreign, duplicate and malformed evidence IDs reject selection',()=>{const foreign=choose('心',()=>true);for(const ids of [['unknown'],[foreign],[foreign,foreign],'bad'])assert.equal(run('枫',{profileOptIn:true,confirmedEvidenceIds:ids}).status,'selection-mismatch');});
test('incompatible profile returns no effective elements',()=>{assert.equal(lookup({...overlay,profileId:'legacy-profile'},input('枫',{profileOptIn:true})).status,'profile-mismatch');});
test('pure function does not mutate overlay or input and output is detached',()=>{const before=JSON.stringify(overlay),args=input('心',{profileOptIn:true,confirmedEvidenceIds:[]}),argBefore=JSON.stringify(args);const a=lookup(overlay,args);a.sourceBinding.word='changed';a.conditionalAssessment.evidenceBySense[0].quote='changed';a.traditionalAssessment.status='changed';assert.equal(JSON.stringify(overlay),before);assert.equal(JSON.stringify(args),argBefore);});
test('caller accessors are rejected without evaluating getters',()=>{let calls=0;const args=input('枫',{profileOptIn:true});Object.defineProperty(args,'char',{enumerable:true,get(){calls++;return '枫';}});assert.equal(lookup(overlay,args).status,'invalid-input');assert.equal(calls,0);});
test('sparse,accessor and extra-field selection arrays cannot create confirmed senses',()=>{let calls=0;const getter=[];Object.defineProperty(getter,'0',{enumerable:true,get(){calls++;return choose('枫',()=>true);}});const sparse=Array(1),extra=[];extra.note='ignored';for(const ids of [getter,sparse,extra]){const actual=run('枫',{profileOptIn:true,confirmedEvidenceIds:ids});assert.equal(actual.status,'invalid-input');assert.deepEqual(actual.effectiveElements,[]);}assert.equal(calls,0);});
test('primitive,hidden,symbol,custom prototype and unexpected fields are strictly rejected',()=>{
 const hidden=input('枫');Object.defineProperty(hidden,'hidden',{value:true});const symbol=input('枫');symbol[Symbol('s')]=1;const custom=Object.setPrototypeOf(input('枫'),{extra:true});
 for(const args of [hidden,symbol,custom,input('枫',{unexpected:true}),input('枫',{profileOptIn:null}),input('枫',{sourceEntrySha256:'g'.repeat(64)}),input('枫',{sourceEntrySha256:'A'.repeat(64)}),input('枫',{confirmedEvidenceIds:undefined})]){assert.equal(lookup(overlay,args).status,'invalid-input');}
});
test('runtime original-source gate requires a caller-pinned lock and freezes verified overlay',()=>{const pinned=hash(fs.readFileSync(path.join(dir,'source-lock.json'))),verified=loadVerifiedElementPackage(dir,pinned,root);assert(Object.isFrozen(verified));assert(Object.isFrozen(verified.rows));assert.deepEqual(verified,overlay);assert.throws(()=>loadVerifiedElementPackage(dir,'0'.repeat(64),root),/pinned SHA/);});
test('plan-bound explicit choices recompute canonical results from exact source identities',()=>{
 const r=byChar.get('心'),binding={planScope:'isolated-plan-04',char:r.char,pinyin:r.defaultPinyin,sourceEntrySha256:r.sourceBinding.sourceEntrySha256,sourceReadingSha256:r.sourceBinding.sourceReadingSha256};
 const choice={profileId:profile.profileId,...binding,confirmedEvidenceIds:[r.evidenceBySense[0].evidenceId]};
 const pending=confirmElementAssessment(overlay,binding,null);assert.deepEqual(pending.effectiveElements,[]);assert.equal(pending.methodSelected,false);assert(pending.matchingSourceCandidates.length);
 const confirmed=confirmElementAssessment(overlay,binding,choice);assert.deepEqual(confirmed.effectiveElements,['木']);assert.equal(confirmed.methodSelected,true);assert.equal(confirmed.planScope,binding.planScope);assert(isCanonicalElementAssessment(confirmed,overlay,binding,choice));
 for(const [key,value]of [['planScope','other-plan'],['char','桥'],['pinyin','xìn'],['sourceEntrySha256','0'.repeat(64)],['sourceReadingSha256','0'.repeat(64)]])assert.throws(()=>confirmElementAssessment(overlay,binding,{...choice,[key]:value}));
 assert.throws(()=>confirmElementAssessment(overlay,binding,{...choice,effectiveElements:['木']}));assert.throws(()=>confirmElementAssessment(overlay,binding,{...choice,confirmedEvidenceIds:['foreign']}));
 const forged=structuredClone(confirmed);forged.effectiveElements=['火'];assert.equal(isCanonicalElementAssessment(forged,overlay,binding,choice),false);
 const noSense=confirmElementAssessment(overlay,binding,{...choice,confirmedEvidenceIds:[]});assert.deepEqual(noSense.effectiveElements,[]);assert.equal(noSense.selectionStatus,'not-selected');
});
test('r2 controlled replacement after first verified overlay read never parses replacement bytes',()=>{
 const copy=path.join(dir,'r2-double-read-test-'+process.pid+'-'+crypto.randomUUID());fs.mkdirSync(copy);
 const names=['source-lock.json',...Object.keys(lock.projectFiles)];for(const file of names)fs.copyFileSync(path.join(dir,file),path.join(copy,file));
 const target=path.join(copy,'element-overlay.json'),original=fs.readFileSync(target),changed=JSON.parse(original);const maple=changed.rows.find(row=>row.char==='枫');maple.availableElements=['金'];maple.evidenceBySense[0].elements=['金'];const replacement=Buffer.from(JSON.stringify(changed));
 const actualRead=fs.readFileSync;let overlayReads=0,returned;
 try{
  fs.readFileSync=function(file,...args){const bytes=actualRead.call(this,file,...args);if(typeof file==='string'&&path.resolve(file)===target){overlayReads++;if(overlayReads===1)fs.writeFileSync(target,replacement);}return bytes;};
  returned=loadVerifiedElementPackage(copy,hash(actualRead.call(fs,path.join(dir,'source-lock.json'))),root);
 }finally{fs.readFileSync=actualRead;}
 try{
  assert.equal(overlayReads,1);assert.equal(hash(fs.readFileSync(target)),hash(replacement));const row=returned.rows.find(value=>value.char==='枫');assert.deepEqual(row.evidenceBySense[0].elements,['木']);
  const binding={planScope:'controlled-race-plan',char:'枫',pinyin:row.defaultPinyin,sourceEntrySha256:row.sourceBinding.sourceEntrySha256,sourceReadingSha256:row.sourceBinding.sourceReadingSha256},selection={profileId:profile.profileId,...binding,confirmedEvidenceIds:[row.evidenceBySense[0].evidenceId]},assessment=confirmElementAssessment(returned,binding,selection);
  assert.deepEqual(assessment.effectiveElements,['木']);assert(isCanonicalElementAssessment(assessment,returned,binding,selection));assert.throws(()=>loadVerifiedElementPackage(copy,hash(fs.readFileSync(path.join(dir,'source-lock.json'))),root),/Locked project file differs/);
 }finally{const resolved=fs.realpathSync(copy);assert(resolved.startsWith(fs.realpathSync(dir)+path.sep));fs.rmSync(resolved,{recursive:true,force:true});}
});
test('deterministic rebuild reproduces generated files byte for byte',()=>{const repeat=path.join(dir,'rebuild-verification');build(repeat);for(const f of ['review-manifest.json','element-overlay.json','source-excerpts.json','source-lock.json'])assert.equal(hash(fs.readFileSync(path.join(dir,f))),hash(fs.readFileSync(path.join(repeat,f))));});
test('shared baseline file unchanged',()=>assert.equal(hash(fs.readFileSync(datasetPath)),baselineBefore));
const result={status:'passed',profileId:overlay.profileId,testsPassed:tests.length,counts:manifest.counts,baselineSha256:baselineBefore,sourceBindingsVerified:522,rawSourceHashesVerified:lock.rawSources.length,generatedFilesRebuilt:4,tests,notExecuted:['independent external review','integration with naming-v7 / renderer / saved snapshots','traditional school-specific character mapping']};
fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,testsPassed:result.testsPassed,counts:result.counts,sourceBindingsVerified:522,generatedFilesRebuilt:4}));
