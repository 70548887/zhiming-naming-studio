import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it,vi} from 'vitest';
import namingEditorial from '../data/naming-editorial.json';
import namingEditorialV4 from '../data/naming-editorial-v4.json';
import namingEditorialV5 from '../data/naming-editorial-v5.json';
import {analyzeProfile} from '../src/domain/engine';
import {evaluateName,generateLocal,selectNamingCitations,selectNamingCitationNote} from '../src/domain/naming';
import {normalizePreferences} from '../src/shared/workflow';
import type {BirthProfile,CharacterEntry,Citation} from '../src/shared/types';

const data=JSON.parse(readFileSync(resolve('data/dataset.json'),'utf8')) as {characters:CharacterEntry[];citations:Citation[]};
const profile:BirthProfile={id:'citation-identity-fixture',customerName:'出处身份隔离',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
const pref=normalizePreferences({style:'典雅有出处',priority:'classic',zodiacRules:false,meanings:''});
const analysis=analyzeProfile(profile);
const quote=data.citations.find(c=>c.id==='zhouyi-35-xiang')!;
const evaluate=(citations:Citation[])=>evaluateName('明德',profile,pref,analysis,data.characters,citations)!;

describe('reviewed naming-citation identity',()=>{
  it.each([
    ['source ID',{sourceId:'external-custom-source'}],
    ['title',{title:'另一部书'}],
    ['chapter',{chapter:'另一章'}],
    ['appended text',{text:quote.text+' 额外改写的文字。'}],
    ['different whole text retaining the excerpt',{text:'另一出处说：君子以自昭明德。'}],
  ] as [string,Partial<Citation>][] )('rejects an exact-ID %s substitution without literary credit',(_label,edit)=>{
    const forged={...quote,...edit};
    expect(selectNamingCitations('明德',data.characters,[forged])).toEqual([]);
    expect(selectNamingCitationNote('明德',data.characters,[forged])).toBe('');
    const candidate=evaluate([forged]),without=evaluate([]);
    expect(candidate.citations).toEqual([]);
    expect(candidate.style).not.toBe('典雅有出处');
    expect(candidate.reason).toContain('未建立经审阅');
    expect(candidate.reason).not.toContain('原文见');
    expect(candidate.evaluation.meaning).toBe(without.evaluation.meaning);
  });

  it('retains twelve established literal and recombined name fixtures with their exact original records',()=>{
    const fixtures=['明德','德明','育德','文德','含章','惠心','永贞','清扬','婉清','安宁','宁安','和乐'];
    for(const name of fixtures){
      const rule=namingEditorial.citations.find(item=>item.names.includes(name))!;
      expect(rule,name).toBeDefined();
      const actual=data.citations.find(c=>c.id===rule.id)!;
      expect(selectNamingCitations(name,data.characters,[actual]),name).toEqual([actual]);
      expect(selectNamingCitationNote(name,data.characters,[actual]),name).toBe(rule.context);
    }
    expect(evaluate([quote]).reason).toContain('原文见');
    expect(evaluateName('德明',profile,pref,analysis,data.characters,[quote])!.reason).toContain('并非原文连词');
  });

  it('does not license a polyphonic name under the wrong registered reading',()=>{
    const wrong=data.characters.map(c=>c.char==='乐'?{...c,pinyin:'yuè',tone:4}:c);
    expect(selectNamingCitations('和乐',wrong,data.citations)).toEqual([]);
    expect(selectNamingCitationNote('和乐',wrong,data.citations)).toBe('');
  });

  it('resolves every published reviewed name through the actual source-linked dictionary reading',()=>{
    for(const rule of namingEditorial.citations)for(const name of rule.names){
      expect(selectNamingCitations(name,data.characters,data.citations),name).toEqual([rule.citation]);
      expect(selectNamingCitationNote(name,data.characters,data.citations),name).toBe(rule.context);
    }
  });

  it('keeps a full local batch while every assigned literary citation has the reviewed identity',()=>{
    const result=generateLocal(profile,pref,analysis,data.characters,data.citations,119);
    expect(result.candidates).toHaveLength(12);
    for(const candidate of result.candidates)for(const citation of candidate.citations){
      const rule=namingEditorial.citations.find(item=>item.names.includes(candidate.givenName)&&item.id===citation.id)||namingEditorialV5.nameRules.find(item=>item.name===candidate.givenName&&item.citation.id===citation.id);
      expect(rule,candidate.givenName).toBeDefined();
      expect(citation).toEqual(rule!.citation);
      expect(candidate.reason).toContain(rule!.context);
    }
  });

  it('classifies contiguous wording from the reviewed excerpt, even if the whole chapter has another occurrence',async()=>{
    const fixture={names:['宁安'],id:'excerpt-scope-handwritten',excerpt:'安与宁',context:'手录测试只审阅第一句；宁安为重组。',readings:{安:'ān',宁:'níng'},citation:{id:'excerpt-scope-handwritten',title:'手录范围样本',chapter:'第一句',text:'安与宁。宁安。',sourceId:'handwritten-test'}};
    vi.resetModules();
    vi.doMock('../data/naming-editorial.json',()=>({default:{...namingEditorial,citations:[...namingEditorial.citations,fixture]}}));
    try{
      const isolated=await import('../src/domain/naming');
      const candidate=isolated.evaluateName('宁安',profile,pref,analysis,data.characters,[fixture.citation])!;
      expect(candidate.citations).toEqual([fixture.citation]);
      expect(candidate.reason).toContain('并非原文连词');
      expect(candidate.reason).not.toContain('原文见');
    }finally{vi.doUnmock('../data/naming-editorial.json');vi.resetModules();}
  });

  it('uses the complete reviewed source sense without adding conflicting generic imagery, and requires the actual source identity',async()=>{
    const sourceMeaning='本句中安与宁写安定相聚；现代命名期许为温和相处。';
    vi.resetModules();
    vi.doMock('../data/naming-editorial-v4.json',()=>({default:{...namingEditorialV4,combinations:{...namingEditorialV4.combinations,安宁:{meaning:sourceMeaning,status:'bound-default-reading',readings:[{char:'安',...namingEditorialV4.characterReadings.安},{char:'宁',...namingEditorialV4.characterReadings.宁}]}}}}));
    try{
      const isolated=await import('../src/domain/naming');
      const cited=isolated.evaluateName('安宁',profile,pref,analysis,data.characters,data.citations)!;
      expect(cited.meaning).toBe('原文选义与组合寓意（项目原创解释）：'+sourceMeaning);
      expect(cited.meaning).not.toContain('项目命名意象；字典原文见用字详情');
      const modern=isolated.evaluateName('安宁',profile,pref,analysis,data.characters,[])!;
      expect(modern.citations).toEqual([]);
      expect(modern.meaning).not.toContain(sourceMeaning);
      const originalModern=isolated.evaluateName('知微',profile,pref,analysis,data.characters,[])!;
      expect(originalModern.meaning).toContain(namingEditorial.combinations.知微);
    }finally{vi.doUnmock('../data/naming-editorial-v4.json');vi.resetModules();}
  });

  it('treats a reviewed source combination as name-level meaning coverage without granting its individual characters a generic approval',()=>{
    const name='纯熙',rule=namingEditorial.citations.find(item=>item.names.includes(name))!;
    const accepted=evaluateName(name,profile,pref,analysis,data.characters,data.citations)!;
    expect(accepted.meaning).toContain(editorialCombination(name));
    expect(accepted.warnings.join('')).not.toContain('纯尚未建立命名适用义');
    expect(accepted.evaluation.distinctiveness).toBe(80);
    const forged=evaluateName(name,profile,pref,analysis,data.characters,[{...rule.citation,sourceId:'unreviewed-source'}])!;
    expect(forged.warnings.join('')).toContain('纯尚未建立命名适用义');
    expect(forged.evaluation.distinctiveness).toBe(65);
    expect(forged.meaning).not.toContain(editorialCombination(name));
    const different=evaluateName('纯安',profile,pref,analysis,data.characters,data.citations)!;
    expect(different.warnings.join('')).toContain('纯尚未建立命名适用义');
    const single=evaluateName('纯',profile,{...pref,length:1},analysis,data.characters,data.citations)!;
    expect(single.warnings.join('')).toContain('纯尚未建立命名适用义');
  });

  it('keeps pronunciation and negative dictionary-sense warnings even for a valid reviewed source combination',()=>{
    const sourceName='丽泽';
    const marked=data.characters.map(c=>c.char==='丽'?{...c,polyphonic:true,meaning:'愚蠢。',warning:'必须保留的字形提醒'}:c);
    const candidate=evaluateName(sourceName,profile,{...pref,requiredChars:'丽'},analysis,marked,data.citations)!;
    expect(candidate.citations).toEqual([]); // An injected gloss outside the selected source word cannot keep literary credit.
    expect(candidate.warnings.join('')).toContain('丽为多音字');
    expect(candidate.warnings.join('')).toContain('字典首义存在负面联想');
    expect(candidate.warnings.join('')).toContain('必须保留的字形提醒');
    expect(candidate.warnings.join('')).toContain('丽尚未建立命名适用义'); // The injected negative gloss is outside the expected word's actual definitions, so it cannot borrow reviewed semantic coverage.
  });
});

function editorialCombination(name:string):string{return (namingEditorial.combinations as Record<string,string>)[name];}
