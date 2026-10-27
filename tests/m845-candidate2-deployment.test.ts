import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {afterAll,beforeAll,expect,it} from 'vitest';
import {ensureCandidate2NamingDependency} from '../scripts/build-candidate2-naming-dependency-v1.mjs';
import applicationPins from '../src/main/project-application-v132-r2-pins.json';
import enginePins from '../src/main/bazi-root-feedback-v132-r2-pins.json';

const root=process.cwd(),parent=path.resolve(root,'.local/m845-dependency-tests');fs.mkdirSync(parent,{recursive:true});
const owned=fs.mkdtempSync(path.join(parent,'case-')),fixed=path.join(owned,'fixed-root');
const hash=(value:Uint8Array)=>createHash('sha256').update(value).digest('hex');
let protectedFiles:string[]=[];
function write(relative:string,bytes:Uint8Array){const target=path.resolve(fixed,relative);if(!target.startsWith(path.resolve(fixed)+path.sep))throw Error('bad owned fixture path');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);}
function sourceInventory(){return protectedFiles.map(file=>({file,sha256:hash(fs.readFileSync(path.join(fixed,file)))}));}
function evidence(name:string,value:unknown){const dir=process.env.M845_EVIDENCE_DIR;if(!dir)return;fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,name+'.json');fs.writeFileSync(file+'.tmp',JSON.stringify(value,null,2)+'\n');fs.renameSync(file+'.tmp',file);}
beforeAll(()=>{
 const copied=new Set<string>();
 for(const row of [...applicationPins.closure.files,...enginePins.closure.files]){
  if(copied.has(row.sourcePath))continue;const bytes=fs.readFileSync(path.join(root,row.sourcePath));expect(hash(bytes)).toBe(row.sha256);write(row.sourcePath,bytes);copied.add(row.sourcePath);
 }
 for(const pin of ['src/main/project-application-v132-r2-pins.json','src/main/bazi-root-feedback-v132-r2-pins.json']){write(pin,fs.readFileSync(path.join(root,pin)));copied.add(pin);}
 for(const relative of ['assets/bazi-root-feedback/1.3.2-r2','assets/project-naming-application/1.3.2-candidate.2']){
  const manifest=JSON.parse(fs.readFileSync(path.join(root,relative,'resource-manifest.json'),'utf8')) as {files:{path:string;bytes:number;sha256:string}[]};
  for(const file of ['resource-manifest.json',...manifest.files.map(row=>row.path)]){const source=relative+'/'+file;write(source,fs.readFileSync(path.join(root,source)));copied.add(source);}
 }
 protectedFiles=[...copied].sort();
});
afterAll(()=>{const target=path.resolve(owned);if(path.dirname(target)!==parent||!path.basename(target).startsWith('case-'))throw Error('unsafe owned deployment cleanup');fs.rmSync(target,{recursive:true,force:true});});

it('cold-builds the official pair at the normal candidate.2 deployment path and verifies it warm',async()=>{
 const before=sourceInventory(),first=ensureCandidate2NamingDependency({root:fixed}),concurrent=ensureCandidate2NamingDependency({root:fixed});
 expect(first).toBe(concurrent);
 const built=await first;expect(built.status).toBe('built');
 expect(built.bundlePath).toBe(path.join(fixed,'dist-electron/project-naming-application/1.3.2-candidate.2/application.cjs'));
 expect(built.receiptPath).toBe(built.bundlePath+'.receipt.json');
 expect(built.output.sha256).toBe('906b191c88ce2e6f0335c674727c39bcae14edf2968d2c1c5cdffcb04079b47a');
 expect(hash(fs.readFileSync(built.bundlePath))).toBe(built.output.sha256);
 const times=[fs.statSync(built.bundlePath).mtimeMs,fs.statSync(built.receiptPath).mtimeMs];
 const warm=await ensureCandidate2NamingDependency({root:fixed});expect(warm.status).toBe('verified-existing');expect(warm.identity).toEqual(built.identity);
 expect([fs.statSync(built.bundlePath).mtimeMs,fs.statSync(built.receiptPath).mtimeMs]).toEqual(times);
 expect(sourceInventory()).toEqual(before);
 evidence('deployment-cold-warm',{status:built.status,warm:warm.status,output:built.output,bundlePath:'dist-electron/project-naming-application/1.3.2-candidate.2/application.cjs',receiptPath:'dist-electron/project-naming-application/1.3.2-candidate.2/application.cjs.receipt.json',identity:built.identity,sharedColdPromise:true,warmDidNotRewrite:true,protectedInputsUnchanged:true,protectedFiles:before.length,pairAtomicClaim:false});
},30000);

