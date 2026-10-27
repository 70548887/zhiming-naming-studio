import {afterEach,beforeAll,describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename,dirname,join,resolve} from 'node:path';
import initSqlJs from 'sql.js';
import {Store,validSession} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {loadYueHomophoneExpandedSources,YUE_HOMOPHONE_EXPANDED_SOURCE_IDS,YUE_HOMOPHONE_EXPANDED_VERSION} from '../src/main/yue-homophone-expanded-data';
import {YUE_HOMOPHONE_SOURCE_IDS} from '../src/main/yue-homophone-data';
import {ALL_YUE_HOMOPHONE_SOURCE_IDS} from '../src/domain/yue-homophone-router';
import {normalizePreferences} from '../src/shared/workflow';
import type {BirthProfile,NamingPreferences,NamingSession,YueNameReading,YueReadingSelections,YueReadingSelection,YueReadingUnit} from '../src/shared/types';
import type {YueHomophoneReview,YueHomophoneVersion} from '../src/shared/yue-homophone-types';

const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm'),directories:string[]=[],stores:Store[]=[];
const profile:BirthProfile={id:'yue11-actual',customerName:'粤语1.1真实服务集成隔离测试',surname:'刘',surnamePinyin:'liú',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:'09:30:00',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''};
const preferences=normalizePreferences({length:1,requiredChars:'文',zodiacRules:false,yueReading:true,yueHomophones:'strict',yueHomophoneRuleVersion:YUE_HOMOPHONE_EXPANDED_VERSION});
let SQL:Awaited<ReturnType<typeof initSqlJs>>;
beforeAll(async()=>{SQL=await initSqlJs({locateFile:()=>wasm});});
const disk=(store:Store)=>readFileSync(join(store.userDir,'customers.sqlite'));
const current=(store:Store,id:string)=>store.rows<NamingSession>('sessions').find(session=>session.id===id)!;
const first=(session:NamingSession)=>session.candidates[0];
const review=(session:NamingSession):YueHomophoneReview=>first(session).yueHomophones!;
const canonical=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const sha=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
interface PublishedRecord {table:'sessions'|'revisions';rowId:string;rawJson:string;rawSha256:string;}
const published=JSON.parse(readFileSync(resolve('tests/fixtures/yue-homophone-v1-actual-sessions.json'),'utf8')) as {source:{sha256Before:string;sha256After:string};records:PublishedRecord[]};
const dictionary=(unit:YueReadingUnit,tokens:string[]):YueReadingSelection=>{const candidate=unit.candidates.find(row=>JSON.stringify(row.tokens)===JSON.stringify(tokens));if(!candidate)throw new Error('Expected actual fixed dictionary option: '+unit.text+' '+tokens.join(' '));return{tokens:[...candidate.tokens],origin:'dictionary',confirmed:true,dictionaryId:candidate.id};};
async function open(directory?:string){const dir=directory??mkdtempSync(join(tmpdir(),'yue11-integration-'));if(!directory)directories.push(dir);const store=await new Store(dir,resolve('data'),wasm).init();stores.push(store);return{dir,store,service:new StudioService(store,{read:()=>'',write:()=>{}},false)};}
async function setup(input:BirthProfile=profile,pref:NamingPreferences=preferences){const opened=await open(),generated=(await opened.service.generate(input,pref)).session;expect(generated.candidates.length).toBeGreaterThan(0);return{...opened,session:current(opened.store,generated.id)};}
function close(store:Store){const index=stores.indexOf(store);if(index>=0)stores.splice(index,1);store.db.close();}
function update(service:StudioService,session:NamingSession,selections:YueReadingSelections){return service.updateYueReading(session.id,first(session).id,selections,session.reviewRevision,session.reviewToken);}
function selected(service:StudioService,session:NamingSession,tokens:string[]=['lau4','man4']){const reading=first(session).yueReading!;return update(service,session,{surname:dictionary(reading.surname,tokens.slice(0,[...session.profile.surname].length)),given:reading.given.map((unit,index)=>dictionary(unit,[tokens[[...session.profile.surname].length+index]]))});}
async function confirmed(){const opened=await setup();return{...opened,initial:opened.session,session:selected(opened.service,opened.session)};}
function editDatabase(database:initSqlJs.Database,table:'sessions'|'revisions',id:string|number,edit:(session:NamingSession)=>void){const raw=database.exec(`SELECT json FROM ${table} WHERE id=?`,[id])[0]?.values[0]?.[0];if(typeof raw!=='string')throw new Error('Expected actual stored row');const session=JSON.parse(raw) as NamingSession;edit(session);database.run(`UPDATE ${table} SET json=? WHERE id=?`,[JSON.stringify(session),id]);}
function externallyEdit(directory:string,table:'sessions'|'revisions',id:string|number,edit:(session:NamingSession)=>void){const file=join(directory,'customers.sqlite'),database=new SQL.Database(readFileSync(file));try{editDatabase(database,table,id,edit);writeFileSync(file,database.export());}finally{database.close();}}
afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const directory of directories.splice(0)){if(dirname(resolve(directory))!==resolve(tmpdir())||!basename(directory).startsWith('yue11-integration-'))throw new Error('Unexpected temporary target');rmSync(directory,{recursive:true,force:true});}});

