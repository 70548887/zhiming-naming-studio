import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {buildSync} from 'esbuild';
import {createM779AdmittedElementImagery,type M779AdmittedElementImagery} from '../src/main/m779-admitted-element-imagery';
import {generateLocalForRuleVersionWithContext} from '../src/domain/naming';
import {manualFixture} from './helpers/m331-candidate-fixture';
import {NAMING_RULE_V71_VERSION} from '../src/shared/naming-rules';
import type {M754ObjectTheme} from '../src/shared/m754-element-imagery';
import type {M779NameProvenance} from '../src/shared/m779-admitted-element-imagery';
import type {CharacterEntry} from '../src/shared/types';

const root=path.resolve('.'),publication='assets/project-element-imagery/1.0.0';
const sha=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
const general=['枫','卉','麓','菘','珉'],conditional=['川','石','枝','棉','蕤'];
const themes:Partial<Record<string,M754ObjectTheme>>={'川':'river-object','石':'mineral-stone-object','枝':'tree-branch-object','棉':'cotton-plant-object','蕤':'hanging-flower-object'};
let module:M779AdmittedElementImagery,temporary:string;
const fixture=()=>manualFixture(NAMING_RULE_V71_VERSION,1,['木']);
const binding={candidateId:'m779-candidate-1',givenName:'枫川'};
function changed(relative:string,change:(file:string)=>void,assertion:()=>void){const file=path.join(temporary,publication,relative),bytes=fs.readFileSync(file);try{change(file);assertion();}finally{fs.writeFileSync(file,bytes);}}
beforeAll(()=>{module=createM779AdmittedElementImagery(root);temporary=fs.mkdtempSync(path.join(os.tmpdir(),'m779-admitted-'));fs.mkdirSync(path.join(temporary,'assets/project-element-imagery'),{recursive:true});fs.cpSync(path.join(root,publication),path.join(temporary,publication),{recursive:true});});
afterAll(()=>{if(temporary&&path.resolve(temporary).startsWith(path.resolve(os.tmpdir())+path.sep))fs.rmSync(temporary,{recursive:true,force:true});});

describe('M779 fixed independent admission registration',()=>{
 it('loads the exact original approved review through a fixed publication and distinguishes coverage',()=>{
  const bytes=fs.readFileSync(path.join(root,publication,'data/element-imagery-m770/independent-review.json'));
  expect(sha(bytes)).toBe('89ad0ade1a15adb0f801649b650888f376d84f51c469de4f1455bf42a4280509');
  expect(module.identity).toMatchObject({authority:'project-convention',reviewId:'M770-object-element-review/1.0.0',reviewSha256:sha(bytes),reviewerId:'M770-DECISION',semanticAuditId:'M777-element-admission-audit/1.0.0'});
  expect(module.coverage).toEqual({baseline:{total:779,tagged:257,untagged:522},admitted:{general:5,explicitTheme:5,generalCharacters:general,themeCharacters:conditional},activation:'explicit-trusted-factory',productionServiceConnected:false,productionStoreConnected:false});
  expect(Object.isFrozen(module)).toBe(true);expect(Object.isFrozen(module.identity)).toBe(true);
 });
 it('publishes all original M754 resources, baseline, source bytes and licenses unchanged',()=>{
  for(const file of fs.readdirSync('data/element-imagery-m754'))expect(fs.readFileSync(path.join(root,publication,'data/element-imagery-m754',file))).toEqual(fs.readFileSync(path.join(root,'data/element-imagery-m754',file)));
  const lock=JSON.parse(fs.readFileSync(path.join(root,publication,'data/element-imagery-m754/source-lock.json'),'utf8'));
  for(const source of [lock.baseline,...lock.rawSources])expect(sha(fs.readFileSync(path.join(root,publication,source.path)))).toBe(source.sha256);
  expect(JSON.parse(fs.readFileSync('package.json','utf8')).build.files).toContain('assets/**/*');
 });
 it.each(['data/element-imagery-m770/independent-review.json','data/element-imagery-m770/m777-admission-decision.json','data/raw/moe-revised.json.gz','data/raw/unicode-LICENSE','data/dataset-v6.json','manifest.json'])('rejects corrupt published bytes in %s',relative=>{
  changed(relative,file=>fs.appendFileSync(file,' '),()=>expect(()=>createM779AdmittedElementImagery(temporary)).toThrow(/mismatch/));
 });
 it('rejects a missing source and has no development fallback',()=>{
  const source=path.join(temporary,publication,'data/raw/moe-revised.json.gz'),held=source+'.held';fs.renameSync(source,held);
  try{expect(()=>createM779AdmittedElementImagery(temporary)).toThrow();}finally{fs.renameSync(held,source);}
 });
 it('accepts no caller review override and ignores environment pin replacement attempts',()=>{
  expect(()=>Reflect.apply(createM779AdmittedElementImagery,undefined,[root,{relativePath:'other.json',expectedSha256:'0'.repeat(64)}])).toThrow(/invalid-factory-configuration/);
  expect(()=>Reflect.apply(createM779AdmittedElementImagery,undefined,[{projectRoot:root,reviewPin:{}}])).toThrow(/invalid-factory-configuration/);
  const old=process.env.M770_REVIEW_PATH;process.env.M770_REVIEW_PATH='data/element-imagery-m754/admission-template.json';
  try{expect(createM779AdmittedElementImagery(temporary).identity.reviewSha256).toBe(module.identity.reviewSha256);changed('data/element-imagery-m770/independent-review.json',file=>fs.appendFileSync(file,' '),()=>expect(()=>createM779AdmittedElementImagery(temporary)).toThrow(/mismatch/));}finally{if(old===undefined)delete process.env.M770_REVIEW_PATH;else process.env.M770_REVIEW_PATH=old;}
 });
});

