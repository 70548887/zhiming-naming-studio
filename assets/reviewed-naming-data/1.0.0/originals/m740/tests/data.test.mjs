import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {ROOT,BOUNDARY,readJson,readInputs,coverageInventory,makeCases,hash} from '../lib.mjs';
import {assertPlainJson,validateProfile,verifyM740Candidate} from '../validate.mjs';
import {EXPECTED_CHARACTERS} from '../pins.mjs';

const input=readInputs(),selection=readJson(path.join(ROOT,'selection.json')),inventory=coverageInventory(input),profile=readJson(path.join(ROOT,'data/profile.json'));
const copy=()=>structuredClone(profile);
test('fixed source and candidate byte closures authenticate',()=>{assert.equal(verifyM740Candidate().status,'passed');});
test('ten distinct single-character default direct noun meanings remain reproducible',()=>{
 assert.equal(validateProfile(profile,input,selection,inventory).rowCount,10);
 assert.equal(new Set(profile.cases.map(r=>r.char)).size,10);
 for(const row of profile.cases){assert.equal([...row.source.word].length,1);assert.equal(row.source.sourcePOS,'名');assert.equal(row.source.pinyin,row.defaultReading.pinyin);assert.equal(row.source.tone,row.defaultReading.tone);assert.equal(row.source.completeOriginalEntry.title,row.source.word);assert.equal(row.source.parsedEntrySha256,hash(JSON.stringify(row.source.completeOriginalEntry)));assert.equal(row.notWholeWordDerived,true);}
});
test('coverage is derived from current base bindings and v7 eligibility, without old recount imports',()=>{
 assert.equal(inventory.datasetCharacters,input.dataset.characters.length);
 assert.equal(inventory.supplementalAutomatic.count,input.v7.meaningReviews.filter(r=>r.automaticMeaningAllowed).length);
 assert.equal(inventory.baseProjectMeanings.count,inventory.baseProjectMeanings.characters.length);
 assert.equal(inventory.standaloneOnRequest.count,new Set(input.product('naming-character-meanings-v71-m460-b02-profile.json').cases.map(r=>r.char)).size);
 assert.equal(inventory.wholeWordContextOnly.independentCharacterCoverageAdded,0);
 assert.equal(inventory.existingCandidateOccupancy.m616.defaultCoverageAdded,0);
 for(const char of EXPECTED_CHARACTERS)assert.ok(!inventory.exclusionCharacters.includes(char));
});
test('historical pending and manual applicability are preserved, without granting meaning authority',()=>{
 for(const row of profile.cases){assert.deepEqual(row.priorV7Review,input.v7.meaningReviews.find(r=>r.char===row.char));assert.equal(row.priorV7Status,row.priorV7Review.applicability.mode);assert.equal(row.review.status,'pending-independent-review');assert.equal(row.usageReviewRequired,true);for(const [key,value]of Object.entries(BOUNDARY))assert.deepEqual(row[key],value);}
 const leaf=profile.cases.find(r=>r.char==='叶');assert.equal(leaf.priorV7Review.status,'pending');assert.equal(leaf.priorV7Status,'not-approved');assert.ok(leaf.review.unknowns.length>0);
});
test('Unicode proofs preserve raw mapping lines, line numbers and file hashes',()=>{
 const mapped=profile.cases.filter(r=>r.char!==r.source.word);assert.equal(mapped.length,6);
 for(const row of mapped){assert.equal(row.glyph.proof.length,2);assert.equal(row.glyph.semanticEquivalenceClaim,false);for(const proof of row.glyph.proof){const bytes=input.sources.get('product-data:'+proof.file);assert.equal(hash(bytes),proof.sha256);assert.equal(bytes.toString('utf8').split(/\r?\n/u)[proof.lineNumberOneBased-1],proof.line);}}
});
test('a full-word source cannot be smuggled in as a single-character definition',()=>{
 const edited=structuredClone(selection);const wordIndex=input.raw.findIndex(r=>[...r.title].length>1&&r.heteronyms?.[0]?.pinyin);edited.selected[0].rawEntryIndex=wordIndex;
 assert.throws(()=>makeCases(input,edited,inventory),/single original title identity/);
});
test('different reading or tone cannot be selected under the default binding',()=>{
 for(const field of ['pinyin','tone']){const edited=structuredClone(selection);edited.selected[0][field]=field==='pinyin'?'bàng':4;assert.throws(()=>makeCases(input,edited,inventory),/default reading changed/);}
 const edited=copy();edited.cases[0].defaultReading.pinyin='bàng';assert.throws(()=>validateProfile(edited,input,selection,inventory),/rows differ/);
});
test('an off-by-one raw index and a paraphrased source definition are both rejected',()=>{
 for(const mutate of [r=>r.source.rawEntryIndex++,r=>r.source.definition.def='国家。',r=>r.source.completeOriginalEntry.heteronyms[0].definitions[0].def='改写原句。']){const edited=copy();mutate(edited.cases[0]);assert.throws(()=>validateProfile(edited,input,selection,inventory),/rows differ/);}
});
test('wrong source license, original hash or POS is rejected',()=>{
 for(const [key,value]of [['license','CC0-1.0'],['originalSha256','0'.repeat(64)],['sourcePOS','形']]){const edited=copy();edited.cases[0].source[key]=value;assert.throws(()=>validateProfile(edited,input,selection,inventory),/rows differ/);}
});
test('incorrect Unicode mapping proof and silently promoted pending state are rejected',()=>{
 const glyph=copy();glyph.cases.find(r=>r.char==='叶').glyph.proof[0].line='53F6\tU+8449';assert.throws(()=>validateProfile(glyph,input,selection,inventory),/rows differ/);
 const pending=copy();pending.cases.find(r=>r.char==='叶').priorV7Review.status='approved';assert.throws(()=>validateProfile(pending,input,selection,inventory),/rows differ/);
});
test('candidate data cannot claim automatic scores, formal coverage or whole-name approval',()=>{
 for(const [key,value]of [['activation','on'],['productionApproved',true],['formalCoverageAdded',10],['automaticSemanticCreditAllowed',true],['scoreDelta',5],['wholeNameMeaning','approved']]){const edited=copy();edited[key]=value;assert.throws(()=>validateProfile(edited,input,selection,inventory),/authority/);}
 const edited=copy();edited.cases[0].automaticNameRecommendation=true;assert.throws(()=>validateProfile(edited,input,selection,inventory),/rows differ/);
});
test('an existing candidate target cannot enter a new batch',()=>{
 const occupied=structuredClone(selection);occupied.selected[0].char=inventory.existingCandidateOccupancy.m690.characters[0];assert.throws(()=>makeCases(input,occupied,inventory),/occupied\/excluded/);
});
test('extra or reordered rows fail the exact selection gate',()=>{
 const extra=copy();extra.cases.push(structuredClone(extra.cases[0]));assert.throws(()=>validateProfile(extra,input,selection,inventory),/fixed 10/);
 const reordered=copy();reordered.cases.reverse();assert.throws(()=>validateProfile(reordered,input,selection,inventory),/fixed 10/);
});
test('validator rejects getters and Proxies without executing user property access',()=>{
 let calls=0;const accessor={};Object.defineProperty(accessor,'cases',{enumerable:true,get(){calls++;return profile.cases;}});assert.throws(()=>assertPlainJson(accessor),/accessor/);assert.equal(calls,0);
 const proxy=new Proxy({}, {get(){calls++;return undefined;}});assert.throws(()=>assertPlainJson(proxy),/plain JSON/);assert.equal(calls,0);
});
