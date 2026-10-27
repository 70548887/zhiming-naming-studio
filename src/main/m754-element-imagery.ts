import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {isDeepStrictEqual,types} from 'node:util';
import type {CharacterEntry} from '../shared/types';
import type {M754DictionaryFact,M754ImageryCandidate,M754ImageryBinding,M754ImageryDecision,M754ObjectTheme,M754IndependentReviewPin,M754IndependentReview} from '../shared/m754-element-imagery';
import {M754_IMAGERY_PROFILE,M754_IMAGERY_LOCK,M754_BASELINE_SHA} from '../shared/m754-element-imagery-pins';

const DIRECTORY='data/element-imagery-m754';
const hash=(bytes:crypto.BinaryLike)=>crypto.createHash('sha256').update(bytes).digest('hex');
const freeze=<T>(value:T):T=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const parse=(bytes:Buffer)=>JSON.parse(bytes.toString('utf8'));
const error=(code:string):never=>{throw new Error('M754 '+code);};
const digest=(value:unknown)=>hash(JSON.stringify(value));
const requiredFiles=['admission-template.json','convention-candidates.json','coverage.json','dictionary-facts.json','editorial-input.json','source-pins.json'];
declare const verifiedM754:unique symbol;
export interface VerifiedM754ImageryResources {
 readonly [verifiedM754]:true;readonly profileId:typeof M754_IMAGERY_PROFILE;readonly packageLockSha256:typeof M754_IMAGERY_LOCK;
 readonly candidateCount:number;readonly approvedCount:number;readonly reviewId:string|null;
}
interface State {baseline:Map<string,CharacterEntry>;facts:Map<string,M754DictionaryFact>;candidates:Map<string,M754ImageryCandidate>;approved:Set<string>;}
const issued=new WeakMap<object,State>();
function state(handle:VerifiedM754ImageryResources):State {const found=handle&&issued.get(handle);if(!found)return error('unverified-resource-handle');return found;}

