import {readFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import {types} from 'node:util';
import {createManualM970MeaningQuery} from './m970-manual-character-meaning-query.mjs';
import {M970_MANUAL_QUERY_PINS} from './m970-manual-meaning-pins.mjs';

const need=(ok,message)=>{if(!ok)throw Error('M970 manual selection directory: '+message);};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const pins=freeze(structuredClone(M970_MANUAL_QUERY_PINS));
const boundary=freeze({candidateOnly:true,activation:'off',productionApproved:false,admissionGranted:false,automaticMeaningAllowed:false,sourceAuthority:false,generationAuthority:false,wholeNameMeaning:null,automaticNameRecommendation:false,automaticSemanticCreditAllowed:false,scoreDelta:0,formalCoverageAdded:0,automaticCoverageAdded:0});

function fields(value,allowed,required=allowed){
 need(value!==null&&typeof value==='object'&&!types.isProxy(value),'plain non-Proxy request required');
 need([Object.prototype,null].includes(Object.getPrototypeOf(value)),'plain object required');
 const result=Object.create(null);
 for(const key of Reflect.ownKeys(value)){need(typeof key==='string'&&allowed.includes(key),'extra, technical identity or approval fields rejected');const d=Object.getOwnPropertyDescriptor(value,key);need(d?.enumerable&&Object.hasOwn(d,'value'),'accessor/hidden field rejected');result[key]=d.value;}
 need(required.every(k=>Object.hasOwn(result,k)),'missing explicit manual request fields');return result;
}
function manual(input){need(input.mode==='manual-request','only explicit manual-request is allowed');}
function pathIn(directory,file){
 need(typeof file==='string'&&!file.startsWith('/')&&!file.includes('\\')&&!file.includes(':')&&file.split('/').every(p=>p&&p!=='.'&&p!=='..'),'unsafe fixed profile path');
 const root=resolve(directory),target=resolve(root,...file.split('/'));need(target.startsWith(root+sep),'profile path escaped configured publication');return target;
}
function unavailableSelection(){return freeze({schema:'manual-character-meaning-selection/1',mode:'manual-request',status:'invalid-selection',meaningOptions:null,reason:'选择已失效或不属于本目录，请重新列出并明确选择。',usageStatus:'manual-context-required',...boundary});}

/**
 * Internal main-process wrapper. actualPackFile is a trusted active/archive path,
 * not renderer input. Recreate this factory when the selected path/view changes.
 * Each factory retains at most one live selection key per covered character.
 */
export function createManualM970MeaningSelectionDirectory(config){
 const args=fields(config,['dataDir','actualPackFile','publicationDir'],['dataDir','actualPackFile']);
 for(const key of ['dataDir','actualPackFile'])need(typeof args[key]==='string'&&args[key].trim().length>0,'literal '+key+' required');
 if(Object.hasOwn(args,'publicationDir'))need(typeof args.publicationDir==='string'&&args.publicationDir.trim().length>0,'literal publicationDir required');
 const dataDir=resolve(args.dataDir),actualPackFile=resolve(args.actualPackFile),publicationDir=Object.hasOwn(args,'publicationDir')?resolve(args.publicationDir):join(dataDir,...pins.publicationDirectory.split('/'));
 const inner=createManualM970MeaningQuery({dataDir,publicationDir});
 const byKey=new Map(),byCharacter=new Map();
 const clear=()=>{byKey.clear();byCharacter.clear();};

 /** Identity discovery uses a code-pinned profile and the unchanged verifier's
  * own returned source facts; reading the profile alone never issues a key. */
 function authenticate(char,selection){
  try{
   const actualBytes=readFileSync(actualPackFile),actualSha=hash(actualBytes);
   need(actualSha===pins.expectedPackSha256&&actualSha.slice(0,12)===pins.expectedActiveVersion,'actual active/archive pack changed; re-list only under supported pack');
   const profilePin=pins.files.find(p=>p.file==='m970/candidate/profile.json');need(profilePin,'compiled reviewed profile pin missing');
   const profileBytes=readFileSync(pathIn(publicationDir,profilePin.file));need(profileBytes.length===profilePin.bytes&&hash(profileBytes)===profilePin.sha256,'fixed reviewed directory profile changed');
   const profile=JSON.parse(profileBytes.toString('utf8'));need(profile.rows?.map(r=>r.char).join('')===pins.expectedChars,'fixed directory character set differs');
   const requested=profile.rows.find(r=>r.char===char),anchor=requested??profile.rows[0];
   // Unknown/foreign keys still reauthenticate every required resource. The
   // anchor never becomes a fallback result for the requested character.
   const senseId=`moe-revised:${anchor.sourceCoordinates.join(':')}`;
   const verified=inner.getSingleCharacterMeaningOptions({mode:'manual-request',char:anchor.char,pinyin:anchor.pinyin,tone:anchor.tone,senseId,packSha256:actualSha,activeVersion:actualSha.slice(0,12)});
   const option=verified.options[0];
   need(verified.status==='available'&&verified.options.length===1&&option.char===anchor.char&&option.senseId===senseId&&option.candidateId===anchor.candidateId&&option.pack.packSha256===actualSha&&option.publication.manifestSha256===pins.manifest.sha256&&typeof option.source.definition.def==='string','authenticated manual directory facts unavailable');
   if(selection)need(selection.packSha256===actualSha&&selection.activeVersion===actualSha.slice(0,12)&&selection.publicationSha256===option.publication.manifestSha256,'selection publication/pack version changed');
   return {requested,verified,option,packSha256:actualSha,activeVersion:actualSha.slice(0,12)};
  }catch(error){clear();throw error;}
 }
 function displayItem(option,key){
  const original=option.source;
  const dictionaryName='教育部《重編國語辭典修訂本》';
  return {selectionKey:key,char:option.char,pinyin:option.pinyin,tone:option.tone,meaning:option.meaning,originalMeaning:original.definition.def,sourceCitation:{dictionaryName,sourceId:original.sourceId,word:original.word,pinyin:original.pinyin,license:original.license},changeMeaning:option.uncertainty.selectedSenseChangedFromPrior,manualReason:option.manualReason,limits:option.project.limits,original:{dictionaryName,word:original.word,pinyin:original.pinyin,tone:original.tone,definition:original.definition,sourcePOS:original.sourcePOS,completeOriginalEntry:original.completeOriginalEntry,license:original.license},project:{meaning:option.project.meaning,projectWish:null,limits:option.project.limits,manualReason:option.manualReason,attribution:option.project.attribution,license:option.project.license},uncertainty:{judgment:option.uncertainty.judgment,context:option.uncertainty.context,suitability:option.uncertainty.suitability},publicationVersion:option.publication.publicationVersion,usageStatus:'manual-context-required',...boundary};
 }
 return Object.freeze({
  listAvailableMeanings(request){
   const input=fields(request,['mode','char']);manual(input);
   need(typeof input.char==='string'&&[...input.char].length===1&&!/[\uD800-\uDFFF\u0000-\u001f]/u.test(input.char),'single Unicode scalar required');
   const authenticated=authenticate(input.char);
   if(!authenticated.requested)return freeze({schema:'manual-character-meaning-directory/1',mode:'manual-request',char:input.char,status:'not-covered',items:[],usageStatus:'manual-context-required',...boundary});
   const option=authenticated.option,oldKey=byCharacter.get(input.char);if(oldKey)byKey.delete(oldKey);
   const selectionKey=randomBytes(24).toString('base64url');
   const record=freeze({char:option.char,pinyin:option.pinyin,tone:option.tone,senseId:option.senseId,packSha256:authenticated.packSha256,activeVersion:authenticated.activeVersion,publicationSha256:option.publication.manifestSha256});
   byKey.set(selectionKey,record);byCharacter.set(input.char,selectionKey);
   return freeze(structuredClone({schema:'manual-character-meaning-directory/1',mode:'manual-request',char:input.char,status:'available',items:[displayItem(option,selectionKey)],usageStatus:'manual-context-required',...boundary}));
  },
  selectMeaning(request){
   const input=fields(request,['mode','selectionKey']);manual(input);
   need(typeof input.selectionKey==='string'&&input.selectionKey.length>0&&input.selectionKey.length<=128,'nonempty bounded opaque selectionKey required');
   const record=byKey.get(input.selectionKey);
   const authenticated=authenticate(record?.char,record);
   if(!record)return unavailableSelection();
   // select uses the freshly authenticated original method result, not the
   // previously listed DTO or a key's caller-authored source identity.
   const option=authenticated.option;
   if(!authenticated.requested||option.char!==record.char||option.pinyin!==record.pinyin||option.tone!==record.tone||option.senseId!==record.senseId){clear();return unavailableSelection();}
   return freeze({schema:'manual-character-meaning-selection/1',mode:'manual-request',status:'selected',meaningOptions:authenticated.verified,reason:null,usageStatus:'manual-context-required',...boundary});
  },
 });
}
