import {createHash} from 'node:crypto';
import {ownCulturalJson} from '../domain/qimen-cultural-comparison-canonical';
import {canonicalCulturalWriteIdentity,culturalComparisonId} from './cultural-write-identity';
import type {CulturalSaveRequest,CulturalWriteIdentity} from '../shared/cultural-storage-v3';

const invalid=():never=>{throw Error('文化保存请求字段无效，未写入。');};
const exact=(v:object,keys:string)=>Object.keys(v).sort().join(',')===keys.split(',').sort().join(',');
const text=(v:unknown,max:number):v is string=>typeof v==='string'&&v.length>0&&v.length<=max;
export const culturalNoteSha=(note:string)=>createHash('sha256').update(note,'utf8').digest('hex');
export function readCulturalSaveRequest(value:unknown):CulturalSaveRequest{
 const v=ownCulturalJson<CulturalSaveRequest>(value);
 if(!v||!exact(v,'previewToken,ownerProfileId,target,idempotencyKey,expectedSnapshotDigest,note')||!text(v.previewToken,128)||!text(v.ownerProfileId,300)||!text(v.idempotencyKey,1000)||!/^([a-f0-9]{64})$/.test(v.expectedSnapshotDigest)||typeof v.note!=='string'||v.note.length>4000||!v.target)return invalid();
 if(v.target.mode==='create'){if(!exact(v.target,'mode'))return invalid();}
 else if(v.target.mode==='revise'){if(!exact(v.target,'mode,comparisonId,expectedRevision,expectedReviewToken')||!/^qc_[a-f0-9]{64}$/.test(v.target.comparisonId)||!Number.isSafeInteger(v.target.expectedRevision)||v.target.expectedRevision<1||!text(v.target.expectedReviewToken,1000))return invalid();}
 else return invalid();
 return v;
}
export function culturalIntent(request:CulturalSaveRequest,sourceSessionId:string|null,sourceRevision:string,capsuleSha:string){
 return canonicalCulturalWriteIdentity({schema:'qimen-cultural-write/1.0.0',operation:request.target.mode==='create'?'create':'revise',profileId:request.ownerProfileId,comparisonId:request.target.mode==='create'?culturalComparisonId(request.ownerProfileId,request.idempotencyKey):request.target.comparisonId,expectedRevision:request.target.mode==='create'?null:request.target.expectedRevision,expectedReviewToken:request.target.mode==='create'?null:request.target.expectedReviewToken,sourceSessionId,sourceRevision,capsuleSha,snapshotDigest:request.expectedSnapshotDigest,noteSha256:culturalNoteSha(request.note),restoredFromRevision:null});
}
/** Stable submitted fields for a durable retry. An obsolete preview handle is
 * not authority; the immutable receipt's stored intent supplies source identity. */
export function sameCulturalRetry(request:CulturalSaveRequest,intent:CulturalWriteIdentity):boolean{
 return intent.profileId===request.ownerProfileId&&intent.snapshotDigest===request.expectedSnapshotDigest&&intent.noteSha256===culturalNoteSha(request.note)&&intent.restoredFromRevision===null&&(request.target.mode==='create'?intent.operation==='create'&&intent.comparisonId===culturalComparisonId(request.ownerProfileId,request.idempotencyKey):intent.operation==='revise'&&intent.comparisonId===request.target.comparisonId&&intent.expectedRevision===request.target.expectedRevision&&intent.expectedReviewToken===request.target.expectedReviewToken);
}
