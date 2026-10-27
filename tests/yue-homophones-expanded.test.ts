import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {loadYueReadingData} from '../src/main/yue-reading-data';
import {loadYueHomophoneExpandedData} from '../src/main/yue-homophone-expanded-data';
import {calculateYueNameReading,confirmYueNameReading} from '../src/domain/yue-reading';
import {calculateYueHomophoneExpandedReview,isCanonicalYueHomophoneExpandedReview,YUE_HOMOPHONE_EXPANDED_VERSION} from '../src/domain/yue-homophones-expanded';
import type {YueHomophoneData,YueHomophoneReview} from '../src/shared/yue-homophone-types';
import type {YueReadingSelection} from '../src/shared/types';

interface Golden {id:string;surname:string;given:string;tokens:string[];unconfirmedPositions:number[];expectedStatus:string;expected:string[][];strictExpected:string[][];sourceProof:Array<{glyph:string;token:string;rawLine:string;sha256:string}>;}
const goldens=(JSON.parse(readFileSync(resolve('tests/fixtures/yue-homophone-v1-1-name-goldens.json'),'utf8')) as {cases:Golden[]}).cases;
const {data:readingData}=loadYueReadingData(resolve('data')),{data}=loadYueHomophoneExpandedData(resolve('data'));
const family=(tokens:string[]):YueReadingSelection=>({tokens,origin:'user',confirmed:true});
function confirmed(item:Pick<Golden,'surname'|'given'|'tokens'|'unconfirmedPositions'>) {
  const length=[...item.surname].length,initial=calculateYueNameReading(item.surname,item.given,readingData);
  return confirmYueNameReading(initial,{surname:item.unconfirmedPositions.includes(0)?null:family(item.tokens.slice(0,length)),given:[...item.given].map((_,index)=>item.unconfirmedPositions.includes(length+index)?null:family([item.tokens[length+index]]))});
}

describe('independent 1.1 source-attested artificial name goldens',()=>{
  it.each(goldens)('$id',item=>{
    const reading=confirmed(item);
    for(const mode of ['strict','ignore-tone'] as const) {
      const review=calculateYueHomophoneExpandedReview(item.surname,item.given,reading,mode,data);
      expect(review.version).toBe(YUE_HOMOPHONE_EXPANDED_VERSION);
      expect(review.status).toBe(item.expectedStatus);
      expect(review.matches.map(match=>[match.term,match.comparison,match.span.scope])).toEqual(mode==='strict'?item.strictExpected:item.expected);
      expect(review.selectedTokens).toEqual(item.expectedStatus==='not-assessed'?[]:item.tokens);
      expect(isCanonicalYueHomophoneExpandedReview(review,item.surname,item.given,reading,mode,data)).toBe(true);
    }
  });
  it('keeps all 36 input cases and original character row/hash evidence independently from review calculation',()=>{
    expect(goldens).toHaveLength(36);
    const rows=new Set(readFileSync(resolve('data/raw/yue-reading-chars.dict.yaml'),'utf8').split(/\r?\n/u));
    for(const item of goldens)for(const [index,proof] of item.sourceProof.entries()) {
      expect(proof.glyph).toBe([...item.surname,...item.given][index]);expect(proof.token).toBe(item.tokens[index]);
      expect(rows.has(proof.rawLine),`${item.id}: ${proof.glyph}/${proof.token}`).toBe(true);
      expect(createHash('sha256').update(proof.rawLine).digest('hex')).toBe(proof.sha256);
    }
  });
});

