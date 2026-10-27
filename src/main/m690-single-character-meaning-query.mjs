import {readFileSync} from 'node:fs';
import {resolve, sep, join} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {types, isDeepStrictEqual as equal} from 'node:util';

// These pins authenticate the existing M690 package. They confer no row admission.
const DELIVERY_SHA = 'e0b7c1895ffb0d74437a0e8d3f73dbdc7913ed4cea7c9a1e48f94bd121900821';
const MANIFEST_SHA = 'a3077dbaba504690a1d07cff342a2ee04327a0bae0232492f2d7b3bc843d3133';
const LOCK_SHA = '8225a4375e8708d8249e94a75112f01a46718c4d201081cf789d002bc67e6682';
const EXPECTED = [...'丘乔众菘佳友国增箫希慕愿诺永时盈臻誉迎问'];
const SOURCES = ['dataset-v6.json','naming-editorial-v7.json','raw/moe-revised.json.gz','raw/kTraditionalVariant.txt','raw/kSimplifiedVariant.txt','raw/moe-README.md','raw/CC-BY-ND-3.0-TW.html','raw/unicode-LICENSE'];
const FILES = ['data/profile.json','data/coverage.json','data/NOTICE.md','data/source-lock.json'];
const SCOPE = 'on-request-supplement-only';
const hash = value => createHash('sha256').update(value).digest('hex');
const need = (value, message) => {if (!value) throw Error('M690 manual query: ' + message);};
const freeze = value => {if (value && typeof value === 'object' && !Object.isFrozen(value)) {Object.values(value).forEach(freeze); Object.freeze(value);} return value;};
const boundaries = {wholeNameMeaning:null,automaticNameRecommendation:false,automaticSemanticCreditAllowed:false,scoreDelta:0};
const batch = freeze({batchId:'M690-D02',sourceId:'naming-character-meanings-m690-candidate',publicationState:'candidate-source-bound-not-admitted',admission:'candidate-awaiting-independent-review',activation:'off',candidateOnly:true,productionApproved:false,manualOnly:true,individualAdmission:'not-granted',independentReview:'scope-only'});

