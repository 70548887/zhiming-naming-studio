import {afterEach,describe,expect,it} from 'vitest';
import {mkdtempSync,mkdirSync,copyFileSync,chmodSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';import {tmpdir} from 'node:os';
import {loadFollowingRestrictionsData,loadFollowingRestrictionsSources,verifyFollowingRestrictionsProvenance,FOLLOWING_RESTRICTIONS_SOURCE_ID} from '../src/main/following-restrictions-data';
import {createSessionSourceSnapshot} from '../src/shared/session-sources';
import type {NamingSession,SourceRecord} from '../src/shared/types';
const dirs:string[]=[];afterEach(()=>dirs.splice(0).forEach(dir=>rmSync(dir,{recursive:true,force:true})));
const data=resolve('data');
function copied(){const dir=mkdtempSync(join(tmpdir(),'following-restriction-source-'));dirs.push(dir);const lock=JSON.parse(readFileSync(join(data,'following-restrictions-source-lock.json'),'utf8'));for(const file of ['data/following-restrictions-source-lock.json',...lock.sources[0].files]){const relative=file.slice(5),target=join(dir,relative);mkdirSync(join(target,'..'),{recursive:true});copyFileSync(join(data,relative),target);chmodSync(target,0o600);}return dir;}
describe('fixed monthly restrictions keep exact source, excerpts, license and independently checked scope',()=>{
 it('loads the complete two-rule package and matches excerpt spans within their retained contexts',()=>{
  const loaded=loadFollowingRestrictionsData(data);expect(loaded.rules).toHaveLength(2);expect(loaded.sources).toHaveLength(1);expect(loaded.sources[0].id).toBe(FOLLOWING_RESTRICTIONS_SOURCE_ID);expect(loaded.sources[0].license).toBe('CC-BY-SA-4.0');
  const raw=JSON.parse(readFileSync(join(data,'raw/following-restrictions-qiongtong-excerpts.json'),'utf8'));
  for(const rule of loaded.rules){const quote=raw.excerpts.find((item:any)=>item.id===rule.id),context=raw.contexts.find((item:any)=>item.id===rule.id+'-context');expect(quote.sourceQuote).toBe(rule.sourceQuote);expect([...context.sourceQuote].slice(rule.sourceSpan.start-context.sourceSpan.start,rule.sourceSpan.end-context.sourceSpan.start).join('')).toBe(rule.sourceQuote);}
  expect(loaded.rules.map(rule=>[rule.dayStems,rule.monthBranches,rule.patterns])).toEqual([[['甲'],['寅','卯'],['cong-cai','cong-sha']],[['癸'],['未'],['cong-sha']]]);
  const notice=readFileSync(join(data,'raw/following-restrictions-NOTICE.md'),'utf8');expect(notice).toContain('贡献者历史');expect(notice).toContain('未进行独立影印页校勘');expect(readFileSync(join(data,'raw/CC-BY-SA-4.0.txt'),'utf8')).toContain('Creative Commons');
  loaded.rules[0].sourceQuote='伪造';expect(loadFollowingRestrictionsData(data).rules[0].sourceQuote).not.toBe('伪造');
 });
 it.each(['following-restrictions-source-lock.json','following-restrictions-rules.json','raw/following-restrictions-qiongtong-excerpts.json','raw/following-restrictions-NOTICE.md','raw/CC-BY-SA-4.0.txt'])('rejects any changed publication file: %s',file=>{
  const directory=copied(),path=join(directory,file);writeFileSync(path,readFileSync(path,'utf8')+'\nchanged');expect(()=>loadFollowingRestrictionsSources(directory)).toThrow('校验失败');
 });
 it('binds the complete new source record, rejects omissions and duplicates, and leaves genuinely older records absent',()=>{
  const sources=loadFollowingRestrictionsSources(data),session={dataVersion:'test',analysis:{bazi:{monthFollowingRestrictions:{sourceId:FOLLOWING_RESTRICTIONS_SOURCE_ID}}},sourceSnapshot:createSessionSourceSnapshot('test',sources)} as unknown as NamingSession;
  expect(()=>verifyFollowingRestrictionsProvenance(session,sources)).not.toThrow();
  const edits:((source:SourceRecord)=>void)[]=[s=>{s.name+='变更';},s=>{s.url='changed';},s=>{s.commit='changed';},s=>{s.license='changed';},s=>{s.files=[];},s=>{s.sha256='changed';},s=>{s.note='changed';}];
  for(const edit of edits){const value=structuredClone(session);edit(value.sourceSnapshot!.sources[0]);expect(()=>verifyFollowingRestrictionsProvenance(value,sources)).toThrow();}
  const missing=structuredClone(session);missing.sourceSnapshot!.sources=[];expect(()=>verifyFollowingRestrictionsProvenance(missing,sources)).toThrow();const duplicate=structuredClone(session);duplicate.sourceSnapshot!.sources.push(sources[0]);expect(()=>verifyFollowingRestrictionsProvenance(duplicate,sources)).toThrow();
  const older={analysis:{bazi:{}},dataVersion:'old'} as NamingSession;expect(()=>verifyFollowingRestrictionsProvenance(older,sources)).not.toThrow();expect(older.sourceSnapshot).toBeUndefined();
 });
});
