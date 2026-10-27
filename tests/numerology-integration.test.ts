import{afterAll,beforeAll,describe,it,expect}from'vitest';
import{readFileSync,mkdtempSync,rmSync,copyFileSync,cpSync,writeFileSync}from'node:fs';
import{tmpdir}from'node:os';
import{join,resolve}from'node:path';
import{analyzeNumerology,calculateFiveGrids,validNumerologySnapshot}from'../src/domain/numerology';
import{loadNumerologyData,verifyNumerologyProvenance}from'../src/main/numerology-data';
import{Store}from'../src/main/store';
import{StudioService}from'../src/main/service';
import{reportHTML}from'../src/main/report';
import type{BirthProfile,NamingPreferences,NamingSession}from'../src/shared/types';
const data=loadNumerologyData(resolve('data'));
const examples=JSON.parse(readFileSync(resolve('tests/fixtures/numerology-examples.json'),'utf8')).examples as {id:string;shape:string;surname:string;givenName:string;expectedStrokes:{surname:number[];given:number[]};glyphs:{surname:string[];given:string[]};expectedGrids:Record<string,number>}[];
const p:BirthProfile={id:'numeric-customer',customerName:'数理隔离测试',surname:'王',surnamePinyin:'wáng',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:'09:30',leapMonth:false,timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''};
const pref:NamingPreferences={length:2,generationChar:'',requiredChars:'安文',forbiddenChars:'',elderTaboo:'',style:'清朗',meanings:'平安求知',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:true};
function exactChoices(surname:string,givenName:string,counts:number[],glyphs:string[]){return Object.fromEntries([...surname,...givenName].map((char,i)=>{const r=data.strokes.records.find(r=>r.character===char&&r.glyph===glyphs[i]&&r.count===counts[i]);expect(r,`${char}/${glyphs[i]}=${counts[i]}`).toBeDefined();return[String(i),r!.id];}));}
describe('source-backed four-shape examples',()=>{
  it('has three independently derived examples per shape and matches both raw formulas and selected source records',()=>{
    expect(examples.length).toBe(12);for(const shape of ['single-single','single-double','compound-single','compound-double'])expect(examples.filter(e=>e.shape===shape)).toHaveLength(3);
    for(const e of examples){const counts=[...e.expectedStrokes.surname,...e.expectedStrokes.given],glyphs=[...e.glyphs.surname,...e.glyphs.given];const choices=exactChoices(e.surname,e.givenName,counts,glyphs);const actual=analyzeNumerology(e.surname,e.givenName,data.strokes,data.rules,choices);expect(actual.status,e.id).toBe('complete');expect(Object.fromEntries(actual.grids.map(g=>[g.name,g.value])),e.id).toEqual(e.expectedGrids);expect(validNumerologySnapshot(actual,e.surname,e.givenName)).toBe(true);}
  });
  it('keeps Wang 4/5 disagreement, simplified Chen alternatives and Kangxi radial adjustments explicit',()=>{
    const wang=data.strokes.records.filter(r=>r.character==='王'&&r.glyph==='王');expect(new Set(wang.map(r=>r.count))).toEqual(new Set([4,5]));
    const w=analyzeNumerology('王','安文',data.strokes,data.rules);expect(w.status).toBe('pending');expect(w.grids).toEqual([]);
    const chen=analyzeNumerology('陈','安文',data.strokes,data.rules);expect(chen.strokes[0].options.some(r=>r.glyph==='陳'&&r.count===16)).toBe(true);expect(chen.strokes[0].status).toBe('ambiguous');
    expect(data.strokes.records.some(r=>r.character==='华'&&r.glyph==='華'&&r.count===14)).toBe(true);
  });
  it('coversall779namingcharacters withsource-backedrecords andresolvesthethreepreviousvocabularygaps',()=>{
    const current=JSON.parse(readFileSync(resolve('data/dataset.json'),'utf8')) as {characters:{char:string;strokes:number|null}[]};
    const repaired=new Map([['厚',9],['自',6],['升',4]]),actualMissing=new Set<string>(),strokeSources=new Set(data.strokes.sources.map(source=>source.id));
    for(const c of current.characters){
      const options=data.strokes.records.filter(record=>record.character===c.char);
      if(!options.length)actualMissing.add(c.char);
      expect(options.length,c.char).toBeGreaterThan(0);expect(options.every(option=>strokeSources.has(option.sourceId)),c.char).toBe(true);
    }
    expect(actualMissing.size).toBe(0);expect(current.characters).toHaveLength(779);
    const wang=data.strokes.records.find(record=>record.character==='王'&&record.glyph==='王'&&record.count===4)!;
    for(const [char,count]of repaired){
      expect(current.characters.find(entry=>entry.char===char)?.strokes,char).toBeGreaterThan(0);
      const sourceRecord=data.strokes.records.find(record=>record.character===char&&record.glyph===char&&record.count===count)!;
      expect(sourceRecord.sourceId).toBe('breezy-kangxi-radicals');
      const completed=analyzeNumerology('王',char,data.strokes,data.rules,{'0':wang.id,'1':sourceRecord.id});
      expect(completed.strokes[1]).toMatchObject({inputChar:char,status:'selected',selectedRecordId:sourceRecord.id});
      expect(completed.status).toBe('complete');expect(completed.grids.find(grid=>grid.name==='总格')!.value).toBe(4+count);
      expect(completed.warnings.join('')).not.toContain(`“${char}”尚无可核对的康熙笔画来源`);
      expect(validNumerologySnapshot(completed,'王',char)).toBe(true);expect(()=>verifyNumerologyProvenance(completed,data)).not.toThrow();
    }
    expect(Object.keys(data.rules.interpretations)).toHaveLength(81);const sources=new Set(data.rules.sources.map(s=>s.id));for(const v of Object.values(data.rules.interpretations))expect(sources.has(v.sourceId)).toBe(true);
    const over=calculateFiveGrids([50,50],[50,50],data.rules);expect(over.find(g=>g.name==='总格')!.value).toBe(200);expect(over.every(g=>!g.interpretation)).toBe(true);
  });
  it('rejects fabricated source records and classifications for the current declared versions',()=>{
    const choices=exactChoices('王','安文',[4,6,4],['王','安','文']),correct=analyzeNumerology('王','安文',data.strokes,data.rules,choices);
    for(const alter of [(n:any)=>{n.strokes[0].options[0].sourceId='invented-source';},(n:any)=>{n.grids[0].interpretation={label:'杜撰',keyword:'杜撰',sourceId:'invented'};}]){const bad=structuredClone(correct);alter(bad);expect(()=>verifyNumerologyProvenance(bad,data)).toThrow('不一致');}
    const old=structuredClone(correct);old.dataVersion='historical-unknown';verifyNumerologyProvenance(old,data);expect(old.warnings.join('')).toContain('历史数理资料版本');expect(old.grids.every(g=>!g.interpretation)).toBe(true);
  });
  it('checks data-file hashes before treating modified local files as source-backed',()=>{
    const temp=mkdtempSync(join(tmpdir(),'numeric-hash-check-'));try{for(const f of ['numerology-strokes.json','numerology-rules.json','numerology-source-lock.json','numerology-rules-lock.json'])copyFileSync(resolve('data',f),join(temp,f));cpSync(resolve('data/numerology-history'),join(temp,'numerology-history'),{recursive:true});expect(loadNumerologyData(temp).strokes.records.length).toBeGreaterThan(0);writeFileSync(join(temp,'numerology-rules.json'),readFileSync(join(temp,'numerology-rules.json'),'utf8')+' ');expect(()=>loadNumerologyData(temp)).toThrow('校验失败');}finally{rmSync(temp,{recursive:true,force:true});}
  });
});
describe('persisted opt-in calculation, report and revision roundtrip',{ timeout: 15_000 }, ()=>{
  let dir:string,store:Store,svc:StudioService;
  beforeAll(async()=>{dir=mkdtempSync(join(tmpdir(),'name-numerology-'));store=await new Store(dir,resolve('data'),resolve('node_modules/sql.js/dist/sql-wasm.wasm')).init();svc=new StudioService(store,{read:()=>'',write:()=>{}});});
  afterAll(()=>{store?.db.close();if(dir)rmSync(dir,{recursive:true,force:true});});
  it('creates no analysis while disabled and records pending choices rather than guessed five-grid results',async()=>{
    const off=(await svc.generate({...p,id:'numeric-off'},{...pref,numerology:false})).session;expect(off.candidates[0].numerology).toBeUndefined();
    const on=(await svc.generate(p,pref)).session;expect(on.candidates[0].givenName).toBe('安文');expect(on.candidates[0].numerology?.status).toBe('pending');expect(on.candidates[0].numerology?.grids).toEqual([]);expect(on.candidates[0].warnings.join('')).not.toContain('尚无完整、经核验');
  });
  it('confirms real record IDs, preserves the old version and exports all formulas/sources',async()=>{
    const s=store.rows<NamingSession>('sessions').find(s=>s.profileId===p.id)!;const c=s.candidates[0];const choices=exactChoices('王','安文',[4,6,4],['王','安','文']);
    expect(()=>svc.updateNumerology(s.id,c.id,{'0':'fake-record'},s.reviewRevision,s.reviewToken)).toThrow('不属于');
    const saved=svc.updateNumerology(s.id,c.id,choices,s.reviewRevision,s.reviewToken),analysis=saved.candidates[0].numerology!;expect(analysis.status).toBe('complete');expect(analysis.grids.find(g=>g.name==='总格')!.value).toBe(14);
    const history=svc.listHistory(s.id);expect(history[0].session.candidates[0].numerology?.status).toBe('pending');
    const html=reportHTML(saved,svc.bootstrap().settings);expect(html).toContain('康熙笔画与五格三才');expect(html).toContain('五格计算');expect(html).toContain('breezy-kangxi-radicals');expect(html).toContain('姓末');
    const backup=store.backupBytes();store.restore(backup);const current=svc.bootstrap().sessions.find(v=>v.id===s.id)!;expect(current.candidates[0].numerology!.grids).toEqual(analysis.grids);
    const restored=svc.restoreHistory(s.id,history[0].id,current.reviewRevision,current.reviewToken);expect(restored.candidates[0].numerology?.status).toBe('pending');expect(svc.listHistory(s.id)[0].session.candidates[0].numerology?.status).toBe('complete');
  });
  it('rejects changed computed grids in backup snapshots without replacing the current archive',()=>{
    const original=store.backupBytes(),s=store.rows<NamingSession>('sessions').find(s=>s.profileId===p.id)!;const c=s.candidates[0];svc.updateNumerology(s.id,c.id,exactChoices('王','安文',[4,6,4],['王','安','文']),s.reviewRevision,s.reviewToken);
    const good=store.backupBytes(),bad=structuredClone(store.rows<NamingSession>('sessions').find(v=>v.id===s.id)!);bad.candidates[0].numerology!.grids[0].value=999;store.db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(bad),s.id]);const invalid=store.db.export();store.restore(good);const afterRestore=store.backupBytes();expect(()=>store.restore(invalid)).toThrow('字段不完整');expect(Buffer.from(store.backupBytes()).equals(Buffer.from(afterRestore))).toBe(true);expect(original.length).toBeGreaterThan(0);
  });
});
