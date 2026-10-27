import {afterAll,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {buildProjectApplicationV132} from '../scripts/build-project-application-v132.mjs';
import fixture from './fixtures/project-naming-use-m153.json';

const root=process.cwd();
const application='assets/project-naming-application/1.3.2-candidate.1/';
const engine='assets/bazi-root-feedback/1.3.2-r2/';
const applicationPinsPath='src/main/project-application-v132-pins.json';
const enginePinsPath='src/main/bazi-root-feedback-v132-r2-pins.json';
const index=new Map(execFileSync('git',['ls-files','--stage','-z'],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024}).split('\0').filter(Boolean).map(row=>{
 const match=/^\d+ ([a-f0-9]+) 0\t([\s\S]+)$/.exec(row);if(!match)throw Error('Unexpected unmerged Git index entry');return[match[2],match[1]];
}));
const tracked=new Set(index.keys());
const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const blobs=new Map<string,Buffer>();
function indexBytes(file:string):Buffer {
 const id=index.get(file);if(!id)throw Error('Missing Git payload '+file);
 const bytes=blobs.get(id);if(bytes)return bytes;
 const loaded=execFileSync('git',['cat-file','blob',id],{cwd:root,maxBuffer:8*1024*1024});blobs.set(id,loaded);return loaded;
}
const indexJson=(file:string)=>JSON.parse(indexBytes(file).toString('utf8'));
// Fetch fixed Git objects in one process. This avoids a process per resource
// while still reconstructing every published byte from the captured index.
const wanted=new Set<string>([applicationPinsPath,enginePinsPath]);
for(const publication of [application,engine]){wanted.add(publication+'resource-manifest.json');for(const row of indexJson(publication+'resource-manifest.json').files)wanted.add(publication+row.path);}
for(const file of [applicationPinsPath,enginePinsPath])for(const row of indexJson(file).closure.files)wanted.add(row.sourcePath.startsWith('node_modules/')?application+'execution-source/'+row.sourcePath:row.sourcePath);
const wantedIds=[...new Set([...wanted].map(file=>index.get(file)).filter((id):id is string=>id!==undefined))].filter(id=>!blobs.has(id));
const batch=execFileSync('git',['cat-file','--batch'],{cwd:root,input:wantedIds.join('\n')+'\n',maxBuffer:64*1024*1024});
let offset=0;
for(const id of wantedIds){const newline=batch.indexOf(10,offset),header=batch.subarray(offset,newline).toString('utf8'),match=/^([a-f0-9]+) blob (\d+)$/.exec(header);if(!match||match[1]!==id)throw Error('Unexpected Git blob batch response: '+header);const length=Number(match[2]);offset=newline+1;blobs.set(id,batch.subarray(offset,offset+length));offset+=length;if(batch[offset++]!==10)throw Error('Malformed Git blob boundary');}
const owned:string[]=[];
function outputEvidence(name:string,value:unknown):void {
 const directory=process.env.M753_PAYLOAD_EVIDENCE_DIR;if(!directory)return;
 fs.mkdirSync(directory,{recursive:true});const file=path.join(directory,name+'.json'),temporary=file+'.tmp';
 fs.writeFileSync(temporary,JSON.stringify(value,null,2)+'\n');fs.renameSync(temporary,file);
}
function writeOwned(base:string,file:string,bytes:Uint8Array):void {
 const target=path.resolve(base,file),resolved=path.resolve(base);
 if(!target.startsWith(resolved+path.sep))throw Error('Invalid owned checkout path: '+file);
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
}
afterAll(()=>{
 for(const directory of owned){const resolved=path.resolve(directory),parent=path.resolve(root,'.local/m753-payload-checkout');if(path.dirname(resolved)!==parent||!path.basename(resolved).startsWith('case-'))throw Error('Unsafe owned checkout cleanup');fs.rmSync(resolved,{recursive:true,force:true});}
});

it('tracks every application and r2 manifest resource with the exact declared Git blob bytes',()=>{
 const summaries=[];
 for(const publication of [application,engine]){
  const manifest=indexJson(publication+'resource-manifest.json');
  const missing=manifest.files.map((row:{path:string})=>publication+row.path).filter((file:string)=>!tracked.has(file));
  expect(missing,'Every declared resource must survive a Git-only checkout; ignored physical files do not count.').toEqual([]);
  const rows=manifest.files.map((row:{path:string;bytes:number;sha256:string})=>{
   const file=publication+row.path,bytes=indexBytes(file),sha256=digest(bytes);
   expect({bytes:bytes.length,sha256},file).toEqual({bytes:row.bytes,sha256:row.sha256});
   return{path:file,bytes:bytes.length,sha256};
  });
  summaries.push({publication,declared:rows.length,tracked:rows.length,manifestSha256:digest(indexBytes(publication+'resource-manifest.json')),fullClosureSha256:manifest.fullClosureSha256,rows});
 }
 outputEvidence('git-resource-ownership',{allTracked:true,allGitBlobsMatch:true,publications:summaries});
});

