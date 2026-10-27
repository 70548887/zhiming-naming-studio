import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {types} from 'node:util';
import {loadNamingSemanticAdmissionV72,NAMING_V72_FIXED_PINS} from './naming-semantic-admission-v72-data';
import {loadNamingEditorialV71Data} from './naming-editorial-v7-data';
import {createM779AdmittedElementImagery} from './m779-admitted-element-imagery';
import type {M779AdmittedElementImagery} from './m779-admitted-element-imagery';
import type {SourceRecord} from '../shared/types';

// Trusted application registration. No environment, IPC or caller review override.
const PUBLICATION_ID='reviewed-naming-data/1.0.0' as const;
const PUBLICATION_PATH='assets/'+PUBLICATION_ID;
const MANIFEST_SHA='3f6d403b322964f8ced4b43f1cdce0d30772a4e568f50b872073582aa7d5b4d0';
const authenticated=new WeakMap<object,string>();
interface ImageryFilePin {path:string;bytes:number;sha256:string}
interface ImageryCapsule {imagery:M779AdmittedElementImagery;manifestSha256:string;files:readonly ImageryFilePin[]}
// Parsed source facts only. Every entry remains private and is reusable only
// after the complete original M779 publication is freshly read and SHA checked.
const imageryCapsules=new Map<string,ImageryCapsule>();
const fail=(code:string):never=>{throw Error('Reviewed naming data: '+code);};
const hash=(bytes:crypto.BinaryLike)=>crypto.createHash('sha256').update(bytes).digest('hex');
function freeze<T>(value:T):T {
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}
 return value;
}
interface PublicationManifest {
 schemaVersion:string;publicationId:string;
 evidence:{
  m751:{originalCommit:string;integrationCommit:string;reviewStatus:'candidate-not-independently-reviewed';snapshotSha256:string};
  m752:{manifestSha256:string;decisionSha256:string};
  m740:{deliverySha256:string;manifestSha256:string;lockSha256:string};
  m744:{auditSha256:string};
 };
 files:{path:string;bytes:number;sha256:string}[];
}

function checkedImageryCapsule(applicationRoot:string):M779AdmittedElementImagery {
 const cached=imageryCapsules.get(applicationRoot),imagery=cached?.imagery??createM779AdmittedElementImagery(applicationRoot);
 const publicationRoot=fs.realpathSync(path.join(applicationRoot,'assets/project-element-imagery/1.0.0'));
 if(!publicationRoot.startsWith(applicationRoot+path.sep))return fail('imagery-publication-path-escape');
 const read=(relative:string):Buffer=>{
  if(typeof relative!=='string'||!relative||path.isAbsolute(relative)||relative.includes('\\')||relative.includes(':')||relative.split('/').some(part=>!part||part==='.'||part==='..'))return fail('invalid-imagery-publication-path');
  const resolved=fs.realpathSync(path.join(publicationRoot,relative));
  if(!resolved.startsWith(publicationRoot+path.sep)||!fs.statSync(resolved).isFile())return fail('imagery-publication-file-escape');
  return fs.readFileSync(resolved);
 };
 // This expected identity can originate only in the successful fixed M779
 // factory above. Neither a caller object nor the on-disk manifest sets it.
 const manifestBytes=read('manifest.json'),manifestSha256=cached?.manifestSha256??imagery.identity.manifestSha256;
 if(hash(manifestBytes)!==manifestSha256)return fail('imagery-publication-manifest-mismatch');
 let files=cached?.files;
 if(!files){
  const manifest=JSON.parse(manifestBytes.toString('utf8')) as {schemaVersion:string;publicationId:string;files:ImageryFilePin[]};
  if(manifest.schemaVersion!=='m779-admitted-element-imagery-manifest/1.0.0'||manifest.publicationId!==imagery.identity.publicationId||manifest.files.length!==21||new Set(manifest.files.map(row=>row.path)).size!==21)return fail('imagery-publication-identity-mismatch');
  files=freeze(manifest.files.map(row=>({path:row.path,bytes:row.bytes,sha256:row.sha256})));
 }
 for(const pin of files){const bytes=read(pin.path);if(bytes.length!==pin.bytes||hash(bytes)!==pin.sha256)return fail('imagery-publication-file-mismatch:'+pin.path);}
 if(!cached)imageryCapsules.set(applicationRoot,freeze({imagery,manifestSha256,files}));
 return imagery;
}

