import {afterEach,beforeAll,describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import initSqlJs from 'sql.js';
import {Store,validSession} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {loadYueHomophoneSources,YUE_HOMOPHONE_SOURCE_IDS} from '../src/main/yue-homophone-data';
import {normalizePreferences,namingInputKey,isSessionCurrent} from '../src/shared/workflow';
import {sessionReferencedSourceIds} from '../src/shared/session-sources';
import type {BirthProfile,NamingPreferences,NamingSession,SourceRecord,YueNameReading,YueReadingSelection,YueReadingSelections,YueReadingUnit} from '../src/shared/types';
import type {YueHomophoneReview} from '../src/shared/yue-homophone-types';

interface PublishedReading {provenance:{appVersion:string;sourceDatabaseSha256:string;sourceReadingSha256:string;sourceScope:string};profile:BirthProfile;givenName:string;reading:YueNameReading;readingSources:SourceRecord[];}
// Replaced once by the actual1.0.24 SQLite extraction; no1.0.25 calculator produces this expectation.
const published124 = {
  "provenance": {
    "appVersion": "1.0.24",
    "sourceDatabase": ".local/name-124-final-ui/installed-smoke/user/customers.sqlite",
    "sourceDatabaseSha256": "9b1e475234328c837378d6f9838f450f121da3a67314424e1cd4d9c6f3c14561",
    "sourceSessionId": "3150489b-fd02-455b-8fd3-9b93a4263837",
    "sourceCandidateId": "f8a4def5-799e-4ed4-b2ac-32d0090246f1",
    "sourceReadingSha256": "d04d4fb26c0ed301e2b73d68b9eb3eed0bb10cdddb36d422f0b196aaad0095b8",
    "sourceScope": "Actual final1.0.24 installed SQLite confirmed Cantonese reading; not created by the1.0.25 domain engine"
  },
  "profile": {
    "id": "smoke-name-readings-known",
    "customerName": "姓名读音与意象隔离验收",
    "surname": "欧阳",
    "surnamePinyin": "ōu yáng",
    "gender": "中性",
    "calendar": "solar",
    "birthDate": "2026-10-17",
    "leapMonth": false,
    "birthTime": "09:30:00",
    "timeUnknown": false,
    "birthPlace": "杭州",
    "timezone": "Asia/Shanghai",
    "notes": "隔离自动验收；出生盘固定，复姓整体确认，不是实际客户。",
    "fatherName": "",
    "motherName": "",
    "monthAuthorityMethod": "sanming-first-paragraph/1.0.0",
    "seasonalMethod": "qiongtong-2294674-initial/1.0.0",
    "timeBasis": "civil",
    "renMethod": "none",
    "namingPreferences": {
      "length": 2,
      "generationChar": "",
      "requiredChars": "清宁",
      "forbiddenChars": "",
      "elderTaboo": "",
      "style": "清朗自然",
      "meanings": "平安、求知",
      "industry": "",
      "priority": "balanced",
      "preferredElements": [],
      "zodiacRules": false,
      "numerology": false,
      "avoidParentNames": true,
      "imageryReading": true,
      "yueReading": true
    }
  },
  "givenName": "清宁",
  "reading": {
    "version": "yue-name-reading/1.0.0",
    "language": "yue",
    "romanization": "Jyutping",
    "surname": {
      "text": "欧阳",
      "candidates": [
        {
          "id": "rime-yue:word:372",
          "text": "歐陽",
          "tokens": [
            "au1",
            "joeng4"
          ],
          "sourceId": "rime-cantonese-jyutping",
          "sourceVersion": "2026.08.10",
          "sourceFile": "jyut6ping3.words.dict.yaml",
          "sourceLine": 372
        }
      ],
      "selection": {
        "tokens": [
          "au1",
          "joeng4"
        ],
        "origin": "dictionary",
        "confirmed": true,
        "dictionaryId": "rime-yue:word:372"
      }
    },
    "given": [
      {
        "text": "清",
        "candidates": [
          {
            "id": "rime-yue:char:2737",
            "text": "清",
            "tokens": [
              "ceng1"
            ],
            "sourceId": "rime-cantonese-jyutping",
            "sourceVersion": "2026.08.10",
            "sourceFile": "jyut6ping3.chars.dict.yaml",
            "sourceLine": 2737
          },
          {
            "id": "rime-yue:char:3513",
            "text": "清",
            "tokens": [
              "cing1"
            ],
            "sourceId": "rime-cantonese-jyutping",
            "sourceVersion": "2026.08.10",
            "sourceFile": "jyut6ping3.chars.dict.yaml",
            "sourceLine": 3513
          }
        ],
        "selection": {
          "tokens": [
            "cing1"
          ],
          "origin": "user",
          "confirmed": true
        }
      },
      {
        "text": "宁",
        "candidates": [
          {
            "id": "rime-yue:char:4469",
            "text": "宁",
            "tokens": [
              "cyu5"
            ],
            "sourceId": "rime-cantonese-jyutping",
            "sourceVersion": "2026.08.10",
            "sourceFile": "jyut6ping3.chars.dict.yaml",
            "sourceLine": 4469
          },
          {
            "id": "rime-yue:char:23524",
            "text": "宁",
            "tokens": [
              "ning4"
            ],
            "sourceId": "rime-cantonese-jyutping",
            "sourceVersion": "2026.08.10",
            "sourceFile": "jyut6ping3.chars.dict.yaml",
            "sourceLine": 23524
          },
          {
            "id": "rime-yue:char:23529",
            "text": "寧",
            "tokens": [
              "ning4"
            ],
            "sourceId": "rime-cantonese-jyutping",
            "sourceVersion": "2026.08.10",
            "sourceFile": "jyut6ping3.chars.dict.yaml",
            "sourceLine": 23529
          },
          {
            "id": "rime-yue:char:23555",
            "text": "寧",
            "tokens": [
              "ning6"
            ],
            "sourceId": "rime-cantonese-jyutping",
            "sourceVersion": "2026.08.10",
            "sourceFile": "jyut6ping3.chars.dict.yaml",
            "sourceLine": 23555
          }
        ],
        "selection": {
          "tokens": [
            "ning4"
          ],
          "origin": "dictionary",
          "confirmed": true,
          "dictionaryId": "rime-yue:char:23529"
        }
      }
    ],
    "status": "confirmed",
    "fullNameTokens": [
      "au1",
      "joeng4",
      "cing1",
      "ning4"
    ],
    "sourceIds": [
      "rime-cantonese-jyutping",
      "unicode-17"
    ],
    "limitations": [
      "字词读音候选来自固定版粤拼词典；单一候选也须确认，字典词音不自动证明姓名义项。",
      "复姓只展示已有完整词条，不按单字候选拼出姓氏读音；缺项可由家庭明确确认。",
      "此处记录选定音节，未实现连读音变、地区差异或经审阅的粤语不雅谐音检查。",
      "词典输入权重不代表人口重名率；本参考不作谐音安全、命运或低重名率结论。"
    ]
  },
  "readingSources": [
    {
      "id": "unicode-17",
      "name": "Unicode 17.0 Unihan 字形及普通话字段",
      "url": "https://github.com/unicode-org/unicodetools",
      "commit": "4fd8eca90b30aa4c72543ccddb4c15d05becdf8d",
      "license": "Unicode-3.0",
      "files": [
        "data/raw/kMandarin.txt",
        "data/raw/kTotalStrokes.txt",
        "data/raw/kTraditionalVariant.txt",
        "data/raw/kSimplifiedVariant.txt",
        "data/raw/kRSUnicode.txt",
        "data/raw/CJKRadicals.txt",
        "data/raw/unicode-LICENSE"
      ],
      "sha256": "f28cbf0a1b546a3cb1b44d4cb324d8fc9c93e14ffa9887f408aaad52f34daa1d",
      "note": "读音 kMandarin、普通笔画 kTotalStrokes、简繁异体字段；不冒充中文辞书或康熙笔画。原字段的范围压缩展开成逐字记录。"
    },
    {
      "id": "rime-cantonese-jyutping",
      "name": "Rime 粤语拼音固定版字词读音参考",
      "url": "https://github.com/rime/rime-cantonese/tree/259f0e48bba840c3a2e0d117539e96937f3d89bc",
      "commit": "259f0e48bba840c3a2e0d117539e96937f3d89bc",
      "license": "CC-BY-4.0",
      "files": [
        "data/raw/yue-reading-CC-BY-4.0.txt",
        "data/raw/yue-reading-NOTICE.md",
        "data/raw/yue-reading-README-cmn.md",
        "data/raw/yue-reading-chars.dict.yaml",
        "data/raw/yue-reading-words.dict.yaml",
        "data/yue-reading-table.json"
      ],
      "sha256": "324e60c2f1f756b924423f999cb8e1a27db3ab25854bdb260c7de824d02ef414",
      "note": "CanCLID/Rime Cantonese contributors；仅待确认字词读音，复姓只用完整词条；不含 maps/phrase、不作谐音安全或人口重名率结论。"
    }
  ]
} as unknown as PublishedReading;
const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm'),directories:string[]=[],stores:Store[]=[];
const profile:BirthProfile={id:'homophone-service',customerName:'粤语有限词汇复核隔离验收',surname:'溫',surnamePinyin:'wēn',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:'09:30:00',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''};
const preferences=normalizePreferences({length:1,requiredChars:'奕',zodiacRules:false,yueReading:true,yueHomophones:'strict',imageryReading:true});
let SQL:Awaited<ReturnType<typeof initSqlJs>>;
beforeAll(async()=>{SQL=await initSqlJs({locateFile:()=>wasm});});
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const canonical=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const disk=(store:Store)=>readFileSync(join(store.userDir,'customers.sqlite'));
const current=(store:Store,id:string)=>store.rows<NamingSession>('sessions').find(session=>session.id===id)!;
const first=(session:NamingSession)=>session.candidates[0];
const review=(session:NamingSession,candidateId=first(session).id):YueHomophoneReview=>session.candidates.find(candidate=>candidate.id===candidateId)!.yueHomophones!;
const family=(...tokens:string[]):YueReadingSelection=>({tokens,origin:'user',confirmed:true});
const dictionary=(unit:YueReadingUnit,tokens:string[]):YueReadingSelection=>{const candidate=unit.candidates.find(row=>JSON.stringify(row.tokens)===JSON.stringify(tokens));if(!candidate)throw new Error('Expected actual fixed dictionary option: '+unit.text+' '+tokens.join(' '));return {tokens:[...candidate.tokens],origin:'dictionary',confirmed:true,dictionaryId:candidate.id};};
async function open(directory?:string){const dir=directory??mkdtempSync(join(tmpdir(),'yue-homophone-integration-'));if(!directory)directories.push(dir);const store=await new Store(dir,resolve('data'),wasm).init();stores.push(store);return {dir,store,service:new StudioService(store,{read:()=>'',write:()=>{}},false)};}
async function setup(input:BirthProfile=profile,pref:NamingPreferences=preferences){const opened=await open(),generated=(await opened.service.generate(input,pref)).session;return {...opened,session:current(opened.store,generated.id)};}
function close(store:Store){const index=stores.indexOf(store);if(index>=0)stores.splice(index,1);store.db.close();}
function update(service:StudioService,session:NamingSession,selections:YueReadingSelections,candidateId=first(session).id){return service.updateYueReading(session.id,candidateId,selections,session.reviewRevision,session.reviewToken);}
function confirmStrict(service:StudioService,session:NamingSession){const value=first(session).yueReading!;return update(service,session,{surname:dictionary(value.surname,['wan1']),given:[dictionary(value.given[0],['jik6'])]});}
async function confirmed(){const value=await setup();return {...value,initial:value.session,session:confirmStrict(value.service,value.session)};}
function editDatabase(database:initSqlJs.Database,table:'sessions'|'revisions',id:string|number,edit:(session:NamingSession)=>void){const raw=database.exec(`SELECT json FROM ${table} WHERE id=?`,[id])[0]?.values[0]?.[0];if(typeof raw!=='string')throw new Error('Expected actual stored row');const session=JSON.parse(raw) as NamingSession;edit(session);database.run(`UPDATE ${table} SET json=? WHERE id=?`,[JSON.stringify(session),id]);}
function externallyEdit(directory:string,table:'sessions'|'revisions',id:string|number,edit:(session:NamingSession)=>void){const file=join(directory,'customers.sqlite'),database=new SQL.Database(readFileSync(file));try{editDatabase(database,table,id,edit);writeFileSync(file,database.export());}finally{database.close();}}
afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const directory of directories.splice(0))rmSync(directory,{recursive:true,force:true});});

