import{afterAll,beforeAll,describe,expect,it}from'vitest';
import{mkdtempSync,rmSync,readFileSync,mkdirSync}from'node:fs';import{join,dirname}from'node:path';import{tmpdir}from'node:os';import initSqlJs from'sql.js';
import{Store}from'../src/main/store';import{StudioService}from'../src/main/service';import{normalizePreferences}from'../src/shared/workflow';import type{BirthProfile}from'../src/shared/types';
import{bindCompactCustomerDatabase}from'../src/main/compact-customer-store';import{decodeCustomerBackup,encodeCustomerBackup}from'../src/main/customer-backup-envelope';

const root=mkdtempSync(join(tmpdir(),'naming-m601-r2-')),dataRoot=join(process.cwd(),'data'),wasm=process.env.M601_SQL_WASM||join(process.cwd(),'node_modules','sql.js','dist','sql-wasm.wasm');
const profile:BirthProfile={id:'m601-r2-profile',customerName:'M601-r2回归',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'M601-r2针对性回归'};
let SQL:Awaited<ReturnType<typeof initSqlJs>>;const stores:Store[]=[];const dirs:string[]=[];
async function open(path:string){const s=await new Store(path,dataRoot,wasm).init();stores.push(s);return s;}
function tamperBackup(bytes:Uint8Array,mutate:(db:import('sql.js').Database)=>void){const decoded=decodeCustomerBackup(bytes);const db=new SQL.Database(decoded.sqlite);bindCompactCustomerDatabase(db);mutate(db);const output=db.export();db.close();return encodeCustomerBackup(output);}

beforeAll(async()=>{mkdirSync(join(root,'.local'),{recursive:true});SQL=await initSqlJs({locateFile:()=>wasm});});
afterAll(()=>{for(const s of stores.splice(0))s.db.close();for(const d of dirs.splice(0)){if(dirname(d)!==join(root,'.local'))throw Error('Unexpected fixture cleanup path');rmSync(d,{recursive:true,force:true});}if(dirname(root)!==tmpdir()||!root.startsWith(join(tmpdir(),'naming-m601-r2-')))throw Error('Unexpected fixture root');rmSync(root,{recursive:true,force:true});});

