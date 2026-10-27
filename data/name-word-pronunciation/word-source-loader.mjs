import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {canonicalPlainJson} from '../name-phonetic/name-phonetic-engine.mjs';
import {getImportedWordProfile} from './word-engine.mjs';
import {WORD_PROFILE_SHA256,WORD_LOCK_SHA256} from './word-pins.mjs';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
export function verifyWordPronunciationPackage(directory){
 const lockBytes=fs.readFileSync(path.join(directory,'word-source-lock.json'));if(hash(lockBytes)!==WORD_LOCK_SHA256)throw Error('整词读音来源锁与固定身份不同。');
 const lock=JSON.parse(lockBytes.toString('utf8'));canonicalPlainJson(lock);let profileBytes;
 for(const [file,expected]of Object.entries(lock.files)){
  if(!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(file))throw Error('整词读音资料路径无效。');
  const bytes=fs.readFileSync(path.join(directory,file));if(hash(bytes)!==expected)throw Error('整词读音资料校验失败：'+file);if(file==='word-profile.json')profileBytes=bytes;
 }
 if(!profileBytes||hash(profileBytes)!==WORD_PROFILE_SHA256)throw Error('整词读音表身份不符。');
 const actual=getImportedWordProfile();if(canonicalPlainJson(actual)!==canonicalPlainJson(JSON.parse(profileBytes.toString('utf8'))))throw Error('整词引擎实际词表与同一已验Buffer不同。');
 return {status:'passed',version:lock.version,profileSha256:WORD_PROFILE_SHA256,sourceLockSha256:WORD_LOCK_SHA256,actualProfileObjectSha256:hash(canonicalPlainJson(actual)),filesVerified:Object.keys(lock.files).length,engineProfileMatched:true};
}
