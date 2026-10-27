import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {buildM754,compileM754Artifacts} from '../scripts/m754-element-imagery/build.mjs';
import {loadM754ElementImagery,listM754ImageryCandidates,queryM754ElementImagery,projectM754GenerationCharacters,type VerifiedM754ImageryResources} from '../src/main/m754-element-imagery';
import {generateM754ImageryLocalPreview} from '../src/main/m754-element-imagery-generation';
import {M754_IMAGERY_PROFILE,M754_IMAGERY_LOCK} from '../src/shared/m754-element-imagery-pins';
import {NAMING_RULE_V71_VERSION} from '../src/shared/naming-rules';
import type {M754IndependentReview,M754IndependentReviewPin,M754ObjectTheme} from '../src/shared/m754-element-imagery';
import {manualFixture} from './helpers/m331-candidate-fixture';

const root=path.resolve('.'),dir='data/element-imagery-m754',sha=(bytes:string|Buffer)=>createHash('sha256').update(bytes).digest('hex');
const selected=['枫','卉','麓','菘','珉','川','石','枝','棉','蕤'];
let temporary:string,candidate:VerifiedM754ImageryResources,reviewed:VerifiedM754ImageryResources,reviewPin:M754IndependentReviewPin;
let review:M754IndependentReview;
const base=()=>manualFixture(NAMING_RULE_V71_VERSION,1,['木']);
function binding(char:string){const row=listM754ImageryCandidates(candidate).find(row=>row.candidate.char===char)!.dictionaryFact;return {char,pinyin:row.defaultPinyin,sourceEntrySha256:row.sourceEntrySha256,sourceReadingSha256:row.sourceReadingSha256};}
function writeReview(value:M754IndependentReview){const relativePath=dir+'/test-only-review.json',bytes=JSON.stringify(value);fs.writeFileSync(path.join(temporary,relativePath),bytes);return {relativePath,expectedSha256:sha(bytes)};}
function withChanged(relative:string,operation:(file:string)=>void,assertion:()=>void){const file=path.join(temporary,relative),bytes=fs.readFileSync(file);try{operation(file);assertion();}finally{fs.writeFileSync(file,bytes);}}

beforeAll(()=>{
 temporary=fs.mkdtempSync(path.join(os.tmpdir(),'m754-imagery-'));
 fs.mkdirSync(path.join(temporary,'data/raw'),{recursive:true});fs.cpSync(path.join(root,dir),path.join(temporary,dir),{recursive:true});
 const pins=JSON.parse(fs.readFileSync(path.join(root,dir,'source-pins.json'),'utf8'));
 for(const source of pins.rawSources)fs.copyFileSync(path.join(root,source.path),path.join(temporary,source.path));
 fs.copyFileSync(path.join(root,pins.baseline.path),path.join(temporary,pins.baseline.path));
 candidate=loadM754ElementImagery(root);
 const template=JSON.parse(fs.readFileSync(path.join(root,dir,'admission-template.json'),'utf8'));
 review={...template,packageLockSha256:M754_IMAGERY_LOCK,reviewId:'m754-test-only-review',reviewerId:'TEST-FIXTURE-NOT-A-HUMAN-APPROVAL',rows:template.rows.map((row:M754IndependentReview['rows'][number])=>({...row,decision:'approved',rationale:'测试夹具，仅证明审查契约；不构成数据审查或入库许可。'}))};
 reviewPin=writeReview(review);reviewed=loadM754ElementImagery(temporary,reviewPin);
});
afterAll(()=>{if(temporary)fs.rmSync(temporary,{recursive:true,force:true});});