/** Same-read verified bytes are parsed below; the adjacent lock never supplies its own trusted hash. */
export function loadM754ElementImagery(projectRoot:string,independentReview?:M754IndependentReviewPin):VerifiedM754ImageryResources {
 const root=fs.realpathSync(projectRoot),bytes=new Map<string,Buffer>();
 const read=(relative:string)=>{
  if(typeof relative!=='string'||path.isAbsolute(relative)||relative.split(/[\\/]/).includes('..'))return error('invalid-resource-path');
  if(!bytes.has(relative)){
   const file=fs.realpathSync(path.join(root,relative));if(!file.startsWith(root+path.sep))return error('resource-path-escape');
   bytes.set(relative,fs.readFileSync(file));
  }
  return bytes.get(relative)!;
 };
 const lockBytes=read(DIRECTORY+'/source-lock.json');if(hash(lockBytes)!==M754_IMAGERY_LOCK)return error('package-lock-mismatch');
 const lock=parse(lockBytes) as {profileId:string;baseline:{path:string;sha256:string};rawSources:{path:string;sha256:string}[];projectFiles:Record<string,string>;aggregateSha256:string};
 if(lock.profileId!==M754_IMAGERY_PROFILE||digest(lock.projectFiles)!==lock.aggregateSha256||!isDeepStrictEqual(Object.keys(lock.projectFiles).sort(),requiredFiles))return error('package-identity-mismatch');
 for(const [file,sha256]of Object.entries(lock.projectFiles))if(hash(read(DIRECTORY+'/'+file))!==sha256)return error('project-file-mismatch:'+file);
 for(const source of lock.rawSources)if(hash(read(source.path))!==source.sha256)return error('original-source-mismatch:'+source.path);
 if(lock.baseline.sha256!==M754_BASELINE_SHA||hash(read(lock.baseline.path))!==M754_BASELINE_SHA)return error('baseline-mismatch');
 const dataset=parse(read(lock.baseline.path)) as {characters:CharacterEntry[]};
 if(dataset.characters.length!==779||dataset.characters.filter(row=>row.elements.length).length!==257||dataset.characters.filter(row=>!row.elements.length).length!==522)return error('coverage-mismatch');
 const baseline=new Map(dataset.characters.map(row=>[row.char,freeze(row)]));
 const factFile=parse(read(DIRECTORY+'/dictionary-facts.json')) as {entries:M754DictionaryFact[]};
 const candidateFile=parse(read(DIRECTORY+'/convention-candidates.json')) as {profileId:string;formalCoverage:number;rows:M754ImageryCandidate[]};
 const dictionary=parse(zlib.gunzipSync(read('data/raw/moe-revised.json.gz'))) as M754DictionaryFact['verbatimEntry'][];
 if(candidateFile.profileId!==M754_IMAGERY_PROFILE||candidateFile.formalCoverage!==257||candidateFile.rows.length!==10||factFile.entries.length!==10)return error('candidate-profile-mismatch');
 const facts=new Map<string,M754DictionaryFact>(),candidates=new Map<string,M754ImageryCandidate>();
 for(const fact of factFile.entries){
  const base=baseline.get(fact.char),entry=dictionary[fact.entryIndex],reading=entry?.heteronyms?.[fact.readingIndex],definition=reading?.definitions?.[fact.definitionIndex];
  if(!base||base.elements.length||base.pinyin!==fact.defaultPinyin||reading?.pinyin!==base.pinyin||fact.rawPinyin!==base.pinyin)return error('default-reading-mismatch');
  if(entry?.title!==fact.dictionaryWord||!isDeepStrictEqual(entry,fact.verbatimEntry)||digest(entry)!==fact.sourceEntrySha256||digest(reading)!==fact.sourceReadingSha256||!definition||digest(definition)!==fact.sourceDefinitionSha256)return error('original-entry-mismatch');
  if(fact.char===fact.dictionaryWord){if(fact.glyphEvidence.length)return error('unexpected-glyph-evidence');}
  else {
   if(fact.glyphEvidence.length!==2)return error('missing-glyph-evidence');
   const expected=[['data/raw/kTraditionalVariant.txt',fact.char,fact.dictionaryWord],['data/raw/kSimplifiedVariant.txt',fact.dictionaryWord,fact.char]];
   expected.forEach(([file,from,to],index)=>{const proof=fact.glyphEvidence[index],actual=read(file).toString('utf8').split(/\r?\n/)[proof.lineNumber-1];if(proof.file!==file||actual!==proof.line||actual.split('\t')[0]!==from.codePointAt(0)!.toString(16).toUpperCase()||!actual.split('\t')[1]?.split(' ').includes('U+'+to.codePointAt(0)!.toString(16).toUpperCase()))error('glyph-evidence-mismatch');});
  }
  if(facts.has(fact.char))return error('duplicate-fact');facts.set(fact.char,freeze(fact));
 }
 for(const candidate of candidateFile.rows){
  const fact=facts.get(candidate.char),{candidateSha256,...content}=candidate;
  if(!fact||candidate.factId!==fact.factId||candidate.defaultPinyin!==fact.defaultPinyin||digest(content)!==candidateSha256||candidates.has(candidate.char)||candidate.status!=='pending-independent-review')return error('candidate-binding-mismatch');
  candidates.set(candidate.char,freeze(candidate));
 }
 const approved=new Set<string>();let reviewId:string|null=null;
 if(independentReview){
  if(!/^[0-9a-f]{64}$/.test(independentReview.expectedSha256))return error('invalid-review-pin');
  const reviewBytes=read(independentReview.relativePath);if(hash(reviewBytes)!==independentReview.expectedSha256)return error('review-pin-mismatch');
  const review=parse(reviewBytes) as M754IndependentReview;
  if(review.schemaVersion!=='m754-independent-review/1.0.0'||review.profileId!==M754_IMAGERY_PROFILE||review.packageLockSha256!==M754_IMAGERY_LOCK||review.authorId!=='M754-DATA'||typeof review.reviewerId!=='string'||!review.reviewerId.trim()||review.reviewerId==='M754-DATA'||typeof review.reviewId!=='string'||!review.reviewId.trim()||review.rows.length!==10)return error('independent-review-identity-mismatch');
  const seen=new Set<string>();
  for(const row of review.rows){const candidate=candidates.get(row.char);if(!candidate||seen.has(row.char)||row.candidateSha256!==candidate.candidateSha256||row.scope!==candidate.autoAdoption.scope||row.themeId!==candidate.autoAdoption.themeId||!['approved','rejected','pending'].includes(row.decision))return error('independent-review-row-mismatch');seen.add(row.char);if(row.decision==='approved'){if(typeof row.rationale!=='string'||!row.rationale.trim())return error('independent-review-rationale-missing');approved.add(row.char);}}
  reviewId=review.reviewId;
 }
 const handle=freeze({profileId:M754_IMAGERY_PROFILE,packageLockSha256:M754_IMAGERY_LOCK,candidateCount:10,approvedCount:approved.size,reviewId}) as VerifiedM754ImageryResources;
 issued.set(handle,{baseline,facts,candidates,approved});return handle;
}

