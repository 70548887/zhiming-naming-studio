import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {packageMatcher} from '../scripts/verification/common.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json')));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const pins={m610:'0466fecbb1e86e3bfc499033df58a05ba21735834542bdaf19673d574fdbdb38',m616:'500230c50d313a80422034116b4db288b1505a8bdf6b483a2e65a5d84e15d864'};
const batches=Object.entries(pins).map(([id,pin])=>{
 const file=`data/naming-character-meanings-${id}-manifest.json`,bytes=fs.readFileSync(path.join(root,file));assert.equal(hash(bytes),pin,'fixed batch manifest');
 const manifest=JSON.parse(bytes),files=[{file,bytes:bytes.length,sha256:pin},...manifest.files.map(row=>({...row,file:row.file.startsWith('data/')?row.file:'data/'+row.file}))];
 const lock=JSON.parse(fs.readFileSync(path.join(root,`data/naming-character-meanings-${id}-source-lock.json`)));
 return{id,files,sourceFiles:Object.keys(lock.originalFiles).map(name=>name.startsWith('data/')?name:'data/'+name)};
});
const targets=batches.flatMap(batch=>batch.files);
function assertProjection(files){
 const match=packageMatcher(files);
 for(const row of targets){assert.equal(files.filter(file=>file===row.file).length,1,`missing exact candidate file ${row.file}`);assert.equal(match(row.file),true,`excluded candidate file ${row.file}`);}
 for(const file of new Set(batches.flatMap(batch=>batch.sourceFiles)))assert.equal(match(file),true,`original dependency excluded ${file}`);
}

test('actual package projection contains both complete fixed candidate source closures and existing original dependencies',()=>{
 assert.equal(targets.length,12);assert.equal(new Set(targets.map(row=>row.file)).size,12);
 for(const row of targets){const bytes=fs.readFileSync(path.join(root,row.file));assert.equal(bytes.length,row.bytes);assert.equal(hash(bytes),row.sha256);}
 assertProjection(pkg.build.files);
 assert.equal(pkg.version,'1.0.38');
});

test('deleting any required exact asset is detected even when an added broad glob would mask availability',()=>{
 for(const row of targets){const changed=pkg.build.files.filter(file=>file!==row.file);changed.push('data/**/*');assert.equal(packageMatcher(changed)(row.file),true);assert.throws(()=>assertProjection(changed),/missing exact candidate file/);}
});

test('a later negative package pattern excluding a declared file is detected by the actual matcher',()=>{
 for(const row of targets){const changed=[...pkg.build.files,'!'+row.file];assert.equal(changed.includes(row.file),true);assert.throws(()=>assertProjection(changed),/excluded candidate file/);}
});
