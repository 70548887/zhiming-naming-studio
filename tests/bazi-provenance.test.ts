import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadBaziSources, verifyBaziProvenance } from '../src/main/bazi-data';
import { StudioService } from '../src/main/service';
import { Store } from '../src/main/store';
import { createSessionSourceSnapshot, sessionSourceStatus } from '../src/shared/session-sources';
import type { BirthProfile, NamingPreferences, NamingSession, SourceRecord } from '../src/shared/types';

const directories:string[]=[],stores:Store[]=[];
const shipped=loadBaziSources(resolve('data'));
const profile:BirthProfile={id:'bazi-provenance-customer',customerName:'来源验证',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',leapMonth:false,timeUnknown:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
const preferences:NamingPreferences={length:2,generationChar:'',requiredChars:'安宁',forbiddenChars:'',elderTaboo:'',style:'自然',meanings:'平安',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false};
async function generated(){
  const directory=mkdtempSync(join(tmpdir(),'bazi-provenance-'));directories.push(directory);
  const store=await new Store(directory,resolve('data'),resolve('node_modules/sql.js/dist/sql-wasm.wasm')).init();stores.push(store);
  const service=new StudioService(store,{read:()=>'',write:()=>{}},false);
  return (await service.generate(profile,preferences)).session;
}
afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const directory of directories.splice(0))rmSync(directory,{recursive:true,force:true});});

describe('current Bazi evidence provenance binding', { timeout: 15_000 },()=>{
  it('accepts the complete generated manifest without mutating it',async()=>{
    const session=await generated(),before=structuredClone(session);
    expect(session.analysis.bazi.evidence).toBeDefined();expect(session.sourceSnapshot).toBeDefined();
    expect(()=>verifyBaziProvenance(session,shipped)).not.toThrow();expect(session).toEqual(before);
  });
  it('rejects every changed SourceRecord field even when the canonical evidence and source ID stay unchanged',async()=>{
    const session=await generated(),evidence=structuredClone(session.analysis.bazi.evidence);
    const edits:{field:string;mutate:(source:SourceRecord)=>void}[]=[
      {field:'id',mutate:source=>{source.id+='-renamed';}},
      {field:'name',mutate:source=>{source.name='被替换的规则名称';}},
      {field:'url',mutate:source=>{source.url='https://example.test/replaced-source';}},
      {field:'commit',mutate:source=>{source.commit='replaced-revision';}},
      {field:'license',mutate:source=>{source.license='replaced-license';}},
      {field:'files',mutate:source=>{source.files=['data/replaced.json'];}},
      {field:'sha256',mutate:source=>{source.sha256='f'.repeat(64);}},
      {field:'note',mutate:source=>{source.note='错误的来源解释';}},
    ];
    for(const expected of shipped)for(const edit of edits){
      const modified=structuredClone(session),source=modified.sourceSnapshot!.sources.find(source=>source.id===expected.id)!;
      edit.mutate(source);expect(modified.analysis.bazi.evidence).toEqual(evidence);
      expect(()=>verifyBaziProvenance(modified,shipped),`${expected.id}/${edit.field}`).toThrow('固定规则资料不一致');
    }
  });
  it('rejects missing and duplicated fixed source identities and a mismatched data version',async()=>{
    const session=await generated();
    for(const expected of shipped){
      const missing=structuredClone(session);missing.sourceSnapshot!.sources=missing.sourceSnapshot!.sources.filter(source=>source.id!==expected.id);
      expect(()=>verifyBaziProvenance(missing,shipped)).toThrow('固定规则资料不一致');
      const duplicate=structuredClone(session);duplicate.sourceSnapshot!.sources.push(structuredClone(expected));
      expect(()=>verifyBaziProvenance(duplicate,shipped)).toThrow('来源快照格式无效');
    }
    const wrong=structuredClone(session);wrong.sourceSnapshot!.dataVersion='another-pack';expect(()=>verifyBaziProvenance(wrong,shipped)).toThrow('数据版本不一致');
    const wrongVersion=structuredClone(session);(wrongVersion.sourceSnapshot as any).version='session-sources/unknown';expect(()=>verifyBaziProvenance(wrongVersion,shipped)).toThrow('来源快照格式无效');
    expect(()=>verifyBaziProvenance(session,shipped.slice(1))).toThrow('固定规则资料不一致');
  });
  it('does not substitute current custom knowledge metadata for the historical source registry',async()=>{
    const session=await generated(),snapshot=structuredClone(session.sourceSnapshot);
    const knowledge=session.sourceSnapshot!.sources.find(source=>source.id==='shijing')!;
    knowledge.url='https://example.test/historical-custom-pack';knowledge.commit='historical-custom-revision';knowledge.sha256='custom-historical-hash';
    expect(()=>verifyBaziProvenance(session,shipped)).not.toThrow();
    expect(session.sourceSnapshot!.sources.find(source=>source.id==='shijing')?.url).toBe('https://example.test/historical-custom-pack');
    expect(session.sourceSnapshot!.sources.filter(source=>shipped.some(fixed=>fixed.id===source.id))).toEqual(snapshot!.sources.filter(source=>shipped.some(fixed=>fixed.id===source.id)));
  });
  it('keeps absent legacy manifests missing and does not attach a new manifest to older evidence-free records',async()=>{
    const session=await generated();delete session.sourceSnapshot;
    expect(()=>verifyBaziProvenance(session,shipped)).not.toThrow();expect(session.sourceSnapshot).toBeUndefined();expect(sessionSourceStatus(session).status).toBe('missing');
    const older=structuredClone(session);delete older.analysis.bazi.evidence;
    older.sourceSnapshot=createSessionSourceSnapshot(older.dataVersion,[{id:'historical-only',name:'历史资料',url:'',commit:'old',license:'',files:[],sha256:'',note:''}]);
    const before=structuredClone(older);expect(()=>verifyBaziProvenance(older,shipped)).not.toThrow();expect(older).toEqual(before);
    const unknown=structuredClone(session);unknown.analysis.bazi.evidence!.version='future-unknown';
    expect(()=>verifyBaziProvenance(unknown,shipped)).not.toThrow();expect(unknown.sourceSnapshot).toBeUndefined();
  });
});
