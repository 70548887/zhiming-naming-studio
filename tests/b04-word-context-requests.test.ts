import {describe,it,expect} from 'vitest';
import type {B04WordContextApi,B04WordContextOptions,B04WordContextQuery} from '../src/shared/b04-word-context';
import {createB04QueryController,matchesB04Query} from '../src/renderer/b04-word-context-state';
import availableJSON from './fixtures/b04-actual-available.json';
import notCoveredJSON from './fixtures/b04-actual-not-covered.json';

const available=availableJSON as B04WordContextOptions,notCovered=notCoveredJSON as B04WordContextOptions;
const queryOf=(value:B04WordContextOptions):B04WordContextQuery=>value.pinyin?{char:value.char,pinyin:value.pinyin}:{char:value.char};
const a=queryOf(available),b=queryOf(notCovered),copy=<T,>(value:T):T=>structuredClone(value);
function pendingApi(){const calls:{query:B04WordContextQuery;resolve:(value:B04WordContextOptions)=>void;reject:(e:Error)=>void}[]=[];const api:B04WordContextApi={getB04WordContextOptions:query=>new Promise((resolve,reject)=>calls.push({query:copy(query),resolve,reject}))};return{api,calls};}
const controllerFor=(getApi:()=>B04WordContextApi|undefined)=>createB04QueryController({getApi,initialChar:a.char,initialPinyin:a.pinyin??''});

describe('word-context requests with unchanged actual Service fixtures',()=>{
 it('uses actual distinct available and not-covered query fixtures with off/false/zero scope',()=>{
  expect(available.status).toBe('available');expect(notCovered.status).toBe('not-covered');expect(a).not.toEqual(b);expect(matchesB04Query(available,a)).toBe(true);expect(matchesB04Query(notCovered,b)).toBe(true);
 });
 it('sends only an explicit exact query, blocks pending duplicates and adopts the original returned DTO without modification',async()=>{
  const fake=pendingApi(),controller=controllerFor(()=>fake.api);controller.activate();expect(fake.calls).toHaveLength(0);const p=controller.query();void controller.query();expect(fake.calls).toHaveLength(1);expect(fake.calls[0].query).toEqual(a);const actual=copy(available),before=copy(actual);fake.calls[0].resolve(actual);await p;expect(controller.getSnapshot().result).toBe(actual);expect(actual).toEqual(before);expect(controller.getSnapshot().phase).toBe('ready');controller.dispose();
 });
 it('keeps the latest new query after an older success settles',async()=>{
  const fake=pendingApi(),controller=controllerFor(()=>fake.api);controller.activate();const old=controller.query();controller.setChar(b.char);controller.setPinyin(b.pinyin??'');expect(fake.calls).toHaveLength(1);const latest=controller.query();expect(fake.calls[1].query).toEqual(b);const current=copy(notCovered);fake.calls[1].resolve(current);await latest;const snapshot=controller.getSnapshot();fake.calls[0].resolve(copy(available));await old;expect(controller.getSnapshot()).toBe(snapshot);expect(snapshot.result).toBe(current);controller.dispose();
 });
 it('rejects old success and failure after separate character or reading A-to-B-to-A input changes',async()=>{
  for(const field of ['char','pinyin'] as const)for(const kind of ['resolve','reject'] as const){const fake=pendingApi(),controller=controllerFor(()=>fake.api);controller.activate();const old=controller.query();if(field==='char'){controller.setChar(a.char+'字');controller.setChar(a.char);}else{controller.setPinyin((a.pinyin??'')+'x');controller.setPinyin(a.pinyin??'');}expect(fake.calls).toHaveLength(1);if(kind==='resolve')fake.calls[0].resolve(copy(available));else fake.calls[0].reject(Error('old error'));await old;expect(controller.getSnapshot().phase).toBe('idle');expect(controller.getSnapshot().result).toBeUndefined();expect(controller.getSnapshot().error).toBeUndefined();const current=controller.query();fake.calls[1].resolve(copy(available));await current;expect(controller.getSnapshot().phase).toBe('ready');controller.dispose();}
 });
 it('ignores old API success and error without clearing a replacement API pending read',async()=>{
  const first=pendingApi(),second=pendingApi(),third=pendingApi();let current=first.api;const controller=controllerFor(()=>current);controller.activate();const oldSuccess=controller.query();current=second.api;controller.refreshApi();const oldError=controller.query();current=third.api;controller.refreshApi();expect(third.calls).toHaveLength(0);const latest=controller.query();first.calls[0].resolve(copy(available));second.calls[0].reject(Error('old API failure'));await Promise.all([oldSuccess,oldError]);expect(controller.getSnapshot().phase).toBe('loading');expect(controller.getSnapshot().error).toBeUndefined();third.calls[0].resolve(copy(available));await latest;expect(controller.getSnapshot().phase).toBe('ready');controller.dispose();
 });
 it('ignores unmounted requests even after StrictMode-style activation, then permits an explicit fresh read',async()=>{
  for(const kind of ['resolve','reject'] as const){const fake=pendingApi(),controller=controllerFor(()=>fake.api);controller.activate();const old=controller.query();controller.dispose();controller.activate();expect(fake.calls).toHaveLength(1);if(kind==='resolve')fake.calls[0].resolve(copy(available));else fake.calls[0].reject(Error('disposed request'));await old;expect(controller.getSnapshot().result).toBeUndefined();expect(controller.getSnapshot().error).toBeUndefined();const next=controller.query();fake.calls[1].resolve(copy(available));await next;expect(controller.getSnapshot().phase).toBe('ready');controller.dispose();}
 });
 it('preserves input through an error, hides internal error text, and retries only on a new explicit action',async()=>{
  const fake=pendingApi(),controller=controllerFor(()=>fake.api);controller.activate();const first=controller.query();fake.calls[0].reject(Error('D:/private/source/internal-file.json'));await first;const error=controller.getSnapshot();expect(error.phase).toBe('error');expect(error.char).toBe(a.char);expect(error.pinyin).toBe(a.pinyin??'');expect(error.error).toContain('保留当前输入');expect(error.error).not.toContain('D:/');expect(fake.calls).toHaveLength(1);const retry=controller.query();fake.calls[1].resolve(copy(available));await retry;expect(controller.getSnapshot().phase).toBe('ready');controller.dispose();
 });
 it('does not relabel an available empty or wrong-query result as not-covered',async()=>{
  const fake=pendingApi(),controller=controllerFor(()=>fake.api);controller.activate();const first=controller.query();fake.calls[0].resolve(copy(notCovered));await first;expect(controller.getSnapshot().phase).toBe('error');expect(controller.getSnapshot().errorKind).toBe('response');const empty=controller.query();fake.calls[1].resolve({...copy(available),options:[]});await empty;expect(controller.getSnapshot().result).toBeUndefined();expect(controller.getSnapshot().phase).toBe('error');controller.dispose();
 });
});
