import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

export const DIRECTORY='data/element-imagery-m754';
export const PROFILE='project-dictionary-object-elements/2.0.0-m754-candidate';
export const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const json=value=>JSON.stringify(value,null,2)+'\n';
const parse=bytes=>JSON.parse(bytes.toString('utf8'));
const fail=message=>{throw new Error(message);};
const code=char=>char.codePointAt(0).toString(16).toUpperCase();
const objectElements={tree:'木',plant:'木','plant-part':'木',landform:'土',stone:'土',river:'水'};
export function atomicWrite(file,bytes){fs.mkdirSync(path.dirname(file),{recursive:true});const temporary=file+'.m754-'+process.pid+'.tmp';try{fs.writeFileSync(temporary,bytes);fs.renameSync(temporary,file);}finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}}

/** Fixed local sources only. No network fetch or keyword/radical inference. */
export function compileM754Artifacts(root){
 const buffers=new Map();
 const read=relative=>{if(!buffers.has(relative))buffers.set(relative,fs.readFileSync(path.join(root,relative)));return buffers.get(relative);};
 const pins=parse(read(DIRECTORY+'/source-pins.json'));
 const editorial=parse(read(DIRECTORY+'/editorial-input.json'));
 for(const source of pins.rawSources)if(hash(read(source.path))!==source.sha256)fail('Fixed source differs: '+source.path);
 const baseBytes=read(pins.baseline.path);if(hash(baseBytes)!==pins.baseline.sha256)fail('Fixed baseline differs');
 const baseline=parse(baseBytes);const known=baseline.characters.filter(row=>row.elements.length);const unknown=baseline.characters.filter(row=>!row.elements.length);
 if(baseline.characters.length!==779||known.length!==257||unknown.length!==522)fail('779/257/522 baseline changed');
 if(editorial.rows.length!==10||new Set(editorial.rows.map(row=>row.char)).size!==10)fail('Exactly 10 distinct reviewed editorial selections required');
 const dictionary=parse(zlib.gunzipSync(read('data/raw/moe-revised.json.gz')));
 const variantFiles=['data/raw/kTraditionalVariant.txt','data/raw/kSimplifiedVariant.txt'];
 const variantLines=variantFiles.map(file=>({file,lines:read(file).toString('utf8').split(/\r?\n/)}));
 const facts=[];const candidates=[];
 for(const input of editorial.rows){
  const base=unknown.find(row=>row.char===input.char);
  if(!base||base.pinyin!==input.defaultPinyin)fail('Unknown/default reading mismatch: '+input.char);
  const entry=dictionary[input.entryIndex],reading=entry?.heteronyms?.[input.readingIndex],definition=reading?.definitions?.[input.definitionIndex];
  if(Array.from(input.char).length!==1||entry?.title!==input.word)fail('Dictionary glyph mismatch: '+input.char);
  if(reading?.pinyin!==base.pinyin||!definition)fail('Dictionary default reading/sense mismatch: '+input.char);
  const glyphEvidence=[];
  if(input.char!==input.word){
   for(const [i,from,to] of [[0,input.char,input.word],[1,input.word,input.char]]){
    const item=variantLines[i],line=item.lines.find(line=>line.split('\t')[0]===code(from)&&line.split('\t')[1]?.split(' ').includes('U+'+code(to)));
    if(!line)fail('Direct reciprocal glyph evidence missing: '+input.char);
    glyphEvidence.push({file:item.file,lineNumber:item.lines.indexOf(line)+1,line});
   }
  }
  if(objectElements[input.objectClass]!==input.element)fail('Explicit project class mapping mismatch: '+input.char);
  if(!['default-reading-direct-object','explicit-naming-theme'].includes(input.scope))fail('Unknown adoption scope');
  if(input.scope==='default-reading-direct-object'&&(reading.definitions.length!==1||input.definitionIndex!==0||input.themeId!==null))fail('Automatic default scope needs one complete direct-object definition');
  if(input.scope==='explicit-naming-theme'&&(typeof input.themeId!=='string'||!input.themeId))fail('Conditional object theme missing');
  const sourceEntrySha256=hash(JSON.stringify(entry)),sourceReadingSha256=hash(JSON.stringify(reading));
  const sourceRecordId=`moe-revised@${pins.dictionary.commit}/entry/${input.entryIndex}`;
  const factId=`m754-${code(input.char).toLowerCase()}`;
  facts.push({factId,char:input.char,defaultPinyin:base.pinyin,dictionaryWord:entry.title,sourceId:pins.dictionary.sourceId,sourceRecordId,entryIndex:input.entryIndex,readingIndex:input.readingIndex,definitionIndex:input.definitionIndex,senseRecordId:`${sourceRecordId}/heteronyms/${input.readingIndex}/definitions/${input.definitionIndex}`,sourceEntrySha256,sourceReadingSha256,sourceDefinitionSha256:hash(JSON.stringify(definition)),rawPinyin:reading.pinyin,glyphEvidence,verbatimEntry:entry});
  const candidate={factId,char:input.char,defaultPinyin:base.pinyin,authority:'project-convention',namingIntent:{text:input.namingIntent,authorId:editorial.authorId,license:editorial.license},projectMapping:{objectClass:input.objectClass,element:input.element,ruleId:'m754-direct-object-'+input.objectClass,claim:'项目约定意象映射，不是辞书五行事实或传统唯一结论。'},autoAdoption:{scope:input.scope,themeId:input.themeId,condition:input.condition,requiresIndependentReview:true},ambiguity:input.ambiguity,status:'pending-independent-review'};
  candidates.push({...candidate,candidateSha256:hash(JSON.stringify(candidate))});
 }
 const outputs=new Map();
 outputs.set('dictionary-facts.json',json({schemaVersion:'m754-dictionary-facts/1.0.0',originalTextUnchanged:true,hashConvention:'sha256(UTF-8 JSON.stringify(unmodified parsed source object)); original property order retained',dictionary:pins.dictionary,unicode:pins.unicode,entries:facts}));
 outputs.set('convention-candidates.json',json({schemaVersion:'m754-element-imagery/1.0.0',profileId:PROFILE,authority:'project-convention',projectLicense:editorial.license,traditionalAssessment:{status:'unestablished',elements:[]},defaultActivation:'off',formalCoverage:257,proposedAdditionalCharacters:10,rows:candidates}));
 outputs.set('admission-template.json',json({schemaVersion:'m754-independent-review/1.0.0',profileId:PROFILE,reviewId:null,reviewerId:null,authorId:editorial.authorId,rows:candidates.map(row=>({char:row.char,candidateSha256:row.candidateSha256,decision:'pending',scope:row.autoAdoption.scope,themeId:row.autoAdoption.themeId,rationale:null}))}));
 outputs.set('coverage.json',json({baselineVersion:baseline.version,baselineSha256:pins.baseline.sha256,total:779,formalKnown:known.map(row=>row.char),formalUnknown:unknown.map(row=>row.char),candidateCharacters:candidates.map(row=>row.char),pendingIndependentReview:10,formalNew:0}));
 const projectFiles={};for(const file of ['source-pins.json','editorial-input.json',...outputs.keys()].sort())projectFiles[file]=hash(outputs.get(file)??read(DIRECTORY+'/'+file));
 const lock={schemaVersion:'m754-element-imagery-lock/1.0.0',profileId:PROFILE,baseline:pins.baseline,rawSources:pins.rawSources,projectFiles,aggregateSha256:hash(JSON.stringify(projectFiles))};
 outputs.set('source-lock.json',json(lock));
 const lockSha256=hash(outputs.get('source-lock.json'));
 const pinsSource=`// Generated by scripts/m754-element-imagery/build.mjs. Review this pin with the package.\nexport const M754_IMAGERY_PROFILE=${JSON.stringify(PROFILE)} as const;\nexport const M754_IMAGERY_LOCK=${JSON.stringify(lockSha256)} as const;\nexport const M754_BASELINE_SHA=${JSON.stringify(pins.baseline.sha256)} as const;\n`;
 return {outputs,lockSha256,pinsSource,characters:candidates.map(row=>row.char),sourceBytes:buffers.size};
}
export function buildM754(root,{verify=false}={}){
 const built=compileM754Artifacts(root);
 for(const [file,bytes]of built.outputs){const target=path.join(root,DIRECTORY,file);if(verify){if(!fs.existsSync(target)||!fs.readFileSync(target).equals(Buffer.from(bytes)))fail('Generated output differs: '+file);}else atomicWrite(target,bytes);}
 const target=path.join(root,'src/shared/m754-element-imagery-pins.ts');if(verify){if(!fs.readFileSync(target).equals(Buffer.from(built.pinsSource)))fail('Generated trusted pin differs');}else atomicWrite(target,built.pinsSource);
 return {characters:built.characters,total:779,formalKnown:257,formalUnknown:522,candidates:10,formalNew:0,lockSha256:built.lockSha256,verified:verify};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');console.log(JSON.stringify(buildM754(root,{verify:process.argv.includes('--verify')})));}
