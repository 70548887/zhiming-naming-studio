import { describe,expect,it } from 'vitest';
import { resolve } from 'node:path';
import { loadNumerologyData } from '../src/main/numerology-data';
import { loadQimenSources } from '../src/main/qimen-data';
import { verifyFixedRuleProvenance } from '../src/main/fixed-rule-provenance';
import { createSessionSourceSnapshot } from '../src/shared/session-sources';
import type { NamingSession,SourceRecord } from '../src/shared/types';

const resources={qimenSources:loadQimenSources(resolve('data')),numerology:loadNumerologyData(resolve('data'))};
const registry=[...resources.qimenSources,...resources.numerology.strokes.sources,...resources.numerology.rules.sources];
const session=()=>({dataVersion:'fixed-source-test',sourceSnapshot:createSessionSourceSnapshot('fixed-source-test',registry),analysis:{qimen:{}},candidates:[]})as unknown as NamingSession;
describe('all fixed qimen and numerology source publications',()=>{
 it('rejects every changed field of every known fixed source even while calculation is disabled',()=>{
  const edits:((s:SourceRecord)=>void)[]=[s=>{s.id+='-forged';},s=>{s.name+='changed';},s=>{s.url='https://example.test/changed';},s=>{s.commit='changed';},s=>{s.license='changed';},s=>{s.files=['changed'];},s=>{s.sha256='f'.repeat(64);},s=>{s.note='changed';}];
  for(const fixed of registry)for(const [i,edit]of edits.entries()){const s=session(),record=s.sourceSnapshot!.sources.find(source=>source.id===fixed.id)!;edit(record);
   if(i===0)s.analysis.qimen.auxiliary={rules:[{sources:[{id:fixed.id}]}]}as any;
   expect(()=>verifyFixedRuleProvenance(s,resources),fixed.id+'/'+i).toThrow('固定来源');
  }
 });
 it('keeps old absent manifests and future unknown source IDs unverified without replacing current known IDs',()=>{
  const old=session();delete old.sourceSnapshot;expect(()=>verifyFixedRuleProvenance(old,resources)).not.toThrow();
  const future=session();future.sourceSnapshot!.sources.push({id:'future-numerology-new-publication',name:'未来版本',url:'',commit:'v2',license:'',files:[],sha256:'',note:''});expect(()=>verifyFixedRuleProvenance(future,resources)).not.toThrow();
  future.sourceSnapshot!.sources.find(source=>source.id==='breezy-kangxi-radicals')!.commit='different-unprovided-revision';expect(()=>verifyFixedRuleProvenance(future,resources)).toThrow('固定来源');
 });
});
