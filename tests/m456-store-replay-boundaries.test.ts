/** Source-only M456 addition. Run only in root's authorized isolated window,
 * with the final immutable M454 R3 product overlay on base 097a4bc.
 * This file never issues a Store replay capsule and never imports a test-only
 * authority. Invalid caller objects prove rejection only; successful native
 * SQL reads use the real Store issuer. Default test/hook budgets are unchanged.
 * The first, independently selectable positive leaves global crypto, methods,
 * factories and source I/O untouched. Its success alone does not prove owned
 * context activation: root observes factory/runner hits separately using Node
 * precise coverage in the test process, without changing function identities.
 */
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import {resolve,join} from 'node:path';
import {createRequire,syncBuiltinESMExports} from 'node:module';
import {webcrypto,createHash} from 'node:crypto';
import {takeStoredCandidateFactReplayInput} from '../src/main/store';
import {verifyStoredCandidateFacts} from '../src/main/candidate-facts';
import {NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION} from '../src/shared/naming-rules';
import type {NamingSession} from '../src/shared/types';
import {openReplayFixture,closeReplayFixture,currentJson,customerDisk,type ReplayFixture} from './helpers/m456-store-replay-fixture';

const nodeFs=createRequire(import.meta.url)('node:fs') as typeof import('node:fs');
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const normalize=(file:string)=>resolve(file).toLowerCase();
let fixture:ReplayFixture|undefined,completed=0;
function context():ReplayFixture {if(!fixture)throw new Error('M456 real generation setup did not finish');return fixture;}
function fresh():NamingSession {
  const {store,session}=context(),saved=store.readVerifiedSession(session.id);
  if(!saved)throw new Error('M456 genuine generated SQL row was not read back');
  expect(saved).toEqual(session);return saved;
}
/** Full byte comparison for large binary payloads. Match lengths separately,
 * then use the native Buffer comparator over the complete Uint8Array view.
 * No hash, prefix, sampled byte or enumerable-index matcher substitutes for
 * complete equality; byteOffset/byteLength preserve sliced-view boundaries. */
function expectBytesEqual(actual:unknown,expected:Uint8Array):void {
  if(!(actual instanceof Uint8Array))throw new TypeError('M456 expected an actual binary Uint8Array or Buffer');
  expect(actual.byteLength).toBe(expected.byteLength);
  const bytes=Buffer.isBuffer(actual)?actual:Buffer.from(actual.buffer,actual.byteOffset,actual.byteLength);
  expect(bytes.equals(expected)).toBe(true);
}
beforeAll(async()=>{
  // Do not substitute a test crypto object or trust an eligibility flag. If
  // the actual execution realm is incompatible, keep the failure visible.
  expect(globalThis.crypto).toBe(webcrypto);
  fixture=await openReplayFixture();
  expect([NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION]).toContain(fixture.session.namingRules?.version);
  expect(fixture.session.candidates).toHaveLength(1);
  expect(fixture.session.candidates[0].givenName).toBe('安宁');
  expect(fixture.session.factVerification?.status).toBe('verified-builtin');
});
afterAll(async()=>{if(fixture)await closeReplayFixture(fixture,completed===4);});

