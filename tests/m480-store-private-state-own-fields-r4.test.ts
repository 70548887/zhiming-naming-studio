/** Source-only R4 regression: private state registration must create own fields
 * without consulting inherited accessors. The real public Store may use its
 * ordinary guarded fallback; this test grants no caller replay authority. */
import {beforeAll,describe,expect,it} from 'vitest';
import type {NamingSession} from '../src/shared/types';
import {prepareGenuineSeed,withFixture,captured} from './helpers/m458-store-fixture';

const privateKeys=['publicationBundle','receipt','legacy40Authenticated','presentV71Authenticated'] as const;
type PrivateKey=typeof privateKeys[number];
type Access={key:PrivateKey;kind:'get'|'set';receiver:unknown};

beforeAll(prepareGenuineSeed);

describe('M480 R4 private state own-field registration',()=>{
  it('returns the complete genuine session without invoking four inherited private-state accessors',async()=>{
    await withFixture(({store,current})=>{
      const baseline=store.readVerifiedSession(current.id);
      expect(baseline).toEqual(current);
      const previous=privateKeys.map(key=>({key,descriptor:Object.getOwnPropertyDescriptor(Object.prototype,key)}));
      const accesses:Access[]=[],sentinel=new Error('M480 inherited private-state accessor must never run');
      let result:{value?:NamingSession;error?:unknown}={};
      try{
        for(const key of privateKeys)Object.defineProperty(Object.prototype,key,{
          configurable:true,enumerable:false,
          get(this:unknown){accesses.push({key,kind:'get',receiver:this});throw sentinel;},
          set(this:unknown,_value:unknown){accesses.push({key,kind:'set',receiver:this});throw sentinel;},
        });
        // This is the only public read while all four inherited slots exist.
        // No assertions or framework helpers run until exact restoration.
        result=captured(()=>store.readVerifiedSession(current.id));
      }finally{
        for(const {key,descriptor} of previous){
          if(descriptor)Object.defineProperty(Object.prototype,key,descriptor);
          else if(!Reflect.deleteProperty(Object.prototype,key))throw Error('M480 could not restore Object.prototype.'+key);
        }
      }
      expect(accesses).toHaveLength(0);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(baseline);
      expect(result.value).toEqual(current);
      for(const {key,descriptor} of previous)expect(Object.getOwnPropertyDescriptor(Object.prototype,key)).toEqual(descriptor);
      // A successful DTO and zero accessor calls prove absence of this private
      // receiver leak, including an ordinary legitimate guard fallback. They
      // do not prove replay admission, a memo hit, or any internal source phase.
    });
  });
});
