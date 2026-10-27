import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildSync} from 'esbuild';
import {loadReviewedNamingDataResources,isAuthenticatedReviewedNamingDataResources,refreshReviewedNamingDataResources} from '../src/main/reviewed-naming-data-resources';
import type {ReviewedNamingDataResources} from '../src/main/reviewed-naming-data-resources';
import {loadNamingSemanticAdmissionV72,semanticAdmissionDatasetV72,NAMING_V72_FIXED_PINS} from '../src/main/naming-semantic-admission-v72-data';
import {assessNamingSemanticAdmission} from '../src/domain/naming-semantic-admission-v72';
import {REVIEWED_DATA_SOURCE_IDS} from '../src/shared/reviewed-naming-data';
import type {M754ObjectTheme} from '../src/shared/m754-element-imagery';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const publication='assets/reviewed-naming-data/1.0.0';
const imageryPublication='assets/project-element-imagery/1.0.0';
const hash=(bytes:crypto.BinaryLike)=>crypto.createHash('sha256').update(bytes).digest('hex');
const workspace=path.join(root,'.local/m781-resources');
const temporary:string[]=[];
const results:Record<string,unknown>[]=[];
const record=(kind:string,value:unknown)=>{results.push({kind,value});fs.mkdirSync(workspace,{recursive:true});const file=path.join(workspace,'actual-results.json'),next=file+'.tmp';fs.writeFileSync(next,JSON.stringify(results,null,2)+'\n');fs.renameSync(next,file);};
function portableCopy():string {
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'m781-resources-'));temporary.push(directory);
 for(const relative of [publication,imageryPublication])fs.cpSync(path.join(root,relative),path.join(directory,relative),{recursive:true});
 return directory;
}
function frozen(value:unknown):boolean {
 return value===null||typeof value!=='object'||Object.isFrozen(value)&&Object.values(value).every(frozen);
}
let resources:ReviewedNamingDataResources;
beforeAll(()=>{resources=loadReviewedNamingDataResources(root);},45000);
afterAll(()=>{for(const directory of temporary)if(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep))fs.rmSync(directory,{recursive:true,force:true});});

