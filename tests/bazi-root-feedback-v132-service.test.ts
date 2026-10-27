import{afterAll,beforeAll,describe,expect,it}from'vitest';
import fs from'node:fs';import os from'node:os';import path from'node:path';
import {createHash} from 'node:crypto';
import {buildPreviewFixture} from './helpers/root-feedback-v132-preview-fixture';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import type{BirthProfile,NamingSession}from'../src/shared/types';
import fixture from './fixtures/project-naming-use-m153.json';
import {canonicalPlainJson} from '../src/shared/plain-json';
import {matchesRootFeedbackV132RequestBinding} from '../src/shared/bazi-root-feedback-v132-request-binding';

const root=path.resolve('.'),wasm=path.resolve('node_modules/sql.js/dist/sql-wasm.wasm');
const scratch=fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(),'m758-root-feedback-v132-')));
const userRoot=path.join(scratch,'user');
let assetRoot:string;
let store:Store,service:StudioService;
const profile=structuredClone(fixture.positive.profile) as BirthProfile;

beforeAll(async()=>{
  assetRoot=(await buildPreviewFixture(scratch,root)).assetRoot;
  store=await new Store(userRoot,path.join(root,'data'),wasm).init();
  service=new StudioService(store,{read:()=>'',write:()=>{}},false,undefined,assetRoot);
},60000);
afterAll(()=>{store?.db.close();fs.rmSync(scratch,{recursive:true,force:true});});

