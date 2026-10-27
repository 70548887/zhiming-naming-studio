import {afterEach,beforeAll,describe,expect,it,vi} from 'vitest';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {createHash} from 'node:crypto';
import initSqlJs from 'sql.js';
vi.mock('../src/main/ai',()=>({generateAIForRuleVersion:vi.fn(),testAI:vi.fn()}));
import {generateAIForRuleVersion} from '../src/main/ai';
import {StudioService} from '../src/main/service';
import {Store,validSession} from '../src/main/store';
import {evaluateNameWithResolvedBasisForRuleVersion,resolveNamingBasisForRuleVersion,resolveNamingGenerationContext} from '../src/domain/naming';
import {normalizePreferences,namingInputKey,isSessionCurrent} from '../src/shared/workflow';
import {NAME_IMAGERY_SOURCE_IDS,loadNameImagerySources} from '../src/main/name-imagery-data';
import {sessionReferencedSourceIds} from '../src/shared/session-sources';
import type {BirthProfile,NamingSession} from '../src/shared/types';
const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm'),stores:Store[]=[],dirs:string[]=[];
const profile:BirthProfile={id:'imagery-integration',customerName:'文化意象隔离验收',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:'09:30:00',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''};
const pref=normalizePreferences({requiredChars:'安宁',zodiacRules:false,imageryReading:true});let SQL:Awaited<ReturnType<typeof initSqlJs>>;
beforeAll(async()=>{SQL=await initSqlJs({locateFile:()=>wasm});});
async function open(dir?:string){const user=dir??mkdtempSync(join(tmpdir(),'imagery-store-'));if(!dir)dirs.push(user);const store=await new Store(user,resolve('data'),wasm).init();stores.push(store);return {dir:user,store,service:new StudioService(store,{read:()=>'',write:()=>{}},false)};}
async function setup(){const opened=await open();return {...opened,session:(await opened.service.generate(profile,pref)).session};}
const disk=(store:Store)=>readFileSync(join(store.userDir,'customers.sqlite'));
const current=(store:Store,id:string)=>store.rows<NamingSession>('sessions').find(session=>session.id===id)!;
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function altered(bytes:Uint8Array,session:NamingSession,edit:(session:NamingSession)=>void,table='sessions'){const db=new SQL.Database(bytes),value=structuredClone(session);try{edit(value);db.run(`UPDATE ${table} SET json=?`,[JSON.stringify(value)]);return db.export();}finally{db.close();}}
afterEach(()=>{vi.mocked(generateAIForRuleVersion).mockReset();for(const store of stores.splice(0))store.db.close();for(const dir of dirs.splice(0))rmSync(dir,{recursive:true,force:true});});