describe('M779 actual approved generation and conditions',()=>{
 it('keeps original dataset257 and input JSON unchanged while enabling only the approved module scope',()=>{
  const f=fixture(),before=JSON.stringify(f.characters),plain=module.project(f.characters),exact=module.project(f.characters,themes);
  expect(f.characters.filter(row=>row.elements.length)).toHaveLength(257);expect(plain.characters.filter(row=>row.elements.length)).toHaveLength(262);expect(exact.characters.filter(row=>row.elements.length)).toHaveLength(267);expect(JSON.stringify(f.characters)).toBe(before);
  expect(plain.decisions.filter(row=>row.status==='eligible').map(row=>row.char).sort()).toEqual([...general].sort());expect(plain.decisions.filter(row=>row.status==='theme-required').map(row=>row.char).sort()).toEqual([...conditional].sort());
  expect(module.baselineCharacters()).toEqual(f.characters);
 });
 it.each([...general,...conditional])('uses the real 7.1 generator for approved %s',char=>{
  const f=fixture(),selected=themes[char]?{[char]:themes[char]}:{},projection=module.project(f.characters,selected),decision=projection.decisions.find(row=>row.char===char)!;
  const preferences={...f.preferences,requiredChars:char,preferredElements:[...decision.effectiveElements]};
  const before=JSON.stringify({characters:f.characters,preferences,profile:f.profile});
  const result=module.generateLocal(f.characters,selected,f.version,f.context,f.profile,preferences,f.analysis,[],7),candidate=result.candidates.find(row=>row.givenName===char)!;
  expect(candidate).toBeDefined();expect(candidate.characters[0].elements).toEqual(decision.effectiveElements);expect(result.persistence).toBe('not-written');expect(JSON.stringify({characters:f.characters,preferences,profile:f.profile})).toBe(before);
  const proof=result.provenance.find(row=>row.binding.candidateId===candidate.id)!;expect(proof.rows[0].mapping!.requestedTheme).toBe(themes[char]??null);
  expect(module.verifyNameProvenance(JSON.parse(JSON.stringify(proof)),{candidateId:candidate.id,givenName:char},f.characters,selected)).toEqual(proof);
 });
 it.each(conditional)('keeps %s unlabelled in actual generation without its explicit theme',char=>{
  const f=fixture(),result=module.generateLocal(f.characters,{},f.version,f.context,f.profile,{...f.preferences,requiredChars:char},f.analysis,[],7),candidate=result.candidates.find(row=>row.givenName===char)!;
  expect(candidate.characters[0].elements).toEqual([]);expect(result.provenance.find(row=>row.binding.candidateId===candidate.id)!.rows[0].mapping).toMatchObject({status:'theme-required',requestedTheme:null});
 });
 it('makes existing traditional-score effects visible instead of claiming unchanged scores',()=>{
  const f=fixture(),preferences={...f.preferences,requiredChars:'枫'};
  const previous=generateLocalForRuleVersionWithContext(f.version,f.context,f.profile,preferences,f.analysis,f.characters,[],7).candidates.find(row=>row.givenName==='枫')!;
  const next=module.generateLocal(f.characters,{},f.version,f.context,f.profile,preferences,f.analysis,[],7).candidates.find(row=>row.givenName==='枫')!;
  expect(previous.characters[0].elements).toEqual([]);expect(next.characters[0].elements).toEqual(['木']);expect(next.evaluation.traditional).toBeGreaterThan(previous.evaluation.traditional);
  expect(module.sourceRecords[0].note).toContain('筛选与传统分');
 });
 it('continues to reject inherited/getter/Proxy themes and wrong default readings',()=>{
  const f=fixture();expect(()=>module.project(f.characters,Object.create({'川':'river-object'}))).toThrow(/invalid-object-theme/);
  let gets=0,traps=0;const getter=Object.defineProperty({},'川',{enumerable:true,get(){gets++;return 'river-object';}});
  expect(()=>module.project(f.characters,getter)).toThrow(/invalid-object-theme/);expect(gets).toBe(0);
  const proxy=new Proxy({'川':'river-object' as const},{ownKeys(){traps++;throw Error('trap');}});expect(()=>module.project(f.characters,proxy)).toThrow(/invalid-object-theme/);expect(traps).toBe(0);
  expect(()=>module.project(f.characters,{'川':'tree-branch-object'})).toThrow(/invalid-object-theme/);
  const wrong=structuredClone(f.characters);wrong.find(row=>row.char==='石')!.pinyin='dàn';expect(()=>module.project(wrong,{'石':'mineral-stone-object'})).toThrow(/identity-mismatch/);
 });
});

