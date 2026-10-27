import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.resolve(process.argv[2]??'');
if(!process.argv[2]||fs.existsSync(path.join(root,'input-manifest.json')))throw Error('Fresh evidence root required');
const fixture='D:/Codex-NamingStudio-Evidence/m919-restore-optimization/evidence';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
fs.mkdirSync(path.join(root,'fixture'),{recursive:true});
for(const name of ['synthetic-three-revisions.nsbk','synthetic-three-revisions-identity.json'])fs.copyFileSync(path.join(fixture,name),path.join(root,'fixture',name),fs.constants.COPYFILE_EXCL);
const fixtureSha256=hash(fs.readFileSync(path.join(root,'fixture','synthetic-three-revisions.nsbk')));
if(fixtureSha256!=='c80e8de8521d16580cacfad5721fbcd06b1d2d8797066f3d33a54f3aa4facc26')throw Error('Wrong fixture');
const resources=[];
for(const parent of ['data','assets']){
 const source=path.resolve(parent),target=path.join(root,'resources',parent);fs.cpSync(source,target,{recursive:true,errorOnExist:true,force:false});
 const walk=directory=>{for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())walk(file);else if(entry.isFile()){const bytes=fs.readFileSync(file);resources.push({path:path.relative(path.join(root,'resources'),file).replaceAll('\\','/'),bytes:bytes.length,sha256:hash(bytes)});}else throw Error('Nonregular resource');}};walk(target);
}
resources.sort((a,b)=>a.path.localeCompare(b.path));
const manifest={schema:'m925-frozen-real-restore-input/1',base:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),fixtureSha256,fixtureBytes:fs.statSync(path.join(root,'fixture','synthetic-three-revisions.nsbk')).size,identitySha256:hash(fs.readFileSync(path.join(root,'fixture','synthetic-three-revisions-identity.json'))),resources};
const output=path.join(root,'input-manifest.json');fs.writeFileSync(output+'.tmp',JSON.stringify(manifest,null,2)+'\n');fs.renameSync(output+'.tmp',output);
console.log(JSON.stringify({fixtureSha256,resources:resources.length,resourceBytes:resources.reduce((sum,row)=>sum+row.bytes,0)}));
