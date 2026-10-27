import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createServer,type Server} from 'node:http';
import {createCmnPreviewProject} from './helpers/cmn-preview-project';
import {copyPreviewInputs} from './helpers/root-feedback-v132-preview-fixture';
import {previewSourceSnapshot} from './helpers/root-feedback-preview-byte-snapshot';
import {createHash} from 'node:crypto';
import {studioDevPlugin} from '../scripts/dev-plugin';
import fixture from './fixtures/project-naming-use-m153.json';
import type {BirthProfile} from '../src/shared/types';
import {canonicalPlainJson} from '../src/shared/plain-json';
import {matchesRootFeedbackV132RequestBinding} from '../src/shared/bazi-root-feedback-v132-request-binding';

const profile=structuredClone(fixture.positive.profile) as BirthProfile;
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'m758-real-http-'));
let project:ReturnType<typeof createCmnPreviewProject>,server:Server|undefined,address='';
const method='previewBaziRootFeedbackV132';
const post=(name:string,args:unknown[],headers:Record<string,string>={})=>fetch(address+'/__studio_api/'+name,{method:'POST',headers:{'Content-Type':'application/json','X-Studio-Local-Request':'1',...headers},body:JSON.stringify(args)});
const disk=()=>fs.readFileSync(path.join(scratch,'user/customers.sqlite'));
const outputDirectory=()=>path.join(project.root,'dist-electron/bazi-root-feedback/1.3.2-r2');
const bundleFile=()=>path.join(outputDirectory(),'root-feedback.cjs');
function clearOwnedPreviewOutput(){
  const target=path.resolve(outputDirectory()),root=fs.realpathSync.native(project.root),temporary=fs.realpathSync.native(os.tmpdir()),relative=path.relative(temporary,root);
  if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative)||!path.basename(root).startsWith('cmn-preview-project-')||target!==path.join(root,'dist-electron/bazi-root-feedback/1.3.2-r2'))throw Error('Unsafe preview output cleanup');
  if(fs.existsSync(target)&&fs.realpathSync.native(target)!==target)throw Error('Linked preview output cleanup');
  fs.rmSync(target,{recursive:true,force:true});
}

beforeAll(async()=>{
  project=createCmnPreviewProject();
  copyPreviewInputs(project.root);
  fs.cpSync(path.resolve('assets/bazi-root-feedback/1.3.1'),path.join(project.root,'assets/bazi-root-feedback/1.3.1'),{recursive:true});
  vi.stubEnv('NAMING_STUDIO_PREVIEW_DATA',path.join(scratch,'user'));
  let middleware:Function|undefined;server=createServer((req,res)=>void middleware!(req,res,()=>{res.statusCode=404;res.end();}));
  const plugin=studioDevPlugin();await(plugin.configureServer as Function)({config:{root:project.root},httpServer:server,middlewares:{use(handler:Function){middleware=handler;}}});
  await new Promise<void>((resolve,reject)=>{server!.once('error',reject);server!.listen(0,'127.0.0.1',resolve);});
  address='http://127.0.0.1:'+(server.address() as {port:number}).port;
},60000);

afterAll(async()=>{
  if(server)await new Promise<void>(resolve=>server!.close(()=>resolve()));
  await new Promise(resolve=>setImmediate(resolve));
  vi.unstubAllEnvs();project?.close();fs.rmSync(scratch,{recursive:true,force:true});
});