it('preserves and rejects incomplete or corrupted output pairs and permits exact restoration',async()=>{
 const warm=await ensureCandidate2NamingDependency({root:fixed}),original=fs.readFileSync(warm.receiptPath),bundle=fs.readFileSync(warm.bundlePath),parked=warm.receiptPath+'.owned-preserved';
 fs.renameSync(warm.receiptPath,parked);
 try{await expect(ensureCandidate2NamingDependency({root:fixed})).rejects.toThrow('PAIR_INCOMPLETE');expect(fs.readFileSync(warm.bundlePath)).toEqual(bundle);}finally{fs.renameSync(parked,warm.receiptPath);}
 const changed=Buffer.from(bundle);changed[0]^=1;fs.writeFileSync(warm.bundlePath,changed);
 try{await expect(ensureCandidate2NamingDependency({root:fixed})).rejects.toThrow('OUTPUT_MISMATCH');expect(fs.readFileSync(warm.bundlePath)).toEqual(changed);expect(fs.readFileSync(warm.receiptPath)).toEqual(original);}finally{fs.writeFileSync(warm.bundlePath,bundle);}
 expect((await ensureCandidate2NamingDependency({root:fixed})).status).toBe('verified-existing');
},30000);

it('rejects output directory junctions or external/sensitive paths before touching sources',async()=>{
 const before=sourceInventory(),alias=path.join(fixed,'linked-output');
 fs.symlinkSync(path.join(fixed,'assets'),alias,'junction');
 await expect(ensureCandidate2NamingDependency({root:fixed,outDir:'linked-output'})).rejects.toThrow('PATH_INVALID');
 await expect(ensureCandidate2NamingDependency({root:fixed,outDir:'assets/new-output'})).rejects.toThrow('PATH_INVALID');
 await expect(ensureCandidate2NamingDependency({root:fixed,outDir:path.join(owned,'outside')})).rejects.toThrow('PATH_INVALID');
 expect(sourceInventory()).toEqual(before);expect(fs.existsSync(path.join(fixed,'assets/project-naming-application/1.3.2-candidate.2/application.cjs'))).toBe(false);
});

it('checks the published fixed source identity on warm output and rejects changed publication bytes',async()=>{
 const warm=await ensureCandidate2NamingDependency({root:fixed}),source=path.join(fixed,'assets/project-naming-application/1.3.2-candidate.2/execution-source/src/main/project-application-v132-r2.ts'),original=fs.readFileSync(source),output=fs.readFileSync(warm.bundlePath);
 try{fs.appendFileSync(source,'\n ');await expect(ensureCandidate2NamingDependency({root:fixed})).rejects.toThrow('SOURCES_INVALID');expect(fs.readFileSync(warm.bundlePath)).toEqual(output);}finally{fs.writeFileSync(source,original);}
 expect((await ensureCandidate2NamingDependency({root:fixed})).status).toBe('verified-existing');
},30000);

it('builds the exact fixed output independently of later host package and engine sources',async()=>{
 const engineSource=enginePins.closure.files.find(row=>row.sourcePath.startsWith('src/domain/')&&row.sourcePath.endsWith('.ts'));
 if(!engineSource)throw Error('owned host engine fixture missing');
 const relative=['package.json','src/main/project-application-v132-r2.ts',engineSource.sourcePath];
 const originals=relative.map(file=>({file,bytes:fs.readFileSync(path.join(fixed,file))}));
 try{
  const pkg=JSON.parse(originals[0].bytes.toString('utf8'));pkg.version='1.0.39';write('package.json',Buffer.from(JSON.stringify(pkg,null,2)+'\n'));
  for(const file of relative.slice(1))fs.appendFileSync(path.join(fixed,file),'\nthrow new Error("owned changed host input must not be compiled");\n');
  const built=await ensureCandidate2NamingDependency({root:fixed,outDir:'dist-electron/host-independent-case'});
  expect(built.status).toBe('built');expect(built.output.sha256).toBe('906b191c88ce2e6f0335c674727c39bcae14edf2968d2c1c5cdffcb04079b47a');
  expect(JSON.parse(fs.readFileSync(path.join(fixed,'package.json'),'utf8')).version).toBe('1.0.39');
  for(const file of relative.slice(1))expect(fs.readFileSync(path.join(fixed,file),'utf8')).toContain('owned changed host input must not be compiled');
  evidence('deployment-host-independence',{status:built.status,output:built.output,hostPackageVersion:'1.0.39',ignoredChangedHostSources:relative.slice(1),hostBytesPreserved:true});
 }finally{for(const original of originals)write(original.file,original.bytes);}
},30000);
