import type {Bootstrap,NamingSession} from '../shared/types';
import {DEFAULT_SESSION_FILTERS,filterSessions,sessionCustomerOptions,validateSessionFilters,type SessionFilters} from '../shared/session-catalog';

/** Renderer-local structural overlay until the backend-owned shared type lands. */
export interface CatalogSummary {
  id:string;profileId:string;createdAt:string;reviewNote:string;dataVersion:string;
  profile:{id:string;customerName:string;surname:string;fatherName?:string;motherName?:string};
  candidateCount:number;favoriteCount:number;candidateFactsVerified:false;
}
export interface CatalogPage {items:CatalogSummary[];nextCursor?:string;total:number;matched:number;customers:{id:string;label:string}[];profileCounts:Record<string,number>;}
export interface CatalogInput {limit?:number;cursor?:string;filters?:SessionFilters;}
export interface SessionCatalogApi {listSessionCatalog(input?:CatalogInput):Promise<CatalogPage>;readSessionDetail(id:string):Promise<NamingSession|null>;}
export type CatalogBootstrap=Bootstrap&{sessionCatalog?:CatalogPage};
export const CATALOG_PAGE_LIMIT=25;
const defaults=()=>({...DEFAULT_SESSION_FILTERS});
const equalFilters=(a:SessionFilters,b:SessionFilters)=>Object.keys(DEFAULT_SESSION_FILTERS).every(key=>a[key as keyof SessionFilters]===b[key as keyof SessionFilters]);
export function validCatalogPage(value:unknown):value is CatalogPage {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const v=value as CatalogPage;
  return Number.isSafeInteger(v.total)&&v.total>=0&&Number.isSafeInteger(v.matched)&&v.matched>=0&&v.matched<=v.total&&
    (!Object.hasOwn(v,'nextCursor')||typeof v.nextCursor==='string'&&v.nextCursor.length>0)&&
    Array.isArray(v.items)&&v.items.length<=v.matched&&new Set(v.items.map(row=>row?.id)).size===v.items.length&&v.items.every(row=>row&&typeof row.id==='string'&&!!row.id&&typeof row.profileId==='string'&&typeof row.createdAt==='string'&&typeof row.reviewNote==='string'&&typeof row.dataVersion==='string'&&row.candidateFactsVerified===false&&Number.isSafeInteger(row.candidateCount)&&row.candidateCount>=0&&Number.isSafeInteger(row.favoriteCount)&&row.favoriteCount>=0&&row.favoriteCount<=row.candidateCount&&row.profile&&typeof row.profile.id==='string'&&typeof row.profile.customerName==='string'&&typeof row.profile.surname==='string')&&
    Array.isArray(v.customers)&&v.customers.every(row=>row&&typeof row.id==='string'&&typeof row.label==='string')&&!!v.profileCounts&&typeof v.profileCounts==='object'&&Object.values(v.profileCounts).every(n=>Number.isSafeInteger(n)&&n>=0);
}
const summary=(s:NamingSession):CatalogSummary=>({id:s.id,profileId:s.profileId,createdAt:s.createdAt,reviewNote:s.reviewNote,dataVersion:s.dataVersion,profile:{id:s.profile.id,customerName:s.profile.customerName,surname:s.profile.surname,...(s.profile.fatherName?{fatherName:s.profile.fatherName}:{}),...(s.profile.motherName?{motherName:s.profile.motherName}:{})},candidateCount:s.candidates.length,favoriteCount:s.candidates.filter(c=>c.favorite).length,candidateFactsVerified:false});
/** Compatibility for old fixtures only. Production always uses the two paginated methods. */
export function legacyCatalogPage(sessions:readonly NamingSession[],input:CatalogInput={}):CatalogPage {
  const filtered=filterSessions(sessions,input.filters??defaults()),offset=input.cursor?Number(input.cursor):0,limit=input.limit??CATALOG_PAGE_LIMIT;
  if(!Number.isSafeInteger(offset)||offset<0)throw Error('目录游标无效。');
  const profileCounts:Record<string,number>={};for(const s of sessions)profileCounts[s.profileId]=(profileCounts[s.profileId]??0)+1;
  const end=offset+limit;
  return {items:filtered.slice(offset,end).map(summary),...(end<filtered.length?{nextCursor:String(end)}:{}),total:sessions.length,matched:filtered.length,customers:sessionCustomerOptions([...sessions]),profileCounts};
}
export function createLegacyCatalogApi(getSessions:()=>readonly NamingSession[]):SessionCatalogApi {
  return {listSessionCatalog:async input=>legacyCatalogPage(getSessions(),input),readSessionDetail:async id=>{const row=getSessions().find(s=>s.id===id);return row?structuredClone(row):null;}};
}
export interface CatalogState {
  filters:SessionFilters;phase:'idle'|'loading'|'ready'|'error';page?:CatalogPage;
  total:number;profileCounts:Record<string,number>;customers:{id:string;label:string}[];
  cursors:(string|undefined)[];pageNumber:number;error?:string;api:SessionCatalogApi|undefined;
}
export function createSessionCatalogController({getApi}:{getApi:()=>SessionCatalogApi|undefined}){
  let alive=false,serial=0,state:CatalogState={filters:defaults(),phase:'idle',total:0,profileCounts:{},customers:[],cursors:[undefined],pageNumber:1,api:getApi()};
  const listeners=new Set<()=>void>(),publish=(next:CatalogState)=>{state=next;for(const l of listeners)l();};
  const request=async(cursor:string|undefined,pageNumber:number,cursors:(string|undefined)[])=>{
    const api=getApi();if(!alive||!api)return;
    const filters={...state.filters},token=++serial;
    publish({...state,api,phase:'loading',page:undefined,pageNumber,cursors,error:undefined});
    try{
      const page=await api.listSessionCatalog({limit:CATALOG_PAGE_LIMIT,...(cursor?{cursor}:{}),filters});
      if(!alive||serial!==token||getApi()!==api)return;
      if(!validCatalogPage(page))throw Error('目录返回结构无效，请重新读取。');
      publish({...state,phase:'ready',page,total:page.total,profileCounts:{...page.profileCounts},customers:[...page.customers],error:undefined});
    }catch(error){if(alive&&serial===token&&getApi()===api)publish({...state,phase:'error',page:undefined,error:error instanceof Error?error.message:'目录读取失败，请重试。'});}
  };
  return {
    getSnapshot:()=>state,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},
    activate:()=>{alive=true;},dispose:()=>{alive=false;serial++;},
    seed:(page:CatalogPage)=>{
      serial++;if(!validCatalogPage(page))throw Error('初始目录无效。');
      const base={...state,api:getApi(),total:page.total,profileCounts:{...page.profileCounts},customers:[...page.customers],cursors:[undefined],pageNumber:1,error:undefined};
      if(equalFilters(state.filters,defaults()))publish({...base,phase:'ready',page});
      else{publish({...base,phase:'idle',page:undefined});void request(undefined,1,[undefined]);}
    },
    setFilters:(filters:SessionFilters)=>{serial++;const error=validateSessionFilters(filters);publish({...state,filters:{...filters},phase:error?'error':'idle',page:undefined,pageNumber:1,cursors:[undefined],error});if(!error)void request(undefined,1,[undefined]);},
    refresh:()=>{serial++;return request(undefined,1,[undefined]);},
    retry:()=>/游标|目录已更新|筛选条件已改变/.test(state.error??'')?request(undefined,1,[undefined]):request(state.cursors[state.pageNumber-1],state.pageNumber,state.cursors),
    next:()=>{if(state.phase!=='ready'||!state.page?.nextCursor)return Promise.resolve();const cursor=state.page.nextCursor;return request(cursor,state.pageNumber+1,[...state.cursors.slice(0,state.pageNumber),cursor]);},
    previous:()=>{if(state.pageNumber<=1||state.phase==='loading')return Promise.resolve();return request(state.cursors[state.pageNumber-2],state.pageNumber-1,state.cursors.slice(0,state.pageNumber-1));},
  };
}
export type SessionCatalogController=ReturnType<typeof createSessionCatalogController>;

/** A read never reuses an earlier in-flight owner, even for A → B → A. */
export function createSessionDetailReader(){
  let active=true,epoch=0;const cache=new Map<string,NamingSession>();
  return {
    activate:()=>{active=true;},invalidate:()=>{epoch++;cache.clear();},dispose:()=>{active=false;epoch++;cache.clear();},
    remember:(session:NamingSession)=>{cache.delete(session.id);cache.set(session.id,structuredClone(session));while(cache.size>12)cache.delete(cache.keys().next().value!);},
    peek:(id:string)=>{const value=cache.get(id);return value?structuredClone(value):undefined;},
    read:async(api:SessionCatalogApi,id:string,canApply:()=>boolean,accept:(session:NamingSession)=>void)=>{
      const token=++epoch;
      const value=await api.readSessionDetail(id);
      if(!active||token!==epoch||!canApply())return 'superseded' as const;
      if(!value)return 'missing' as const;
      if(value.id!==id)throw Error('返回的方案编号与目录不一致。');
      accept(value);return 'loaded' as const;
    },
  };
}