describe('1.1 explicit readings and unexpanded matching boundaries',()=>{
  it('has two explicitly sourced 流氓 pronunciations, without inventing other dictionary alternatives',()=>{
    expect(data.rules.filter(rule=>rule.term==='流氓').map(rule=>rule.tokens)).toEqual([['lau4','man4'],['lau4','mong4']]);
    for(const token of ['man4','mong4','mang4','maang4']) {
      const item={surname:'劉',given:'文',tokens:['lau4',token],unconfirmedPositions:[]},review=calculateYueHomophoneExpandedReview(item.surname,item.given,confirmed(item),'strict',data);
      expect(review.matches.map(match=>match.term)).toEqual(['man4','mong4'].includes(token)?['流氓']:[]);
    }
  });
  it('retains standard tags and original raw tags separately, including old terms restored from source',()=>{
    const hygiene=data.rules.find(rule=>rule.term==='衛生巾')!,fox=data.rules.find(rule=>rule.term==='狐狸精')!,poor=data.rules.find(rule=>rule.term==='孤寒')!;
    expect(hygiene.glosses.some(gloss=>gloss.rawTags!.includes('香港'))).toBe(true);
    expect(fox.glosses.some(gloss=>gloss.rawTags!.includes('中國神話'))).toBe(true);
    expect(poor.glosses.flatMap(gloss=>gloss.quotes).length).toBeGreaterThan(1);
    for(const rule of data.rules)expect(rule.register).toEqual([...new Set(rule.glosses.flatMap(gloss=>[...gloss.tags,...gloss.rawTags!]))]);
  });
  it('records exact positions and tone differences without sound merging or surname-internal alerts',()=>{
    const item=goldens.find(item=>item.id==='downstream-cross')!,review=calculateYueHomophoneExpandedReview(item.surname,item.given,confirmed(item),'ignore-tone',data);
    expect(review.matches[0].span).toEqual({start:0,endExclusive:2,text:'夏柳',scope:'cross-surname-given'});
    expect(review.matches[0].differentTonePositions).toEqual([1]);expect(review.matches[0].actualTokens).toEqual(['haa6','lau5']);
    expect(review.matches[0].ruleTokens).toEqual(['haa6','lau4']);expect(review.matches).toHaveLength(1);
  });
  it('does not assess any unit before complete confirmation or imply broad safety from no match',()=>{
    const item=goldens.find(item=>item.id==='fraud-whole-unconfirmed')!,review=calculateYueHomophoneExpandedReview(item.surname,item.given,confirmed(item),'ignore-tone',data);
    expect(review.missing[0]).toContain('姓氏');expect(review.matches).toEqual([]);expect(review.selectedTokens).toEqual([]);
    expect(review.limitations.join('')).toContain('未命中不表示');expect(review.sourceReferences).toHaveLength(58);
  });
  it('preserves all source metadata and does not share mutable objects with data or reading choices',()=>{
    const item=goldens.find(item=>item.id==='hoodlum-man-strict')!,reading=confirmed(item),before=JSON.stringify({data,reading}),review=calculateYueHomophoneExpandedReview(item.surname,item.given,reading,'strict',data);
    expect(review.matches[0].sourceRefs[0].recordSha256).toMatch(/^[a-f0-9]{64}$/u);expect(review.matches[0].sourceRefs[1].rowSha256).toMatch(/^[a-f0-9]{64}$/u);
    review.matches[0].glosses[0].rawTags!.push('changed');review.sourceReferences[0].quote='changed';review.selectedTokens[0]='lau5';
    expect(JSON.stringify({data,reading})).toBe(before);
  });
  it('rejects incomplete raw context, invalid syllables, duplicate rules and changed reading-derived status',()=>{
    const item=goldens[0],reading=confirmed(item);
    const changes=[
      (value:YueHomophoneData)=>{delete value.rules[0].glosses[0].rawTags;},
      (value:YueHomophoneData)=>{value.rules[0].register=[];},
      (value:YueHomophoneData)=>{value.rules[0].tokens[0]='wai7';},
      (value:YueHomophoneData)=>{value.rules[1].id=value.rules[0].id;},
      (value:YueHomophoneData)=>{value.rules.pop();},
      (value:YueHomophoneData)=>{value.rules[0].sourceRefs[0].id='yue-homophones-wiktionary-fixed';},
    ];
    for(const change of changes) {const altered=structuredClone(data);change(altered);expect(()=>calculateYueHomophoneExpandedReview(item.surname,item.given,reading,'ignore-tone',altered)).toThrow();}
    const altered=structuredClone(reading);altered.status='partial';expect(()=>calculateYueHomophoneExpandedReview(item.surname,item.given,altered,'ignore-tone',data)).toThrow('状态或音节');
  });
  it('recomputes tone, scope, original tags, sources and missing confirmations when accepting saved reviews',()=>{
    const item=goldens.find(item=>item.id==='hoodlum-man-strict')!,reading=confirmed(item),original=calculateYueHomophoneExpandedReview(item.surname,item.given,reading,'ignore-tone',data);
    for(const change of [
      (value:YueHomophoneReview)=>{value.version='yue-homophone-review/1.0.0';},
      (value:YueHomophoneReview)=>{value.matches[0].glosses[0].rawTags=[];value.matches[0].register=[];},
      (value:YueHomophoneReview)=>{value.matches[0].sourceRefs[0].recordSha256='0'.repeat(64);},
      (value:YueHomophoneReview)=>{value.matches[0].span.scope='whole-given-name';},
      (value:YueHomophoneReview)=>{value.matches[0].ruleTokens[1]='mang4';},
      (value:YueHomophoneReview)=>{value.sourceReferences.pop();},
      (value:YueHomophoneReview)=>{value.missing=['fabricated'];},
    ]) {const altered=structuredClone(original);change(altered);expect(isCanonicalYueHomophoneExpandedReview(altered,item.surname,item.given,reading,'ignore-tone',data)).toBe(false);}
  });
});
