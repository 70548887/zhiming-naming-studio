import {afterEach,describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {chmodSync,cpSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {loadRenCapacitiesData,loadRenCapacitiesSources,REN_CAPACITIES_SOURCE_ID} from '../src/main/ren-capacities-data';
import goldens from './fixtures/ren-capacities-source-goldens.json';

const temporary:string[]=[];
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
function fixture(){const directory=mkdtempSync(join(tmpdir(),'ren-capacity-source-'));temporary.push(directory);const lock=JSON.parse(readFileSync('data/ren-capacities-source-lock.json','utf8'))as{sources:{files:string[]}[]};for(const file of ['data/ren-capacities-source-lock.json',...lock.sources[0].files]){const output=join(directory,file.slice(5));cpSync(resolve(file),output,{recursive:true});chmodSync(output,0o666);}return directory;}
afterEach(()=>{for(const directory of temporary.splice(0)){if(!resolve(directory).startsWith(resolve(tmpdir())+'\\ren-capacity-source-')&&!resolve(directory).startsWith(resolve(tmpdir())+'/ren-capacity-source-'))throw Error('Unsafe source fixture cleanup');rmSync(directory,{recursive:true,force:true});}});

describe('fixed-edition local Ren capacity source publication',()=>{
  it('validates the new lock, three complete author contexts and seven codepoint-bound clauses',()=>{
    const loaded=loadRenCapacitiesData(resolve('data'));
    expect(loaded.sources).toEqual(loadRenCapacitiesSources(resolve('data')));
    expect(loaded.rules).toMatchObject({version:'1.0.0',profileId:'ren-source-wood-capacities/1.0.0',methodVersion:'ditian-ren-commentary-2600158/1.3.0',sourceId:REN_CAPACITIES_SOURCE_ID});
    expect(loaded.rules.clauses).toHaveLength(7);
    const contexts=JSON.parse(readFileSync('data/raw/ren-capacities-excerpts.json','utf8')).contexts;
    expect(contexts).toHaveLength(3);
    expect(contexts.every((c:any)=>c.quote.startsWith('{{annotate|任氏曰：')&&c.quote.endsWith('}}')&&digest(c.quote)===c.sha256)).toBe(true);
    const adoption=loaded.rules.adoption;
    expect(adoption.premises.find(x=>x.id==='mao-month')?.kind).toBe('project-conservative-restriction');
    expect(adoption.premises.find(x=>x.id==='visible-wood-water-only')?.kind).toBe('project-conservative-restriction');
    expect(adoption.hiddenStemPolicy).toContain('retain-all-selected-hidden-stems');
  });
  it.each(['ren-capacities-source-lock.json','ren-capacities-rules.json','raw/ren-capacities-excerpts.json','raw/ren-capacities-NOTICE.md','raw/CC-BY-SA-4.0.txt'])('rejects source or license tampering: %s',file=>{
    const directory=fixture(),target=join(directory,file);writeFileSync(target,readFileSync(target,'utf8')+'\nchanged\n');expect(()=>loadRenCapacitiesData(directory)).toThrow('校验失败');
  });
  it('rejects a source interval changed under an unchanged original locator',()=>{
    const directory=fixture(),target=join(directory,'ren-capacities-rules.json'),rules=JSON.parse(readFileSync(target,'utf8'));rules.clauses[0].sourceSpan.start++;writeFileSync(target,JSON.stringify(rules));expect(()=>loadRenCapacitiesData(directory)).toThrow('校验失败');
  });
  it('retains the author-positive source, the exact target, and the full fire/water alternative',()=>{
    const {rules}=loadRenCapacitiesData(resolve('data'));
    expect(rules.clauses.find(c=>c.id==='wood-group-chen-vigour')?.quote).toBe('如地支亥卯未，日主是木，或再逢寅之禄、辰之余，旺之极矣，非金所能克也');
    expect(rules.clauses.find(c=>c.id==='chen-supports-wood-group')?.quote).toContain('能生助木神');
    const raw=JSON.parse(readFileSync('data/raw/ren-capacities-excerpts.json','utf8'));
    expect(raw.contexts[0].quote).toContain('或干支有火吐秀');
    expect(raw.contexts[1].quote).toContain('苟有火而见水，或无火而见金');
    expect(raw.contexts[2].quote).toContain('然亦要看其气势，不可一例而推');
    expect(raw.contexts[2].quote).toContain('倘年月时干不杂财官，又有劫印');
  });
  it.each(goldens.cases)('keeps independent original positive/negative/target boundary $id without invented dates',value=>{
    expect(value.pillars).toHaveLength(4);
    expect(value.chart.quote.replace(/\s/g,'')).toBe(value.pillars.join(''));
    for(const s of [value.chart,value.context,value.authorAssertion]){
      expect([...s.quote].length).toBe(s.end-s.start);expect(digest(s.quote)).toBe(s.sha256);expect(s.locator).toBe(`oldid=2600158;codepoint[${s.start},${s.end})`);
    }
    expect([...value.context.quote].slice(value.authorAssertion.start-value.context.start,value.authorAssertion.end-value.context.start).join('')).toBe(value.authorAssertion.quote);
    expect(value.doesNotProve.length).toBeGreaterThan(0);expect(value).not.toHaveProperty('gregorianDate');
  });
  it('anchors core source history and preserves the non-counting and different-target counterexamples',()=>{
    expect(goldens.source.fullWikitextSha256).toBe('1d1a3d61c1b9a26618b41b8ead857a6b966992fdf2adabdc607a0c6cb4c8f04d');
    expect(goldens.source.license).toBe('CC-BY-SA-4.0');
    const find=(id:string)=>goldens.cases.find(x=>x.id===id)!;
    expect(find('wood-overgrowth-does-not-prove-fire-support').authorAssertion.quote).toContain('木多火熄');
    expect(find('wood-source-no-clash-no-count').pillars).toContain('甲寅');
    expect(find('wood-source-no-clash-no-count').authorAssertion.quote).toContain('别无他气');
    expect(find('earth-fire-no-drain-has-hidden-metal').pillars).toContain('己巳');
    expect(find('earth-fire-no-drain-has-hidden-metal').authorAssertion.quote).toContain('全无克泄');
    expect(find('water-flood-chen-not-wu-root').authorAssertion.quote).toContain('戊土不能植根');
  });
  it('cross-anchors the complete original wood-combination paragraph to the earlier separately locked action publication',()=>{
    const current=JSON.parse(readFileSync('data/raw/ren-capacities-excerpts.json','utf8')).contexts[0];
    const original=JSON.parse(readFileSync('data/raw/ren-actions-excerpts.json','utf8')).contexts.find((c:any)=>c.id==='context-6');
    expect({start:current.start,end:current.end,quote:current.quote}).toEqual({start:original.start,end:original.end,quote:original.quote});
  });
  it('checks the actual selected hidden vocabulary that prevents raw-zero interpretations',()=>{
    const raw=readFileSync('data/raw/bazi-evidence-lunar-LunarUtil.ts','utf8');
    const block=raw.match(/static ZHI_HIDE_GAN:[\s\S]*?= \{([\s\S]*?)\n    \};/)![1];
    const hidden=(branch:string)=>{const row=[...block.matchAll(/'\{dz\.(\w+)\}': \[([^\]]+)\]/g)].find(m=>m[1]===branch);return[...row![2].matchAll(/\{tg\.(\w+)\}/g)].map(m=>m[1]);};
    expect(hidden('yin')).toContain('bing');expect(hidden('yin')).toContain('wu');
    expect(hidden('si')).toContain('geng');expect(hidden('chen')).toContain('yi');expect(hidden('chen')).toContain('gui');expect(hidden('xu')).toContain('xin');
    // The adopted wood-combination + Chen domain also retains hidden output/wealth.
    expect(hidden('wei')).toContain('ding');expect(hidden('wei')).toContain('ji');expect(hidden('chen')).toContain('wu');
  });
});