describe('M456 genuine Store-owned replay boundaries',()=>{
  // Stable -t selector for root's independent precise-coverage observation.
  // No negative case, Buffer fault or callback injection is needed to select it.
  it('genuine positive reads a saved native SQL session with the runtime untouched',()=>{
    const ctx=context(),disk=customerDisk(ctx),original=currentJson(ctx);
    fresh();
    expect(currentJson(ctx)).toBe(original);
    expectBytesEqual(customerDisk(ctx),disk);
    // Observable guarantee: true saved-session read and unchanged customer
    // bytes. This is not an assertion that the owned computation was entered;
    // an eligible=false legacy outcome may also satisfy these assertions.
    completed++;
  });

  it('rejects unknown, forged and all-trap Proxy caller objects before any caller callback executes',()=>{
    const {store,session}=context(),before=customerDisk(context());
    let callbacks=0,traps=0,getters=0;
    const sentinel=new Error('M456 caller code must never run');
    const callback=()=>{callbacks++;throw sentinel;};
    const trap=()=>{traps++;throw sentinel;};
    const allTraps:ProxyHandler<object>={
      apply:trap,construct:trap,defineProperty:trap,deleteProperty:trap,get:trap,
      getOwnPropertyDescriptor:trap,getPrototypeOf:trap,has:trap,isExtensible:trap,
      ownKeys:trap,preventExtensions:trap,set:trap,setPrototypeOf:trap,
    };
    const unknown={},proxy=new Proxy({},allTraps);
    const forged={
      session:structuredClone(session),archive:{verified:true},builtin:{verified:true},
      directory:context().dataDir,readPack:callback,inspect:callback,evaluate:callback,
      verified:true,trusted:true,eligible:true,owned:true,issuer:store,
    };
    const accessor=Object.create(null) as object;
    Object.defineProperty(accessor,'session',{enumerable:true,get(){getters++;throw sentinel;}});
    // Extra arguments deliberately carry arbitrary caller code. Type casts
    // only permit the hostile call shape; rejection must come from runtime
    // issuer membership, never a TypeScript brand or @internal annotation.
    const consumers=[takeStoredCandidateFactReplayInput,verifyStoredCandidateFacts] as Array<(...args:unknown[])=>unknown>;
    for(const capsule of [unknown,proxy,forged,accessor])for(const consume of consumers)
      expect(()=>consume(capsule,callback)).toThrow('本次内部读取凭据');
    expect(callbacks).toBe(0);expect(traps).toBe(0);expect(getters).toBe(0);
    // No positive capsule is fabricated: this positive goes through real SQL.
    fresh();expectBytesEqual(customerDisk(context()),before);
    completed++;
  });

  it('rejects real SQL row identity/ownership and archive BLOB corruption, restoring each original in finally',()=>{
    const ctx=context(),{store,session}=ctx,original=currentJson(ctx),disk=customerDisk(ctx);
    const rejectsWithoutWriting=(pattern:RegExp)=>{
      const corrupted=store.db.export();
      expect(()=>store.readVerifiedSession(session.id)).toThrow(pattern);
      expect(()=>store.backupBytes()).toThrow('备份已取消');
      expectBytesEqual(customerDisk(ctx),disk);
      expectBytesEqual(store.db.export(),corrupted);
    };
    // One case per binding, not a second copy of history-row-binding's matrix.
    // These are actual SQL bytes on the private native-reader branch, not a
    // caller object submitted directly to a public validator.
    for(const change of [
      (value:NamingSession)=>{value.id='m456-other-json-id';},
      (value:NamingSession)=>{value.profileId='m456-unrelated-profile';},
    ]){
      const value=JSON.parse(original) as NamingSession;change(value);
      try {
        store.db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(value),session.id]);
        rejectsWithoutWriting(/编号|归属|客户|字段/);
      }
      finally {store.db.run('UPDATE sessions SET json=? WHERE id=?',[original,session.id]);}
      expect(currentJson(ctx)).toBe(original);fresh();
    }
    const archived=store.db.exec('SELECT sha256,version,pack FROM knowledge_archives WHERE version=?',[session.dataVersion])[0]?.values[0];
    if(!archived||typeof archived[0]!=='string'||!(archived[2] instanceof Uint8Array))
      throw new Error('M456 true generation must archive its complete actual knowledge package');
    const originalPack=new Uint8Array(archived[2]);
    expect(sha(originalPack)).toBe(archived[0]);expect(archived[1]).toBe(session.dataVersion);
    const changed=new Uint8Array(originalPack);changed[changed.length-1]^=1;
    expect(sha(changed)).not.toBe(archived[0]);
    try {
      store.db.run('UPDATE knowledge_archives SET pack=? WHERE sha256=?',[changed,archived[0]]);
      rejectsWithoutWriting(/完整原包哈希不一致/);
    }
    finally {store.db.run('UPDATE knowledge_archives SET pack=? WHERE sha256=?',[originalPack,archived[0]]);}
    const restored=store.db.exec('SELECT pack FROM knowledge_archives WHERE sha256=?',[archived[0]])[0]?.values[0]?.[0];
    expectBytesEqual(restored,originalPack);fresh();expectBytesEqual(customerDisk(ctx),disk);
    // Scope: this corrupt BLOB is rejected by the preceding SHA gate. It does
    // not execute or prove the later four-table deepEqual comparison branch.
    completed++;
  });

  it('authenticates an exact fixed rule JSON again on a new private SQL read and propagates a changed-buffer failure',()=>{
    const ctx=context(),{store,session}=ctx;
    fresh(); // Warm any legitimate existing caches before injecting the fault.
    const disk=customerDisk(ctx),database=store.db.export();
    const target=join(ctx.dataDir,'naming-editorial-v6.json'),targetKey=normalize(target);
    const previous=nodeFs.readFileSync,originalSource=previous(target),originalSha=sha(originalSource);
    let freshTargetReads=0,injections=0,thrown:unknown;
    const patched=((...args:unknown[])=>{
      const bytes=Reflect.apply(previous,nodeFs,args);
      if(typeof args[0]!=='string'||normalize(args[0])!==targetKey)return bytes;
      freshTargetReads++;
      if(!Buffer.isBuffer(bytes))throw new Error('M456 exact rule authentication must read a raw Buffer');
      // Appending whitespace leaves valid JSON, changes its fixed byte SHA,
      // and cannot be repaired by trusting a cached parse or caller verdict.
      injections++;return Buffer.concat([bytes,Buffer.from(' ')]);
    }) as typeof previous;
    expect(nodeFs).toBe(fs);
    try {
      nodeFs.readFileSync=patched;syncBuiltinESMExports();
      try {store.readVerifiedSession(session.id);} catch(error) {thrown=error;}
    } finally {
      nodeFs.readFileSync=previous;syncBuiltinESMExports();
    }
    expect(nodeFs.readFileSync).toBe(previous);
    expect(freshTargetReads).toBeGreaterThan(0);expect(injections).toBe(freshTargetReads);
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toMatch(/资料校验失败.*(?:摘要|哈希|原件|不一致)/);
    expectBytesEqual(customerDisk(ctx),disk);expectBytesEqual(store.db.export(),database);
    expect(sha(previous(target))).toBe(originalSha);
    expectBytesEqual(previous(target),originalSource);
    fresh();expectBytesEqual(customerDisk(ctx),disk);
    // This proves observable reread/failure propagation with untouched source
    // files. It does not mint a capsule, certify all-table comparison coverage,
    // or claim which CPU-only stage follows the observed filesystem read.
    completed++;
  });
});
