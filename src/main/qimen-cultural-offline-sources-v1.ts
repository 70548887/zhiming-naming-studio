import * as fs from 'node:fs';
import * as path from 'node:path';
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {ownCulturalJson} from '../domain/qimen-cultural-comparison-canonical';
import type {CulturalProviderMaterial,CulturalProviderJsonMaterial,CulturalProviderBlobReference} from '../shared/qimen-cultural-provider-v1';
import {loadCulturalProviderSources} from './qimen-cultural-provider-sources-v1';
import type {CulturalProviderSourcesV1} from './qimen-cultural-provider-sources-v1';

export interface CulturalOfflineSourceAuthenticationV1 {
 sourceMetadata:Omit<CulturalProviderSourcesV1,'blobs'>;
 /** Original supplied archive bytes only; this does not grant source admission. */
 originalKnowledgePack:Uint8Array|null;
}
const PREFIX='source:';
const POLICY_ID='source:cultural-source:label-policy-descriptor';
const POLICY_PATH='@generated/qimen-cultural-existing-editorial-label-policy-v1.json';
const POLICY_SHA='9dfaf17a35883d5c6d369de6d4d974c5d86957a80ce2ca6c68f8cca94c8eb36d';
// These are code-owned pins, independently bound to the original fixed M779
// publication manifest and six source locks. Input refs never extend this set.
const FIXED_SOURCE_FILES:readonly (readonly [string,string,number])[]=[
  [
    "assets/project-element-imagery/1.0.0/data/dataset-v6.json",
    "3245e1701046d43562520926d185e8363da8bf27c2523fc27a7de4e15eda0728",
    1563457
  ],
  [
    "assets/project-element-imagery/1.0.0/data/element-imagery-m754/admission-template.json",
    "2aaaab2b7da0dea29a4430a8241f166e23df1ad2761a307ea0edf2fb5ed35c36",
    2764
  ],
  [
    "assets/project-element-imagery/1.0.0/data/element-imagery-m754/convention-candidates.json",
    "28c423f31cb106964f2ed01bfcdd3139f16eae6af14317ba45623781b4e3de1c",
    10755
  ],
  [
    "assets/project-element-imagery/1.0.0/data/element-imagery-m754/coverage.json",
    "750b27cc6e59eb0bdc7dcfa86e7b71e5da958d88359721507c9cc308dee2131b",
    8954
  ],
  [
    "assets/project-element-imagery/1.0.0/data/element-imagery-m754/dictionary-facts.json",
    "40c3a919c02a1cf1eeaa056f4de2af3f6e6c0825c6c061a1c8911afdc2af46d5",
    20758
  ],
  [
    "assets/project-element-imagery/1.0.0/data/element-imagery-m754/editorial-input.json",
    "a9ee9581e89db0963306fe6a08b7b62fcfa6a224f07a5e77ce858850f2aad581",
    4988
  ],
  [
    "assets/project-element-imagery/1.0.0/data/element-imagery-m754/README.md",
    "8a06a0202cc226f78c612bcc06cf93098f16627f3984e04c327ee777e7e28638",
    2188
  ],
  [
    "assets/project-element-imagery/1.0.0/data/element-imagery-m754/source-lock.json",
    "e33287aac335327e58f772def9c7f8064abed174d7988b4ac6f452eba68ada72",
    3825
  ],
  [
    "assets/project-element-imagery/1.0.0/data/element-imagery-m754/source-pins.json",
    "e3326102cf608e62719d84b75244de07784fdacfbcd3bd0bea2c617ae8938cca",
    3764
  ],
  [
    "assets/project-element-imagery/1.0.0/data/element-imagery-m770/independent-review.json",
    "89ad0ade1a15adb0f801649b650888f376d84f51c469de4f1455bf42a4280509",
    6688
  ],
  [
    "assets/project-element-imagery/1.0.0/data/element-imagery-m770/m777-admission-decision.json",
    "abbdac6c87e14c033de43e40acada9ac2ddcf4ae90761066b6f036cb4e57c64e",
    14013
  ],
  [
    "assets/project-element-imagery/1.0.0/data/element-imagery-m770/m777-report.md",
    "af10dcd655f0b45de2e6c6b33a8040fec61bc1b11124a59032b3bbd8d83f165c",
    8169
  ],
  [
    "assets/project-element-imagery/1.0.0/data/element-imagery-m770/publication.json",
    "3c35aee05586fd74314e029983203c21a1210a2ea6e0ae60800dc11ebfd5258a",
    1737
  ],
  [
    "assets/project-element-imagery/1.0.0/data/raw/CC-BY-ND-3.0-TW.html",
    "04e6ef69a223b6e13c93c97a918ad5fd0dbb9fc34ae307f4449ed264e2d4108f",
    31775
  ],
  [
    "assets/project-element-imagery/1.0.0/data/raw/kMandarin.txt",
    "e549450d76b4f7f79dcf3c928f17f62dc7dcfda904dd4db983a18d4afab221e3",
    462072
  ],
  [
    "assets/project-element-imagery/1.0.0/data/raw/kSimplifiedVariant.txt",
    "a7f0c9dbbca85cffd90517fa6ea9be97d2e6f811328a59b6b303d58a418ac9be",
    88425
  ],
  [
    "assets/project-element-imagery/1.0.0/data/raw/kTraditionalVariant.txt",
    "4eca6285d45070548e6e6c06e4b48c3ca6866d4380e8cb980c512f5d1fc71895",
    86288
  ],
  [
    "assets/project-element-imagery/1.0.0/data/raw/moe-README.md",
    "a93321d9381bc1cf34b4ad844f71607fa748c86c0b228ae37d46720d6a659cb2",
    1214
  ],
  [
    "assets/project-element-imagery/1.0.0/data/raw/moe-revised.json.gz",
    "cf29701f887bd3b58e9520df53d905e2697ff13a408d70a771b0458f3039fb2e",
    20310688
  ],
  [
    "assets/project-element-imagery/1.0.0/data/raw/unicode-LICENSE",
    "fe5c62b543e287981db198f2acfa0ca732d12591a1024536dc8fd85dacd77104",
    2033
  ],
  [
    "assets/project-element-imagery/1.0.0/manifest.json",
    "79fc7b9c1ffb4098c960cbd65ff0a9b92c69a41d680ed581380457c1180209f9",
    3780
  ],
  [
    "assets/project-element-imagery/1.0.0/NOTICE.md",
    "710c43d59afb05cf2134790ce353aacec46d29fa5708d5701ae3c8b3178e08f0",
    1202
  ],
  [
    "data/bazi-evidence-project-profile.json",
    "b0df93b0b9d7e78809391acd8d99829b50d32f6ef31ce4535f1ca3f7096b131b",
    1994
  ],
  [
    "data/bazi-evidence-source-lock.json",
    "4c0a03716599878e4d1fcc3f6f3f207c2a469cdcc041955fe3c31cae24b68b50",
    3668
  ],
  [
    "data/name-imagery-profile.json",
    "578051fdef91ce0a4615c63dd28b2cf1fe7a3fefcd50203ee7451fb8c7deab8c",
    3401
  ],
  [
    "data/name-imagery-source-lock.json",
    "d1c074aea2fe08ee0542ff06eecfddbd1a5638c1e8ac142e41196c58b772ec65",
    1943
  ],
  [
    "data/qimen-markers-source-lock.json",
    "921d35d90b3dcc8d3ae1c1cc6befc7748036b5c58b9dd6852a821f4a27827dae",
    2178
  ],
  [
    "data/qimen-patterns-source-lock.json",
    "d620d224f56ef9815030174c49351bb71855cb4a2f267ebe4712c548c78edb37",
    2893
  ],
  [
    "data/qimen-stem-tombs-source-lock.json",
    "406779b1d83236c8c8dde89b1def7dd18caf81fee981904b45d45655daf5d9e8",
    1528
  ],
  [
    "data/qimen-stem-tombs-table.json",
    "56ae5cd8e7b9cae39d49f0f4eae0da38f0995b00b5354b5ac91061a3fa8405e2",
    4236
  ],
  [
    "data/raw/bazi-evidence-go-ganzhi.go",
    "0dd04c5c2f290e87822ff85770f203467c1a7a69ced56990d808c718aa14b401",
    10928
  ],
  [
    "data/raw/bazi-evidence-go-LICENSE.txt",
    "cfdb13c1a086ecc3f498b6a75a65d1dab3d93072c58efd26d383db776749b996",
    1067
  ],
  [
    "data/raw/bazi-evidence-lunar-LICENSE.txt",
    "097ec7989106eb9a27b6eff71dbaf1cd6bb04a9b35b6c94b54fff0829a041a8c",
    1062
  ],
  [
    "data/raw/bazi-evidence-lunar-Lunar.ts",
    "91217f0d1e12dab85fd6b785a0b3a96e45fbfabd04982df04a7ff48c3d9f2362",
    54727
  ],
  [
    "data/raw/bazi-evidence-lunar-LunarUtil.ts",
    "bf42bab2a158dcbe59112111b097104574b5df5bfd5d27b8b63b7782f9403e1c",
    129412
  ],
  [
    "data/raw/bazi-evidence-project-NOTICE.md",
    "a4b5ea5b6b78eed80bc0df35b099a83e9f8fbcaef689193cd30d724a0285a2e8",
    1483
  ],
  [
    "data/raw/name-imagery-arc-LICENSE.txt",
    "755492b998c35531be98e6af2f8f0ec8ff11281568b3d3a319d43f246f998147",
    1061
  ],
  [
    "data/raw/name-imagery-arc-palace-excerpts.json",
    "60657fbb06309edc16257138789ca38af66b0332ee892c7d79e59fa04daa85a8",
    1517
  ],
  [
    "data/raw/name-imagery-NOTICE.md",
    "581a3d7a2750702bf2b23f93cf25048bdc23c6da9606698019d1aacd9d039d34",
    1238
  ],
  [
    "data/raw/qimen-markers-arc-constants.js",
    "7dc6e2470862c5bf418020ac3aeb771936abb7e47549b426892578656ad86592",
    27000
  ],
  [
    "data/raw/qimen-markers-arc-LICENSE.txt",
    "755492b998c35531be98e6af2f8f0ec8ff11281568b3d3a319d43f246f998147",
    1061
  ],
  [
    "data/raw/qimen-markers-go-ganzhi.go",
    "0dd04c5c2f290e87822ff85770f203467c1a7a69ced56990d808c718aa14b401",
    10928
  ],
  [
    "data/raw/qimen-markers-go-LICENSE.txt",
    "cfdb13c1a086ecc3f498b6a75a65d1dab3d93072c58efd26d383db776749b996",
    1067
  ],
  [
    "data/raw/qimen-markers-go-qimen.go",
    "93ba61a632af3d402bfd65754d1adeb74b937f87b40e62fc50adc15a1d4bd350",
    15739
  ],
  [
    "data/raw/qimen-patterns-arc-calculations.js",
    "1915f79a22978c2824c527e30a2f84ac512895f232f11b43ce80e9caaecfc10d",
    35811
  ],
  [
    "data/raw/qimen-patterns-arc-constants.js",
    "7dc6e2470862c5bf418020ac3aeb771936abb7e47549b426892578656ad86592",
    27000
  ],
  [
    "data/raw/qimen-patterns-arc-LICENSE.txt",
    "755492b998c35531be98e6af2f8f0ec8ff11281568b3d3a319d43f246f998147",
    1061
  ],
  [
    "data/raw/qimen-patterns-arc-patterns.js",
    "ecfa15302bbb715e51d6a9c27ce594c02d0c06cb92dd40bd67eae42e0a12f9f3",
    60131
  ],
  [
    "data/raw/qimen-patterns-arc-test.js",
    "a373105f0cc6702717f922c510d8a99db429b30d24f42209abb0b16af2bc2021",
    188651
  ],
  [
    "data/raw/qimen-patterns-arc-utils.js",
    "2add29d5018ece7d755103a041205bee3075b9ec4b6fd56020c3827baf9a2e86",
    10021
  ],
  [
    "data/raw/qimen-patterns-go-LICENSE.txt",
    "cfdb13c1a086ecc3f498b6a75a65d1dab3d93072c58efd26d383db776749b996",
    1067
  ],
  [
    "data/raw/qimen-patterns-go-qimen_defs.go",
    "bacb7684160cb0d4297e1a13fb3674c7eebf56183fea2e7a5c12bb18a7dd47ac",
    19805
  ],
  [
    "data/raw/qimen-stem-tombs-go-defs.go",
    "bacb7684160cb0d4297e1a13fb3674c7eebf56183fea2e7a5c12bb18a7dd47ac",
    19805
  ],
  [
    "data/raw/qimen-stem-tombs-go-ganzhi.go",
    "0dd04c5c2f290e87822ff85770f203467c1a7a69ced56990d808c718aa14b401",
    10928
  ],
  [
    "data/raw/qimen-stem-tombs-go-LICENSE.txt",
    "cfdb13c1a086ecc3f498b6a75a65d1dab3d93072c58efd26d383db776749b996",
    1067
  ],
  [
    "data/raw/solar-time-independent-reference.json",
    "7b6c31b27a6be7e8352a6389fa0a89dea2203c5d7c6c8566682f253774511f3c",
    49595
  ],
  [
    "data/raw/solar-time-noaa-excerpts.json",
    "f2f17e818089d7a81e458c143218c5d46b33cec0889dbedfdbace5de53968c8f",
    6592
  ],
  [
    "data/raw/solar-time-NOTICE.md",
    "f6d632782addd74b4f71f8b529d03483e3f5466468016a82f500e1c7fa74db15",
    2928
  ],
  [
    "data/solar-time-source-lock.json",
    "09c7946574ce37f0b2ee5204f76e61167a8001614157c2238b2e80658f383481",
    1437
  ]
];
const MAX_ACTUAL_BYTES=128*1024*1024; // Frozen M856 private material vault bound.
const fail=():never=>{throw new Error('CULTURAL_OFFLINE_SOURCE_INVALID');};
const sha=(bytes:Uint8Array|string):string=>createHash('sha256').update(bytes).digest('hex');
const hash=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const exact=(value:object,keys:readonly string[]):boolean=>Object.keys(value).sort().join('|')===[...keys].sort().join('|');
function data(value:object,key:string):unknown {
 const d=Object.getOwnPropertyDescriptor(value,key);
 if(!d||!Object.hasOwn(d,'value')||!d.enumerable)return fail();return d.value;
}
function ownedPayloads(values:readonly {sha256:string;bytes:Uint8Array}[]):Map<string,Uint8Array>{
 if(!values||types.isProxy(values)||!Array.isArray(values)||Object.getPrototypeOf(values)!==Array.prototype)return fail();
 const length=Object.getOwnPropertyDescriptor(values,'length');
 if(!length||!Object.hasOwn(length,'value')||!Number.isSafeInteger(length.value)||length.value<1||length.value>61||Reflect.ownKeys(values).length!==length.value+1)return fail();
 const result=new Map<string,Uint8Array>();let total=0;
 for(let index=0;index<length.value;index++){
  const value=data(values,String(index));
  if(!value||typeof value!=='object'||types.isProxy(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))||Reflect.ownKeys(value).length!==2||!exact(value,['sha256','bytes']))return fail();
  const digest=data(value,'sha256'),input=data(value,'bytes');
  if(!hash(digest)||!input||typeof input!=='object'||types.isProxy(input)||!types.isUint8Array(input))return fail();
  const bytes=new Uint8Array(input as Uint8Array);total+=bytes.byteLength;
  if(!bytes.byteLength||total>MAX_ACTUAL_BYTES||result.has(digest)||sha(bytes)!==digest)return fail();result.set(digest,bytes);
 }
 return result;
}
function safeRelative(relative:string):void{
 if(!relative||path.isAbsolute(relative)||relative.includes('\\')||relative.includes(':')||relative.includes('\0')||relative.split('/').some(part=>!part||part==='.'||part==='..'))fail();
}
function removeOwnedChild(child:string,parent:string):void{
 if(!fs.existsSync(child))return;
 const stat=fs.lstatSync(child),real=fs.realpathSync(child);
 if(stat.isSymbolicLink()||!stat.isDirectory()||real!==child||path.dirname(real)!==parent||!path.basename(real).startsWith('m887-offline-sources-'))return fail();
 // Recursive deletion is restricted to this exact newly created child.
 fs.rmSync(real,{recursive:true,force:true,maxRetries:2,retryDelay:10});
}
function requireJson(material:CulturalProviderMaterial,id:string,schemaId:string,codecVersion:string,text:string):void{
 const rows=material.jsons.filter(row=>row.id===id);
 if(rows.length!==1)return fail();const row=rows[0];
 if(!exact(row,['id','schemaId','codecVersion','sha256','exactUtf8Json'])||row.schemaId!==schemaId||row.codecVersion!==codecVersion||row.exactUtf8Json!==text||row.sha256!==sha(text))fail();
}
/** Sources only: the caller's fixed main gate owns profile/chart/selection
 * authentication. No callback, archived script execution or live-source fallback
 * is accepted. scratchRoot must be the factory's private pre-created temp root.
 */
