import {afterEach,describe,expect,it} from 'vitest';
import {chmodSync,cpSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {loadRenActionsData,loadRenActionsSources,REN_ACTIONS_SOURCE_ID} from '../src/main/ren-actions-data';
const paths:string[]=[];
function fixture(){const directory=mkdtempSync(join(tmpdir(),'ren-actions-source-'));paths.push(directory);const lock=JSON.parse(readFileSync('data/ren-actions-source-lock.json','utf8'))as{sources:{files:string[]}[]};for(const file of ['data/ren-actions-source-lock.json',...lock.sources[0].files]){const output=join(directory,file.slice(5));cpSync(resolve(file),output,{recursive:true});chmodSync(output,0o666);}return directory;}
afterEach(()=>{for(const directory of paths.splice(0)){if(!resolve(directory).startsWith(resolve(tmpdir())+'\\ren-actions-source-')&&!resolve(directory).startsWith(resolve(tmpdir())+'/ren-actions-source-'))throw Error('Unsafe source fixture cleanup');rmSync(directory,{recursive:true,force:true});}});
describe('independently published source-conditional Ren action package',()=>{
  it('validates lock, complete selected commentary paragraphs, precise short clauses and licence',()=>{
    const loaded=loadRenActionsData(resolve('data'));expect(loaded.sources).toEqual(loadRenActionsSources(resolve('data')));expect(loaded.rules.version).toBe('1.0.0');expect(loaded.rules.clauses).toHaveLength(19);expect(loaded.sources[0]).toMatchObject({id:REN_ACTIONS_SOURCE_ID,license:'CC-BY-SA-4.0'});expect(loaded.sources[0].files.some(file=>file.endsWith('ren-actions-excerpts.json'))).toBe(true);
    const full=JSON.parse(readFileSync('data/raw/ren-actions-excerpts.json','utf8'));expect(full.contexts).toHaveLength(7);expect(full.source.fullWikitextCodepoints).toBe(143701);expect(full.contexts.every((context:any)=>[...context.quote].length===context.end-context.start)).toBe(true);expect(loaded.rules.rootVocabulary.growth).toEqual({'木':['亥','寅','卯']});
  });
  it.each(['ren-actions-source-lock.json','ren-actions-rules.json','raw/ren-actions-excerpts.json','raw/ren-actions-NOTICE.md','raw/CC-BY-SA-4.0.txt'])('refuses altered source or licence %s before runtime use',file=>{
    const directory=fixture(),target=join(directory,file);writeFileSync(target,readFileSync(target,'utf8')+'\nchanged\n');expect(()=>loadRenActionsData(directory)).toThrow('校验失败');
  });
  it('does not allow an edited source span to borrow the unchanged original locator',()=>{
    const directory=fixture(),target=join(directory,'ren-actions-rules.json'),rules=JSON.parse(readFileSync(target,'utf8'));rules.clauses[0].sourceSpan.start++;writeFileSync(target,JSON.stringify(rules));expect(()=>loadRenActionsData(directory)).toThrow('校验失败');
  });
});
