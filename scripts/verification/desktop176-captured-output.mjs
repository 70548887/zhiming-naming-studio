import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';

const VERSION = '1.0.38';
const COMPLETION_KEYS = ['schema','appVersion','status','mode','phaseID','pid','source','config','inputFreeze','buildCapture','workflowSource','userData','raw','process','post','sql','sqlTool','sqlCapture','marker','artifacts','requiresExternalCaptureAndReview','noPublicationApprovedHere'];
const DECLARATION_KEYS = ['schema','version','mode','phaseID','acceptanceRoot','completionFile'];
const STATIC_FIELDS = ['source','config','inputFreeze','buildCapture','workflowSource'];
const DYNAMIC_FIELDS = ['raw','process','post','sql','sqlTool','sqlCapture'];
const LIMITS = {manifestBytes:2097152,artifactCount:256,fileBytes:268435456,totalBytes:1073741824};
const copy = value => JSON.parse(JSON.stringify(value));
const fail = message => { throw new Error('Desktop176 captured output: ' + message); };
const need = (value, message) => { if (!value) fail(message); };
const key = file => process.platform === 'win32' ? file.toLowerCase() : file;
const equalRef = (a,b) => !!a && !!b && a.file === b.file && a.sha256 === b.sha256 && a.bytes === b.bytes;
const inside = (root,file,equal=false) => { const relative=path.relative(key(root),key(file));return relative===''?equal:relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative); };
const overlap = (a,b) => inside(a,b,true)||inside(b,a,true);
const time = value => typeof value==='string'&&Number.isFinite(Date.parse(value));

