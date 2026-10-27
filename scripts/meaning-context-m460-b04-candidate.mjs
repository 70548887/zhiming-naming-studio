import {readFileSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual as equal} from 'node:util';
import {createMeaningContextLookup,assertContextJson} from '../src/domain/meaning-context-next.mjs';
import {B04_PINS} from './meaning-context-m460-b04-pins.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const need=(ok,message)=>{if(!ok)throw Error('M460-B04 context candidate: '+message);};
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const pins=freeze(structuredClone(B04_PINS)),lookups=new WeakMap();
const scalar=e=>({char:e.char,pinyin:e.pinyin,tone:e.tone,sourceId:e.sourceId,meaning:e.meaning,readings:e.readings??[]});
const safe=(directory,file)=>{need(typeof file==='string'&&file.startsWith('data/')&&!file.includes('\\')&&!file.includes(':')&&file.split('/').every(p=>p&&p!=='.'&&p!=='..'),'unsafe source path');const base=resolve(directory),p=resolve(base,...file.slice(5).split('/'));need(p.startsWith(base+sep),'source path escaped directory');return p;};

/** Pure source/semantic stage shared by the real loader and re-sealed negatives.
 * Returning validation facts does not create an authenticated query handle. */
export function validateB04SemanticPublication(publication,glyphs,facts){
 assertContextJson(publication);assertContextJson(glyphs);assertContextJson(facts);
 need(publication.schema==='conditional-meaning-context-increment/1'&&publication.task==='M460-DATA-B04'&&publication.dataVersion===pins.dataVersion&&publication.phase==='candidate-source-verified-not-admitted','existing context schema/candidate identity differs');
 need(equal(publication.base,facts.previous.base)&&equal(publication.policy,facts.previous.policy),'base/policy or non-adoption scope differs');
 need(publication.policy.fullWordOnly===true&&publication.policy.confirmedReadingsRequired===true&&publication.policy.explicitExactSenseAndContextRequired===true&&publication.policy.automaticSemanticCreditAllowed===false&&publication.policy.independentCharacterMeaningApproved===false&&publication.policy.wholeNameApproved===false,'reference cannot grant standalone/name/score authority');
 need(publication.cases.length===20&&glyphs.bindings.length===20&&new Set(publication.cases.map(r=>r.caseId)).size===20&&new Set(publication.cases.map(r=>r.char)).size===20&&new Set(publication.cases.map(r=>r.givenName)).size===20,'exact distinct20 target/word/case identities required');
 const occupied=new Set([...facts.single40.cases,...facts.previous.cases].map(r=>r.char).concat([...pins.m393Chars]));
 const oldNames=new Set(facts.previous.cases.map(r=>r.givenName));
 for(const [index,plan]of pins.plans.entries()){
  const r=publication.cases[index],expected=pins.cases[index],entry=facts.entries[plan.entry],heteronym=entry?.heteronyms?.[plan.reading],definition=heteronym?.definitions?.[plan.sense];
  need(r.caseId===expected.caseId&&r.char===plan.char&&r.givenName===plan.givenName&&r.source.word===plan.word&&equal([r.source.rawEntryIndex,r.source.rawHeteronymIndex,r.source.rawDefinitionIndex],[plan.entry,plan.reading,plan.sense]),'reviewed whole-word/sense identity differs');
  need(!occupied.has(r.char)&&!oldNames.has(r.givenName),'prior batch target/full-word overlap');
  const prior=facts.reviews[r.char];need(prior&&(prior.status==='pending'||prior.status==='approved'&&!prior.automaticMeaningAllowed)&&equal(r.priorReview,{pendingIndex:prior.pendingIndex,status:prior.status,automaticMeaningAllowed:prior.automaticMeaningAllowed,scope:prior.scope}),'prior standalone status differs');
  need(r.source.id==='moe-revised'&&r.source.originalFile==='data/raw/moe-revised.json.gz'&&r.source.originalSha256===pins.originalPins['data/raw/moe-revised.json.gz'].sha256&&r.source.license==='CC-BY-ND-3.0-TW','original source/license identity differs');
  need(entry?.title===plan.word&&r.source.pinyin===heteronym?.pinyin&&equal(r.source.completeOriginalEntry,entry)&&equal(r.source.definition,definition)&&r.source.parsedEntrySha256===hash(JSON.stringify(entry))&&r.source.hashConvention==='sha256(JSON.stringify(parsed original entry));not individual original byte span','original entry/definition/POS differs');
  const chars=[...r.givenName],sourceGlyphs=[...plan.word];need(chars.length===2&&sourceGlyphs.length===2&&equal(r.targetPositions,chars.flatMap((c,i)=>c===r.char?[i]:[])),'complete word/target positions differ');
  const expectedReadings=[];
  for(const [position,char]of chars.entries()){
   const baseline=facts.characters[char],b=r.characterBindings[position];need(baseline&&b&&equal(b.character,scalar(baseline))&&b.independentCharacterMeaningUnchanged===true,'character/default dictionary snapshot differs');
   const readings=baseline.readings.filter(x=>x.pinyin===baseline.pinyin&&x.tone===baseline.tone&&x.sourceId==='moe-revised'&&x.referenceOnly!==true);need(readings.length===1&&b.selectedDictionaryWord===readings[0].word,'selected default source word differs');
   const original=facts.defaultSources[char],h=original.entry.heteronyms[original.readingIndex];
   need(equal(b.defaultOriginal,{rawEntryIndex:original.entryIndex,rawHeteronymIndex:original.readingIndex,word:original.entry.title,pinyin:h.pinyin,definitions:h.definitions}),'complete default heteronym evidence differs');
   expectedReadings.push({char,pinyin:baseline.pinyin,tone:baseline.tone,confirmed:true});
  }
  need(r.characterBindings.length===2&&equal(r.confirmedReadings,expectedReadings)&&heteronym.pinyin===expectedReadings.map(x=>x.pinyin).join(' '),'whole-word pronunciation/default confirmation contract differs');
  need(equal(r.selection,expected.selection)&&equal(r.grammar,expected.grammar)&&r.reason===expected.reason&&equal(r.exclusions,expected.exclusions),'unreviewed grammar/context or source POS relabelling');
  need(r.defaultState==='needs-explicit-choice'&&r.independentCharacterMeaningApproved===false&&r.wholeNameApproved===false&&r.automaticSemanticCreditAllowed===false&&r.projectWish===null,'case acquired wish/standalone/name/score authority');
  const g=glyphs.bindings[index];need(g.caseId===r.caseId&&g.givenName===r.givenName&&g.sourceWord===plan.word&&g.positions.length===2,'word glyph proof identity differs');
  for(const [position,c]of chars.entries()){
   const p=g.positions[position],sourceGlyph=sourceGlyphs[position];need(p.position===position&&p.character===c&&p.sourceGlyph===sourceGlyph,'word glyph position differs');
   if(c===sourceGlyph){need(p.kind==='exact-source-glyph'&&p.proof.length===0,'same-glyph proof differs');continue;}
   need(p.kind==='unicode-two-way-fixed-lines'&&p.proof.length===2,'two-way variant proof missing');
   for(const [n,file,from,to]of [[0,'data/raw/kTraditionalVariant.txt',c,sourceGlyph],[1,'data/raw/kSimplifiedVariant.txt',sourceGlyph,c]]){
    const proof=p.proof[n],lines=facts.variantLines[file];need(proof.file===file&&proof.fileSha256===pins.originalPins[file].sha256&&Number.isInteger(proof.line)&&proof.line>0&&lines[proof.line-1]===proof.text,'fixed variant source line differs');
    const parts=proof.text.split(/\s+/);need(parseInt(parts[0],16)===from.codePointAt(0)&&[...parts.slice(1).join(' ').matchAll(/U\+([0-9A-Fa-f]+)/g)].some(m=>parseInt(m[1],16)===to.codePointAt(0)),'variant correspondence differs');
   }
  }
 }
 need(publication.coverage.newCandidateRows===20&&publication.coverage.newDistinctTargetCharacters===20&&publication.coverage.formalCoverageAdded===0&&publication.coverage.automaticPromotions===0&&publication.coverage.independentCharacterMeaningPromotions===0&&publication.coverage.baseStandaloneStatusesChanged===false,'coverage claims exceed candidate context scope');
 return freeze({cases:20,wholeWordOnly:true,explicitChoiceRequired:true,sourcePOSMissing:publication.cases.filter(r=>!Object.hasOwn(r.source.definition,'type')).length,formalCoverageAdded:0});
}