export function authenticateCulturalOfflineSourcesV1(material:CulturalProviderMaterial,actualBlobs:readonly {sha256:string;bytes:Uint8Array}[],scratchRoot:string):CulturalOfflineSourceAuthenticationV1{
 let child:string|undefined,parent:string|undefined;
 try{
  if(arguments.length!==3||typeof scratchRoot!=='string'||!path.isAbsolute(scratchRoot)||scratchRoot.length>8192)return fail();
  const owned=ownCulturalJson<CulturalProviderMaterial>(material),payloads=ownedPayloads(actualBlobs);
  if(!owned||owned.schema!=='qimen-cultural-provider-material/1.0.0'||owned.providerVersion!=='qimen-cultural-provider/1.0.0'||owned.storage!=='memory-only'||!Array.isArray(owned.blobs)||!Array.isArray(owned.jsons))return fail();
  const refs=new Map<string,CulturalProviderBlobReference>(),used=new Set<string>(),jsonIds=new Set<string>();
  for(const ref of owned.blobs){
   if(!ref||!exact(ref,['id','role','sha256','byteLength','mediaType'])||typeof ref.id!=='string'||typeof ref.role!=='string'||typeof ref.mediaType!=='string'||!hash(ref.sha256)||!Number.isSafeInteger(ref.byteLength)||ref.byteLength<1||refs.has(ref.id))return fail();
   const bytes=payloads.get(ref.sha256);if(!bytes||bytes.byteLength!==ref.byteLength)return fail();refs.set(ref.id,ref);used.add(ref.sha256);
  }
  if(used.size!==payloads.size)return fail();
  for(const json of owned.jsons){if(!json||typeof json.id!=='string'||jsonIds.has(json.id))return fail();jsonIds.add(json.id);}
  const expectedIds=new Set<string>();
  for(const [relative,digest,length]of FIXED_SOURCE_FILES){
   safeRelative(relative);const id=PREFIX+'cultural-source:'+relative;expectedIds.add(id);const ref=refs.get(id);
   if(!ref||ref.role!==relative||ref.sha256!==digest||ref.byteLength!==length)return fail();
  }
  const policy=refs.get(POLICY_ID);expectedIds.add(POLICY_ID);
  if(!policy||policy.role!==POLICY_PATH||policy.sha256!==POLICY_SHA||policy.byteLength!==522||policy.mediaType!=='application/json')return fail();
  let knowledge:Uint8Array|null=null;
  if(owned.sourceSessionId!==null){
   if(typeof owned.sourceSessionId!=='string'||!owned.sourceSessionId)return fail();
   const ref=refs.get('original-knowledge-pack');expectedIds.add('original-knowledge-pack');
   if(!ref||ref.role!=='verified-session-knowledge-archive'||ref.mediaType!=='application/vnd.sqlite3')return fail();knowledge=payloads.get(ref.sha256)!;
  }
  if(refs.size!==expectedIds.size||[...refs.keys()].some(id=>!expectedIds.has(id)))return fail();
  parent=fs.realpathSync(scratchRoot);
  if(fs.lstatSync(scratchRoot).isSymbolicLink()||!fs.statSync(parent).isDirectory())return fail();
  child=fs.realpathSync(fs.mkdtempSync(path.join(parent,'m887-offline-sources-')));
  if(path.dirname(child)!==parent)return fail();
  for(const [relative,digest]of FIXED_SOURCE_FILES){
   const target=path.join(child,...relative.split('/'));fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});
   fs.writeFileSync(target,payloads.get(digest)!,{flag:'wx',mode:0o600});
  }
  // Existing loaders read only supplied fixed files under this new child. The
  // gzip is data; no archived ts/js/go file is imported, evaluated or executed.
  const authenticated=loadCulturalProviderSources(path.join(child,'data'));
  if(authenticated.blobs.length!==60)return fail();
  for(const blob of authenticated.blobs){
   const ref=refs.get(PREFIX+blob.id),input=ref?payloads.get(ref.sha256):undefined;
   if(!ref||ref.role!==blob.relativePath||ref.sha256!==blob.sha256||ref.byteLength!==blob.bytes.byteLength||ref.mediaType!==blob.mediaType||!input||!Buffer.from(input).equals(Buffer.from(blob.bytes)))return fail();
  }
  const sourceJsons=owned.jsons.filter(json=>json.id.startsWith(PREFIX));
  if(sourceJsons.length!==authenticated.sourceJsons.length)return fail();
  for(const json of authenticated.sourceJsons)requireJson(owned,PREFIX+json.id,json.schemaId,json.codecVersion,json.exactUtf8Json);
  requireJson(owned,'fixed-label-policy',authenticated.labelPolicy.version,'exact-utf8-json/1',JSON.stringify(authenticated.labelPolicy));
  requireJson(owned,'fixed-mapping-profile',authenticated.mappingProfile.version,'exact-utf8-json/1',JSON.stringify(authenticated.mappingProfile));
  requireJson(owned,'provider-source-snapshot','cultural-provider-sources/1','exact-utf8-json/1',JSON.stringify(authenticated.sourceReferences));
  const {blobs:unused,...sourceMetadata}=authenticated;
  return Object.freeze({sourceMetadata:Object.freeze(sourceMetadata),originalKnowledgePack:knowledge===null?null:new Uint8Array(knowledge)});
 }catch{return fail();}
 finally{if(child&&parent){try{removeOwnedChild(child,parent);}catch{fail();}}}
}