describe('M779 serializable provenance and replay',()=>{
 it('captures position/readings/source hashes/rules/conditions and independent package/review identities',()=>{
  const f=fixture(),proof=module.captureNameProvenance(binding,f.characters,{'川':'river-object'});
  expect(proof.rows.map(row=>[row.position,row.char,row.pinyin,row.mapping!.scope,row.mapping!.requestedTheme])).toEqual([[1,'枫','fēng','default-reading-direct-object',null],[2,'川','chuān','explicit-naming-theme','river-object']]);
  expect(proof.rows[0].mapping).toMatchObject({authority:'project-convention',dictionaryWord:'楓',factId:'m754-67ab',mappingRuleId:'m754-direct-object-tree',element:'木'});
  for(const row of proof.rows)for(const digest of [row.baselineCharacterSha256,row.projectedCharacterSha256,row.mapping!.sourceEntrySha256,row.mapping!.sourceReadingSha256,row.mapping!.sourceDefinitionSha256,row.mapping!.candidateSha256])expect(digest).toMatch(/^[0-9a-f]{64}$/);
  expect(module.verifyNameProvenance(JSON.parse(JSON.stringify(proof)),binding,f.characters,{'川':'river-object'})).toEqual(proof);
  expect(module.sourceRecords.map(row=>row.sha256)).toContain(proof.publication.reviewSha256);
 });
 it.each<{label:string;change:(value:M779NameProvenance)=>void}>([
  {label:'review SHA',change:p=>{p.publication.reviewSha256='0'.repeat(64);}},
  {label:'mapping version',change:p=>{p.rows[0].mapping!.profileId='other-version';}},
  {label:'source reading',change:p=>{p.rows[0].mapping!.sourceReadingSha256='0'.repeat(64);}},
  {label:'source definition',change:p=>{p.rows[0].mapping!.sourceDefinitionSha256='0'.repeat(64);}},
  {label:'mapping rule',change:p=>{p.rows[0].mapping!.mappingRuleId='invented';}},
  {label:'reading',change:p=>{p.rows[0].pinyin='fèng';}},
  {label:'scope',change:p=>{p.rows[1].mapping!.scope='default-reading-direct-object';}},
  {label:'requested theme',change:p=>{p.rows[1].mapping!.requestedTheme=null;}},
  {label:'elements',change:p=>{p.rows[1].effectiveElements=['金'];}},
  {label:'position',change:p=>{p.rows[1].position=1;}},
  {label:'missing row',change:p=>{p.rows.pop();}},
  {label:'duplicate row',change:p=>{p.rows[1]=p.rows[0];}},
  {label:'extra field',change:p=>{Object.assign(p,{approvedByClient:true});}}
 ])('rejects tampered $label',({change})=>{
  const f=fixture(),proof=structuredClone(module.captureNameProvenance(binding,f.characters,{'川':'river-object'}));change(proof);
  expect(()=>module.verifyNameProvenance(proof,binding,f.characters,{'川':'river-object'})).toThrow(/provenance-replay-mismatch/);
 });
 it('binds replay to independently supplied name and explicit theme preferences',()=>{
  const f=fixture(),proof=module.captureNameProvenance(binding,f.characters,{'川':'river-object'});
  expect(()=>module.verifyNameProvenance(proof,binding,f.characters)).toThrow(/provenance-replay-mismatch/);
  expect(()=>module.verifyNameProvenance(proof,{...binding,candidateId:'other-plan-candidate'},f.characters,{'川':'river-object'})).toThrow(/provenance-replay-mismatch/);
 });
 it('rejects active/hidden/symbol provenance values without executing getters or Proxy traps',()=>{
  const f=fixture(),proof=module.captureNameProvenance(binding,f.characters,{'川':'river-object'});let gets=0,traps=0;
  const accessor=Object.defineProperty(structuredClone(proof),'rows',{enumerable:true,get(){gets++;return proof.rows;}});
  expect(()=>module.verifyNameProvenance(accessor,binding,f.characters,{'川':'river-object'})).toThrow(/invalid-provenance-data/);expect(gets).toBe(0);
  const proxy=new Proxy(proof,{ownKeys(){traps++;throw Error('trap');}});expect(()=>module.verifyNameProvenance(proxy,binding,f.characters,{'川':'river-object'})).toThrow(/invalid-provenance-data/);expect(traps).toBe(0);
  expect(()=>module.verifyNameProvenance(Object.defineProperty(structuredClone(proof),'hidden',{value:true}),binding,f.characters,{'川':'river-object'})).toThrow(/invalid-provenance-data/);
  expect(()=>module.verifyNameProvenance({...proof,[Symbol('approval')]:true},binding,f.characters,{'川':'river-object'})).toThrow(/invalid-provenance-data/);
 });
});

