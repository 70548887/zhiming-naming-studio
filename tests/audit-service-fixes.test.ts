import {afterAll,afterEach,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {createServer,type Server,type ServerResponse} from 'node:http';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {EndpointSecretStorage} from '../src/main/credentials';
import type {BirthProfile,NamingPreferences,NamingSession,StudioSettings} from '../src/shared/types';

const profile:BirthProfile={id:'audit-106-customer',customerName:'回归家长',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:'09:30',leapMonth:false,timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''};
const preferences:NamingPreferences={length:2,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',style:'清朗自然',meanings:'平安',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false};
const brand=(s:StudioSettings)=>({studioName:s.studioName,contact:s.contact,logoDataUrl:s.logoDataUrl});
const ai=(s:StudioSettings)=>({apiBaseUrl:s.apiBaseUrl,model:s.model,timeoutMs:s.timeoutMs,useAi:s.useAi});

let directory:string,store:Store,service:StudioService,secret:EndpointSecretStorage;
let server:Server,baseUrl:string,received:(()=>void)|undefined,response:ServerResponse|undefined,released=false;

beforeAll(async()=>{
  server=createServer(async(req,res)=>{
    for await(const _ of req){/* Consume the real HTTP body before signalling the race. */}
    if(released){res.statusCode=503;res.end('released local fixture unavailable');return;}
    response=res;received?.();
  });
  await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));
  baseUrl=`http://127.0.0.1:${(server.address() as {port:number}).port}/v1`;
});
beforeEach(async()=>{
  directory=mkdtempSync(join(tmpdir(),'naming-service-106-'));
  store=await new Store(directory,resolve('data'),resolve('node_modules/sql.js/dist/sql-wasm.wasm')).init();
  // This test protector is local fixture data, never a user's OS credential or AI key.
  secret=new EndpointSecretStorage(join(directory,'fixture.key'),{isEncryptionAvailable:()=>true,encryptString:value=>Buffer.from(value),decryptString:value=>value.toString()});
  service=new StudioService(store,secret);received=undefined;response=undefined;released=false;
});
afterEach(()=>{
  vi.restoreAllMocks();response?.destroy();store?.db.close();
  if(directory)rmSync(directory,{recursive:true,force:true});
});
afterAll(async()=>{server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));});

async function delayedGeneration(saved:boolean){
  if(saved)service.saveProfile(profile);
  service.saveAiSettings({apiBaseUrl:baseUrl,model:'local-race-fixture',timeoutMs:5000,useAi:true},'LOCAL-FIXTURE-NOT-A-REAL-KEY');
  const arrived=new Promise<void>(done=>{received=done;});
  // Attach rejection immediately: stale work must reject after the fixture is released.
  const completion=service.generate(profile,preferences).then(value=>({value,error:undefined}),error=>({value:undefined,error}));
  await arrived;
  return {completion,release:()=>{released=true;response!.statusCode=503;response!.end('delayed local fixture unavailable');}};
}

