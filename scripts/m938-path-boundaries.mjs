/** Small Windows comparison of the exact two private product functions.
 * Diagnostic-only exports are appended by esbuild; product API is unchanged. */
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {build} from 'esbuild';
const root=path.resolve(process.argv[2]??'');if(!process.argv[2]||process.platform!=='win32')throw Error('Explicit evidence root on Windows required');
fs.mkdirSync(root,{recursive:true});const output=path.join(root,'path-boundary-results.json');if(fs.existsSync(output))throw Error('Do not overwrite previous result');
const base='22ae0ba688dcd860a6bf2157df09f0d103356b59',relative='src/main/candidate2-generation-resources-v2.ts',absolute=path.resolve(relative),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const baseline=execFileSync('git',['show',base+':'+relative]),candidate=fs.readFileSync(absolute),bundles=[];
const atomic=(file,value)=>{fs.writeFileSync(file+'.tmp',JSON.stringify(value,null,2)+'\n');fs.renameSync(file+'.tmp',file);};
for(const [name,bytes]of [['baseline',baseline],['candidate',candidate]]){
 const outfile=path.join(process.cwd(),'.local/m938',name+'-paths.mjs');
 await build({stdin:{contents:'export {__m938PhysicalDirectory,__m938PhysicalFile} from '+JSON.stringify(absolute.replaceAll('\\','/'))+';',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',outfile,metafile:true,plugins:[{name:'diagnostic-private-exports-only',setup(api){api.onLoad({filter:/candidate2-generation-resources-v2\.ts$/},()=>({contents:bytes.toString('utf8')+'\nexport {physicalDirectory as __m938PhysicalDirectory,physicalFile as __m938PhysicalFile};\n',loader:'ts',resolveDir:path.dirname(absolute)}));}}]});
 bundles.push({name,file:outfile,sourceSha256:hash(bytes),bundleSha256:hash(fs.readFileSync(outfile)),api:await import(pathToFileURL(outfile).href)});
}
const tree=path.join(root,'managed-paths');if(fs.existsSync(tree))throw Error('Fresh managed paths required');fs.mkdirSync(tree);
let deep=tree;for(let i=0;i<6;i++){deep=path.join(deep,'层级 '+i+' Unicode-É');fs.mkdirSync(deep);}
const file=path.join(deep,'姓名 test 文件.txt');fs.writeFileSync(file,'fixed path bytes');
const cases=[],unexecuted=[];
function invoke(api,kind,target){try{const value=api[kind==='directory'?'__m938PhysicalDirectory':'__m938PhysicalFile'](target);return{accepted:true,value:value??null};}catch(error){return{accepted:false,name:error.name,message:error.message,code:error.code??null,path:error.path??null,syscall:error.syscall??null};}}
function compare(name,kind,target,expected){const a=invoke(bundles[0].api,kind,target),b=invoke(bundles[1].api,kind,target);const equal=a.accepted===b.accepted&&(a.accepted?a.value===b.value:a.message===b.message&&a.code===b.code);const row={name,kind,target,expected,baseline:a,candidate:b,equal};cases.push(row);atomic(path.join(root,'path-boundary-progress.json'),{cases,unexecuted});if(!equal||expected!==undefined&&a.accepted!==expected)throw Error('Path behavior differs: '+name);}
compare('deep Unicode spaces directory','directory',deep,true);compare('deep Unicode spaces file','file',file,true);
compare('ASCII alternate case directory','directory',deep.toUpperCase(),true);compare('ASCII alternate case file','file',file.toUpperCase(),true);
compare('dot segments preserve resolved directory','directory',path.join(deep,'..',path.basename(deep)),true);
compare('namespace directory identity','directory',path.toNamespacedPath(deep));compare('namespace file identity','file',path.toNamespacedPath(file));
compare('file is not directory','directory',file,false);compare('directory is not file','file',deep,false);
compare('missing directory','directory',path.join(deep,'missing'),false);compare('missing file','file',path.join(deep,'missing.txt'),false);
compare('ordinary file ancestor','file',path.join(file,'child.txt'),false);
const junction=path.join(tree,'junction');try{fs.symlinkSync(deep,junction,'junction');compare('directory junction rejected','directory',junction,false);compare('file below junction rejected','file',path.join(junction,path.basename(file)),false);}catch(error){if(!['EPERM','EACCES','ENOTSUP'].includes(error.code))throw error;unexecuted.push({name:'directory junction',reason:error.code});}
const link=path.join(deep,'file-symlink.txt');try{fs.symlinkSync(file,link,'file');compare('file symlink rejected','file',link,false);}catch(error){if(!['EPERM','EACCES','ENOTSUP'].includes(error.code))throw error;unexecuted.push({name:'file symlink',reason:error.code});}
const mutable=path.join(deep,'replace.txt');fs.writeFileSync(mutable,'before');compare('before controlled file-to-directory replacement','file',mutable,true);fs.unlinkSync(mutable);fs.mkdirSync(mutable);compare('after controlled file-to-directory replacement','file',mutable,false);fs.rmdirSync(mutable);fs.writeFileSync(mutable,'after');compare('replacement restored to regular file','file',mutable,true);
// Replace a regular file with a directory at the actual direct lstat boundary.
// Both versions must retain the original temporal behavior; this does not claim
// exclusion of a concurrent privileged filesystem writer.
const nativeLstat=fs.lstatSync;
for(const entry of bundles){let directChecks=0,changed=false;const target=path.join(deep,'during-'+entry.name+'.txt');fs.writeFileSync(target,'before');
 try{fs.lstatSync=function(filename,...args){const result=nativeLstat.call(fs,filename,...args);directChecks++;if(path.resolve(String(filename))===target&&!changed){fs.unlinkSync(target);fs.mkdirSync(target);changed=true;}return result;};const reply=invoke(entry.api,'file',target);cases.push({name:'controlled change immediately after file lstat '+entry.name,kind:'temporal-observation',reply,directChecks,changed});}
 finally{fs.lstatSync=nativeLstat;fs.rmdirSync(target);}
}
const temporal=cases.filter(row=>row.kind==='temporal-observation');if(JSON.stringify(temporal[0].reply)!==JSON.stringify(temporal[1].reply).replaceAll('during-candidate','during-baseline')||temporal[0].directChecks!==temporal[1].directChecks)throw Error('Temporal check count/outcome changed');
unexecuted.push({name:'UNC share',reason:'No managed local share supplied; not executed.'});
const measurements=[];for(const name of ['baseline','candidate','candidate','baseline']){const entry=bundles.find(row=>row.name===name),before=performance.now(),cpu=process.cpuUsage();for(let i=0;i<40;i++)entry.api.__m938PhysicalFile(file);measurements.push({name,iterations:40,elapsedMs:performance.now()-before,cpu:process.cpuUsage(cpu)});}
const result={schema:'m938-actual-private-path-functions/1',base,productPath:relative,sourceHashes:bundles.map(({api,...row})=>row),diagnosticExportsOnly:true,platform:process.platform,node:process.version,cases,unexecuted,measurements,comparisonScope:'Exact function return and rejection message/code; same direct ancestor/file lstat count; controlled mutation preserves legacy observation. Native/JS path output is not normalized to widen acceptance.',passed:true};atomic(output,result);
console.log(JSON.stringify({output,cases:cases.length,unexecuted,measurements,passed:true}));