describe('optional finite Cantonese word review at actual generation and confirmation boundaries',{ timeout: 15_000 }, ()=>{
 it('defaults absent mode to none and attaches neither review nor the two dedicated sources',async()=>{
  const {service}=await open();
  for(const [index,yueReading]of [false,true].entries()){const session=(await service.generate({...profile,id:'homophone-default-'+index},normalizePreferences({...preferences,yueReading,yueHomophones:undefined}))).session;
   expect(session.preferences.yueHomophones).toBe('none');expect(session.candidates.every(candidate=>candidate.yueHomophones===undefined)).toBe(true);
   for(const id of YUE_HOMOPHONE_SOURCE_IDS){expect(session.sourceSnapshot!.sources.some(source=>source.id===id)).toBe(false);expect(sessionReferencedSourceIds(session)).not.toContain(id);}expect(validSession(session)).toBe(true);
  }
  expect(namingInputKey(profile,{...preferences,yueHomophones:undefined})).toBe(namingInputKey(profile,{...preferences,yueHomophones:'none'}));
 });
 it.each(['strict','ignore-tone']as const)('rejects %s with reading disabled before any customer write',async mode=>{
  const {store,service}=await open(),before=disk(store),invalid={...preferences,yueReading:false,yueHomophones:mode};
  expect(()=>service.validatePreferences(invalid)).toThrow('读音');await expect(service.generate(profile,invalid)).rejects.toThrow('读音');expect(disk(store).equals(before)).toBe(true);expect(store.rows('profiles')).toEqual([]);
 });
 it('records every initially unconfirmed candidate as not-assessed with both exact dedicated source identities',async()=>{
  const {session}=await setup();expect(first(session).fullName).toBe('溫奕');expect(validSession(session)).toBe(true);
  for(const candidate of session.candidates){expect(candidate.yueReading!.status).toBe('unconfirmed');expect(candidate.yueHomophones).toMatchObject({mode:'strict',status:'not-assessed',selectedTokens:[],matches:[]});expect(candidate.yueHomophones!.missing.length).toBeGreaterThan(0);}
  expect(session.sourceSnapshot!.sources.filter(source=>(YUE_HOMOPHONE_SOURCE_IDS as readonly string[]).includes(source.id))).toEqual(loadYueHomophoneSources(resolve('data')));expect(sessionReferencedSourceIds(session)).toEqual(expect.arrayContaining([...YUE_HOMOPHONE_SOURCE_IDS]));
 });
 it('matches actual selected 溫奕 wan1 jik6 against 瘟疫, and changing only that selected reading changes the review',async()=>{
  const {store,service,initial,session}=await confirmed(),result=review(session),match=result.matches.find(item=>item.term==='瘟疫')!;
  expect(result).toMatchObject({mode:'strict',status:'assessed',fullName:'溫奕',selectedTokens:['wan1','jik6'],missing:[]});
  expect(match).toMatchObject({span:{start:0,endExclusive:2,text:'溫奕',scope:'whole-full-name'},comparison:'exact',actualTokens:['wan1','jik6'],ruleTokens:['wan1','jik6'],differentTonePositions:[]});expect(match.sourceRefs).toHaveLength(2);expect(match.glosses.length).toBeGreaterThan(0);
  const altered=update(service,session,{surname:family('wan1'),given:[family('jik1')]});expect(first(altered).fullName).toBe(first(session).fullName);expect(review(altered).status).toBe('assessed');expect(review(altered).matches).toEqual([]);
  expect(altered.analysis).toEqual(initial.analysis);expect(first(altered).evaluation).toEqual(first(initial).evaluation);expect(first(altered).imageReading).toEqual(first(initial).imageReading);expect(current(store,session.id).analysis).toEqual(initial.analysis);
 });
 it('does not enumerate a different dictionary sound to turn the actual selected 溫逸 wan1 jat6 into a match',async()=>{
  const {service,session}=await setup({...profile,id:'homophone-pronunciation-negative'},normalizePreferences({...preferences,requiredChars:'逸'})),value=first(session).yueReading!;
  const selected=update(service,session,{surname:dictionary(value.surname,['wan1']),given:[dictionary(value.given[0],['jat6'])]});expect(review(selected).selectedTokens).toEqual(['wan1','jat6']);expect(review(selected).matches).toEqual([]);expect(review(selected).status).toBe('assessed');
 });
 it('separates strict and tone-insensitive 衰人 reminders for the actually generated 陈瑞仁 with correct Mandarin input',async()=>{
  // 卫笙瑾 remains a domain golden; real generation correctly filters its registered Mandarin wei sheng jin reading.
  // This service fixture uses genuine chén/瑞仁 and explicitly confirmed synthetic family Yue syllables instead.
  const {service}=await open();
  for(const mode of ['strict','ignore-tone']as const){const generated=(await service.generate({...profile,id:'homophone-tone-'+mode,surname:'陈',surnamePinyin:'chén'},normalizePreferences({...preferences,length:2,requiredChars:'瑞仁',yueHomophones:mode}))).session,candidate=generated.candidates.find(item=>item.givenName==='瑞仁')!;
   expect(candidate).toBeDefined();const selected=update(service,generated,{surname:family('can4'),given:[family('seoi6'),family('jan4')]},candidate.id),result=review(selected,candidate.id);
   expect(result.selectedTokens).toEqual(['can4','seoi6','jan4']);expect(result.status).toBe('assessed');
   if(mode==='strict')expect(result.matches).toEqual([]);else expect(result.matches.find(item=>item.term==='衰人')).toMatchObject({span:{start:1,endExclusive:3,text:'瑞仁',scope:'whole-given-name'},comparison:'tone-only',differentTonePositions:[1],actualTokens:['seoi6','jan4'],ruleTokens:['seoi1','jan4']});
   const soundChanged=update(service,selected,{surname:family('can4'),given:[family('sui6'),family('jan4')]},candidate.id);expect(review(soundChanged,candidate.id).matches).toEqual([]);expect(review(soundChanged,candidate.id).status).toBe('assessed');
  }
 });
 it('keeps partial and cleared selections not-assessed, without fabricating a safe or passed state',async()=>{
  const {service,initial,session}=await confirmed();const partial=update(service,session,{surname:family('wan1'),given:[null]});expect(first(partial).yueReading!.status).toBe('partial');expect(review(partial)).toMatchObject({status:'not-assessed',selectedTokens:[],matches:[]});expect(review(partial).missing.length).toBeGreaterThan(0);
  const cleared=update(service,partial,{surname:null,given:[null]});expect(first(cleared).yueReading!.status).toBe('unconfirmed');expect(review(cleared)).toEqual(review(initial));expect(review(cleared)).not.toHaveProperty('safe');expect(review(cleared)).not.toHaveProperty('passed');
 });
 it('does not change actual candidate scores, chart, labels or ranking when mode is enabled or changed',async()=>{
  const {service}=await open(),sessions:NamingSession[]=[];
  for(const mode of ['none','strict','ignore-tone']as const)sessions.push((await service.generate({...profile,id:'homophone-score-'+mode},normalizePreferences({...preferences,yueHomophones:mode}))).session);
  const facts=(session:NamingSession)=>session.candidates.map(candidate=>({givenName:candidate.givenName,evaluation:candidate.evaluation,characters:candidate.characters,meaning:candidate.meaning,reason:candidate.reason,imageReading:candidate.imageReading}));
  for(const session of sessions.slice(1)){expect(session.analysis).toEqual(sessions[0].analysis);expect(facts(session)).toEqual(facts(sessions[0]));}
  const strict=sessions[1];expect(isSessionCurrent(strict.profile,strict.preferences,strict)).toBe(true);expect(isSessionCurrent(strict.profile,{...strict.preferences,yueHomophones:'ignore-tone'},strict)).toBe(false);expect(namingInputKey(profile,{...preferences,yueHomophones:'strict'})).not.toBe(namingInputKey(profile,{...preferences,yueHomophones:'ignore-tone'}));
 });
});

