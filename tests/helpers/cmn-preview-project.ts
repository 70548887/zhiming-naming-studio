import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),parent=fs.realpathSync.native(os.tmpdir());
/** Each plugin-consuming test owns its compiler output, sources, originals and WASM. */
export function createCmnPreviewProject(){
  const sourceRoot=process.cwd(),root=fs.realpathSync.native(fs.mkdtempSync(path.join(parent,'cmn-preview-project-')));
  try{
    const patterns=JSON.parse(fs.readFileSync(path.join(sourceRoot,'package.json'),'utf8')).build.files as string[];
    const module=require('minimatch'),match=module.minimatch??module;
    const include=(file:string)=>patterns.some(p=>!p.startsWith('!')&&match(file,p,{dot:true}))&&!patterns.some(p=>p.startsWith('!')&&match(file,p.slice(1),{dot:true}));
    const copy=(file:string)=>{const dst=path.join(root,file);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(path.join(sourceRoot,file),dst);};
    for(const file of ['src/main/cmn-reading-worker.ts','src/main/cmn-reading-source.ts','src/main/cmn-reading-pins.ts','src/shared/cmn-reading.ts'])copy(file);
    const walk=(relative:string)=>{for(const e of fs.readdirSync(path.join(sourceRoot,relative),{withFileTypes:true})){const file=relative+'/'+e.name;if(e.isSymbolicLink())throw Error('Linked test source');if(e.isDirectory())walk(file);else if(e.isFile()&&include(file))copy(file);}};walk('data');
    const wasm=path.join(root,'node_modules/sql.js/dist/sql-wasm.wasm');fs.mkdirSync(path.dirname(wasm),{recursive:true});fs.copyFileSync(require.resolve('sql.js/dist/sql-wasm.wasm'),wasm);
    return{root,close(){if(!root.startsWith(parent+path.sep))throw Error('Unsafe project cleanup');fs.rmSync(root,{recursive:true,force:true});}};
  }catch(error){if(root.startsWith(parent+path.sep))fs.rmSync(root,{recursive:true,force:true});throw error;}
}
export function cmnBuildFileSnapshot(root=process.cwd()){
  const directory=path.join(root,'dist-electron'),rows:{file:string;bytes:number;sha256:string}[]=[];
  const walk=(relative:string)=>{for(const e of fs.readdirSync(path.join(directory,relative),{withFileTypes:true})){const file=path.join(relative,e.name);if(e.isSymbolicLink())throw Error('Linked compiler artifact');if(e.isDirectory())walk(file);else if(e.isFile()){const b=fs.readFileSync(path.join(directory,file));rows.push({file:file.replaceAll('\\','/'),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}}};
  if(fs.existsSync(directory))walk('');return rows.sort((a,b)=>a.file.localeCompare(b.file));
}