describe('saved cultural-imagery experiments bind final candidates to the actual unchanged birth chart',{ timeout: 15_000 }, ()=>{
  it('generates local results only when selected, with a trusted complete chart hash and exact two new source records',async()=>{
    const {service,session}=await setup();expect(validSession(session)).toBe(true);expect(session.preferences.imageryReading).toBe(true);
    for(const candidate of session.candidates){expect(candidate.imageReading!.chart.sha256).toBe(hash(session.analysis.qimen));expect(candidate.imageReading!.givenName).toBe(candidate.givenName);expect(candidate.imageReading!.characterRows.map(row=>row.char)).toEqual([...candidate.givenName]);expect(candidate.imageReading!.unionPalaces).toEqual([2,8]);expect(candidate.imageReading!.goodBadScore).toBeNull();}
    expect(session.sourceSnapshot!.sources.filter(source=>NAME_IMAGERY_SOURCE_IDS.includes(source.id as never))).toEqual(loadNameImagerySources(resolve('data')));
    expect(sessionReferencedSourceIds(session)).toEqual(expect.arrayContaining([...NAME_IMAGERY_SOURCE_IDS,'editorial-rules','qimen-arc-structural-patterns']));
    const plain=(await service.generate({...profile,id:'imagery-none'},normalizePreferences({...pref,imageryReading:undefined}))).session;expect(plain.preferences.imageryReading).toBe(false);expect(plain.candidates.every(candidate=>candidate.imageReading===undefined)).toBe(true);expect(plain.sourceSnapshot!.sources.every(source=>!NAME_IMAGERY_SOURCE_IDS.includes(source.id as never))).toBe(true);expect(plain.analysis).toEqual(session.analysis);
  });
  it('attaches readings after AI/local merging and after optional numerology without altering original candidate scores',async()=>{
    const {service}=await open();const plain=(await service.generate(profile,normalizePreferences({...pref,imageryReading:false}))).session;
    const d=service.store.dataset,context=resolveNamingGenerationContext({packSha256:createHash('sha256').update(service.store.currentPackBytes()).digest('hex'),activeVersion:d.version}),generationPreferences=normalizePreferences({...pref,numerology:true});
    const basis=resolveNamingBasisForRuleVersion(context.version,context.context,generationPreferences,plain.analysis),candidate=evaluateNameWithResolvedBasisForRuleVersion(context.version,context.context,basis,plain.candidates[0].givenName,profile,generationPreferences,plain.analysis,d.characters,plain.candidates[0].citations,'ai');
    expect(candidate).toBeDefined();if(!candidate)throw new Error('Same real AI evaluator must accept the already generated local name');expect(candidate).not.toHaveProperty('namingMeaningReview');expect(candidate.evaluation).toEqual(plain.candidates[0].evaluation);
    vi.mocked(generateAIForRuleVersion).mockResolvedValue({candidates:[candidate],warning:''});const settings=service.bootstrap().settings,aiService=new StudioService(service.store,{read:()=> 'isolated-stub-key',write:()=>{}},false);aiService.saveAiSettings({...settings,model:'isolated-ai-stub',useAi:true});
    const result=(await aiService.generate({...profile,id:'imagery-ai'},generationPreferences)).session;expect(generateAIForRuleVersion).toHaveBeenCalledOnce();expect(result.candidates[0].origin).toBe('ai');expect(result.candidates.every(candidate=>candidate.imageReading!==undefined&&candidate.numerology!==undefined)).toBe(true);expect(result.candidates[0].evaluation).toEqual(candidate.evaluation);expect(result.candidates[0].meaning).toBe(plain.candidates[0].meaning);
  });
  it('retains static sets for unknown time, and preserves undecided labels rather than guessing them',async()=>{
    const {service}=await open();const unknown=(await service.generate({...profile,id:'imagery-unknown',timeUnknown:true,birthTime:''},pref)).session;
    for(const candidate of unknown.candidates){expect(candidate.imageReading!.status).toBe('chart-unavailable');expect(candidate.imageReading!.unionPalaces).toEqual([2,8]);expect(candidate.imageReading!.palaceReadings).toEqual([]);expect(candidate.imageReading!.chart.sha256).toBe(hash(unknown.analysis.qimen));}
    const unresolved=(await service.generate({...profile,id:'imagery-undefined'},normalizePreferences({...pref,requiredChars:'知微'}))).session;expect(unresolved.candidates.every(candidate=>candidate.imageReading!.status==='partial'&&candidate.imageReading!.unionPalaces.length===0)).toBe(true);
  });
  it('keeps immutable readings through review, history restore, numerology updates and separate-store backup import',async()=>{
    const {store,service,session}=await setup(),original=structuredClone(session.candidates.map(candidate=>candidate.imageReading));
    const draft=structuredClone(session);draft.reviewNote='只改可编辑审阅';draft.candidates[0].meaning='人工祝愿';draft.candidates[0].imageReading!.unionPalaces=[1];draft.preferences.imageryReading=false;
    const saved=service.saveSession(draft);expect(saved.preferences.imageryReading).toBe(true);expect(saved.candidates.map(candidate=>candidate.imageReading)).toEqual(original);const revision=service.listHistory(saved.id)[0];expect(revision.session.candidates.map(candidate=>candidate.imageReading)).toEqual(original);
    const restored=service.restoreHistory(saved.id,revision.id,saved.reviewRevision,saved.reviewToken);expect(restored.candidates.map(candidate=>candidate.imageReading)).toEqual(original);
    const target=await open();target.store.restore(store.backupBytes());expect(current(target.store,saved.id).candidates.map(candidate=>candidate.imageReading)).toEqual(original);expect(current(target.store,saved.id).sourceSnapshot).toEqual(session.sourceSnapshot);
    const numerical=(await service.generate({...profile,id:'imagery-with-num'},normalizePreferences({...pref,numerology:true}))).session,candidate=numerical.candidates[0],before=structuredClone(candidate.imageReading),choices=Object.fromEntries(candidate.numerology!.strokes.map(choice=>[String(choice.position),choice.options[0].id]));
    const updated=service.updateNumerology(numerical.id,candidate.id,choices,numerical.reviewRevision,numerical.reviewToken);expect(updated.candidates.find(item=>item.id===candidate.id)!.imageReading).toEqual(before);
  });
  it('normalizes absent and false selection equally and treats a selection change as a new naming input',()=>{
    const absent={...pref,imageryReading:undefined},off={...pref,imageryReading:false};expect(normalizePreferences(absent)).toEqual(normalizePreferences(off));expect(namingInputKey(profile,absent)).toBe(namingInputKey(profile,off));expect(namingInputKey(profile,pref)).not.toBe(namingInputKey(profile,off));expect(isSessionCurrent(profile,off,{profileId:profile.id,profile,preferences:pref} as NamingSession)).toBe(false);
  });
  it('rejects nonboolean selection at the API without saving a profile',async()=>{
    const {store,service}=await open();for(const value of ['yes',null,1])expect(()=>service.validatePreferences({...pref,imageryReading:value as never})).toThrow('实验选项');expect(store.rows('profiles')).toEqual([]);
  });
});

