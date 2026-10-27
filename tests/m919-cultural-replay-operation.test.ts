import {afterAll,afterEach,beforeAll,describe,expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {existsSync,mkdtempSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import initSqlJs,{type Database,type SqlJsStatic} from 'sql.js';
import {bindCompactCustomerDatabase} from '../src/main/compact-customer-store';
import {Store} from '../src/main/store';
import {decodeCustomerBackup} from '../src/main/customer-backup-envelope';
import {readCulturalEvidenceCapsule} from '../src/main/cultural-source-chunks';
import {decodeCulturalRevisionLeaf} from '../src/main/cultural-revision-codec';
import {decodeSnapshotBlobText,SNAPSHOT_CODEC} from '../src/main/snapshot-blob-codec';
import {parseSnapshotJsonStrict} from '../src/main/snapshot-json-spans';
import {culturalCanonicalJson} from '../src/domain/qimen-cultural-comparison-canonical';
import {assertCompactCulturalSemanticsV1,prepareCompactCulturalSemanticsV1,withCompactCulturalSourceReplayOperation as within} from '../src/main/compact-cultural-semantics';
import type {CulturalOfflineReplayAPI,CulturalOfflineReplayInput} from '../src/shared/qimen-cultural-offline-v1';
import type {BirthProfile,NamingSession} from '../src/shared/types';

// Successful replies always come from the real fixed offline authenticator.
// The fault switch only rejects; it cannot manufacture an admitted source.
const observation=vi.hoisted(()=>({calls:0,verified:0,reject:false,instances:[] as unknown[]}));
vi.mock('../src/main/qimen-cultural-offline-v1',async()=>{
  const actual=await vi.importActual<typeof import('../src/main/qimen-cultural-offline-v1')>('../src/main/qimen-cultural-offline-v1');
  return{...actual,prepareCulturalOfflineReplayV1:async(configuration:{scratchRoot:string})=>{
    const original=await actual.prepareCulturalOfflineReplayV1(configuration);observation.instances.push(original);
    return Object.freeze({...original,verify(input:CulturalOfflineReplayInput){
      observation.calls++;
      if(observation.reject)return{kind:'rejected' as const,reason:'source-unavailable' as const,message:'M919 deliberately injected rejection after a real successful source verification.'};
      const reply=original.verify(input);if(reply.kind==='verified-replay')observation.verified++;return reply;
    }});
  }};
});

const fixtureDirectory=process.env.M919_REPLAY_FIXTURE_DIR??resolve('..','evidence');
const backupPath=join(fixtureDirectory,'synthetic-three-revisions.nsbk'),identityPath=join(fixtureDirectory,'synthetic-three-revisions-identity.json');
const fixtureAvailable=existsSync(backupPath)&&existsSync(identityPath),requireFixture=process.env.M919_REPLAY_REQUIRE_FIXTURE==='1';
const FIXTURE_SHA='c80e8de8521d16580cacfad5721fbcd06b1d2d8797066f3d33a54f3aa4facc26';
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
interface FixtureIdentity {schema:string;backupSha256:string;comparisonId:string;profileId:string;sourceSessionId:string;sequence:number;}
type ReplayOperation=Parameters<Parameters<typeof within>[0]>[0];
let SQL:SqlJsStatic,sqlite:Uint8Array,identity:FixtureIdentity;

afterEach(()=>{observation.reject=false;});

describe('M919 synchronous source replay operation lifetime',()=>{
  it('retires ordinary and throwing scopes and rejects nested entry before its body runs',()=>{
    expect(within(()=>17)).toBe(17);const failure=new Error('M919 scope body failure');
    expect(()=>within(()=>{throw failure;})).toThrow(failure);expect(within(()=>19)).toBe(19);
    let entered=false;
    within(()=>{expect(()=>within(()=>{entered=true;})).toThrow();expect(entered).toBe(false);});
    expect(within(()=>23)).toBe(23);
  });
  it('rejects native promises and inherited thenables without invoking an accessor',()=>{
    expect(()=>within(()=>Promise.resolve(1))).toThrow();expect(within(()=>29)).toBe(29);
    let reads=0,calls=0;
    const accessor=Object.create(Object.defineProperty({},'then',{get(){reads++;return()=>{calls++;};}}));
    expect(()=>within(()=>accessor)).toThrow();expect(reads).toBe(0);expect(calls).toBe(0);
    expect(()=>within(()=>Object.create({then(){calls++;}}))).toThrow();expect(calls).toBe(0);
    expect(within(()=>31)).toBe(31);
  });
  it('rejects opaque callbacks and return values without executing their traps',()=>{
    let traps=0;const callback=new Proxy(()=>1,{apply(){traps++;return 1;}});
    expect(()=>within(callback)).toThrow();
    expect(()=>within(()=>new Proxy({},{getOwnPropertyDescriptor(){traps++;return undefined;},getPrototypeOf(){traps++;return null;}}))).toThrow();
    expect(traps).toBe(0);expect(within(()=>37)).toBe(37);
  });
  it('retires its scope even when Map.prototype.clear is changed to throw inside the body',()=>{
    const slot=Object.getOwnPropertyDescriptor(Map.prototype,'clear');if(!slot)throw Error('Native Map clear descriptor missing');
    try{expect(within(()=>{
      Object.defineProperty(Map.prototype,'clear',{...slot,value(){throw Error('M919 hostile Map.prototype.clear');}});return 41;
    })).toBe(41);}finally{Object.defineProperty(Map.prototype,'clear',slot);}
    expect(within(()=>43)).toBe(43);
  });
});

function fresh():Database{
  const database=new SQL.Database(new Uint8Array(sqlite));bindCompactCustomerDatabase(database);return database;
}
function checkedScan(database:Database,operation?:ReplayOperation){
  const result=assertCompactCulturalSemanticsV1(database,operation===undefined?{}:{sourceReplayOperation:operation});expect(result.revisionCount).toBe(3);return result;
}
function firstChunk(database:Database):string{
  const row=database.exec('SELECT b.sha,b.raw_bytes,b.codec,b.payload FROM cultural_comparison_revisions r JOIN snapshot_blobs b ON b.sha=r.capsule_sha WHERE r.comparison_id=? ORDER BY r.revision LIMIT 1',[identity.comparisonId])[0]?.values[0];
  if(!row||typeof row[0]!=='string'||typeof row[1]!=='number'||row[2]!==SNAPSHOT_CODEC||!(row[3] instanceof Uint8Array))throw Error('Exact fixture capsule SQL tuple missing');
  const capsule=readCulturalEvidenceCapsule(parseSnapshotJsonStrict(decodeSnapshotBlobText({sha:row[0],rawBytes:row[1],codec:SNAPSHOT_CODEC,payload:row[3]})));
  const sha=capsule.assets[0]?.chunks[0]?.blob.sha;if(!sha)throw Error('The exact fixture must contain a genuine referenced source chunk');return sha;
}
function alterWithOriginalTriggerRestored(database:Database,name:string,alter:()=>void){
  const sql=database.exec("SELECT sql FROM sqlite_master WHERE type='trigger' AND name=?",[name])[0]?.values[0]?.[0];
  if(typeof sql!=='string'||!/^\w+$/.test(name))throw Error('Exact immutable trigger missing');
  database.run('DROP TRIGGER '+name);try{alter();}finally{database.run(sql);}
  expect(database.exec("SELECT sql FROM sqlite_master WHERE type='trigger' AND name=?",[name])[0]?.values[0]?.[0]).toBe(sql);
}
const mutations:readonly {name:string;apply:(database:Database)=>void}[]=[
  {name:'deleted actual referenced chunk',apply(database){const sha=firstChunk(database);database.run('DELETE FROM snapshot_blobs WHERE sha=?',[sha]);expect(database.getRowsModified()).toBe(1);}},
  {name:'changed actual compressed chunk payload',apply(database){
    const sha=firstChunk(database),payload=database.exec('SELECT payload FROM snapshot_blobs WHERE sha=?',[sha])[0]?.values[0]?.[0];
    if(!(payload instanceof Uint8Array)||payload.length<1)throw Error('Exact source payload missing');const changed=new Uint8Array(payload);changed[Math.floor(changed.length/2)]^=0x40;
    alterWithOriginalTriggerRestored(database,'snapshot_blob_no_update',()=>{database.run('UPDATE snapshot_blobs SET payload=? WHERE sha=?',[changed,sha]);expect(database.getRowsModified()).toBe(1);});
  }},
  {name:'changed actual SQL owner linkage',apply(database){
    // Only this private in-memory fault database temporarily suspends FKs to
    // model corruption. Original triggers and FK enforcement are restored.
    database.run('PRAGMA foreign_keys=OFF');try{alterWithOriginalTriggerRestored(database,'cultural_head_identity_no_change',()=>{
      database.run('UPDATE cultural_comparisons SET profile_id=?,review_token=? WHERE id=?',['m919-wrong-owner','m919-fault-rotated-token',identity.comparisonId]);expect(database.getRowsModified()).toBe(1);
    });}finally{database.run('PRAGMA foreign_keys=ON');}
    expect(database.exec('PRAGMA foreign_keys')[0]?.values[0]?.[0]).toBe(1);
  }},
  {name:'changed actual immutable receipt bytes',apply(database){alterWithOriginalTriggerRestored(database,'cultural_receipt_no_update',()=>{
    database.run('UPDATE cultural_write_receipts SET request_sha=? WHERE comparison_id=? AND result_revision=1',['f'.repeat(64),identity.comparisonId]);expect(database.getRowsModified()).toBe(1);
  });}},
  {name:'changed actual source-session generation',apply(database){
    const raw=database.exec('SELECT json FROM sessions WHERE id=?',[identity.sourceSessionId])[0]?.values[0]?.[0];if(typeof raw!=='string')throw Error('Exact source-session SQL missing');
    const session=JSON.parse(raw) as NamingSession;session.createdAt='2000-01-01T00:00:00.000Z';database.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(session),identity.sourceSessionId]);
    expect(database.exec('SELECT json_extract(json,\'$.createdAt\') FROM sessions WHERE id=?',[identity.sourceSessionId])[0]?.values[0]?.[0]).toBe(session.createdAt);
  }},
];