describe('actual service generation with explicitly selected independent Yue1.1',{ timeout: 15_000 }, ()=>{
 it.each([{name:'刘文',surname:'刘',pinyin:'liú',given:'文',tokens:['lau4','man4']},{name:'刘望',surname:'刘',pinyin:'liú',given:'望',tokens:['lau4','mong4']}])('generates $name through real Mandarin filters and confirms its explicit 流氓 sound',async item=>{
  const {service,session}=await setup({...profile,surname:item.surname,surnamePinyin:item.pinyin},normalizePreferences({...preferences,requiredChars:item.given}));
  expect(first(session).fullName).toBe(item.surname+item.given);expect(review(session)).toMatchObject({version:YUE_HOMOPHONE_EXPANDED_VERSION,status:'not-assessed',matches:[]});
  const confirmed=selected(service,session,item.tokens),result=review(confirmed);
  expect(result).toMatchObject({version:YUE_HOMOPHONE_EXPANDED_VERSION,status:'assessed',selectedTokens:item.tokens});
  expect(result.matches).toHaveLength(1);expect(result.matches[0]).toMatchObject({term:'流氓',ruleTokens:item.tokens,span:{text:item.surname+item.given,scope:'whole-full-name'},comparison:'exact'});
  expect(confirmed.sourceSnapshot!.sources.filter(source=>(ALL_YUE_HOMOPHONE_SOURCE_IDS as readonly string[]).includes(source.id))).toEqual(loadYueHomophoneExpandedSources(resolve('data')));expect(validSession(confirmed)).toBe(true);
 });
 it('checks 简湘 as a tone-only 奸商 association only when that mode is explicitly chosen',async()=>{
  for(const mode of ['strict','ignore-tone'] as const){const {service,session}=await setup({...profile,surname:'简',surnamePinyin:'jiǎn'},normalizePreferences({...preferences,requiredChars:'湘',yueHomophones:mode}));expect(first(session).fullName).toBe('简湘');const actual=selected(service,session,['gaan2','soeng1']);expect(review(actual).matches.map(match=>match.term)).toEqual(mode==='strict'?[]:['奸商']);if(mode==='ignore-tone')expect(review(actual).matches[0]).toMatchObject({comparison:'tone-only',actualTokens:['gaan2','soeng1'],ruleTokens:['gaan1','soeng1'],differentTonePositions:[0]});}
 });
 it('keeps chart, candidate scores and ranking identical for disabled,1.0 and1.1 generation',async()=>{
  const {service}=await open(),sessions:NamingSession[]=[];
  for(const [index,version]of [undefined,'yue-homophone-review/1.0.0',YUE_HOMOPHONE_EXPANDED_VERSION].entries()){const input={...preferences,yueHomophones:version?'strict' as const:'none' as const};if(version)input.yueHomophoneRuleVersion=version as YueHomophoneVersion;else delete input.yueHomophoneRuleVersion;sessions.push((await service.generate({...profile,id:'yue11-scores-'+index},normalizePreferences(input))).session);}
  const facts=(session:NamingSession)=>session.candidates.map(candidate=>({givenName:candidate.givenName,evaluation:candidate.evaluation,characters:candidate.characters,meaning:candidate.meaning,reason:candidate.reason,warnings:candidate.warnings}));
  for(const session of sessions.slice(1)){expect(session.analysis).toEqual(sessions[0].analysis);expect(facts(session)).toEqual(facts(sessions[0]));}
  expect(first(sessions[0]).yueHomophones).toBeUndefined();expect(sessions[0].preferences.yueHomophoneRuleVersion).toBeUndefined();expect(sessions[0].sourceSnapshot!.sources.some(source=>(ALL_YUE_HOMOPHONE_SOURCE_IDS as readonly string[]).includes(source.id))).toBe(false);
  const old=selected(service,sessions[1]),expanded=selected(service,sessions[2]);expect(review(old).version).toBe('yue-homophone-review/1.0.0');expect(review(old).matches).toEqual([]);expect(review(expanded).matches.map(match=>match.term)).toEqual(['流氓']);expect(first(old).evaluation).toEqual(first(expanded).evaluation);
 });
 it('retains explicit1.1 through unknown-time generation, partial/cleared readings, revision history and cross-store restore',async()=>{
  const {store,service,session:initial}=await setup({...profile,timeUnknown:true,birthTime:''}),confirmed=selected(service,initial),match=structuredClone(review(confirmed));
  expect(initial.analysis.qimen.available).toBe(false);const reading=first(confirmed).yueReading!;
  const partial=update(service,confirmed,{surname:dictionary(reading.surname,['lau4']),given:[null]});expect(review(partial)).toMatchObject({version:YUE_HOMOPHONE_EXPANDED_VERSION,status:'not-assessed',matches:[],selectedTokens:[]});
  const cleared=update(service,partial,{surname:null,given:[null]});expect(review(cleared)).toEqual(review(initial));expect(cleared.preferences.yueHomophoneRuleVersion).toBe(YUE_HOMOPHONE_EXPANDED_VERSION);
  const history=service.listHistory(initial.id),matched=history.find(row=>review(row.session).matches.length)!;expect(review(matched.session)).toEqual(match);
  const originalBytes=disk(store);expect(()=>update(service,confirmed,{surname:null,given:[null]})).toThrow();expect(disk(store).equals(originalBytes)).toBe(true);
  const destination=await open();destination.store.restore(store.backupBytes());expect(review(current(destination.store,cleared.id))).toEqual(review(initial));expect(destination.service.listHistory(cleared.id).some(row=>JSON.stringify(review(row.session))===JSON.stringify(match))).toBe(true);
  const destinationCurrent=current(destination.store,cleared.id),restored=destination.service.restoreHistory(cleared.id,matched.id,destinationCurrent.reviewRevision,destinationCurrent.reviewToken);expect(review(restored)).toEqual(match);expect(restored.preferences.yueHomophoneRuleVersion).toBe(YUE_HOMOPHONE_EXPANDED_VERSION);expect(restored.analysis).toEqual(initial.analysis);expect(first(restored).evaluation).toEqual(first(initial).evaluation);
 });
 it('keeps generated rule version and derived facts immutable during ordinary review saving',async()=>{
  const {service,session}=await confirmed(),draft=structuredClone(session),expected=structuredClone(review(session));draft.reviewNote='仅保存家庭讨论记录';draft.preferences.yueHomophoneRuleVersion='yue-homophone-review/1.0.0';review(draft).matches=[];
  const saved=service.saveSession(draft);expect(saved.preferences.yueHomophoneRuleVersion).toBe(YUE_HOMOPHONE_EXPANDED_VERSION);expect(review(saved)).toEqual(expected);expect(saved.reviewNote).toBe('仅保存家庭讨论记录');
 });
});

