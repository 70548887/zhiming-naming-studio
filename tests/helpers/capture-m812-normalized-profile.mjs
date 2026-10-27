import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {builtinModules,createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gunzipSync,gzipSync} from 'node:zlib';
import {build} from 'esbuild';

// Explicit capture composition only. No Service constructor, full Service
// preview method, IPC/HTTP, Store/SQL, renderer or browser is executed.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const output=path.resolve(process.argv[2]??path.join(root,'tests/fixtures/m812-normalized-profile-capture.json.gz'));
assert.equal(path.dirname(output),path.join(root,'tests/fixtures'),'Capture output must be a new tests/fixtures file.');
if(fs.existsSync(output))throw Error('Existing captures are preserved; select a new output file.');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const jsonSha=value=>sha(JSON.stringify(value));
const relative=file=>path.relative(root,file).replaceAll('\\','/');
const sourceRecord=file=>{const bytes=fs.readFileSync(file);return{path:relative(file),bytes:bytes.length,sha256:sha(bytes)};};
const inputFile=path.join(root,'tests/fixtures/m793-fixed-facade-capture.json.gz');
const inputCompressed=fs.readFileSync(inputFile),inputBytes=gunzipSync(inputCompressed);
assert.equal(sha(inputBytes),'0c21529f76c722a3df91e726ddc274db51bbfc6837f0b727e26341471e1bbb4d');
const historical=JSON.parse(inputBytes.toString('utf8'));
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'m812-normalized-profile-'));
const require=createRequire(import.meta.url);
const importantSources=[
 'src/main/service.ts',
 'src/main/bazi-root-feedback-v132-preview.ts',
 'src/main/bazi-root-feedback-v132-request-binding.ts',
 'src/shared/bazi-root-feedback-v132-request-binding.ts',
 'src/shared/plain-json.ts',
 'tests/helpers/root-feedback-v132-preview-fixture.ts',
 'scripts/build-root-feedback-v132-r2.mjs',
 'tests/helpers/capture-m812-normalized-profile.mjs',
];