describe('homophone review concurrency, immutable review fields and historical snapshots',{ timeout: 15_000 }, ()=>{
 it('preserves initial/confirmed/cleared revisions, rejects stale writes, and roundtrips each state through separate-store backup/history restore',async()=>{
  const {store,service,initial,session}=await confirmed(),confirmedResult=structuredClone(review(session));
  const before=disk(store);expect(()=>update(service,initial,{surname:null,given:[null]})).toThrow();expect(disk(store).equals(before)).toBe(true);
  const cleared=update(service,session,{surname:null,given:[null]}),history=service.listHistory(session.id),initialRevision=history.find(row=>review(row.session).status==='not-assessed')!,confirmedRevision=history.find(row=>review(row.session).matches.some(match=>match.term==='瘟疫'))!;
  expect(initialRevision).toBeDefined();expect(confirmedRevision).toBeDefined();expect(review(confirmedRevision.session)).toEqual(confirmedResult);
  const destination=await open();destination.store.restore(store.backupBytes());expect(review(current(destination.store,session.id))).toEqual(review(initial));expect(destination.service.listHistory(session.id).some(row=>review(row.session).matches.some(match=>match.term==='瘟疫'))).toBe(true);
  const restored=service.restoreHistory(cleared.id,confirmedRevision.id,cleared.reviewRevision,cleared.reviewToken);expect(review(restored)).toEqual(confirmedResult);expect(restored.analysis).toEqual(initial.analysis);
  const pending=service.restoreHistory(restored.id,initialRevision.id,restored.reviewRevision,restored.reviewToken);expect(review(pending)).toEqual(review(initial));
 });
 it('ordinary review saving preserves the original match and mode even when supplied with edited derived data',async()=>{
  const {service,session}=await confirmed(),original=structuredClone(review(session)),draft=structuredClone(session);draft.reviewNote='人工意见与粤语词义提醒分开';draft.preferences.yueHomophones='ignore-tone';review(draft).matches=[];
  const saved=service.saveSession(draft);expect(saved.preferences.yueHomophones).toBe('strict');expect(review(saved)).toEqual(original);expect(saved.reviewNote).toBe(draft.reviewNote);
 });
 it('keeps the exact actual1.0.24 confirmed Yue1.0 output under default none without backfilling new results or sources',async()=>{
  expect(published124.provenance.appVersion).toBe('1.0.24');expect(digest(published124.reading)).toBe(published124.provenance.sourceReadingSha256);expect(published124.reading.version).toBe('yue-name-reading/1.0.0');
  const {store,service}=await open(),generated=(await service.generate({...published124.profile,id:'homophone-published124'},normalizePreferences({...published124.profile.namingPreferences,length:2,requiredChars:published124.givenName,yueReading:true,yueHomophones:'none'}))).session,candidate=generated.candidates.find(item=>item.givenName===published124.givenName)!;
  const oldSelections={surname:published124.reading.surname.selection!,given:published124.reading.given.map(unit=>unit.selection!)};
  let selected=update(service,generated,oldSelections,candidate.id);expect(selected.candidates.find(item=>item.id===candidate.id)!.yueReading).toEqual(published124.reading);
  // Recreate the genuinely absent optional preference of the published row through the Store contract, not a fabricated new match.
  delete selected.preferences.yueHomophones;if(selected.profile.namingPreferences)delete selected.profile.namingPreferences.yueHomophones;selected=store.saveSession(selected);
  const saved=service.saveSession({...selected,reviewNote:'旧1.0.24字音保留，未回填词汇复核'});expect(saved.preferences.yueHomophones).toBeUndefined();expect(saved.candidates.find(item=>item.id===candidate.id)!.yueReading).toEqual(published124.reading);expect(saved.candidates.every(item=>item.yueHomophones===undefined)).toBe(true);
  expect(saved.sourceSnapshot!.sources.filter(source=>['rime-cantonese-jyutping','unicode-17'].includes(source.id))).toEqual(published124.readingSources);for(const id of YUE_HOMOPHONE_SOURCE_IDS)expect(saved.sourceSnapshot!.sources.some(source=>source.id===id)).toBe(false);
  store.restore(store.backupBytes());expect(current(store,saved.id).preferences.yueHomophones).toBeUndefined();expect(current(store,saved.id).candidates.find(item=>item.id===candidate.id)!.yueReading).toEqual(published124.reading);
 });
});

