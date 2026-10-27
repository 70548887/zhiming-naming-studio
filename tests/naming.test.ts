import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { analyzeProfile } from '../src/domain/engine';
import { barePinyin, evaluateName, generateLocal, selectNamingCitations, surnameReading, validatePreferences, zodiacCharacterReference } from '../src/domain/naming';
import type { BirthProfile, CharacterEntry, Citation, NamingPreferences } from '../src/shared/types';

const baby:BirthProfile={id:'baby',customerName:'测试',surname:'欧阳',surnamePinyin:'',gender:'中性',calendar:'solar',birthDate:'2024-02-10',leapMonth:false,birthTime:'08:30',timeUnknown:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
const pref=(extra:Partial<NamingPreferences>={}):NamingPreferences=>({length:2,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',style:'清朗',meanings:'平安，求知，仁爱',industry:'',priority:'balanced',preferredElements:[],zodiacRules:true,numerology:false,...extra});
const entry=(char:string,pinyin:string,tone:number,extra:Partial<CharacterEntry>={}):CharacterEntry=>({char,pinyin,tone,meaning:char+'的测试字义',traditional:char,strokes:8,elements:['木'],elementBasis:'fixture显式分类',tags:[],warning:'',sourceId:'fixture',...extra});
const publishedCharacters:CharacterEntry[]=JSON.parse(readFileSync(new URL('../data/dataset.json',import.meta.url),'utf8')).characters;
const chars:CharacterEntry[]=[entry('安','ān',1,{meaning:'平安',tags:['平安'],radical:'宀'}),entry('宁','níng',2,{meaning:'安宁',tags:['安宁'],radical:'宀'}),entry('知','zhī',1,{meaning:'知晓、求知',tags:['求知']}),entry('仁','rén',2,{meaning:'仁爱',tags:['仁爱']}),entry('明','míng',2,{meaning:'明朗',tags:['明朗']}),entry('德','dé',2,{meaning:'品德',tags:['美德']}),entry('清','qīng',1,{meaning:'清澈',tags:['清澈'],radical:'水',elements:['水']}),entry('澄','chéng',2,{meaning:'澄明',tags:['澄明'],radical:'水',elements:['水']}),entry('山','shān',1,{meaning:'山岳',radical:'山',tags:['山林']}),entry('松','sōng',1,{meaning:'松树',radical:'木',tags:['坚韧']}),entry('禾','hé',2,{meaning:'谷类',radical:'禾',tags:['丰足']}),entry('辰','chén',2,{meaning:'时序',tags:['时序']}),entry('章','zhāng',1,{meaning:'文采',tags:['文采']}),entry('子','zǐ',3),entry('腾','téng',2),entry('贞','zhēn',1),entry('香','xiāng',1),entry('伟','wěi',3),entry('伟','wěi',3),entry('欣','xīn',1,{meaning:'喜悦',tags:['喜悦']}),entry('悦','yuè',4,{meaning:'喜悦',tags:['喜悦']})].map(fixture=>{const published=publishedCharacters.find(entry=>entry.char===fixture.char&&entry.pinyin===fixture.pinyin&&entry.tone===fixture.tone);return published?{...fixture,meaning:published.meaning,sourceId:published.sourceId,readings:structuredClone(published.readings)}:fixture;});
const citations:Citation[]=[{id:'zhouyi-35-xiang',title:'周易·象传',chapter:'第35卦·火地晋·大象',text:'明出地上，晋。君子以自昭明德。',sourceId:'zhouyi'}];
const analysis=analyzeProfile(baby);
const evaluate=(name:string,p:Partial<NamingPreferences>={},b:Partial<BirthProfile>={},v=chars,c=citations)=>evaluateName(name,{...baby,...b},pref(p),analysis,v,c);

describe('naming constraints and truthful explanations',()=>{
  it('keeps compound surnames and confirmed polyphonic surname readings',()=>{
    expect(evaluate('安宁')?.pinyin).toBe('ōu yáng ān níng');
    expect(surnameReading({...baby,surname:'单'})).toBe('shàn');
    expect(surnameReading({...baby,surname:'单',surnamePinyin:'chán'})).toBe('chán');
    expect(evaluate('安宁',{}, {surname:'单',surnamePinyin:'chán'})?.pinyin).toBe('chán ān níng');
    expect(barePinyin('lǚ nǚ')).toBe('lv nv');expect(barePinyin('lù nù')).toBe('lu nu');
  });
  it('normalizes generation and required characters and detects impossible requests before generation',()=>{
    const p=pref({generationChar:' 德 ',requiredChars:' 安，德 '});
    expect(()=>validatePreferences(p,chars)).not.toThrow();
    expect(evaluateName('德安',baby,p,analysis,chars,citations)).not.toBeNull();
    expect(evaluateName('安德',baby,p,analysis,chars,citations)).toBeNull();
    expect(()=>validatePreferences(pref({requiredChars:'安宁德'}),chars)).toThrow('数量');
    expect(()=>validatePreferences(pref({requiredChars:'安',forbiddenChars:'安'}),chars)).toThrow('同时');
    expect(()=>validatePreferences(pref({generationChar:'安宁'}),chars)).toThrow('辈分字');
    expect(()=>validatePreferences(pref({requiredChars:'𰻞'}),chars)).toThrow('尚未收录');
  });
  it('applies name exclusions to the given name without rejecting a fixed surname',()=>{
    expect(evaluate('安宁',{forbiddenChars:'安'})).toBeNull();
    expect(evaluate('德宁',{elderTaboo:'德'})).toBeNull();
    expect(evaluate('安宁',{forbiddenChars:'欧'}, {surname:'欧'})).not.toBeNull();
    expect(evaluate('安宁',{}, {surname:'丑',surnamePinyin:'chǒu'})).not.toBeNull();
  });
  it('rejects registered Mandarin awkward full-name homophones and unknown vocabulary',()=>{
    expect(evaluate('子腾',{}, {surname:'杜',surnamePinyin:'dù'})).toBeNull();
    expect(evaluate('贞香',{}, {surname:'史',surnamePinyin:'shǐ'})).toBeNull();
    expect(evaluate('安𰻞')).toBeNull();
  });
  it('evaluates surname-to-given-name rhythm and allows explicitly explained reduplication',()=>{
    const repeated=evaluate('安宁',{}, {surname:'安',surnamePinyin:'ān'})!;
    const alternate=evaluate('安宁',{}, {surname:'李',surnamePinyin:'lǐ'})!;
    expect(repeated.evaluation.sound).toBeLessThan(alternate.evaluation.sound);
    expect(repeated.warnings.join('')).toContain('相邻音节同音');
    expect(evaluate('宁宁')?.warnings.join('')).toContain('叠字名');
  });
  it('distinguishes contiguous literary wording, recombined source characters and original meaning',()=>{
    expect(evaluate('明德')?.reason).toContain('原文见');
    expect(evaluate('德明')?.reason).toContain('并非原文连词');
    expect(evaluate('安宁')?.reason).toContain('现代组合寓意');
    expect(evaluate('安宁')?.citations).toEqual([]);
    expect(evaluate('明德')?.citations[0].text).toBe(citations[0].text);
  });
  it('does not upgrade co-occurring characters, negation or a different source to an approved naming citation',()=>{
    const fixtures:Citation[]=[
      {id:'breakup',title:'诗经',chapter:'旧情',text:'将安将乐，女转弃予。',sourceId:'shijing'},
      {id:'zhouyi-8-gua',title:'周易',chapter:'比卦',text:'吉。原筮元永贞，无咎。不宁方来，后夫凶。',sourceId:'zhouyi'},
      {id:'another-text',title:'周易',chapter:'伪章',text:'明德安宁予和',sourceId:'fixture'}
    ];
    for(const name of ['安宁','乐安','予和','宁予'])expect(selectNamingCitations(name,chars,fixtures)).toEqual([]);
    expect(selectNamingCitations('明德',chars,fixtures)).toEqual([]);
    expect(evaluate('安宁',{}, {},chars,fixtures)?.style).not.toBe('典雅有出处');
    expect(evaluate('安宁',{}, {},chars,fixtures)?.reason).toContain('未建立经审阅');
  });
  it('penalizes a structured polyphonic reading even when the warning contains no keyword',()=>{
    const singleReadings=chars.map(c=>({...c,warning:'',polyphonic:false,readings:c.readings?.filter(reading=>reading.pinyin===c.pinyin)}));
    const ordinary=evaluate('安宁',{}, {},singleReadings)!;
    const ambiguous=evaluate('安宁',{}, {},singleReadings.map(c=>c.char==='宁'?{...c,readings:structuredClone(publishedCharacters.find(entry=>entry.char==='宁')!.readings)}:c))!;
    expect(ordinary.evaluation.sound-ambiguous.evaluation.sound).toBe(10);
    expect(ambiguous.warnings.join('')).toContain('宁为多音字');
  });
  it('does not turn negative first senses or unresolved cross-references into generic praise',()=>{
    const risky=entry('傲','ào',4,{meaning:'倨慢。；不屈服的。'});
    const unresolved=entry('蓓','bèi',4,{meaning:'參見「蓓蕾」條。'});
    expect(evaluate('傲宁',{}, {},[...chars,risky])).toBeNull();
    expect(evaluate('蓓宁',{}, {},[...chars,unresolved])).toBeNull();
    const requested=evaluate('傲宁',{requiredChars:'傲'}, {},[...chars,risky])!;
    expect(requested.warnings.join('')).toContain('负面联想');
    expect(requested.meaning).toContain('待起名师复核');
    expect(requested.characters[0].meaning).toContain('倨慢');
    const polysemy={...structuredClone(publishedCharacters.find(entry=>entry.char==='安')!),meaning:'平穩、安全、舒適的狀況或環境。；安非他命的簡稱。'};
    const naming=evaluate('安宁',{}, {},[polysemy,chars[1]])!;
    expect(naming.meaning).not.toContain('安非他命');
    expect(naming.characters[0].meaning).toContain('安非他命'); // source text remains available, never rewritten as a quote.
  });
  it('uses the chosen elements as a preference and labels numerical comparisons as heuristics',()=>{
    const selected=evaluate('清澄',{preferredElements:['水']})!;
    const another=evaluate('清澄',{preferredElements:['木']})!;
    expect(selected.evaluation.traditional).toBeGreaterThan(another.evaluation.traditional);
    expect(selected.traditionalReason).toContain('采用水');
    expect(selected.reason).toContain('排序启发式');
    expect(selected.reason).toContain('不是心理测量');
    expect(evaluate('安宁',{numerology:true})?.warnings.join('')).toContain('不作五格吉凶结论');
  });
  it('makes project-authored zodiac imagery inspectable and weakly weights it only for traditional priority',()=>{
    expect(zodiacCharacterReference(chars.find(c=>c.char==='清')!,'龙')).toContain('部首为水');
    expect(zodiacCharacterReference(entry('芳','fāng',1,{radical:'艹'}),'兔')).toContain('部首为艸');
    const base=evaluate('清宁',{preferredElements:['木'],priority:'traditional',zodiacRules:false})!;
    const enabled=evaluate('清宁',{preferredElements:['木'],priority:'traditional',zodiacRules:true})!;
    expect(enabled.evaluation.traditional-base.evaluation.traditional).toBe(3);
    expect(evaluate('清宁',{priority:'balanced',zodiacRules:true})?.evaluation.traditional).toBe(evaluate('清宁',{priority:'balanced',zodiacRules:false})?.evaluation.traditional);
    expect(enabled.traditionalReason).toContain('六合酉鸡');
    expect(enabled.traditionalReason).toContain('六冲戌狗');
    expect(enabled.warnings.join('')).toContain('不是古籍统一定论');
  });
  it('records semantic industry preferences while leaving the birth analysis intact',()=>{
    const original=JSON.stringify(analysis);
    const ordinary=evaluate('仁安',{industry:''})!;
    const medical=evaluate('仁安',{industry:'医学'})!;
    expect(medical.evaluation.meaning).toBeGreaterThan(ordinary.evaluation.meaning);
    expect(medical.reason).toContain('行业文化意象');
    expect(JSON.stringify(analysis)).toBe(original);
  });
  it('reports real candidate shortages rather than filling with broken constraints or fabricated style categories',()=>{
    const result=generateLocal(baby,pref({length:1,requiredChars:'安'}),analysis,chars,citations);
    expect(result.candidates.map(c=>c.givenName)).toEqual(['安']);
    expect(result.messages.join('')).toContain('得到 1 个');
    expect(result.messages.join('')).toContain('不足4个');
    const unclassified=entry('腾','téng',2,{strokes:22,tags:[]});
    expect(evaluate('腾腾',{}, {},[unclassified],[])?.style).toBe('自然组合');
  });
});

describe('real offline licensed dataset',()=>{
  it('returns 12 distinct usable candidates with source-linked characters and unchanged constraints',()=>{
    const dataset=JSON.parse(readFileSync(new URL('../data/dataset.json',import.meta.url),'utf8')) as {characters:CharacterEntry[];citations:Citation[]};
    expect(dataset.characters.length).toBeGreaterThanOrEqual(500);
    const requested=pref({generationChar:'知',forbiddenChars:'死殇夭',elderTaboo:'祖'});
    const before=JSON.stringify({baby,requested,analysis});
    const result=generateLocal(baby,requested,analysis,dataset.characters,dataset.citations);
    expect(result.candidates).toHaveLength(12);
    expect(new Set(result.candidates.map(c=>c.fullName)).size).toBe(12);
    for(const candidate of result.candidates) {
      expect(candidate.givenName[0]).toBe('知');expect(candidate.fullName.startsWith('欧阳')).toBe(true);
      expect(candidate.characters.every(c=>c.meaning&&c.pinyin&&c.sourceId)).toBe(true);
      expect(/[死殇夭祖]/.test(candidate.givenName)).toBe(false);
      expect(candidate.reason).toContain('排序启发式');
      expect(candidate.citations.every(c=>dataset.citations.some(real=>real.id===c.id&&real.text===c.text))).toBe(true);
    }
    expect(JSON.stringify({baby,requested,analysis})).toBe(before);
    const unconstrained=generateLocal(baby,pref(),analysis,dataset.characters,dataset.citations);
    expect(unconstrained.candidates).toHaveLength(12);
    expect(unconstrained.candidates.every(c=>!c.characters.some(ch=>/倨慢/.test(ch.meaning.split('；')[0])))).toBe(true);
    expect(new Set(unconstrained.candidates.map(c=>[...c.givenName].sort().join(''))).size).toBe(12);
    expect(Object.fromEntries(['典雅有出处','清朗易记','鲜明有辨识度'].map(style=>[style,unconstrained.candidates.filter(c=>c.style===style).length]))).toEqual({'典雅有出处':4,'清朗易记':4,'鲜明有辨识度':4});
  });
  it('balances requested themes and natural expression rather than filling a batch with the same favorable radicals',()=>{
    const dataset=JSON.parse(readFileSync(new URL('../data/dataset.json',import.meta.url),'utf8')) as {characters:CharacterEntry[];citations:Citation[]};
    const p={...baby,surname:'林',surnamePinyin:'lín',birthDate:'2026-10-17',birthTime:'09:30',birthPlace:'杭州'};
    const result=generateLocal(p,pref({meanings:'平安求知'}),analyzeProfile(p),dataset.characters,dataset.citations);
    expect(result.candidates).toHaveLength(12);
    expect(result.candidates.filter(c=>c.reason.includes('自然表达参考词表')).length).toBeGreaterThanOrEqual(9);
    expect(result.candidates.filter(c=>c.reason.includes('呼应平安')||c.reason.includes('求知主题')).length).toBeGreaterThanOrEqual(9);
    const counts=new Map<string,number>();for(const candidate of result.candidates)for(const char of candidate.givenName)counts.set(char,(counts.get(char)||0)+1);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
    expect(result.candidates.map(c=>c.givenName)).not.toContain('木桃');
    expect(result.candidates.map(c=>c.givenName)).not.toContain('雨云');
    expect(Object.fromEntries(['典雅有出处','清朗易记','鲜明有辨识度'].map(style=>[style,result.candidates.filter(c=>c.style===style).length]))).toEqual({'典雅有出处':4,'清朗易记':4,'鲜明有辨识度':4});
  });
  it('changes actual offline recommendations for explicit styles and soft gender preferences without changing the birth chart',()=>{
    const dataset=JSON.parse(readFileSync(new URL('../data/dataset.json',import.meta.url),'utf8')) as {characters:CharacterEntry[];citations:Citation[]};
    const original=JSON.stringify(analysis);
    const make=(style:string,gender:BirthProfile['gender']='中性')=>generateLocal({...baby,gender},pref({style,meanings:''}),analysis,dataset.characters,dataset.citations,7);
    const book=make('温润书卷'),nature=make('明快自然'),modern=make('简约现代');
    const names=(r:ReturnType<typeof make>)=>r.candidates.map(c=>c.givenName);
    expect(names(book)).not.toEqual(names(nature));expect(names(modern)).not.toEqual(names(book));
    // Style remains a soft preference: keep alternate directions rather than enforcing an exclusion rule.
    expect(book.candidates.filter(c=>c.reason.includes('风格适配')).length).toBeGreaterThanOrEqual(8);
    const bookName=evaluateName('书宁',baby,pref({style:'温润书卷',meanings:''}),analysis,dataset.characters,dataset.citations)!;
    const brightName=evaluateName('书宁',baby,pref({style:'明快自然',meanings:''}),analysis,dataset.characters,dataset.citations)!;
    expect(bookName.evaluation.meaning).toBeGreaterThan(brightName.evaluation.meaning);
    const male=make('','男'),female=make('','女'),neutral=make('','中性');
    expect(names(male)).not.toEqual(names(female));expect(names(neutral)).not.toEqual(names(male));
    const allowed=evaluateName('昊远',{...baby,gender:'女'},pref({style:'',meanings:''}),analysis,dataset.characters,dataset.citations);
    expect(allowed).not.toBeNull();expect(allowed!.reason).toContain('不限制可用字');
    const masculine=evaluateName('昊远',{...baby,gender:'男'},pref({style:'',meanings:''}),analysis,dataset.characters,dataset.citations)!;
    expect(masculine.evaluation.meaning).toBeGreaterThan(allowed!.evaluation.meaning);
    const explicitBook=evaluateName('书宁',{...baby,gender:'男'},pref({style:'温润书卷',meanings:''}),analysis,dataset.characters,dataset.citations)!;
    const otherGender=evaluateName('书宁',{...baby,gender:'女'},pref({style:'明快自然',meanings:''}),analysis,dataset.characters,dataset.citations)!;
    expect(explicitBook.evaluation.meaning).toBeGreaterThan(otherGender.evaluation.meaning);
    expect(neutral.candidates.every(c=>c.reason.includes('不增加性别语感偏好'))).toBe(true);
    expect(JSON.stringify(analysis)).toBe(original);
    expect(analyzeProfile({...baby,gender:'男'})).toEqual(analyzeProfile({...baby,gender:'女'}));
  });
  it('keeps meanings fluent for polysemous source words without rewriting dictionary entries',()=>{
    const dataset=JSON.parse(readFileSync(new URL('../data/dataset.json',import.meta.url),'utf8')) as {characters:CharacterEntry[];citations:Citation[]};
    const make=(name:string)=>evaluateName(name,baby,pref(),analysis,dataset.characters,dataset.citations)!;
    const calm=make('安然'),detail=make('知微');
    expect(calm.meaning).toContain('平安自在');expect(calm.meaning).not.toContain('燒');expect(calm.characters[1].readings?.[0].meanings).toContain('燒。燃的本字。');
    expect(detail.meaning).toContain('由细节理解事理');expect(detail.meaning).not.toContain('隱匿');
    expect(detail.characters[1].readings?.some(r=>r.meanings.includes('隱匿。'))).toBe(true);
    for(const name of ['乐安','予和','知微'])expect(make(name).citations).toEqual([]);
    const harmony=make('和乐');expect(harmony.pinyin).toContain('lè');expect(harmony.citations[0].id).toBe('shijing-161-3');
  });
  it('provides different seeded batches, reproduces a seed and excludes all previously offered names',()=>{
    const dataset=JSON.parse(readFileSync(new URL('../data/dataset.json',import.meta.url),'utf8')) as {characters:CharacterEntry[];citations:Citation[]};
    const make=(seed:number,excludes:string[]=[])=>generateLocal(baby,pref(),analysis,dataset.characters,dataset.citations,seed,excludes);
    const names=(result:ReturnType<typeof make>)=>result.candidates.map(c=>c.givenName);
    const first=make(0);expect(names(make(0))).toEqual(names(first));expect(names(make(1))).not.toEqual(names(first));
    const signatures=new Set(Array.from({length:14},(_,seed)=>names(make(seed)).join(',')));expect(signatures.size).toBeGreaterThanOrEqual(10);
    const second=make(0,first.candidates.map(c=>c.fullName));expect(second.candidates).toHaveLength(12);expect(names(second).every(name=>!names(first).includes(name))).toBe(true);
    const limited=generateLocal(baby,pref({length:1,requiredChars:'安'}),analysis,dataset.characters,dataset.citations,5,['安']);
    expect(limited.candidates).toEqual([]);expect(limited.messages.join('')).toContain('新候选已用尽');
  },15000);
});
