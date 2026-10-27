import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(process.env.ELEMENT_SOURCE_ROOT||path.resolve(HERE,'../../../..'));
const COMMIT='a6dc997417507eb510fc29822bc514de2c92728c';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const jsonSha=o=>sha(JSON.stringify(o));
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const clean=s=>(s||'').replace(/（[^）]*）|\([^)]*\)/g,'').replace(/\s+/g,'').trim();
const atomic=(p,s)=>{const t=p+'.'+process.pid+'.tmp';fs.writeFileSync(t,s);fs.renameSync(t,p);};
const write=(dir,p,o)=>atomic(path.join(dir,p),JSON.stringify(o,null,2)+'\n');
const units=['木','水','火','金','土'];
function reasonCategory(note,hasEvidence,automatic){
 if(automatic)return 'direct-object-without-competing-sense';
 if(hasEvidence)return 'sense-or-referent-confirmation-required';
 if(/仅参见|本字仅|参见复词|通字参见/.test(note))return 'cross-reference-only-no-object-gloss';
 if(/默认|此读|此音|实际/.test(note))return 'reading-or-dictionary-word-boundary';
 if(/卦|天干|地支|传统取/.test(note))return 'traditional-character-method-not-established';
 if(/动作|行为/.test(note))return 'action-not-object';
 if(/材料|材质|兽皮|丝|纱|绳|羽|器物|乐器/.test(note))return 'material-unspecified-or-outside-domain';
 if(/颜色|草色|方位|时间|季节|光|白亮|红亮|色彩|寒凉|味觉|气味/.test(note))return 'color-light-time-or-quality-not-object';
 if(/动物|鸟|人称|人体|器官|天空|神仙|物理|力学|空间|国名|省名|邑名|朝代|亲属/.test(note))return 'entity-outside-object-domain';
 return 'abstract-quality-function-or-relation';
}
function resolveDefinitions(entry,hi,visited=new Set()){
 if(visited.has(hi))throw Error('Circular numbered reading reference: '+entry.title);
 const next=new Set(visited).add(hi);const h=entry.heteronyms[hi];
 const defs=h.definitions||[];
 const ref=defs.map(d=>d.def||'').join(' ').match(/[（(]([一二三四五六七八九十])[）)]之(?:語音|讀音|又音)/);
 if(ref)return resolveDefinitions(entry,['一','二','三','四','五','六','七','八','九','十'].indexOf(ref[1]),next);
 return defs.flatMap((d,di)=>d.def&&/[\u3400-\u9fff]/.test(d.def)&&!/(之語音|之讀音|之又音)/.test(d.def)?[{hi,di,definition:d}]:[]);
}
export function build(outputDir=HERE){
 fs.mkdirSync(outputDir,{recursive:true});
 const datasetPath=path.join(ROOT,'data/dataset-v6.json');
 const datasetBytes=fs.readFileSync(datasetPath),dataset=JSON.parse(datasetBytes.toString('utf8').replace(/^\uFEFF/,''));const empties=dataset.characters.filter(c=>Array.isArray(c.elements)&&c.elements.length===0);
 if(empties.length!==522)throw Error(`Expected exact 522 empty characters, got ${empties.length}`);
 const rawPath=path.join(ROOT,'data/raw/moe-revised.json.gz'),rawBytes=fs.readFileSync(rawPath);const raw=JSON.parse(zlib.gunzipSync(rawBytes));
 const rawIndex=new Map(raw.map((entry,index)=>[entry.title,{entry,index}]));
 const sourceLock=readJson(path.join(ROOT,'data/source-lock.json'));
 const sourceAssets=['moe-revised.json.gz','moe-README.md','CC-BY-ND-3.0-TW.html','kTraditionalVariant.txt','kSimplifiedVariant.txt','kMandarin.txt','unicode-LICENSE'];
 const rawSourceBytes=new Map(sourceAssets.map(file=>[file,file==='moe-revised.json.gz'?rawBytes:fs.readFileSync(path.join(ROOT,'data/raw',file))]));
 const lockedAssets=sourceAssets.map(file=>{const bytes=rawSourceBytes.get(file);if(sha(bytes)!==sourceLock[file].sha256)throw Error('Raw source hash mismatch '+file);return {path:'data/raw/'+file,...sourceLock[file]};});
 const variantLines=['kTraditionalVariant.txt','kSimplifiedVariant.txt'].flatMap(file=>rawSourceBytes.get(file).toString('utf8').split(/\r?\n/).filter(line=>line&&!line.startsWith('#')).map(line=>({file:'data/raw/'+file,line})));
 const code=c=>'U+'+c.codePointAt(0).toString(16).toUpperCase();
 const ownInputs=['profile.json','review-notes.txt','evidence-selections.txt','build.mjs','lookup-element-assessment.mjs','lookup-element-assessment.d.mts','load-verified-element-package.mjs','load-verified-element-package.d.mts','verify.mjs','README.md'];
 const projectInputBytes=new Map(ownInputs.map(file=>[file,fs.readFileSync(path.join(HERE,file))]));
 const profile=JSON.parse(projectInputBytes.get('profile.json').toString('utf8').replace(/^\uFEFF/,''));const automatic=new Set([...profile.singleSenseChars]);
 const noteLines=projectInputBytes.get('review-notes.txt').toString('utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/);
 const notes=new Map(noteLines.map(line=>{const p=line.indexOf(' ');return [line.slice(0,p),line.slice(p+1)];}));
 if(notes.size!==522||notes.size!==noteLines.length||[...notes.keys()].some(ch=>!empties.some(c=>c.char===ch)))throw Error('Review notes must exactly cover each baseline empty character');
 const choices=projectInputBytes.get('evidence-selections.txt').toString('utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/).map(line=>{const [char,senseIndex,element,condition]=line.split('|');if(!notes.has(char)||!units.includes(element))throw Error('Bad selection '+line);return {char,senseIndex:Number(senseIndex),element,condition};});
 const excerpts=[];
 const rows=empties.map((character,i)=>{
  const reading=character.readings.find(r=>r.pinyin===character.pinyin);
  if(!reading||reading.sourceId!=='moe-revised')throw Error('No exact default MOE reading '+character.char);
  const record=rawIndex.get(reading.word);if(!record)throw Error('Missing raw entry '+reading.word);
  const {entry,index}=record;const hi=entry.heteronyms.findIndex(h=>clean(h.pinyin)===character.pinyin);if(hi<0)throw Error('Default source pinyin mismatch '+character.char);
  const resolved=resolveDefinitions(entry,hi);
  const base=`moe-revised@${COMMIT}/entry/${index}`;
  const entryHash=jsonSha(entry);const readingHash=jsonSha(entry.heteronyms[hi]);
  const definitions=reading.meanings.map((quote,senseIndex)=>{
   const def=resolved.find(r=>r.definition.def===quote);if(!def)throw Error('Verbatim default definition not found '+character.char+'/'+senseIndex);
   return {senseIndex,sourceId:'moe-revised',sourceRecordId:`${base}/heteronyms/${def.hi}/definitions/${def.di}`,sourceEntrySha256:entryHash,selectedDefaultPinyin:character.pinyin,selectedRawPinyin:entry.heteronyms[hi].pinyin,originRawPinyin:entry.heteronyms[def.hi].pinyin,originReadingIndex:def.hi,originDefinitionIndex:def.di,quote,verbatimDefinition:def.definition};
  });
  const matches=choices.filter(c=>c.char===character.char);
  const counters=new Map();
  const evidence=matches.map(choice=>{
   const def=definitions[choice.senseIndex];if(!def)throw Error('Invalid chosen sense '+character.char+'/'+choice.senseIndex);
   const k=`${choice.senseIndex}-${choice.element}`;const n=counters.get(k)||0;counters.set(k,n+1);
   return {evidenceId:`object-${character.char.codePointAt(0).toString(16)}-${choice.senseIndex}-${choice.element}${n?'-'+n:''}`,senseIndex:choice.senseIndex,elements:[choice.element],activation:'sense-confirmation-required',scope:'selected-dictionary-sense-and-referent',condition:choice.condition,sourceId:'moe-revised',sourceRecordId:def.sourceRecordId,sourceEntrySha256:entryHash,sourceReadingSha256:readingHash,defaultPinyin:character.pinyin,rawPinyin:entry.heteronyms[hi].pinyin,quote:def.quote,originDefinitionIndex:def.originDefinitionIndex,projectRuleId:`direct-object-${choice.element}`};
  });
  if(automatic.has(character.char)&&(!evidence.length||definitions.length!==1))throw Error('Automatic entry has competing definitions '+character.char);
  const availableElements=units.filter(e=>evidence.some(c=>c.elements.includes(e)));
  const variantEvidence=character.char===reading.word?[]:variantLines.filter(v=>{const [key,rhs]=v.line.split(/\t/);const lhs=key.startsWith('U+')?key:'U+'+key;return (lhs===code(character.char)&&rhs?.includes(code(reading.word)))||(lhs===code(reading.word)&&rhs?.includes(code(character.char)));});
  if(character.char!==reading.word&&!variantEvidence.length)throw Error('No direct Unicode variant binding '+character.char+' -> '+reading.word);
  excerpts.push({char:character.char,word:reading.word,sourceId:'moe-revised',sourceRecordId:base,sourceEntrySha256:entryHash,verbatimEntry:entry});
  const correspondenceEvidence=character.char==='白'?[{kind:'dictionary-explicit-five-phase-color-correspondence',sourceId:'moe-revised',sourceRecordId:definitions[1].sourceRecordId,sourceEntrySha256:entryHash,defaultPinyin:character.pinyin,rawPinyin:entry.heteronyms[hi].pinyin,quote:definitions[1].quote,statedElement:'金',effectiveElements:[],adoption:'evidence-only-outside-object-profile',reason:'原词只陈述白色在五行颜色体系代表金；不建立所有白字姓名用法的唯一传统五行。'}]:[];
  return {reviewOrdinal:i+1,char:character.char,defaultPinyin:character.pinyin,word:reading.word,oldElements:[...character.elements],oldElementBasis:character.elementBasis,sourceBinding:{sourceId:'moe-revised',commit:COMMIT,word:reading.word,entryArrayIndex:index,sourceRecordId:base,sourceEntrySha256:entryHash,readingIndex:hi,rawPinyin:entry.heteronyms[hi].pinyin,defaultPinyin:character.pinyin,sourceReadingSha256:readingHash,hashConvention:'sha256(UTF-8 JSON.stringify(unmodified parsed source object)); source property order retained',variantEvidence},defaultDefinitions:definitions,decision:evidence.length?(availableElements.length>1?'multi-valued':'adopted'):'unresolved',coverageTier:automatic.has(character.char)?'single-sense-evidence':evidence.length?'sense-conditional':'unresolved',activation:evidence.length?'sense-confirmation-required':'unresolved',availableElements,effectiveElements:[],evidenceBySense:evidence,correspondenceEvidence,reasonCategory:reasonCategory(notes.get(character.char),evidence.length>0,automatic.has(character.char)),reason:`${character.char}/${character.pinyin}，本字词条「${reading.word}」：${notes.get(character.char)}。${evidence.length?'仅在所列原义和对象限定成立时采用项目标签；未确认不产生有效元素。':'默认读音的本字全部原义未满足本项目直接实体规则，元素保留未定。'}`,traditionalAssessment:profile.traditionalAssessment};
 });
 const counts={baselineCharacters:dataset.characters.length,baselineEmpty:rows.length,reviewed:rows.length,definitions:rows.reduce((n,r)=>n+r.defaultDefinitions.length,0),evidenceChoices:rows.reduce((n,r)=>n+r.evidenceBySense.length,0),coverageTiers:Object.fromEntries(['single-sense-evidence','sense-conditional','unresolved'].map(k=>[k,rows.filter(r=>r.coverageTier===k).length])),decisions:Object.fromEntries(['adopted','multi-valued','unresolved'].map(k=>[k,rows.filter(r=>r.decision===k).length])),reasonCategories:Object.fromEntries([...new Set(rows.map(r=>r.reasonCategory))].sort().map(k=>[k,rows.filter(r=>r.reasonCategory===k).length])),availableElements:Object.fromEntries(units.map(k=>[k,rows.filter(r=>r.availableElements.includes(k)).length])),defaultEffectiveCharacters:0,profileOnlyEffectiveCharacters:0,requiresExplicitSenseChoiceCharacters:rows.filter(row=>row.evidenceBySense.length).length,traditionalAdopted:0,explicitCorrespondenceOnly:rows.filter(r=>r.correspondenceEvidence.length).length};
 const baseline={path:'data/dataset-v6.json',version:dataset.version,sha256:sha(datasetBytes),characters:dataset.characters.length,emptyCharacters:522};
 const manifest={schemaVersion:1,profileId:profile.profileId,baseline,counts,reviewMethod:'Each of the exact 522 empty-element entries has an explicit project-authored character-specific note, exact default reading and full verbatim source definitions. No first-definition, radical, stroke, generated-meaning or homophone inference is used.',rows};
 const overlay={schemaVersion:1,profileId:profile.profileId,authority:'project-convention',baseline,defaultActivation:'off',defaultEffectiveElements:[],traditionalAssessment:profile.traditionalAssessment,rows:rows.map(({reviewOrdinal,char,defaultPinyin,word,sourceBinding,coverageTier,activation,availableElements,evidenceBySense,correspondenceEvidence,reasonCategory,reason,traditionalAssessment})=>({reviewOrdinal,char,defaultPinyin,word,sourceBinding,coverageTier,activation,availableElements,effectiveElements:[],evidenceBySense,correspondenceEvidence,reasonCategory,reason,traditionalAssessment}))};
 write(outputDir,'review-manifest.json',manifest);write(outputDir,'element-overlay.json',overlay);write(outputDir,'source-excerpts.json',{sourceId:'moe-revised',commit:COMMIT,license:'CC-BY-ND-3.0-TW',originalTextUnchanged:true,attribution:'中华民国教育部《重编国语辞典修订本》；企划执行国家教育研究院；g0v/kcwu 原文格式转换，格式编辑权CC0；辞书文字不重新授权。',entries:excerpts});
 const sourceOutputs=['review-manifest.json','element-overlay.json','source-excerpts.json'];
 const fileHashes=Object.fromEntries([...sourceOutputs.map(f=>[f,sha(fs.readFileSync(path.join(outputDir,f)))]),...ownInputs.map(f=>[f,sha(projectInputBytes.get(f))])].sort(([a],[b])=>a.localeCompare(b)));
 write(outputDir,'source-lock.json',{profileId:profile.profileId,baseline,hashConvention:'sha256(original file bytes); per-entry hashes documented in each sourceBinding; aggregate sha256(JSON.stringify(sorted fileHashes))',rawSources:lockedAssets,projectFiles:fileHashes,aggregateSha256:jsonSha(fileHashes),licensing:{dictionary:'CC-BY-ND-3.0-TW; original MOE text unchanged',projectConventions:'CC0-1.0',unicode:'Unicode License; original variant records retained'},networkRequests:0,sharedFilesWritten:0});
 return counts;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(build(process.argv[2]?path.resolve(process.argv[2]):HERE)));
