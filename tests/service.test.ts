import { beforeAll,afterAll,describe,it,expect } from 'vitest';
import { mkdtempSync,rmSync,readFileSync,existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve,join } from 'node:path';
import { createServer,type Server } from 'node:http';
import initSqlJs from 'sql.js';
import { Store } from '../src/main/store';
import { StudioService } from '../src/main/service';
import { endpoint,generateAI,creativeProseOnly } from '../src/main/ai';
import { reportHTML } from '../src/main/report';
import type { BirthProfile,NamingPreferences,StudioSettings } from '../src/shared/types';
const profile:BirthProfile={id:'test-person',customerName:'测试家长',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',leapMonth:false,birthTime:'09:30',timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'测试'};
const pref:NamingPreferences={length:2,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',style:'清朗自然',meanings:'平安',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false};
let dir:string,store:Store,svc:StudioService;
beforeAll(async()=>{dir=mkdtempSync(join(tmpdir(),'zhiming-test-'));store=await new Store(dir,resolve('data'),resolve('node_modules/sql.js/dist/sql-wasm.wasm')).init();let key='';svc=new StudioService(store,{read:()=>key,write:v=>{key=v;}});});
afterAll(()=>{store?.db.close();if(dir)rmSync(dir,{recursive:true,force:true});});
describe('source-backed dataset and local service', { timeout: 15_000 },()=>{
  it('loads actual SQLite tables, 500+ documented characters and 64 hexagrams',()=>{
    const b=svc.bootstrap();expect(b.stats.characters).toBeGreaterThanOrEqual(500);expect(b.sources.length).toBeGreaterThanOrEqual(4);expect(store.dataset.knowledge.filter(k=>k.category==='周易')).toHaveLength(64);
    const sourceIds=new Set(b.sources.map(s=>s.id));expect(store.dataset.characters.every(c=>!!c.pinyin&&!!c.meaning&&sourceIds.has(c.sourceId))).toBe(true);
    expect(store.dataset.citations.every(c=>!!c.text&&sourceIds.has(c.sourceId))).toBe(true);
  });
  it('saves customer and generated sessions across reopen; preserves original and review history',async()=>{
    const result=await svc.generate(profile,pref);expect(result.session.candidates).toHaveLength(12);
    const c=result.session.candidates[0],original=c.originalMeaning;c.meaning='人工审阅后的解释';c.reviewNote='家长偏好易读';c.favorite=true;svc.saveSession(result.session);
    const reopened=await new Store(dir,resolve('data'),resolve('node_modules/sql.js/dist/sql-wasm.wasm')).init();
    expect(reopened.rows<BirthProfile>('profiles')[0].surname).toBe('林');const saved=reopened.rows<any>('sessions')[0];expect(saved.candidates[0].meaning).toBe('人工审阅后的解释');expect(saved.candidates[0].originalMeaning).toBe(original);expect(reopened.db.exec('SELECT COUNT(*) FROM revisions')[0].values[0][0]).toBe(1);reopened.db.close();
  });
  it('backup/restore is a real SQLite archive and dataset update/rollback does not touch clients',async()=>{
    const backup=store.backupBytes();expect(Buffer.from(backup.subarray(0,16)).toString()).toBe('SQLite format 3\u0000');const original=svc.bootstrap().profiles.length;
    store.saveProfile({...profile,id:'temporary'});expect(svc.bootstrap().profiles.length).toBe(original+1);store.restore(backup);expect(svc.bootstrap().profiles.length).toBe(original);
    const pack=store.currentPackBytes(),version=store.dataset.version;
    expect(store.installPack(pack)).toContain('一致');expect(svc.bootstrap().profiles.length).toBe(original);
    const SQL=await initSqlJs({locateFile:()=>resolve('node_modules/sql.js/dist/sql-wasm.wasm')}),changed=new SQL.Database(pack);
    try{const row=changed.exec('SELECT rowid,json FROM sources')[0].values[0],source=JSON.parse(String(row[1]));source.commit='service-distinct-pack';changed.run('UPDATE sources SET json=? WHERE rowid=?',[JSON.stringify(source),row[0]]);store.installPack(changed.export());}finally{changed.close();}
    expect(store.dataset.version).not.toBe(version);expect(svc.bootstrap().profiles.length).toBe(original);store.rollback();expect(store.dataset.version).toBe(version);expect(svc.bootstrap().profiles.length).toBe(original);
    expect(existsSync(join(dir,'customers.before-restore.sqlite'))).toBe(true);expect(()=>store.installPack(new Uint8Array([1,2,3]))).toThrow();
  });
  it('rejects structurally invalid JSON backups without replacing live customers',()=>{
    const before=svc.bootstrap().profiles.length;const database=store.db;
    const bad=database.export();database.run('UPDATE profiles SET json=?',[JSON.stringify({id:profile.id})]);const malformed=database.export();store.restore(bad);
    expect(()=>store.restore(malformed)).toThrow('字段不完整');expect(svc.bootstrap().profiles.length).toBe(before);expect(svc.bootstrap().profiles[0].surname).toBe('林');
  });
  it('local knowledge and individual characters are actually searchable',()=>{expect(svc.searchKnowledge('乾').length).toBeGreaterThan(0);expect(svc.searchCharacters('明').some(c=>c.char==='明')).toBe(true);});
  it('validates input, retains hidden secret and deletes associated private records',()=>{
    expect(()=>svc.saveProfile({...profile,surname:'<x>'})).toThrow();let settings=svc.bootstrap().settings;settings=svc.saveSettings(settings,'test-key-not-real');expect(settings.hasApiKey).toBe(true);svc.saveSettings(settings);expect(svc.bootstrap().settings.hasApiKey).toBe(true);svc.saveSettings(settings,'');expect(svc.bootstrap().settings.hasApiKey).toBe(false);
    svc.deleteProfile(profile.id);expect(svc.bootstrap().profiles.some(p=>p.id===profile.id)).toBe(false);expect(svc.bootstrap().sessions.some(s=>s.profileId===profile.id)).toBe(false);expect(store.db.exec('SELECT COUNT(*) FROM revisions')[0].values[0][0]).toBe(0);
  });
  it('HTML report escapes untrusted text and includes source and review information',async()=>{const r=await svc.generate({...profile,notes:'<script>alert(1)</script>'},pref);const html=reportHTML(r.session,{...svc.bootstrap().settings,studioName:'<script>unsafe</script>'});expect(html).not.toContain('<script>unsafe</script>');expect(html).toContain('&lt;script&gt;unsafe&lt;/script&gt;');expect(html).toContain('Content-Security-Policy');expect(html).toContain('数据');expect(html).toContain('奇门出生参考盘');});
});
describe('AI boundary via actual local HTTP fixture', { timeout: 15_000 },()=>{
  let server:Server,address='',captured:any[]=[],mode='valid';
  beforeAll(async()=>{server=createServer(async(req,res)=>{let body='';for await(const c of req)body+=c;const obj=JSON.parse(body);captured.push(obj);if(mode==='httpfail'){res.statusCode=503;res.end('fixture unavailable');return;}if(mode==='timeout'){const timer=setTimeout(()=>res.end('{}'),6500);timer.unref();return;}const input=JSON.parse(obj.messages.find((m:any)=>m.role==='user').content);const two=input.characters.filter((c:any)=>!pref.forbiddenChars.includes(c.char)).slice(0,2).map((c:any)=>c.char).join('');const content=mode==='malformed'?'not JSON':JSON.stringify({candidates:[{givenName:two,meaning:'现代组合寓意：明朗自持',reason:'读写自然',citationIds:mode==='forged'?['nonexistent-id']:[]}]});res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content}}]}));});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));address=`http://127.0.0.1:${(server.address() as any).port}/v1`;});
  afterAll(()=>server.close());
  it('normalizes compatible API endpoints without leaking query secrets',()=>{expect(endpoint('https://example.com/v1/')).toBe('https://example.com/v1/chat/completions');expect(endpoint('https://example.com/v1/chat/completions')).toBe('https://example.com/v1/chat/completions');expect(()=>endpoint('file:///x')).toThrow();expect(()=>endpoint('https://example.com/?key=x')).toThrow();});
  it('keeps birth computations, invented quotations and fate statistics out of creative prose',()=>{for(const text of ['八字缺金，必定成功','名字出自《不存在的书》','重名率只有1%','这个名字已经通过奇门验算','“杜撰古文原句”'])expect(creativeProseOnly(text)).toBe(false);expect(creativeProseOnly('现代组合寓意：明朗自持，传递求知与安宁的祝愿。')).toBe(true);});
  it('sends derived constraints but omits dates, location, customer and both parents names',async()=>{mode='valid';captured=[];const settings:StudioSettings={...svc.bootstrap().settings,apiBaseUrl:address,model:'fixture',timeoutMs:5000};const privateProfile={...profile,birthPlace:'PRIVATE-LOCATION-9ee7',customerName:'PRIVATE-CUSTOMER-9ee7',notes:'PRIVATE-NOTES-9ee7',fatherName:'张德明',motherName:'李清宁'};const a=svc.analyze(privateProfile);const r=await generateAI(settings,'test-key',privateProfile,pref,a,store.dataset.characters,store.dataset.citations);expect(r.candidates.length).toBe(1);const input=JSON.parse(captured[0].messages.find((m:any)=>m.role==='user').content);for(const privateKey of ['birthDate','birthTime','birthPlace','customerName','notes','fatherName','motherName','profile','bazi'])expect(input).not.toHaveProperty(privateKey);const sent=JSON.stringify(captured);for(const privateText of [privateProfile.birthDate,privateProfile.birthTime,privateProfile.birthPlace,privateProfile.customerName,privateProfile.notes,privateProfile.fatherName,privateProfile.motherName])expect(sent.includes(privateText)).toBe(false);expect(input.characters.every((c:any)=>!'德明清宁'.includes(c.char))).toBe(true);expect(r.candidates[0].origin).toBe('ai');});
  it('retries once, rejects forged citations and malformed JSON instead of publishing them',async()=>{const settings={...svc.bootstrap().settings,apiBaseUrl:address,model:'fixture',timeoutMs:5000};const a=svc.analyze(profile);for(const invalid of ['forged','malformed']){mode=invalid;captured=[];await expect(generateAI(settings,'test-key',profile,pref,a,store.dataset.characters,store.dataset.citations)).rejects.toThrow('两次');expect(captured).toHaveLength(2);}});
  it('falls back to saved local names on HTTP failure',async()=>{mode='httpfail';const settings={...svc.bootstrap().settings,apiBaseUrl:address,model:'fixture',timeoutMs:5000,useAi:true};svc.saveSettings(settings,'fixture');const result=await svc.generate(profile,pref);expect(result.session.candidates).toHaveLength(12);expect(result.session.candidates.every(c=>c.origin==='local')).toBe(true);expect(result.messages.some(m=>m.includes('503'))).toBe(true);svc.saveSettings({...settings,useAi:false},'');});
  it('aborts a real hanging HTTP request at the configured timeout',async()=>{mode='timeout';const settings={...svc.bootstrap().settings,apiBaseUrl:address,model:'fixture',timeoutMs:5000};await expect(generateAI(settings,'fixture',profile,pref,svc.analyze(profile),store.dataset.characters,store.dataset.citations)).rejects.toThrow('超时');},10000);
});
