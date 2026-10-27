import {describe,expect,it,vi} from 'vitest';
import type {NamingSession} from '../src/shared/types';
import {normalizePreferences} from '../src/shared/workflow';
import {DEFAULT_SESSION_FILTERS,type SessionFilters} from '../src/shared/session-catalog';
import {
  CATALOG_PAGE_LIMIT,createSessionCatalogController,createSessionDetailReader,
  type CatalogInput,type CatalogPage,type CatalogSummary,type SessionCatalogApi,
} from '../src/renderer/session-catalog-state';

function deferred<T>() {
  let resolve!:(value:T)=>void,reject!:(error:unknown)=>void;
  const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});
  return {promise,resolve,reject};
}
function summary(id:string):CatalogSummary {
  return {id,profileId:'customer-a',createdAt:'2026-10-25T01:00:00Z',reviewNote:'已保存意见',dataVersion:'fixture',
    profile:{id:'customer-a',customerName:'甲家长',surname:'林'},candidateCount:12,favoriteCount:2,candidateFactsVerified:false};
}
function page(ids=['server-row'],extra:Partial<CatalogPage>={}):CatalogPage {
  return {items:ids.map(summary),total:80,matched:40,customers:[{id:'customer-a',label:'甲家长'}],profileCounts:{'customer-a':80},...extra};
}
function session(id:string,reviewNote='已保存意见'):NamingSession {
  return {id,profileId:'customer-a',createdAt:'2026-10-25T01:00:00Z',
    profile:{id:'customer-a',customerName:'甲家长',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2026-10-20',leapMonth:false,birthTime:'09:30',timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''},
    preferences:normalizePreferences(),analysis:{bazi:{solarDate:'',lunarDate:'',zodiac:'马',pillars:[],elements:{木:0,火:0,土:0,金:0,水:0},favorable:['水'],unfavorable:[],strength:'',reasons:[],seasonalAdvice:'',warnings:[],version:'fixture',ruleDescription:''},qimen:{available:false,dun:'',ju:0,yuan:'',solarTerm:'',xun:'',chiefStar:'',chiefDoor:'',palaces:[],reasons:[],warnings:[],version:'fixture'}},
    candidates:[],reviewNote,originalFavorable:['水'],dataVersion:'fixture'};
}
function apiWith(listSessionCatalog:SessionCatalogApi['listSessionCatalog']):SessionCatalogApi {
  return {listSessionCatalog,readSessionDetail:vi.fn(async()=>null)};
}
const ready=async(controller:ReturnType<typeof createSessionCatalogController>)=>{
  await vi.waitFor(()=>expect(controller.getSnapshot().phase).toBe('ready'));
};

describe('paged session catalog request ownership',()=>{
  it('forwards every filter to the API and displays server summaries without filtering the current page',async()=>{
    const list=vi.fn<SessionCatalogApi['listSessionCatalog']>(async()=>page(['server-decided-match'],{total:600,matched:71,profileCounts:{'customer-a':400,'customer-b':200}}));
    const api=apiWith(list),controller=createSessionCatalogController({getApi:()=>api});controller.activate();
    const filters:SessionFilters={query:'只存在另一页的名字',customerId:'customer-b',surname:'欧阳',dateFrom:'2025-01-01',dateTo:'2026-10-25',favorite:'none',sort:'oldest'};
    controller.setFilters(filters);await ready(controller);
    expect(list).toHaveBeenCalledExactlyOnceWith({limit:CATALOG_PAGE_LIMIT,filters});
    expect(controller.getSnapshot().page?.items.map(item=>item.id)).toEqual(['server-decided-match']);
    expect(controller.getSnapshot()).toMatchObject({total:600,profileCounts:{'customer-a':400,'customer-b':200},page:{matched:71}});
    filters.query='later local mutation';
    expect(controller.getSnapshot().filters.query).toBe('只存在另一页的名字');
    expect(list.mock.calls[0][0]?.filters?.query).toBe('只存在另一页的名字');
  });

  it('uses opaque next and previous cursors and resets pagination when a filter changes',async()=>{
    const list=vi.fn(async(input?:CatalogInput)=>input?.cursor==='opaque:2'?page(['second'],{nextCursor:'opaque:3'}):page(['first'],{nextCursor:'opaque:2'}));
    const api=apiWith(list),controller=createSessionCatalogController({getApi:()=>api});controller.activate();
    await controller.refresh();await controller.next();
    expect(controller.getSnapshot()).toMatchObject({pageNumber:2,cursors:[undefined,'opaque:2'],page:{items:[{id:'second'}]}});
    await controller.previous();
    expect(list.mock.calls[2][0]).toEqual({limit:25,filters:{...DEFAULT_SESSION_FILTERS}});
    expect(controller.getSnapshot().pageNumber).toBe(1);
    await controller.next();
    controller.setFilters({...DEFAULT_SESSION_FILTERS,surname:'陈'});await ready(controller);
    expect(list.mock.lastCall?.[0]).toEqual({limit:25,filters:{...DEFAULT_SESSION_FILTERS,surname:'陈'}});
    expect(controller.getSnapshot()).toMatchObject({pageNumber:1,cursors:[undefined]});
    const calls=list.mock.calls.length;await controller.previous();expect(list).toHaveBeenCalledTimes(calls);
  });

  it('hides old rows on a page failure and retries the failed cursor with unchanged filters',async()=>{
    const list=vi.fn<SessionCatalogApi['listSessionCatalog']>()
      .mockResolvedValueOnce(page(['first'],{nextCursor:'page-two'}))
      .mockRejectedValueOnce(new Error('目录暂不可读'))
      .mockResolvedValueOnce(page(['second']));
    const api=apiWith(list),controller=createSessionCatalogController({getApi:()=>api});controller.activate();
    await controller.refresh();await controller.next();
    expect(controller.getSnapshot()).toMatchObject({phase:'error',page:undefined,pageNumber:2,error:'目录暂不可读'});
    await controller.retry();
    expect(list.mock.calls[2][0]).toEqual(list.mock.calls[1][0]);
    expect(controller.getSnapshot()).toMatchObject({phase:'ready',error:undefined,page:{items:[{id:'second'}]}});
  });

  it('retires a pending request when refreshed bootstrap seed arrives, then re-queries active filters',async()=>{
    const old=deferred<CatalogPage>(),filtered=deferred<CatalogPage>();
    const list=vi.fn<SessionCatalogApi['listSessionCatalog']>().mockReturnValueOnce(old.promise).mockReturnValueOnce(filtered.promise);
    const api=apiWith(list),controller=createSessionCatalogController({getApi:()=>api});controller.activate();
    const pending=controller.refresh();controller.seed(page(['fresh-seed'],{total:81}));
    old.resolve(page(['stale-response'],{total:2,matched:2}));await pending;
    expect(controller.getSnapshot()).toMatchObject({phase:'ready',total:81,page:{items:[{id:'fresh-seed'}]}});
    controller.setFilters({...DEFAULT_SESSION_FILTERS,query:'已筛选'});
    const oldFiltered=filtered;
    const fresh=deferred<CatalogPage>();list.mockReturnValueOnce(fresh.promise);
    controller.seed(page(['unfiltered-seed'],{total:82}));
    expect(controller.getSnapshot()).toMatchObject({phase:'loading',page:undefined,total:82});
    oldFiltered.resolve(page(['old-filtered']));await Promise.resolve();
    fresh.resolve(page(['fresh-filtered'],{total:82}));await ready(controller);
    expect(controller.getSnapshot().page?.items.map(item=>item.id)).toEqual(['fresh-filtered']);
    expect(list.mock.lastCall?.[0]?.filters?.query).toBe('已筛选');
  });

  it('rejects late results after API replacement and after same-input A to B to A requests',async()=>{
    const oldApiResult=deferred<CatalogPage>(),a1=deferred<CatalogPage>(),b=deferred<CatalogPage>(),a2=deferred<CatalogPage>();
    const oldApi=apiWith(vi.fn(()=>oldApiResult.promise));
    const list=vi.fn<SessionCatalogApi['listSessionCatalog']>().mockReturnValueOnce(a1.promise).mockReturnValueOnce(b.promise).mockReturnValueOnce(a2.promise);
    const nextApi=apiWith(list);let api=oldApi;
    const controller=createSessionCatalogController({getApi:()=>api});controller.activate();
    const pendingOld=controller.refresh();api=nextApi;
    oldApiResult.resolve(page(['old-api']));await pendingOld;
    expect(controller.getSnapshot().page).toBeUndefined();
    controller.setFilters({...DEFAULT_SESSION_FILTERS,query:'A'});
    controller.setFilters({...DEFAULT_SESSION_FILTERS,query:'B'});
    controller.setFilters({...DEFAULT_SESSION_FILTERS,query:'A'});
    a2.resolve(page(['latest-A']));await ready(controller);
    a1.resolve(page(['first-A']));b.resolve(page(['B']));await Promise.resolve();await Promise.resolve();
    expect(controller.getSnapshot()).toMatchObject({api:nextApi,filters:{query:'A'},page:{items:[{id:'latest-A'}]}});
  });

  it('does not publish pending success or rejection after unmount and can activate for a new owner',async()=>{
    const success=deferred<CatalogPage>(),failure=deferred<CatalogPage>();
    const list=vi.fn<SessionCatalogApi['listSessionCatalog']>().mockReturnValueOnce(success.promise).mockReturnValueOnce(failure.promise).mockResolvedValueOnce(page(['new-owner']));
    const api=apiWith(list),controller=createSessionCatalogController({getApi:()=>api}),listener=vi.fn();controller.subscribe(listener);controller.activate();
    const first=controller.refresh(),second=controller.refresh();controller.dispose();const publications=listener.mock.calls.length;
    success.resolve(page(['unmounted']));failure.reject(new Error('late failure'));await Promise.all([first,second]);
    expect(listener).toHaveBeenCalledTimes(publications);
    controller.activate();await controller.refresh();expect(controller.getSnapshot().page?.items[0].id).toBe('new-owner');
  });

  it('rejects malformed summaries and page metadata without retaining counts as rendered results',async()=>{
    const invalid:CatalogPage[]=[page(['duplicate','duplicate']),page(['bad'],{matched:81}),page(['bad'],{nextCursor:''}),page(['bad'])];
    invalid[3].items[0].candidateFactsVerified=true as false;
    const list=vi.fn<SessionCatalogApi['listSessionCatalog']>();for(const value of invalid)list.mockResolvedValueOnce(value);
    list.mockResolvedValueOnce(page(['recovered']));
    const api=apiWith(list),controller=createSessionCatalogController({getApi:()=>api});controller.activate();controller.seed(page(['old']));
    for(let index=0;index<invalid.length;index++){await controller.refresh();expect(controller.getSnapshot()).toMatchObject({phase:'error',page:undefined,error:'目录返回结构无效，请重新读取。'});}
    await controller.retry();expect(controller.getSnapshot().page?.items[0].id).toBe('recovered');
  });
});

describe('on-demand canonical session detail reader',()=>{
  it('accepts only the final A owner across A to B to A even when first A resolves last',async()=>{
    const a1=deferred<NamingSession|null>(),b=deferred<NamingSession|null>(),a2=deferred<NamingSession|null>();
    const read=vi.fn<SessionCatalogApi['readSessionDetail']>().mockReturnValueOnce(a1.promise).mockReturnValueOnce(b.promise).mockReturnValueOnce(a2.promise);
    const api={...apiWith(vi.fn(async()=>page())),readSessionDetail:read},reader=createSessionDetailReader(),accept=vi.fn();
    const first=reader.read(api,'A',()=>true,accept),middle=reader.read(api,'B',()=>true,accept),last=reader.read(api,'A',()=>true,accept);
    a2.resolve(session('A','new canonical'));expect(await last).toBe('loaded');
    b.resolve(session('B'));a1.resolve(session('A','old canonical'));expect(await middle).toBe('superseded');expect(await first).toBe('superseded');
    expect(read.mock.calls.map(([id])=>id)).toEqual(['A','B','A']);expect(accept).toHaveBeenCalledExactlyOnceWith(session('A','new canonical'));
  });

  it('preserves the draft for missing, failure, mismatched id, changed inputs and unmounted owners',async()=>{
    const reader=createSessionDetailReader();let draft=session('current','local unsaved note');const original=structuredClone(draft),accept=vi.fn((value:NamingSession)=>{draft=value;});
    const read=vi.fn<SessionCatalogApi['readSessionDetail']>().mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('detail offline')).mockResolvedValueOnce(session('other')).mockResolvedValueOnce(session('A'));
    const late=deferred<NamingSession|null>();read.mockReturnValueOnce(late.promise);
    const api={...apiWith(vi.fn(async()=>page())),readSessionDetail:read};
    expect(await reader.read(api,'A',()=>true,accept)).toBe('missing');
    await expect(reader.read(api,'A',()=>true,accept)).rejects.toThrow('detail offline');
    await expect(reader.read(api,'A',()=>true,accept)).rejects.toThrow('返回的方案编号与目录不一致');
    expect(await reader.read(api,'A',()=>false,accept)).toBe('superseded');
    const pending=reader.read(api,'A',()=>true,accept);reader.dispose();late.resolve(session('A'));expect(await pending).toBe('superseded');
    expect(accept).not.toHaveBeenCalled();expect(draft).toEqual(original);
  });

  it('keeps at most 12 canonical cache entries, clones values, and invalidates cached and pending owners',async()=>{
    const reader=createSessionDetailReader(),original=session('one');reader.remember(original);original.reviewNote='mutated caller';
    expect(reader.peek('one')?.reviewNote).toBe('已保存意见');
    const peeked=reader.peek('one')!;peeked.profile.customerName='mutated returned copy';expect(reader.peek('one')?.profile.customerName).toBe('甲家长');
    for(let index=0;index<12;index++)reader.remember(session(`cached-${index}`));
    expect(reader.peek('one')).toBeUndefined();expect(reader.peek('cached-0')).toBeDefined();
    reader.remember(session('cached-0','new saved note'));reader.remember(session('newest'));
    expect(reader.peek('cached-1')).toBeUndefined();expect(reader.peek('cached-0')?.reviewNote).toBe('new saved note');
    const pending=deferred<NamingSession|null>(),api={...apiWith(vi.fn(async()=>page())),readSessionDetail:vi.fn(()=>pending.promise)},accept=vi.fn();
    const reading=reader.read(api,'current',()=>true,accept);reader.invalidate();pending.resolve(session('current'));
    expect(await reading).toBe('superseded');expect(accept).not.toHaveBeenCalled();expect(reader.peek('cached-0')).toBeUndefined();
    reader.remember(session('after-refresh'));reader.dispose();expect(reader.peek('after-refresh')).toBeUndefined();
  });
});