const corruptions:Array<{name:string;edit:(session:NamingSession)=>void}>=[
 {name:'result omitted',edit:session=>{delete first(session).yueHomophones;}},
 {name:'match removed',edit:session=>{review(session).matches=[];}},
 {name:'original gloss forged',edit:session=>{review(session).matches[0].glosses[0].quotes=['无源词义'];}},
 {name:'actual glyph span forged',edit:session=>{review(session).matches[0].span.text='另名';}},
 {name:'span boundary shifted',edit:session=>{review(session).matches[0].span.start=1;}},
 {name:'span scope forged',edit:session=>{review(session).matches[0].span.scope='whole-given-name';}},
 {name:'source locator forged',edit:session=>{review(session).matches[0].sourceRefs[0].locator='forged';}},
 {name:'selected tokens replaced',edit:session=>{review(session).selectedTokens=['wan1','jik1'];}},
 {name:'result mode changed',edit:session=>{review(session).mode='ignore-tone';}},
 {name:'preference mode changed',edit:session=>{session.preferences.yueHomophones='none';}},
 {name:'missing prerequisites invented',edit:session=>{review(session).missing=['伪造尚缺'];}},
 {name:'result source ids stripped',edit:session=>{review(session).sourceIds=[];}},
 {name:'fixed source removed',edit:session=>{session.sourceSnapshot!.sources=session.sourceSnapshot!.sources.filter(source=>source.id!==YUE_HOMOPHONE_SOURCE_IDS[0]);}},
 {name:'fixed source metadata forged',edit:session=>{session.sourceSnapshot!.sources.find(source=>source.id===YUE_HOMOPHONE_SOURCE_IDS[1])!.commit='forged';}},
];
describe('homophone saved/imported/SQLite current and history integrity',{ timeout: 15_000 }, ()=>{
 it.each(corruptions)('rejects $name at direct Store save and backup import without changing good bytes',async corruption=>{
  const {store,session}=await confirmed(),before=disk(store),bad=structuredClone(session);corruption.edit(bad);expect(()=>store.saveSession(bad)).toThrow();expect(disk(store).equals(before)).toBe(true);
  const database=new SQL.Database(store.backupBytes());try{editDatabase(database,'sessions',session.id,corruption.edit);expect(()=>store.restore(database.export())).toThrow();}finally{database.close();}expect(disk(store).equals(before)).toBe(true);expect(current(store,session.id)).toEqual(canonical(session));
 });
 it.each(corruptions.filter(row=>['match removed','original gloss forged','actual glyph span forged','fixed source metadata forged','preference mode changed'].includes(row.name)))('rejects externally edited current $name on actual close/reopen without rewriting damaged bytes',async corruption=>{
  const {dir,store,session}=await confirmed();close(store);externallyEdit(dir,'sessions',session.id,corruption.edit);const changed=readFileSync(join(dir,'customers.sqlite'));
  if(corruption.name==='fixed source metadata forged'){await expect(open(dir)).rejects.toThrow('命名规则历史关联不一致');expect(readFileSync(join(dir,'customers.sqlite')).equals(changed)).toBe(true);return;}
  const reopened=await open(dir);expect(()=>reopened.service.bootstrap()).toThrow();expect(disk(reopened.store).equals(changed)).toBe(true);
 });
 it('refuses a forged historical match before history rendering or backup while the current row remains intact',async()=>{
  const {dir,store,service,session}=await confirmed();const saved=service.saveSession({...session,reviewNote:'保留一次真实已确认历史'}),revision=service.listHistory(session.id).find(row=>review(row.session).status==='assessed')!;close(store);
  externallyEdit(dir,'revisions',Number(revision.id),value=>{review(value).matches[0].glosses[0].quotes=['伪造历史义项'];});const changed=readFileSync(join(dir,'customers.sqlite')),reopened=await open(dir);expect(reopened.service.bootstrap().sessions.some(value=>value.id===saved.id)).toBe(true);expect(()=>reopened.service.listHistory(saved.id)).toThrow();expect(()=>reopened.store.backupBytes()).toThrow();expect(disk(reopened.store).equals(changed)).toBe(true);
 });
 it('rejects dedicated source grafts into an inactive none session at the actual SQLite reload boundary',async()=>{
  const {dir,store,session}=await setup(profile,normalizePreferences({...preferences,yueHomophones:'none'}));close(store);externallyEdit(dir,'sessions',session.id,value=>{value.sourceSnapshot!.sources.push(...loadYueHomophoneSources(resolve('data')));});const changed=readFileSync(join(dir,'customers.sqlite')),reopened=await open(dir);expect(()=>reopened.service.bootstrap()).toThrow();expect(disk(reopened.store).equals(changed)).toBe(true);
 });
});
