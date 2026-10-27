import {afterEach,beforeAll,describe,expect,it} from 'vitest';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import initSqlJs from 'sql.js';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {normalizePreferences} from '../src/shared/workflow';
import {REN_METHOD} from '../src/shared/ren-method';
import {DITIAN_REN_SOURCE_ID,loadDitianRenSources} from '../src/main/ditian-ren-data';
import type {BirthProfile,NamingSession} from '../src/shared/types';

const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm'),directories:string[]=[],stores:Store[]=[];
const profile:BirthProfile={id:'ren-read-boundary',customerName:'读取边界隔离验收',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'1914-11-25',birthTime:'13:30:00',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:'仅用于外改本地SQLite的损坏读取测试',renMethod:REN_METHOD};
let SQL:Awaited<ReturnType<typeof initSqlJs>>;
beforeAll(async()=>{SQL=await initSqlJs({locateFile:()=>wasm});});
async function open(directory?:string){const dir=directory??mkdtempSync(join(tmpdir(),'ren-read-integrity-'));if(!directory)directories.push(dir);const store=await new Store(dir,resolve('data'),wasm).init();stores.push(store);return {dir,store,service:new StudioService(store,{read:()=>'',write:()=>{}},false)};}
function close(store:Store){const index=stores.indexOf(store);if(index>=0)stores.splice(index,1);store.db.close();}
const disk=(directory:string)=>readFileSync(join(directory,'customers.sqlite'));
function externallyEdit(directory:string,table:'sessions'|'revisions',id:string|number,change:(session:NamingSession)=>void){
  const file=join(directory,'customers.sqlite'),database=new SQL.Database(readFileSync(file));
  try{const row=database.exec(`SELECT json FROM ${table} WHERE id=?`,[id])[0].values[0][0],value=JSON.parse(String(row));change(value);database.run(`UPDATE ${table} SET json=? WHERE id=?`,[JSON.stringify(value),id]);writeFileSync(file,database.export());}finally{database.close();}
}
async function setup(selected:BirthProfile=profile){const opened=await open();return {...opened,session:(await opened.service.generate(selected,normalizePreferences({requiredChars:'安宁',zodiacRules:false}))).session};}
afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const directory of directories.splice(0))rmSync(directory,{recursive:true,force:true});});

describe('Ren saved-row reads refuse locally corrupted analysis before exposing it to the renderer', { timeout: 15_000 },()=>{
  const corruptions:{name:string;edit:(session:NamingSession)=>void}[]=[
    {name:'author label changed',edit:s=>{s.analysis.renCommentary!.sourceCaseMatches[0].authorAssertion='伪造作者标签';}},
    {name:'fixed source metadata changed',edit:s=>{s.sourceSnapshot!.sources.find(source=>source.id===DITIAN_REN_SOURCE_ID)!.commit='forged';}},
    {name:'fixed source deleted',edit:s=>{s.sourceSnapshot!.sources=s.sourceSnapshot!.sources.filter(source=>source.id!==DITIAN_REN_SOURCE_ID);}},
    {name:'selected method removed',edit:s=>{delete s.profile.renMethod;}},
    {name:'independent payload removed',edit:s=>{delete s.analysis.renCommentary;}},
    {name:'both method and payload removed but1.10 version retained',edit:s=>{delete s.profile.renMethod;delete s.analysis.renCommentary;}},
    {name:'Bazi label downgraded while Ren payload remains',edit:s=>{s.analysis.bazi.version='civil-midnight-fuyi-candidate/1.9.0;lunar-typescript/1.8.6';}}
  ];
  it.each(corruptions)('rejects $name after a real SQLite close, external edit and reopen without writing disk',async corruption=>{
    const {dir,store,session}=await setup();close(store);externallyEdit(dir,'sessions',session.id,corruption.edit);const changed=disk(dir);
    const reopened=await open(dir);expect(()=>reopened.service.bootstrap()).toThrow(/任注|快照|资料/);expect(()=>reopened.store.rows<NamingSession>('sessions')).toThrow(/任注|快照|资料/);expect(disk(dir).equals(changed)).toBe(true);
  });
  it('detects a forged Ren revision on history reads while allowing an intact current row',async()=>{
    const {dir,store,service,session}=await setup();service.saveSession({...structuredClone(session),reviewNote:'生成真实审阅历史'});const revision=service.listHistory(session.id)[0];close(store);
    externallyEdit(dir,'revisions',Number(revision.id),value=>{value.analysis.renCommentary!.structureGraph.edges[0].dependencies=[];});const changed=disk(dir),reopened=await open(dir);
    expect(reopened.service.bootstrap().sessions.find(value=>value.id===session.id)).toBeDefined();expect(()=>reopened.service.listHistory(session.id)).toThrow(/任注|快照|资料/);expect(disk(dir).equals(changed)).toBe(true);
  });
  it('detects a Ren source graft on a default row even when no Ren method or result is present',async()=>{
    const {dir,store,session}=await setup({...profile,renMethod:undefined});close(store);const source=loadDitianRenSources(resolve('data'))[0];
    externallyEdit(dir,'sessions',session.id,value=>{value.sourceSnapshot!.sources.push(source);});const changed=disk(dir),reopened=await open(dir);
    expect(()=>reopened.service.bootstrap()).toThrow(/任注|快照|资料/);expect(disk(dir).equals(changed)).toBe(true);
  });
  it('continues reading an intact optional profile and default1.9 row without changing saved bytes or backfilling sources',async()=>{
    const {dir,store,service,session}=await setup(),plain=(await service.generate({...profile,id:'read-default-old',renMethod:undefined},normalizePreferences({requiredChars:'安宁',zodiacRules:false}))).session;close(store);const before=disk(dir),reopened=await open(dir),rows=reopened.service.bootstrap().sessions;
    expect(rows.find(value=>value.id===session.id)!.analysis.renCommentary).toEqual(session.analysis.renCommentary);
    const old=rows.find(value=>value.id===plain.id)!;expect(old.analysis.bazi.version).toContain('/1.9.0;');expect(old.profile.renMethod).toBeUndefined();expect(old.analysis.renCommentary).toBeUndefined();expect(old.sourceSnapshot!.sources.some(source=>source.id===DITIAN_REN_SOURCE_ID)).toBe(false);expect(disk(dir).equals(before)).toBe(true);
  });
});
