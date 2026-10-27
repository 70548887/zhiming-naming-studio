export const SNAPSHOT_RAW_MAX_BYTES=16*1024*1024;
export const SNAPSHOT_JSON_MAX_DEPTH=64;
export type SnapshotPart={kind:'raw';text:string}|{kind:'field';key:'analysis'|'sourceSnapshot';text:string};
type FieldSpan={key:string;start:number;end:number};

/** Scan before parsing so JSON.parse cannot hide duplicate keys or see an over-deep value. */
function scanSnapshotJson(text:string,maxBytes:number):FieldSpan[]{
 if(typeof text!=='string'||!Number.isSafeInteger(maxBytes)||maxBytes<1||Buffer.byteLength(text,'utf8')>maxBytes)throw new Error(maxBytes===SNAPSHOT_RAW_MAX_BYTES?'保存快照超过单条16MiB限制。':'保存快照JSON超过大小限制。');
 let i=0;
 const fields:FieldSpan[]=[];
 const invalid=():never=>{throw new Error('保存快照JSON结构无效。');};
 const ws=()=>{while(i<text.length){const c=text.charCodeAt(i);if(c!==0x20&&c!==0x09&&c!==0x0a&&c!==0x0d)break;i++;}};
 const digit=(c:number)=>c>=0x30&&c<=0x39;
 function string(decode=false):string{
  if(text[i++]!=='"')return invalid();
  const chunks:string[]=[];let from=i;
  while(i<text.length){
   const c=text.charCodeAt(i++);
   if(c===0x22){if(decode)chunks.push(text.slice(from,i-1));return decode?chunks.join(''):'';}
   if(c<0x20)return invalid();
   if(c!==0x5c)continue;
   if(decode)chunks.push(text.slice(from,i-1));
   const escape=text[i++];let decoded:string;
   if(escape==='"'||escape==='\\'||escape==='/')decoded=escape;
   else if(escape==='b')decoded='\b';
   else if(escape==='f')decoded='\f';
   else if(escape==='n')decoded='\n';
   else if(escape==='r')decoded='\r';
   else if(escape==='t')decoded='\t';
   else if(escape==='u'){
    const hex=text.slice(i,i+4);if(hex.length!==4||!/^[0-9a-fA-F]{4}$/.test(hex))return invalid();
    decoded=String.fromCharCode(Number.parseInt(hex,16));i+=4;
   }else return invalid();
   if(decode)chunks.push(decoded);from=i;
  }
  return invalid();
 }
 function number():void{
  if(text[i]==='-')i++;
  if(text[i]==='0')i++;
  else{if(!digit(text.charCodeAt(i))||text[i]==='0')return invalid();while(digit(text.charCodeAt(i)))i++;}
  if(text[i]==='.'){i++;if(!digit(text.charCodeAt(i)))return invalid();while(digit(text.charCodeAt(i)))i++;}
  if(text[i]==='e'||text[i]==='E'){i++;if(text[i]==='+'||text[i]==='-')i++;if(!digit(text.charCodeAt(i)))return invalid();while(digit(text.charCodeAt(i)))i++;}
 }
 function value(depth:number,captureFields=false):void{
  const c=text[i];
  if(c==='"'){string();return;}
  if(c==='{'||c==='['){
   // The saved snapshot root remains level zero, matching the existing depth budget.
   if(depth>SNAPSHOT_JSON_MAX_DEPTH)throw new Error('保存快照嵌套过深。');
   i++;ws();
   if(c==='{'){
    const seen=new Set<string>();if(text[i]==='}'){i++;return;}
    while(i<text.length){
     const key=string(true);if(seen.has(key))throw new Error('保存快照包含重复字段。');seen.add(key);ws();
     if(text[i++]!==':')return invalid();ws();const start=i;value(depth+1);
     if(captureFields)fields.push({key,start,end:i});ws();
     if(text[i]==='}'){i++;return;}if(text[i++]!==',')return invalid();ws();
    }
   }else{
    if(text[i]===']'){i++;return;}
    while(i<text.length){value(depth+1);ws();if(text[i]===']'){i++;return;}if(text[i++]!==',')return invalid();ws();}
   }
   return invalid();
  }
  for(const literal of ['true','false','null'])if(text.startsWith(literal,i)){i+=literal.length;return;}
  if(c==='-'||digit(text.charCodeAt(i))){number();return;}
  return invalid();
 }
 ws();value(0,text[i]==='{');ws();if(i!==text.length)throw new Error('JSON结尾含额外数据。');return fields;
}

/** Parse any bounded JSON value after all object levels have passed duplicate/depth checks. */
export function parseSnapshotJsonStrict(text:string,maxBytes=SNAPSHOT_RAW_MAX_BYTES):unknown{
 scanSnapshotJson(text,maxBytes);return JSON.parse(text);
}

/** Return exact original substrings. This function never serializes a parsed value. */
export function splitImmutableSnapshotJson(text:string):{parts:SnapshotPart[]}{
 const fields=scanSnapshotJson(text,SNAPSHOT_RAW_MAX_BYTES),parsed=JSON.parse(text);
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('保存快照必须为JSON对象。');
 const parts:SnapshotPart[]=[];let from=0;
 for(const field of fields){
  if(field.key!=='analysis'&&field.key!=='sourceSnapshot')continue;
  if(field.start>from)parts.push({kind:'raw',text:text.slice(from,field.start)});
  parts.push({kind:'field',key:field.key,text:text.slice(field.start,field.end)});from=field.end;
 }
 if(from<text.length)parts.push({kind:'raw',text:text.slice(from)});
 if(parts.map(p=>p.text).join('')!==text)throw new Error('保存快照分段不完整。');
 return{parts};
}
