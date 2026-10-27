import{readFileSync}from'node:fs';
import{gunzipSync}from'node:zlib';
import{describe,it,expect}from'vitest';
import type{CharacterEntry}from'../src/shared/types';

const dataset=JSON.parse(readFileSync(new URL('../data/dataset.json',import.meta.url),'utf8')) as {characters:CharacterEntry[]};
const original=JSON.parse(gunzipSync(readFileSync(new URL('../data/raw/moe-revised.json.gz',import.meta.url))).toString('utf8')) as {title:string;heteronyms:{pinyin?:string;definitions:{def:string}[]}[]}[];
const dictionary=new Map(original.map(entry=>[entry.title,entry]));
const numbers:Record<string,number>={一:0,二:1,三:2,四:3,五:4,六:5,七:6,八:7,九:8};
const pinyin=(value:string|undefined)=>(value||'').replace(/[（(][^）)]*[）)]/g,'').trim();
describe('pronunciation-to-definition source integrity',()=>{
  it('retains the exact definitions associated with each MOE heteronym, resolving only explicit numbered aliases',()=>{
    expect(dataset.characters.length).toBeGreaterThanOrEqual(500);
    for(const character of dataset.characters.filter(entry=>entry.sourceId==='moe-revised')){
      const entry=dictionary.get(character.readings![0].word)!;expect(entry).toBeDefined();
      for(const reading of character.readings!){
        const heteronym=entry.heteronyms.find(item=>pinyin(item.pinyin)===reading.pinyin)!;expect(heteronym,`${character.char}/${reading.pinyin}`).toBeDefined();
        let defs=heteronym.definitions.map(def=>def.def);let remaining=entry.heteronyms.length;
        while(defs.length===1&&remaining-->0){const reference=/^[（(]([一二三四五六七八九])[）)]之(?:又音|語音|讀音)。?$/.exec(defs[0]);if(!reference)break;defs=entry.heteronyms[numbers[reference[1]]].definitions.map(def=>def.def);}
        expect(reading.meanings.every(def=>defs.includes(def)),`${character.char}/${reading.pinyin}: unexpected definition`).toBe(true);
      }
      expect(character.readings!.some(reading=>reading.pinyin===character.pinyin)).toBe(true);
    }
  });
  it('uses the intended naming readings for the three audited mismatches and preserves alternate senses separately',()=>{
    const char=(word:string)=>dataset.characters.find(entry=>entry.char===word)!;
    expect(char('朝').pinyin).toBe('zhāo');expect(char('朝').meaning).toContain('早晨');expect(char('朝').readings!.find(r=>r.pinyin==='cháo')!.meanings).not.toContain('早晨。');
    expect(char('长').pinyin).toBe('cháng');expect(char('长').meaning).toContain('時間久遠');expect(char('长').readings!.find(r=>r.pinyin==='zhǎng')!.meanings).toContain('生長、發育。');
    expect(char('乐').pinyin).toBe('lè');expect(char('乐').meaning).toContain('歡喜、愉悅');expect(char('乐').meaning).not.toContain('和諧動人的聲音');expect(char('乐').readings!.find(r=>r.pinyin==='yuè')!.meanings).toContain('有規律而和諧動人的聲音。');
    for(const word of ['朝','长','乐'])expect(char(word).polyphonic).toBe(true);
    expect(char('然').polyphonic).toBe(false);expect(char('安').polyphonic).toBe(false);
  });
  it('selects the actual pine word for 松 and preserves source definitions for the five restored citation characters',()=>{
    const pine=dataset.characters.find(c=>c.char==='松')!;expect(pine.traditional).toBe('松');expect(pine.pinyin).toBe('sōng');
    expect(pine.readings!.every(r=>r.word==='松')).toBe(true);expect(pine.meaning).toContain('松科植物');expect(pine.meaning).not.toContain('鬆弛');
    for(const [word,reading]of [['厚','hòu'],['自','zì'],['强','qiáng'],['升','shēng'],['慎','shèn']]){
      const c=dataset.characters.find(c=>c.char===word)!;expect(c,word).toBeDefined();expect(c.pinyin).toBe(reading);expect(c.sourceId).toBe('moe-revised');expect(c.readings!.some(r=>r.pinyin===reading&&r.meanings.includes(c.meaning.split('；')[0]))).toBe(true);
    }
  });
});
