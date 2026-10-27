import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';import {build} from 'esbuild';
const sha=(v:Uint8Array)=>createHash('sha256').update(v).digest('hex');
/** Test-only outputs always belong to a private case directory. No dist-electron
 * artifact, environment variable, other workspace or prebuilt private bundle is required. */
export function parentPhoneticsCase(prefix:string,override?:string){
 const ownsRoot=override===undefined,root=override?path.resolve(override):fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(),prefix)));fs.mkdirSync(root,{recursive:true});return{root,ownsRoot,close(){if(ownsRoot&&fs.existsSync(root)){const actual=fs.realpathSync.native(root);if(path.dirname(actual)!==fs.realpathSync.native(os.tmpdir())||!path.basename(actual).startsWith(prefix))throw Error('Unsafe parent phonetic test cleanup');fs.rmSync(actual,{recursive:true,force:true});}}};
}
export async function buildParentPhoneticsWorker(repository:string,caseRoot:string){
 const outfile=path.join(caseRoot,'runtime/cmn-reading-worker.cjs');await build({absWorkingDir:repository,entryPoints:[path.join(repository,'src/main/cmn-reading-worker.ts')],outfile,bundle:true,platform:'node',target:'node22',format:'cjs',logLevel:'silent'});return outfile;
}
export async function buildParentPhoneticsStoreProbe(repository:string,caseRoot:string){
 const outDir=path.join(caseRoot,'runtime'),entry=path.join(outDir,'store-entry.ts'),outfile=path.join(outDir,'store-probe.cjs'),quoted=(file:string)=>JSON.stringify(file.replaceAll('\\','/'));fs.mkdirSync(outDir,{recursive:true});fs.writeFileSync(entry,`export {Store} from ${quoted(path.join(repository,'src/main/store.ts'))};\nexport {parentNameSourceValidator} from ${quoted(path.join(repository,'src/main/parent-name-source-validator.ts'))};\n`);
 const actualSqlJs=createRequire(path.join(repository,'package.json')).resolve('sql.js');
 await build({entryPoints:[entry],outfile,bundle:true,platform:'node',target:'node22',format:'cjs',logLevel:'silent',plugins:[{name:'actual-repository-sqljs',setup(builder){builder.onResolve({filter:/^sql\.js$/},()=>({path:actualSqlJs,external:true}));}}]});return outfile;
}
export async function buildFrozenParentPhoneticsBefore(repository:string,caseRoot:string){
 const file=path.join(repository,'tests/fixtures/parent-name-phonetics-e649.ts.txt'),bytes=fs.readFileSync(file),expected='e64934e67f1f11d480294622b9d7652ff70f9c9d68577846697c73b511daacdd';if(sha(bytes)!==expected)throw Error('Frozen pre-neutral parent-source fixture differs');const outfile=path.join(caseRoot,'runtime/parent-e649-before.cjs');await build({stdin:{contents:bytes.toString(),sourcefile:file,resolveDir:path.join(repository,'src/shared'),loader:'ts'},outfile,bundle:true,platform:'node',target:'node22',format:'cjs',logLevel:'silent'});return outfile;
}
