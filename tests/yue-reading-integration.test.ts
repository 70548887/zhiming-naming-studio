import {afterEach,beforeAll,describe,expect,it} from 'vitest';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import initSqlJs from 'sql.js';
import {Store,validSession} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {confirmYueNameReading,YUE_READING_SOURCE_ID} from '../src/domain/yue-reading';
import {loadYueReadingData} from '../src/main/yue-reading-data';
import {NAME_IMAGERY_SOURCE_IDS} from '../src/main/name-imagery-data';
import {yueReadingReport} from '../src/main/yue-reading-report';
import {compareSessionReviews,isSessionCurrent,namingInputKey,normalizePreferences} from '../src/shared/workflow';
import {sessionReferencedSourceIds} from '../src/shared/session-sources';
import {REN_METHOD} from '../src/shared/ren-method';
import type {BirthProfile,NamingPreferences,NamingSession,YueNameReading,YueReadingSelection,YueReadingSelections,YueReadingUnit} from '../src/shared/types';

const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm'),stores:Store[]=[],directories:string[]=[];
const profile:BirthProfile={id:'yue-integration',customerName:'粤语读音隔离验收',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:'09:30:00',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''};
const preferences=normalizePreferences({requiredChars:'安宁',zodiacRules:false,yueReading:true});
let SQL:Awaited<ReturnType<typeof initSqlJs>>;
beforeAll(async()=>{SQL=await initSqlJs({locateFile:()=>wasm});});
afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const directory of directories.splice(0))rmSync(directory,{recursive:true,force:true});});
async function open(directory?:string){const dir=directory??mkdtempSync(join(tmpdir(),'studio-yue-integration-'));if(!directory)directories.push(dir);const store=await new Store(dir,resolve('data'),wasm).init();stores.push(store);return{dir,store,service:new StudioService(store,{read:()=>'',write:()=>{}},false)};}
async function setup(input=profile,pref: NamingPreferences=preferences){const value=await open();return{...value,session:(await value.service.generate(input,pref)).session};}
const disk=(store:Store)=>readFileSync(join(store.userDir,'customers.sqlite'));
const current=(store:Store,id:string)=>store.rows<NamingSession>('sessions').find(session=>session.id===id)!;
const reading=(session:NamingSession,candidateId=session.candidates[0].id)=>session.candidates.find(candidate=>candidate.id===candidateId)!.yueReading!;
const dictionary=(unit:YueReadingUnit):YueReadingSelection=>{const row=unit.candidates[0];if(!row)throw new Error('Integration fixture has no dictionary candidate');return{tokens:[...row.tokens],origin:'dictionary',confirmed:true,dictionaryId:row.id};};
const dictionarySelections=(value:YueNameReading):YueReadingSelections=>({surname:dictionary(value.surname),given:value.given.map(dictionary)});
const family=(tokens:string[]):YueReadingSelection=>({tokens,origin:'user',confirmed:true});
const clear=(value:YueNameReading):YueReadingSelections=>({surname:null,given:value.given.map(()=>null)});
function update(service:StudioService,session:NamingSession,selections:YueReadingSelections,candidateId=session.candidates[0].id){return service.updateYueReading(session.id,candidateId,selections,session.reviewRevision,session.reviewToken);}
function altered(bytes:Uint8Array,session:NamingSession,change:(value:NamingSession)=>void,table:'sessions'|'revisions'='sessions',revisionId?:string){const database=new SQL.Database(bytes),value=structuredClone(session);try{change(value);if(table==='sessions')database.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(value),session.id]);else database.run('UPDATE revisions SET json=? WHERE id=?',[JSON.stringify(value),Number(revisionId)]);return database.export();}finally{database.close();}}
function customKnowledgePack(store:Store,change:(dataset:Store['dataset'])=>void):Uint8Array{const dataset=structuredClone(store.dataset),database=new SQL.Database();try{change(dataset);for(const table of ['characters','citations','knowledge','sources'] as const){database.run(`CREATE TABLE ${table}(json TEXT NOT NULL)`);const insert=database.prepare(`INSERT INTO ${table}(json) VALUES (?)`);try{for(const value of dataset[table])insert.run([JSON.stringify(value)]);}finally{insert.free();}}return database.export();}finally{database.close();}}

