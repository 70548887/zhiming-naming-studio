import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import initSqlJs from 'sql.js';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {CLASSICS_SOURCE_IDS} from '../src/main/classics-data';
import type {BirthProfile,NamingPreferences,NamingSession} from '../src/shared/types';

const profile:BirthProfile={id:'classics-isolation',customerName:'原典隔离测试',surname:'李',surnamePinyin:'lǐ',gender:'中性',calendar:'solar',birthDate:'2023-02-15',leapMonth:false,birthTime:'22:00',timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'测试',fatherName:'李知远',motherName:'陈安宁'};
const preferences:NamingPreferences={length:1,generationChar:'',requiredChars:'文',forbiddenChars:'',elderTaboo:'',style:'清朗自然',meanings:'平安',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false,avoidParentNames:true};
const sha=(text:string)=>createHash('sha256').update(text).digest('hex');
let directory:string,store:Store,service:StudioService,saved:NamingSession;
beforeAll(async()=>{directory=mkdtempSync(join(tmpdir(),'classics-service-'));store=await new Store(directory,resolve('data'),resolve('node_modules/sql.js/dist/sql-wasm.wasm')).init();service=new StudioService(store,{read:()=>'',write:()=>{}});const generated=(await service.generate(profile,preferences)).session;generated.candidates[0].favorite=true;saved=service.saveSession(generated);});
afterAll(()=>{store?.db.close();if(directory)rmSync(directory,{recursive:true,force:true});});