describe('M758 r2 Service preview',()=>{
  it('binds the complete raw request before Service normalizes names and assigns an ID',async()=>{
    const database=fs.readFileSync(path.join(store.userDir,'customers.sqlite'));
    const raw:BirthProfile={...profile,id:'',surname:' 林 ',fatherName:' 林泽 ',motherName:' 陈宁 ',birthPlace:'',calendar:'solar',birthDate:'2024-02-10',birthTime:'12:00',timeUnknown:false};
    const original=structuredClone(raw),key=canonicalPlainJson(JSON.parse(JSON.stringify(raw)));
    const result=await service.previewBaziRootFeedbackV132(raw,{fromOutputMonthStem:true});
    expect(result.profileId).toBeTruthy();expect(result.profileId).not.toBe(raw.id);
    expect(result.requestBinding.profileKey).toBe(key);
    expect(matchesRootFeedbackV132RequestBinding(result.requestBinding,key,true)).toBe(true);
    expect(matchesRootFeedbackV132RequestBinding(result.requestBinding,key,false)).toBe(false);
    expect(raw).toEqual(original);
    for(const next of [{...raw,birthDate:'2024-02-11'},{...raw,birthTime:'13:00'}]){
      expect(matchesRootFeedbackV132RequestBinding(result.requestBinding,canonicalPlainJson(JSON.parse(JSON.stringify(next))),true)).toBe(false);
    }
    const sameId={...raw,id:'same-id-binding-service'};
    const first=await service.previewBaziRootFeedbackV132(sameId);
    const second=await service.previewBaziRootFeedbackV132({...sameId,birthDate:'2024-02-11'});
    expect(first.profileId).toBe(second.profileId);
    expect(first.requestBinding.profileKey).not.toBe(second.requestBinding.profileKey);
    expect(matchesRootFeedbackV132RequestBinding(first.requestBinding,second.requestBinding.profileKey,false)).toBe(false);
    expect(first.applicationGate.status).toBe('blocked');expect(second.applicationGate.status).toBe('blocked');
    expect(fs.readFileSync(path.join(store.userDir,'customers.sqlite'))).toEqual(database);
  },30000);

  it('loads the official fixed CJS bundle lazily, binds its resources to the same engine, and stays read-only',async()=>{
    const database=fs.readFileSync(path.join(store.userDir,'customers.sqlite')),result=await service.previewBaziRootFeedbackV132(profile,{fromOutputMonthStem:true});
    expect(result.schema).toBe('bazi-root-feedback-facade/1.3.2-r2');
    expect(result.methodId).toBe('project-bazi-mainchain-145/1.3.2');
    expect(result.entryPolicy).toBe('month-stem-proposal');
    expect(result.applicationGate.status).toBe('blocked');
    expect(result.resourceIdentity.publicationId).toBe('bazi-root-feedback/1.3.2;preview-publication-r2');
    for(const options of [undefined,{}, {fromOutputMonthStem:false}]){const dto=await service.previewBaziRootFeedbackV132(profile,options);expect(dto.entryPolicy).toBe('month-branch-only');}
    expect(fs.readFileSync(path.join(store.userDir,'customers.sqlite'))).toEqual(database);
  },30000);

  it('preserves unknown-hour as conditional preview output and rejects accessor/proxy/options boundaries',async()=>{
    const unknown=structuredClone(profile);unknown.timeUnknown=true;
    const result=await service.previewBaziRootFeedbackV132(unknown);
    expect(result.branches.length).toBeGreaterThan(0);
    expect(result.status).toBe('pending-regime-resolution');
    expect(result.branches.every(branch=>branch.kind==='unknown-hour-interval')).toBe(true);
    const proxy=new Proxy(profile,{});
    await expect(service.previewBaziRootFeedbackV132(proxy)).rejects.toThrow('拒绝代理');
    let getterCalls=0;const accessor={...profile};Object.defineProperty(accessor,'birthDate',{enumerable:true,get(){getterCalls++;return profile.birthDate;}});
    await expect(service.previewBaziRootFeedbackV132(accessor)).rejects.toThrow('访问器');expect(getterCalls).toBe(0);
    await expect(service.previewBaziRootFeedbackV132({...profile,birthDate:'2024-02-30'})).rejects.toThrow();
    const options=Object.create(null);Object.defineProperty(options,'fromOutputMonthStem',{enumerable:true,get(){return true;}});
    await expect(service.previewBaziRootFeedbackV132(profile,options)).rejects.toThrow('访问器');
    await expect(service.previewBaziRootFeedbackV132(profile,new Proxy({fromOutputMonthStem:true},{}))).rejects.toThrow('代理');
    await expect((service.previewBaziRootFeedbackV132 as unknown as (...args:unknown[])=>unknown)()).rejects.toThrow('出生资料');
  },30000);

  it('does not invent availability when the fixed bundle is absent or tampered',async()=>{
    const unavailable=await new Store(path.join(scratch,'missing-user'),path.join(root,'data'),wasm).init();
    const missing=new StudioService(unavailable,{read:()=>'',write:()=>{}},false,undefined,path.join(scratch,'missing/assets'));
    await expect(missing.previewBaziRootFeedbackV132(profile)).rejects.toThrow('固定 bundle 不存在');
    unavailable.db.close();
    const changedRoot=path.join(scratch,'changed'),changed=path.join(changedRoot,'assets');fs.cpSync(assetRoot,changed,{recursive:true});
    fs.cpSync(path.resolve(assetRoot,'../dist-electron'),path.join(changedRoot,'dist-electron'),{recursive:true});
    const changedStore=await new Store(path.join(scratch,'changed-user'),path.join(root,'data'),wasm).init();
    const changedService=new StudioService(changedStore,{read:()=>'',write:()=>{}},false,undefined,changed);
    const changedBundle=path.join(changedRoot,'dist-electron/bazi-root-feedback/1.3.2-r2/root-feedback.cjs');fs.appendFileSync(changedBundle,'\n');
    const changedBytes=fs.readFileSync(changedBundle),receipt=JSON.parse(fs.readFileSync(changedBundle+'.receipt.json','utf8'));
    receipt.output.bytes=changedBytes.length;receipt.output.sha256=createHash('sha256').update(changedBytes).digest('hex');fs.writeFileSync(changedBundle+'.receipt.json',JSON.stringify(receipt));
    await expect(changedService.previewBaziRootFeedbackV132(profile)).rejects.toThrow('SHA256');
    changedStore.db.close();
  },30000);

  it('leaves actual old saved sessions and histories unchanged after r2 previews',async()=>{
    const legacyStore=await new Store(path.join(scratch,'legacy-user'),path.join(root,'data'),wasm).init();
    try{
      legacyStore.restore(fs.readFileSync(path.join(root,'tests/fixtures/naming-session-1.0.34.sqlite')));
      const legacyService=new StudioService(legacyStore,{read:()=>'',write:()=>{}},false,undefined,assetRoot);
      const sessions=legacyStore.rows<NamingSession>('sessions'),before=fs.readFileSync(path.join(legacyStore.userDir,'customers.sqlite'));
      expect(sessions.length).toBeGreaterThan(0);const histories=sessions.map(session=>legacyService.listHistory(session.id));
      await legacyService.previewBaziRootFeedbackV132(profile);
      expect(legacyStore.rows<NamingSession>('sessions')).toEqual(sessions);expect(sessions.map(session=>legacyService.listHistory(session.id))).toEqual(histories);
      expect(fs.readFileSync(path.join(legacyStore.userDir,'customers.sqlite'))).toEqual(before);
    }finally{legacyStore.db.close();}
  },60000);
});
