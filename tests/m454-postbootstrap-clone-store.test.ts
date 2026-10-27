/** Postbootstrap clone-binding regression, authored only; root owns execution.
 * Bound SOURCE: stage-ready-r2/manifest.json SHA256
 * c0bed92bb82c08d5ef4de62e50cf9c451ad9e97f35cafed824f4ac8ecb71a631.
 * The execution envelope must provide the agreed trusted initial own-data
 * structuredClone service before product bootstrap. This case does not mint
 * that trust, create a capsule, replace a business method or inject a fast flag. */
import {it,expect} from 'vitest';
import {mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {randomUUID,webcrypto} from 'node:crypto';
import {types as nodeTypes} from 'node:util';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {normalizePreferences} from '../src/shared/workflow';
import {NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION} from '../src/shared/naming-rules';
import type {BirthProfile} from '../src/shared/types';

it('rejects a postbootstrap structuredClone replacement before invoking it during a genuine Store SQL read',async()=>{
  const ownedRoot=resolve('.local/team-454/store-clone-binding-work');
  mkdirSync(ownedRoot,{recursive:true});const userDir=mkdtempSync(join(ownedRoot,'clone-binding-'));
  let store:Store|undefined,service:StudioService|undefined;
  let originalClone:PropertyDescriptor|undefined,wrapperInstalled=false,complete=false;
  try{
    expect(globalThis.crypto).toBe(webcrypto);
    store=new Store(userDir,resolve('data'),resolve('node_modules/sql.js/dist/sql-wasm.wasm'));await store.init();
    store.put('settings','main',{...store.settings(),useAi:false});
    service=new StudioService(store,{read:()=>'',write:()=>{}},false);
    const profile:BirthProfile={
      id:randomUUID(),customerName:'M454 clone绑定回归家庭',surname:'林',surnamePinyin:'lín',
      fatherName:'',motherName:'',gender:'中性',calendar:'solar',birthDate:'2026-10-17',
      leapMonth:false,birthTime:'09:30',timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',
      notes:'真实存储行与启动后clone绑定回归',renMethod:'none',timeBasis:'civil',
      monthAuthorityMethod:'no-fixed-day/1.0.0',seasonalMethod:'no-monthly/1.0.0',
    };
    const preferences=normalizePreferences({
      length:2,preferredElements:['水'],requiredChars:'明',generationChar:'',forbiddenChars:'',elderTaboo:'',
      style:'自然',meanings:'',industry:'',numerology:false,zodiacRules:false,
    });
    const generated=(await service.generate(profile,preferences)).session;
    const baseline=store.readVerifiedSession(generated.id);expect(baseline).toBeDefined();
    if(!baseline)throw new Error('M454 genuine generated row was not saved');
    expect([NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION]).toContain(baseline.namingRules?.version);
    expect(baseline.candidates.length).toBeGreaterThan(0);
    expect(baseline.profile.fatherName).toBe('');expect(baseline.profile.motherName).toBe('');
    expect(baseline.factVerification?.status).toMatch(/^verified-(builtin|archive)$/);
    originalClone=Object.getOwnPropertyDescriptor(globalThis,'structuredClone');
    if(!originalClone||!Object.hasOwn(originalClone,'value')||typeof originalClone.value!=='function'||nodeTypes.isProxy(originalClone.value))throw new Error('M454 execution requires the agreed ready own-data clone platform service');
    let cloneCalls=0;
    const replacementError=new Error('M454 replacement structuredClone was called');
    const replacement=function(..._args:unknown[]):never{cloneCalls++;throw replacementError;};
    const descriptor=Object.create(null) as PropertyDescriptor;
    descriptor.value=replacement;descriptor.writable=originalClone.writable;
    descriptor.enumerable=originalClone.enumerable;descriptor.configurable=originalClone.configurable;
    let observed:unknown;
    Object.defineProperty(globalThis,'structuredClone',descriptor);wrapperInstalled=true;
    // Keep the hook window free of expect helpers and test-side clone calls.
    // In particular, do not compare against legacy under this changed contract:
    // old public lookups may legitimately call and catch/propagate the hook.
    try{store.readVerifiedSession(generated.id);}catch(error){observed=error;}
    finally{Object.defineProperty(globalThis,'structuredClone',originalClone);wrapperInstalled=false;}

    expect(observed).toBeInstanceOf(Error);expect(observed).not.toBe(replacementError);
    expect((observed as Error).message).toBe('固定命名引文的启动平台克隆绑定发生变化。');
    expect(cloneCalls).toBe(0);
    expect(Object.getOwnPropertyDescriptor(globalThis,'structuredClone')).toEqual(originalClone);
    expect(store.readVerifiedSession(generated.id)?.factVerification).toEqual(baseline.factVerification);
    complete=true;
  }finally{
    if(wrapperInstalled&&originalClone)Object.defineProperty(globalThis,'structuredClone',originalClone);
    try{await service?.closeCmnReadingWorker();}finally{store?.db?.close();}
    if(complete){
      const resolved=resolve(userDir);if(dirname(resolved)!==ownedRoot)throw new Error('M454 cleanup path escaped its exact owned root');
      rmSync(resolved,{recursive:true,force:true});
    }else{console.error('M454_STORE_CLONE_BINDING_RETAINED',userDir);}
  }
});
