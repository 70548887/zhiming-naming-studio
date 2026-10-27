import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
const evidence=process.env.M938_PATH_TEST_ROOT;
describe.skipIf(process.platform!=='win32'||evidence===undefined)('M938 actual physical path functions retain fresh path rejection after successful reads',()=>{
 let directory:string,api:{check:(file:string)=>string};
 beforeAll(async()=>{
  const root=path.resolve(evidence!);fs.mkdirSync(root,{recursive:true});directory=fs.mkdtempSync(path.join(root,'m938-path-guards-'));
  const module=path.resolve('src/main/candidate2-generation-resources-v2.ts'),outfile=path.resolve('.local/m938/fresh-path-guards.mjs');
  await build({stdin:{contents:'export {__m938Check as check} from '+JSON.stringify(module.replaceAll('\\','/'))+';',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',outfile,plugins:[{name:'diagnostic-export-actual-physical-check',setup(builder){builder.onLoad({filter:/candidate2-generation-resources-v2\.ts$/},()=>({contents:fs.readFileSync(module,'utf8')+'\nexport {physicalFile as __m938Check};\n',loader:'ts',resolveDir:path.dirname(module)}));}}]});
  api=await import(pathToFileURL(outfile).href);
 });
 afterAll(()=>{if(directory){const root=path.resolve(evidence!),resolved=path.resolve(directory);if(path.dirname(resolved)!==root||!path.basename(resolved).startsWith('m938-path-guards-'))throw Error('Unsafe test cleanup');fs.rmSync(resolved,{recursive:true,force:false});}});
 it('rechecks every ancestor after a valid path is replaced by a directory junction and retries when restored',()=>{
  const parent=path.join(directory,'ancestor'),moved=path.join(directory,'moved');fs.mkdirSync(parent);const file=path.join(parent,'saved.txt');fs.writeFileSync(file,'original');
  expect(api.check(file)).toBe(file);fs.renameSync(parent,moved);fs.symlinkSync(moved,parent,'junction');
  try{expect(()=>api.check(file)).toThrow('directory alias or nonphysical path');}finally{fs.rmdirSync(parent);fs.renameSync(moved,parent);}
  expect(api.check(file)).toBe(file);expect(fs.readFileSync(file,'utf8')).toBe('original');
 });
 it('rechecks a formerly valid file after replacement by a symlink, then accepts the restored physical file',()=>{
  const original=path.join(directory,'original.txt'),target=path.join(directory,'target.txt');fs.writeFileSync(original,'original');fs.writeFileSync(target,'other');
  expect(api.check(original)).toBe(original);fs.unlinkSync(original);fs.symlinkSync(target,original,'file');
  try{expect(()=>api.check(original)).toThrow('file alias or nonphysical path');}finally{fs.unlinkSync(original);fs.writeFileSync(original,'restored');}
  expect(api.check(original)).toBe(original);expect(fs.readFileSync(original,'utf8')).toBe('restored');
 });
});
