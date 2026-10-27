import {describe,it,expect,vi} from 'vitest';
import {readB04Query,hasB04WordContextApi,createB04QueryController} from '../src/renderer/b04-word-context-state';
import type {B04WordContextApi} from '../src/shared/b04-word-context';

describe('manual word-context query input and unavailable service',()=>{
 it('keeps the exact selected reading, omits an empty reading, and accepts one supplementary Han character',()=>{
  expect(readB04Query(' 渤 ',' bó ')).toEqual({char:'渤',pinyin:'bó'});
  expect(readB04Query('渤','   ')).toEqual({char:'渤'});
  expect(readB04Query('𠀀','')).toEqual({char:'𠀀'});
  for(const char of ['', '渤海','A','😀'])expect(()=>readB04Query(char,'')).toThrow('一个汉字');
  expect(()=>readB04Query('渤','a\nb')).toThrow('有效的读音');
 });
 it('requires the unique read method without executing an accessor or borrowing the meaning-save API',()=>{
  let getters=0;const accessor=Object.defineProperty({},'getB04WordContextOptions',{get(){getters++;return()=>{};}});
  expect(hasB04WordContextApi(accessor)).toBe(false);expect(getters).toBe(0);
  expect(hasB04WordContextApi({getMeaningContextOptions(){},updateMeaningContext(){}})).toBe(false);
  expect(hasB04WordContextApi({getB04WordContextOptions(){}})).toBe(true);
 });
 it('does not query on construction, activation, typing, an invalid input or a disabled request',async()=>{
  const method=vi.fn(async()=>{throw Error('No request expected');}),api:B04WordContextApi={getB04WordContextOptions:method};let disabled=false;
  const controller=createB04QueryController({getApi:()=>api,isDisabled:()=>disabled});controller.activate();controller.setChar('渤海');controller.setPinyin('bó');expect(method).not.toHaveBeenCalled();
  await controller.query();expect(controller.getSnapshot().phase).toBe('error');expect(controller.getSnapshot().errorKind).toBe('input');expect(method).not.toHaveBeenCalled();
  controller.setChar('渤');disabled=true;await controller.query();expect(method).not.toHaveBeenCalled();controller.dispose();
 });
 it('keeps typed input when the API is absent and ignores an error after unmount',async()=>{
  let reject!:(e:Error)=>void;const api:B04WordContextApi={getB04WordContextOptions:()=>new Promise((_resolve,no)=>{reject=no;})};let current:B04WordContextApi|undefined;
  const controller=createB04QueryController({getApi:()=>current,initialChar:'渤',initialPinyin:'bó'});controller.activate();await controller.query();expect(controller.getSnapshot().char).toBe('渤');expect(controller.getSnapshot().phase).toBe('idle');
  current=api;controller.refreshApi();const request=controller.query();expect(controller.getSnapshot().phase).toBe('loading');controller.dispose();const after=controller.getSnapshot();reject(Error('private failure'));await request;expect(controller.getSnapshot()).toBe(after);expect(after.error).toBeUndefined();
 });
});
