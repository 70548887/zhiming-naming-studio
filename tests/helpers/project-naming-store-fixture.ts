import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import initSqlJs from 'sql.js';
import {Store} from '../../src/main/store';
import {StudioService} from '../../src/main/service';
import {normalizePreferences} from '../../src/shared/workflow';
import type {BirthProfile,NamingPreferences,NamingSession,NameCandidate} from '../../src/shared/types';
import type {NamingElementMethodSelection,ProjectNamingUseSnapshot} from '../../src/shared/project-naming-use';
import fixture from '../fixtures/project-naming-use-m153.json';

export type ProjectSession=NamingSession&{analysis:NamingSession['analysis']&{projectNamingUse?:ProjectNamingUseSnapshot}};
export type StoreContext={store:Store;service:StudioService;directory:string};
const root=path.resolve(process.env.PROJECT_STORE_TEST_ROOT??'.');
export const dataDir=path.join(root,'data');
const wasm=createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm');
const prefix='project-store-boundary-m157-';
const owned=new Map<string,string>(),stores=new Set<Store>(),services=new Set<StudioService>();
let SQL:Awaited<ReturnType<typeof initSqlJs>>|undefined;
export const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
export const disk=(context:StoreContext)=>fs.readFileSync(path.join(context.directory,'customers.sqlite'));
export const selection=():NamingElementMethodSelection=>({methodId:'project-bazi-mainchain-145/1.3.1',entryPolicy:'month-branch-only'});
export const positiveProfile=()=>structuredClone(fixture.positive.profile) as BirthProfile;
export function projectPreferences():NamingPreferences&{namingElementMethod:NamingElementMethodSelection}{return{...normalizePreferences({length:1,requiredChars:fixture.positive.givenName,preferredElements:[],zodiacRules:false,numerology:false}),namingElementMethod:selection()};}
export function directory(){fs.mkdirSync(path.join(root,'.local'),{recursive:true});const parent=fs.realpathSync.native(path.join(root,'.local')),value=fs.realpathSync.native(fs.mkdtempSync(path.join(parent,prefix)));owned.set(value,parent);return value;}
function closeDatabase(store:Store){if(!stores.delete(store))return;try{store.db?.close();}catch(error){if(!/closed/i.test(error instanceof Error?error.message:String(error)))throw error;}}
export async function open(existing=directory()):Promise<StoreContext>{
 if(!owned.has(existing))throw Error('Refusing an unowned test directory');
 const store=new Store(existing,dataDir,wasm);stores.add(store);
 try{await store.init();}catch(error){closeDatabase(store);throw error;}
 const service=new StudioService(store,{read:()=>'',write:()=>{}},false);services.add(service);
 return{store,service,directory:existing};
}
export async function close(context:StoreContext){try{if(services.delete(context.service))await context.service.closeCmnReadingWorker();}finally{closeDatabase(context.store);}}
export async function cleanup(){
 const failures:unknown[]=[];
 for(const service of [...services])try{await service.closeCmnReadingWorker();}catch(error){failures.push(error);}finally{services.delete(service);}
 for(const store of [...stores])try{closeDatabase(store);}catch(error){failures.push(error);}
 for(const [value,parent]of owned){
  try{const absolute=path.resolve(value),stat=fs.lstatSync(absolute);if(path.dirname(absolute)!==parent||!path.basename(absolute).startsWith(prefix)||stat.isSymbolicLink()||!stat.isDirectory()||fs.realpathSync.native(absolute)!==absolute)throw Error('Unsafe owned test cleanup');fs.rmSync(absolute,{recursive:true,force:false});owned.delete(value);}catch(error){failures.push(error);}
 }
 if(failures.length)throw new AggregateError(failures,'Actual Store/worker cleanup failed');
}
export function selected(session:NamingSession):NameCandidate{const value=session.candidates.find(candidate=>candidate.givenName===fixture.positive.givenName);if(!value)throw Error('Actual required candidate is absent');return value;}
export function rawSession(context:StoreContext,id:string):ProjectSession{const row=context.store.db.exec('SELECT json FROM sessions WHERE id=?',[id])[0]?.values[0]?.[0];if(typeof row!=='string')throw Error('Actual SQL session row missing');return JSON.parse(row);}
export function read(context:StoreContext,id:string):ProjectSession{const session=context.store.readVerifiedSession(id);if(!session)throw Error('Actual verified session missing');return session as ProjectSession;}
export function oldHundred(session:NamingSession):ProjectSession{const forged=structuredClone(session) as ProjectSession;selected(forged).evaluation.traditional=fixture.positive.legacyTraditional;return forged;}
/** Remove only the project footprint on a full real session, never the whole
 * source list/candidate array. Its old100 score is a consistent legacy-shaped
 * negative with an existing project row as the external identity anchor. */
export function removedProjectFootprint(session:NamingSession):ProjectSession{
 const forged=oldHundred(session);
 delete forged.analysis.projectNamingUse;
 delete (forged.preferences as NamingPreferences&{namingElementMethod?:NamingElementMethodSelection}).namingElementMethod;
 if(forged.profile.namingPreferences)delete (forged.profile.namingPreferences as NamingPreferences&{namingElementMethod?:NamingElementMethodSelection}).namingElementMethod;
 forged.sourceSnapshot!.sources=forged.sourceSnapshot!.sources.filter(source=>!['project-bazi-mainchain-145','naming-element-application-v1'].includes(source.id));
 return forged;
}
export async function changedBackup(bytes:Uint8Array,target:'current'|'history'):Promise<Uint8Array>{
 SQL??=await initSqlJs({locateFile:()=>wasm});const database=new SQL.Database(bytes);
 try{
  const table=target==='current'?'sessions':'revisions',row=database.exec('SELECT id,json FROM '+table+' ORDER BY id LIMIT 1')[0]?.values[0];
  if(!row||typeof row[1]!=='string')throw Error('Actual full backup lacks target row');
  const session=JSON.parse(row[1]) as NamingSession;
  if(!session.candidates.length||!session.sourceSnapshot?.sources.length||(session.analysis as ProjectSession['analysis']).projectNamingUse===undefined)throw Error('Fault input lost its real baseline');
  database.run('UPDATE '+table+' SET json=? WHERE id=?',[JSON.stringify(oldHundred(session)),row[0]]);
  return database.export();
 }finally{database.close();}
}
export function realArchiveMatches(context:StoreContext,session:NamingSession):boolean{
 const hash=session.factVerification?.datasetSha256;if(!hash||!['verified-builtin','verified-archive'].includes(session.factVerification!.status))return false;
 const archived=context.store.db.exec('SELECT sha256,pack FROM knowledge_archives')[0]?.values??[];
 if(archived.some(row=>row[0]===hash&&row[1] instanceof Uint8Array&&digest(row[1])===hash))return true;
 return['knowledge.sqlite','knowledge-v5.sqlite','knowledge-v6.sqlite'].some(file=>digest(fs.readFileSync(path.join(dataDir,file)))===hash);
}
export function installPrivateBytes(value:string,bytes:Uint8Array){if(!owned.has(value))throw Error('Unowned private SQL copy');const target=path.join(value,'customers.sqlite'),temporary=target+'.tmp';fs.writeFileSync(temporary,bytes);fs.renameSync(temporary,target);}
export const originalFixture=fixture;