// Ordinary repository runs skip only the external-case cases when the fixture
// is absent. The recorded M919 command sets REQUIRE_FIXTURE so a missing file
// fails rather than allowing a skipped case to be reported as acceptance.
describe.skipIf(!fixtureAvailable&&!requireFixture)('M919 exact nonempty NSBK replay cache mutation boundaries',{timeout:120000},()=>{
  beforeAll(async()=>{
    expect(fixtureAvailable,'M919 requires the sealed NSBK and its identity sidecar').toBe(true);
    const backup=readFileSync(backupPath);identity=JSON.parse(readFileSync(identityPath,'utf8')) as FixtureIdentity;
    expect(identity.schema).toBe('m918-real-restore-cost-fixture/1');expect(identity.backupSha256).toBe(FIXTURE_SHA);expect(hash(backup)).toBe(FIXTURE_SHA);
    sqlite=new Uint8Array(decodeCustomerBackup(backup).sqlite);
    SQL=await initSqlJs({locateFile:()=>createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm')});
    await prepareCompactCulturalSemanticsV1({scratchRoot:tmpdir()});
    const database=fresh();try{expect(database.exec('SELECT id,profile_id,source_session_id,current_revision FROM cultural_comparisons')[0]?.values).toEqual([[identity.comparisonId,identity.profileId,identity.sourceSessionId,3]]);}finally{database.close();}
  },30000);
  afterAll(()=>{for(const instance of observation.instances)(instance as CulturalOfflineReplayAPI).close();});

  it('reuses only real source authentication while every same-operation SQL mutation still rejects',()=>{
    const original=fresh();try{
      within(operation=>{
        const before=observation.verified;checkedScan(original,operation);expect(observation.verified).toBeGreaterThan(before);
        let authenticated=observation.calls;checkedScan(original,operation);expect(observation.calls).toBe(authenticated);
        // An unrelated public read cannot inherit the active restore token.
        checkedScan(original);expect(observation.calls).toBeGreaterThan(authenticated);authenticated=observation.calls;
        checkedScan(original,operation);expect(observation.calls).toBe(authenticated);
        for(const mutation of mutations){const damaged=fresh();try{mutation.apply(damaged);expect(()=>checkedScan(damaged,operation),mutation.name).toThrow();expect(observation.calls,mutation.name).toBe(authenticated);}finally{damaged.close();}}
      });
      const before=observation.verified;within(operation=>checkedScan(original,operation));expect(observation.verified).toBeGreaterThan(before);
    }finally{original.close();}
  });

  it('rejects the same actual SQL mutations in fresh operations after a successful earlier operation',()=>{
    const original=fresh();try{within(operation=>checkedScan(original,operation));}finally{original.close();}
    const before=observation.verified;
    for(const mutation of mutations){const damaged=fresh();try{mutation.apply(damaged);expect(()=>within(operation=>checkedScan(damaged,operation)),mutation.name).toThrow();}finally{damaged.close();}}
    // The receipt/session faults occur after fixed-source admission. Their
    // rejection therefore also proves fresh operations delegated real replay.
    expect(observation.verified).toBeGreaterThan(before);
  });

  it('destroys a warmed scope after a body exception and retries source authentication in the next operation',()=>{
    const database=fresh();try{
      const failure=new Error('M919 failure after genuine source authentication'),before=observation.verified;let expired:ReplayOperation|undefined;
      expect(()=>within(operation=>{expired=operation;checkedScan(database,operation);throw failure;})).toThrow(failure);expect(observation.verified).toBeGreaterThan(before);
      const calls=observation.calls;expect(expired).toBeDefined();expect(()=>checkedScan(database,expired)).toThrow();expect(observation.calls).toBe(calls);
      observation.reject=true;expect(()=>within(operation=>checkedScan(database,operation))).toThrow();expect(observation.calls).toBe(calls+1);
      observation.reject=false;expect(within(()=>43)).toBe(43);
    }finally{database.close();}
  });

  it('does real first-source authentication despite Map.prototype.get reporting a forged successful cache hit',()=>{
    const database=fresh(),slot=Object.getOwnPropertyDescriptor(Map.prototype,'get'),nativeGet=Map.prototype.get;
    if(!slot)throw Error('Native Map get descriptor missing');
    try{
      const snapshots:Record<string,string>=Object.create(null);
      for(const row of database.exec('SELECT b.sha,b.raw_bytes,b.codec,b.payload FROM cultural_comparison_revisions r JOIN snapshot_blobs b ON b.sha=r.result_sha WHERE r.comparison_id=? ORDER BY r.revision',[identity.comparisonId])[0]?.values??[]){
        if(typeof row[0]!=='string'||typeof row[1]!=='number'||row[2]!==SNAPSHOT_CODEC||!(row[3] instanceof Uint8Array))throw Error('Exact result SQL tuple missing');
        const result=decodeCulturalRevisionLeaf({sha:row[0],rawBytes:row[1],codec:SNAPSHOT_CODEC,payload:row[3]});snapshots[result.snapshot.snapshotDigest]=culturalCanonicalJson(result.snapshot);
      }
      const snapshotDigest=Object.keys(snapshots)[0];if(!snapshotDigest)throw Error('Exact fixture snapshot missing');
      const fakeKey=['a'.repeat(64),1,'b'.repeat(64),snapshotDigest,'c'.repeat(64)].join(':');
      within(operation=>{
        Object.defineProperty(Map.prototype,'get',{...slot,value:function(this:Map<unknown,unknown>,key:unknown){
          if(typeof key==='string'&&/^[a-f0-9]{64}:\d+:[a-f0-9]{64}:[a-f0-9]{64}:[a-f0-9]{64}$/.test(key))return snapshots[key.split(':')[3]];
          return nativeGet.call(this,key);
        }});
        // Establish that the attack actually affects dynamic Map.get calls.
        expect(new Map().get(fakeKey)).toBe(snapshots[snapshotDigest]);
        const before=observation.verified;checkedScan(database,operation);expect(observation.verified).toBeGreaterThan(before);
      });
    }finally{Object.defineProperty(Map.prototype,'get',slot);database.close();}
    expect(within(()=>53)).toBe(53);
  });

  it('retires a warmed thenable scope before its asynchronous continuation scans again',async()=>{
    const database=fresh();let continuation:Promise<void>|undefined;try{
      let calls=0;
      expect(()=>within(operation=>{
        const before=observation.verified;checkedScan(database,operation);expect(observation.verified).toBeGreaterThan(before);calls=observation.calls;
        continuation=Promise.resolve().then(()=>{
          expect(()=>checkedScan(database,operation)).toThrow();expect(observation.calls).toBe(calls);
          observation.reject=true;expect(()=>checkedScan(database)).toThrow();expect(observation.calls).toBe(calls+1);observation.reject=false;expect(within(()=>47)).toBe(47);
        });
        return continuation;
      })).toThrow();
      expect(continuation).toBeDefined();await continuation;
    }finally{database.close();}
  });

  it('re-authenticates an actual Store commit after prepare, preserves the target on rejection, and retries the same plan',async()=>{
    const directory=mkdtempSync(join(tmpdir(),'m919-actual-restore-operation-'));let target:Store|undefined;
    try{
      target=await new Store(directory,resolve('data'),createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm')).init();
      const source=fresh();let originalProfile:BirthProfile;
      try{const raw=source.exec('SELECT json FROM profiles WHERE id=?',[identity.profileId])[0]?.values[0]?.[0];if(typeof raw!=='string')throw Error('Exact fixture profile SQL missing');originalProfile=JSON.parse(raw) as BirthProfile;}finally{source.close();}
      target.saveProfile({...originalProfile,id:'m919-original-restore-target',customerName:'M919 isolated original restore target',notes:'The exact target bytes must remain before a successful commit.'});
      const file=join(directory,'customers.sqlite'),before=readFileSync(file),beforeFiles=readdirSync(directory).sort(),beforePrepareVerified=observation.verified;
      const plan=target.prepareCustomerRestore(new Uint8Array(readFileSync(backupPath)));
      expect(observation.verified).toBeGreaterThan(beforePrepareVerified);expect(plan.inputCounts.culturalRevisions).toBe(3);
      expect(readFileSync(file).equals(before)).toBe(true);expect(readdirSync(directory).sort()).toEqual(beforeFiles);

      const calls=observation.calls,verified=observation.verified;observation.reject=true;
      try{
        expect(()=>target!.commitCustomerRestore(plan.planId,plan.currentDiskHash)).toThrow();
        expect(observation.calls).toBe(calls+1);expect(observation.verified).toBe(verified);
        expect(readFileSync(file).equals(before)).toBe(true);expect(readdirSync(directory).sort()).toEqual(beforeFiles);
        expect(existsSync(join(directory,'customers.write-lock'))).toBe(false);
      }finally{observation.reject=false;}

      const beforeRetryVerified=observation.verified,result=target.commitCustomerRestore(plan.planId,plan.currentDiskHash);
      expect(observation.verified).toBeGreaterThan(beforeRetryVerified);expect(result.status).toBe('committed');expect(result.restored.culturalRevisions).toBe(3);
      expect(readFileSync(result.preimagePath).equals(before)).toBe(true);expect(readFileSync(file).equals(before)).toBe(false);
      expect(target.culturalStorageCapabilities().version).toBe('customer-compact/3');expect(existsSync(join(directory,'customers.write-lock'))).toBe(false);
      expect(hash(readFileSync(backupPath))).toBe(FIXTURE_SHA);
    }finally{try{target?.db.close();}finally{rmSync(directory,{recursive:true,force:true});}}
  });
});