function fields(value, keys, label) {
  need(value !== null && typeof value === 'object' && !types.isProxy(value), label + ' Proxy/non-object');
  const prototype = Object.getPrototypeOf(value);
  need(prototype === Object.prototype || prototype === null, label + ' plain object');
  const copy = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    need(typeof key === 'string' && keys.includes(key), label + ' extra/symbol field');
    const slot = Object.getOwnPropertyDescriptor(value,key);
    need(slot.enumerable && Object.hasOwn(slot,'value'), label + ' accessor/hidden field');
    copy[key] = slot.value;
  }
  return copy;
}
function pathIn(root, file) {
  need(typeof file === 'string' && !file.includes('\\') && !file.includes(':') && file.split('/').every(part=>part && part!=='.' && part!=='..'), 'unsafe source path');
  const target = resolve(root,file);
  need(target.startsWith(resolve(root)+sep), 'source path escaped');
  return target;
}
function pinBytes(root, pin) {
  const bytes = readFileSync(pathIn(root,pin.file));
  need(bytes.length === pin.bytes && hash(bytes) === pin.sha256, 'file bytes differ: '+pin.file);
  return bytes;
}
function authenticate(batchRoot,sourceDataDir) {
  const deliveryBytes = readFileSync(join(batchRoot,'M690-MANIFEST.json'));
  need(hash(deliveryBytes)===DELIVERY_SHA,'fixed delivery manifest');
  const manifestBytes = readFileSync(join(batchRoot,'data/manifest.json'));
  const lockBytes = readFileSync(join(batchRoot,'data/source-lock.json'));
  need(hash(manifestBytes)===MANIFEST_SHA,'fixed candidate manifest');
  need(hash(lockBytes)===LOCK_SHA,'fixed source-lock');
  const delivery=JSON.parse(deliveryBytes), manifest=JSON.parse(manifestBytes), lock=JSON.parse(lockBytes);
  need(delivery.status==='candidate-source-bound-not-admitted' && delivery.boundaries.activation==='off','delivery candidate state');
  need(manifest.batchId==='M690-D02' && manifest.count===20 && manifest.candidateOnly===true && manifest.productionApproved===false && manifest.activation==='off' && manifest.formalCoverageAdded===0,'candidate authority');
  need(equal(manifest.candidateFiles.map(row=>row.file),FILES) && equal(lock.candidateFiles,manifest.candidateFiles.slice(0,3)),'candidate closure');
  need(equal(manifest.sourceFiles.map(row=>row.file),SOURCES) && equal(lock.sourceFiles,manifest.sourceFiles),'source closure');
  const candidateFiles = new Map(manifest.candidateFiles.map(pin=>[pin.file,pinBytes(batchRoot,pin)]));
  const originals = new Map(manifest.sourceFiles.map(pin=>[pin.file,pinBytes(sourceDataDir,pin)]));
  return {candidateFiles, originals};
}
function validateProfile(authenticated) {
  const profile=JSON.parse(authenticated.candidateFiles.get('data/profile.json'));
  const coverage=JSON.parse(authenticated.candidateFiles.get('data/coverage.json'));
  const dataset=JSON.parse(authenticated.originals.get('dataset-v6.json'));
  const editorial=JSON.parse(authenticated.originals.get('naming-editorial-v7.json'));
  const dictionary=JSON.parse(gunzipSync(authenticated.originals.get('raw/moe-revised.json.gz')));
  need(profile.schema==='m690-default-meaning-profile/1' && profile.count===20 && equal(profile.cases.map(row=>row.char),EXPECTED),'fixed twenty rows');
  const excluded=coverage.exclusions;
  const forbidden=new Set([...excluded.base217,...excluded.supplemental304,...excluded.standalone60,...excluded.notRecommended15,...excluded.m610Default20]);
  need(profile.candidateOnly===true && profile.activation==='off' && profile.generationAuthority===false && profile.defaultDatasetChanged===false,'profile authority');
  for (const row of profile.cases) {
    need(row.candidateOnly===true && row.activation==='off' && row.productionApproved===false && row.formalCoverageAdded===0 && row.wholeNameMeaning===null && row.automaticSemanticCreditAllowed===false && row.automaticNameRecommendation===false && row.scoreDelta===0,'row authority');
    need(excluded.remaining198.includes(row.char) && !forbidden.has(row.char),'excluded existing coverage');
    const original=dataset.characters.find(entry=>entry.char===row.char);
    need(equal(original,row.baselineCharacter) && hash(JSON.stringify(original))===row.baselineCharacterSha256,'baseline character');
    need(original.pinyin===row.pinyin && original.tone===row.tone,'selected default reading');
    const reading=original.readings.find(entry=>entry.pinyin===row.pinyin && entry.tone===row.tone && entry.sourceId===row.source.sourceId && entry.referenceOnly!==true);
    need(equal(reading,row.defaultReading),'complete default reading');
    need(equal(editorial.meaningReviews.find(entry=>entry.char===row.char),row.priorV7Review),'prior review');
    const source=row.source,entry=dictionary[source.rawEntryIndex],heteronym=entry?.heteronyms?.[source.rawHeteronymIndex];
    need(source.sourceId==='moe-revised' && source.word===entry?.title && source.pinyin===row.pinyin && source.tone===row.tone,'source reading');
    need(equal(entry,source.completeOriginalEntry) && hash(JSON.stringify(entry))===source.parsedEntrySha256,'complete dictionary entry');
    need(heteronym?.pinyin===row.pinyin && equal(heteronym.definitions[source.rawDefinitionIndex],source.definition) && source.definition.type===source.sourcePOS && reading.meanings.includes(source.definition.def),'definition/POS/index');
    need(source.originalSha256===hash(authenticated.originals.get(source.originalFile)) && source.license==='CC-BY-ND-3.0-TW' && row.project.license==='CC0-1.0','source license/hash');
  }
  return freeze(profile);
}

/** Explicit manual use only. No caller-supplied code, approval or computed rows. */
export function createManualM690MeaningQuery(config) {
  const args=fields(config,['batchRoot','sourceDataDir'],'config');
  need(typeof args.batchRoot==='string' && args.batchRoot.trim() && typeof args.sourceDataDir==='string' && args.sourceDataDir.trim(),'literal directories required');
  const batchRoot=resolve(args.batchRoot), sourceDataDir=resolve(args.sourceDataDir);
  let profile;
  return Object.freeze({
    getSingleCharacterMeaningOptions(query) {
      const input=fields(query,['char','pinyin','tone'],'query');
      need(typeof input.char==='string' && [...input.char].length===1 && !/[\uD800-\uDFFF\u0000-\u001f]/u.test(input.char),'one Unicode scalar');
      if(Object.hasOwn(input,'pinyin'))need(typeof input.pinyin==='string' && input.pinyin.trim(),'nonempty pinyin');
      if(Object.hasOwn(input,'tone'))need(Number.isInteger(input.tone) && input.tone>=1 && input.tone<=5,'tone integer 1..5');
      const actual=authenticate(batchRoot,sourceDataDir);
      profile??=validateProfile(actual);
      const row=profile.cases.find(row=>row.char===input.char && (input.pinyin===undefined || row.pinyin===input.pinyin) && (input.tone===undefined || row.tone===input.tone));
      const options=row?[{char:row.char,pinyin:row.pinyin,tone:row.tone,defaultReading:row.defaultReading,meaning:row.project.meaning,source:{...row.source,readings:row.baselineCharacter.readings},project:row.project,limits:row.project.limits,batch,scope:SCOPE,...boundaries}]:[];
      return freeze(structuredClone({schema:'single-character-meaning-options/1',char:input.char,pinyin:row?.pinyin??input.pinyin??null,status:row?'available':'not-covered',scope:SCOPE,options,source:row?batch:null,limits:row?row.project.limits:[],...boundaries}));
    },
  });
}
