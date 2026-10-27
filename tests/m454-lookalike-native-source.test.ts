/** Actual pinned MJS in an isolated Node child; the Vitest process never
 * replaces WeakMap or installs the nativecode execution tripwire. */
import {describe,expect,it} from 'vitest';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const entryPin='35469ef8d47bd3b66f9525ce51baef7a380a783b73240781c0b8c26d0ce0e943';
const tablePin='392fa47441a0c410b0903c3e85853081225a1a5e9f540b5467e4ea4e2151cc48';
const childPin='1b6883c467714dce59e1d08f4009f645c6dc7666168ab83d4be60786e237a143';

describe('M454 isolated ordinary-function native lookalike rejection',()=>{
  it('keeps the public lookup usable and declines the diagnostic without executing any lookalike',()=>{
    const child=fileURLToPath(new URL('./helpers/m454-lookalike-native-child.mjs',import.meta.url));
    const entry=fileURLToPath(new URL('../src/domain/naming-review-v7.mjs',import.meta.url));
    const table=fileURLToPath(new URL('../data/naming-editorial-v7.json',import.meta.url));
    const result=spawnSync(process.execPath,[child,entry,entryPin,table,tablePin,childPin],{
      encoding:'utf8',maxBuffer:64*1024,
      env:{...process.env,NODE_OPTIONS:undefined,M454_LOOKALIKE_CHILD:'1'},
    });
    expect(result.error).toBeUndefined();
    expect(result.status,result.stderr||result.stdout).toBe(0);
    expect(result.signal).toBeNull();
    expect(result.stderr).toBe('');
    const observed=JSON.parse(result.stdout) as {
      passed:boolean;phase:string;observed:{entry:string;table:string;child:string};
      sources:{constructor:string;get:string;set:string};ordinarySourcesExact:boolean;
      imported:boolean;publicLookupUsable:boolean;diagnosticUndefined:boolean;
      nativecodeGetterCalls:number;descriptorsRestored:boolean;problem?:unknown;
    };
    expect(observed).toEqual({
      passed:true,phase:'lookalike',observed:{entry:entryPin,table:tablePin,child:childPin},
      sources:{constructor:'function WeakMap(){[nativecode]}',get:'function get(){[nativecode]}',set:'function set(){[nativecode]}'},
      ordinarySourcesExact:true,imported:true,publicLookupUsable:true,
      diagnosticUndefined:true,nativecodeGetterCalls:0,descriptorsRestored:true,
    });
  });
});
