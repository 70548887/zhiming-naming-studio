/** Executable M873 exact-structure/SQL-byte-closure contract.
 * No source admission, generation permit, Store success or runtime authenticity
 * is conferred. Product must call its fixed private replay owner after this gate. */
// M899: standalone C2 contract/codec. This file is intentionally independent
// from Store/compact/UI and only validates immutable attachment + source
// witness closure. It never grants generation or storage authority.
// @ts-nocheck
import {createHash} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
import {parseSnapshotJsonStrict} from './snapshot-json-spans';

const parseStrict=(bytes,maxBytes=16*1024**2)=>{
 const raw=Buffer.from(bytes);
 const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);
 if(Buffer.byteLength(text,'utf8')!==raw.length)throw Error('M873_REJECT:utf8');
 return parseSnapshotJsonStrict(text,maxBytes);
};
const decodeLeaf=(blob)=>{
 if(!blob||typeof blob!=='object'||!h(blob.sha)||blob.codec!=='deflate-raw/1'||!Number.isSafeInteger(blob.rawBytes)||blob.rawBytes<1||blob.rawBytes>8388608||!(blob.payload instanceof Uint8Array||Buffer.isBuffer(blob.payload)))throw Error('M873_REJECT:leaf');
 let raw;try{const info=inflateRawSync(Buffer.from(blob.payload),{maxOutputLength:blob.rawBytes,info:true});raw=info.buffer;if(info.engine?.bytesWritten!==blob.payload.length)throw Error('tail');}catch{throw Error('M873_REJECT:leaf-compression');}
 if(raw.length!==blob.rawBytes||hash(raw)!==blob.sha)throw Error('M873_REJECT:leaf-digest');
 return {raw,value:parseStrict(raw)};
};
const decodeBase64=(text,expected,maxBytes)=>{
 if(typeof text!=='string'||text.length%4!==0)throw Error('M873_REJECT:base64');
 let padding=0;for(let i=0;i<text.length;i++){const code=text.charCodeAt(i);if(code===61){padding++;if(i<text.length-2||padding>2)throw Error('M873_REJECT:base64');}else{if(padding>0||!(code>=65&&code<=90||code>=97&&code<=122||code>=48&&code<=57||code===43||code===47))throw Error('M873_REJECT:base64');}}
 const raw=Buffer.from(text,'base64');if(raw.length!==expected||raw.length>maxBytes||raw.toString('base64')!==text)throw Error('M873_REJECT:base64');return raw;
};const fail=why=>{throw Error('M873_REJECT:'+why);};
const need=(v,why)=>{if(!v)fail(why);};
export const hash=b=>createHash('sha256').update(b).digest('hex');
export function canonical(v){if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';}
export const digest=v=>hash(canonical(v));
const same=(a,b)=>canonical(a)===canonical(b);
const h=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const text=v=>typeof v==='string'&&v.length>0&&v.length<=8192;
export function exact(v,required,optional=[]){need(v&&typeof v==='object'&&!Array.isArray(v),'object');const keys=Object.keys(v);need(required.every(k=>Object.hasOwn(v,k))&&keys.every(k=>required.includes(k)||optional.includes(k)),'exact-keys');return v;}
const fields=s=>s.split(',');
const selection={enabled:true,methodId:'project-bazi-mainchain-145/1.3.2',policyId:'naming-element-application/1.3.2-candidate.2',publicationId:'project-naming-application/1.3.2-candidate.2',entryPolicy:'month-branch-only'};
const revisionToken=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const limits={leaf:8388608,chunk:5242880,assets:4096,sourceUnique:128*1024**2,scan:8*1024**3};
const fixedConsumerExecution=Object.freeze({publicationId:'candidate2-session-consumer-execution/1',manifestSha256:'d3c555f7d3f6ced6d334d5efd52a8222ecb3f662e99fa20baa1ffc05e1ad057e',fullClosureSha256:'d3c555f7d3f6ced6d334d5efd52a8222ecb3f662e99fa20baa1ffc05e1ad057e',bundleSha256:'e01a47e90ccb1bdb7576a01bb8a3d5ca1a7939e49550b1a3dee9e451acd8d639',bundleBytes:3036131});
const ownerReaders=new WeakMap();
const makeOwnerReader=db=>{
 if(!db||typeof db.exec!=='function')fail('owner-reader');
 const owner=Object.freeze({});
 ownerReaders.set(owner,ref=>{
  reference(ref,ref.role);
  let rows;try{rows=db.exec('SELECT sha,raw_bytes,codec,payload FROM snapshot_blobs WHERE sha=?',[ref.sha]);}catch{fail('owner-reader-read');}
  need(Array.isArray(rows)&&rows.length===1&&rows[0]&&Array.isArray(rows[0].values)&&rows[0].values.length===1,'owner-reader-row');
  const row=rows[0].values[0];need(Array.isArray(row)&&row.length===4,'owner-reader-columns');
  const stored={sha:typeof row[0]==='string'?row[0]:String(row[0]),rawBytes:Number(row[1]),codec:row[2],payload:row[3]};
  need(stored.sha===ref.sha&&stored.rawBytes===ref.rawBytes&&stored.codec===ref.codec,'owner-reader-binding');
  need(stored.payload instanceof Uint8Array||Buffer.isBuffer(stored.payload),'owner-reader-payload');
  return stored;
 });
 return owner;
};
export const manualDraftWarning='人工喜用选择已修改，此批候选保留生成时的用字依据；重新生成可应用新选择。';
const projection=c=>Object.fromEntries(Object.entries(c).filter(([k])=>!['meaning','reason','traditionalReason','reviewNote','favorite','warnings'].includes(k)));
function originalDigest(v,key,reason){const copy={...v};delete copy[key];need(h(v[key])&&digest(copy)===v[key],reason);}
function reference(r,role){exact(r,fields('role,sha,rawBytes,codec'));need(r.role===role&&r.codec==='deflate-raw/1'&&h(r.sha)&&int(r.rawBytes,1,limits.leaf),'blob-reference');}
function dataIdentity(d){exact(d,fields('schema,packSha256,packBytes,datasetSha256,activeVersion,metadataVersion,namingRulesVersion,semanticSha256,reviewIdentity,sources'));need(d.schema==='candidate2-naming-data/1'&&d.namingRulesVersion==='naming-editorial-7.1.0'&&h(d.packSha256)&&h(d.datasetSha256)&&h(d.semanticSha256)&&d.activeVersion===d.packSha256.slice(0,12)&&int(d.packBytes,1,150*1024**2),'data-identity');sourceRecords(d.sources);}
function sourceRecords(rows){need(Array.isArray(rows)&&rows.length>0&&rows.length<=500,'sources');const ids=new Set();for(const r of rows){exact(r,fields('id,name,url,commit,license,files,sha256,note'));need(text(r.id)&&!ids.has(r.id)&&[r.name,r.url,r.commit,r.license,r.sha256,r.note].every(v=>typeof v==='string')&&Array.isArray(r.files)&&r.files.length<=500&&r.files.every(v=>typeof v==='string'),'source-record');ids.add(r.id);}}
function profileShape(p){exact(p,fields('id,customerName,surname,surnamePinyin,gender,calendar,birthDate,leapMonth,birthTime,timeUnknown,birthPlace,timezone,notes'),fields('fatherName,motherName,parentNameReadings,namingPreferences,monthAuthorityMethod,seasonalMethod,timeBasis,birthLongitude,renMethod'));need(text(p.id)&&p.timeUnknown===false,'profile');}
function prefShape(p){exact(p,fields('length,generationChar,requiredChars,forbiddenChars,elderTaboo,style,meanings,industry,priority,preferredElements,zodiacRules,numerology'),fields('avoidParentNames,parentNamePhonetics,wordPronunciationReference,elementAssessment,imageryReading,yueReading,namePhonetics,yueHomophones,yueHomophoneRuleVersion'));need(Array.isArray(p.preferredElements)&&p.preferredElements.every(e=>['木','火','土','金','水'].includes(e)),'preferences');}
function tuple(t){exact(t,fields('methodId,entryPolicy,enginePublicationId,engineFullClosureSha256,engineManifestSha256,policyId,policyPublicationId,applicationFullClosureSha256,applicationManifestSha256,namingInputVersion'));need(t.methodId===selection.methodId&&t.entryPolicy===selection.entryPolicy&&t.policyId===selection.policyId&&t.policyPublicationId===selection.publicationId&&t.enginePublicationId==='bazi-root-feedback/1.3.2;preview-publication-r2'&&t.namingInputVersion==='project-naming-input/1.0.0'&&[t.engineFullClosureSha256,t.engineManifestSha256,t.applicationFullClosureSha256,t.applicationManifestSha256].every(h),'application-tuple');}
export function inspectCandidate2SessionBytes(bytes){
 const s=parseStrict(bytes,16*1024**2);exact(s,fields('id,profileId,createdAt,profile,preferences,analysis,candidates,reviewNote,originalFavorable,dataVersion,sourceSnapshot,namingRules,reviewRevision,reviewToken,candidate2Naming'),['factVerification']);
 need(typeof s.id==='string'&&/^c2s_[a-f0-9]{32}$/.test(s.id)&&text(s.profileId)&&Number.isFinite(Date.parse(s.createdAt))&&int(s.reviewRevision,0,Number.MAX_SAFE_INTEGER-1)&&revisionToken.test(s.reviewToken),'session-identity');
 const a=exact(s.candidate2Naming,fields('schema,sessionBinding,request,generation,sourceCapsule,sourceWitnessDigest,sourceSnapshotDigest,attachmentDigest'));need(a.schema==='candidate2-naming-session/1','attachment-schema');originalDigest(a,'attachmentDigest','attachment-digest');
 exact(a.sessionBinding,fields('sessionId,profileId,createdAt'));need(same(a.sessionBinding,{sessionId:s.id,profileId:s.profileId,createdAt:s.createdAt}),'session-binding');reference(a.sourceCapsule,'candidate2-source-capsule');need(h(a.sourceWitnessDigest)&&h(a.sourceSnapshotDigest),'attachment-hashes');
 exact(a.request,fields('schema,profile,preferences,selection'));need(a.request.schema==='candidate2-session-request/1'&&same(a.request.selection,selection),'request');profileShape(a.request.profile);prefShape(a.request.preferences);
 const g=exact(a.generation,fields('schema,status,consumerVersion,profile,preferences,selection,baseAnalysis,application,dataIdentity,domainProjection,seed,excludeNames,candidates,messages,digest'));need(g.schema==='candidate2-naming-generation/1'&&g.status==='generated'&&g.consumerVersion==='candidate2-naming-consumer/1.0.0'&&same(g.selection,selection),'generation-schema');originalDigest(g,'digest','generation-digest');profileShape(g.profile);prefShape(g.preferences);dataIdentity(g.dataIdentity);
 need(g.preferences.preferredElements.length===0&&same(g.profile.namingPreferences,g.preferences)&&same(s.profile,g.profile)&&s.profileId===g.profile.id&&a.request.profile.id===g.profile.id&&same(s.analysis,g.baseAnalysis)&&same(s.originalFavorable,g.baseAnalysis.bazi.favorable),'original-profile-preference-base');
 need(g.dataIdentity.sources.some(r=>r.id==='naming-editorial-meanings-v7-fixed'),'complete-7.0-dependency');
 need(!Object.hasOwn(s.analysis,'projectNamingUse')&&!Object.hasOwn(s.analysis,'sourceRecipe')&&!Object.hasOwn(s,'sourceRecipe'),'legacy-mixed');
 prefShape(s.preferences);need(same({...s.preferences,preferredElements:g.preferences.preferredElements},g.preferences),'review-preference-only-manual-draft');
 need(int(g.seed,Number.MIN_SAFE_INTEGER,Number.MAX_SAFE_INTEGER)&&Array.isArray(g.excludeNames)&&g.excludeNames.length<=10000&&g.excludeNames.every(v=>typeof v==='string'&&v.length<=100),'mechanics');
 exact(g.application,fields('schema,tuple,replay,certificate,application,digest'));need(g.application.schema==='project-naming-use/2','application-schema');tuple(g.application.tuple);originalDigest(g.application,'digest','application-digest');
 exact(g.domainProjection,fields('schema,source,originalPreferencesDigest,effectivePreferencesDigest,applied,userManualElements,baseAnalysisUnchanged,domainEntry,namingRulesVersion,limitation'));need(g.domainProjection.schema==='candidate2-domain-element-projection/1'&&g.domainProjection.source==='candidate.2-authorized-elements'&&g.domainProjection.baseAnalysisUnchanged===true&&g.domainProjection.userManualElements.length===0&&g.domainProjection.originalPreferencesDigest===digest(g.preferences)&&same(g.domainProjection.applied,g.application.application.elements.applied),'projection');
 need(Array.isArray(g.candidates)&&g.candidates.length>0&&g.candidates.length<=100&&Array.isArray(s.candidates)&&s.candidates.length===g.candidates.length,'candidate-count');const ids=new Set();for(let i=0;i<s.candidates.length;i++){const c=s.candidates[i],original=g.candidates[i];need(text(c.id)&&!ids.has(c.id)&&same(projection(c),projection(original)),'immutable-candidate-or-order');ids.add(c.id);need(['meaning','reason','traditionalReason','reviewNote'].every(k=>typeof c[k]==='string')&&typeof c.favorite==='boolean','review-fields');need(same(c.warnings,original.warnings)||same(c.warnings,[...original.warnings,manualDraftWarning]),'controlled-review-warning');}
 exact(s.sourceSnapshot,fields('version,dataVersion,sources'));need(s.sourceSnapshot.version==='session-sources/1.0.0'&&s.sourceSnapshot.dataVersion===s.dataVersion&&s.dataVersion===g.dataIdentity.activeVersion&&digest(s.sourceSnapshot)===a.sourceSnapshotDigest,'source-snapshot');sourceRecords(s.sourceSnapshot.sources);
 const dedicated=s.sourceSnapshot.sources.filter(r=>['naming-editorial-readings-v4-fixed','naming-editorial-names-v5-fixed','naming-editorial-dictionary-v6-fixed','naming-editorial-meanings-v7-fixed','naming-character-meanings-v7.1-fixed'].includes(r.id));need(dedicated.length===1&&dedicated[0].id==='naming-character-meanings-v7.1-fixed','one-active-naming-publication');
 exact(s.namingRules,fields('version,dataVersion,sourceId'));need(same(s.namingRules,{version:'naming-editorial-7.1.0',dataVersion:s.dataVersion,sourceId:'naming-character-meanings-v7.1-fixed'}),'naming-rules');
 return {session:s,rawReplayContext:{profile:a.request.profile,preferences:a.request.preferences,selection:a.request.selection},fixedSourceRuntimeAuthentication:'required'};
}
export function decodeCandidate2SourceClosureFromSqlDatabase(db,session){return decodeCandidate2SourceClosure(makeOwnerReader(db),session);}
export function decodeCandidate2SourceClosure(owner,session){
 const read=ownerReaders.get(owner);need(typeof read==='function','owner-reader');
 const a=session.candidate2Naming,ref=a.sourceCapsule;reference(ref,'candidate2-source-capsule');const stored=read(ref);const w=decodeLeaf(stored).value;
 exact(w,fields('schema,replayPublicationId,consumerVersion,applicationTuple,applicationRuntime,consumerExecution,runtimeEnvironment,dataIdentity,sourceRecords,assets,witnessDigest'));need(w.schema==='candidate2-naming-source-capsule/1'&&w.replayPublicationId==='candidate2-session-replay/1'&&w.consumerVersion===a.generation.consumerVersion,'source-capsule-schema');originalDigest(w,'witnessDigest','witness-digest');need(w.witnessDigest===a.sourceWitnessDigest&&same(w.dataIdentity,a.generation.dataIdentity)&&same(w.applicationTuple,a.generation.application.tuple)&&same(w.sourceRecords,session.sourceSnapshot.sources),'witness-binding');tuple(w.applicationTuple);dataIdentity(w.dataIdentity);
 exact(w.applicationRuntime,fields('file,sha256,byteLength,receiptSha256'));need(w.applicationRuntime.file==='application.cjs'&&w.applicationRuntime.sha256==='906b191c88ce2e6f0335c674727c39bcae14edf2968d2c1c5cdffcb04079b47a'&&w.applicationRuntime.byteLength===2002922&&h(w.applicationRuntime.receiptSha256),'fixed-application-runtime');
 exact(w.consumerExecution,fields('publicationId,manifestSha256,fullClosureSha256,bundleSha256,bundleBytes'));need(w.consumerExecution.publicationId==='candidate2-session-consumer-execution/1'&&[w.consumerExecution.manifestSha256,w.consumerExecution.fullClosureSha256,w.consumerExecution.bundleSha256].every(h)&&int(w.consumerExecution.bundleBytes,1,limits.sourceUnique)&&same(w.consumerExecution,fixedConsumerExecution),'consumer-execution-registry');exact(w.runtimeEnvironment,fields('node,icu,tz,unicode'));need(text(w.runtimeEnvironment.node)&&[w.runtimeEnvironment.icu,w.runtimeEnvironment.tz,w.runtimeEnvironment.unicode].every(v=>v===null||text(v))&&same(w.runtimeEnvironment,a.generation.application.certificate.applicationIdentity.runtimeEnvironment),'runtime-environment');
 need(Array.isArray(w.assets)&&w.assets.length>0&&w.assets.length<=limits.assets,'source-assets');const ids=new Set(),paths=new Set(),unique=new Map(),byId=new Map();let logical=stored.rawBytes,total=0;
 for(const src of w.assets){exact(src,fields('id,scope,path,mediaType,byteLength,sha256,chunks'));need(text(src.id)&&!ids.has(src.id)&&['data','application-assets','application-runtime','consumer-execution','build-receipt'].includes(src.scope)&&text(src.path)&&!src.path.startsWith('/')&&!src.path.includes('\\')&&!src.path.includes(':')&&!src.path.split('/').some(p=>p==='.'||p==='..'||!p)&&!/[\u0000-\u001f]/.test(src.path),'asset-identity-or-path');ids.add(src.id);const key=(src.scope+':'+src.path).toLowerCase();need(!paths.has(key),'asset-path-alias');paths.add(key);need(h(src.sha256)&&int(src.byteLength,0,limits.sourceUnique)&&Array.isArray(src.chunks)&&src.chunks.length===Math.ceil(src.byteLength/limits.chunk),'asset-length');if(!unique.has(src.sha256)){total+=src.byteLength;need(total<=limits.sourceUnique,'source-total-budget');unique.set(src.sha256,src.byteLength);}else need(unique.get(src.sha256)===src.byteLength,'source-hash-length-conflict');for(const r of src.chunks){reference(r.blob,'candidate2-source-chunk');logical+=r.blob.rawBytes;need(logical<=limits.scan,'logical-scan-budget');}}
 for(const src of w.assets){const parts=[];for(let i=0;i<src.chunks.length;i++){const r=src.chunks[i];exact(r,fields('ordinal,offset,byteLength,chunkSha256,blob'));need(r.ordinal===i&&r.offset===i*limits.chunk&&r.byteLength===Math.min(limits.chunk,src.byteLength-r.offset)&&h(r.chunkSha256)&&r.blob.sha!==ref.sha,'chunk-range-or-backref');const b=read(r.blob);const raw=decodeLeaf(b),c=exact(raw.value,fields('schema,encoding,byteLength,sha256,data'));need(c.schema==='candidate2-naming-source-chunk/1'&&c.encoding==='base64'&&c.byteLength===r.byteLength&&c.sha256===r.chunkSha256&&canonical(c)===raw.raw.toString('utf8'),'typed-chunk');const bytes=decodeBase64(c.data,c.byteLength,limits.chunk);need(hash(bytes)===c.sha256,'chunk-source-sha');parts.push(bytes);}const bytes=Buffer.concat(parts);need(bytes.length===src.byteLength&&hash(bytes)===src.sha256,'whole-source-sha');byId.set(src.id,bytes);}
 const get=(scope,p)=>{const r=w.assets.find(x=>x.scope===scope&&x.path===p);need(r,'mandatory-source-asset');return byId.get(r.id);};
 need(hash(get('data','knowledge-v6.sqlite'))===w.dataIdentity.packSha256&&get('data','knowledge-v6.sqlite').length===w.dataIdentity.packBytes&&hash(get('data','dataset-v6.json'))===w.dataIdentity.datasetSha256,'archived-data-bindings');
 need(hash(get('application-runtime','application.cjs'))===w.applicationRuntime.sha256&&hash(get('build-receipt','application.cjs.receipt.json'))===w.applicationRuntime.receiptSha256,'archived-application-runtime');
 const manifestBytes=get('build-receipt','consumer-execution-manifest.json'),manifest=parseStrict(manifestBytes);exact(manifest,fields('schema,esbuildVersion,options,externalRuntimeModules,inputs'));exact(manifest.options,fields('platform,format,target,charset'));need(hash(manifestBytes)===w.consumerExecution.manifestSha256&&digest(manifest)===w.consumerExecution.fullClosureSha256&&manifest.schema==='candidate2-consumer-execution-manifest/1'&&same(manifest.options,{platform:'node',format:'cjs',target:'node22',charset:'utf8'})&&Array.isArray(manifest.externalRuntimeModules)&&manifest.externalRuntimeModules.every(v=>typeof v==='string'&&v.startsWith('node:'))&&new Set(manifest.externalRuntimeModules).size===manifest.externalRuntimeModules.length&&Array.isArray(manifest.inputs)&&manifest.inputs.length>0&&manifest.inputs.length<=4096,'consumer-manifest');
 need(hash(get('consumer-execution','consumer.cjs'))===w.consumerExecution.bundleSha256&&get('consumer-execution','consumer.cjs').length===w.consumerExecution.bundleBytes,'consumer-bundle');for(const input of manifest.inputs){exact(input,fields('path,bytes,sha256'));const actual=get('consumer-execution',input.path);need(actual.length===input.bytes&&hash(actual)===input.sha256,'consumer-input-closure');}
 return {witness:w,sourceBytesById:byId,sourceUniqueBytes:total,logicalScanBytes:logical,byteIntegrity:'verified',fixedSourceRuntimeAuthentication:'required',runtimeFromSqlExecutable:false};
}
