import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {mkdtempSync,readFileSync,writeFileSync,realpathSync,rmSync} from 'node:fs';
import {resolve,join,dirname,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {normalizePreferences} from '../src/shared/workflow';
import {CURRENT_NAMING_RULE_VERSION,NAMING_RULE_SOURCE_ID} from '../src/shared/naming-rules';
import {reportHTML} from '../src/main/report';
import {ELEMENT_ASSESSMENT_SOURCE_ID} from '../src/shared/element-assessment';
import {NAME_PHONETIC_SOURCE_IDS} from '../src/shared/name-phonetic-preferences';
import type {BirthProfile,NamingSession,YueReadingSelections} from '../src/shared/types';
import type {ElementAssessmentChoiceInput} from '../src/shared/element-assessment';
import initSqlJs from 'sql.js';

const tempRoot=realpathSync(tmpdir()),runRoot=realpathSync(mkdtempSync(join(tempRoot,'naming-combined-'))),wasm=process.env.NAMING_COMBINED_WASM_PATH??resolve('node_modules/sql.js/dist/sql-wasm.wasm');
const stores:Store[]=[];
const profile:BirthProfile={id:'combined-next-dual',customerName:'两项功能联合隔离',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',leapMonth:false,timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''};
async function open(label:string){const userDir=mkdtempSync(join(runRoot,label+'-')),store=await new Store(userDir,resolve('data'),wasm).init();stores.push(store);return{store,service:new StudioService(store,{read:()=>'',write:()=>{}},false)};}
const basePref=()=>normalizePreferences({length:1,requiredChars:'枫',numerology:false,zodiacRules:false});
const dualPref=()=>normalizePreferences({...basePref(),elementAssessment:true,yueReading:true,namePhonetics:{cmn:{version:'cmn-homophone-review/1.0.0',mode:'strict'},yue:{version:'yue-homophone-review/1.2.0',mode:'strict'}}});
let context:Awaited<ReturnType<typeof open>>,initial:NamingSession,off:NamingSession,confirmedElements:NamingSession,confirmedYue:NamingSession;
const current=()=>context.store.rows<NamingSession>('sessions').find(row=>row.id===initial.id)!;
const opinion=(session:NamingSession)=>session.candidates[0].elementAssessment!.rows[0];
function choices(session:NamingSession):ElementAssessmentChoiceInput[]{return[{position:1,decision:'confirmed',confirmedEvidenceIds:[opinion(session).assessment!.matchingSourceCandidates[0].evidenceId]}];}
function yueSelections(session:NamingSession):YueReadingSelections{const reading=session.candidates[0].yueReading!;const selected=(unit:typeof reading.surname)=>{const choice=unit.candidates[0];expect(choice).toBeDefined();return{tokens:[...choice.tokens],origin:'dictionary' as const,confirmed:true as const,dictionaryId:choice.id};};return{surname:selected(reading.surname),given:reading.given.map(selected)};}
beforeAll(async()=>{context=await open('dual');initial=(await context.service.generate(profile,dualPref())).session;off=(await context.service.generate({...profile,id:'combined-next-off'},basePref())).session;},20000);
afterAll(()=>{for(const store of stores)store.db.close();const actual=realpathSync(runRoot);if(dirname(actual)!==tempRoot||!basename(actual).startsWith('naming-combined-'))throw Error('Unsafe combined-test cleanup');rmSync(actual,{recursive:true,force:true});});

// Real Store feature writes took 7.02/7.56s in the full suite; keep the budget local.
describe('combined phonetic and element consumers on naming7',{timeout:15000},()=>{
 it('keeps both opt-in preferences, canonical snapshots and distinct sources while scores/facts match default-off generation',()=>{
  expect(initial.preferences.elementAssessment).toBe(true);expect(initial.preferences.namePhonetics).toEqual(dualPref().namePhonetics);expect(initial.namingRules!.version).toBe(CURRENT_NAMING_RULE_VERSION);expect(initial.namingRules!.sourceId).toBe(NAMING_RULE_SOURCE_ID);
  const c=initial.candidates[0];expect(c.namePhoneticReviews!.reviews.cmn!.status).toBe('assessed');expect(c.namePhoneticReviews!.reviews.yue!.status).toBe('not-assessed');expect(opinion(initial).assessment!.effectiveElements).toEqual([]);
  expect(c.characters).toEqual(off.candidates[0].characters);expect(c.evaluation).toEqual(off.candidates[0].evaluation);expect(c.namingMeaningReview).toEqual(off.candidates[0].namingMeaningReview);
  const ids=initial.sourceSnapshot!.sources.map(row=>row.id);for(const id of [ELEMENT_ASSESSMENT_SOURCE_ID,...NAME_PHONETIC_SOURCE_IDS])expect(ids.filter(value=>value===id)).toHaveLength(1);
 });
 it('keeps default-off generation and generic reviews free of both new fields and sources',()=>{
  expect(off.preferences).not.toHaveProperty('elementAssessment');expect(off.preferences).not.toHaveProperty('namePhonetics');expect(off).not.toHaveProperty('elementAssessmentPreferences');expect(off.candidates[0]).not.toHaveProperty('elementAssessment');expect(off.candidates[0]).not.toHaveProperty('namePhoneticReviews');
  for(const id of [ELEMENT_ASSESSMENT_SOURCE_ID,...NAME_PHONETIC_SOURCE_IDS])expect(off.sourceSnapshot!.sources.some(row=>row.id===id)).toBe(false);
  const saved=context.service.saveSession({...off,reviewNote:'关闭状态普通审阅'});expect(saved.candidates).toEqual(off.candidates);
 });
 it('element confirmation preserves phonetic/naming7 snapshots and makes stale Yue edits fail atomically',()=>{
  confirmedElements=context.service.updateElementAssessment(initial.id,initial.candidates[0].id,choices(initial),initial.reviewRevision,initial.reviewToken);
  expect(opinion(confirmedElements).assessment!.effectiveElements).toEqual(['木']);expect(confirmedElements.candidates[0].namePhoneticReviews).toEqual(initial.candidates[0].namePhoneticReviews);expect(confirmedElements.candidates[0].namingMeaningReview).toEqual(initial.candidates[0].namingMeaningReview);
  const disk=readFileSync(join(context.store.userDir,'customers.sqlite'));expect(()=>context.service.updateYueReading(initial.id,initial.candidates[0].id,yueSelections(initial),initial.reviewRevision,initial.reviewToken)).toThrow(/其他窗口更新/);expect(readFileSync(join(context.store.userDir,'customers.sqlite'))).toEqual(disk);
 });
 it('Yue confirmation preserves element opinion, ordinary Mandarin result, source registry and all scores',()=>{
  confirmedYue=context.service.updateYueReading(initial.id,initial.candidates[0].id,yueSelections(confirmedElements),confirmedElements.reviewRevision,confirmedElements.reviewToken);
  expect(confirmedYue.candidates[0].namePhoneticReviews!.reviews.yue!.status).toBe('assessed');expect(confirmedYue.candidates[0].namePhoneticReviews!.reviews.cmn).toEqual(initial.candidates[0].namePhoneticReviews!.reviews.cmn);expect(confirmedYue.candidates[0].elementAssessment).toEqual(confirmedElements.candidates[0].elementAssessment);expect(confirmedYue.sourceSnapshot).toEqual(initial.sourceSnapshot);expect(confirmedYue.candidates[0].evaluation).toEqual(initial.candidates[0].evaluation);expect(confirmedYue.candidates[0].characters).toEqual(initial.candidates[0].characters);
  const disk=readFileSync(join(context.store.userDir,'customers.sqlite'));expect(()=>context.service.updateElementAssessment(initial.id,initial.candidates[0].id,choices(confirmedElements),confirmedElements.reviewRevision,confirmedElements.reviewToken)).toThrow(/其他窗口更新/);expect(readFileSync(join(context.store.userDir,'customers.sqlite'))).toEqual(disk);
 });
 it('ordinary review and report keep both recorded features and their unchanged independent scopes',()=>{
  const reviewed=context.service.saveSession({...current(),reviewNote:'联合审阅',candidates:current().candidates.map(candidate=>({...candidate,reviewNote:'保留两套已记录结果'}))});expect(reviewed.candidates[0].elementAssessment).toEqual(confirmedYue.candidates[0].elementAssessment);expect(reviewed.candidates[0].namePhoneticReviews).toEqual(confirmedYue.candidates[0].namePhoneticReviews);
  const html=reportHTML(reviewed,context.store.settings());expect(html).toContain('本方案人工采用的意象标签');expect(html).toContain('普通话');expect(html).toContain('粤语');writeFileSync(join(runRoot,'combined-report.html'),html);
 });
 it('restores an earlier shared revision of both features without backfilling later confirmation',()=>{
  const saved=current(),history=context.service.listHistory(saved.id),first=history.find(row=>row.session.reviewRevision===0)!;expect(first).toBeDefined();expect(opinion(first.session).assessment!.effectiveElements).toEqual([]);expect(first.session.candidates[0].namePhoneticReviews!.reviews.yue!.status).toBe('not-assessed');
  const restored=context.service.restoreHistory(saved.id,first.id,saved.reviewRevision,saved.reviewToken);expect(opinion(restored).assessment!.effectiveElements).toEqual([]);expect(restored.candidates[0].namePhoneticReviews).toEqual(initial.candidates[0].namePhoneticReviews);expect(restored.candidates[0].namingMeaningReview).toEqual(initial.candidates[0].namingMeaningReview);
 });
 it('roundtrips both feature histories through a separate actual SQL Store and rejects tampered backup before replacing disk',async()=>{
  const bytes=context.store.backupBytes(),other=await open('restore');other.store.restore(bytes);const reread=other.store.rows<NamingSession>('sessions').find(row=>row.id===initial.id)!;expect(reread.candidates).toEqual(current().candidates);expect(other.store.listRevisions(initial.id).map(row=>row.session.candidates)).toEqual(context.store.listRevisions(initial.id).map(row=>row.session.candidates));
  const SQL=await initSqlJs({locateFile:()=>wasm}),db=new SQL.Database(bytes);try{const record=db.exec('SELECT json FROM sessions WHERE id=?',[initial.id])[0].values[0][0],bad=JSON.parse(String(record));delete bad.candidates[0].elementAssessment;db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(bad),initial.id]);const disk=readFileSync(join(other.store.userDir,'customers.sqlite'));expect(()=>other.store.restore(db.export())).toThrow();expect(readFileSync(join(other.store.userDir,'customers.sqlite'))).toEqual(disk);}finally{db.close();}
 },15000);
 it('each canonical boundary rejects SQL tampering while the other feature remains valid',()=>{
  const original=context.store.db.exec('SELECT json FROM sessions WHERE id=?',[initial.id])[0].values[0][0],disk=readFileSync(join(context.store.userDir,'customers.sqlite'));
  for(const mutate of [(s:NamingSession)=>{s.candidates[0].elementAssessment!.rows[0].assessment!.effectiveElements=['金'];},(s:NamingSession)=>{s.candidates[0].namePhoneticReviews!.engine.profileSha256='f'.repeat(64);}]){const bad=JSON.parse(String(original));mutate(bad);context.store.db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(bad),initial.id]);try{expect(()=>context.store.rows('sessions')).toThrow();expect(()=>context.store.backupBytes()).toThrow();expect(readFileSync(join(context.store.userDir,'customers.sqlite'))).toEqual(disk);}finally{context.store.db.run('UPDATE sessions SET json=? WHERE id=?',[original,initial.id]);}}
 // This multi-corruption Store/backup roundtrip took 16.71s in the full suite.
 },30000);
 it('rejects stripping phonetics from one revision while current combined history retains both features',()=>{
  const old=context.store.db.exec('SELECT id,json FROM revisions WHERE session_id=? ORDER BY id LIMIT 1',[initial.id])[0].values[0],changed=JSON.parse(String(old[1]));delete changed.preferences.namePhonetics;for(const c of changed.candidates)delete c.namePhoneticReviews;changed.sourceSnapshot.sources=changed.sourceSnapshot.sources.filter((source:{id:string})=>!(NAME_PHONETIC_SOURCE_IDS as readonly string[]).includes(source.id));context.store.db.run('UPDATE revisions SET json=? WHERE id=?',[JSON.stringify(changed),old[0]]);try{expect(()=>context.service.listHistory(initial.id)).toThrow(/词音/);}finally{context.store.db.run('UPDATE revisions SET json=? WHERE id=?',[old[1],old[0]]);}
 });
 it('reads and reviews actual delivered134 SQL without backfilling either new feature',async()=>{
  const legacy=await open('legacy'),bytes=readFileSync(resolve('tests/fixtures/naming-session-1.0.34.sqlite'));legacy.store.restore(bytes);const rows=legacy.store.rows<NamingSession>('sessions');expect(rows).toHaveLength(27);for(const session of rows){expect(session).not.toHaveProperty('elementAssessmentPreferences');for(const candidate of session.candidates){expect(candidate).not.toHaveProperty('elementAssessment');expect(candidate).not.toHaveProperty('namePhoneticReviews');}}
  const selected=rows[0],saved=legacy.service.saveSession({...selected,reviewNote:'仅保留旧方案'});expect(saved.candidates).toEqual(selected.candidates);expect(saved.sourceSnapshot).toEqual(selected.sourceSnapshot);expect(readFileSync(resolve('tests/fixtures/naming-session-1.0.34.sqlite'))).toEqual(bytes);
 // Full27-row published SQL restore/read/review took44.28s in the first combined run; this is an explicit large-fixture budget, not a performance claim.
 },90000);
});