export function loadVerifiedB04ContextCandidate(candidateDataDir,originalDataDir){
 const cache=new Map();
 const bytes=(file,pin,original=false)=>{const key=(original?'original:':'candidate:')+file;if(!cache.has(key)){const b=readFileSync(safe(original?originalDataDir:candidateDataDir,file));need(b.length===pin.bytes&&hash(b)===pin.sha256,'fixed byte/hash mismatch: '+file);cache.set(key,b);}return cache.get(key);};
 const parse=b=>{const value=JSON.parse(b.toString('utf8'));assertContextJson(value);return value;};
 const loaded={};for(const [key,pin]of Object.entries(pins.filePins)){const b=bytes(pin.file,pin);loaded[key]=key==='notice'?b.toString('utf8'):parse(b);}
 const originals={};for(const [file,pin]of Object.entries(pins.originalPins))originals[file]=bytes(file,pin,true);
 const lock=loaded.lock,manifest=loaded.manifest,source=lock.sources?.[0];
 need(lock.schema==='meaning-context-source-lock/1'&&lock.sources.length===1&&source.id===pins.sourceId&&equal(source.files,pins.sourceFiles)&&equal(Object.keys(source.fileHashes).sort(),pins.sourceFiles),'existing source-lock closure differs');
 const actual={};for(const file of source.files){const candidatePin=Object.values(pins.filePins).find(p=>p.file===file),b=candidatePin?bytes(file,candidatePin):originals[file];need(b,'unlisted original dependency');actual[file]=hash(b);need(actual[file]===source.fileHashes[file],'source dependency differs');}
 need(hash(JSON.stringify(actual))===pins.sourceAggregateSha256&&source.sha256===pins.sourceAggregateSha256,'source aggregate differs');
 need(manifest.schema==='meaning-context-publication-manifest/1'&&manifest.task==='M460-DATA-B04'&&manifest.status==='candidate-awaiting-independent-admission'&&manifest.productionApproved===false&&manifest.dataVersion===pins.dataVersion,'candidate manifest must remain unadmitted');
 const expectedFiles=[...source.files,pins.filePins.lock.file].sort();need(equal(manifest.files.map(r=>r.logicalTarget).sort(),expectedFiles),'publication file set differs');
 for(const row of manifest.files){const pin=Object.values(pins.filePins).find(p=>p.file===row.logicalTarget),b=pin?bytes(row.logicalTarget,pin):originals[row.logicalTarget];need(b&&b.length===row.bytes&&hash(b)===row.sha256,'publication manifest bytes differ');}
 const dataset=parse(originals['data/dataset-v6.json']),v7=parse(originals['data/naming-editorial-v7.json']),previous=parse(originals['data/meaning-context-v1-1.json']),single40=parse(originals['data/naming-character-meanings-v7.1-profile.json']);
 need(hash(originals['data/knowledge-v6.sqlite'])===loaded.data.base.knowledgePackSha256,'actual fixed knowledge pack differs');
 const raw=parse(gunzipSync(originals['data/raw/moe-revised.json.gz']));
 const titles=new Map(raw.map((entry,index)=>[entry.title,{entry,index}])),characters={},reviews={},entries={},defaultSources={};
 for(const plan of pins.plans){entries[plan.entry]=raw[plan.entry];reviews[plan.char]=v7.meaningReviews.find(r=>r.char===plan.char);for(const char of plan.givenName){const e=dataset.characters.find(r=>r.char===char);need(e,'missing builtin character');characters[char]=e;const reading=e.readings.find(r=>r.pinyin===e.pinyin&&r.tone===e.tone&&r.sourceId==='moe-revised'&&r.referenceOnly!==true),original=titles.get(reading?.word);need(original,'missing exact default original');const readingIndex=original.entry.heteronyms.findIndex(h=>h.pinyin===e.pinyin&&equal(h.definitions.map(d=>d.def),reading.meanings));need(readingIndex>=0,'default source reading/definitions differ');defaultSources[char]={entryIndex:original.index,readingIndex,entry:original.entry};}}
 const facts=freeze({previous,single40,characters,reviews,entries,defaultSources,variantLines:Object.fromEntries(['data/raw/kTraditionalVariant.txt','data/raw/kSimplifiedVariant.txt'].map(f=>[f,originals[f].toString('utf8').split(/\r?\n/)]))});
 need(equal(loaded.review.rows,pins.plans),'authored review input differs');
 need(loaded.originals.entries.length===20&&equal(loaded.originals.entries.map(r=>r.caseId),pins.cases.map(r=>r.caseId))&&loaded.originals.defaultSourceFacts.length===40,'original subset case/default coverage incomplete');
 for(const entry of loaded.originals.entries)need(equal(entry.completeOriginalEntry,raw[entry.entryIndex])&&entry.parsedEntrySha256===hash(JSON.stringify(raw[entry.entryIndex])),'original subset differs');
 for(const entry of loaded.originals.defaultSourceFacts)need(equal(entry.entry,raw[entry.entryIndex])&&entry.entrySha256===hash(JSON.stringify(raw[entry.entryIndex])),'default original subset differs');
 const semantic=validateB04SemanticPublication(loaded.data,loaded.glyphs,facts);
 const capsule=freeze({task:'M460-DATA-B04',candidateOnly:true,activation:'off',productionApproved:false,generationAuthority:false,sourceAuthority:false,formalCoverageAdded:0,publication:loaded.data,sourceLock:lock,manifest,semantic,sourceFacts:facts,glyphs:loaded.glyphs});
 lookups.set(capsule,createMeaningContextLookup(loaded.data));return capsule;
}
export function queryB04ContextCandidate(capsule,request,trustedContext){need(lookups.has(capsule),'capsule was not loaded by this source verifier');return freeze(lookups.get(capsule).lookup(request,trustedContext));}