describe('fixed classics are an independent local read-only library',{ timeout: 15_000 }, ()=>{
 it('registers the two fixed book sources without sending complete books in bootstrap or changing ordinary knowledge counts',()=>{
  const boot=service.bootstrap();expect(CLASSICS_SOURCE_IDS.every(id=>boot.sources.some(source=>source.id===id))).toBe(true);
  expect(boot).not.toHaveProperty('classics');expect(boot).not.toHaveProperty('books');
  expect(boot.stats.knowledge).toBe(store.dataset.knowledge.length+120);
  const oldResults=service.searchKnowledge('乾');expect(oldResults.length).toBeGreaterThan(0);expect(oldResults.every(item=>!CLASSICS_SOURCE_IDS.includes(item.sourceId as typeof CLASSICS_SOURCE_IDS[number]))).toBe(true);
  expect(saved.sourceSnapshot?.sources.some(source=>CLASSICS_SOURCE_IDS.includes(source.id as typeof CLASSICS_SOURCE_IDS[number]))).toBe(false);
 });
 it('paginates the complete 123-section directory and each separate book, including a null book filter from JSON transport',()=>{
  const first=service.searchClassics(''),second=service.searchClassics('',null,2);
  expect(first.total).toBe(123);expect(first.hits).toHaveLength(20);expect(second.page).toBe(2);expect(second.hits).toHaveLength(20);
  expect(new Set([...first.hits,...second.hits].map(hit=>hit.id)).size).toBe(40);
  expect(first.hits.every(hit=>hit.sourceStart===hit.sourceEnd&&hit.matchedOriginal==='')).toBe(true);
  expect(service.searchClassics('','classic-ditian-2600158').total).toBe(66);expect(service.searchClassics('','classic-qiongtong-2294674').total).toBe(57);
 });
 it('reads complete fixed sections at original codepoint offsets and retains nine uncorrected private-use characters',()=>{
  const result=service.searchClassics('通关','classic-ditian-2600158');expect(result.total).toBeGreaterThan(0);
  const hit=result.hits[0],section=service.readClassicSection(hit.sectionId);
  expect([...section.rawText].length).toBe(section.end-section.start);expect(sha(section.rawText)).toBe(section.sha256);
  expect([...section.rawText].slice(hit.sourceStart-section.start,hit.sourceEnd-section.start).join('')).toBe('通关');
  expect(section.source).toEqual(result.books.find(book=>book.id===hit.bookId)!.source);expect(section.usage).toBe('source-text-only');
  const qtb=service.searchClassics('','classic-qiongtong-2294674'),all=Array.from({length:qtb.pageCount},(_,index)=>service.searchClassics('','classic-qiongtong-2294674',index+1).hits).flat();
  const sections=all.map(hit=>service.readClassicSection(hit.sectionId));expect(sections.flatMap(section=>section.quality.privateUseCharacters)).toHaveLength(9);
  expect(sections.every(section=>section.quality.originalTranscription&&!section.quality.scanCollation)).toBe(true);
 });
 it('rejects malformed query, book, page and chapter identifiers without changing stored clients, reviews or tokens',()=>{
  const before=readFileSync(join(directory,'customers.sqlite')),session=JSON.stringify(store.rows<NamingSession>('sessions')),history=JSON.stringify(service.listHistory(saved.id));
  for(const invoke of [()=>service.searchClassics('木'.repeat(201)),()=>service.searchClassics('\ud800'),()=>service.searchClassics('木','../data' as never),()=>service.searchClassics('木',undefined,0),()=>service.searchClassics('木',undefined,Number.MAX_SAFE_INTEGER),()=>service.readClassicSection('../../customers.sqlite')])expect(invoke).toThrow();
  service.searchClassics('沒有這段原文零結果');service.readClassicSection(service.searchClassics('').hits[0].sectionId);
  expect(readFileSync(join(directory,'customers.sqlite')).equals(before)).toBe(true);expect(JSON.stringify(store.rows<NamingSession>('sessions'))).toBe(session);expect(JSON.stringify(service.listHistory(saved.id))).toBe(history);
 });
 it('cannot change the generated analysis, scores or parent-name avoidance through browsing the books',async()=>{
  const result=(await service.generate({...profile,id:'classics-isolation-after-reading'},preferences)).session;expect(result.candidates).toHaveLength(1);expect(result.candidates[0].fullName).toBe('李文');
  expect(result.analysis).toEqual(saved.analysis);expect(result.candidates[0].evaluation).toEqual(saved.candidates[0].evaluation);
  expect(result.preferences.avoidParentNames).toBe(true);expect(result.candidates.every(candidate=>![...candidate.givenName].some(char=>'知远安宁'.includes(char)))).toBe(true);
  expect(result.sourceSnapshot).toEqual(saved.sourceSnapshot);
 });
 it('protects both book source IDs from knowledge-pack replacement while leaving ordinary pack updates independent',async()=>{
  const SQL=await initSqlJs({locateFile:()=>resolve('node_modules/sql.js/dist/sql-wasm.wasm')}),pack=readFileSync(resolve('data/knowledge.sqlite'));
  const beforeSearch=service.searchClassics('五行'),beforeVersion=store.dataset.version;
  for(const id of CLASSICS_SOURCE_IDS){const db=new SQL.Database(new Uint8Array(pack));try{const row=db.exec('SELECT rowid,json FROM sources')[0].values[0],source=JSON.parse(String(row[1]));source.id=id;db.run('UPDATE sources SET json=? WHERE rowid=?',[JSON.stringify(source),row[0]]);expect(()=>store.installPack(db.export())).toThrow('编号保留');expect(store.dataset.version).toBe(beforeVersion);}finally{db.close();}}
  const db=new SQL.Database(new Uint8Array(pack));try{const row=db.exec('SELECT rowid,json FROM sources')[0].values[0],source=JSON.parse(String(row[1]));source.commit='classics-independent-pack';db.run('UPDATE sources SET json=? WHERE rowid=?',[JSON.stringify(source),row[0]]);store.installPack(db.export());}finally{db.close();}
  expect(store.dataset.version).not.toBe(beforeVersion);expect(service.searchClassics('五行')).toEqual(beforeSearch);store.rollback();expect(store.dataset.version).toBe(beforeVersion);
 });
});