describe('M780 real dev hook -> HTTP -> Service -> dist r2 bundle',()=>{
  it('carries the original HTTP input binding through real Service normalization without writing customer data',async()=>{
    expect((await post('bootstrap',[])).status).toBe(200);
    const before=disk(),sources=previewSourceSnapshot(project.root);
    const raw={...profile,id:'',surname:' 林 ',fatherName:' 林泽 ',motherName:' 陈宁 ',birthPlace:''};
    const wire=JSON.parse(JSON.stringify(raw)),key=canonicalPlainJson(wire);
    const response=await post(method,[raw,{fromOutputMonthStem:true}]);
    expect(response.status).toBe(200);const dto=await response.json();
    expect(dto.profileId).toBeTruthy();expect(dto.profileId).not.toBe(raw.id);
    expect(matchesRootFeedbackV132RequestBinding(dto.requestBinding,key,true)).toBe(true);
    expect(matchesRootFeedbackV132RequestBinding(dto.requestBinding,canonicalPlainJson({...wire,birthTime:'13:30'}),true)).toBe(false);
    expect(dto.applicationGate.status).toBe('blocked');
    expect(disk()).toEqual(before);expect(previewSourceSnapshot(project.root)).toEqual(sources);
  },30000);

  it('returns the admitted preview and keeps the customer database identical across positive and negative requests',async()=>{
    expect((await post('bootstrap',[])).status).toBe(200);
    expect(fs.existsSync(bundleFile())).toBe(false);
    const legacy=await post('previewBaziRootFeedback',[profile]);expect(legacy.status).toBe(200);
    expect(fs.existsSync(bundleFile())).toBe(false);
    const before=disk(),sources=previewSourceSnapshot(project.root);
    const [response,concurrent]=await Promise.all([post(method,[profile,{fromOutputMonthStem:true}]),post(method,[profile,{fromOutputMonthStem:true}])]);
    expect(response.status).toBe(200);const dto=await response.json();
    expect(concurrent.status).toBe(200);expect(await concurrent.json()).toEqual(dto);
    expect(dto.schema).toBe('bazi-root-feedback-facade/1.3.2-r2');expect(dto.entryPolicy).toBe('month-stem-proposal');
    expect(dto.resourceIdentity.fullClosureSha256).toBe('9f3fa8d4cfc8f190934268597cffb25be19cbf2723b4b827ec74228f2c7596f8');
    expect(dto.applicationGate.status).toBe('blocked');expect(dto.applicationGate).not.toHaveProperty('certificate');
    const bytes=fs.readFileSync(bundleFile()),receipt=JSON.parse(fs.readFileSync(bundleFile()+'.receipt.json','utf8'));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('d01d2b51e10b48c3de361ab27de451dcb91670b71197a559f6fb8182215193fb');
    expect(receipt.output.file).toBe('root-feedback.cjs');
    expect(fs.existsSync(path.join(project.root,'assets/bazi-root-feedback/1.3.2-r2/root-feedback.cjs'))).toBe(false);
    const invalid=await post(method,[{...profile,birthDate:'2024-02-30'}]);expect(invalid.status).toBe(400);expect((await invalid.json()).error).toBeTruthy();
    const options=await post(method,[profile,{bundle:'user-selected.cjs'}]);expect(options.status).toBe(400);
    const extra=await post(method,[profile,{},'extra']);expect(extra.status).toBe(400);
    expect((await post(method,[profile],{Origin:'https://different.invalid'})).status).toBe(403);
    expect(disk()).toEqual(before);
    expect(previewSourceSnapshot(project.root)).toEqual(sources);
  },30000);
  it('revalidates fixed publication files after a successful request and keeps the old 1.3.1 endpoint unchanged',async()=>{
    const oldBefore=await post('previewBaziRootFeedback',[profile]);expect(oldBefore.status).toBe(200);const oldDto=await oldBefore.json();
    expect(oldDto.methodId).toBe('project-bazi-mainchain-145/1.3.1');
    const before=disk(),target=path.join(project.root,'assets/bazi-root-feedback/1.3.2-r2/execution-source/src/domain/engine.ts'),bytes=fs.readFileSync(target);
    try{fs.appendFileSync(target,'\n');const bad=await post(method,[profile]);expect(bad.status).toBe(400);expect((await bad.json()).error).toContain('ROOT_FEEDBACK_V132_R2_SOURCE_MISMATCH');}finally{fs.writeFileSync(target,bytes);}
    const recovered=await post(method,[profile]);expect(recovered.status).toBe(200);
    const oldAfter=await post('previewBaziRootFeedback',[profile]);expect(oldAfter.status).toBe(200);expect(await oldAfter.json()).toEqual(oldDto);
    expect(disk()).toEqual(before);
  },30000);
  it('rebuilds only its cleared dist subdirectory on explicit concurrent requests while old API remains lazy',async()=>{
    const before=disk(),sources=previewSourceSnapshot(project.root);
    clearOwnedPreviewOutput();expect(fs.existsSync(bundleFile())).toBe(false);
    expect((await post('previewBaziRootFeedback',[profile])).status).toBe(200);expect(fs.existsSync(bundleFile())).toBe(false);
    const replies=await Promise.all([post(method,[profile]),post(method,[profile])]);
    for(const response of replies){expect(response.status).toBe(200);expect((await response.json()).schema).toBe('bazi-root-feedback-facade/1.3.2-r2');}
    expect(fs.existsSync(bundleFile())).toBe(true);expect(fs.existsSync(bundleFile()+'.receipt.json')).toBe(true);
    expect(disk()).toEqual(before);expect(previewSourceSnapshot(project.root)).toEqual(sources);
  },30000);
  it('refuses bad and missing compiler sources without creating output, then retries after restoration',async()=>{
    const before=disk(),sources=previewSourceSnapshot(project.root),source=path.join(project.root,'src/domain/engine.ts'),bytes=fs.readFileSync(source);
    clearOwnedPreviewOutput();
    try{fs.appendFileSync(source,'\n');const bad=await post(method,[profile]);expect(bad.status).toBe(400);expect((await bad.json()).error).toContain('ROOT_FEEDBACK_V132_R2_SOURCE_MISMATCH');expect(fs.existsSync(bundleFile())).toBe(false);}finally{fs.writeFileSync(source,bytes);}
    fs.renameSync(source,source+'.held');
    try{const missing=await post(method,[profile]);expect(missing.status).toBe(400);expect((await missing.json()).error).toBeTruthy();expect(fs.existsSync(bundleFile())).toBe(false);}finally{fs.renameSync(source+'.held',source);}
    expect((await post(method,[profile])).status).toBe(200);
    const output=fs.readFileSync(bundleFile());fs.appendFileSync(bundleFile(),'\n');
    try{const tampered=await post(method,[profile]);expect(tampered.status).toBe(400);expect((await tampered.json()).error).toContain('independently admitted');}finally{fs.writeFileSync(bundleFile(),output);}
    expect(disk()).toEqual(before);expect(previewSourceSnapshot(project.root)).toEqual(sources);
  },30000);
});
