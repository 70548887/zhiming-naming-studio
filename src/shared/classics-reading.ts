/** Display-only wiki formatting. Source coordinates are absolute Unicode codepoints. */
export interface ClassicReadingSpan {
  text:string;
  sourceStart:number;
  sourceEnd:number;
  displayStart:number;
  displayEnd:number;
  /** Separators replace known formatting, never source prose. */
  kind:'source-text'|'separator';
}
export interface ClassicReadingHiddenRange {sourceStart:number;sourceEnd:number;reason:string;}
export interface ClassicReading {
  text:string;
  sourceStart:number;
  sourceEnd:number;
  spans:ClassicReadingSpan[];
  hiddenRanges:ClassicReadingHiddenRange[];
}
export interface ClassicReadingMatch {displayStart:number;displayEnd:number;sourceStart:number;sourceEnd:number;}

const HEADER_FIELDS=new Set(['title','author','translator','section','previous','next','year','times','type','from','notes']);
const isPrivateUse=(text:string)=>{const chars=[...text];if(chars.length!==1)return false;const cp=chars[0].codePointAt(0)!;return cp>=0xe000&&cp<=0xf8ff||cp>=0xf0000&&cp<=0xffffd||cp>=0x100000&&cp<=0x10fffd;};

/**
 * Converts only the fixed books' understood formatting to plain reading text.
 * Retained source text is byte-for-character identical; no HTML is generated.
 * Unknown/unfinished templates and tables remain visible in full. Complete
 * onlyinclude/big tag tokens can be removed independently at section boundaries.
 */
