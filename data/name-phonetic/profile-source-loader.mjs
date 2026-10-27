import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {PHONETIC_SOURCE_IDS,PHONETIC_PROFILE_SHA256,PHONETIC_SOURCE_LOCK_SHA256} from './package-pins.mjs';
import {canonicalPlainJson,getImportedNamePhoneticProfile} from './name-phonetic-engine.mjs';
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
/** Runtime gate for packaged excerpts. Original 80 MB snapshot is build/actual-source validation input. */
export function verifyNamePhoneticPackage(directory=path.dirname(fileURLToPath(import.meta.url))){
 const raw=fs.readFileSync(path.join(directory,'source-lock.json'));
 if(digest(raw)!==PHONETIC_SOURCE_LOCK_SHA256)throw new Error('词音来源锁与应用内固定身份不一致。');
 const lock=JSON.parse(raw.toString('utf8'));canonicalPlainJson(lock);
 if(canonicalPlainJson(Object.keys(lock.licenses))!==canonicalPlainJson([...PHONETIC_SOURCE_IDS])||lock.profileVersions.cmn!=='cmn-homophone-review/1.0.0'||lock.profileVersions.yue!=='yue-homophone-review/1.2.0')throw new Error('词音来源身份或版本错误。');
 const hashes={};let verifiedProfileBytes;for(const relative of Object.keys(lock.fileHashes).sort()){
  if(!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(relative))throw new Error('词音来源文件路径无效。');
  const bytes=fs.readFileSync(path.join(directory,relative)),actual=digest(bytes);if(actual!==lock.fileHashes[relative])throw new Error('词音来源文件校验失败：'+relative);hashes[relative]=actual;if(relative==='name-phonetic-profile.json')verifiedProfileBytes=bytes;
 }
 if(digest(JSON.stringify(hashes))!==lock.sha256||hashes['name-phonetic-profile.json']!==PHONETIC_PROFILE_SHA256)throw new Error('词音来源聚合校验失败。');
 const verifiedProfile=JSON.parse(verifiedProfileBytes.toString('utf8')),actualEngineProfile=getImportedNamePhoneticProfile();
 const verifiedObject=canonicalPlainJson(verifiedProfile),actualObject=canonicalPlainJson(actualEngineProfile);
 if(actualObject!==verifiedObject)throw new Error('词音引擎实际加载规则与已校验运行资料不一致，禁止启用。');
 return {status:'passed',profileVersions:{...lock.profileVersions},sourceIds:[...PHONETIC_SOURCE_IDS],profileSha256:PHONETIC_PROFILE_SHA256,sourceLockSha256:PHONETIC_SOURCE_LOCK_SHA256,actualProfileObjectSha256:digest(actualObject),engineProfileMatched:true,filesVerified:Object.keys(hashes).length};
}