describe('fixed reviewed naming resources',()=>{
 it('loads nine independent semantic decisions, ten imagery mappings and the exact reviewed sixty-character source',()=>{
  const dataset=semanticAdmissionDatasetV72(resources.semantic);
  const admitted=resources.semantic.publication.records.filter(row=>row.decision==='allow-single-character-generation');
  expect(admitted).toHaveLength(9);
  for(const row of admitted){
   const entry=dataset.characters.find(entry=>entry.char===row.identity.char)!;
   const themeIds=row.usage.mode==='explicit-themes'?row.usage.anyOf:[];
   expect(assessNamingSemanticAdmission(resources.semantic,entry,{stage:'local',requestedGivenNameLength:2,namePart:'given-name',themeIds})).toMatchObject({status:'eligible',scoreDelta:0,wholeNameMeaning:null});
  }
  expect(dataset.characters).toEqual(resources.imagery.baselineCharacters());
  const projected=resources.imagery.project(dataset.characters),themes=Object.fromEntries(projected.decisions.filter(row=>row.requiredTheme).map(row=>[row.char,row.requiredTheme])) as Record<string,M754ObjectTheme>;
  expect(projected.decisions.filter(row=>row.status==='eligible')).toHaveLength(5);
  expect(resources.imagery.project(dataset.characters,themes).decisions.filter(row=>row.status==='eligible')).toHaveLength(10);
  expect(resources.identity.sourceEvidence.editorialV71.profileSha256).toBe('2c4be917bbfcdc3fec9279b2d9d928f5215e6ee1386d60e7d62265cd8e3eb2d1');
  const legacy=resources.sourceRecords.find(row=>row.id==='naming-character-meanings-v7.1-fixed')!;
  expect(legacy.files).toContain('data/naming-character-meanings-v71-m460-b02-root-decision.json');
  expect(resources.sourceRecords.filter(row=>(REVIEWED_DATA_SOURCE_IDS as readonly string[]).includes(row.id)).map(row=>row.id).sort()).toEqual([...REVIEWED_DATA_SOURCE_IDS].sort());
  for(const source of resources.imagery.sourceRecords)expect(resources.sourceRecords.find(row=>row.id===source.id)).toEqual(source);
  expect(resources.identity.semantic.policySha256).toBe(NAMING_V72_FIXED_PINS.policyManifest);
  expect(resources.identity.sourceEvidence.m751.reviewStatus).toBe('candidate-not-independently-reviewed');
  expect(frozen(resources)).toBe(true);expect(isAuthenticatedReviewedNamingDataResources(resources)).toBe(true);
  record('fixed-resource-counts',{semantic:admitted.length,imagery:10,reviewedCharacterNotes:60,sourceIds:resources.sourceRecords.map(row=>row.id),manifestSha256:resources.identity.manifestSha256});
 });
 it('preserves all original M740/M752 pins and manual/candidate flags while using their separate authority',()=>{
  const m740=path.join(root,publication,'originals/m740'),delivery=JSON.parse(fs.readFileSync(path.join(m740,'M740-MANIFEST.json'),'utf8'));
  const m752=path.join(root,publication,'originals/m752-r2'),policy=JSON.parse(fs.readFileSync(path.join(m752,'manifest.json'),'utf8'));
  expect(delivery.files).toHaveLength(21);expect(policy.files).toHaveLength(12);
  for(const [directory,manifest] of [[m740,delivery],[m752,policy]] as const)for(const pin of manifest.files){const bytes=fs.readFileSync(path.join(directory,pin.file));expect(bytes.length).toBe(pin.bytes);expect(hash(bytes)).toBe(pin.sha256);}
  const profile=JSON.parse(fs.readFileSync(path.join(m740,'data/profile.json'),'utf8'));
  expect(profile.generationAuthority).toBe(false);expect(profile.activation).toBe('off');
  expect(hash(fs.readFileSync(path.join(m740,'M740-MANIFEST.json')))).toBe(NAMING_V72_FIXED_PINS.m740Delivery);
  expect(hash(fs.readFileSync(path.join(m752,'manifest.json')))).toBe(NAMING_V72_FIXED_PINS.policyManifest);
  for(const relative of ['manifest.json','originals/m740/data/manifest.json','originals/m751-consumer/src/main/naming-semantic-admission-v72-data.ts']){
   const file=publication+'/'+relative,raw=execFileSync('git',['hash-object','--no-filters','--',file],{cwd:root,encoding:'utf8'}).trim();
   const filtered=execFileSync('git',['-c','core.autocrlf=true','hash-object','--path='+file,'--',file],{cwd:root,encoding:'utf8'}).trim();
   expect(filtered).toBe(raw);
  }
 });
 it('rejects extra arguments, DTO roots, inherited configuration and self-reported authority',()=>{
  const factory=loadReviewedNamingDataResources as (...args:unknown[])=>unknown;
  expect(()=>factory(root,{approved:true,skipValidation:true})).toThrow(/invalid-factory-configuration/);
  expect(()=>factory({applicationRoot:root,manifestSha256:resources.identity.manifestSha256})).toThrow(/invalid-factory-configuration/);
  expect(()=>factory(new String(root))).toThrow(/invalid-factory-configuration/);
  expect(isAuthenticatedReviewedNamingDataResources({...resources})).toBe(false);
  expect(()=>refreshReviewedNamingDataResources({...resources})).toThrow(/main-authenticated/);
  const configuration={decisionRoot:'unused',m740Root:'unused',sourceDataDir:'unused',m744AuditPath:'unused'};
  expect(()=>loadNamingSemanticAdmissionV72({...configuration,sourceRoots:{unknown:'unused'}} as never)).toThrow(/unknown field/);
  expect(()=>loadNamingSemanticAdmissionV72({...configuration,sourceRoots:{m690:{sha256:'self-reported'}}} as never)).toThrow(/literal source root/);
  let invoked=0;
  const roots=Object.defineProperty({},'m690',{enumerable:true,get(){invoked++;return 'unused';}});
  expect(()=>loadNamingSemanticAdmissionV72({...configuration,sourceRoots:roots})).toThrow(/own enumerable data field/);expect(invoked).toBe(0);
 });
 it('fails closed for changed manifest, changed source, absent source and corrupted separate M779 data',()=>{
  const directory=portableCopy();
  const manifest=path.join(directory,publication,'manifest.json'),manifestBytes=fs.readFileSync(manifest);
  fs.writeFileSync(manifest,Buffer.concat([manifestBytes,Buffer.from('\n')]));
  expect(()=>loadReviewedNamingDataResources(directory)).toThrow(/publication-manifest-mismatch/);fs.writeFileSync(manifest,manifestBytes);
  const source=path.join(directory,publication,'upstream/m690/selection.json'),sourceBytes=fs.readFileSync(source);
  fs.writeFileSync(source,Buffer.concat([sourceBytes,Buffer.from(' ')]));
  expect(()=>loadReviewedNamingDataResources(directory)).toThrow(/publication-file-mismatch/);fs.writeFileSync(source,sourceBytes);
  const pack=path.join(directory,publication,'product/data/knowledge-v6.sqlite'),packBytes=fs.readFileSync(pack);fs.unlinkSync(pack);
  expect(()=>loadReviewedNamingDataResources(directory)).toThrow(/ENOENT/);fs.writeFileSync(pack,packBytes);
  const imagery=path.join(directory,imageryPublication,'data/element-imagery-m754/dictionary-facts.json'),imageryBytes=fs.readFileSync(imagery);
  fs.writeFileSync(imagery,Buffer.concat([imageryBytes,Buffer.from(' ')]));
  expect(()=>loadReviewedNamingDataResources(directory)).toThrow(/M779 publication-file-mismatch/);
  record('corruption-rejections',{manifest:true,upstreamSource:true,missingPack:true,separateImagery:true});
 },45000);
 it('revalidates actual bytes after a previously authenticated handle was issued',()=>{
  const directory=portableCopy(),owned=loadReviewedNamingDataResources(directory);
  const source=path.join(directory,publication,'product/data/naming-character-meanings-v71-m460-b02-root-decision.json');
  fs.appendFileSync(source,' ');
  expect(()=>refreshReviewedNamingDataResources(owned)).toThrow(/publication-file-mismatch/);
  record('refresh-byte-revalidation',{changedReviewedSixtyDecisionRejected:true});
 },45000);
 it('reuses only the private parsed imagery capsule while every warm refresh reads and hashes all 139 original files',()=>{
  const required=[publication,imageryPublication].flatMap(base=>{
   const manifest=JSON.parse(fs.readFileSync(path.join(root,base,'manifest.json'),'utf8'));
   return [base+'/manifest.json',...manifest.files.map((row:{path:string})=>base+'/'+row.path)];
  });
  const read=fs.readFileSync.bind(fs),createHash=crypto.createHash.bind(crypto),parse=JSON.parse.bind(JSON);
  const reads=new Set<string>(),hashes=new Set<string>(),buffers=new WeakMap<object,string>();let largeDictionaryParses=0;
  const readSpy=vi.spyOn(fs,'readFileSync').mockImplementation(((file:fs.PathOrFileDescriptor,...options:unknown[])=>{
   const bytes=(read as Function)(file,...options);
   if(typeof file==='string'&&Buffer.isBuffer(bytes)){const relative=path.relative(root,file).replaceAll('\\','/');buffers.set(bytes,relative);reads.add(relative);}
   return bytes;
  }) as typeof fs.readFileSync);
  const hashSpy=vi.spyOn(crypto,'createHash').mockImplementation((...args:Parameters<typeof crypto.createHash>)=>{
   const digest=createHash(...args),update=digest.update.bind(digest);
   digest.update=((bytes:crypto.BinaryLike,...encoding:unknown[])=>{const file=bytes&&typeof bytes==='object'?buffers.get(bytes):undefined;if(args[0]==='sha256'&&file)hashes.add(file);return (update as Function)(bytes,...encoding);}) as typeof digest.update;
   return digest;
  });
  const inflateSpy=vi.spyOn(zlib,'gunzipSync');
  const parseSpy=vi.spyOn(JSON,'parse').mockImplementation((...args:Parameters<typeof JSON.parse>)=>{if(typeof args[0]==='string'&&args[0].length>40_000_000)largeDictionaryParses++;return parse(...args);});
  try{
   const warm=refreshReviewedNamingDataResources(resources);
   expect(warm).not.toBe(resources);expect(warm.semantic).not.toBe(resources.semantic);expect(warm.imagery).toBe(resources.imagery);
   expect(required).toHaveLength(139);expect(required.filter(file=>!reads.has(file))).toEqual([]);expect(required.filter(file=>!hashes.has(file))).toEqual([]);
   expect(inflateSpy).not.toHaveBeenCalled();expect(largeDictionaryParses).toBe(0);
   record('warm-private-capsule',{freshResourceCapability:true,freshSemanticCapability:true,samePrivateImageryCapsule:true,requiredFiles:required.length,readFiles:required.filter(file=>reads.has(file)).length,sha256CheckedFiles:required.filter(file=>hashes.has(file)).length,largeDictionaryParses});
  }finally{readSpy.mockRestore();hashSpy.mockRestore();inflateSpy.mockRestore();parseSpy.mockRestore();}
 },45000);
 it('rejects changed M779 manifest, original source and missing source on an already warm private capsule',()=>{
  const directory=portableCopy(),owned=loadReviewedNamingDataResources(directory);
  const manifest=path.join(directory,imageryPublication,'manifest.json'),manifestBytes=fs.readFileSync(manifest);
  fs.appendFileSync(manifest,' ');expect(()=>refreshReviewedNamingDataResources(owned)).toThrow(/imagery-publication-manifest-mismatch/);fs.writeFileSync(manifest,manifestBytes);
  const source=path.join(directory,imageryPublication,'data/raw/kMandarin.txt'),sourceBytes=fs.readFileSync(source);
  const altered=Buffer.from(sourceBytes);altered[0]^=1;fs.writeFileSync(source,altered);
  expect(()=>refreshReviewedNamingDataResources(owned)).toThrow(/imagery-publication-file-mismatch/);fs.writeFileSync(source,sourceBytes);
  fs.unlinkSync(source);expect(()=>refreshReviewedNamingDataResources(owned)).toThrow(/ENOENT/);fs.writeFileSync(source,sourceBytes);
  expect(refreshReviewedNamingDataResources(owned).imagery).toBe(owned.imagery);
  record('warm-original-m779-corruption',{manifestRejected:true,sameLengthSourceMutationRejected:true,missingSourceRejected:true,restoredSourceRevalidated:true});
 },45000);
 it('rejects an escaping source junction and gives private-looking fake handles no cache authority',()=>{
  const directory=portableCopy(),owned=loadReviewedNamingDataResources(directory);
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),'m781-external-source-'));temporary.push(outside);
  const raw=path.join(directory,imageryPublication,'data/raw'),retained=raw+'-original';fs.cpSync(raw,outside,{recursive:true});fs.renameSync(raw,retained);let linked=false;
  try{
   fs.symlinkSync(outside,raw,process.platform==='win32'?'junction':'dir');linked=true;
   expect(()=>refreshReviewedNamingDataResources(owned)).toThrow(/imagery-publication-file-escape/);
  }finally{if(linked){if(process.platform==='win32')fs.rmdirSync(raw);else fs.unlinkSync(raw);}fs.renameSync(retained,raw);}
  let getters=0,traps=0;
  const accessor=Object.defineProperty({...owned},'identity',{enumerable:true,get(){getters++;return owned.identity;}});
  const proxy=new Proxy(owned,{get(){traps++;throw Error('must not execute');},getPrototypeOf(){traps++;throw Error('must not execute');}});
  for(const fake of [{...owned},Object.freeze({...owned}),accessor,proxy]){
   expect(isAuthenticatedReviewedNamingDataResources(fake)).toBe(false);
   expect(()=>refreshReviewedNamingDataResources(fake as ReviewedNamingDataResources)).toThrow(/main-authenticated/);
  }
  expect(getters).toBe(0);expect(traps).toBe(0);
  record('warm-private-cache-boundary',{escapingJunctionRejected:true,fakeHandlesRejected:4,getters,traps});
 },45000);
 it('moves complete application assets and runs the bundled factory while blocking every external filesystem read',()=>{
  const staging=portableCopy(),parent=fs.mkdtempSync(path.join(os.tmpdir(),'m781-resources-moved-'));temporary.push(parent);
  const moved=path.join(parent,'renamed-application');fs.renameSync(staging,moved);
  const probe=path.join(workspace,'portable-resource-probe.ts'),bundle=path.join(moved,'probe.cjs');
  fs.mkdirSync(workspace,{recursive:true});
  fs.writeFileSync(probe,`
import fs from 'node:fs';
import path from 'node:path';
import {loadReviewedNamingDataResources} from ${JSON.stringify(path.join(root,'src/main/reviewed-naming-data-resources').replaceAll('\\','/'))};
import {semanticAdmissionDatasetV72} from ${JSON.stringify(path.join(root,'src/main/naming-semantic-admission-v72-data').replaceAll('\\','/'))};
const applicationRoot=path.resolve(process.argv[2]),denied:string[]=[],reads:string[]=[];
for(const operation of ['readFileSync','realpathSync','statSync','lstatSync'] as const){
 const original=(fs[operation] as Function).bind(fs);
 (fs as any)[operation]=function(file:unknown,...args:unknown[]){
  if(typeof file==='string'){const target=path.resolve(file);if(target!==applicationRoot&&!target.startsWith(applicationRoot+path.sep)){denied.push(target);throw Error('external filesystem read: '+target);}reads.push(target);}
  return original(file,...args);
 };
}
process.env.REVIEWED_NAMING_DATA_ROOT='Z:/invalid-development-override';
const resources=loadReviewedNamingDataResources(applicationRoot),dataset=semanticAdmissionDatasetV72(resources.semantic),projection=resources.imagery.project(dataset.characters),themes=Object.fromEntries(projection.decisions.filter(row=>row.requiredTheme).map(row=>[row.char,row.requiredTheme]));
const result={portable:true,developmentDataPresent:fs.existsSync(path.join(applicationRoot,'data')),developmentSourcePresent:fs.existsSync(path.join(applicationRoot,'src')),nodeModulesPresent:fs.existsSync(path.join(applicationRoot,'node_modules')),semantic:resources.semantic.publication.records.filter(row=>row.decision==='allow-single-character-generation').length,imagery:resources.imagery.project(dataset.characters,themes).decisions.filter(row=>row.status==='eligible').length,reviewedCharacterNotes:JSON.parse(fs.readFileSync(path.join(resources.dataDir,'naming-character-meanings-v71-m460-b02-profile.json'),'utf8')).cases.length,denied,reads:reads.length,publication:resources.identity.publicationId,originalPathsRemainMetadata:fs.readFileSync(path.join(applicationRoot,${JSON.stringify(publication)},'originals/m740/data/manifest.json'),'utf8').includes('m587-product-integration')};
console.log(JSON.stringify(result));
`);
  buildSync({entryPoints:[probe],bundle:true,platform:'node',format:'cjs',target:'node22',outfile:bundle,logLevel:'silent'});
  const result=JSON.parse(execFileSync(process.execPath,[bundle,moved],{cwd:moved,encoding:'utf8',timeout:60000,maxBuffer:1024*1024}));
  expect(result).toMatchObject({portable:true,developmentDataPresent:false,developmentSourcePresent:false,nodeModulesPresent:false,semantic:9,imagery:10,reviewedCharacterNotes:60,denied:[],publication:'reviewed-naming-data/1.0.0',originalPathsRemainMetadata:true});
  expect(result.reads).toBeGreaterThan(100);record('portable-moved-application',result);
 },90000);
});
