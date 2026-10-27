import {afterAll,afterEach,beforeAll,describe,expect,it,vi} from 'vitest';
import {mkdtempSync,mkdirSync,readFileSync,rmSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import {mainNoticeSource,noticeTransportForMain} from './helpers/main-notice-registration';
import ts from 'typescript';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {analyzeProfile} from '../src/domain/engine';
import type {BirthProfile,NamingPreferences,NamingSession} from '../src/shared/types';
import {readBaziMainchainPreviewOptions} from '../src/shared/bazi-mainchain';

const profile:BirthProfile={id:'mainchain-service-fictional',customerName:'预览测试家长',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2029-03-25',birthTime:'03:30',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'M143隔离测试',fatherName:'林文舟',motherName:'陈若兰',renMethod:'none',timeBasis:'civil'};
const preferences:NamingPreferences={length:2,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',style:'清朗自然',meanings:'平安',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false};
let directory:string,store:Store,service:StudioService,session:NamingSession;
const secret={read:vi.fn(()=>''),write:vi.fn()};

beforeAll(async()=>{
 const runtime=resolve('.local/mainchain-preview-service-tests');mkdirSync(runtime,{recursive:true});directory=mkdtempSync(join(runtime,'case-'));
 store=await new Store(directory,resolve('data'),resolve('node_modules/sql.js/dist/sql-wasm.wasm')).init();
 service=new StudioService(store,secret,false);
 session=(await service.generate(profile,preferences)).session;
 session.reviewNote='保留已存在审阅历史，预览不得写回';session=service.saveSession(session);
},30_000);
afterEach(()=>vi.restoreAllMocks());
afterAll(()=>{store?.db.close();if(directory)rmSync(directory,{recursive:true,force:true});});

function assertReadOnly(action:()=>unknown){
 const before=Buffer.from(store.backupBytes()),disk=readFileSync(join(directory,'customers.sqlite')),modified=statSync(join(directory,'customers.sqlite')).mtimeMs;
 const rows=JSON.stringify(store.rows<NamingSession>('sessions')),history=JSON.stringify(service.listHistory(session.id)),token=store.profileWriteToken(profile.id);
 const put=vi.spyOn(store,'put'),saveProfile=vi.spyOn(store,'saveProfile'),saveSession=vi.spyOn(store,'saveSession'),flush=vi.spyOn(store,'flush'),persist=vi.spyOn(store as any,'persist'),run=vi.spyOn(store.db,'run');
 const verify=()=>{
 expect(put).not.toHaveBeenCalled();expect(saveProfile).not.toHaveBeenCalled();expect(saveSession).not.toHaveBeenCalled();expect(flush).not.toHaveBeenCalled();expect(persist).not.toHaveBeenCalled();expect(run).not.toHaveBeenCalled();
 expect(Buffer.from(store.backupBytes()).equals(before)).toBe(true);expect(readFileSync(join(directory,'customers.sqlite')).equals(disk)).toBe(true);expect(statSync(join(directory,'customers.sqlite')).mtimeMs).toBe(modified);
 expect(JSON.stringify(store.rows<NamingSession>('sessions'))).toBe(rows);expect(JSON.stringify(service.listHistory(session.id))).toBe(history);expect(store.profileWriteToken(profile.id)).toBe(token);
 };
 const output=action();if(output&&typeof(output as PromiseLike<unknown>).then==='function')return Promise.resolve(output).then(value=>{verify();return value;},error=>{verify();throw error;});verify();return output;
}

function registeredMainHandler(){
 const {file,source}=mainNoticeSource(),nodes:ts.Node[]=[];
 function visit(node:ts.Node){nodes.push(node);ts.forEachChild(node,visit);}visit(source);
 const registration=nodes.filter(ts.isVariableDeclaration).find(node=>ts.isIdentifier(node.name)&&node.name.text==='register');
 const invocation=nodes.filter(ts.isVariableDeclaration).find(node=>ts.isIdentifier(node.name)&&node.name.text==='invokeWithNotice');
 const route=nodes.filter(ts.isCallExpression).find(node=>ts.isIdentifier(node.expression)&&node.expression.text==='register'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])&&node.arguments[0].text==='previewBaziMainchain');
 if(!invocation||!registration||!route)throw new Error('Actual main notice/registration not found');
 const code=ts.transpileModule('const '+invocation.getText(source)+';\nconst '+registration.getText(source)+';\n'+route.getText(source)+';',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const webContents={send:vi.fn()},handlers=new Map<string,(event:{sender:unknown},...args:unknown[])=>unknown>();
 // Only these actual source nodes execute; no Electron/window/application startup.
 // Notice execution is real and shares the Store owner's scope module.
 runInNewContext(code,{ipcMain:{handle:(name:string,handler:(event:{sender:unknown},...args:unknown[])=>unknown)=>handlers.set(name,handler)},window:{webContents},service,desktop176Context:undefined,invokeWithCustomerWriteNotice:noticeTransportForMain(file),Promise});
 const handler=handlers.get('studio:previewBaziMainchain');if(!handler)throw new Error('Preview IPC not registered');return{handler,webContents};
}

describe('M143 actual StudioService and real SQLite mainchain preview',()=>{
 it('validates through current Service before preview and keeps profile normalization',()=>{
  const validate=vi.spyOn(service,'validateProfile'),input={...profile,surname:' 林 ',fatherName:' 林文舟 ',motherName:' 陈若兰 '},before=structuredClone(input);
  const out=service.previewBaziMainchain(input);
  expect(validate).toHaveBeenCalledOnce();expect(validate).toHaveBeenCalledWith(input);expect(input).toEqual(before);expect(out.profileId).toBe(profile.id);expect(out.calendar.pillars.map(p=>p.gan!+p.zhi!)).toEqual(['己酉','丁卯','甲寅','丙寅']);expect(out.method.entryPolicy).toBe('month-branch-only');expect(out.schema).toBe('bazi-mainchain-preview/1.0.2');
 });
 it('real preview is read only, preserving saved analysis, scores, revision and history bytes',()=>{
  const existing=store.rows<NamingSession>('sessions')[0];expect(existing.candidates.length).toBeGreaterThan(0);expect(service.listHistory(session.id).length).toBeGreaterThan(0);
  assertReadOnly(()=>service.previewBaziMainchain(profile));expect(secret.write).not.toHaveBeenCalled();
 });
 it('defaults to month-branch and explicit false has the same project result',()=>{
  const omitted=service.previewBaziMainchain(profile),empty=service.previewBaziMainchain(profile,{}),disabled=service.previewBaziMainchain(profile,{fromOutputMonthStem:false});
  expect(omitted).toEqual(empty);expect(omitted).toEqual(disabled);expect(omitted.opinion?.branch).toBe('regular-strong');expect(omitted.opinion?.primary).toEqual(['火']);expect(omitted.entryComparison).toBeNull();
 });
 it('explicit month-stem proposal returns the original branch result alongside its own',()=>{
  const result=service.previewBaziMainchain(profile,{fromOutputMonthStem:true});expect(result.method.entryPolicy).toBe('month-stem-proposal');expect(result.opinion?.strength).toBe('strong');expect(result.opinion?.branch).toBe('cong-output');expect(result.opinion?.primary).toEqual(['土']);expect(result.entryComparison?.originalMonthBranch.branch).toBe('regular-strong');expect(result.entryComparison?.originalMonthBranch.primary).toEqual(['火']);expect(result.entryComparison?.changed).toBe(true);expect(result.headline.join('')).toContain('项目提案');expect(result.headline.join('')).toContain('采用从儿项目分支');expect(result.opinion?.summary.join('')).not.toContain('cong-output');expect(result.entryComparison?.originalMonthBranch.summary.join('')).toContain('常规偏旺扶抑');expect(result.details.method?.results[0].branch).toBe('cong-output');
 });
 it('new proposal preview also performs no DB or history writes',()=>{assertReadOnly(()=>service.previewBaziMainchain(profile,{fromOutputMonthStem:true}));});
 it('does not overwrite old favorable/unfavorable, generation scores or existing session facts',()=>{
  const ordinary=service.analyze(profile),direct=analyzeProfile(profile),snapshot=structuredClone(session);service.previewBaziMainchain(profile,{fromOutputMonthStem:true});
  expect(service.analyze(profile)).toEqual(ordinary);expect(service.analyze(profile)).toEqual(direct);expect(session).toEqual(snapshot);expect(store.rows<NamingSession>('sessions')[0].analysis).toEqual(snapshot.analysis);expect(store.rows<NamingSession>('sessions')[0].candidates.map(c=>c.evaluation)).toEqual(snapshot.candidates.map(c=>c.evaluation));
 });
 it('unknown time remains missing, never generating noon or a complete favorable intersection',()=>{
  const out=service.previewBaziMainchain({...profile,id:'unknown-hour',birthDate:'2026-06-29',birthTime:'',timeUnknown:true});expect(out.status).toBe('provisional-missing-hour');expect(out.calendar.pillars[3]).toMatchObject({gan:null,zhi:null});expect(out.calendar.calculationDateTime).toBeNull();expect(out.details.timeBasis?.actualUtc).toBeNull();expect(out.details.method?.consensus.favorableIntersection).toEqual([]);expect(out.pending.some(p=>p.code==='hour-unknown')).toBe(true);
 });
 it('unknown apparent-solar date does not manufacture a day master or opinion',()=>{
  const out=service.previewBaziMainchain({...profile,id:'solar-unknown',birthDate:'2024-02-10',birthTime:'',timeUnknown:true,timeBasis:'apparent-solar',birthLongitude:87.6168});expect(out.status).toBe('pending-calendar');expect(out.calendar.dayStatus).toBe('uncertain');expect(out.calendar.dayDateCandidates).toEqual(['2024-02-09','2024-02-10']);expect(out.calendar.pillars[2]).toMatchObject({gan:null,zhi:null});expect(out.details.method).toBeNull();expect(out.opinion).toBeNull();
 });
 it('unknown hour on Lichun exposes pending year/month without filling calendar facts',()=>{
  const out=service.previewBaziMainchain({...profile,id:'lichun',birthDate:'2024-02-04',birthTime:'',timeUnknown:true});expect(out.status).toBe('pending-calendar');expect(out.calendar.pillars[0].gan).toBeNull();expect(out.calendar.pillars[1].gan).toBeNull();expect(out.calendar.pillars[2].gan).toBe('戊');expect(out.details.method).toBeNull();
 });
 it('invalid dates and current profile fields reject at Service boundary before option inspection',()=>{
  const getter=vi.fn(()=>true),options=Object.defineProperty({},'fromOutputMonthStem',{get:getter,enumerable:true});
  expect(()=>service.previewBaziMainchain({...profile,surname:'<x>'},options)).toThrow('姓氏');expect(getter).not.toHaveBeenCalled();
  expect(()=>service.previewBaziMainchain({...profile,birthDate:'2025-02-30'})).toThrow();expect(()=>service.previewBaziMainchain({...profile,timeUnknown:'yes' as any})).toThrow('出生时间');expect(()=>service.previewBaziMainchain({...profile,fatherName:'长'.repeat(41)})).toThrow('爸爸姓名');
 });
 it('current invalid lunar leap-month and missing longitude reject instead of fallback',()=>{
  expect(()=>service.previewBaziMainchain({...profile,calendar:'lunar',birthDate:'2025-05-01',leapMonth:true})).toThrow('闰月');expect(()=>service.previewBaziMainchain({...profile,timeBasis:'apparent-solar',birthLongitude:undefined})).toThrow('经度');
 });
 it('rejects arbitrary thresholds, rule objects, inherited values and nonboolean switches',()=>{
  for(const value of [null,[],true,1,'yes',{fromOutputMonthStem:'true'},{fromOutputMonthStem:undefined},{fromOutputMonthStem:1},{strongShare:0},{rules:{}},{fromOutputMonthStem:true,threshold:0},Object.create({fromOutputMonthStem:true})])expect(()=>service.previewBaziMainchain(profile,value as any)).toThrow();
 });
 it('rejects option getters and hidden/symbol fields without executing an accessor',()=>{
  const getter=vi.fn(()=>true),accessor=Object.defineProperty({},'fromOutputMonthStem',{get:getter,enumerable:true}),hidden=Object.defineProperty({},'fromOutputMonthStem',{value:true,enumerable:false}),symbol={[Symbol('threshold')]:0};
  for(const value of [accessor,hidden,symbol])expect(()=>service.previewBaziMainchain(profile,value as any)).toThrow();expect(getter).not.toHaveBeenCalled();
 });
 it('invalid preview options have no DB, disk or history effects',()=>{
  assertReadOnly(()=>{expect(()=>service.previewBaziMainchain(profile,{rules:{strongShare:0}} as any)).toThrow();});
 });
 it('shared option reader accepts explicit plain boolean, detaches it and ignores no unknown keys',()=>{
  const input={fromOutputMonthStem:true},out=readBaziMainchainPreviewOptions(input);expect(out).toEqual(input);expect(out).not.toBe(input);expect(readBaziMainchainPreviewOptions(undefined)).toEqual({});expect(readBaziMainchainPreviewOptions(Object.assign(Object.create(null),{fromOutputMonthStem:false}))).toEqual({fromOutputMonthStem:false});
 });
 it('actual extracted main registration invokes real Service for the correct sender without writes',async()=>{
  const {handler,webContents}=registeredMainHandler(),direct=service.previewBaziMainchain(profile,{fromOutputMonthStem:true});
  const result=await assertReadOnly(()=>handler({sender:webContents},profile,{fromOutputMonthStem:true}));expect(result).toEqual(direct);expect(webContents.send).not.toHaveBeenCalled();
 });
 it('actual extracted main sender guard rejects before Service validation or database effects',()=>{
  const {handler}=registeredMainHandler(),validate=vi.spyOn(service,'validateProfile');
  assertReadOnly(()=>{expect(()=>handler({sender:{}},profile,{fromOutputMonthStem:true})).toThrow('无效的调用来源');});expect(validate).not.toHaveBeenCalled();
 });
});