describe('1.0.6 settings submit only the selected section', { timeout: 15_000 },()=>{
  it('saves a brand while ignoring invalid unsaved AI fields and keeps the endpoint-bound key',()=>{
    const original=service.saveAiSettings({apiBaseUrl:baseUrl,model:'saved-model',timeoutMs:15000,useAi:true},'LOCAL-ORIGINAL-KEY');
    const keyBytes=readFileSync(join(directory,'fixture.key')),write=vi.spyOn(secret,'write');
    const saved=service.saveBrand({studioName:'新的报告品牌',contact:'品牌联系方式',logoDataUrl:'',apiBaseUrl:'https://unsaved.example/v1',model:'dirty-model',timeoutMs:0,useAi:false} as any);
    expect(brand(saved)).toEqual({studioName:'新的报告品牌',contact:'品牌联系方式',logoDataUrl:''});
    expect(ai(saved)).toEqual(ai(original));expect(saved.hasApiKey).toBe(true);
    expect(write).not.toHaveBeenCalled();expect(readFileSync(join(directory,'fixture.key')).equals(keyBytes)).toBe(true);
    expect(secret.read(baseUrl)).toBe('LOCAL-ORIGINAL-KEY');
    expect(secret.read('https://unsaved.example/v1')).toBe('');
  });

  it('saves AI configuration while ignoring invalid unsaved brand fields',()=>{
    const original=service.saveBrand({studioName:'已保存品牌',contact:'已保存联系方式',logoDataUrl:''});
    const saved=service.saveAiSettings({apiBaseUrl:baseUrl,model:'fixture-model',timeoutMs:20000,useAi:true,studioName:{invalid:true},contact:'unsaved',logoDataUrl:'bad-image'} as any,'LOCAL-AI-KEY');
    expect(brand(saved)).toEqual(brand(original));expect(saved).toMatchObject({apiBaseUrl:baseUrl,model:'fixture-model',timeoutMs:20000,useAi:true,hasApiKey:true});
  });

  it('rejects invalid AI settings before modifying the settings record or protected key',()=>{
    service.saveAiSettings({apiBaseUrl:baseUrl,model:'saved-model',timeoutMs:15000,useAi:true},'LOCAL-KEEP-KEY');
    const before=store.backupBytes(),keyBefore=readFileSync(join(directory,'fixture.key'));
    expect(()=>service.saveAiSettings({apiBaseUrl:baseUrl+'/dirty',model:'bad',timeoutMs:0,useAi:true},'LOCAL-REPLACEMENT')).toThrow();
    expect(Buffer.from(store.backupBytes()).equals(Buffer.from(before))).toBe(true);expect(readFileSync(join(directory,'fixture.key')).equals(keyBefore)).toBe(true);
  });

  it('rolls back a scoped AI save if settings persistence fails',()=>{
    service.saveAiSettings({apiBaseUrl:baseUrl,model:'saved-model',timeoutMs:15000,useAi:true},'LOCAL-KEEP-KEY');
    const before=store.backupBytes(),oldSettings=service.bootstrap().settings;
    vi.spyOn(store,'put').mockImplementationOnce(()=>{throw new Error('fixture settings write failure');});
    expect(()=>service.saveAiSettings({apiBaseUrl:baseUrl+'/new',model:'next',timeoutMs:20000,useAi:true},'LOCAL-NEW-KEY')).toThrow('fixture settings write failure');
    expect(Buffer.from(store.backupBytes()).equals(Buffer.from(before))).toBe(true);expect(service.bootstrap().settings).toEqual(oldSettings);
    expect(secret.read(baseUrl)).toBe('LOCAL-KEEP-KEY');expect(secret.read(baseUrl+'/new')).toBe('');
  });
});

describe('1.0.6 save and restore share complete session invariants', { timeout: 15_000 },()=>{
  it('rejects duplicate/missing candidate IDs and invalid review notes without changing bytes or history',async()=>{
    const session=(await service.generate(profile,preferences)).session,before=store.backupBytes();
    const mutations:((s:NamingSession)=>void)[]=[
      s=>{s.candidates[1]=structuredClone(s.candidates[0]);},
      s=>{s.candidates.pop();},
      s=>{(s as any).reviewNote={not:'text'};},
      s=>{s.reviewNote='长'.repeat(10001);},
    ];
    for(const mutate of mutations){
      const invalid=structuredClone(session);mutate(invalid);
      expect(()=>service.saveSession(invalid)).toThrow();
      expect(Buffer.from(store.backupBytes()).equals(Buffer.from(before))).toBe(true);expect(service.listHistory(session.id)).toEqual([]);
    }
  });

  it('round trips generated, reviewed and restored history through the exported SQLite backup',async()=>{
    const original=(await service.generate(profile,preferences)).session;
    const reviewed=structuredClone(original);reviewed.reviewNote='方案审阅意见';reviewed.candidates[0].reviewNote='单名审阅意见';reviewed.candidates[0].favorite=true;
    const current=service.saveSession(reviewed),revision=service.listHistory(original.id)[0];
    service.restoreHistory(original.id,revision.id,current.reviewRevision,current.reviewToken);const backup=store.backupBytes();
    service.saveProfile({...profile,customerName:'备份后的临时更改'});store.restore(backup);
    const state=service.bootstrap();expect(state.profiles[0].customerName).toBe(profile.customerName);
    expect(state.sessions[0].reviewNote).toBe(original.reviewNote);
    expect(service.listHistory(original.id)).toHaveLength(2);
    expect(service.listHistory(original.id).some(r=>r.session.reviewNote==='方案审阅意见'&&r.session.candidates[0].reviewNote==='单名审阅意见')).toBe(true);
  });
});