describe('real Cantonese reading confirmation service and persistent history',{ timeout: 15_000 }, ()=>{
  it('keeps absent and false preferences off, with no reading result or dedicated source',async()=>{
    const {store,service}=await open();
    for(const selected of [undefined,false]){const pref=normalizePreferences({...preferences,yueReading:selected}),session=(await service.generate({...profile,id:'yue-off-'+String(selected)},pref)).session;expect(session.preferences.yueReading).toBe(false);expect(session.candidates.every(candidate=>candidate.yueReading===undefined)).toBe(true);expect(session.sourceSnapshot!.sources.some(source=>source.id===YUE_READING_SOURCE_ID)).toBe(false);expect(sessionReferencedSourceIds(session)).not.toContain(YUE_READING_SOURCE_ID);expect(validSession(session)).toBe(true);const before=disk(store);expect(()=>update(service,session,{surname:null,given:[null,null]})).toThrow('开启粤语');expect(disk(store).equals(before)).toBe(true);}
    expect(namingInputKey(profile,{...preferences,yueReading:undefined})).toBe(namingInputKey(profile,{...preferences,yueReading:false}));expect(namingInputKey(profile,preferences)).not.toBe(namingInputKey(profile,{...preferences,yueReading:false}));
  });
  it('generates an unknown-time compound surname with whole-word candidates and nothing confirmed',async()=>{
    const {session}=await setup({...profile,id:'yue-compound-unknown',surname:'欧阳',surnamePinyin:'ōu yáng',timeUnknown:true,birthTime:''});
    expect(session.analysis.qimen.available).toBe(false);expect(validSession(session)).toBe(true);
    for(const candidate of session.candidates){const value=candidate.yueReading!;expect(value.status).toBe('unconfirmed');expect(value.fullNameTokens).toEqual([]);expect(value.surname.text).toBe('欧阳');expect(value.surname.candidates.map(row=>row.tokens)).toEqual([['au1','joeng4']]);expect(value.surname.candidates.every(row=>row.sourceFile==='jyut6ping3.words.dict.yaml')).toBe(true);expect([value.surname,...value.given].every(unit=>unit.selection===undefined)).toBe(true);}
    expect(session.sourceSnapshot!.sources.filter(source=>source.id===YUE_READING_SOURCE_ID)).toEqual(loadYueReadingData(resolve('data')).sources.filter(source=>source.id===YUE_READING_SOURCE_ID));
  });
  it('rejects a custom knowledge pack Unicode source with the same id but different metadata without any customer write',async()=>{
    const {store,service}=await open(),pack=customKnowledgePack(store,dataset=>{const alias=dataset.sources.find(source=>source.id==='unicode-17')!;expect(alias).toBeDefined();alias.commit='custom-unicode-fork';});store.installPack(pack);
    const off=(await service.generate({...profile,id:'yue-custom-alias-off'},normalizePreferences({...preferences,yueReading:false}))).session;expect(off.sourceSnapshot!.sources.find(source=>source.id==='unicode-17')!.commit).toBe('custom-unicode-fork');const before=disk(store),knowledge=store.currentPackBytes(),profiles=store.rows<BirthProfile>('profiles'),sessions=store.rows<NamingSession>('sessions');
    await expect(service.generate({...profile,id:'yue-custom-alias-conflict'},preferences)).rejects.toThrow('字形来源与粤语固定参考不一致');expect(disk(store).equals(before)).toBe(true);expect(Buffer.from(store.currentPackBytes()).equals(Buffer.from(knowledge))).toBe(true);expect(store.rows<BirthProfile>('profiles')).toEqual(profiles);expect(store.rows<NamingSession>('sessions')).toEqual(sessions);
  });
  it('adds the fixed Unicode alias source when an actual custom knowledge pack has no Unicode registry row',async()=>{
    const {store,service}=await open(),fixed=loadYueReadingData(resolve('data')).sources.find(source=>source.id==='unicode-17')!,pack=customKnowledgePack(store,dataset=>{expect(dataset.characters.some(character=>character.sourceId==='unicode-17')).toBe(false);expect(dataset.citations.some(citation=>citation.sourceId==='unicode-17')).toBe(false);expect(dataset.knowledge.some(entry=>entry.sourceId==='unicode-17')).toBe(false);dataset.sources=dataset.sources.filter(source=>source.id!=='unicode-17');});store.installPack(pack);expect(store.dataset.sources.some(source=>source.id==='unicode-17')).toBe(false);
    const session=(await service.generate({...profile,id:'yue-custom-alias-missing'},preferences)).session;expect(session.sourceSnapshot!.sources.filter(source=>source.id==='unicode-17')).toEqual([fixed]);expect(new Set(session.sourceSnapshot!.sources.map(source=>source.id)).size).toBe(session.sourceSnapshot!.sources.length);expect(session.candidates.every(candidate=>candidate.yueReading?.status==='unconfirmed')).toBe(true);expect(validSession(session)).toBe(true);expect(current(store,session.id)).toEqual(session);expect(()=>store.backupBytes()).not.toThrow();
  });
  it('requires a manual whole surname when no compound dictionary row exists and marks it as family input',async()=>{
    const {store,service,session}=await setup({...profile,id:'yue-missing-compound',surname:'万俟',surnamePinyin:'mò qí'}),candidate=session.candidates[0];expect(reading(session).surname.candidates).toEqual([]);
    const selected=update(service,session,{surname:family(['maan6','zi6']),given:reading(session).given.map(dictionary)}),value=reading(selected,candidate.id);
    expect(value.status).toBe('confirmed');expect(value.surname.selection).toEqual(family(['maan6','zi6']));expect(value.surname.candidates).toEqual([]);expect(yueReadingReport(value)).toContain('家庭手工确认；无词典出处声明');expect(current(store,session.id).candidates[0].yueReading).toEqual(value);
  });
  it('persists dictionary, partial, family and cleared selections only through the dedicated method',async()=>{
    const {store,service,session}=await setup(),candidateId=session.candidates[0].id,initial=reading(session);const partial=update(service,session,{surname:dictionary(initial.surname),given:[null,null]});
    expect(reading(partial).status).toBe('partial');expect(reading(partial).fullNameTokens).toEqual([]);expect(partial.reviewRevision).toBe(session.reviewRevision!+1);
    const selected=update(service,partial,dictionarySelections(reading(partial)));expect(reading(selected).status).toBe('confirmed');expect(reading(selected).fullNameTokens).toEqual([reading(selected).surname,...reading(selected).given].flatMap(unit=>unit.selection!.tokens));
    const manual=update(service,selected,{surname:family(['lam4']),given:reading(selected).given.map(()=>family(['on1']))});expect(reading(manual).status).toBe('confirmed');expect(reading(manual).given.every(unit=>unit.selection?.origin==='user'&&unit.selection.dictionaryId===undefined)).toBe(true);
    const cleared=update(service,manual,clear(reading(manual)));expect(reading(cleared).status).toBe('unconfirmed');expect(reading(cleared).fullNameTokens).toEqual([]);expect([reading(cleared).surname,...reading(cleared).given].every(unit=>unit.selection===undefined)).toBe(true);expect(reading(current(store,session.id),candidateId)).toEqual(reading(cleared));
    const count=service.listHistory(session.id).length,same=update(service,cleared,clear(reading(cleared)));expect(same.reviewRevision).toBe(cleared.reviewRevision);expect(service.listHistory(session.id)).toHaveLength(count);
  });
  it('rejects stale revision or token, bad candidate and malformed origin without changing database bytes',async()=>{
    const {store,service,session}=await setup(),selections=dictionarySelections(reading(session)),saved=update(service,session,selections),before=disk(store),history=service.listHistory(session.id);
    const attempts=[()=>update(service,session,clear(reading(session))),()=>service.updateYueReading(saved.id,saved.candidates[0].id,selections),()=>service.updateYueReading(saved.id,saved.candidates[0].id,selections,saved.reviewRevision,'wrong-token'),()=>update(service,saved,selections,'not-a-candidate'),()=>update(service,saved,{surname:{...family(['lam4']),dictionaryId:reading(saved).surname.candidates[0].id},given:[null,null]}),()=>update(service,saved,{surname:null,given:[]})];
    for(const attempt of attempts){expect(attempt).toThrow();expect(disk(store).equals(before)).toBe(true);expect(current(store,session.id)).toEqual(saved);expect(service.listHistory(session.id)).toEqual(history);}
  });
  it('ordinary saveSession preserves saved confirmations even if caller edits or removes them',async()=>{
    const {service,session}=await setup(),initial=structuredClone(session),candidateId=initial.candidates[0].id;initial.candidates[0].yueReading=confirmYueNameReading(reading(initial),dictionarySelections(reading(initial)));initial.reviewNote='只能保存审阅文字';initial.preferences.yueReading=false;
    const reviewed=service.saveSession(initial);expect(reading(reviewed).status).toBe('unconfirmed');expect(reviewed.preferences.yueReading).toBe(true);expect(reviewed.reviewNote).toBe('只能保存审阅文字');
    const confirmed=update(service,reviewed,dictionarySelections(reading(reviewed))),draft=structuredClone(confirmed);delete draft.candidates[0].yueReading;draft.candidates[0].meaning='保留读音确认的人工寓意';const preserved=service.saveSession(draft);expect(reading(preserved,candidateId)).toEqual(reading(confirmed,candidateId));expect(preserved.candidates[0].meaning).toBe(draft.candidates[0].meaning);
  });
  it('shows real review differences, restores prior readings and retains current source and birth analysis',async()=>{
    const {store,service,session}=await setup(),originalAnalysis=structuredClone(session.analysis),originalSources=structuredClone(session.sourceSnapshot),confirmed=update(service,session,dictionarySelections(reading(session)));
    const change=compareSessionReviews(session,confirmed).find(item=>item.field==='粤语读音确认');expect(change).toBeDefined();expect(change!.before).toContain('待确认');expect(change!.after).toContain('确认词典候选');
    const old=service.listHistory(session.id).find(revision=>reading(revision.session).status==='unconfirmed')!;expect(old).toBeDefined();const restored=service.restoreHistory(session.id,old.id,confirmed.reviewRevision,confirmed.reviewToken);expect(reading(restored).status).toBe('unconfirmed');expect(restored.analysis).toEqual(originalAnalysis);expect(restored.sourceSnapshot).toEqual(originalSources);expect(restored.reviewRevision).toBe(confirmed.reviewRevision!+1);expect(service.listHistory(session.id).some(revision=>reading(revision.session).status==='confirmed')).toBe(true);expect(reading(current(store,session.id))).toEqual(reading(restored));
  });
  it('preserves selected readings and historical differences across a separate Store backup restore',async()=>{
    const {store,service,session}=await setup(),confirmed=update(service,session,dictionarySelections(reading(session))),manual=update(service,confirmed,{surname:family(['lam4']),given:reading(confirmed).given.map(dictionary)}),history=service.listHistory(session.id),archive=store.backupBytes(),target=await open();
    target.store.restore(archive);const saved=current(target.store,session.id);expect(saved.reviewToken).not.toBe(manual.reviewToken);expect(saved.candidates.map(candidate=>candidate.yueReading)).toEqual(manual.candidates.map(candidate=>candidate.yueReading));expect(saved.sourceSnapshot).toEqual(manual.sourceSnapshot);expect(target.service.listHistory(session.id).map(revision=>revision.session.candidates.map(candidate=>candidate.yueReading))).toEqual(history.map(revision=>revision.session.candidates.map(candidate=>candidate.yueReading)));expect(isSessionCurrent(saved.profile,saved.preferences,saved)).toBe(true);
    const before=disk(target.store);expect(()=>update(target.service,manual,clear(reading(manual)))).toThrow('其他窗口更新');expect(disk(target.store).equals(before)).toBe(true);
  });
  it('combines Yue with numerology, imagery and Ren1.1 while updates retain unrelated results',async()=>{
    const {store,service,session}=await setup({...profile,id:'yue-all-optional',renMethod:REN_METHOD},normalizePreferences({...preferences,numerology:true,imageryReading:true})),candidate=session.candidates[0],analysis=structuredClone(session.analysis),images=structuredClone(session.candidates.map(value=>value.imageReading));
    expect(session.analysis.renCommentary?.version).toBe('ditian-ren-commentary-2600158/1.1.0');expect(session.analysis.renCommentary?.necessaryConditions).toBeDefined();expect(session.candidates.every(value=>value.yueReading&&value.numerology&&value.imageReading)).toBe(true);
    const selected=update(service,session,dictionarySelections(reading(session))),choices=Object.fromEntries(candidate.numerology!.strokes.map(value=>[String(value.position),value.options[0].id])),numerical=service.updateNumerology(selected.id,candidate.id,choices,selected.reviewRevision,selected.reviewToken);
    expect(reading(numerical)).toEqual(reading(selected));expect(numerical.analysis).toEqual(analysis);expect(numerical.candidates.map(value=>value.imageReading)).toEqual(images);expect(validSession(numerical)).toBe(true);expect(sessionReferencedSourceIds(numerical)).toEqual(expect.arrayContaining([YUE_READING_SOURCE_ID,'bazi-ditian-ren-necessary-2600158',...NAME_IMAGERY_SOURCE_IDS]));expect(()=>store.backupBytes()).not.toThrow();
  },30_000);
});

