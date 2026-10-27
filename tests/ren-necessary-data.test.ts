import {afterEach,describe,expect,it} from 'vitest';
import {mkdtempSync,mkdirSync,copyFileSync,chmodSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join,resolve,dirname} from 'node:path';
import {loadRenNecessaryData,loadRenNecessarySources,verifyRenNecessaryProvenance,REN_NECESSARY_SOURCE_ID} from '../src/main/ren-necessary-data';
import {createSessionSourceSnapshot} from '../src/shared/session-sources';
import {REN_METHOD,LEGACY_REN_METHOD} from '../src/shared/ren-method';
import type {NamingSession,SourceRecord} from '../src/shared/types';
const dirs:string[]=[],data=resolve('data');afterEach(()=>dirs.splice(0).forEach(dir=>rmSync(dir,{recursive:true,force:true})));
const copied=()=>{const dir=mkdtempSync(join(tmpdir(),'ren-necessary-data-'));dirs.push(dir);const lock=JSON.parse(readFileSync(join(data,'ren-necessary-source-lock.json'),'utf8'));for(const path of ['data/ren-necessary-source-lock.json',...lock.sources[0].files]){const target=join(dir,path.slice(5));mkdirSync(dirname(target),{recursive:true});copyFileSync(resolve(path),target);chmodSync(target,0o600);}return dir;};
function session():NamingSession {const sources=loadRenNecessarySources(data);return{dataVersion:'test',profile:{renMethod:REN_METHOD},analysis:{renCommentary:{version:REN_METHOD,profileId:REN_METHOD,necessaryConditions:{sourceId:REN_NECESSARY_SOURCE_ID}}},sourceSnapshot:createSessionSourceSnapshot('test',sources)} as unknown as NamingSession;}
describe('Ren necessary clause addon locks the exact full original sentence and its own independent publication',()=>{
  it('loads both fixed full-context rules and their table vocabulary without editing the old Ren source',()=>{
    const loaded=loadRenNecessaryData(data);expect(loaded.rules.map(rule=>rule.id)).toEqual(['child-wealth-required','child-output-superset-required']);expect(loaded.sources).toHaveLength(1);expect(loaded.sources[0].id).toBe(REN_NECESSARY_SOURCE_ID);expect(loaded.sources[0].license).toBe('CC-BY-SA-4.0');
    const original=JSON.parse(readFileSync(join(data,'raw/ren-necessary-excerpts.json'),'utf8')).excerpts[0];for(const rule of loaded.rules){expect(rule.sourceQuote).toBe(original.quote);expect(rule.sourceLocator).toBe('oldid=2600158;codepoint[105319,105406)');expect([...rule.sourceQuote]).toHaveLength(rule.sourceSpan.end-rule.sourceSpan.start);expect(rule.sourceQuote).toContain('四柱虽有比劫');}
    const notice=readFileSync(join(data,'raw/ren-necessary-NOTICE.md'),'utf8');expect(notice).toContain('贡献者历史');expect(notice).toContain('未把影印校字');expect(notice).toContain('不宣称任注唯一取法');expect(readFileSync(join(data,'raw/CC-BY-SA-4.0.txt'),'utf8')).toContain('Creative Commons');
    loaded.rules[0].name='外改';loaded.sources[0].files=[];expect(loadRenNecessaryData(data).rules[0].name).not.toBe('外改');expect(loadRenNecessaryData(data).sources[0].files.length).toBe(4);
  });
  it.each(['ren-necessary-source-lock.json','ren-necessary-rules.json','raw/ren-necessary-excerpts.json','raw/ren-necessary-NOTICE.md','raw/CC-BY-SA-4.0.txt'])('rejects modified publication bytes: %s',relative=>{
    const dir=copied(),path=join(dir,relative);writeFileSync(path,readFileSync(path,'utf8')+'\nchanged');expect(()=>loadRenNecessarySources(dir)).toThrow('校验失败');
  });
  it('requires the exact addon metadata only for current1.1 and rejects source grafts onto1.0 or none',()=>{
    const value=session(),sources=loadRenNecessarySources(data);expect(()=>verifyRenNecessaryProvenance(value,sources)).not.toThrow();
    for(const method of [LEGACY_REN_METHOD,'none',undefined]){const old=session();old.profile.renMethod=method as never;delete old.analysis.renCommentary;expect(()=>verifyRenNecessaryProvenance(old,sources)).toThrow('旧版或未启用');delete old.sourceSnapshot;expect(()=>verifyRenNecessaryProvenance(old,sources)).not.toThrow();}
    const edits:((source:SourceRecord)=>void)[]=[source=>{source.id='changed';},source=>{source.name='changed';},source=>{source.url='changed';},source=>{source.commit='changed';},source=>{source.license='changed';},source=>{source.files=[];},source=>{source.sha256='changed';},source=>{source.note='changed';}];
    for(const edit of edits){const s=session();edit(s.sourceSnapshot!.sources[0]);expect(()=>verifyRenNecessaryProvenance(s,sources)).toThrow();}
    const missing=session();delete missing.sourceSnapshot;expect(()=>verifyRenNecessaryProvenance(missing,sources)).toThrow('来源清单');const missingResult=session();delete missingResult.analysis.renCommentary!.necessaryConditions;expect(()=>verifyRenNecessaryProvenance(missingResult,sources)).toThrow('必要条件结果');
    const duplicate=session();duplicate.sourceSnapshot!.sources.push(sources[0]);expect(()=>verifyRenNecessaryProvenance(duplicate,sources)).toThrow();
  });
});