describe('M779 Git-deliverable portable publication',()=>{
 it('extracts only Git-owned published resources and runs the bundled actual generator without development data/src',()=>{
  const files=execFileSync('git',['ls-files','--',publication],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);expect(files).toHaveLength(22);
  const isolated=fs.mkdtempSync(path.join(os.tmpdir(),'m779-portable-'));
  try{
   execFileSync('git',['checkout-index','--prefix='+isolated.replace(/\\/g,'/')+'/', '--',...files],{cwd:root});
   expect(fs.existsSync(path.join(isolated,'data'))).toBe(false);expect(fs.existsSync(path.join(isolated,'src'))).toBe(false);
   const bundle=path.join(isolated,'probe.cjs');buildSync({entryPoints:[path.join(root,'tests/fixtures/m779-portable-probe.ts')],bundle:true,platform:'node',format:'cjs',target:'node22',outfile:bundle,logLevel:'silent'});
   const result=JSON.parse(execFileSync(process.execPath,[bundle,isolated],{cwd:isolated,encoding:'utf8',timeout:30000}));
   expect(result).toMatchObject({portable:true,developmentDataPresent:false,developmentSourcePresent:false,nodeModulesPresent:false,baselineTagged:257,withoutThemesTagged:262,allExactThemesTagged:267,inputUnchanged:true,provenanceReplayVerified:10,persistence:'not-written'});
   expect(result.general).toHaveLength(5);expect(result.conditional).toHaveLength(5);expect(result.unselected).toHaveLength(5);
   console.info('M779-PORTABLE-RESULT '+JSON.stringify(result));
  }finally{if(path.resolve(isolated).startsWith(path.resolve(os.tmpdir())+path.sep))fs.rmSync(isolated,{recursive:true,force:true});}
 },45000);
});