describe('M754 fixed dictionary facts and separate project convention',()=>{
 it('rebuilds byte for byte, retains 779/257/522 and leaves all ten admissions pending',()=>{
  expect(buildM754(root,{verify:true})).toMatchObject({formalKnown:257,formalUnknown:522,candidates:10,formalNew:0,verified:true});
  expect(listM754ImageryCandidates(candidate).map(row=>row.candidate.char)).toEqual(selected);
  expect(candidate.approvedCount).toBe(0);
  for(const char of selected)expect(queryM754ElementImagery(candidate,binding(char))).toMatchObject({status:'pending-independent-review',effectiveElements:[]});
 });
 it('keeps complete unmodified source entries, citations and Unicode original glyph lines',()=>{
  const rows=listM754ImageryCandidates(candidate),maple=rows[0].dictionaryFact;
  expect(maple.dictionaryWord).toBe('楓');expect(maple.glyphEvidence.map(proof=>proof.line)).toEqual(['67AB\tU+6953','6953\tU+67AB']);
  for(const {dictionaryFact:fact,candidate:row}of rows){expect(sha(JSON.stringify(fact.verbatimEntry))).toBe(fact.sourceEntrySha256);expect(fact.senseRecordId).toContain(`/entry/${fact.entryIndex}/heteronyms/${fact.readingIndex}/definitions/${fact.definitionIndex}`);expect(row.namingIntent.license).toBe('CC0-1.0');expect(row.authority).toBe('project-convention');}
  const facts=JSON.parse(fs.readFileSync(path.join(root,dir,'dictionary-facts.json'),'utf8'));expect(facts.dictionary.textLicense).toBe('CC-BY-ND-3.0-TW');expect(facts.unicode.license).toBe('Unicode-3.0');
 });
 it.each(['data/raw/moe-revised.json.gz','data/raw/kTraditionalVariant.txt','data/raw/CC-BY-ND-3.0-TW.html'])('rejects a missing fixed source %s',relative=>{
  const file=path.join(temporary,relative),held=file+'.held';fs.renameSync(file,held);try{expect(()=>loadM754ElementImagery(temporary)).toThrow();}finally{fs.renameSync(held,file);}
 });
 it.each(['data/raw/moe-revised.json.gz','data/raw/kSimplifiedVariant.txt','data/raw/unicode-LICENSE'])('rejects corrupt original bytes %s',relative=>{
  withChanged(relative,file=>fs.appendFileSync(file,'tamper'),()=>expect(()=>loadM754ElementImagery(temporary)).toThrow(/original-source-mismatch/));
 });
 it('rejects changed candidate/lock/baseline bytes without fallback',()=>{
  for(const relative of [dir+'/convention-candidates.json',dir+'/source-lock.json','data/dataset-v6.json'])withChanged(relative,file=>fs.appendFileSync(file,' '),()=>expect(()=>loadM754ElementImagery(temporary)).toThrow());
 });
 it.each([{key:'defaultPinyin',value:'fèng',message:/default reading mismatch/},{key:'word',value:'風',message:/glyph mismatch/}])('builder rejects wrong $key before emitting files',({key,value,message})=>{
  withChanged(dir+'/editorial-input.json',file=>{const input=JSON.parse(fs.readFileSync(file,'utf8'));input.rows[0][key]=value;fs.writeFileSync(file,JSON.stringify(input));},()=>expect(()=>compileM754Artifacts(temporary)).toThrow(message));
 });
 it('rejects default-reading scope for a multi-sense word',()=>{
  withChanged(dir+'/editorial-input.json',file=>{const input=JSON.parse(fs.readFileSync(file,'utf8'));input.rows[5].scope='default-reading-direct-object';input.rows[5].themeId=null;fs.writeFileSync(file,JSON.stringify(input));},()=>expect(()=>compileM754Artifacts(temporary)).toThrow(/one complete direct-object definition/));
 });
});

describe('M754 independently pinned adoption contract',()=>{
 it('does not accept a copied resource handle or a changed review pin',()=>{
  expect(()=>listM754ImageryCandidates({...candidate} as VerifiedM754ImageryResources)).toThrow(/unverified-resource-handle/);
  expect(()=>loadM754ElementImagery(temporary,{...reviewPin,expectedSha256:'0'.repeat(64)})).toThrow(/review-pin-mismatch/);
 });
 it('refuses self review, a wrong package, and a changed row/scope',()=>{
  const variants=[{...review,reviewerId:'M754-DATA'},{...review,packageLockSha256:'0'.repeat(64)},{...review,rows:review.rows.map((row,index)=>index?row:{...row,candidateSha256:'0'.repeat(64)})},{...review,rows:review.rows.map((row,index)=>index?row:{...row,scope:'explicit-naming-theme' as const})}];
  try{for(const invalid of variants)expect(()=>loadM754ElementImagery(temporary,writeReview(invalid))).toThrow(/independent-review/);}finally{writeReview(review);}
 });
 it('permits reviewed direct objects without per-name manual selection',()=>{
  expect(reviewed.approvedCount).toBe(10);for(const char of selected.slice(0,5))expect(queryM754ElementImagery(reviewed,binding(char))).toMatchObject({status:'eligible',effectiveElements:[char==='麓'||char==='珉'?'土':'木']});
 });
 it('requires the exact explicit object theme for all five polysemous records',()=>{
  for(const char of selected.slice(5)){const row=listM754ImageryCandidates(reviewed).find(row=>row.candidate.char===char)!.candidate;expect(queryM754ElementImagery(reviewed,binding(char))).toMatchObject({status:'theme-required',effectiveElements:[]});expect(queryM754ElementImagery(reviewed,binding(char),row.autoAdoption.themeId!)).toMatchObject({status:'eligible',effectiveElements:[row.projectMapping.element]});}
 });
 it.each([['石','dàn'],['枝','qí'],['枫','fèng']])('rejects alternate/wrong reading %s/%s',(char,pinyin)=>expect(()=>queryM754ElementImagery(reviewed,{...binding(char),pinyin})).toThrow(/reading-mismatch/));
 it('rejects wrong source hashes and does not alias traditional glyphs',()=>{
  expect(()=>queryM754ElementImagery(reviewed,{...binding('枫'),sourceEntrySha256:'0'.repeat(64)})).toThrow(/dictionary-binding-mismatch/);
  expect(queryM754ElementImagery(reviewed,{...binding('枫'),char:'楓'})).toMatchObject({status:'uncovered',effectiveElements:[]});
 });
 it('projects only canonical baseline characters, preserving original source/meaning/reading data',()=>{
  const fixture=base(),original=structuredClone(fixture.characters),projection=projectM754GenerationCharacters(reviewed,fixture.characters,{'川':'river-object'});
  expect(fixture.characters).toEqual(original);expect(projection.characters.filter(row=>row.elements.length)).toHaveLength(263);
  for(const row of projection.characters){const old=original.find(item=>item.char===row.char)!;expect({...row,elements:old.elements,elementBasis:old.elementBasis}).toEqual(old);}
  const wrong=structuredClone(fixture.characters);wrong.find(row=>row.char==='枫')!.pinyin='fèng';expect(()=>projectM754GenerationCharacters(reviewed,wrong)).toThrow(/identity-mismatch/);
  expect(()=>projectM754GenerationCharacters(reviewed,[fixture.characters[0],fixture.characters[0]])).toThrow(/identity-mismatch/);
  expect(()=>projectM754GenerationCharacters(reviewed,fixture.characters,{'川':'tree-branch-object'})).toThrow(/invalid-object-theme/);
 });
 it('keeps unreviewed projection at formal257 and a wrong theme does not silently apply',()=>{
  const fixture=base(),projection=projectM754GenerationCharacters(candidate,fixture.characters);
  expect(projection.characters).toEqual(fixture.characters);expect(projection.characters.filter(row=>row.elements.length)).toHaveLength(257);
  expect(queryM754ElementImagery(reviewed,binding('川'),'tree-branch-object')).toMatchObject({status:'theme-required',effectiveElements:[]});
 });
});