describe('M601-r2 compact restore regressions',()=>{
 it('preserves branded settings through compact backup and restore',async()=>{
  const sourceDir=mkdtempSync(join(root,'.local','m601-r2-settings-source-'));const targetDir=mkdtempSync(join(root,'.local','m601-r2-settings-target-'));dirs.push(sourceDir,targetDir);
  const source=await open(sourceDir);source.put('settings','main',{...source.settings(),studioName:'M601-r2品牌源',contact:'m601-r2@example.test'});const backup=source.backupBytes();const target=await open(targetDir);target.restore(backup);expect(target.settings().studioName).toBe('M601-r2品牌源');expect(target.settings().contact).toBe('m601-r2@example.test');target.db.close();stores.splice(stores.indexOf(target),1);const reopened=await open(targetDir);expect(reopened.settings().studioName).toBe('M601-r2品牌源');expect(reopened.settings().contact).toBe('m601-r2@example.test');
 },30000);

 it('rebinds compact functions and foreign keys after a rejected mutation',async()=>{
  const dir=mkdtempSync(join(root,'.local','m601-r2-rollback-'));dirs.push(dir);
  const store=await open(dir);store.put('settings','main',{...store.settings(),studioName:'M601-r2回滚前'});
  const before=readFileSync(join(dir,'customers.sqlite')),settings=store.settings(),database=store.db,originalRun=database.run,runDescriptor=Object.getOwnPropertyDescriptor(database,'run');
  let injected=0,writeObserved=false,firstError:unknown;
  // Fail after the real settings mutation while keeping the production schema intact.
  database.run=function(this:typeof database,...args:Parameters<typeof originalRun>){
   const result=originalRun.apply(this,args);
   if(args[0].startsWith('INSERT INTO settings(')){
    injected++;writeObserved=JSON.parse(String(this.exec("SELECT json FROM settings WHERE id='main'")[0].values[0][0])).studioName==='M601-r2拒绝';
    throw Error('M601-r2 injected rejected write');
   }
   return result;
  };
  try{store.put('settings','main',{...settings,studioName:'M601-r2拒绝'});}catch(error){firstError=error;}
  finally{if(runDescriptor)Object.defineProperty(database,'run',runDescriptor);else Reflect.deleteProperty(database,'run');}
  expect(injected).toBe(1);expect(writeObserved).toBe(true);expect(firstError).toBeTruthy();expect(String((firstError as Error).message)).toMatch(/M601-r2 injected/);
  expect(Buffer.from(readFileSync(join(dir,'customers.sqlite')))).toEqual(Buffer.from(before));expect(store.settings().studioName).toBe('M601-r2回滚前');
  expect(store.db.exec('PRAGMA foreign_keys')[0].values[0][0]).toBe(1);
  expect(Array.from(store.db.exec("SELECT compact_unbase64('YQ==')")[0].values[0][0] as Uint8Array)).toEqual([97]);
  expect(()=>store.rows('sessions')).not.toThrow();expect(()=>store.put('settings','main',{...store.settings(),studioName:'M601-r2回滚后'})).not.toThrow();expect(store.settings().studioName).toBe('M601-r2回滚后');
 },30000);

 it('rejects tampered parent configuration and numerology snapshot on restore',async()=>{
  const sourceDir=mkdtempSync(join(root,'.local','m601-r2-guards-source-'));const targetDir=mkdtempSync(join(root,'.local','m601-r2-guards-target-'));dirs.push(sourceDir,targetDir);
  const source=await open(sourceDir);source.saveProfile(profile);const parentTampered=tamperBackup(source.backupBytes(),db=>{const row=db.exec('SELECT id,json FROM profiles LIMIT 1')[0].values[0];const value=JSON.parse(String(row[1]));value.parentNameReadings={fatherName:123};db.run('UPDATE profiles SET json=? WHERE id=?',[JSON.stringify(value),String(row[0])]);});const altered=decodeCustomerBackup(parentTampered),alteredDb=new SQL.Database(altered.sqlite);expect(JSON.parse(String(alteredDb.exec('SELECT json FROM profiles LIMIT 1')[0].values[0][0])).parentNameReadings).toEqual({fatherName:123});alteredDb.close();const target=await open(targetDir);let parentError:unknown;try{target.restore(parentTampered);}catch(error){parentError=error;}expect(parentError).toBeTruthy();expect(String((parentError as Error).message)).toMatch(/备份字段不完整/);
  const service=new StudioService(source,{read:()=>'',write:()=>{}},false);const generated=(await service.generate(profile,normalizePreferences({length:1,requiredChars:'安',zodiacRules:false,numerology:true}))).session;source.saveSession(generated);const candidate=generated.candidates.find(row=>row.numerology);expect(candidate?.numerology).toBeTruthy();const numerologyTampered=tamperBackup(source.backupBytes(),db=>{const row=db.exec('SELECT id,json FROM sessions LIMIT 1')[0].values[0];const value=JSON.parse(String(row[1]));const current=value.candidates.find((entry:any)=>entry.numerology);current.numerology.strokes[0].options[0].note='tampered-numerology-note';db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(value),String(row[0])]);});const numDecoded=decodeCustomerBackup(numerologyTampered),numDb=new SQL.Database(numDecoded.sqlite);bindCompactCustomerDatabase(numDb);const numRow=numDb.exec('SELECT json FROM sessions LIMIT 1')[0].values[0][0];expect(JSON.parse(String(numRow)).candidates.some((entry:any)=>entry.numerology?.strokes?.[0]?.options?.[0]?.note==='tampered-numerology-note')).toBe(true);numDb.close();let numError:unknown;try{target.restore(numerologyTampered);}catch(error){numError=error;}expect(numError).toBeTruthy();expect(String((numError as Error).message)).toMatch(/备份字段不完整/);
 },60000);
});