describe('Cantonese source/result corruption fails before restore or read can accept it',{ timeout: 15_000 }, ()=>{
  it('rejects result, candidate, state and source grafts in backups without changing any live bytes',async()=>{
    const {store,service,session}=await setup(),selected=update(service,session,dictionarySelections(reading(session))),before=disk(store),archive=store.backupBytes();
    const changes:{name:string;edit:(value:NamingSession)=>void}[]=[
      {name:'result omitted',edit:s=>{delete s.candidates[0].yueReading;}},
      {name:'unit name',edit:s=>{reading(s).given[0].text='清';}},
      {name:'candidate source line',edit:s=>{reading(s).surname.candidates[0].sourceLine++;}},
      {name:'false derived state',edit:s=>{reading(s).status='unconfirmed';}},
      {name:'false full-name tokens',edit:s=>{reading(s).fullNameTokens=['wrong1'];}},
      {name:'manual pretending dictionary',edit:s=>{reading(s).surname.selection={tokens:['lam1'],origin:'dictionary',confirmed:true,dictionaryId:reading(s).surname.candidates[0].id};}},
      {name:'dictionary id from another unit',edit:s=>{reading(s).surname.selection=structuredClone(reading(s).given[0].selection!);}},
      {name:'source dropped',edit:s=>{s.sourceSnapshot!.sources=s.sourceSnapshot!.sources.filter(source=>source.id!==YUE_READING_SOURCE_ID);}},
      {name:'source changed',edit:s=>{s.sourceSnapshot!.sources.find(source=>source.id===YUE_READING_SOURCE_ID)!.commit='forged';}},
      {name:'preference disabled',edit:s=>{s.preferences.yueReading=false;}},
      {name:'preference and results stripped',edit:s=>{delete s.preferences.yueReading;for(const candidate of s.candidates)delete candidate.yueReading;}}
    ];
    for(const change of changes){expect(()=>store.restore(altered(archive,selected,change.edit)),change.name).toThrow();expect(disk(store).equals(before),change.name).toBe(true);expect(current(store,session.id),change.name).toEqual(selected);}
    const invalid=structuredClone(selected);reading(invalid).sourceIds=[];expect(()=>store.saveSession(invalid)).toThrow();expect(disk(store).equals(before)).toBe(true);
  },30_000);
  it('refuses malformed current sessions at actual SQLite reload and keeps the corrupt file untouched',async()=>{
    const {dir,store,service,session}=await setup(),selected=update(service,session,dictionarySelections(reading(session)));store.db.close();stores.splice(stores.indexOf(store),1);const file=join(dir,'customers.sqlite'),database=new SQL.Database(readFileSync(file)),bad=structuredClone(selected);reading(bad).status='unconfirmed';database.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(bad),selected.id]);writeFileSync(file,database.export());database.close();const before=readFileSync(file),reopened=await open(dir);
    expect(()=>reopened.service.bootstrap()).toThrow('粤语');expect(readFileSync(file).equals(before)).toBe(true);
  });
  it('rejects direct SQLite corruption in history before displaying it or producing a backup',async()=>{
    const {store,service,session}=await setup();update(service,session,dictionarySelections(reading(session)));const revision=service.listHistory(session.id)[0],bad=structuredClone(revision.session);reading(bad).status='confirmed';store.db.run('UPDATE revisions SET json=? WHERE id=?',[JSON.stringify(bad),Number(revision.id)]);const before=disk(store);
    expect(()=>service.listHistory(session.id)).toThrow('粤语');expect(()=>store.backupBytes()).toThrow('备份已取消');expect(disk(store).equals(before)).toBe(true);
  });
  it('rejects direct SQLite forged source metadata in history even when every reading remains canonical',async()=>{
    const {store,service,session}=await setup();update(service,session,dictionarySelections(reading(session)));const revision=service.listHistory(session.id)[0],bad=structuredClone(revision.session);bad.sourceSnapshot!.sources.find(source=>source.id===YUE_READING_SOURCE_ID)!.commit='forged';expect(validSession(bad)).toBe(true);store.db.run('UPDATE revisions SET json=? WHERE id=?',[JSON.stringify(bad),Number(revision.id)]);
    const before=disk(store);expect(()=>service.listHistory(session.id)).toThrow('命名规则历史关联不一致');expect(()=>store.backupBytes()).toThrow('备份已取消');expect(disk(store).equals(before)).toBe(true);
  });
  it('does not accept a dedicated source graft into an otherwise inactive session at read boundary',async()=>{
    const {store,service,session}=await setup(profile,normalizePreferences({...preferences,yueReading:false})),bad=structuredClone(session);bad.sourceSnapshot!.sources.push(...loadYueReadingData(resolve('data')).sources.filter(source=>source.id===YUE_READING_SOURCE_ID));store.db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(bad),session.id]);const before=disk(store);expect(()=>service.bootstrap()).toThrow('粤语');expect(disk(store).equals(before)).toBe(true);
  });
});