describe('M754 actual generation interface, explicit preview only',()=>{
 it.each(selected)('calls the actual 7.1 generator for %s with its reviewed object scope',char=>{
  const fixture=base(),row=listM754ImageryCandidates(reviewed).find(row=>row.candidate.char===char)!.candidate;
  const preferences={...fixture.preferences,requiredChars:char,preferredElements:[row.projectMapping.element]};
  const themes:Partial<Record<string,M754ObjectTheme>>=row.autoAdoption.themeId?{[char]:row.autoAdoption.themeId}:{};
  const result=generateM754ImageryLocalPreview(reviewed,fixture.characters,themes,fixture.version,fixture.context,fixture.profile,preferences,fixture.analysis,[],7);
  const generated=result.candidates.find(candidate=>candidate.givenName===char);expect(generated).toBeDefined();expect(generated!.characters[0].elements).toEqual([row.projectMapping.element]);expect(generated!.characters[0].meaning).toBe(fixture.characters.find(row=>row.char===char)!.meaning);expect(result.imageryReviewId).toBe('m754-test-only-review');
 });
 it('real generation retains unreviewed [] and still enforces banned characters',()=>{
  const fixture=base(),preferences={...fixture.preferences,requiredChars:'枫'};
  const result=generateM754ImageryLocalPreview(candidate,fixture.characters,{},fixture.version,fixture.context,fixture.profile,preferences,fixture.analysis,[],7);
  expect(result.candidates.find(row=>row.givenName==='枫')!.characters[0].elements).toEqual([]);
  const banned={...preferences,requiredChars:'',forbiddenChars:'枫'};const blocked=generateM754ImageryLocalPreview(reviewed,fixture.characters,{},fixture.version,fixture.context,fixture.profile,banned,fixture.analysis,[],7);expect(blocked.candidates.some(row=>row.givenName==='枫')).toBe(false);
 });
});

