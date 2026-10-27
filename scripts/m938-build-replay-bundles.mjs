import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const root=path.resolve(process.argv[2]??'');if(!process.argv[2])throw Error('Evidence root required');
const filename=path.resolve('src/main/candidate2-generation-resources-v2.ts'),base='22ae0ba688dcd860a6bf2157df09f0d103356b59',hash=bytes=>createHash('sha256').update(bytes).digest('hex'),rows=[];
// Root has not merged Dev02's reader yet. Use the fixed public d753 reader
// from the completed read-only M935 checkout for input reconstruction only.
const readerRoot='D:/Codex-NamingStudio-Evidence/m935-candidate2-replay-profile/work',readerCommit='d753ab28e93349a55db2b5fe7c65146e81a83e50';
for(const [name,bytes]of [['baseline',execFileSync('git',['show',base+':src/main/candidate2-generation-resources-v2.ts'])],['candidate',fs.readFileSync(filename)]]){
 const outfile=path.resolve('.local/m938',name+'-replay-r4.mjs');
 const result=await build({entryPoints:['scripts/m938-replay-once.ts'],bundle:true,platform:'node',format:'esm',packages:'external',sourcemap:true,metafile:true,outfile,plugins:[{name:'exact-frozen-resources-version',setup(api){
  api.onResolve({filter:/^\.\.\/src\/main\/(candidate2-native-storage-v1|compact-customer-store)$/},args=>({path:path.join(readerRoot,'src/main',args.path.split('/').at(-1)+'.ts')}));
  api.onLoad({filter:/candidate2-generation-resources-v2\.ts$/},()=>({contents:bytes.toString('utf8'),loader:'ts',resolveDir:path.dirname(filename)}));
 }}]});
 const inputs=Object.keys(result.metafile.inputs).map(input=>{const resolved=path.resolve(input),actual=resolved===filename?bytes:fs.readFileSync(input);if(resolved.startsWith(path.resolve(readerRoot)+path.sep)){const relative=path.relative(readerRoot,resolved).replaceAll('\\','/'),fixed=execFileSync('git',['rev-parse',readerCommit+':'+relative],{cwd:readerRoot,encoding:'utf8'}).trim(),object=createHash('sha1').update('blob '+actual.length+'\0').update(actual).digest('hex');if(object!==fixed)throw Error('Fixed reader dependency drift '+relative);}return{path:input,sha256:hash(actual),bytes:actual.length};});
 rows.push({name,sourceSha256:hash(bytes),outfile,bundleSha256:hash(fs.readFileSync(outfile)),bytes:fs.statSync(outfile).size,fixedReaderCommit:readerCommit,inputs});
}
const output=path.join(root,'replay-bundles-r4.json');if(fs.existsSync(output))throw Error('Never overwrite replay bundle identity');fs.writeFileSync(output+'.tmp',JSON.stringify({schema:'m938-exact-replay-bundles/1',base,rows},null,2)+'\n');fs.renameSync(output+'.tmp',output);console.log(JSON.stringify(rows.map(({inputs,...row})=>({...row,inputCount:inputs.length}))));
