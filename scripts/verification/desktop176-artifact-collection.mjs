import fs from 'node:fs';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {assertNoReparse,isInside} from './safe-paths.mjs';
import {createHash} from 'node:crypto';

export const DESKTOP176_ARTIFACT_COLLECTION_SCHEMA='desktop176-artifact-collection/1';
export const DESKTOP176_ARTIFACT_LIMITS=Object.freeze({manifestBytes:2*1024*1024,artifactCount:256,fileBytes:256*1024*1024,totalBytes:1024*1024*1024});
const states=new WeakMap(),fact=(value,message)=>{if(!value)throw Error('desktop176 artifact collection: '+message);};
const equal=isDeepStrictEqual;
const declarationKeys=['schema','version','mode','phaseID','acceptanceRoot','completionFile'];
const planKeys=['schema','role','version','inputFreeze','sourceFreeze','executable','args','toolFiles','outputs','artifacts','mode','phaseID','desktop176ArtifactCollection'];
const completionKeys=['schema','appVersion','status','mode','phaseID','pid','source','config','inputFreeze','buildCapture','workflowSource','userData','raw','process','post','sql','sqlTool','sqlCapture','marker','artifacts','requiresExternalCaptureAndReview','noPublicationApprovedHere'];
const staticFields=['source','config','inputFreeze','buildCapture','workflowSource'];
const dynamicFields=['raw','process','post','sql','sqlTool','sqlCapture'];
const key=file=>process.platform==='win32'?file.toLowerCase():file;
const within=(root,file)=>file===root||isInside(root,file);
const overlap=(a,b)=>within(a,b)||within(b,a);
function plain(value,label,keys){
 fact(value!==null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value)),label+' must be a plain data object');
 const names=Reflect.ownKeys(value);
 fact(names.every(name=>typeof name==='string'&&!['__proto__','prototype','constructor'].includes(name)),label+' has unsafe keys');
 for(const name of names){const descriptor=Object.getOwnPropertyDescriptor(value,name);fact(descriptor&&Object.hasOwn(descriptor,'value')&&descriptor.enumerable,label+' has non-data fields');}
 if(keys)fact(names.length===keys.length&&keys.every(name=>names.includes(name)),label+' has missing or unknown fields');
}
function canonical(file,{missing=false}={}){
 fact(typeof file==='string'&&file.length>0&&file.length<=4096&&path.isAbsolute(file)&&file===path.resolve(file),'expected a canonical absolute path');
 fact(!/^\\\\|^\/\//.test(file),'network/device paths are not accepted');
 const parts=file.slice(path.parse(file).root.length).split(path.sep);
 fact(parts.every(part=>part&&part!=='.'&&part!=='..'&&!/[. ]$/.test(part)&&!/[\x00-\x1f]/.test(part)),'path aliases are not accepted');
 assertNoReparse(file,{allowMissing:missing});
 let ancestor=file;const suffix=[];
 while(!fs.existsSync(ancestor)){fact(missing,'file is missing: '+file);suffix.unshift(path.basename(ancestor));const next=path.dirname(ancestor);fact(next!==ancestor,'no existing ancestor');ancestor=next;}
 const resolved=path.join(fs.realpathSync.native(ancestor),...suffix);
 fact(resolved===file,'filesystem path alias is not accepted: '+file);
 return file;
}
function directory(file,{missing=false}={}){canonical(file,{missing});if(fs.existsSync(file))fact(fs.statSync(file).isDirectory(),'expected directory: '+file);}
function physical(file){const stat=fs.statSync(file,{bigint:true});fact(stat.isFile()&&stat.ino!==0n,'regular physical file required: '+file);return String(stat.dev)+':'+String(stat.ino);}
async function boundedReference(file,{maxBytes=DESKTOP176_ARTIFACT_LIMITS.fileBytes,expectedBytes,keepBytes=false}={}){
 canonical(file);const before=fs.statSync(file,{bigint:true}),size=Number(before.size);
 fact(before.isFile()&&before.ino!==0n&&Number.isSafeInteger(size)&&size>=0&&size<=maxBytes,'actual file exceeds fixed byte limit');
 if(expectedBytes!==undefined)fact(size===expectedBytes,'actual bytes differ from manifest');
 const descriptor=fs.openSync(file,'r');
 try{
  const opened=fs.fstatSync(descriptor,{bigint:true});fact(opened.dev===before.dev&&opened.ino===before.ino&&opened.size===before.size,'file identity changed before read');
  const hash=createHash('sha256'),chunks=[];let count=0;
  if(size>0)for await(const chunk of fs.createReadStream(file,{fd:descriptor,autoClose:false,start:0,end:size-1})){
   count+=chunk.length;fact(count<=maxBytes&&count<=size,'bounded file read exceeded expected size');hash.update(chunk);if(keepBytes)chunks.push(chunk);
  }
  fact(count===size,'file truncated during read');
  const after=fs.fstatSync(descriptor,{bigint:true});canonical(file);const current=fs.statSync(file,{bigint:true});
  fact(after.dev===before.dev&&after.ino===before.ino&&after.size===before.size&&current.dev===before.dev&&current.ino===before.ino&&current.size===before.size,'file changed during bounded read');
  return{ref:{file,sha256:hash.digest('hex'),bytes:size},bytes:keepBytes?Buffer.concat(chunks):null};
 }finally{fs.closeSync(descriptor);}
}
function fullRef(value,label,{positive=false}={}){
 plain(value,label,['file','sha256','bytes']);canonical(value.file);
 fact(typeof value.sha256==='string'&&/^[a-f0-9]{64}$/.test(value.sha256),label+' has invalid SHA256');
 fact(Number.isSafeInteger(value.bytes)&&value.bytes>=(positive?1:0)&&value.bytes<=DESKTOP176_ARTIFACT_LIMITS.fileBytes,label+' has invalid/bounded bytes');
 if(value.bytes===0)fact(path.extname(value.file).toLowerCase()==='.log','zero bytes are permitted only for actual .log files');
}
function checkOwned(state,file){
 fact(!overlap(file,state.completionFile)&&!within(state.captureDirectory,file),'manifest/capture reference cycle');
 fact(state.roots.some(root=>isInside(root,file)),'dynamic artifact leaves approved phase roots: '+file);
}
function addError(errors,file,error){errors.push({file,message:error instanceof Error?error.message:String(error)});}

/** Opt-in preflight only. Missing declarations do not change legacy behavior. */
export async function prepareDesktop176ArtifactCollection({root,plan,output,declaredOutputs,declaredArtifacts,inputFreeze,protectedInputs=[]}){
 const descriptor=Object.getOwnPropertyDescriptor(plan,'desktop176ArtifactCollection');
 if(!descriptor){fact(!('desktop176ArtifactCollection' in plan),'declaration must be an own field');return null;}
 plain(plan,'command plan');fact(Reflect.ownKeys(plan).every(name=>planKeys.includes(name)),'unknown opt-in command plan field');
 fact(descriptor.enumerable&&Object.hasOwn(descriptor,'value'),'declaration must be ordinary data');
 const declaration=descriptor.value;plain(declaration,'declaration',declarationKeys);
 fact(declaration.schema===DESKTOP176_ARTIFACT_COLLECTION_SCHEMA&&declaration.version==='1.0.38'&&plan.version==='1.0.38'&&plan.role==='runtimeRecord','only version1.0.38 runtimeRecord is accepted');
 fact(['Development','Installed'].includes(declaration.mode)&&['exercise','resume'].includes(declaration.phaseID),'unsupported mode/phaseID');
 fact(plan.mode===declaration.mode&&plan.phaseID===declaration.phaseID,'mode/phaseID must match explicit root plan');
 fact(Object.hasOwn(plan,'inputFreeze')!==Object.hasOwn(plan,'sourceFreeze'),'exactly one root freeze declaration is required');
 canonical(root);const acceptanceRoot=canonical(declaration.acceptanceRoot,{missing:true});
 fact(path.dirname(acceptanceRoot)===path.join(root,'.local')&&/^desktop176-acceptance-[a-z0-9][a-z0-9-]{0,63}$/i.test(path.basename(acceptanceRoot)),'acceptanceRoot must be one owned root .local desktop176 case');
 directory(acceptanceRoot,{missing:true});
 const phaseRoot=path.join(acceptanceRoot,declaration.mode,declaration.phaseID),completionFile=path.join(phaseRoot,'driver','phase-completed.json');
 fact(declaration.completionFile===completionFile,'completionFile is not the fixed phase path');canonical(completionFile,{missing:true});
 fact(declaredOutputs.includes(completionFile)&&!fs.existsSync(completionFile),'completion must be a predeclared, absent output');
 const captureDirectory=path.resolve(root,output);canonical(captureDirectory,{missing:true});directory(path.dirname(captureDirectory));
 fact(!overlap(acceptanceRoot,captureDirectory),'acceptance/capture directories overlap');
 const protectedPhysical=new Set();
 for(const file of protectedInputs){fact(!overlap(acceptanceRoot,path.resolve(file)),'acceptance overlaps frozen/command input: '+file);if(fs.existsSync(file)&&fs.statSync(file).isFile())protectedPhysical.add(physical(file));}
 fact(declaredArtifacts.length<=DESKTOP176_ARTIFACT_LIMITS.artifactCount&&declaredOutputs.length<=64,'too many predeclared outputs/artifacts');
 const roots=[path.join(phaseRoot,'out'),path.join(phaseRoot,'driver'),...(declaration.phaseID==='exercise'?[path.join(phaseRoot,'pdf-operation')]:[])];
 let staticBytes=0;
 const staticPins=new Map(),identities=new Set(),database=path.join(acceptanceRoot,declaration.mode,'user-data','customers.sqlite');
 fact(declaration.phaseID==='exercise'?(declaredOutputs.includes(database)||declaredArtifacts.includes(database)):declaredArtifacts.includes(database),'mode database must be explicitly predeclared for this phase');
 fact(declaration.phaseID!=='resume'||!declaredOutputs.includes(database),'resume database is read-only, not an output');
 for(const file of declaredArtifacts){
  canonical(file,{missing:true});fact(!overlap(file,completionFile)&&!within(captureDirectory,file),'static artifact creates manifest/capture cycle');
  const inCase=isInside(acceptanceRoot,file),mutableDatabase=declaration.phaseID==='exercise'&&file===database;
  if(inCase){
   fact(isInside(path.join(acceptanceRoot,declaration.mode),file)||[path.join(acceptanceRoot,'prepared.json'),path.join(acceptanceRoot,'four-phase-driver-result.json')].includes(file),'static artifact belongs to a different mode');
   if(!roots.some(root=>isInside(root,file))&&!mutableDatabase)fact(fs.existsSync(file),'static case inputs must exist before launch; deterministic new outputs belong in plan.outputs');
  }
  if(!isInside(acceptanceRoot,file)||fs.existsSync(file)){
   canonical(file);staticBytes+=fs.statSync(file).size;fact(Number.isSafeInteger(staticBytes)&&staticBytes<=DESKTOP176_ARTIFACT_LIMITS.totalBytes,'static input bytes exceed fixed total before read');const ref=(await boundedReference(file)).ref;fullRef(ref,'static artifact');
   const id=physical(file);fact(!identities.has(id)&&(!inCase||!protectedPhysical.has(id)),'static artifact physical alias');identities.add(id);if(!mutableDatabase)staticPins.set(key(file),ref);
  }
 }
 const anchors=[];let current=acceptanceRoot;
 while(within(root,current)&&current!==root){if(fs.existsSync(current)){const stat=fs.statSync(current,{bigint:true});anchors.push({file:current,dev:String(stat.dev),ino:String(stat.ino)});}current=path.dirname(current);}
 const frozen=Object.freeze({...declaration}),handle=Object.freeze({mode:declaration.mode,phaseID:declaration.phaseID,declaration:frozen});
 states.set(handle,{root,acceptanceRoot,completionFile,captureDirectory,roots,staticPins,declaredArtifacts:[...declaredArtifacts],declaredOutputs:[...declaredOutputs],inputFreeze:structuredClone(inputFreeze),protectedPhysical,anchors});
 return handle;
}

/** After child close, validate the single original completion and read its exact
 * listed byte references. No directory scan or artifact-content graph expansion. */
export async function collectDesktop176Artifacts(handle){
 const state=states.get(handle);fact(state,'unrecognized collection handle');
 const refs=[],errors=[];let completionRef=null;
 try{
  for(const anchor of state.anchors){canonical(anchor.file);const stat=fs.statSync(anchor.file,{bigint:true});fact(String(stat.dev)===anchor.dev&&String(stat.ino)===anchor.ino,'owned ancestor physical identity changed');}
  const original=await boundedReference(state.completionFile,{maxBytes:DESKTOP176_ARTIFACT_LIMITS.manifestBytes,keepBytes:true});
  const bytes=original.bytes;fact(bytes.length>0,'empty completion manifest');completionRef=original.ref;
  const record=JSON.parse(bytes.toString('utf8'));plain(record,'completion',completionKeys);
  fact(record.schema==='desktop176-driver-phase-completion/1'&&record.appVersion==='1.0.38'&&record.status==='completed','completion schema/version/status differs');
  fact(record.mode===handle.mode&&record.phaseID===handle.phaseID,'completion mode/phaseID differs from root plan');
  fact(record.requiresExternalCaptureAndReview===true&&record.noPublicationApprovedHere===true,'completion boundary flags differ');
  fact(Number.isSafeInteger(record.pid)&&record.pid>0,'positive observed App PID required');
  fact(equal(record.inputFreeze,state.inputFreeze),'completion inputFreeze differs from root plan');
  const userData=path.join(state.acceptanceRoot,handle.mode,'user-data');fact(record.userData===userData,'completion userData differs');directory(userData);
  const rolePaths=new Set();
  for(const field of [...staticFields,...dynamicFields,...(handle.phaseID==='exercise'?['marker']:[])]){
   const ref=record[field];fullRef(ref,field,{positive:true});fact(!rolePaths.has(key(ref.file)),'duplicate primary reference path');rolePaths.add(key(ref.file));
   if(staticFields.includes(field)){
    const pin=state.staticPins.get(key(ref.file));fact(pin&&equal(ref,pin),field+' requires exact predeclared static artifact');
   }else checkOwned(state,ref.file);
  }
  if(handle.phaseID==='resume')fact(record.marker===null,'resume marker must be null');
  fact(Array.isArray(record.artifacts)&&record.artifacts.length>0&&record.artifacts.length+state.declaredArtifacts.length<=DESKTOP176_ARTIFACT_LIMITS.artifactCount,'artifact count is invalid');
  const seen=new Set(),physicalIds=new Set();let total=0;
  for(const ref of record.artifacts){
   try{
    fullRef(ref,'dynamic artifact');checkOwned(state,ref.file);
    fact(!seen.has(key(ref.file)),'duplicate dynamic artifact path');seen.add(key(ref.file));
    const id=physical(ref.file);fact(!physicalIds.has(id)&&!state.protectedPhysical.has(id),'dynamic physical alias');physicalIds.add(id);
    total+=ref.bytes;fact(total<=DESKTOP176_ARTIFACT_LIMITS.totalBytes,'dynamic bytes exceed fixed total');
    const actual=(await boundedReference(ref.file,{expectedBytes:ref.bytes})).ref;fact(equal(actual,ref),'dynamic artifact SHA256/bytes mismatch: '+ref.file);refs.push(actual);
   }catch(error){addError(errors,typeof ref?.file==='string'?ref.file:state.completionFile,error);}
  }
  for(const field of [...dynamicFields,...(handle.phaseID==='exercise'?['marker']:[])])fact(refs.some(ref=>equal(ref,record[field])),'primary dynamic reference is missing from verified artifacts: '+field);
  fact(equal((await boundedReference(state.completionFile,{maxBytes:DESKTOP176_ARTIFACT_LIMITS.manifestBytes})).ref,completionRef),'completion changed during collection');
 }catch(error){addError(errors,state.completionFile,error);}
 return {refs,errors,completionRef};
}

/** Merge without silently deduplicating. A failed inventory still retains every
 * verified/static ref and the real child outcome in the first command capture. */
export async function collectDesktop176StaticArtifacts(handle,alreadyCapturedBytes=0){
 const state=states.get(handle);fact(state,'unrecognized static collection handle');const refs=[],errors=[];let total=alreadyCapturedBytes;
 for(const file of state.declaredArtifacts)try{
  canonical(file);total+=fs.statSync(file).size;fact(Number.isSafeInteger(total)&&total<=DESKTOP176_ARTIFACT_LIMITS.totalBytes,'merged artifact bytes exceed fixed total before read');
  const ref=(await boundedReference(file)).ref;fullRef(ref,'static artifact');refs.push(ref);
 }catch(error){addError(errors,file,error);}
 return{refs,errors};
}
export async function collectDesktop176Outputs(handle){
 const state=states.get(handle);fact(state,'unrecognized output collection handle');const refs=[],errors=[];let total=0;
 for(const file of state.declaredOutputs)try{
  canonical(file);total+=fs.statSync(file).size;fact(Number.isSafeInteger(total)&&total<=DESKTOP176_ARTIFACT_LIMITS.totalBytes,'declared output bytes exceed fixed total before read');
  const ref=(await boundedReference(file,{maxBytes:file===state.completionFile?DESKTOP176_ARTIFACT_LIMITS.manifestBytes:DESKTOP176_ARTIFACT_LIMITS.fileBytes})).ref;
  fullRef(ref,'declared output',{positive:true});refs.push(ref);
 }catch(error){addError(errors,file,error);}
 return{refs,errors};
}
export function mergeDesktop176Artifacts(handle,staticCollection,dynamicCollection,outputs){
 const state=states.get(handle);fact(state,'unrecognized merge handle');
 const refs=[...staticCollection.refs,...dynamicCollection.refs],errors=[...staticCollection.errors,...dynamicCollection.errors];
 const paths=new Set(),ids=new Set();let total=0;
 for(const ref of refs){
  try{
   fullRef(ref,'merged artifact');fact(!paths.has(key(ref.file)),'duplicate static/dynamic artifact path');paths.add(key(ref.file));
   const id=physical(ref.file);fact(!ids.has(id)&&(!isInside(state.acceptanceRoot,ref.file)||!state.protectedPhysical.has(id)),'static/dynamic physical alias');ids.add(id);
   total+=ref.bytes;fact(total<=DESKTOP176_ARTIFACT_LIMITS.totalBytes,'merged bytes exceed fixed total');
   const pin=state.staticPins.get(key(ref.file));if(pin)fact(equal(pin,ref),'predeclared static input changed');
  }catch(error){addError(errors,ref.file,error);}
 }
 if(dynamicCollection.completionRef&&!outputs.some(ref=>equal(ref,dynamicCollection.completionRef)))addError(errors,state.completionFile,Error('captured completion bytes differ from parsed original manifest'));
 return {refs,errors};
}
