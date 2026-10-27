import sourceProfile from './word-profile.json' with {type:'json'};
import {canonicalPlainJson,calculateNamePhoneticReview} from '../name-phonetic/name-phonetic-engine.mjs';
import {WORD_PROFILE_SHA256,WORD_LOCK_SHA256} from './word-pins.mjs';
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const profile=freeze(sourceProfile);
export function getImportedWordProfile(){return structuredClone(profile);}
/** Source-word pronunciation references, never a substitute for the selected name reading. */
export function calculateWrittenWordReferences(input){
 canonicalPlainJson(input);
 const reviewed=calculateNamePhoneticReview(input),glyphs=[...reviewed.fullName],surnameLength=[...input.surname].length,references=[];
 for(const record of profile.records.filter(r=>r.language===reviewed.language)){
  const count=[...record.word].length;
  for(let start=0;start+count<=glyphs.length;start++){
   const endExclusive=start+count,text=glyphs.slice(start,endExclusive).join('');
   if(endExclusive<=surnameLength||!record.forms.includes(text))continue;
   const actualTokens=reviewed.status==='assessed'?reviewed.selectedTokens.slice(start,endExclusive):[];
   let comparison='unconfirmed',alignedByMode=false,differentPositions=[];
   if(reviewed.status==='assessed'){
    const exact=actualTokens.every((t,i)=>t===record.tokens[i]),bare=actualTokens.every((t,i)=>t.slice(0,-1)===record.tokens[i].slice(0,-1));
    comparison=exact?'exact':bare?'tone-only':'different-phonemes';alignedByMode=exact||input.mode==='ignore-tone'&&bare;
    differentPositions=actualTokens.flatMap((t,i)=>t===record.tokens[i]?[]:[start+i]);
   }
   const scope=start===0&&endExclusive===glyphs.length?'whole-full-name':start===surnameLength&&endExclusive===glyphs.length?'whole-given-name':start<surnameLength?'cross-surname-given':'given-subspan';
   references.push({id:record.id,word:record.word,span:{start,endExclusive,text,scope},sourceTokens:[...record.tokens],actualTokens,comparison,alignedByMode,differentPositions,originalPinyin:record.originalPinyin,definitions:structuredClone(record.definitions),source:structuredClone(record.source),variantEvidence:structuredClone(record.variantEvidence),interpretation:record.interpretation});
  }
 }
 return freeze({version:profile.version,language:reviewed.language,mode:reviewed.mode,fullName:reviewed.fullName,status:reviewed.status==='not-assessed'?'not-assessed':references.length?'source-word-reference':'no-covered-word',selectedTokens:[...reviewed.selectedTokens],missing:[...reviewed.missing],references,profileSha256:WORD_PROFILE_SHA256,sourceLockSha256:WORD_LOCK_SHA256,scope:profile.scope,notice:reviewed.status==='not-assessed'?'存在未确认音，整词音序对比暂停。':'只比较这批固定原词的文字与所选音序；未覆盖、未对齐或已对齐均不代表姓名读音错误、义项已采用或谐音安全。',limitations:[...profile.policy]});
}