it('builds from Git-only owned inputs and runs positive generation and fixed saved replay without checkout sources',async()=>{
 const parent=path.resolve(root,'.local/m753-payload-checkout');fs.mkdirSync(parent,{recursive:true});
 const scratch=fs.mkdtempSync(path.join(parent,'case-'));owned.push(scratch);
 const checkout=path.join(scratch,'git-only'),portable=path.join(scratch,'portable');
 fs.mkdirSync(checkout,{recursive:true});fs.mkdirSync(portable,{recursive:true});
 const appPins=indexJson(applicationPinsPath),r2Pins=indexJson(enginePinsPath);
 const sources=new Map<string,{sourcePath:string;bytes:number;sha256:string}>();
 for(const row of [...appPins.closure.files,...r2Pins.closure.files]){
  const previous=sources.get(row.sourcePath);if(previous)expect({bytes:previous.bytes,sha256:previous.sha256}).toEqual({bytes:row.bytes,sha256:row.sha256});sources.set(row.sourcePath,row);
 }
 let gitSourceCount=0,gitVendorCount=0;
 for(const row of sources.values()){
  // Even compiler vendor inputs are recovered from committed publication
  // blobs. No ignored working-directory payload supplies the fresh checkout.
  const vendor=row.sourcePath.startsWith('node_modules/');
  const source=vendor?application+'execution-source/'+row.sourcePath:row.sourcePath;
  expect(tracked.has(source),'Missing Git source '+source).toBe(true);
  const bytes=indexBytes(source);
  expect({bytes:bytes.length,sha256:digest(bytes)},row.sourcePath).toEqual({bytes:row.bytes,sha256:row.sha256});
  writeOwned(checkout,row.sourcePath,bytes);if(vendor)gitVendorCount++;else gitSourceCount++;
 }
 for(const file of [applicationPinsPath,enginePinsPath])writeOwned(checkout,file,indexBytes(file));
 for(const publication of [application,engine]){
  const manifest=indexJson(publication+'resource-manifest.json');
  for(const file of ['resource-manifest.json',...manifest.files.map((row:{path:string})=>row.path)]){
   const source=publication+file;expect(tracked.has(source),'Missing published Git payload '+source).toBe(true);
   const bytes=indexBytes(source);writeOwned(checkout,source,bytes);writeOwned(portable,source,bytes);
  }
 }
 const outfile=path.join(portable,'project-application.cjs');
 const receipt=await buildProjectApplicationV132({root:checkout,outfile});
 expect(receipt.identity.fullClosureSha256).toBe(appPins.fullClosureSha256);expect(receipt.identity.manifestSha256).toBe(appPins.manifestSha256);
 expect(receipt.identity.engine.fullClosureSha256).toBe(r2Pins.fullClosureSha256);expect(receipt.identity.engine.manifestSha256).toBe(r2Pins.manifestSha256);
 expect(receipt.output.sha256).toBe('6372255d299d87bd0a66befc071634b275cd60897edc3a8381e7fb9e800fbba5');
 expect(fs.existsSync(path.join(portable,'src'))).toBe(false);expect(fs.existsSync(path.join(portable,'node_modules'))).toBe(false);
 const script=`const fs=require('node:fs'),path=require('node:path'),api=require('./project-application.cjs');
 if(fs.existsSync('src')||fs.existsSync('node_modules'))throw Error('checkout sources leaked into portable runtime');
 const adapter=api.createProjectApplicationV132({assetDir:path.resolve('assets')}),positive=adapter.resolve(${JSON.stringify(fixture.positive.profile)},{enabled:true});
 if(positive.status!=='applicable')throw Error(JSON.stringify(positive));
 const naming=adapter.toNamingInput(positive);api.assertProjectApplicationNamingInput(naming);
 const saved=adapter.createSaved(positive),verified=adapter.verifySaved(JSON.parse(JSON.stringify(saved)));
 api.assertProjectApplicationNamingInput(verified.namingInput);
 if(verified.status!=='verified-saved'||verified.namingInput.origin!=='saved-replay')throw Error('saved replay failed');
 const negative=adapter.resolve(${JSON.stringify(fixture.negative.profile)},{enabled:true});if(negative.status==='applicable')throw Error('negative case authorized');
 console.log(JSON.stringify({positive:positive.status,branch:positive.certificate.branch,elements:naming.elements,saved:verified.status,replayOrigin:verified.namingInput.origin,negative:negative.status,engine:positive.certificate.engineIdentity.fullClosureSha256,application:positive.certificate.applicationIdentity.fullClosureSha256}));`;
 const child=spawnSync(process.execPath,['-e',script],{cwd:portable,encoding:'utf8',windowsHide:true,maxBuffer:1024*1024});
 expect(child.status,child.stderr||child.stdout).toBe(0);
 const runtime=JSON.parse(child.stdout);expect(runtime.positive).toBe('applicable');expect(runtime.saved).toBe('verified-saved');expect(runtime.replayOrigin).toBe('saved-replay');
 outputEvidence('git-only-build-and-replay',{gitSourceCount,gitVendorCount,publicationSources:'Git index blobs only, including compiler vendor inputs',identity:receipt.identity,output:receipt.output,runtime,portableCheckoutSourcesPresent:false});
},60000);
