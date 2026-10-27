import {afterEach,describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {basename,dirname,join,resolve} from 'node:path';
import {chmodSync,cpSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {Solar} from 'lunar-typescript';
import {loadRenDirectionsData,loadRenDirectionsSources,verifyRenDirectionsProvenance,REN_DIRECTIONS_SOURCE_ID,REN_DIRECTIONS_VERSION,REN_DIRECTIONS_PROFILE,REN_DIRECTIONS_METHOD,REN_DIRECTIONS_LOCK_SHA256} from '../src/main/ren-directions-data';
import {createSessionSourceSnapshot} from '../src/shared/session-sources';
import type {NamingSession} from '../src/shared/types';
import goldens from './fixtures/ren-directions-source-goldens.json';
import contracts from './fixtures/ren-directions-contract-goldens.json';
import calendar from './fixtures/ren-directions-calendar-goldens.json';
import oldGoldens from './fixtures/ren-capacities-source-goldens.json';

const digest=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex'),temporary:string[]=[];
function fixture(){const directory=mkdtempSync(join(tmpdir(),'ren-direction-source-'));temporary.push(directory);const lock=JSON.parse(readFileSync('data/ren-directions-source-lock.json','utf8'))as{sources:{files:string[]}[]};for(const file of ['data/ren-directions-source-lock.json',...lock.sources[0].files]){const target=join(directory,file.slice(5));cpSync(resolve(file),target,{recursive:true});chmodSync(target,0o666);}return directory;}
afterEach(()=>{for(const directory of temporary.splice(0)){const absolute=resolve(directory);if(dirname(absolute)!==resolve(tmpdir())||!basename(absolute).startsWith('ren-direction-source-'))throw new Error('Unsafe source-test cleanup target');rmSync(absolute,{recursive:true,force:true});}});

describe('separate fixed-edition Ren direction source publication',()=>{
  it('locks thirteen source clauses and five complete Ren contexts, with a separately pinned aggregate',()=>{
    const loaded=loadRenDirectionsData(resolve('data'));
    expect(loaded.sources).toEqual(loadRenDirectionsSources(resolve('data')));
    expect(loaded.rules).toMatchObject({version:'1.0.0',profileId:REN_DIRECTIONS_PROFILE,methodVersion:REN_DIRECTIONS_METHOD,sourceId:REN_DIRECTIONS_SOURCE_ID});
    expect(loaded.rules.clauses).toHaveLength(13);
    expect(digest(readFileSync('data/ren-directions-source-lock.json'))).toBe(REN_DIRECTIONS_LOCK_SHA256);
    expect(loaded.sources[0].sha256).toBe('cdecd76b4d34b4ab9d9c6535631793d126a0440e924da645b81c5f0847de18b7');
    const contexts=JSON.parse(readFileSync('data/raw/ren-directions-excerpts.json','utf8')).contexts;
    expect(contexts).toHaveLength(5);expect(new Set(contexts.map((row:any)=>row.id)).size).toBe(5);
    expect(contexts.every((row:any)=>row.quote.startsWith('{{annotate|任氏曰：')&&row.quote.endsWith('}}')&&digest(row.quote)===row.sha256)).toBe(true);
    expect(contexts.find((row:any)=>row.id==='three-members-strength-and-month-boundary').heading).toBe('通神论 九、干支总论');
  });
  it.each(['ren-directions-source-lock.json','ren-directions-rules.json','raw/ren-directions-excerpts.json','raw/ren-directions-NOTICE.md','raw/CC-BY-SA-4.0.txt'])('rejects altered rule, original context, attribution or license bytes: %s',file=>{
    const directory=fixture(),target=join(directory,file);writeFileSync(target,readFileSync(target,'utf8')+'\nchanged\n');expect(()=>loadRenDirectionsData(directory)).toThrow('校验失败');
  });
  it('rejects a changed quote interval even when its original locator is retained',()=>{
    const directory=fixture(),target=join(directory,'ren-directions-rules.json'),table=JSON.parse(readFileSync(target,'utf8'));table.clauses[0].sourceSpan.start++;writeFileSync(target,JSON.stringify(table));expect(()=>loadRenDirectionsData(directory)).toThrow('校验失败');
  });
  it('uses only full direction and same-element day as source gates, with no arbitrary calendar/stem/fourth-pillar gate',()=>{
    const {rules}=loadRenDirectionsData(resolve('data'));
    for(const contract of rules.adoption.contracts){
      expect(contract.premises.filter(row=>row.requiredForProof).map(row=>row.id)).toEqual(['complete-direction','same-element-day-stem']);
      expect(contract.premises.find(row=>row.id==='input-completeness')).toMatchObject({kind:'input-fact',requiredForProof:false});
      for(const key of ['monthBranches','branchMultisets','visibleStems','allFourPillarsKnown'])expect(contract).not.toHaveProperty(key);
    }
    expect(rules.adoption.inputCompletenessPolicy).toContain('metadata-only');
    expect(rules.adoption.hiddenStemPolicy).toContain('retain-all-selected-hidden-stems');
    expect(rules.adoption.potentialOppositionPolicy).toContain('No adopted general rule says any opposition automatically destroys a direction');
  });
  it('keeps the original explicit sufficient phrase and complete formation/seasonal qualification text separate',()=>{
    const {rules}=loadRenDirectionsData(resolve('data')),find=(id:string)=>rules.clauses.find(row=>row.id===id)!;
    expect(find('direction-sufficient-strength').quote).toBe('成方透元神，旺可知矣');
    expect(find('wood-and-fire-explicit').quote).toBe('如木方日主是木，火方日主是火，即为元神透出也。');
    expect(find('chen-metal-scope').quote).toContain('庚辛之助');
    expect(find('opposition-not-automatic-damage').quote).toBe('得令者冲衰则拔，失时者冲旺无伤。');
    expect(find('opposition-requires-strength-and-rescue').quote).toContain('必先察其衰旺');
    expect(find('follow-strong-additional-conditions').quote).toContain('又有劫印');
    expect(rules.adoption.contracts.every(row=>row.nonConclusions.some(text=>text.includes('不由本条推从强')))).toBe(true);
  });
  it('preserves all ten earlier research statements as exact subspans rather than replacing them with software assertions',()=>{
    const {rules}=loadRenDirectionsData(resolve('data'));
    expect(goldens.reusedResearchStatements).toHaveLength(10);
    for(const original of goldens.reusedResearchStatements){const clause=rules.clauses.find(row=>row.id===original.id)!;expect(clause.quote).toBe(original.quote);expect(clause.sourceSpan.start).toBe(original.start);expect(clause.sourceSpan.end).toBe(original.end);expect(digest(clause.quote)).toBe(original.sha256);}
  });
  it.each(goldens.cases)('retains independent author case $id with exact chart/context/action spans and no invented birth date',value=>{
    expect(value.chart.quote.replace(/\s/g,'')).toBe(value.pillars.join(''));expect(value.pillars).toHaveLength(4);
    for(const segment of [value.chart,value.context,value.authorAssertion]){expect([...segment.quote].length).toBe(segment.end-segment.start);expect(digest(segment.quote)).toBe(segment.sha256);expect(segment.locator).toBe(`oldid=2600158;codepoint[${segment.start},${segment.end})`);}
    const assertion=value.authorAssertion;expect([...value.context.quote].slice(assertion.start-value.context.start,assertion.end-value.context.start).join('')).toBe(assertion.quote);
    expect(value.doesNotProve.length).toBeGreaterThan(0);expect(value).not.toHaveProperty('gregorianDate');
  });
  it('anchors the four new author contexts to fixed independently captured hashes, retaining fire, wealth and metal positive boundaries',()=>{
    const expected:Record<string,string>={'wood-direction-fire-expression':'6e32ed07683e210b49ddf72d1b6c8eee7a16628bfbfd8f5a764dbbe5a44f565a','wood-direction-wealth-month':'7d5655a47a878330a597750d8d7c21e03379539bf653707ef05e88acc7add58e','wood-direction-metal-not-necessary-absence':'caeea004e0ca6c85bc3a75b42c59b9d2e57140dd24e691e7a788c8e81e28ce62','fire-direction-season-wealth-boundary':'3cecdbfa00c9af7bb4d65658b4042a378c9316eff644b5d37a0b165ce7e14af0'};
    for(const[id,hash]of Object.entries(expected))expect(goldens.cases.find(row=>row.id===id)?.context.sha256).toBe(hash);
    expect(goldens.cases.find(row=>row.id==='wood-direction-wealth-month')?.authorAssertion.quote).toContain('身旺用财');
    expect(goldens.cases.find(row=>row.id==='fire-direction-season-wealth-boundary')?.authorAssertion.quote).toContain('旺之极矣');
  });
  it('cross-anchors the four reused counterexamples to the unchanged separately published1.3 fixture',()=>{
    const oldIds=['fire-output-different-treatment','water-harms-specific-fire-not-all-wood','chen-month-metal-can-control-wood','wood-overgrowth-does-not-prove-fire-support'];
    for(const id of oldIds){const old=oldGoldens.cases.find(row=>row.id===id)!,current=goldens.cases.find(row=>row.id===id)!;expect(current.pillars).toEqual(old.pillars);for(const key of ['quote','start','end','sha256']){expect(current.context[key as keyof typeof current.context]).toEqual(old.context[key as keyof typeof old.context]);expect(current.authorAssertion[key as keyof typeof current.authorAssertion]).toEqual(old.authorAssertion[key as keyof typeof old.authorAssertion]);}}
  });
  it('keeps eleven independently hand-entered original contract inputs, updating scope rather than preserving discarded white-list barriers',()=>{
    expect(contracts.cases).toHaveLength(11);expect(contracts.additionalCases).toHaveLength(2);
    for(const id of ['wood-exposed-metal-retained','wood-clash-not-automatic-damage','wood-hour-unknown-but-all-source-premises-known'])expect(contracts.cases.find(row=>row.id===id)?.expected).toMatchObject({path:'met',capability:'met',netEffect:'unknown',formation:'not-evaluated'});
    expect(contracts.additionalCases.find(row=>row.id==='fire-hour-unknown-all-three-known')?.expected.capability).toBe('met');
    expect(contracts.cases.every(row=>row.expectationOrigin.includes('never generated by product evaluator'))).toBe(true);
  });
  it.each(calendar.cases)('keeps real-calendar domain nonempty without fake Gregorian dates: $civilDate',value=>{
    const [date,time]=value.civilDate.split(' '),[year,month,day]=date.split('-').map(Number),[hour,minute,second]=time.split(':').map(Number),round=new Date(Date.UTC(year,month-1,day));
    expect([round.getUTCFullYear(),round.getUTCMonth()+1,round.getUTCDate()]).toEqual([year,month,day]);
    const chart=Solar.fromYmdHms(year,month,day,hour,minute,second).getLunar().getEightChar();expect([chart.getYear(),chart.getMonth(),chart.getDay(),chart.getTime()]).toEqual(value.pillars);
  });
  it('has independent known-three-pillar evidence for a missing-hour positive example, without claiming an hour',()=>{
    const item=calendar.unknownHourPositive;expect(item.timeUnknown).toBe(true);expect(item.knownPillars).toEqual(['癸卯','甲寅','甲辰']);expect(item.dayStem).toBe('甲');expect(item.expectedLocalWoodCapacity).toBe('met');
    expect(contracts.cases.find(row=>row.id==='wood-hour-unknown-but-all-source-premises-known')?.pillars).toEqual(['癸卯','甲寅','甲辰',null]);
  });
});

describe('direction-only source provenance identity (not complete session validation)',()=>{
  function sample(){const sources=loadRenDirectionsSources(resolve('data'));return{sources,session:{dataVersion:'source-only-test',profile:{renMethod:REN_DIRECTIONS_METHOD},analysis:{renCommentary:{version:REN_DIRECTIONS_METHOD,profileId:REN_DIRECTIONS_METHOD,directionAnalysis:{version:REN_DIRECTIONS_VERSION,profileId:REN_DIRECTIONS_PROFILE,sourceId:REN_DIRECTIONS_SOURCE_ID}}},sourceSnapshot:createSessionSourceSnapshot('source-only-test',sources)}as unknown as NamingSession};}
  it('accepts the selected source identity and requires its exact full saved source record',()=>{
    const {session,sources}=sample();expect(()=>verifyRenDirectionsProvenance(session,sources)).not.toThrow();
    session.sourceSnapshot!.sources[0].note+='changed';expect(()=>verifyRenDirectionsProvenance(session,sources)).toThrow('来源与固定原文不一致');
  });
  it('rejects missing result, duplicate source, wrong profile or saved source version',()=>{
    const changes=[(value:any)=>delete value.analysis.renCommentary.directionAnalysis,(value:any)=>value.sourceSnapshot.sources.push({...value.sourceSnapshot.sources[0]}),(value:any)=>value.analysis.renCommentary.directionAnalysis.profileId='old',(value:any)=>value.analysis.renCommentary.version='ditian-ren-commentary-2600158/1.3.0'];
    for(const edit of changes){const {session,sources}=sample();edit(session);expect(()=>verifyRenDirectionsProvenance(session,sources)).toThrow();}
  });
  it('rejects a new direction source or even an explicit undefined direction field attached to an old or disabled method',()=>{
    const {session,sources}=sample();(session.profile as any).renMethod='none';expect(()=>verifyRenDirectionsProvenance(session,sources)).toThrow('不得附着');
    const old={profile:{renMethod:'ditian-ren-commentary-2600158/1.3.0'},analysis:{renCommentary:{directionAnalysis:undefined}}}as unknown as NamingSession;
    expect(()=>verifyRenDirectionsProvenance(old,sources)).toThrow('不得附着');
    delete (old.analysis.renCommentary as any).directionAnalysis;expect(()=>verifyRenDirectionsProvenance(old,sources)).not.toThrow();
  });
});
