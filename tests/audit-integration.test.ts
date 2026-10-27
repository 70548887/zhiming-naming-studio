import {afterAll,afterEach,beforeAll,describe,expect,it} from 'vitest';
import {createServer,type Server} from 'node:http';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {EndpointSecretStorage} from '../src/main/credentials';
import {generateAI,retrieveNamingCitations} from '../src/main/ai';
import {reportHTML} from '../src/main/report';
import type {BirthProfile,NamingPreferences,StudioSettings} from '../src/shared/types';
const profile:BirthProfile={id:'audit-integration',customerName:'临时测试',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:'09:30',leapMonth:false,timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''};
const pref:NamingPreferences={length:2,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',style:'典雅清朗',meanings:'平安、求知',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false};
let dir:string,store:Store,svc:StudioService,server:Server,base:string,captured:any[]=[],mode='structured',target='安宁';
beforeAll(async()=>{
  dir=mkdtempSync(join(tmpdir(),'naming-audit-integration-'));store=await new Store(dir,resolve('data'),resolve('node_modules/sql.js/dist/sql-wasm.wasm')).init();
  const secret=new EndpointSecretStorage(join(dir,'fixture.key'),{isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from(s),decryptString:b=>b.toString()});svc=new StudioService(store,secret);
  server=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;const request=JSON.parse(body);captured.push({url:req.url,auth:req.headers.authorization,request});
    let content='连接成功';
    if(request.response_format){
      const candidate:any={givenName:target,citationIds:[],themeIds:['peace','learning']};
      if(mode==='claim'){candidate.meaning='安字五行属金，宁字五行属水，这个名字源于《周易·安宁篇》。';candidate.reason='清朗易记';}
      if(mode==='untrusted-prose'){candidate.meaning='一段可以穿过词表的自由发挥：未来前程似锦。';candidate.reason='这段模型自由文本不得直接发布。';}
      content=JSON.stringify({candidates:[candidate]});
    }
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content}}]}));
  });await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${(server.address() as any).port}`;
});
afterAll(()=>{server?.close();store?.db.close();if(dir)rmSync(dir,{force:true,recursive:true});});
afterEach(()=>{mode='structured';target='安宁';});
const aiSettings=():StudioSettings=>({...svc.bootstrap().settings,apiBaseUrl:base+'/a/v1',model:'fixture',timeoutMs:5000});
describe('audit findings exercised across subsystem boundaries',{ timeout: 15_000 }, ()=>{
  it('binds saved credentials to the endpoint, rejects unsaved address changes, and restores backup without changing local AI destination',async()=>{
    const a=aiSettings(),b={...a,apiBaseUrl:base+'/b/v1'};svc.saveSettings(b,'B-FAKE');const otherEndpointBackup=store.backupBytes();svc.saveSettings(a,'A-FAKE');store.restore(otherEndpointBackup);
    expect(svc.bootstrap().settings.apiBaseUrl).toBe(a.apiBaseUrl);expect(svc.bootstrap().settings.hasApiKey).toBe(true);
    captured=[];await expect(svc.testConnection(b)).rejects.toThrow('密钥');expect(captured).toHaveLength(0);
    await svc.testConnection(a);expect(captured[0].auth).toBe('Bearer A-FAKE');expect(captured[0].url).toBe('/a/v1/chat/completions');
    svc.saveSettings(b);expect(svc.bootstrap().settings.hasApiKey).toBe(false);expect(svc.bootstrap().settings.useAi).toBe(false);svc.saveSettings({...a,useAi:false},'');
  });
  it('retrieves Zhouyi for Zhouyi requests while retaining source diversity instead of the first 50 Shijing entries',()=>{
    const refs=retrieveNamingCitations(store.dataset.characters,store.dataset.citations,{...pref,style:'周易八卦取名',meanings:'自强、厚德'});
    expect(refs.length).toBeLessThanOrEqual(50);expect(refs.filter(r=>r.sourceId==='zhouyi').length).toBeGreaterThanOrEqual(30);expect(refs.some(r=>r.sourceId==='shijing')).toBe(true);
    const poem=retrieveNamingCitations(store.dataset.characters,store.dataset.citations,{...pref,style:'诗经国风'});expect(poem.filter(r=>r.sourceId==='shijing').length).toBeGreaterThanOrEqual(30);
  });
  it('preserves reviewed Zhouyi vocabulary through the real element-biased AI shortlist',async()=>{
    mode='structured';target='明德';captured=[];
    await generateAI(aiSettings(),'FAKE',profile,{...pref,style:'周易八卦取名',meanings:'自强、厚德',preferredElements:['木']},svc.analyze(profile),store.dataset.characters,store.dataset.citations);
    const input=JSON.parse(captured[0].request.messages[1].content);expect(input.citations.filter((c:any)=>c.sourceId==='zhouyi').length).toBeGreaterThanOrEqual(30);
    expect(input.citations.some((c:any)=>c.id==='zhouyi-35-xiang')).toBe(true);for(const ch of [...'明德厚自强文'].filter(ch=>store.dataset.characters.some(c=>c.char===ch)))expect(input.characters.some((c:any)=>c.char===ch)).toBe(true);target='安宁';
  });
  it('rolls back a credential change when configuration persistence fails',()=>{
    const a=aiSettings();svc.saveSettings(a,'A-KEEP');const put=store.put;store.put=()=>{throw new Error('fixture write conflict');};
    try{expect(()=>svc.saveSettings({...a,apiBaseUrl:base+'/b/v1'},'B-NEW')).toThrow('fixture write conflict');expect(svc.bootstrap().settings.apiBaseUrl).toBe(a.apiBaseUrl);expect(svc.bootstrap().settings.hasApiKey).toBe(true);}finally{store.put=put;}
  });
  it('rejects the exact false element and invented chapter payload that passed the old filter',async()=>{
    mode='claim';captured=[];await expect(generateAI(aiSettings(),'FAKE',profile,pref,svc.analyze(profile),store.dataset.characters,store.dataset.citations)).rejects.toThrow('两次');expect(captured).toHaveLength(2);
  });
  it('accepts structured creative choices but never publishes unverified model prose',async()=>{
    mode='untrusted-prose';target='安宁';const requested={...pref,requiredChars:'安宁'};const r=await generateAI(aiSettings(),'FAKE',profile,requested,svc.analyze(profile),store.dataset.characters,store.dataset.citations);
    expect(r.candidates).toHaveLength(1);expect(r.candidates[0].meaning).not.toContain('自由发挥');expect(r.candidates[0].reason).not.toContain('自由文本');expect(r.candidates[0].meaning).not.toContain('安非他命');
    mode='structured';const second=await generateAI(aiSettings(),'FAKE',profile,requested,svc.analyze(profile),store.dataset.characters,store.dataset.citations);expect(second.candidates[0].origin).toBe('ai');expect(second.candidates[0].reason).toContain('AI 创意主题');
  });
  it('locally blocks traditional variants of parent taboo even in AI output',async()=>{
    mode='structured';target='远宁';const p={...profile,fatherName:'林志遠',motherName:''};captured=[];await expect(generateAI(aiSettings(),'FAKE',p,pref,svc.analyze(p),store.dataset.characters,store.dataset.citations)).rejects.toThrow('两次');
    const sent=JSON.parse(captured[0].request.messages[1].content);expect(sent.characters.some((c:any)=>c.char==='远')).toBe(false);expect(JSON.stringify(sent)).not.toContain('林志遠');target='安宁';
  });
  it('uses previously displayed names to make another batch and preserves review history with restorable snapshots',async()=>{
    const first=(await svc.generate(profile,pref)).session;const second=(await svc.generate(profile,pref)).session;
    expect(first.candidates).toHaveLength(12);expect(second.candidates).toHaveLength(12);expect(second.candidates.every(c=>!first.candidates.some(old=>old.givenName===c.givenName))).toBe(true);
    const original=first.candidates[0].meaning;first.candidates[0].meaning='起名师修订的寓意';first.candidates[0].reviewNote='意见甲';first.reviewNote='方案意见甲';const reviewed=svc.saveSession(first);
    const history=svc.listHistory(first.id);expect(history).toHaveLength(1);expect(history[0].session.candidates[0].meaning).toBe(original);
    const restored=svc.restoreHistory(first.id,history[0].id,reviewed.reviewRevision,reviewed.reviewToken);expect(restored.candidates[0].meaning).toBe(original);expect(restored.reviewNote).toBe('');const versions=svc.listHistory(first.id);expect(versions).toHaveLength(2);expect(versions[0].session.reviewNote).toBe(reviewed.reviewNote);
    expect(()=>svc.restoreHistory(second.id,history[0].id)).toThrow('未找到');
  });
  it('exports exactly the favored eighth candidate rather than a different six-name preview',async()=>{
    const s=(await svc.generate({...profile,id:'report-audit'},pref)).session;s.candidates.forEach((c,i)=>c.favorite=i===7);const html=reportHTML(s,svc.bootstrap().settings);
    expect(html).toContain(s.candidates[7].fullName);for(const [i,c]of s.candidates.entries())if(i!==7)expect(html).not.toContain(`<h3>${c.fullName}</h3>`);expect(html).toContain('1 个收藏名字');
  });
});