describe('M754 object theme boundary regression',()=>{
 const projectedRiver=(themes?:Readonly<Partial<Record<string,M754ObjectTheme>>>)=>projectM754GenerationCharacters(reviewed,base().characters,themes);
 const generatedRiver=(themes:Readonly<Partial<Record<string,M754ObjectTheme>>>)=>{
  const fixture=base(),preferences={...fixture.preferences,requiredChars:'川',preferredElements:['水' as const]};
  return generateM754ImageryLocalPreview(reviewed,fixture.characters,themes,fixture.version,fixture.context,fixture.profile,preferences,fixture.analysis,[],7);
 };
 it('rejects inherited themes before projection and actual 7.1 generation',()=>{
  const themes=Object.create({'川':'river-object'}) as Readonly<Partial<Record<string,M754ObjectTheme>>>;
  let rejected=false,reason='',decision:unknown=null,generatedElements:unknown=null;
  try{
   const projection=projectedRiver(themes);decision=projection.decisions.find(row=>row.char==='川');
   generatedElements=generatedRiver(themes).candidates.find(row=>row.givenName==='川')!.characters[0].elements;
  }catch(error){rejected=true;reason=String(error);}
  console.info('M754-THEME-PROBE '+JSON.stringify({ownEntries:Object.entries(themes),hasOwn:Object.hasOwn(themes,'川'),rejected,reason,decision,generatedElements}));
  expect(rejected).toBe(true);expect(reason).toMatch(/invalid-object-theme/);
  expect(()=>generatedRiver(themes)).toThrow(/invalid-object-theme/);
 });
 it('rejects own accessors without executing a getter',()=>{
  let gets=0;const themes=Object.defineProperty({},'川',{enumerable:true,get(){gets++;return 'river-object';}});
  expect(()=>projectedRiver(themes)).toThrow(/invalid-object-theme/);expect(gets).toBe(0);
 });
 it('rejects Proxy and revoked Proxy without invoking any traps',()=>{
  let traps=0;const trap=()=>{traps++;throw Error('theme Proxy trap executed');};
  const themes=new Proxy({'川':'river-object' as const},{get:trap,getPrototypeOf:trap,ownKeys:trap,getOwnPropertyDescriptor:trap});
  expect(()=>projectedRiver(themes)).toThrow(/invalid-object-theme/);expect(traps).toBe(0);
  const revoked=Proxy.revocable({'川':'river-object' as const},{});revoked.revoke();
  expect(()=>projectedRiver(revoked.proxy)).toThrow(/invalid-object-theme/);
 });
 it.each<{label:string;make:()=>unknown}>([
  {label:'symbol',make:()=>Object.assign({'川':'river-object'}, {[Symbol('theme')]:'river-object'})},
  {label:'hidden',make:()=>Object.defineProperty({},'川',{value:'river-object',enumerable:false})},
  {label:'unknown glyph',make:()=>({'河':'river-object'})},
  {label:'wrong theme',make:()=>({'川':'tree-branch-object'})},
  {label:'own undefined',make:()=>({'川':undefined})},
  {label:'array',make:()=>[]},
  {label:'function',make:()=>function themes(){}},
  {label:'null',make:()=>null},
  {label:'primitive',make:()=>'river-object'}
 ])('rejects invalid $label input',({make})=>{
  expect(()=>projectedRiver(make() as Readonly<Partial<Record<string,M754ObjectTheme>>>)).toThrow(/invalid-object-theme/);
 });
 it.each(['plain','null-prototype'])('accepts only legal own data themes from %s records',kind=>{
  const themes=kind==='plain'?{'川':'river-object' as const}:Object.assign(Object.create(null),{'川':'river-object'});
  const snapshot=structuredClone(themes),projection=projectedRiver(themes);
  expect(themes).toEqual(snapshot);expect(projection.decisions.find(row=>row.char==='川')).toMatchObject({status:'eligible',effectiveElements:['水']});
  const result=generatedRiver(themes);expect(result.candidates.find(row=>row.givenName==='川')!.characters[0].elements).toEqual(['水']);
 });
 it('keeps omitted, undefined and empty themes inactive under Object.prototype pollution',()=>{
  const previous=Object.getOwnPropertyDescriptor(Object.prototype,'川');
  try{
   Object.defineProperty(Object.prototype,'川',{value:'river-object',enumerable:true,configurable:true,writable:true});
   for(const projection of [projectM754GenerationCharacters(reviewed,base().characters),projectedRiver(undefined),projectedRiver({})])expect(projection.decisions.find(row=>row.char==='川')).toMatchObject({status:'theme-required',effectiveElements:[]});
   expect(generatedRiver({}).candidates.find(row=>row.givenName==='川')!.characters[0].elements).toEqual([]);
  }finally{if(previous)Object.defineProperty(Object.prototype,'川',previous);else Reflect.deleteProperty(Object.prototype,'川');}
 });
 it('preserves pending review, current reading and in-pool glyph qualifications',()=>{
  const fixture=base();expect(projectM754GenerationCharacters(candidate,fixture.characters,{'川':'river-object'}).decisions.find(row=>row.char==='川')).toMatchObject({status:'pending-independent-review',effectiveElements:[]});
  const wrong=structuredClone(fixture.characters);wrong.find(row=>row.char==='川')!.pinyin='chuàn';
  expect(()=>projectM754GenerationCharacters(reviewed,wrong,{'川':'river-object'})).toThrow(/identity-mismatch/);
  expect(()=>projectM754GenerationCharacters(reviewed,fixture.characters.filter(row=>row.char!=='川'),{'川':'river-object'})).toThrow(/invalid-object-theme/);
 });
});
