import {createHash} from 'node:crypto';
import {culturalCanonicalJson,ownCulturalJson} from '../domain/qimen-cultural-comparison-canonical';
import {CULTURAL_WRITE_SCHEMA,type CulturalWriteIdentity} from '../shared/cultural-storage-v3';
import {parseSnapshotJsonStrict} from './snapshot-json-spans';

export const CULTURAL_REQUEST_MAX_BYTES=8192;
const hash=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);
const string=(value:unknown,max:number):value is string=>typeof value==='string'&&value.length>0&&value.length<=max;
const revision=(value:unknown):value is number=>Number.isSafeInteger(value)&&Number(value)>=1;
const keys=['schema','operation','profileId','comparisonId','expectedRevision','expectedReviewToken','sourceSessionId','sourceRevision','capsuleSha','snapshotDigest','noteSha256','restoredFromRevision'];
const invalid=():never=>{throw new Error('文化写入请求身份或规范字节无效。');};
export function readCulturalWriteIdentity(value:unknown):CulturalWriteIdentity {
  const input=ownCulturalJson<CulturalWriteIdentity>(value);
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!==[...keys].sort().join(',')||input.schema!==CULTURAL_WRITE_SCHEMA||!['create','revise','restore-revision'].includes(input.operation))invalid();
  if(!string(input.profileId,300)||!/^qc_[0-9a-f]{64}$/.test(input.comparisonId)||input.sourceSessionId!==null&&!string(input.sourceSessionId,1000)||!string(input.sourceRevision,8192)||![input.capsuleSha,input.snapshotDigest,input.noteSha256].every(hash))invalid();
  if(input.operation==='create'){
    if(input.expectedRevision!==null||input.expectedReviewToken!==null||input.restoredFromRevision!==null)invalid();
  }else{
    const expectedRevision=input.expectedRevision;
    if(!revision(expectedRevision)||!string(input.expectedReviewToken,1000))return invalid();
    if(input.operation==='restore-revision'){
      if(!revision(input.restoredFromRevision)||input.restoredFromRevision>expectedRevision)invalid();
    }else if(input.restoredFromRevision!==null)invalid();
  }
  return input;
}
export function canonicalCulturalWriteIdentity(value:unknown):{request:CulturalWriteIdentity;json:string;sha256:string} {
  const request=readCulturalWriteIdentity(value),json=culturalCanonicalJson(request);
  if(Buffer.byteLength(json,'utf8')>CULTURAL_REQUEST_MAX_BYTES)invalid();
  return{request,json,sha256:createHash('sha256').update(json,'utf8').digest('hex')};
}
/** This decodes an immutable receipt's stable intent, never source authority. */
export function decodeCulturalWriteIdentity(json:string,expectedSha:string):CulturalWriteIdentity {
  if(typeof json!=='string'||!hash(expectedSha))invalid();
  const parsed=parseSnapshotJsonStrict(json,CULTURAL_REQUEST_MAX_BYTES),actual=canonicalCulturalWriteIdentity(parsed);
  if(actual.json!==json||actual.sha256!==expectedSha)invalid();
  return actual.request;
}
export function culturalComparisonId(profileId:string,idempotencyKey:string):string {
  if(!string(profileId,300)||!string(idempotencyKey,1000))invalid();
  const json=culturalCanonicalJson({namespace:'qimen-cultural-create/1',profileId,idempotencyKey});
  return 'qc_'+createHash('sha256').update(json,'utf8').digest('hex');
}