export function listM754ImageryCandidates(handle:VerifiedM754ImageryResources):readonly {candidate:M754ImageryCandidate;dictionaryFact:M754DictionaryFact}[]{const s=state(handle);return freeze([...s.candidates.values()].map(candidate=>({candidate,dictionaryFact:s.facts.get(candidate.char)!})));}

export function queryM754ElementImagery(handle:VerifiedM754ImageryResources,binding:M754ImageryBinding,theme?:M754ObjectTheme):M754ImageryDecision {
 const s=state(handle),candidate=s.candidates.get(binding.char),fact=s.facts.get(binding.char);
 const base={char:binding.char,pinyin:binding.pinyin,profileId:handle.profileId,packageLockSha256:handle.packageLockSha256,reviewId:handle.reviewId};
 if(!candidate||!fact)return freeze({...base,status:'uncovered',proposedElements:[],effectiveElements:[],factId:null,candidateSha256:null,adoptionScope:null,requiredTheme:null});
 if(binding.pinyin!==fact.defaultPinyin)return error('reading-mismatch');
 if(binding.sourceEntrySha256!==fact.sourceEntrySha256||binding.sourceReadingSha256!==fact.sourceReadingSha256)return error('dictionary-binding-mismatch');
 const result={...base,proposedElements:[candidate.projectMapping.element],factId:fact.factId,candidateSha256:candidate.candidateSha256,adoptionScope:candidate.autoAdoption.scope,requiredTheme:candidate.autoAdoption.themeId};
 if(!s.approved.has(binding.char))return freeze({...result,status:'pending-independent-review',effectiveElements:[]});
 if(candidate.autoAdoption.scope==='explicit-naming-theme'&&theme!==candidate.autoAdoption.themeId)return freeze({...result,status:'theme-required',effectiveElements:[]});
 return freeze({...result,status:'eligible',effectiveElements:[candidate.projectMapping.element]});
}

/** Explicit preview projection for the existing CharacterEntry[] generation contract; never writes the formal dataset or saved customer data. */
export function projectM754GenerationCharacters(handle:VerifiedM754ImageryResources,characters:readonly CharacterEntry[],objectThemes:Readonly<Partial<Record<string,M754ObjectTheme>>>={}):{characters:CharacterEntry[];decisions:M754ImageryDecision[]} {
 const s=state(handle),seen=new Set<string>(),decisions:M754ImageryDecision[]=[];
 const themes=snapshotObjectThemes(objectThemes,s,characters);
 const projected=characters.map(character=>{
  const baseline=s.baseline.get(character.char);if(seen.has(character.char)||!isDeepStrictEqual(character,baseline))return error('generation-character-identity-mismatch');seen.add(character.char);
  const copy=structuredClone(character),fact=s.facts.get(character.char);if(!fact)return copy;
  const theme=Object.getOwnPropertyDescriptor(themes,character.char)?.value as M754ObjectTheme|undefined;
  const decision=queryM754ElementImagery(handle,{char:character.char,pinyin:character.pinyin,sourceEntrySha256:fact.sourceEntrySha256,sourceReadingSha256:fact.sourceReadingSha256},theme);decisions.push(decision);
  if(decision.effectiveElements.length){copy.elements=[...decision.effectiveElements];copy.elementBasis=`${handle.profileId}（项目辞书直接物象约定；独立审查${handle.reviewId}；${decision.adoptionScope}${decision.requiredTheme?'；主题'+decision.requiredTheme:''}；非传统唯一五行）`;}
  return copy;
 });
 return {characters:projected,decisions};
}

/** Copy only explicit data fields once; neither validation nor adoption reads caller getters or inherited values. */
function snapshotObjectThemes(value:unknown,s:State,characters:readonly CharacterEntry[]):Readonly<Partial<Record<string,M754ObjectTheme>>> {
 if(types.isProxy(value)||!value||typeof value!=='object')return error('invalid-object-theme');
 const prototype=Object.getPrototypeOf(value);
 if(prototype!==Object.prototype&&prototype!==null)return error('invalid-object-theme');
 const snapshot=Object.create(null) as Partial<Record<string,M754ObjectTheme>>;
 for(const key of Reflect.ownKeys(value)){
  if(typeof key!=='string')return error('invalid-object-theme');
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  if(!descriptor||!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))return error('invalid-object-theme');
  const theme:unknown=descriptor.value,candidate=s.candidates.get(key);
  if(typeof theme!=='string'||!characters.some(row=>row.char===key)||candidate?.autoAdoption.scope!=='explicit-naming-theme'||candidate.autoAdoption.themeId!==theme)return error('invalid-object-theme');
  Object.defineProperty(snapshot,key,{value:theme,enumerable:true});
 }
 return Object.freeze(snapshot);
}
