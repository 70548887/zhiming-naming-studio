/** One isolated Node child loads the actual pinned MJS while Reflect.apply has
 * a throwing getter. The Vitest process never installs that getter. */
import {describe,expect,it} from 'vitest';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const entryPin='35469ef8d47bd3b66f9525ce51baef7a380a783b73240781c0b8c26d0ce0e943';
const tablePin='392fa47441a0c410b0903c3e85853081225a1a5e9f540b5467e4ea4e2151cc48';
const childPin='9fb402a1993e45bb3c0b4872029ea3d4be75171592b82db49c93ea4d12534f8d';

describe('M454 isolated pre-import Reflect.apply diagnostic',()=>{
  it('imports the real MJS and reads its closed input without touching the pre-import getter',()=>{
    const child=fileURLToPath(new URL('./helpers/m454-preimport-reflect-apply-child.mjs',import.meta.url));
    const entry=fileURLToPath(new URL('../src/domain/naming-review-v7.mjs',import.meta.url));
    const table=fileURLToPath(new URL('../data/naming-editorial-v7.json',import.meta.url));
    const result=spawnSync(process.execPath,[child,entry,entryPin,table,tablePin,childPin],{
      encoding:'utf8',maxBuffer:64*1024,
      env:{...process.env,NODE_OPTIONS:undefined,M454_DIAGNOSTIC_CHILD:'1'},
    });
    expect(result.error).toBeUndefined();
    expect(result.status,result.stderr||result.stdout).toBe(0);
    expect(result.signal).toBeNull();
    expect(result.stderr).toBe('');
    const observed=JSON.parse(result.stdout) as {
      passed:boolean;phase:string;observed:{entry:string;table:string;child:string};
      imported:boolean;identityMatches:boolean;getterCalls:number;descriptorRestored:boolean;
      problem?:unknown;
    };
    expect(observed).toEqual({
      passed:true,phase:'pre-import',observed:{entry:entryPin,table:tablePin,child:childPin},
      imported:true,identityMatches:true,getterCalls:0,descriptorRestored:true,
    });
  });
});