describe('imagery save, restore and read boundaries reject source, chart and character grafts',{ timeout: 15_000 }, ()=>{
  const changes:{name:string;edit:(session:NamingSession)=>void}[]=[
    {name:'result omitted',edit:s=>{delete s.candidates[0].imageReading;}},
    {name:'unresolved state promoted',edit:s=>{s.candidates[0].imageReading!.status='partial';}},
    {name:'palace set forged',edit:s=>{s.candidates[0].imageReading!.unionPalaces=[5];}},
    {name:'chart hash forged',edit:s=>{s.candidates[0].imageReading!.chart.sha256='f'.repeat(64);}},
    {name:'chart unmapped palace changed',edit:s=>{s.analysis.qimen.palaces.find(p=>p.number===1)!.earth='伪造';}},
    {name:'character label changed',edit:s=>{s.candidates[0].characters[0].elements=['水'];}},
    {name:'recorded character reading changed',edit:s=>{s.candidates[0].imageReading!.characterRows[0].pinyin='wrong';}},
    {name:'fixed source omitted',edit:s=>{s.sourceSnapshot!.sources=s.sourceSnapshot!.sources.filter(source=>source.id!==NAME_IMAGERY_SOURCE_IDS[0]);}},
    {name:'fixed source metadata changed',edit:s=>{s.sourceSnapshot!.sources.find(source=>source.id===NAME_IMAGERY_SOURCE_IDS[1])!.commit='forged';}},
    {name:'preference disabled with result',edit:s=>{s.preferences.imageryReading=false;}},
    {name:'preference and result removed with sources',edit:s=>{delete s.preferences.imageryReading;for(const candidate of s.candidates)delete candidate.imageReading;}}
  ];
  it.each(changes)('refuses $name in a backup without changing live database bytes',async change=>{
    const {store,session}=await setup(),before=disk(store),good=store.backupBytes();expect(()=>store.restore(altered(good,session,change.edit))).toThrow();expect(disk(store).equals(before)).toBe(true);expect(current(store,session.id)).toEqual(session);
  });
  it('rejects mutated result on direct Store save and validates historical rows before a backup can be produced',async()=>{
    const {store,service,session}=await setup(),before=disk(store);const changed=structuredClone(session);changed.candidates[0].imageReading!.sourceIds=[];expect(()=>store.saveSession(changed)).toThrow();expect(disk(store).equals(before)).toBe(true);
    service.saveSession({...session,reviewNote:'创建真实历史'});const revision=service.listHistory(session.id)[0],corrupted=structuredClone(revision.session);corrupted.candidates[0].imageReading!.chart.sha256='0'.repeat(64);store.db.run('UPDATE revisions SET json=? WHERE id=?',[JSON.stringify(corrupted),Number(revision.id)]);expect(()=>service.listHistory(session.id)).toThrow('文化意象');expect(()=>store.backupBytes()).toThrow('备份已取消');
  });
  it('refuses an inactive default row with grafted experiment sources at the actual reload boundary',async()=>{
    const {store,service,dir}=await open(),plain=(await service.generate(profile,normalizePreferences({...pref,imageryReading:false}))).session;store.db.close();stores.splice(stores.indexOf(store),1);
    const file=join(dir,'customers.sqlite'),db=new SQL.Database(readFileSync(file));plain.sourceSnapshot!.sources.push(...loadNameImagerySources(resolve('data')));db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(plain),plain.id]);writeFileSync(file,db.export());db.close();const before=readFileSync(file),reopened=await open(dir);expect(()=>reopened.service.bootstrap()).toThrow('文化意象');expect(readFileSync(file).equals(before)).toBe(true);
  });
  it('keeps truly old absent preferences/results/sources absent through review and backup restoration',async()=>{
    const {store,service}=await open(),plain=(await service.generate(profile,normalizePreferences({...pref,imageryReading:false}))).session;delete plain.preferences.imageryReading;if(plain.profile.namingPreferences)delete plain.profile.namingPreferences.imageryReading;
    const saved=store.saveSession(plain),original=JSON.stringify(saved.analysis);const reviewed=service.saveSession({...saved,reviewNote:'旧方案不回填实验'});expect(reviewed.preferences.imageryReading).toBeUndefined();expect(reviewed.candidates.every(candidate=>candidate.imageReading===undefined)).toBe(true);store.restore(store.backupBytes());const restored=current(store,plain.id);expect(restored.preferences.imageryReading).toBeUndefined();expect(JSON.stringify(restored.analysis)).toBe(original);expect(restored.sourceSnapshot!.sources.every(source=>!NAME_IMAGERY_SOURCE_IDS.includes(source.id as never))).toBe(true);
  });
});