const corruptions:Array<{name:string;edit:(session:NamingSession)=>void}>=[
 {name:'legacy preference versus new result',edit:session=>{session.preferences.yueHomophoneRuleVersion='yue-homophone-review/1.0.0';}},
 {name:'missing new preference version',edit:session=>{delete session.preferences.yueHomophoneRuleVersion;}},
 {name:'missing result version',edit:session=>{delete (review(session) as Partial<YueHomophoneReview>).version;}},
 {name:'mixed legacy result version',edit:session=>{review(session).version='yue-homophone-review/1.0.0';}},
 {name:'missing candidate result',edit:session=>{delete first(session).yueHomophones;}},
 {name:'forged fixed source metadata',edit:session=>{session.sourceSnapshot!.sources.find(source=>source.id===YUE_HOMOPHONE_EXPANDED_SOURCE_IDS[0])!.commit='forged';}},
 {name:'missing fixed source',edit:session=>{session.sourceSnapshot!.sources=session.sourceSnapshot!.sources.filter(source=>source.id!==YUE_HOMOPHONE_EXPANDED_SOURCE_IDS[1]);}},
 {name:'forged original meaning',edit:session=>{review(session).matches[0].glosses[0].quotes=['无来源意义'];}},
 {name:'raw tags removed',edit:session=>{delete review(session).matches[0].glosses[0].rawTags;}},
 {name:'raw tags forged',edit:session=>{review(session).matches[0].glosses[1].rawTags=['本地杜撰'];}},
 {name:'raw tags smuggled as standardized tags',edit:session=>{review(session).matches[0].glosses[1].tags=['延伸'];}},
 {name:'selected token changed',edit:session=>{review(session).selectedTokens=['lau4','mong4'];}},
 {name:'rule token changed',edit:session=>{review(session).matches[0].ruleTokens=['lau4','mong4'];}},
 {name:'span changed',edit:session=>{review(session).matches[0].span.start=1;}},
 {name:'source reference hash changed',edit:session=>{review(session).matches[0].sourceRefs[0].recordSha256='0'.repeat(64);}},
 {name:'new match deleted',edit:session=>{review(session).matches=[];}},
 {name:'disabled mode retains results and sources',edit:session=>{session.preferences.yueHomophones='none';delete session.preferences.yueHomophoneRuleVersion;}},
];
describe('new1.1 save/import/actual SQLite current and history integrity',{ timeout: 15_000 }, ()=>{
 it.each(['sessions','revisions'] as const)('rejects an explicit null mode in disabled actual SQL %s instead of treating it as absent',async table=>{
  const input={...preferences,yueReading:false,yueHomophones:'none' as const};delete input.yueHomophoneRuleVersion;const {dir,store,service,session}=await setup(profile,normalizePreferences(input)),saved=service.saveSession({...session,reviewNote:'关闭模式null原始记录审读'}),revision=service.listHistory(saved.id)[0];
  const edit=(value:NamingSession)=>{(value.preferences as unknown as {yueHomophones:null}).yueHomophones=null;};const bad=structuredClone(saved);edit(bad);expect(validSession(bad)).toBe(false);const before=disk(store);expect(()=>store.saveSession(bad)).toThrow();expect(disk(store).equals(before)).toBe(true);
  close(store);externallyEdit(dir,table,table==='sessions'?saved.id:Number(revision.id),edit);const changed=disk({userDir:dir} as Store),reopened=await open(dir);if(table==='sessions')expect(()=>reopened.service.bootstrap()).toThrow();else expect(()=>reopened.service.listHistory(saved.id)).toThrow();expect(disk(reopened.store).equals(changed)).toBe(true);
 });
 it.each(['sessions','revisions'] as const)('rejects a disabled-only1.1 version in actual SQL %s without any lexical candidate or source fields',async table=>{
  const input={...preferences,yueReading:false,yueHomophones:'none' as const};delete input.yueHomophoneRuleVersion;const {dir,store,service,session}=await setup(profile,normalizePreferences(input));expect(first(session).yueHomophones).toBeUndefined();expect(first(session).yueReading).toBeUndefined();expect(session.sourceSnapshot!.sources.some(source=>(ALL_YUE_HOMOPHONE_SOURCE_IDS as readonly string[]).includes(source.id))).toBe(false);
  const saved=service.saveSession({...session,reviewNote:'仅关闭版本残留读取测试'}),revision=service.listHistory(saved.id)[0],edit=(value:NamingSession)=>{value.preferences.yueHomophoneRuleVersion=YUE_HOMOPHONE_EXPANDED_VERSION;};const bad=structuredClone(saved);edit(bad);const before=disk(store);expect(()=>store.saveSession(bad)).toThrow();expect(disk(store).equals(before)).toBe(true);const database=new SQL.Database(store.backupBytes());try{editDatabase(database,table,table==='sessions'?saved.id:Number(revision.id),edit);expect(()=>store.restore(database.export())).toThrow();}finally{database.close();}expect(disk(store).equals(before)).toBe(true);
  close(store);externallyEdit(dir,table,table==='sessions'?saved.id:Number(revision.id),edit);const changed=disk({userDir:dir} as Store),reopened=await open(dir);if(table==='sessions')expect(()=>reopened.service.bootstrap()).toThrow();else{expect(reopened.service.bootstrap().sessions.some(value=>value.id===saved.id)).toBe(true);expect(()=>reopened.service.listHistory(saved.id)).toThrow();expect(()=>reopened.store.backupBytes()).toThrow();}expect(disk(reopened.store).equals(changed)).toBe(true);
 });
 it.each(corruptions)('rejects $name on save and import with original bytes unchanged',async corruption=>{
  const {store,session}=await confirmed(),before=disk(store),bad=structuredClone(session);corruption.edit(bad);expect(()=>store.saveSession(bad)).toThrow();expect(disk(store).equals(before)).toBe(true);
  const database=new SQL.Database(store.backupBytes());try{editDatabase(database,'sessions',session.id,corruption.edit);expect(()=>store.restore(database.export())).toThrow();}finally{database.close();}expect(disk(store).equals(before)).toBe(true);expect(current(store,session.id)).toEqual(canonical(session));
 });
 it.each(corruptions)('rejects $name on actual SQL current reopen without repairing the damaged bytes',async corruption=>{
  const {dir,store,session}=await confirmed();close(store);externallyEdit(dir,'sessions',session.id,corruption.edit);const changed=readFileSync(join(dir,'customers.sqlite'));
  if(['forged fixed source metadata','missing fixed source'].includes(corruption.name)){await expect(open(dir)).rejects.toThrow('命名规则历史关联不一致');expect(readFileSync(join(dir,'customers.sqlite')).equals(changed)).toBe(true);return;}
  const reopened=await open(dir);expect(()=>reopened.service.bootstrap()).toThrow();expect(disk(reopened.store).equals(changed)).toBe(true);
 });
 it.each(corruptions)('rejects $name on actual SQL historical read/backup or immutable-source initialization without changing bytes',async corruption=>{
  const {dir,store,service,session}=await confirmed();service.saveSession({...session,reviewNote:'归档一份真实已确认历史'});const revision=service.listHistory(session.id).find(row=>review(row.session).status==='assessed')!;close(store);
  externallyEdit(dir,'revisions',Number(revision.id),corruption.edit);const changed=readFileSync(join(dir,'customers.sqlite'));
  if(['forged fixed source metadata','missing fixed source'].includes(corruption.name)){await expect(open(dir)).rejects.toThrow('命名规则历史关联不一致');expect(readFileSync(join(dir,'customers.sqlite')).equals(changed)).toBe(true);return;}
  const reopened=await open(dir);expect(reopened.service.bootstrap().sessions.some(row=>row.id===session.id)).toBe(true);expect(()=>reopened.service.listHistory(session.id)).toThrow();expect(()=>reopened.store.backupBytes()).toThrow();expect(disk(reopened.store).equals(changed)).toBe(true);
 });
});