function plain(value, label, depth=0) {
  need(depth<=100,label+' JSON nesting exceeds100');
  if(value===null||typeof value==='string'||typeof value==='boolean')return;
  if(typeof value==='number'){need(Number.isFinite(value),label+' nonfinite number');return;}
  need(value&&typeof value==='object',label+' requires plain JSON data');
  if(Array.isArray(value)){
    need(Object.getPrototypeOf(value)===Array.prototype&&Reflect.ownKeys(value).length===value.length+1,label+' array holes or hidden fields');
    for(let index=0;index<value.length;index++){const descriptor=Object.getOwnPropertyDescriptor(value,String(index));need(descriptor&&Object.hasOwn(descriptor,'value')&&descriptor.enumerable,label+' array accessor/hole');plain(descriptor.value,label,depth+1);}return;
  }
  need([Object.prototype,null].includes(Object.getPrototypeOf(value)),label+' nonplain object');
  for(const name of Reflect.ownKeys(value)){need(typeof name==='string'&&!['__proto__','prototype','constructor'].includes(name),label+' unsafe key');const descriptor=Object.getOwnPropertyDescriptor(value,name);need(descriptor&&Object.hasOwn(descriptor,'value')&&descriptor.enumerable,label+' non-data field');plain(descriptor.value,label,depth+1);}
}
function fields(value, keys, label) {
  need(value&&typeof value==='object'&&!Array.isArray(value),label+' object required');
  need(Object.keys(value).length===keys.length&&keys.every(name=>Object.hasOwn(value,name)),label+' missing/unknown fields');
  return value;
}
function canonical(file,label) {
  need(typeof file==='string'&&file.length>0&&file.length<=4096&&path.isAbsolute(file)&&path.resolve(file)===file,label+' canonical absolute path required');
  need(!/^\\\\|^\/\//.test(file),label+' network/device path rejected');
  need(file.slice(path.parse(file).root.length).split(path.sep).every(part=>part&&part!=='.'&&part!=='..'&&!/[. ]$/.test(part)&&!/[\x00-\x1f]/.test(part)),label+' ambiguous path rejected');
  return file;
}
function ref(value,label,{positive=false,extra=false,external=false,root}={}) {
  plain(value,label);need(value&&typeof value==='object'&&!Array.isArray(value),label+' reference required');
  if(!extra)fields(value,['file','sha256','bytes'],label);
  else need(['file','sha256','bytes'].every(name=>Object.hasOwn(value,name)),label+' complete reference required');
  canonical(value.file,label);
  need(typeof value.sha256==='string'&&/^[a-f0-9]{64}$/.test(value.sha256)&&Number.isSafeInteger(value.bytes)&&value.bytes>=(positive?1:0),label+' invalid SHA/bytes');
  if(value.bytes===0)need(path.extname(value.file).toLowerCase()==='.log',label+' zero bytes only permitted for actual .log');
  if(root&&!external)need(inside(root,value.file),label+' leaves project root');
  return{file:value.file,sha256:value.sha256,bytes:value.bytes};
}
function refIndex(values,label,root,{positive=false}={}) {
  need(Array.isArray(values),label+' array required');const map=new Map();
  for(const [index,value]of values.entries()){const item=ref(value,label+'['+index+']',{positive,root});need(!map.has(key(item.file)),label+' duplicate path');map.set(key(item.file),item);}return map;
}

/**
 * This handle adds one narrow fallback after an existing capture.outputs check.
 * readBytes(ref,label) returns the complete original Buffer/Uint8Array. This
 * helper copies, hashes and parses the same owned buffer. authenticate returns
 * its actual matching {file,sha256,bytes} (or {sha256,bytes}), and honors
 * {allowExternal,allowEmpty}; only the captured executable may be external.
 * No caller-supplied capture/verified boolean is trusted or accepted as evidence.
 */
export async function createDesktop176CapturedOutput({root,captureRef,mode,phaseID,inputFreeze,source,readBytes,authenticate}) {
  canonical(root,'root');
  need(typeof readBytes==='function'&&typeof authenticate==='function','Original byte/hash callbacks required');
  need(['Development','Installed'].includes(mode)&&['exercise','resume'].includes(phaseID),'Exact mode/phaseID required');
  const freezeRef=ref(inputFreeze,'inputFreeze',{positive:true,root}),sourceRef=ref(source,'source',{positive:true,root}),originalCaptureRef=ref(captureRef,'captureRef',{positive:true,root});
  need(originalCaptureRef.bytes<=33554432&&freezeRef.bytes<=33554432,'Original capture/freeze JSON exceeds32MiB');
  const authenticated=new Map();
  const auth=async(value,label,{positive=false,external=false,fresh=false}={})=>{
    const item=ref(value,label,{positive,external,root}),cacheKey=item.file+'\n'+item.sha256+'\n'+item.bytes;
    if(!fresh&&authenticated.has(cacheKey))return item;
    const actual=await authenticate(copy(item),label,{allowExternal:external,allowEmpty:item.bytes===0});
    need(actual&&actual.sha256===item.sha256&&actual.bytes===item.bytes&&(!Object.hasOwn(actual,'file')||actual.file===item.file),label+' callback did not authenticate original bytes');
    authenticated.set(cacheKey,item);return item;
  };
  const json=async(value,label)=>{
    const item=ref(value,label,{positive:true,root}),returned=await readBytes(copy(item),label);
    need(Buffer.isBuffer(returned)||returned instanceof Uint8Array,label+' readBytes must return Buffer/Uint8Array');
    need(returned.byteLength===item.bytes,label+' original JSON SHA256/bytes mismatch');
    const owned=Buffer.from(returned);
    need(owned.length===item.bytes&&createHash('sha256').update(owned).digest('hex')===item.sha256,label+' original JSON SHA256/bytes mismatch');
    let document;try{document=JSON.parse(owned.toString('utf8'));}catch{fail(label+' is not valid complete JSON');}
    plain(document,label);return document;
  };
  const capture=await json(originalCaptureRef,'original outer command capture');
  need(capture&&typeof capture==='object'&&!Array.isArray(capture),'Original capture object required');
  need(capture.schema==='naming-studio-command-capture/1'&&capture.version===VERSION&&capture.profile==='desktop176/1'&&capture.role==='runtimeRecord'&&capture.mode===mode&&capture.phaseID===phaseID,'Only exact desktop176/1 version1.0.38 runtimeRecord mode/phase accepted');
  need(capture.status==='completed'&&Number.isSafeInteger(capture.pid)&&capture.pid>0&&capture.exitCode===0&&capture.signal===null&&capture.launchError===null&&capture.freezeError===null,'Outer command capture is not completed');
  need(Array.isArray(capture.outputErrors)&&capture.outputErrors.length===0&&Array.isArray(capture.artifactErrors)&&capture.artifactErrors.length===0,'Outer command capture has output/artifact errors');
  need(time(capture.startedAt)&&time(capture.completedAt)&&Date.parse(capture.startedAt)<=Date.parse(capture.completedAt),'Outer capture times invalid');
  need(equalRef(ref(capture.sourceFreeze,'capture.sourceFreeze',{positive:true,root}),freezeRef)&&equalRef(ref(capture.freezeAfter,'capture.freezeAfter',{positive:true,root}),freezeRef),'Outer capture changed final input freeze');
  const freeze=await json(freezeRef,'final input freeze');
  fields(freeze,['schema','version','frozenAt','files','documentation'],'final input freeze');
  need(freeze.schema==='naming-studio-test-input-freeze/1'&&freeze.version===VERSION&&time(freeze.frozenAt)&&Date.parse(freeze.frozenAt)<=Date.parse(capture.startedAt),'Final test freeze/version/time differs');
  need(freeze.files&&typeof freeze.files==='object'&&!Array.isArray(freeze.files)&&Object.keys(freeze.files).length>0&&freeze.documentation&&typeof freeze.documentation==='object'&&!Array.isArray(freeze.documentation),'Final freeze SHA maps required');
  for(const map of[freeze.files,freeze.documentation])for(const[name,digest]of Object.entries(map))need(name&&!/^[\\/]|[:\\]/.test(name)&&name.split('/').every(part=>part&&part!=='.'&&part!=='..')&&typeof digest==='string'&&/^[a-f0-9]{64}$/.test(digest),'Invalid frozen path/SHA string');
  const command=capture.command;need(command&&typeof command==='object'&&!Array.isArray(command)&&command.cwd===root,'Capture command root differs');
  const entry=await auth(command.entryScript,'captured driver entry',{positive:true});need(equalRef(entry,sourceRef),'Capture entry differs from exact selected source');
  const tools=refIndex(command.toolFiles,'capture toolFiles',root,{positive:true});need(tools.size>0&&equalRef(tools.get(key(sourceRef.file)),sourceRef),'Exact driver source must be a captured frozen tool');
  for(const item of tools.values()){const relative=path.relative(root,item.file).replaceAll('\\','/');need(freeze.files[relative]===item.sha256,'Capture tool is not in final freeze: '+relative);await auth(item,'capture frozen tool',{positive:true});}
  const executable=ref({file:command.executable,sha256:command.sha256,bytes:command.bytes},'capture executable',{positive:true,external:true,root});await auth(executable,'capture executable',{positive:true,external:true});
  await auth(capture.stdout,'capture stdout');await auth(capture.stderr,'capture stderr');

  const declaration=fields(capture.desktop176ArtifactCollection,DECLARATION_KEYS,'artifact declaration');
  need(declaration.schema==='desktop176-artifact-collection/1'&&declaration.version===VERSION&&declaration.mode===mode&&declaration.phaseID===phaseID,'Artifact declaration profile/mode/phase differs');
  const acceptance=canonical(declaration.acceptanceRoot,'acceptanceRoot');
  need(path.dirname(acceptance)===path.join(root,'.local')&&/^desktop176-acceptance-[a-z0-9][a-z0-9-]{0,63}$/i.test(path.basename(acceptance)),'Artifact acceptance root is not the one owned case');
  const phaseRoot=path.join(acceptance,mode,phaseID),completionFile=path.join(phaseRoot,'driver','phase-completed.json'),captureDirectory=path.dirname(originalCaptureRef.file),database=path.join(acceptance,mode,'user-data','customers.sqlite');
  need(declaration.completionFile===completionFile&&!overlap(acceptance,captureDirectory),'Completion path or capture/case scope differs');
  const roots=[path.join(phaseRoot,'out'),path.join(phaseRoot,'driver'),...(phaseID==='exercise'?[path.join(phaseRoot,'pdf-operation')]:[])];
  const outputMap=refIndex(capture.outputs,'capture outputs',root,{positive:true}),artifactMap=refIndex(capture.artifacts,'capture artifacts',root);
  need(Array.isArray(capture.declaredOutputs)&&capture.declaredOutputs.length<=64&&capture.declaredOutputs.length===outputMap.size,'Outer declared/output inventory differs');
  const declared=new Set();for(const file of capture.declaredOutputs){canonical(file,'declared output');need(inside(root,file)&&!declared.has(key(file))&&outputMap.has(key(file)),'Declared output is duplicate/missing');declared.add(key(file));}
  need(artifactMap.size<=LIMITS.artifactCount,'Too many captured artifacts');
  let artifactBytes=0;for(const item of artifactMap.values()){need(item.bytes<=LIMITS.fileBytes,'Captured artifact exceeds byte bound');artifactBytes+=item.bytes;await auth(item,'captured artifact');}need(artifactBytes<=LIMITS.totalBytes,'Captured artifact total exceeds bound');
  for(const item of outputMap.values()){need(item.bytes<=(item.file===completionFile?LIMITS.manifestBytes:LIMITS.fileBytes),'Captured output exceeds byte bound');await auth(item,'captured output',{positive:true});}
  need(phaseID==='exercise'?outputMap.has(key(database))||artifactMap.has(key(database)):artifactMap.has(key(database))&&!outputMap.has(key(database)),'Mode database declaration differs from exercise-output/resume-readonly contract');
  const completionRef=outputMap.get(key(completionFile));need(completionRef,'Fixed completion is not an original declared output');
  const completion=fields(await json(completionRef,'original phase completion'),COMPLETION_KEYS,'phase completion');
  need(completion.schema==='desktop176-driver-phase-completion/1'&&completion.appVersion===VERSION&&completion.status==='completed'&&completion.mode===mode&&completion.phaseID===phaseID&&Number.isSafeInteger(completion.pid)&&completion.pid>0,'Completion identity/status differs');
  need(completion.requiresExternalCaptureAndReview===true&&completion.noPublicationApprovedHere===true&&completion.userData===path.join(acceptance,mode,'user-data'),'Completion boundary/userData differs');
  need(equalRef(completion.source,sourceRef)&&equalRef(completion.inputFreeze,freezeRef),'Completion source/freeze differs');
  const staticPaths=new Set();for(const field of STATIC_FIELDS){const item=await auth(completion[field],'completion.'+field,{positive:true});need(!staticPaths.has(key(item.file))&&!overlap(acceptance,item.file)&&equalRef(artifactMap.get(key(item.file)),item),'Completion static role is not an exact external predeclared artifact: '+field);staticPaths.add(key(item.file));}
  need(freeze.files[path.relative(root,completion.workflowSource.file).replaceAll('\\','/')]===completion.workflowSource.sha256,'Completion workflow source is not in final freeze');
  const args=command.args;need(Array.isArray(args)&&args.length===6&&args.every(item=>typeof item==='string'&&!item.includes('\0'))&&args[0]===sourceRef.file&&args[1]==='run-phase'&&args[2]===completion.config.file&&args[3]===completion.config.sha256&&args[4]===mode&&args[5]===phaseID,'Captured command is not the exact driver run-phase/config/mode/phase argv');

  const dynamicMap=refIndex(completion.artifacts,'completion artifacts',root);need(dynamicMap.size>0&&dynamicMap.size<=artifactMap.size,'Original completion artifact inventory empty/oversized');
  const approved=new Map();for(const item of dynamicMap.values()){
    need(roots.some(directory=>inside(directory,item.file))&&!overlap(item.file,completionFile)&&!inside(captureDirectory,item.file,true),'Completion artifact leaves exact phase roots or creates a cycle');
    need(!staticPaths.has(key(item.file))&&!tools.has(key(item.file))&&equalRef(artifactMap.get(key(item.file)),item),'Completion artifact is not the same original captured dynamic ref');
    await auth(item,'original completion artifact');approved.set(key(item.file),Object.freeze(copy(item)));
  }
  const primaryPaths=new Set(staticPaths);for(const field of[...DYNAMIC_FIELDS,...(phaseID==='exercise'?['marker']:[])]){
    const item=ref(completion[field],'completion.'+field,{positive:true,root});need(!primaryPaths.has(key(item.file))&&equalRef(approved.get(key(item.file)),item),'Primary dynamic ref absent/aliased in actual completion inventory: '+field);primaryPaths.add(key(item.file));await auth(item,'primary dynamic '+field,{positive:true});
  }
  if(phaseID==='resume')need(completion.marker===null,'Resume marker must be null');
  await auth(completionRef,'unchanged original completion',{positive:true,fresh:true});await auth(originalCaptureRef,'unchanged original capture',{positive:true,fresh:true});await auth(freezeRef,'unchanged original freeze',{positive:true,fresh:true});await auth(sourceRef,'unchanged selected source',{positive:true,fresh:true});
  const contains=async(value,label='requested captured dynamic output')=>{
    let item;try{item=ref(value,label,{extra:true,root});}catch{return false;}
    if(outputMap.has(key(item.file))||staticPaths.has(key(item.file))||tools.has(key(item.file)))return false;
    const pinned=approved.get(key(item.file));if(!equalRef(pinned,item))return false;
    await auth(pinned,label,{fresh:true});return true;
  };
  return Object.freeze({capture:copy(capture),completionRef:Object.freeze(copy(completionRef)),contains});
}
