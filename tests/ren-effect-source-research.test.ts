import {describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import sourceCases from './fixtures/ren-effect-source-counterexamples.json';

// Research goldens deliberately do not call a product strength, pattern or action evaluator.
// Their manual author expectations can reject a future candidate shortcut independently.
const sha=(value:string)=>createHash('sha256').update(value).digest('hex');
const raw=JSON.parse(readFileSync('data/raw/ditian-ren-excerpts.json','utf8'));
const actions=JSON.parse(readFileSync('data/raw/ren-actions-excerpts.json','utf8'));
const positions=['year','month','day','hour'];
const stems:Record<string,string>={jia:'甲',yi:'乙',bing:'丙',ding:'丁',wu:'戊',ji:'己',geng:'庚',xin:'辛',ren:'壬',gui:'癸'};
const branches:Record<string,string>={zi:'子',chou:'丑',yin:'寅',mao:'卯',chen:'辰',si:'巳',wu:'午',wei:'未',shen:'申',you:'酉',xu:'戌',hai:'亥'};
const element:Record<string,string>={甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
const selectedRaw=readFileSync('data/raw/bazi-evidence-lunar-LunarUtil.ts','utf8');
const hiddenBlock=selectedRaw.match(/static ZHI_HIDE_GAN:[\s\S]*?= \{([\s\S]*?)\n    \};/)![1];
const hidden:Record<string,string[]>={};
for(const match of hiddenBlock.matchAll(/'\{dz\.(\w+)\}': \[([^\]]+)\]/g))hidden[branches[match[1]]]=[...match[2].matchAll(/\{tg\.(\w+)\}/g)].map(value=>stems[value[1]]);
const find=(id:string)=>sourceCases.cases.find(value=>value.id===id)!;
function facts(pillars:string[]){return{exposed:pillars.map((value,index)=>positions[index]+':'+value[0]),hidden:pillars.flatMap((value,index)=>hidden[value[1]].map(stem=>positions[index]+':'+value[1]+':'+stem))};}

describe('independent fixed-edition Ren effect counterexamples',()=>{
  it('retains the exact edition, research-only scope and share-alike attribution',()=>{
    expect(sourceCases.source.fullWikitextSha256).toBe('1d1a3d61c1b9a26618b41b8ead857a6b966992fdf2adabdc607a0c6cb4c8f04d');
    expect(sourceCases.source.fullWikitextSha256).toBe(raw.source.fullWikitextSha256);
    expect(sourceCases.source.fullWikitextCodepoints).toBe(143701);
    expect(sourceCases.source.revision).toBe(2600158);
    expect(sourceCases.source.license).toBe('CC-BY-SA-4.0');
    expect(readFileSync(sourceCases.source.licenseText,'utf8')).toContain('Attribution-ShareAlike 4.0 International');
    expect(sourceCases.source.contributors).toContain('action=history');
    expect(new URL(sourceCases.source.contributors).searchParams.get('title')).toBe('滴天髓闡微');
    expect(new URL(sourceCases.source.url).searchParams.get('title')).toBe('滴天髓闡微');
    expect(sourceCases.purpose).toContain('不作为产品自动判格规则');
    expect(new Set(sourceCases.cases.map(value=>value.id)).size).toBe(7);
  });

  it.each(sourceCases.cases)('$id keeps the chart, exact source interval and author assertion inside its complete selected paragraph',value=>{
    expect(value.chart.quote.replace(/\s/g,'')).toBe(value.pillars.join(''));
    expect(value.pillars).toHaveLength(4);
    expect(value.chart.end).toBeLessThan(value.context.start);
    expect(value.context.start-value.chart.end).toBeLessThan(600);
    for(const span of [value.chart,value.context,value.authorAssertion]){
      expect([...span.quote]).toHaveLength(span.end-span.start);
      expect(span.sha256).toBe(sha(span.quote));
      expect(span.locator).toBe(`oldid=2600158;codepoint[${span.start},${span.end})`);
      expect(span.interval).toBe('[start,end)');
    }
    expect([...value.context.quote].slice(value.authorAssertion.start-value.context.start,value.authorAssertion.end-value.context.start).join('')).toBe(value.authorAssertion.quote);
    expect(value.layer).toBe('ren-case-commentary');
    expect(value.interpretation.authority).toBe('project-research-inference-not-author-algorithm');
    expect(value.manualExpected.doesNotProve.length).toBeGreaterThan(0);
    expect(value).not.toHaveProperty('gregorianDate');
  });

  it('cross-anchors the existing three source charts and complete paragraphs against the versioned raw archive',()=>{
    const anchored=sourceCases.cases.filter(value=>'existingArchive' in value);
    expect(anchored).toHaveLength(3);
    for(const value of anchored){
      const reference=value.existingArchive!;
      const archived=raw[reference.collection].find((item:any)=>item.id===reference.id);
      expect(archived.pillars).toEqual(value.pillars);
      expect(archived[reference.field].quote).toBe(value.context.quote);
      expect(archived[reference.field].locator??archived[reference.field].sourceLocator).toBe(value.context.locator);
      expect(archived.chart.quote).toBe(value.chart.quote);
      expect(archived.chart.locator??archived.chart.sourceLocator).toBe(value.chart.locator);
    }
  });

  it('cross-anchors the whole reversal paragraph, including its strength and rescue qualifications',()=>{
    const context=sourceCases.reversalClauseContext,archived=actions.contexts.find((value:any)=>value.id==='context-5');
    expect(context.quote).toBe(archived.quote);
    expect(context.start).toBe(archived.start);
    expect(context.end).toBe(archived.end);
    expect(context.sha256).toBe(sha(context.quote));
    expect(context.quote).toContain('如午旺提纲，四柱无金而有木，则午能冲子');
    expect(context.quote).toContain('必先察其衰旺，四柱有无解救');
  });

  it('exposes real counterexamples to month equality plus a fire/wood member as sufficient net clash power',()=>{
    const yin=find('yin-month-fire-does-not-prove-reversal'),si=find('si-month-wood-does-not-prove-reversal');
    expect(yin.pillars[1][1]).toBe('寅');
    expect(facts(yin.pillars).exposed).toContain('day:丙');
    expect(facts(yin.pillars).hidden).toContain('month:寅:丙');
    expect(yin.authorAssertion.quote).toContain('运根拔尽');
    expect(si.pillars[1][1]).toBe('巳');
    expect(facts(si.pillars).exposed).toContain('year:乙');
    expect(facts(si.pillars).hidden).toContain('year:亥:甲');
    expect(si.authorAssertion.quote).toContain('破禄去火');
    expect(yin.manualExpected.role).toBe('negative');
    expect(si.manualExpected.role).toBe('negative');
  });

  it.each(sourceCases.cases)('$id checks every declared literal fact, including every exposed or hidden witness in its declared element scope',value=>{
    const actual=facts(value.pillars),declared=value.facts as Record<string,unknown>;
    const scopeElements:Record<string,string>={exposedFire:'火',exposedWood:'木',exposedEarth:'土',hiddenFire:'火',hiddenWood:'木',hiddenMetal:'金',hiddenWater:'水',hiddenEarth:'土'};
    for(const [key,expected] of Object.entries(declared)){
      if(key in scopeElements){
        const observed=(key.startsWith('hidden')?actual.hidden:actual.exposed).filter(item=>element[item.at(-1)!]===scopeElements[key]);
        expect(observed).toEqual(expected);
      }else if(key==='monthBranch')expect(value.pillars[1][1]).toBe(expected);
      else if(key==='opposingClashBranch'||key==='sameElementRootBranch')expect(value.pillars.map(pillar=>pillar[1])).toContain(expected);
      else if(key==='allSelectedWoodAbsent')expect([...actual.exposed,...actual.hidden].every(item=>element[item.at(-1)!]!=='木')).toBe(expected);
      else if(key==='authorDaysAfterSolarTerm')expect(value.authorAssertion.quote).toContain('立夏后十天');
      else if(key==='authorCommandStem')expect(value.authorAssertion.quote).toContain(String(expected)+'土司令');
      else throw new Error('Unverified research fact '+key);
    }
  });

  it('separates original no-metal/no-water/no-earth effect wording from literal selected hidden-stem presence',()=>{
    expect(Object.keys(hidden)).toHaveLength(12);
    const cai=find('cai-root-absence-is-not-all-hidden-absence'),summer=find('summer-no-earth-is-not-all-hidden-absence');
    expect(cai.authorAssertion.quote).toBe('无金以泄之，无水以靡之');
    const caiFacts=facts(cai.pillars);
    expect(caiFacts.hidden).toEqual(expect.arrayContaining(['year:戌:辛','hour:戌:辛','month:辰:癸']));
    expect(summer.authorAssertion.quote).toContain('火旺无土');
    expect(facts(summer.pillars).hidden).toEqual(expect.arrayContaining(['year:寅:戊','month:午:己']));
    expect(cai.manualExpected.role).toBe('boundary');
    expect(summer.manualExpected.role).toBe('boundary');
  });

  it('retains positive and rescue-boundary author effects without inventing a new birth date or necessary converse',()=>{
    const yin=find('yin-reversal-author-positive'),si=find('si-hai-source-command-boundary'),wu=find('wu-can-prevail-without-wood');
    expect(yin.authorAssertion.quote).toContain('金反被伤');
    expect(yin.manualExpected.role).toBe('positive');
    expect(si.authorAssertion.quote).toContain('立夏后十天，戊土司令');
    expect(si.authorAssertion.quote).toContain('亥水受制而巳火不伤');
    expect([...facts(wu.pillars).exposed,...facts(wu.pillars).hidden].some(value=>element[value.at(-1)!]==='木')).toBe(false);
    expect(wu.authorAssertion.quote).toContain('午发而愈烈');
    expect(wu.manualExpected.blocks).toContain('sufficient-rule-failure-implies-opposite-effect');
  });
});
