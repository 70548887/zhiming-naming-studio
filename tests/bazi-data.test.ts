import { afterEach, describe, expect, it } from 'vitest';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { BAZI_SOURCE_PROFILE_VERSION, loadBaziSources } from '../src/main/bazi-data';
import { createSessionSourceSnapshot } from '../src/shared/session-sources';

const directories:string[]=[];
function isolatedData(){
  const directory=mkdtempSync(join(tmpdir(),'bazi-source-data-'));directories.push(directory);
  const lock=JSON.parse(readFileSync(resolve('data/bazi-evidence-source-lock.json'),'utf8'));
  for(const file of ['data/bazi-evidence-source-lock.json',...lock.sources.flatMap((source:any)=>source.files)]){
    const output=join(directory,file.slice('data/'.length));mkdirSync(dirname(output),{recursive:true});copyFileSync(resolve(file),output);
  }
  return directory;
}
afterEach(()=>{for(const directory of directories.splice(0))rmSync(directory,{recursive:true,force:true});});

describe('installed Bazi evidence source integrity',()=>{
  it('loads the complete fixed registry and preserves its revision/hash in a generation snapshot',()=>{
    const sources=loadBaziSources(resolve('data'));
    expect(sources.map(source=>source.id)).toEqual(['bazi-evidence-lunar186','bazi-evidence-go-ganzhi','bazi-evidence-project-heuristic']);
    expect(sources[0].commit).toBe('0f3e95d15e31f1a7c7b93d624542649347328a20');
    expect(sources[1].commit).toBe('4d3f58fa0f401b5b3a337f119138e99e90685dda');
    expect(sources[2].commit).toBe('project-fuyi-seasonal/1.0.0');
    expect(JSON.parse(readFileSync(resolve('data/bazi-evidence-source-lock.json'),'utf8')).version).toBe(BAZI_SOURCE_PROFILE_VERSION);
    const snapshot=createSessionSourceSnapshot('test-generation',sources);expect(snapshot.sources).toEqual(sources);
    snapshot.sources[0].files.push('caller-file');expect(loadBaziSources(resolve('data'))[0].files).not.toContain('caller-file');
  });
  it('rejects manifest tampering even when source declarations still look structurally valid',()=>{
    const directory=isolatedData(),file=join(directory,'bazi-evidence-source-lock.json');
    chmodSync(file,0o666);
    writeFileSync(file,readFileSync(file,'utf8')+'\n');expect(()=>loadBaziSources(directory)).toThrow('登记校验失败');
  });
  it.each(['raw/bazi-evidence-lunar-LunarUtil.ts','raw/bazi-evidence-lunar-Lunar.ts','raw/bazi-evidence-go-ganzhi.go','raw/bazi-evidence-lunar-LICENSE.txt','raw/bazi-evidence-go-LICENSE.txt','bazi-evidence-project-profile.json','raw/bazi-evidence-project-NOTICE.md'])('rejects modified original/rule/license file %s',file=>{
    const directory=isolatedData(),target=join(directory,file);
    chmodSync(target,0o666);
    writeFileSync(target,readFileSync(target,'utf8')+'\nchanged');expect(()=>loadBaziSources(directory)).toThrow('原件或许可校验失败');
  });
});
