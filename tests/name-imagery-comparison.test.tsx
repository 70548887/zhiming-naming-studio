import React from 'react';
import {createHash} from 'node:crypto';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,describe,expect,it,vi} from 'vitest';
import fixture from './fixtures/name-imagery-known-chart.json';
import {calculateNameImageryReading,nameImageryProfile} from '../src/domain/name-imagery';
import {NameImageryComparison} from '../src/renderer/NameImageryComparison';
import type {CharacterEntry,NameCandidate,NameImageryAnalysis,QimenChart} from '../src/shared/types';

type Candidate=Pick<NameCandidate,'id'|'fullName'|'imageReading'>;
type SummaryState='comparable'|'not-comparable'|'insufficient';

// No precomputed M453 output is embedded. These pure calls and SHA calculations
// run only when this test is explicitly executed, against the existing fixture.
function snapshot(givenName:string,chart:QimenChart=structuredClone(fixture.chart) as QimenChart):NameImageryAnalysis {
  const characters=[...givenName].map(char=>{
    const original=fixture.characters.find(entry=>entry.char===char);
    if(!original)throw new Error('The fixed imagery fixture has no character '+char);
    return structuredClone(original) as CharacterEntry;
  });
  return calculateNameImageryReading('林',givenName,characters,chart,{
    profile:nameImageryProfile(),
    chartSha256:createHash('sha256').update(JSON.stringify(chart)).digest('hex'),
  });
}
function candidate(givenName:string,chart?:QimenChart):Candidate {
  return{id:'m453-'+givenName,fullName:'林'+givenName,imageReading:snapshot(givenName,chart)};
}
function deepFreeze<T>(value:T):T {
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    for(const child of Object.values(value))deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');
const plain=(html:string)=>html.replace(/<[^>]*>/g,'');

/** Only reads SSR strings; this is not a DOM, browser, or new render framework. */
function candidateBlocks(html:string):string[] {
  const starts=[...html.matchAll(/<article\b[^>]*class="[^"]*\bname-imagery-comparison__candidate\b[^"]*"[^>]*>/g)];
  return starts.map(start=>{
    const tokens=/<\/?article\b[^>]*>/gi;tokens.lastIndex=start.index!;let depth=0;
    for(let token=tokens.exec(html);token;token=tokens.exec(html)){
      depth+=token[0].startsWith('</')?-1:1;
      if(depth===0)return html.slice(start.index,tokens.lastIndex);
    }
    throw new Error('Unclosed candidate article in SSR markup');
  });
}
function labelledBlock(html:string,label:string):string {
  const opening=new RegExp('<([a-z][a-z0-9-]*)\\b[^>]*aria-label="'+label+'"[^>]*>','i').exec(html);
  if(!opening||opening.index===undefined)return '';
  const tag=opening[1],tokens=new RegExp('</?'+tag+'\\b[^>]*>','gi');
  tokens.lastIndex=opening.index;let depth=0;
  for(let token=tokens.exec(html);token;token=tokens.exec(html)){
    depth+=token[0].startsWith('</')?-1:1;
    if(depth===0)return html.slice(opening.index,tokens.lastIndex);
  }
  throw new Error('Unclosed SSR block '+label);
}
const summary=(html:string)=>labelledBlock(html,'同盘位置集合差异');
function renderFrozen(input:Candidate[]):string {
  const before=JSON.stringify(input);
  deepFreeze(input);
  const html=renderToStaticMarkup(<NameImageryComparison candidates={input}/>);
  expect(JSON.stringify(input)).toBe(before);
  expect(Object.isFrozen(input)).toBe(true);
  return html;
}
function expectState(html:string,state:SummaryState){
  expect(html).toContain('data-summary-state="'+state+'"');
  if(state!=='comparable')expect(summary(html)).toBe('');
}
function expectOrderAndOwnSnapshots(html:string,input:ReadonlyArray<Candidate>){
  const blocks=candidateBlocks(html);
  expect(blocks).toHaveLength(input.length);
  expect(blocks.map(block=>plain(/<h3\b[^>]*>([\s\S]*?)<\/h3>/.exec(block)?.[1]??''))).toEqual(input.map(item=>item.fullName));
  for(const [index,item]of input.entries()){
    const value=item.imageReading;if(!value)continue;
    for(const row of value.characterRows){
      expect(blocks[index]).toContain(escape(row.char));
      expect(blocks[index]).toContain(escape(row.pinyin));
      expect(blocks[index]).toContain(escape(row.labelBasis));
      expect(blocks[index]).toContain(escape(row.labelSourceId));
      expect(blocks[index]).toContain(escape(row.dictionarySourceId));
      for(const palace of row.palaces)expect(plain(blocks[index])).toContain(palace+'宫');
    }
    const unionLabel='原保存外八宫集合'+(value.chart.available?'':'（静态）');
    if(value.unionPalaces.length)expect(blocks[index]).toContain('<dt>'+unionLabel+'</dt><dd>'+value.unionPalaces.map(number=>number+'宫').join('、')+'</dd>');
    // Full saved source disclosure remains per candidate, even without a summary.
    expect(blocks[index]).toContain(escape(value.chart.sha256));
    for(const source of value.sourceReferences){
      expect(blocks[index]).toContain(escape(source.id));
      expect(blocks[index]).toContain(escape(source.locator));
    }
    for(const reading of value.chart.available?value.palaceReadings:[]){
      for(const word of [reading.snapshot.star,reading.snapshot.door,reading.snapshot.god]){
        if(word)expect(blocks[index]).toContain(escape(word));
      }
    }
  }
}
function expectNoVerdictOrAction(html:string){
  // Negative policy text may mention scores/ranking/passing; reject affirmative
  // output widgets and verdict labels rather than rejecting those disclaimers.
  expect(html).not.toMatch(/<(?:button|input|select|form)\b/i);
  expect(html).not.toMatch(/\bdata-(?:score|rank|recommendation|passed)=/i);
  expect(plain(html)).not.toMatch(/推荐指数|综合评分|排名第\s*\d|择优推荐|评分[：:]\s*\d|验局通过[。！]|安全通过[。！]/);
}

afterEach(()=>vi.unstubAllGlobals());

describe('read-only saved name-imagery comparison',()=>{
  it('keeps an empty or one-candidate input insufficient without inventing a common set',()=>{
    const empty=renderFrozen([]);expectState(empty,'insufficient');expect(candidateBlocks(empty)).toHaveLength(0);expectNoVerdictOrAction(empty);
    const one=[candidate('安宁')],html=renderFrozen(one);expectState(html,'insufficient');expectOrderAndOwnSnapshots(html,one);expectNoVerdictOrAction(html);
  });

  it('preserves frozen candidate order and both original character orders for equal palace sets',()=>{
    const input=[candidate('宁安'),candidate('安宁')],html=renderFrozen(input);
    expect(input[0].imageReading!.unionPalaces).toEqual([2,8]);expect(input[1].imageReading!.unionPalaces).toEqual([2,8]);
    expect(input[0].imageReading!.characterRows.map(row=>row.char)).toEqual(['宁','安']);
    expect(input[1].imageReading!.characterRows.map(row=>row.char)).toEqual(['安','宁']);
    const renderedCandidates=candidateBlocks(html);
    for(const [index,item]of input.entries()){
      const headings=[...renderedCandidates[index].matchAll(/<h5\b[^>]*>([\s\S]*?)<\/h5>/g)].map(match=>plain(match[1]));
      const first=headings.findIndex(text=>text.startsWith('第 1 字 · '+item.imageReading!.characterRows[0].char+' '));
      const second=headings.findIndex(text=>text.startsWith('第 2 字 · '+item.imageReading!.characterRows[1].char+' '));
      expect(first).toBeGreaterThanOrEqual(0);expect(second).toBeGreaterThan(first);
    }
    expectState(html,'comparable');expectOrderAndOwnSnapshots(html,input);
    expect(summary(html)).toContain('位置差异，不表示优劣');
    expect(summary(html)).toContain('<dt>所有名字共同位置</dt><dd>2宫、8宫</dd>');
    for(const item of input)expect(plain(summary(html))).toContain(item.fullName+' · 本名其余位置：无其余位置');
    expect(html).toContain('项目文化比较');expect(html).toContain('姓名意象与九宫对照');expectNoVerdictOrAction(html);
  });

  it.each(['沐清','钧烨'])('shows different saved sets for 安宁 and %s without choosing a winner',other=>{
    const input=[candidate(other),candidate('安宁')],html=renderFrozen(input);
    const fixed=fixture.cases.find(item=>item.givenName===other);if(!fixed)throw new Error('Missing fixed expected set');
    expect(input[0].imageReading!.unionPalaces).toEqual(fixed.expectedPalaces);
    expect(input[1].imageReading!.unionPalaces).toEqual([2,8]);
    expectState(html,'comparable');expectOrderAndOwnSnapshots(html,input);
    const setSummary=summary(html);expect(setSummary).toContain('位置差异，不表示优劣');
    expect(setSummary).toContain('<dt>所有名字共同位置</dt><dd>无共同位置</dd>');
    expect(plain(setSummary)).toContain('林'+other+' · 本名其余位置：'+fixed.expectedPalaces.map(number=>number+'宫').join('、'));
    expect(plain(setSummary)).toContain('林安宁 · 本名其余位置：2宫、8宫');
    expectNoVerdictOrAction(html);
  });

  it('subtracts the shared water position from 沐清 and 梓涵 without calling remaining positions exclusive',()=>{
    const input=[candidate('梓涵'),candidate('沐清')],html=renderFrozen(input);
    expect(input[0].imageReading!.unionPalaces).toEqual([1,3,4]);expect(input[1].imageReading!.unionPalaces).toEqual([1]);
    expectState(html,'comparable');expectOrderAndOwnSnapshots(html,input);
    expect(summary(html)).toContain('<dt>所有名字共同位置</dt><dd>1宫</dd>');
    expect(plain(summary(html))).toContain('林梓涵 · 本名其余位置：3宫、4宫');
    expect(plain(summary(html))).toContain('林沐清 · 本名其余位置：无其余位置');
    expect(summary(html)).not.toContain('独有位置');expectNoVerdictOrAction(html);
  });

  it('does not drop a missing snapshot or turn the other candidate into a two-name summary',()=>{
    const missing:Candidate={id:'m453-no-snapshot',fullName:'林无记录'},input=[missing,candidate('安宁')],html=renderFrozen(input);
    expectState(html,'not-comparable');expectOrderAndOwnSnapshots(html,input);
    expect(candidateBlocks(html)[0]).toContain('未生成项目文化比较');
    expect(candidateBlocks(html)[0]).not.toContain('name-imagery-palace');
    expectNoVerdictOrAction(html);
  });

  it('keeps an unavailable chart as a static set with no invented stars, doors, gods or common-set summary',()=>{
    // A deliberately unavailable input boundary, not a newly calculated chart
    // or a claim about an actual birth time. The pure mapper creates the result.
    const unavailable:QimenChart={available:false,reason:'M453 unknown-chart input boundary',dun:'',ju:0,yuan:'',solarTerm:'',xun:'',chiefStar:'',chiefDoor:'',palaces:[],reasons:[],warnings:[],version:fixture.chart.version};
    const input=[candidate('安宁',unavailable),candidate('沐清',unavailable)],html=renderFrozen(input);
    for(const item of input){expect(item.imageReading!.status).toBe('chart-unavailable');expect(item.imageReading!.chart.available).toBe(false);expect(item.imageReading!.palaceReadings).toEqual([]);}
    expectState(html,'not-comparable');expectOrderAndOwnSnapshots(html,input);
    expect(html).toContain('仅列静态标签');
    expect(input[0].imageReading!.unionPalaces).toEqual([2,8]);expect(input[1].imageReading!.unionPalaces).toEqual([1]);
    expect(html).not.toContain('class="name-imagery-palace"');
    for(const palace of fixture.chart.palaces){
      for(const word of [palace.star,palace.door,palace.god])if(word)expect(plain(html)).not.toContain(word);
    }
    expectNoVerdictOrAction(html);
  });

  it('keeps 厚安 partial and its real 安 subset without claiming complete whole-name mapping',()=>{
    const input=[candidate('厚安'),candidate('安宁')],html=renderFrozen(input),partial=input[0].imageReading!;
    expect(partial.status).toBe('partial');expect(partial.unionPalaces).toEqual([2,8]);
    expect(partial.characterRows.map(row=>row.state)).toEqual(['unresolved','mapped']);
    expect(partial.characterRows[0].palaces).toEqual([]);expect(partial.characterRows[1].palaces).toEqual([2,8]);
    expectState(html,'not-comparable');expectOrderAndOwnSnapshots(html,input);
    const partialBlock=candidateBlocks(html)[0];expect(partialBlock).toContain(escape(partial.characterRows[0].missing[0]));
    expect(partialBlock).toContain('部分字位标签待定');
    expect(plain(partialBlock)).not.toMatch(/全名(?:映射)?已完成|全名全部已映射|全名完整映射/);
    expectNoVerdictOrAction(html);
  });

  // The following edits intentionally tamper with detached saved metadata. They
  // are mismatch-rejection tests, not genuine new algorithms or valid sources.
  const metadataMismatches:ReadonlyArray<{label:string;change:(value:NameImageryAnalysis)=>void}>=[
    {label:'chart SHA-256',change:value=>{value.chart.sha256=value.chart.sha256==='a'.repeat(64)?'b'.repeat(64):'a'.repeat(64);}},
    {label:'chart version',change:value=>{value.chart.version+='-M453-mismatch-only';}},
    {label:'mapping version',change:value=>{value.version='M453-tampered-mapping-version' as NameImageryAnalysis['version'];}},
    {label:'mapping mode',change:value=>{value.mode='M453-tampered-mapping-mode' as NameImageryAnalysis['mode'];}},
    {label:'profile version',change:value=>{value.profile.version='M453-tampered-profile-version' as NameImageryAnalysis['profile']['version'];}},
    {label:'profile mode',change:value=>{value.profile.mode='M453-tampered-profile-mode' as NameImageryAnalysis['profile']['mode'];}},
    {label:'profile authority',change:value=>{value.profile.authority='M453-tampered-authority' as NameImageryAnalysis['profile']['authority'];}},
    {label:'profile name',change:value=>{value.profile.name+=' · M453 mismatch only';}},
    {label:'profile source IDs',change:value=>{value.profile.sourceIds.push('M453-tampered-source');}},
    {label:'profile label-source identity',change:value=>{value.profile.labelSourceId='M453-tampered-label-source' as NameImageryAnalysis['profile']['labelSourceId'];}},
    {label:'profile element-to-palace table',change:value=>{value.profile.elementPalaces.土=[2];}},
    {label:'profile palace-to-element table',change:value=>{value.profile.palaceElements['2']='水';}},
    {label:'profile palace branches',change:value=>{value.profile.palaceBranches['2']=['M453 mismatch only'];}},
    {label:'profile source-reference content',change:value=>{value.profile.sourceReferences[0].note+=' · M453 mismatch only';}},
    {label:'profile policies',change:value=>{value.profile.policies.push('M453 mismatch only; not a new policy');}},
  ];
  it.each(metadataMismatches)('suppresses the common-set summary for an explicit $label tamper while retaining each saved record',({change})=>{
    const first=candidate('安宁'),second=candidate('沐清');change(second.imageReading!);
    const input=[second,first],html=renderFrozen(input);
    expectState(html,'not-comparable');expectOrderAndOwnSnapshots(html,input);expectNoVerdictOrAction(html);
  });

  it('does not accept a duplicate union that omits a real row palace, even when its array length looks complete',()=>{
    // Explicit saved-data tamper; neither the real fixture nor mapper is edited.
    const first=candidate('安宁'),second=candidate('宁安');
    second.imageReading!.unionPalaces=[2,2];
    expect(second.imageReading!.characterRows.map(row=>row.palaces)).toEqual([[2,8],[2,8]]);
    const input=[second,first],html=renderFrozen(input);
    expectState(html,'not-comparable');expectOrderAndOwnSnapshots(html,input);expectNoVerdictOrAction(html);
  });

  it('does not authorize two matching but unknown mapping versions or modes just because their metadata agrees',()=>{
    // Deliberately fabricated matching metadata is only a rejection boundary,
    // never a genuine alternative algorithm or a domain-generated snapshot.
    const input=[candidate('安宁'),candidate('宁安')];
    for(const item of input){
      const value=item.imageReading!,unknown='M453-matching-unknown-version-test-only';
      value.version=unknown as NameImageryAnalysis['version'];value.mode=unknown as NameImageryAnalysis['mode'];
      value.profile.version=unknown as NameImageryAnalysis['profile']['version'];value.profile.mode=unknown as NameImageryAnalysis['profile']['mode'];
    }
    const html=renderFrozen(input);expectState(html,'not-comparable');expectOrderAndOwnSnapshots(html,input);expectNoVerdictOrAction(html);
  });

  it('compares equal full profile contents even when object key insertion order differs',()=>{
    const first=candidate('安宁'),second=candidate('宁安'),savedProfile=second.imageReading!.profile;
    second.imageReading!.profile=Object.fromEntries(Object.entries(savedProfile).reverse()) as unknown as NameImageryAnalysis['profile'];
    const input=[second,first],html=renderFrozen(input);expectState(html,'comparable');expectOrderAndOwnSnapshots(html,input);expect(summary(html)).toContain('位置差异，不表示优劣');
  });

  it('uses only the supplied frozen snapshots and does not request generation, storage, analysis or a network call during SSR',()=>{
    const external=vi.fn(()=>{throw new Error('M453 comparison must remain read-only');});
    vi.stubGlobal('fetch',external);
    vi.stubGlobal('window',{studio:Object.freeze({bootstrap:external,generate:external,generateWithCharacterImagery:external,analyze:external,saveProfile:external,saveSession:external,updateElementAssessment:external})});
    const input=[candidate('安宁'),candidate('沐清')],html=renderFrozen(input);expectState(html,'comparable');expectNoVerdictOrAction(html);expect(external).not.toHaveBeenCalled();
  });
});