describe('all seven authentic1.0.25 current/history records remain1.0',{ timeout: 15_000 }, ()=>{
 const lexical=(session:NamingSession)=>({preferences:session.preferences,analysis:session.analysis,sourceSnapshot:session.sourceSnapshot,candidates:session.candidates.map(candidate=>({fullName:candidate.fullName,yueReading:candidate.yueReading,yueHomophones:candidate.yueHomophones,evaluation:candidate.evaluation}))});
 function assertLegacy(value:NamingSession){expect(value.preferences.yueHomophoneRuleVersion).toBeUndefined();expect(value.sourceSnapshot!.sources.filter(source=>(ALL_YUE_HOMOPHONE_SOURCE_IDS as readonly string[]).includes(source.id)).map(source=>source.id)).toEqual([...YUE_HOMOPHONE_SOURCE_IDS]);for(const candidate of value.candidates){expect(candidate.yueHomophones!.version).toBe('yue-homophone-review/1.0.0');expect(candidate.yueHomophones!.matches.every(match=>match.glosses.every(gloss=>!Object.hasOwn(gloss,'rawTags')))).toBe(true);}}
 it('retains exact original SQL sessions and revisions through import and cross-store backup',async()=>{
  expect(published.records).toHaveLength(7);expect(published.source.sha256Before).toBe(published.source.sha256After);const {store,service}=await open(),database=new SQL.Database(store.backupBytes());
  try{for(const record of published.records){expect(sha(record.rawJson)).toBe(record.rawSha256);const value=JSON.parse(record.rawJson) as NamingSession;if(record.table==='sessions'){database.run('INSERT INTO profiles(id,json) VALUES (?,?)',[value.profileId,JSON.stringify(value.profile)]);database.run('INSERT INTO sessions(id,json) VALUES (?,?)',[record.rowId,record.rawJson]);}else database.run('INSERT INTO revisions(id,session_id,created_at,json) VALUES (?,?,?,?)',[Number(record.rowId),value.id,value.createdAt,record.rawJson]);}store.restore(database.export());}finally{database.close();}
  const semanticSnapshot=(value:NamingSession)=>{const clone=structuredClone(value);delete clone.reviewToken;return clone;};
  for(const record of published.records){const expected=JSON.parse(record.rawJson) as NamingSession,actual=record.table==='sessions'?current(store,expected.id):service.listHistory(expected.id).find(row=>row.id===record.rowId)!.session;if(record.table==='sessions'){expect(actual.reviewToken).not.toBe(expected.reviewToken);expect(semanticSnapshot(actual)).toEqual(semanticSnapshot(expected));}else expect(actual).toEqual(expected);assertLegacy(actual);}
  const destination=await open();destination.store.restore(store.backupBytes());for(const record of published.records){const expected=JSON.parse(record.rawJson) as NamingSession,actual=record.table==='sessions'?current(destination.store,expected.id):destination.service.listHistory(expected.id).find(row=>row.id===record.rowId)!.session;if(record.table==='sessions')expect(semanticSnapshot(actual)).toEqual(semanticSnapshot(expected));else expect(actual).toEqual(expected);assertLegacy(actual);}
 });
 it.each(published.records)('preserves $table/$rowId through save, review, history and restoration',async record=>{
  expect(sha(record.rawJson)).toBe(record.rawSha256);const expected=JSON.parse(record.rawJson) as NamingSession,{store,service}=await open();store.saveProfile(expected.profile);let actual=store.saveSession(structuredClone(expected));expect(lexical(actual)).toEqual(lexical(expected));assertLegacy(actual);
  actual=service.saveSession({...actual,reviewNote:'旧发布原件的人工审阅，不更换词表'});const history=service.listHistory(actual.id),original=history.find(row=>row.session.reviewNote===expected.reviewNote)!;expect(lexical(original.session)).toEqual(lexical(expected));assertLegacy(original.session);
  actual=service.restoreHistory(actual.id,original.id,actual.reviewRevision,actual.reviewToken);expect(lexical(actual)).toEqual(lexical(expected));assertLegacy(actual);const destination=await open();destination.store.restore(store.backupBytes());expect(lexical(current(destination.store,actual.id))).toEqual(lexical(expected));assertLegacy(current(destination.store,actual.id));
 });
 it('rejects a new-source graft into an authentic old record on save/import/current/history',async()=>{
  const expected=JSON.parse(published.records.find(record=>record.table==='sessions')!.rawJson) as NamingSession,{dir,store,service}=await open();store.saveProfile(expected.profile);let saved=store.saveSession(expected);saved=service.saveSession({...saved,reviewNote:'创建旧版历史'});const revision=service.listHistory(saved.id)[0],graft=(value:NamingSession)=>{value.sourceSnapshot!.sources.push(...loadYueHomophoneExpandedSources(resolve('data')));};
  const bad=structuredClone(saved);graft(bad);const before=disk(store);expect(()=>store.saveSession(bad)).toThrow();expect(disk(store).equals(before)).toBe(true);const database=new SQL.Database(store.backupBytes());try{editDatabase(database,'sessions',saved.id,graft);expect(()=>store.restore(database.export())).toThrow();}finally{database.close();}expect(disk(store).equals(before)).toBe(true);
  close(store);externallyEdit(dir,'revisions',Number(revision.id),graft);const changed=disk({userDir:dir} as Store),reopened=await open(dir);expect(()=>reopened.service.listHistory(saved.id)).toThrow();expect(disk(reopened.store).equals(changed)).toBe(true);close(reopened.store);externallyEdit(dir,'sessions',saved.id,graft);const changedCurrent=disk({userDir:dir} as Store),reopenedCurrent=await open(dir);expect(()=>reopenedCurrent.service.bootstrap()).toThrow();expect(disk(reopenedCurrent.store).equals(changedCurrent)).toBe(true);
 });
});
