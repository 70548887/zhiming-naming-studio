import {createByteDigestMemo} from './byte-digest-memo.mjs';

// Fixed public-source bytes only. Callers retain all freshness and source checks.
const memo=createByteDigestMemo({maxEntries:64,maxBytes:64*1024*1024});

export function digestSourceBytes(bytes){
  return memo.digest(bytes);
}