describe('M779 owned character snapshot boundary regression',()=>{
 it('rejects a caller-owned map before capture and replay can accept a forged reading',()=>{
  const clean=module.baselineCharacters().find(row=>row.char==='枫')!,forged={...structuredClone(clean),pinyin:'fèng',sourceId:'fabricated-source'},characters=[forged];let maps=0;
  Object.defineProperty(characters,'map',{enumerable:true,configurable:true,value(callback:(row:typeof clean,index:number,all:typeof characters)=>unknown){maps++;if(maps%2===1){callback(clean,0,characters);return [structuredClone(forged)];}return Array.prototype.map.call(characters,callback);}});
  const expected={candidateId:'m783-custom-map-probe',givenName:'枫'};let rejected=false,reason='',captured:unknown=null,replayAccepted=false;
  try{const proof=module.captureNameProvenance(expected,characters,{});captured={pinyin:proof.rows[0].pinyin,effectiveElements:proof.rows[0].effectiveElements,mapping:proof.rows[0].mapping};replayAccepted=JSON.stringify(module.verifyNameProvenance(JSON.parse(JSON.stringify(proof)),expected,characters,{}))===JSON.stringify(proof);}catch(error){rejected=true;reason=String(error);}
  console.info('M779-CHARACTER-MAP-PROBE '+JSON.stringify({ownMap:Object.hasOwn(characters,'map'),input:{char:forged.char,pinyin:forged.pinyin,sourceId:forged.sourceId},maps,rejected,reason,captured,replayAccepted}));
  expect(rejected).toBe(true);expect(reason).toMatch(/invalid-character-data/);expect(maps).toBe(0);
 });
 const maple=()=>module.baselineCharacters().find(row=>row.char==='枫')!;
 const ownBinding={candidateId:'m783-owned-data',givenName:'枫'};
 function enter(route:string,characters:readonly CharacterEntry[]){
  if(route==='project')return module.project(characters,{});
  if(route==='capture')return module.captureNameProvenance(ownBinding,characters,{});
  if(route==='verify'){const proof=module.captureNameProvenance(ownBinding,[maple()],{});return module.verifyNameProvenance(JSON.parse(JSON.stringify(proof)),ownBinding,characters,{});}
  const f=fixture();return module.generateLocal(characters,{},f.version,f.context,f.profile,{...f.preferences,requiredChars:'枫'},f.analysis,[],7);
 }
 it.each(['project','capture','verify','generate'])('snapshots characters before the %s entry can invoke caller map or toJSON',route=>{
  let calls=0;const characters=[maple()];Object.defineProperty(characters,'map',{value(){calls++;throw Error('caller map');},enumerable:true});
  expect(()=>enter(route,characters)).toThrow(/invalid-character-data/);expect(calls).toBe(0);
  const jsonCharacters=[maple()];Object.defineProperty(jsonCharacters,'toJSON',{value(){calls++;throw Error('caller toJSON');},enumerable:true});
  expect(()=>enter(route,jsonCharacters)).toThrow(/invalid-character-data/);expect(calls).toBe(0);
 });
 it.each<{label:string;make:(clean:CharacterEntry)=>unknown}>([
  {label:'Array subclass',make:clean=>new(class extends Array<CharacterEntry>{})(clean)},
  {label:'nonstandard array prototype',make:clean=>Object.setPrototypeOf([clean],null)},
  {label:'hidden array field',make:clean=>Object.defineProperty([clean],'metadata',{value:true})},
  {label:'symbol array field',make:clean=>Object.assign([clean],{[Symbol('map')]:true})},
  {label:'sparse array',make:()=>new Array(1)},
  {label:'overlarge sparse length',make:()=>new Array(0xffffffff)},
  {label:'hidden indexed value',make:clean=>Object.defineProperty([clean],'0',{value:clean,enumerable:false})},
  {label:'hidden nested field',make:clean=>[Object.defineProperty(clean,'metadata',{value:true})]},
  {label:'nested symbol field',make:clean=>[Object.assign(clean,{[Symbol('source')]:true})]},
  {label:'nested function',make:clean=>[Object.assign(clean,{toJSON(){throw Error('must not execute');}})]},
  {label:'cyclic object',make:clean=>{const cyclic:unknown[]=[clean];Object.assign(clean,{cycle:cyclic});return cyclic;}},
  {label:'nonarray characters',make:clean=>({0:clean,length:1})}
 ])('rejects $label without changing the publication',({make})=>expect(()=>module.project(make(maple()) as CharacterEntry[])).toThrow(/invalid-character-data/));
 it('rejects indexed/nested getters and root/nested/revoked Proxy without executing them',()=>{
  let getters=0,traps=0;const clean=maple();
  const indexed=Object.defineProperty([clean],'0',{enumerable:true,get(){getters++;return clean;}});
  expect(()=>module.project(indexed)).toThrow(/invalid-character-data/);
  const nested=[Object.defineProperty(structuredClone(clean),'pinyin',{enumerable:true,get(){getters++;return 'fēng';}})];
  expect(()=>module.project(nested)).toThrow(/invalid-character-data/);
  const trap=()=>{traps++;throw Error('Proxy trap must not execute');};
  const rootProxy=new Proxy([clean],{get:trap,getPrototypeOf:trap,ownKeys:trap,getOwnPropertyDescriptor:trap});
  expect(()=>module.project(rootProxy)).toThrow(/invalid-character-data/);
  const nestedProxy=[{...clean,readings:new Proxy(clean.readings!,{get:trap,getPrototypeOf:trap,ownKeys:trap,getOwnPropertyDescriptor:trap})}];
  expect(()=>module.project(nestedProxy)).toThrow(/invalid-character-data/);
  const revoked=Proxy.revocable([clean],{});revoked.revoke();expect(()=>module.project(revoked.proxy)).toThrow(/invalid-character-data/);
  expect(getters).toBe(0);expect(traps).toBe(0);
 });
 it('accepts the full ordinary JSON pool, empty arrays and valid subsets without modifying input',()=>{
  const characters=JSON.parse(JSON.stringify(module.baselineCharacters())) as CharacterEntry[],before=JSON.stringify(characters);
  expect(module.project(characters).characters.filter(row=>row.elements.length)).toHaveLength(262);expect(JSON.stringify(characters)).toBe(before);
  expect(module.project([]).characters).toEqual([]);
  const clean=characters.find(row=>row.char==='枫')!;expect(module.project([clean]).characters[0].elements).toEqual(['木']);
  expect(module.project([Object.assign(Object.create(null),clean)]).characters[0].pinyin).toBe('fēng');
  const f=fixture();expect(module.generateLocal([],{},f.version,f.context,f.profile,{...f.preferences,requiredChars:''},f.analysis,[],7).candidates).toEqual([]);
 });
 it('permits shared JSON child values while rejecting cycles and excessive depth',()=>{
  const characters=module.baselineCharacters(),first=characters[0],second=characters.find(row=>row.char!==first.char&&JSON.stringify(row.tags)===JSON.stringify(first.tags))!;
  const shared=[first,{...second,tags:first.tags}];expect(()=>module.project(shared)).not.toThrow();
  const clean=maple(),deep:Record<string,unknown>={};let cursor=deep;for(let depth=0;depth<65;depth++){const next={};cursor.next=next;cursor=next;}
  expect(()=>module.project([{...clean,extra:deep} as CharacterEntry])).toThrow(/invalid-character-data/);
 });
 it('owns binding, expected values and themes without executing caller getters or Proxy traps',()=>{
  const characters=[maple()],proof=module.captureNameProvenance(ownBinding,characters,{});let gets=0,traps=0;
  const badBinding=Object.defineProperty({...ownBinding},'givenName',{enumerable:true,get(){gets++;return '枫';}});
  expect(()=>module.captureNameProvenance(badBinding,characters,{})).toThrow(/invalid-provenance-data/);
  expect(()=>module.verifyNameProvenance(proof,badBinding,characters,{})).toThrow(/invalid-provenance-data/);
  const badThemes=Object.defineProperty({},'川',{enumerable:true,get(){gets++;return 'river-object';}});
  expect(()=>module.captureNameProvenance(ownBinding,characters,badThemes)).toThrow(/invalid-object-theme/);
  const badExpected=new Proxy(ownBinding,{ownKeys(){traps++;throw Error('trap');}});
  expect(()=>module.verifyNameProvenance(proof,badExpected,characters,{})).toThrow(/invalid-provenance-data/);
  const badSaved=new Proxy(proof,{ownKeys(){traps++;throw Error('trap');}});
  expect(()=>module.verifyNameProvenance(badSaved,ownBinding,characters,{})).toThrow(/invalid-provenance-data/);
  expect(gets).toBe(0);expect(traps).toBe(0);
 });
 it('replays ordinary JSON only against the actual default reading and independent expected name',()=>{
  const characters=[maple()],proof=module.captureNameProvenance(ownBinding,characters,{});
  expect(module.verifyNameProvenance(JSON.parse(JSON.stringify(proof)),ownBinding,characters,{})).toEqual(proof);
  expect(()=>module.verifyNameProvenance(proof,{...ownBinding,givenName:'川'},characters,{})).toThrow(/name-outside-projected-pool/);
  expect(()=>module.verifyNameProvenance(proof,{...ownBinding,candidateId:'different'},characters,{})).toThrow(/provenance-replay-mismatch/);
  const wrong=[{...characters[0],pinyin:'fèng',sourceId:'fabricated-source'}];expect(()=>module.captureNameProvenance(ownBinding,wrong,{})).toThrow(/generation-character-identity-mismatch/);expect(()=>module.verifyNameProvenance(proof,ownBinding,wrong,{})).toThrow(/generation-character-identity-mismatch/);
 });
 it.each([...general,...conditional])('still generates approved %s from one owned source snapshot',char=>{
  const f=fixture(),characters=JSON.parse(JSON.stringify(f.characters)) as CharacterEntry[],before=JSON.stringify(characters),selected=themes[char]?{[char]:themes[char]}:{},projection=module.project(characters,selected),decision=projection.decisions.find(row=>row.char===char)!;
  const result=module.generateLocal(characters,selected,f.version,f.context,f.profile,{...f.preferences,requiredChars:char,preferredElements:[...decision.effectiveElements]},f.analysis,[],7),candidate=result.candidates.find(row=>row.givenName===char)!;
  expect(candidate.characters[0].elements).toEqual(decision.effectiveElements);expect(JSON.stringify(characters)).toBe(before);
  const proof=result.provenance.find(row=>row.binding.candidateId===candidate.id)!;expect(proof.rows[0].pinyin).toBe(candidate.characters[0].pinyin);expect(proof.rows[0].mapping!.requestedTheme).toBe(themes[char]??null);expect(module.verifyNameProvenance(JSON.parse(JSON.stringify(proof)),{candidateId:candidate.id,givenName:char},characters,selected)).toEqual(proof);
  if(themes[char])expect(module.project(characters).decisions.find(row=>row.char===char)).toMatchObject({status:'theme-required',effectiveElements:[]});
 });
});
