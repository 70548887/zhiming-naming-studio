import {afterEach,describe,expect,it} from 'vitest';
import {chmodSync,copyFileSync,mkdirSync,mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {dirname,join,resolve} from 'node:path';
import {loadNameImageryData,loadNameImagerySources,verifyNameImageryProvenance,NAME_IMAGERY_SOURCE_IDS} from '../src/main/name-imagery-data';
import {NAME_IMAGERY_VERSION} from '../src/domain/name-imagery';
import {createSessionSourceSnapshot} from '../src/shared/session-sources';
import type {NamingSession,SourceRecord} from '../src/shared/types';
const data=resolve('data'),dirs:string[]=[];afterEach(()=>dirs.splice(0).forEach(dir=>rmSync(dir,{recursive:true,force:true})));
function copied(){const dir=mkdtempSync(join(tmpdir(),'name-imagery-source-'));dirs.push(dir);const lock=JSON.parse(readFileSync(join(data,'name-imagery-source-lock.json'),'utf8'));const paths=['data/name-imagery-source-lock.json','data/raw/qimen-patterns-arc-constants.js',...lock.sources.flatMap((source:any)=>source.files)];for(const path of new Set<string>(paths)){const target=join(dir,path.slice(5));mkdirSync(dirname(target),{recursive:true});copyFileSync(resolve(path),target);chmodSync(target,0o600);}return dir;}
const session=():NamingSession=>({preferences:{imageryReading:true},analysis:{},dataVersion:'test',candidates:[{imageReading:{version:NAME_IMAGERY_VERSION}}],sourceSnapshot:createSessionSourceSnapshot('test',loadNameImagerySources(data))}) as unknown as NamingSession;
describe('independent experimental imagery mapping and fixed Arc palace table source package',()=>{
  it('loads exactly two publications, all five outer sets and the separately labelled center note',()=>{
    const loaded=loadNameImageryData(data);expect(loaded.sources.map(source=>source.id)).toEqual([...NAME_IMAGERY_SOURCE_IDS]);expect(loaded.sources.map(source=>source.license)).toEqual(['CC0-1.0','MIT']);expect(loaded.profile.elementPalaces).toEqual({木:[3,4],火:[9],土:[2,8],金:[6,7],水:[1]});expect(loaded.profile.palaceElements['5']).toBe('土');expect(Object.values(loaded.profile.elementPalaces).flat()).not.toContain(5);
    expect(loaded.profile.sourceReferences.some(source=>source.id==='editorial-rules')).toBe(true);expect(loaded.profile.sourceReferences.some(source=>source.id==='qimen-arc-structural-patterns')).toBe(true);
    const notice=readFileSync(join(data,'raw/name-imagery-NOTICE.md'),'utf8');expect(notice).toContain('本项目修改');expect(notice).toContain('不是教育部辞书定义');expect(notice).toContain('不作姓名吉凶');
    const license=readFileSync(join(data,'raw/name-imagery-arc-LICENSE.txt'),'utf8');expect(license).toContain('Copyright (c) 2026 Arc.');expect(license).toContain('THE SOFTWARE IS PROVIDED "AS IS"');
    loaded.profile.elementPalaces.土=[];loaded.sources[0].note='变';expect(loadNameImageryData(data).profile.elementPalaces.土).toEqual([2,8]);expect(loadNameImageryData(data).sources[0].note).not.toBe('变');
  });
  it.each(['name-imagery-source-lock.json','name-imagery-profile.json','raw/name-imagery-arc-palace-excerpts.json','raw/name-imagery-NOTICE.md','raw/name-imagery-arc-LICENSE.txt','raw/qimen-patterns-arc-constants.js'])('rejects altered publication or original file bytes: %s',file=>{
    const dir=copied(),path=join(dir,file);writeFileSync(path,readFileSync(path,'utf8')+'\nchanged');expect(()=>loadNameImagerySources(dir)).toThrow(/校验失败|不一致/);
  });
  it('requires both new exact source records only for explicitly selected results and rejects inactive grafts',()=>{
    const sources=loadNameImagerySources(data),value=session();expect(()=>verifyNameImageryProvenance(value,sources)).not.toThrow();
    const edits:((source:SourceRecord)=>void)[]=[s=>{s.id='变';},s=>{s.name='变';},s=>{s.url='变';},s=>{s.commit='变';},s=>{s.license='变';},s=>{s.files=[];},s=>{s.sha256='变';},s=>{s.note='变';}];
    for(const id of NAME_IMAGERY_SOURCE_IDS)for(const edit of edits){const changed=session();edit(changed.sourceSnapshot!.sources.find(source=>source.id===id)!);expect(()=>verifyNameImageryProvenance(changed,sources)).toThrow();}
    const missing=session();missing.sourceSnapshot!.sources.pop();expect(()=>verifyNameImageryProvenance(missing,sources)).toThrow();const empty=session();delete empty.candidates[0].imageReading;expect(()=>verifyNameImageryProvenance(empty,sources)).toThrow('必须保留');
    const inactive=session();inactive.preferences.imageryReading=false;expect(()=>verifyNameImageryProvenance(inactive,sources)).toThrow('未启用');delete inactive.candidates[0].imageReading;expect(()=>verifyNameImageryProvenance(inactive,sources)).toThrow('未启用');delete inactive.sourceSnapshot;expect(()=>verifyNameImageryProvenance(inactive,sources)).not.toThrow();
    const legacy={preferences:{},candidates:[],analysis:{}} as unknown as NamingSession;expect(()=>verifyNameImageryProvenance(legacy,sources)).not.toThrow();expect(legacy.sourceSnapshot).toBeUndefined();
  });
});
