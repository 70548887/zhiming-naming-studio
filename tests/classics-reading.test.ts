import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {mapClassicReadingMatch,parseClassicReading,type ClassicReading} from '../src/shared/classics-reading';

const chars=(text:string)=>[...text];
function assertMapping(raw:string,start:number,reading:ClassicReading){
  expect(reading.sourceStart).toBe(start);expect(reading.sourceEnd).toBe(start+chars(raw).length);
  expect(reading.text).toBe(reading.spans.map(span=>span.text).join(''));
  let display=0;
  for(const span of reading.spans){
    expect(span.displayStart).toBe(display);expect(span.displayEnd-span.displayStart).toBe(chars(span.text).length);display=span.displayEnd;
    expect(span.sourceEnd).toBeGreaterThan(span.sourceStart);
    if(span.kind==='source-text')expect(chars(raw).slice(span.sourceStart-start,span.sourceEnd-start).join('')).toBe(span.text);
    else expect(['\n','\t']).toContain(span.text);
  }
  const ranges=[...reading.spans,...reading.hiddenRanges].sort((a,b)=>a.sourceStart-b.sourceStart);
  let source=start;for(const range of ranges){expect(range.sourceStart).toBe(source);source=range.sourceEnd;}expect(source).toBe(start+chars(raw).length);
}
const examples=[
  {raw:'{{annotate|任氏曰：原字，原义。}}',text:'任氏曰：原字，原义。'},
  {raw:'{{*|原注：天地之理。}}',text:'原注：天地之理。'},
  {raw:'{{annotate|任氏曰：{{*|原注：嵌套。}}仍保留。}}',text:'任氏曰：原注：嵌套。仍保留。'},
  {raw:'{{annotate|正文{{unknown|未知正文}}后文}}',text:'正文{{unknown|未知正文}}后文'},
  {raw:'{{Header|title=滴天髓|author=任鐵樵|notes=另見《[[滴天髓]]》。|next=}}',text:'滴天髓\n任鐵樵\n另見《滴天髓》。'},
  {raw:'{{header\n| title = \n| author = \n| notes = \n}}\n正文',text:'\n正文'},
  {raw:'{{Header|title=原题|newField=未知正文}}',text:'{{Header|title=原题|newField=未知正文}}'},
  {raw:'{{Header|title=原题|title=重复值}}',text:'{{Header|title=原题|title=重复值}}'},
  {raw:'{{PUA|\ue10f}}',text:'\ue10f'},
  {raw:'{{PUA|𰀀}}',text:'{{PUA|𰀀}}'},
  {raw:'{{PUA|文}}',text:'{{PUA|文}}'},
  {raw:'{{PUA|\u{f0001}}}',text:'\u{f0001}'},
  {raw:'==通神论==\n=== 一、天道 ===\n= 五行总论 =',text:'通神论\n一、天道\n五行总论'},
  {raw:'==未闭标题=\n不是==行首==',text:'==未闭标题=\n不是==行首=='},
  {raw:"'''二月丙火'''，'''<big>（甲于各月）</big>'''",text:'二月丙火，（甲于各月）'},
  {raw:"''斜体''与'''粗体'''",text:'斜体与粗体'},
  {raw:"'''未闭粗体\n普通原字",text:"'''未闭粗体\n普通原字"},
  {raw:'<onlyinclude>原字</onlyinclude>',text:'原字'},
  {raw:'<onlyinclude>本节正文',text:'本节正文'},
  {raw:'<onlyinclude 不完整',text:'<onlyinclude 不完整'},
  {raw:'<script>正文</script><unknown>未知标签</unknown>',text:'<script>正文</script><unknown>未知标签</unknown>'},
  {raw:'[[滴天髓]]，[[目标|显示原字]]',text:'滴天髓，显示原字'},
  {raw:'{{清朝作品}}',text:'{{清朝作品}}'},
  {raw:'{{annotate|任氏曰：截断',text:'{{annotate|任氏曰：截断'},
  {raw:'{{annotate|正文|未知额外参数}}',text:'{{annotate|正文|未知额外参数}}'},
  {raw:'{{unknown|{{annotate|内文}}}}',text:'{{unknown|{{annotate|内文}}}}'},
  {raw:'{| class="wikitable"\n|时日月年\n\n庚丙庚丙\n\n寅午寅午\n|时日月年\n壬丙戊庚\n辰寅寅寅\n|}',text:'\n时日月年\n\n庚丙庚丙\n\n寅午寅午\n时日月年\n壬丙戊庚\n辰寅寅寅\n'},
  {raw:'{| class="wikitable"\n|+ 原表题\n! 年 !! 月\n|-\n| 甲 || 乙\n|}',text:'\n 原表题\n 年 \t 月\n\n 甲 \t 乙\n'},
  {raw:'{| class="unknown"\n|{{annotate|未知表正文}}\n|}',text:'{| class="unknown"\n|{{annotate|未知表正文}}\n|}'},
  {raw:'{| class="wikitable"\n|截断表\n{{annotate|仍留格式}}',text:'{| class="wikitable"\n|截断表\n{{annotate|仍留格式}}'},
  {raw:'{| class="wikitable"\n|style="x"|未知样式正文\n|}',text:'{| class="wikitable"\n|style="x"|未知样式正文\n|}'},
];

