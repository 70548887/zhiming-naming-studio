import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from 'esbuild';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('actual constructor-free StudioService method uses only Store.dataDir and returns the B04 DTO',async()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'m572-b04-service-')),bundle=path.join(temp,'service.mjs');
  try{
    await build({stdin:{contents:`export {StudioService} from '${root.replaceAll('\\','/')}/src/main/service.ts';`,resolveDir:root,sourcefile:'m572-service-entry.ts',loader:'ts'},outfile:bundle,bundle:true,platform:'node',target:'node22',format:'esm',packages:'bundle',external:['node:*'],logLevel:'silent'});
    const {StudioService}=await import(pathToFileURL(bundle).href);let reads=0;
    const service=Object.create(StudioService.prototype);Object.defineProperty(service,'store',{value:new Proxy({dataDir:path.join(root,'data')},{get(_target,key){if(key==='dataDir')return path.join(root,'data');reads++;throw new Error('M572 forbidden Store property: '+String(key));}})});
    const result=await service.getB04WordContextOptions({char:'渤'});
    assert.equal(result.schema,'b04-word-context-options/1');assert.equal(result.status,'available');assert.equal(result.options[0].givenName,'渤海');assert.equal(reads,0);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('main IPC, preload, browser API and dev-plugin each expose exactly one B04 method',()=>{
  const checks=[
    ['src/main/main.ts',/register\('getB04WordContextOptions'/g],
    ['src/main/preload.ts',/getB04WordContextOptions:input=>invoke\('getB04WordContextOptions',input\)/g],
    ['src/shared/browser-api.ts',/methods\.push\([^;\n]*'getB04WordContextOptions'/g],
    ['scripts/dev-plugin.ts',/getB04WordContextOptions/g],
  ];
  for(const [relative,regex] of checks){const text=fs.readFileSync(path.join(root,relative),'utf8');const hits=text.match(regex)||[];assert.equal(hits.length,1,relative);}
});