/** Freshly reads the complete fixed publication and all independently pinned consumers. */
export function loadReviewedNamingDataResources(applicationRoot:string) {
 if(arguments.length!==1||typeof applicationRoot!=='string'||!applicationRoot.trim())return fail('invalid-factory-configuration');
 const root=fs.realpathSync(applicationRoot),publicationRoot=fs.realpathSync(path.join(root,PUBLICATION_PATH));
 if(!publicationRoot.startsWith(root+path.sep))return fail('publication-path-escape');
 const verified=new Map<string,Buffer>();
 const read=(relative:string):Buffer=>{
  if(typeof relative!=='string'||!relative||path.isAbsolute(relative)||relative.includes('\\')||relative.includes(':')||relative.split('/').some(part=>!part||part==='.'||part==='..'))return fail('invalid-publication-path');
  const resolved=fs.realpathSync(path.join(publicationRoot,relative));
  if(!resolved.startsWith(publicationRoot+path.sep)||!fs.statSync(resolved).isFile())return fail('publication-file-escape');
  const bytes=fs.readFileSync(resolved);verified.set(relative,bytes);return bytes;
 };
 const manifestBytes=read('manifest.json');if(hash(manifestBytes)!==MANIFEST_SHA)return fail('publication-manifest-mismatch');
 const manifest=JSON.parse(manifestBytes.toString('utf8')) as PublicationManifest;
 if(manifest.schemaVersion!=='reviewed-naming-data-manifest/1.0.0'||manifest.publicationId!==PUBLICATION_ID||manifest.files.length!==116||new Set(manifest.files.map(row=>row.path)).size!==116)return fail('publication-identity-mismatch');
 for(const file of manifest.files){const bytes=read(file.path);if(bytes.length!==file.bytes||hash(bytes)!==file.sha256)return fail('publication-file-mismatch:'+file.path);}
 const dataDir=path.join(publicationRoot,'product/data');
 const semantic=loadNamingSemanticAdmissionV72({
  decisionRoot:path.join(publicationRoot,'originals/m752-r2'),
  m740Root:path.join(publicationRoot,'originals/m740'),
  sourceDataDir:dataDir,
  m744AuditPath:path.join(publicationRoot,'originals/m744/M744-DATA-AUDIT.json'),
  sourceRoots:{'product-data':dataDir,'product-root':path.join(publicationRoot,'product'),m690:path.join(publicationRoot,'upstream/m690'),'old-batch-occupancy':path.join(publicationRoot,'upstream/old-batch-occupancy')},
 });
 const editorial=loadNamingEditorialV71Data(dataDir);
 if(editorial.profile.cases.length!==60||editorial.admission.approvedCaseIds.length!==60)return fail('reviewed-sixty-character-publication-required');
 const imagery=checkedImageryCapsule(root);
 const identity=freeze({publicationId:PUBLICATION_ID,manifestSha256:MANIFEST_SHA,semantic:semantic.publication.identity,imagery:imagery.identity,sourceEvidence:{...manifest.evidence,editorialV71:editorial.identity}});
 const pins=NAMING_V72_FIXED_PINS;
 const sourceRecords:readonly SourceRecord[]=freeze([
  {id:'reviewed-naming-data-1.0.0',name:'已审命名资料固定出版1.0.0',url:'',commit:PUBLICATION_ID,license:'Original source licenses and notices retained; project publication metadata CC0-1.0',files:[PUBLICATION_PATH+'/manifest.json',PUBLICATION_PATH+'/NOTICE.md'],sha256:MANIFEST_SHA,note:'固定原件闭包；M752-r2独立九条资格、M460已审六十条逐字说明及M779十条项目物象分别保留身份。'},
  {id:'m752-semantic-generation-admission-r2',name:'M752-r2 单字命名义独立准入决策',url:'',commit:semantic.publication.identity.ruleVersion+';M752-r2',license:'CC0-1.0 project eligibility/editorial; original source licenses retained',files:[PUBLICATION_PATH+'/originals/m752-r2/manifest.json',PUBLICATION_PATH+'/originals/m752-r2/m740-generation-admission.json'],sha256:pins.policyManifest,note:'精确M752-r2决策原件；九条有条件单字资格，不授予整名语义、语义分或传统归属权威。decisionSha256='+pins.decision},
  {id:'m751-semantic-admission-consumer-candidate',name:'M751 单字准入消费者候选源码原件',url:'',commit:manifest.evidence.m751.originalCommit+';integrated:'+manifest.evidence.m751.integrationCommit,license:'Internal project source evidence; no new license grant asserted',files:[PUBLICATION_PATH+'/originals/m751-consumer/snapshot.json'],sha256:manifest.evidence.m751.snapshotSha256,note:'候选消费者源码凭据，尚未独立审查；只保存原件，运行时不执行归档源码。其candidate状态不撤销M752独立决策。'},
  {id:'m740-default-meanings-candidate-originals',name:'M740 原始候选来源绑定资料',url:'',commit:'m740-default-meanings/1.0.0',license:'CC0-1.0 project editorial; MOE CC-BY-ND-3.0-TW; Unicode terms retained',files:[PUBLICATION_PATH+'/originals/m740/M740-MANIFEST.json',PUBLICATION_PATH+'/originals/m740/data/manifest.json',PUBLICATION_PATH+'/originals/m740/data/source-lock.json'],sha256:pins.m740Delivery,note:'原始candidate-only、manual-only及generationAuthority=false字节保留；独立M752决定本版精确资格。'},
  {id:'m744-character-meaning-source-audit',name:'M744 单字义来源独立审计',url:'',commit:'M744-DATA',license:'Internal project source audit evidence; no new license grant asserted',files:[PUBLICATION_PATH+'/originals/m744/M744-DATA-AUDIT.json',PUBLICATION_PATH+'/originals/m744/M744-DATA-AUDIT.md'],sha256:pins.m744Audit,note:'来源身份审计与生成准入权威分别保留；本审计自身不授予生成权限。'},
  ...editorial.sources,
  ...imagery.sourceRecords,
 ]);
 // Retain no Buffers in the public result. Nested JSON and all source records are frozen.
 verified.clear();
 const resources=freeze({identity,semantic,imagery,sourceRecords,dataDir});authenticated.set(resources,root);return resources;
}
export type ReviewedNamingDataResources=ReturnType<typeof loadReviewedNamingDataResources>;
export function isAuthenticatedReviewedNamingDataResources(value:unknown):value is ReviewedNamingDataResources {
 return value!==null&&typeof value==='object'&&!types.isProxy(value)&&authenticated.has(value);
}
/** A main-owned capability selects only its originally registered application root. */
export function refreshReviewedNamingDataResources(resources:ReviewedNamingDataResources):ReviewedNamingDataResources {
 if(arguments.length!==1||!isAuthenticatedReviewedNamingDataResources(resources))return fail('main-authenticated resources required');
 return loadReviewedNamingDataResources(authenticated.get(resources)!);
}