export function parseClassicReading(rawText:string,sourceStart=0):ClassicReading {
  if(typeof rawText!=='string'||!Number.isSafeInteger(sourceStart)||sourceStart<0)throw new TypeError('原典阅读需要原文及非负整数码点起点。');
  const chars=[...rawText],size=chars.length;
  if(!Number.isSafeInteger(sourceStart+size))throw new RangeError('原典码点范围超出安全整数。');
  const spans:ClassicReadingSpan[]=[],hiddenRanges:ClassicReadingHiddenRange[]=[];
  let displayLength=0;
  const slice=(start:number,end:number)=>chars.slice(start,end).join('');
  const at=(start:number,value:string)=>value.split('').every((char,index)=>chars[start+index]===char);
  const emit=(start:number,end:number,replacement?:string)=>{
    if(end<=start)return;
    const text=replacement??slice(start,end);if(!text)return;
    const length=[...text].length,kind=replacement===undefined?'source-text':'separator';
    const prior=spans.at(-1);
    if(kind==='source-text'&&prior?.kind===kind&&prior.sourceEnd===sourceStart+start&&prior.displayEnd===displayLength){prior.text+=text;prior.sourceEnd=sourceStart+end;prior.displayEnd+=length;}
    else spans.push({text,sourceStart:sourceStart+start,sourceEnd:sourceStart+end,displayStart:displayLength,displayEnd:displayLength+length,kind});
    displayLength+=length;
  };
  const hide=(start:number,end:number,reason:string)=>{if(end<=start)return;const prior=hiddenRanges.at(-1);if(prior&&prior.sourceEnd===sourceStart+start&&prior.reason===reason)prior.sourceEnd=sourceStart+end;else hiddenRanges.push({sourceStart:sourceStart+start,sourceEnd:sourceStart+end,reason});};
  const trim=(start:number,end:number)=>{while(start<end&&/\s/u.test(chars[start]))start++;while(end>start&&/\s/u.test(chars[end-1]))end--;return{start,end};};
  const templateEnd=(start:number,end:number)=>{
    let nesting=0;
    for(let index=start;index<end-1;index++){
      if(at(index,'{{')){nesting++;index++;}
      else if(at(index,'}}')){nesting--;index++;if(nesting===0)return index+1;}
    }
    return null;
  };
  const parts=(start:number,end:number)=>{
    const result:{start:number;end:number}[]=[];let begin=start,nesting=0,links=0;
    for(let index=start;index<end;index++){
      if(at(index,'{{')){nesting++;index++;}
      else if(at(index,'}}')){nesting--;index++;}
      else if(at(index,'[[')){links++;index++;}
      else if(at(index,']]')){links--;index++;}
      else if(chars[index]==='|'&&nesting===0&&links===0){result.push({start:begin,end:index});begin=index+1;}
    }
    result.push({start:begin,end});return result;
  };
  const render=(start:number,end:number,depth:number,tableBody=false):void=>{
    if(depth>32){emit(start,end);return;}
    let plain=start,index=start;
    const flush=()=>{emit(plain,index);};
    while(index<end){
      if(at(index,'{{')){
        const finish=templateEnd(index,end);flush();
        if(finish===null){emit(index,end);return;}
        const items=parts(index+2,finish-2),name=slice(items[0].start,items[0].end).trim().toLowerCase();
        if((name==='annotate'||name==='*')&&items.length===2){
          hide(index,items[1].start,'commentary-template');render(items[1].start,items[1].end,depth+1);hide(items[1].end,finish,'commentary-template');
        }else if(name==='pua'&&items.length===2&&isPrivateUse(slice(items[1].start,items[1].end))){
          hide(index,items[1].start,'private-use-template');emit(items[1].start,items[1].end);hide(items[1].end,finish,'private-use-template');
        }else if(name==='header'){
          const values:{start:number;end:number}[]=[],keys=new Set<string>();let known=items.length>1;
          for(const item of items.slice(1)){
            const equals=slice(item.start,item.end).indexOf('=');
            if(equals<0){known=false;break;}
            const prefix=slice(item.start,item.end).slice(0,equals),key=prefix.trim().toLowerCase();
            if(!HEADER_FIELDS.has(key)||keys.has(key)){known=false;break;}keys.add(key);
            const value=trim(item.start+[...prefix].length+1,item.end);if(value.end>value.start)values.push(value);
          }
          if(!known)emit(index,finish);
          else if(!values.length)hide(index,finish,'empty-header');
          else{
            let previous=index;
            for(const[valueIndex,value]of values.entries()){
              if(valueIndex===0)hide(previous,value.start,'header-format');else emit(previous,value.start,'\n');
              render(value.start,value.end,depth+1);previous=value.end;
            }
            hide(previous,finish,'header-format');
          }
        }else emit(index,finish);
        index=finish;plain=index;continue;
      }
      if(at(index,'[[')){
        const close=rawText.length?slice(index+2,end).indexOf(']]'):-1;
        if(close>=0){
          const insideEnd=index+2+[...slice(index+2,end).slice(0,close)].length,items=parts(index+2,insideEnd);
          if(items.length<=2&&items.every(item=>!slice(item.start,item.end).includes('\n'))){
            flush();const label=items.at(-1)!;hide(index,label.start,'wiki-link');render(label.start,label.end,depth+1);hide(label.end,insideEnd+2,'wiki-link');index=insideEnd+2;plain=index;continue;
          }
        }
      }
      if(chars[index]==='<'){
        const tag=slice(index,Math.min(index+24,end)).match(/^<\/?(?:onlyinclude|big)>/i)?.[0];
        if(tag){flush();hide(index,index+tag.length,'display-tag');index+=tag.length;plain=index;continue;}
      }
      if((index===0||chars[index-1]==='\n')&&chars[index]==='='){
        let finish=index;while(finish<end&&chars[finish]!=='\n'&&chars[finish]!=='\r')finish++;
        const line=slice(index,finish),heading=line.match(/^(={1,6})(?!=)[ \t]*(.*?)[ \t]*\1[ \t]*$/);
        if(heading&&heading[2].length&& !heading[2].startsWith('=')){
          const bodyStart=index+[...line.slice(0,line.indexOf(heading[2],heading[1].length))].length,bodyEnd=bodyStart+[...heading[2]].length;
          flush();hide(index,bodyStart,'heading-format');render(bodyStart,bodyEnd,depth+1);hide(bodyEnd,finish,'heading-format');index=finish;plain=index;continue;
        }
      }
      if((index===0||chars[index-1]==='\n')&&at(index,'{|')){
        let lineEnd=index;while(lineEnd<end&&chars[lineEnd]!=='\n'&&chars[lineEnd]!=='\r')lineEnd++;
        const opening=slice(index,lineEnd);
        let close=-1,closeEnd=-1;
        if(/^\{\|[ \t]+class=["']wikitable["'][ \t]*$/.test(opening)){
          for(let seek=lineEnd;seek<end-1;seek++)if((seek===0||chars[seek-1]==='\n')&&at(seek,'|}')){
            let finish=seek+2;while(finish<end&&chars[finish]!=='\n'&&chars[finish]!=='\r')finish++;
            if(!slice(seek+2,finish).trim()){close=seek;closeEnd=finish;break;}
          }
        }
        if(close>=0){
          const body=slice(lineEnd,close);
          const unknownCellFormatting=body.split('\n').some(line=>/^\|-[^\S\r\n]*\S/.test(line)||/^[|!][^\n]*\|[^|]/.test(line.replace(/\|\|/g,'')));
          if(!body.includes('{|')&&!unknownCellFormatting){
            flush();hide(index,lineEnd,'table-frame');render(lineEnd,close,depth+1,true);hide(close,closeEnd,'table-frame');index=closeEnd;plain=index;continue;
          }
          flush();emit(index,closeEnd);index=closeEnd;plain=index;continue;
        }
        // Unknown or incomplete table syntax is kept intact, including its body.
        if(close<0){flush();emit(index,end);return;}
      }
      if(tableBody&&(at(index,'||')||at(index,'!!'))){flush();emit(index,index+2,'\t');index+=2;plain=index;continue;}
      if(tableBody&&(index===0||chars[index-1]==='\n')&&(chars[index]==='|'||chars[index]==='!')&&!at(index,'|}')){
        const prefix=at(index,'|-')||at(index,'|+')?2:1;flush();hide(index,index+prefix,'table-cell');index+=prefix;plain=index;continue;
      }
      if(chars[index]==="'"&&chars[index-1]!=="'"){
        let count=0;while(chars[index+count]==="'")count++;
        if(count===2||count===3){
          let close=index+count;
          while(close<end&&chars[close]!=='\n'){
            if(chars[close]==="'"&&chars[close-1]!=="'"){
              let closing=0;while(chars[close+closing]==="'")closing++;
              if(closing===count)break;close+=closing;
            }else close++;
          }
          if(close<end&&chars[close]!== '\n'){
            flush();hide(index,index+count,'emphasis-format');render(index+count,close,depth+1);hide(close,close+count,'emphasis-format');index=close+count;plain=index;continue;
          }
        }
      }
      index++;
    }
    emit(plain,end);
  };
  render(0,size,0);
  return{text:spans.map(span=>span.text).join(''),sourceStart,sourceEnd:sourceStart+size,spans,hiddenRanges};
}

/** A syntax-only hit has no visible range; callers should offer the original view. */
export function mapClassicReadingMatch(reading:ClassicReading,start:number,end:number):ClassicReadingMatch[] {
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||end<=start)return[];
  const result:ClassicReadingMatch[]=[];
  for(const span of reading.spans){
    if(span.kind!=='source-text')continue;
    const sourceStart=Math.max(start,span.sourceStart),sourceEnd=Math.min(end,span.sourceEnd);if(sourceEnd<=sourceStart)continue;
    const displayStart=span.displayStart+sourceStart-span.sourceStart,displayEnd=span.displayStart+sourceEnd-span.sourceStart;
    const prior=result.at(-1);
    if(prior&&prior.displayEnd===displayStart&&prior.sourceEnd===sourceStart){prior.displayEnd=displayEnd;prior.sourceEnd=sourceEnd;}
    else result.push({displayStart,displayEnd,sourceStart,sourceEnd});
  }
  return result;
}