describe('source-mapped plain classic reading',()=>{
  it.each(examples)('safely displays $raw',({raw,text})=>{const reading=parseClassicReading(raw,37);expect(reading.text).toBe(text);assertMapping(raw,37,reading);});

  it('maps an exact supplementary/PUA source hit using codepoints rather than UTF-16 offsets',()=>{
    const raw='𠮷{{annotate|任氏曰：\ue10f甲。}}后文',reading=parseClassicReading(raw,100),source=chars(raw);
    const start=100+source.indexOf('\ue10f'),result=mapClassicReadingMatch(reading,start,start+2);
    expect(result).toHaveLength(1);expect(chars(reading.text).slice(result[0].displayStart,result[0].displayEnd).join('')).toBe('\ue10f甲');
    expect(result[0].sourceStart).toBe(start);assertMapping(raw,100,reading);
  });

  it('maps one source match across removed formatting to multiple visible ranges without highlighting syntax',()=>{
    const raw='前{{annotate|中}}后',reading=parseClassicReading(raw),mapped=mapClassicReadingMatch(reading,0,chars(raw).length);
    expect(mapped.map(range=>chars(reading.text).slice(range.displayStart,range.displayEnd).join(''))).toEqual(['前','中','后']);
    expect(mapClassicReadingMatch(reading,1,13)).not.toHaveLength(0);
    const syntax=reading.hiddenRanges[0];expect(mapClassicReadingMatch(reading,syntax.sourceStart,syntax.sourceEnd)).toEqual([]);
  });

  it('keeps Header notes and safely maps source text around inserted metadata separators',()=>{
    const raw='{{Header|title=原题|notes=不能丢的注释}}',reading=parseClassicReading(raw,9),source=chars(raw),start=9+source.indexOf('不');
    expect(reading.text).toBe('原题\n不能丢的注释');
    const match=mapClassicReadingMatch(reading,start,start+7);expect(match).toHaveLength(1);expect(chars(reading.text).slice(match[0].displayStart,match[0].displayEnd).join('')).toBe('不能丢的注释');
    assertMapping(raw,9,reading);
  });

  it('does not emit HTML elements or invent replacement characters',()=>{
    const reading=parseClassicReading('{{annotate|<img src=x onerror=alert(1)>原字\ue10f}}');
    expect(reading.text).toBe('<img src=x onerror=alert(1)>原字\ue10f');
    expect(reading.spans.every(span=>typeof span.text==='string')).toBe(true);
    expect(reading.text).not.toContain('\ufffd');
  });

  it('rejects unsafe source offsets and treats invalid/outside match ranges as empty',()=>{
    for(const start of [-1,NaN,Infinity,0.5,Number.MAX_SAFE_INTEGER])expect(()=>parseClassicReading('字',start)).toThrow();
    const reading=parseClassicReading('原文',10);for(const pair of [[10,10],[12,11],[NaN,12],[-10,-1],[20,25]])expect(mapClassicReadingMatch(reading,pair[0],pair[1])).toEqual([]);
  });

  it('limits recursion while preserving all text and source ranges in deeply nested known formatting',()=>{
    const raw='{{annotate|'.repeat(50)+'正文'+'}}'.repeat(50),reading=parseClassicReading(raw);
    expect(reading.text).toContain('正文');expect(reading.text).toContain('{{annotate|');assertMapping(raw,0,reading);
  });

  it.each([
    {file:'data/raw/classics-ditian-2600158.wiki',sha256:'1d1a3d61c1b9a26618b41b8ead857a6b966992fdf2adabdc607a0c6cb4c8f04d'},
    {file:'data/raw/classics-qiongtong-2294674.wiki',sha256:'8ba17242f116583de2e10172e006f5ce5f74b23ccfc0bd24b886be135e9f20bd'},
  ])('$file keeps every displayed source range exact, all source offsets accounted for, and ordinary author words unchanged',({file,sha256})=>{
    const bytes=readFileSync(file);expect(createHash('sha256').update(bytes).digest('hex')).toBe(sha256);
    const raw=bytes.toString('utf8'),reading=parseClassicReading(raw);assertMapping(raw,0,reading);
    expect(reading.text).not.toMatch(/\{\{(?:[Hh]eader|annotate|\*|PUA)(?:\||\n)/);
    expect(reading.text).not.toContain('<onlyinclude>');expect(reading.text).not.toContain('<big>');
    if(file.includes('ditian')){expect(reading.text).toContain('原注：天有阴阳');expect(reading.text).toContain('任氏曰：干为天元');expect(reading.text).toContain('{{清朝作品}}');}
    else{
      const pua=chars(raw).flatMap((char,index)=>{const cp=char.codePointAt(0)!;return cp>=0xe000&&cp<=0xf8ff?[{char,index}]:[];});expect(pua).toHaveLength(9);
      for(const item of pua){const match=mapClassicReadingMatch(reading,item.index,item.index+1);expect(match).toHaveLength(1);expect(chars(reading.text).slice(match[0].displayStart,match[0].displayEnd).join('')).toBe(item.char);}
      expect(reading.text).toContain('庚丙庚丙\n\n寅午寅午');expect(reading.text).not.toContain('{| class="wikitable"');
    }
  });
});
