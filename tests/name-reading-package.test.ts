import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe,expect,it} from 'vitest';
import packageConfig from '../package.json';
const require=createRequire(import.meta.url),module=require('minimatch'),matches=typeof module==='function'?module:module.minimatch;
const locks=['data/name-imagery-source-lock.json','data/yue-reading-source-lock.json','data/ren-actions-source-lock.json','data/yue-homophone-source-lock.json'];
const explicitRuntimeDependencies=['data/raw/qimen-patterns-arc-constants.js','data/name-imagery-profile.json','data/yue-reading-table.json'];

describe('offline name-reading resources in the actual installer configuration',()=>{
  it('includes the original Arc file read at startup as well as every locked source and licence',()=>{
    const files=new Set(explicitRuntimeDependencies);
    for(const lockFile of locks){files.add(lockFile);const lock=JSON.parse(readFileSync(lockFile,'utf8'));for(const source of lock.sources)for(const file of source.files)files.add(file);}
    for(const file of files){expect(existsSync(file),file+' must exist').toBe(true);expect(packageConfig.build.files.some(pattern=>matches(file,pattern,{dot:true})),file+' must be shipped for offline startup').toBe(true);}
  });
});