describe('1.0.6 delayed real HTTP generation cannot overwrite later customer actions', { timeout: 15_000 },()=>{
  it.each([true,false])('does not recreate a deleted customer (previously persisted: %s)',async saved=>{
    const pending=await delayedGeneration(saved);service.deleteProfile(profile.id);
    const afterDelete=store.backupBytes();pending.release();const result=await pending.completion;
    expect(result.error).toBeInstanceOf(Error);expect(result.value).toBeUndefined();
    expect(store.rows('profiles')).toEqual([]);expect(store.rows('sessions')).toEqual([]);expect(Buffer.from(store.backupBytes()).equals(Buffer.from(afterDelete))).toBe(true);
  });

  it.each([true,false])('keeps a newer profile edit when an earlier generation finishes (previously persisted: %s)',async saved=>{
    const pending=await delayedGeneration(saved),edited={...profile,customerName:'等待期间的新编辑',notes:'此内容必须保留'};
    service.saveProfile(edited);const afterEdit=store.backupBytes();pending.release();const result=await pending.completion;
    expect(result.error).toBeInstanceOf(Error);expect(result.value).toBeUndefined();
    expect(store.rows<BirthProfile>('profiles')[0]).toMatchObject(edited);expect(store.rows('sessions')).toEqual([]);expect(Buffer.from(store.backupBytes()).equals(Buffer.from(afterEdit))).toBe(true);
  });

  it('rejects an in-flight generation after restoring a backup even when the customer fields are identical',async()=>{
    service.saveProfile(profile);const archive=store.backupBytes();
    const pending=await delayedGeneration(false);store.restore(archive);
    const afterRestore=store.backupBytes();pending.release();const result=await pending.completion;
    expect(result.error).toBeInstanceOf(Error);expect(result.value).toBeUndefined();
    expect(store.rows<BirthProfile>('profiles')[0]).toMatchObject(profile);expect(store.rows('sessions')).toEqual([]);expect(Buffer.from(store.backupBytes()).equals(Buffer.from(afterRestore))).toBe(true);
  });

  it('allows the original customer generation to commit after an unrelated customer is edited',async()=>{
    const pending=await delayedGeneration(true);service.saveProfile({...profile,id:'unrelated-customer',customerName:'另一个客户'});
    pending.release();const result=await pending.completion;
    expect(result.error).toBeUndefined();expect(result.value?.session.profileId).toBe(profile.id);
    expect(store.rows('profiles')).toHaveLength(2);expect(store.rows('sessions')).toHaveLength(1);
    expect(store.rows<BirthProfile>('profiles').find(p=>p.id==='unrelated-customer')?.customerName).toBe('另一个客户');
  });

  it('does not partially save a customer when the combined generated session write fails',async()=>{
    const before=store.backupBytes();
    vi.spyOn(store as any,'persist').mockImplementationOnce(()=>{throw new Error('fixture atomic commit failure');});
    await expect(service.generate(profile,preferences)).rejects.toThrow('fixture atomic commit failure');
    expect(store.rows('profiles')).toEqual([]);expect(store.rows('sessions')).toEqual([]);expect(Buffer.from(store.backupBytes()).equals(Buffer.from(before))).toBe(true);
  });
});