try{
 const runtime=path.join(temporary,'capture-runtime.mjs');
 const compiled=await build({
  absWorkingDir:root,
  stdin:{contents:[
   "export {StudioService} from './src/main/service';",
   "export {createBaziRootFeedbackV132PreviewAdapter} from './src/main/bazi-root-feedback-v132-preview';",
   "export {readRootFeedbackV132BoundPreviewRequest,bindRootFeedbackV132PreviewResponse} from './src/main/bazi-root-feedback-v132-request-binding';",
   "export {canonicalPlainJson} from './src/shared/plain-json';",
   "export {buildPreviewFixture} from './tests/helpers/root-feedback-v132-preview-fixture';",
  ].join('\n'),sourcefile:'m812-normalized-capture-runtime.ts',resolveDir:root,loader:'ts'},
  outfile:runtime,bundle:true,platform:'node',target:'node22',format:'esm',packages:'external',metafile:true,logLevel:'silent',charset:'utf8',
  // Resolve external packages from the real checkout, since the runtime lives
  // in an isolated temporary directory. Local source modules remain bundled.
  plugins:[{name:'capture-owned-package-resolution',setup(builder){builder.onResolve({filter:/^[^./]/},args=>{
   if(args.path.startsWith('node:')||builtinModules.includes(args.path))return;
   return{path:pathToFileURL(require.resolve(args.path,{paths:[args.resolveDir||root]})).href,external:true};
  });}}],
 });
 const api=await import(pathToFileURL(runtime).href);
 const built=await api.buildPreviewFixture(path.join(temporary,'fixed-publication'),root);
 const bundle=fs.readFileSync(built.file),receiptBytes=fs.readFileSync(built.file+'.receipt.json'),receipt=JSON.parse(receiptBytes.toString('utf8'));
 assert.equal(sha(bundle),'d01d2b51e10b48c3de361ab27de451dcb91670b71197a559f6fb8182215193fb');
 assert.equal(sha(bundle),receipt.output.sha256);assert.equal(bundle.length,receipt.output.bytes);
 const adapter=api.createBaziRootFeedbackV132PreviewAdapter(path.resolve(built.assetRoot));
 // These profiles have no namingPreferences or parentNameReadings. The real
 // validator path needs no Store-backed adapters, so its constructor is unused.
 const receiver=Object.create(api.StudioService.prototype),cases={};
 for(const name of ['unique','unknown','multiple','monthStem']){
  const original=historical.cases[name];
  assert(original,'Missing original profile '+name);
  const raw={...structuredClone(original.profile),id:'',surname:' 林 ',fatherName:' 林文舟 ',motherName:' 陈若兰 '};
  assert(!Object.hasOwn(raw,'namingPreferences')&&!Object.hasOwn(raw,'parentNameReadings'));
  const before=JSON.stringify(raw);
  // This order is the evidence under test: retain raw ownership BEFORE the
  // actual Service validator assigns an ID or normalizes the name fields.
  const owned=api.readRootFeedbackV132BoundPreviewRequest(raw,original.options);
  assert(Object.isFrozen(owned.profile));
  const normalized=api.StudioService.prototype.validateProfile.call(receiver,owned.profile);
  assert.match(normalized.id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.equal(normalized.surname,'林');assert.equal(normalized.fatherName,'林文舟');assert.equal(normalized.motherName,'陈若兰');
  const dto=adapter.previewBaziRootFeedbackProfile(normalized,owned.options);
  const response=api.bindRootFeedbackV132PreviewResponse(owned,dto);
  assert.equal(dto.status,original.dto.status);assert.equal(response.profileId,normalized.id);
  assert.equal(response.requestBinding.profileKey,api.canonicalPlainJson(raw));
  assert.equal(response.requestBinding.fromOutputMonthStem,original.options.fromOutputMonthStem);
  assert.equal(response.entryPolicy,original.options.fromOutputMonthStem?'month-stem-proposal':'month-branch-only');
  for(const branch of response.branches){
   assert.equal(branch.root.profileId,branch.id);assert.equal(branch.root.entryPolicy,response.entryPolicy);
   if(raw.timeUnknown)assert(branch.id.startsWith(normalized.id+':calendar-interval:'));else assert.equal(branch.id,normalized.id);
  }
  const {requestBinding,...unbound}=response;
  assert.equal(jsonSha(unbound),jsonSha(dto));assert.equal(JSON.stringify(raw),before);
  cases[name]={raw,normalized,options:structuredClone(owned.options),response,dtoSha256:jsonSha(dto),responseSha256:jsonSha(response)};
 }
 const localInputs=Object.keys(compiled.metafile.inputs).map(file=>path.resolve(root,file)).filter(file=>fs.existsSync(file)&&fs.statSync(file).isFile()&&!path.relative(root,file).startsWith('..'));
 const files=[...new Set([...localInputs,...importantSources.map(file=>path.join(root,file))])].sort((a,b)=>relative(a).localeCompare(relative(b),'en'));
 const result={
  schema:'m812-actual-normalized-profile-capture/1',
  provenance:{
   composition:'actual StudioService.prototype.validateProfile + fixed M758 adapter + real M811 owned reader/main binder',
   order:['readRootFeedbackV132BoundPreviewRequest(raw, options)','StudioService.prototype.validateProfile(owned.profile)','fixedAdapter.previewBaziRootFeedbackProfile(normalized, owned.options)','bindRootFeedbackV132PreviewResponse(owned, actualDto)'],
   validatorReceiver:'Object.create(StudioService.prototype); constructor not invoked; no preferences/parent-reading adapter path',
   randomIdPolicy:'Actual node:crypto randomUUID result recorded; no override or deterministic replacement.',
   sourceInput:{path:relative(inputFile),gzipSha256:sha(inputCompressed),jsonSha256:sha(inputBytes)},
   fixedPublication:{bundleBytes:bundle.length,bundleSha256:sha(bundle),receiptSha256:sha(receiptBytes),identity:receipt.identity},
   sources:files.map(sourceRecord),
   runtime:{node:process.versions.node,icu:process.versions.icu??null,tz:process.versions.tz??null,unicode:process.versions.unicode??null,platform:process.platform,arch:process.arch},
   dtoSha256Definition:'SHA256 of JSON.stringify(actual DTO), equivalently response minus requestBinding; responseSha256 covers the full bound response.',
   scope:{actualValidator:true,fixedAdapter:true,mainOwnedReader:true,mainBinder:true,serviceConstructor:false,fullServicePreviewMethod:false,fullServiceWire:false,http:false,sql:false,browser:false,renderer:false},
  },
  cases,
 };
 const json=Buffer.from(JSON.stringify(result,null,2)+'\n'),compressed=gzipSync(json,{level:9});
 fs.writeFileSync(output,compressed,{flag:'wx'});
 assert.equal(sha(gunzipSync(fs.readFileSync(output))),sha(json));
 process.stdout.write(JSON.stringify({file:output,gzipBytes:compressed.length,gzipSha256:sha(compressed),jsonBytes:json.length,jsonSha256:sha(json),cases:Object.fromEntries(Object.entries(cases).map(([name,row])=>[name,{status:row.response.status,rawId:row.raw.id,normalizedId:row.normalized.id,fromOutputMonthStem:row.options.fromOutputMonthStem,dtoSha256:row.dtoSha256,responseSha256:row.responseSha256}])),sourceHashes:Object.fromEntries(result.provenance.sources.filter(row=>importantSources.includes(row.path)).map(row=>[row.path,row.sha256])),fixedPublication:result.provenance.fixedPublication})+'\n');
}finally{
 const base=path.resolve(os.tmpdir()),target=path.resolve(temporary),remainder=path.relative(base,target);
 if(remainder&&remainder!=='..'&&!remainder.startsWith('..'+path.sep)&&!path.isAbsolute(remainder)&&path.basename(target).startsWith('m812-normalized-profile-'))fs.rmSync(target,{recursive:true,force:true});
}
