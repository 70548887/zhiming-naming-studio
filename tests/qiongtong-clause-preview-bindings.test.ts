import {describe,it,expect} from 'vitest';
import {ownsClausePreviewLease,validClausePreviewResponse,type ClausePreviewWithJia,type ClausePreviewLease} from '../src/renderer/qiongtong-clause-preview-bindings';
import legacyJSON from './fixtures/m615-legacy-service-preview.json';import jiaRows from './fixtures/jia-actual-core-references.json';
const legacy=legacyJSON as unknown as ClausePreviewWithJia,copy=<T,>(value:T):T=>structuredClone(value);
describe('same read-method compatibility and owned response boundaries',()=>{
 it('accepts an unchanged actual legacy Service response without inventing a Jia group or receipt',()=>{
  const before=JSON.stringify(legacy);expect(Object.hasOwn(legacy,'jiaChapter')).toBe(false);expect(Object.hasOwn(legacy,'jiaSourceVerification')).toBe(false);expect(validClausePreviewResponse(legacy,legacy.profileId)).toBe(true);expect(JSON.stringify(legacy)).toBe(before);expect(validClausePreviewResponse(legacy,legacy.profileId+'-other')).toBe(false);
 });
 it('rejects absent old verification and an unverified half-pair instead of promoting a pure domain DTO to an API-verified result',()=>{
  const missing=copy(legacy) as unknown as Record<string,unknown>;delete missing.sourceVerification;expect(validClausePreviewResponse(missing as unknown as ClausePreviewWithJia,legacy.profileId)).toBe(false);
  const half={...copy(legacy),jiaChapter:jiaRows[0].reference} as unknown as ClausePreviewWithJia;expect(validClausePreviewResponse(half,legacy.profileId)).toBe(false);expect(Object.hasOwn(half,'jiaSourceVerification')).toBe(false);
 });
 it('keeps the newest request and rejects an earlier A after A-to-B-to-A identities even with the same profile key',()=>{
  const api={},old:ClausePreviewLease={key:'A',api,epoch:0,request:1},current={...old,alive:true};expect(ownsClausePreviewLease(current,old)).toBe(true);expect(ownsClausePreviewLease({...current,request:2},old)).toBe(false);expect(ownsClausePreviewLease({...current,key:'B',epoch:1},old)).toBe(false);expect(ownsClausePreviewLease({...current,key:'A',epoch:2},old)).toBe(false);
 });
 it('isolates API replacements and unmounted or reactivated instances without changing any source DTO',async()=>{
  const api={},lease:ClausePreviewLease={key:'A',api,epoch:0,request:1},current={...lease,alive:true};expect(ownsClausePreviewLease({...current,api:{}},lease)).toBe(false);expect(ownsClausePreviewLease({...current,alive:false},lease)).toBe(false);expect(ownsClausePreviewLease({...current,epoch:1,request:2},lease)).toBe(false);
  let resolve!:(value:ClausePreviewWithJia)=>void,adopted:ClausePreviewWithJia|undefined;const later=new Promise<ClausePreviewWithJia>(yes=>{resolve=yes;}).then(value=>{if(ownsClausePreviewLease({...current,epoch:1,request:2},lease)&&validClausePreviewResponse(value,value.profileId))adopted=value;});resolve(copy(legacy));await later;expect(adopted).toBeUndefined();
 });
});
