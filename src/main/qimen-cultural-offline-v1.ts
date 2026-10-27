import fs from 'node:fs';
import path from 'node:path';
import {types} from 'node:util';
import {ownCulturalJson,culturalCanonicalDigest,culturalCanonicalJson} from '../domain/qimen-cultural-comparison-canonical';
import {compareQimenCultural} from '../domain/qimen-cultural-comparison';
import {QIMEN_CULTURAL_PUBLICATION,QIMEN_CULTURAL_VERSION} from '../shared/qimen-cultural-comparison';
import {CULTURAL_PROVIDER_VERSION} from '../shared/qimen-cultural-provider-v1';
import {CULTURAL_OFFLINE_REPLAY_VERSION} from '../shared/qimen-cultural-offline-v1';
import {ownCulturalOfflineInputV1} from './qimen-cultural-offline-input-v1';
import {authenticateCulturalOfflineSourcesV1} from './qimen-cultural-offline-sources-v1';
import {verifyCulturalOfflineBirthV1} from './qimen-cultural-offline-birth-v1';
import {authenticateCulturalOfflinePackV1,prepareCulturalOfflinePackRuntimeV1} from './qimen-cultural-offline-pack-v1';
import {rederiveCulturalPreparedV1} from './qimen-cultural-offline-projection-v1';
import type {CulturalOfflineReplayAPI,CulturalOfflineReplayInput,CulturalOfflineReplayReply,CulturalOfflineRejection} from '../shared/qimen-cultural-offline-v1';
export type * from '../shared/qimen-cultural-offline-v1';

const CULTURAL_OFFLINE_REPLAY_BRAND=Symbol('qimen-cultural-offline-replay-v1');
export function isCulturalOfflineReplayV1(value:unknown):value is CulturalOfflineReplayAPI{
 if(!value||typeof value!=='object'||types.isProxy(value))return false;
 const descriptor=Object.getOwnPropertyDescriptor(value,CULTURAL_OFFLINE_REPLAY_BRAND);
 return !!descriptor&&Object.hasOwn(descriptor,'value')&&descriptor.value===true;
}

const same=(a:unknown,b:unknown)=>culturalCanonicalJson(a)===culturalCanonicalJson(b);
const fail=(message='OFFLINE_INTEGRITY'):never=>{throw Error(message);};
const rejected=(reason:CulturalOfflineRejection):CulturalOfflineReplayReply=>({kind:'rejected',reason,message:reason==='unsupported-version'?'此材料或算法版本尚未登记，未用当前算法补证。':reason==='missing-blob'?'实际来源字节不完整，未用本机资料补齐。':reason==='extra-blob'?'输入包含未登记的额外来源字节。':reason==='closed'?'离线核验实例已关闭。':reason==='source-unavailable'?'固定来源原件、版本或完整闭包未通过核验。':reason==='invalid-input'?'离线核验只接受有界普通材料与实际字节，不接受回调或外来权限对象。':'材料、归属、字位或派生结果未通过完整核验。'});
function classify(error:unknown):CulturalOfflineRejection{
 const text=error instanceof Error?error.message:'';
 if(text.startsWith('OFFLINE_INPUT')||text.startsWith('CULTURAL_JSON_INVALID'))return'invalid-input';
 if(text.startsWith('OFFLINE_MISSING_BLOB'))return'missing-blob';
 if(text.startsWith('OFFLINE_EXTRA_BLOB'))return'extra-blob';
 if(text.startsWith('OFFLINE_UNSUPPORTED'))return'unsupported-version';
 if(text.startsWith('OFFLINE_SOURCE')||text==='CULTURAL_OFFLINE_SOURCE_INVALID')return'source-unavailable';
 return'integrity';
}
/** Fixed, read-only offline admission for the M856-v1 cultural scope. Scratch
 * receives inert source bytes only; no archive code/SQL/lookup callback is run.
 * Storage capsule digest C is deliberately absent. D is always the canonical
 * original material descriptor and remains snapshot.evidenceCapsuleDigest.
 */
export async function prepareCulturalOfflineReplayV1(configuration:{scratchRoot:string}):Promise<CulturalOfflineReplayAPI>{
 const config=ownCulturalJson<{scratchRoot:string}>(configuration);
 if(!config||Object.keys(config).join('|')!=='scratchRoot'||typeof config.scratchRoot!=='string'||!path.isAbsolute(config.scratchRoot))return fail('OFFLINE_INPUT_INVALID');
 // One installed runtime, prepared by Store.init. No material/source bytes,
 // profile analysis or archived database is read during preparation.
 await prepareCulturalOfflinePackRuntimeV1();
 fs.mkdirSync(config.scratchRoot,{recursive:true});const base=fs.realpathSync(config.scratchRoot);
 const ownRoot=fs.mkdtempSync(path.join(base,'cultural-offline-v1-'));let closed=false,active=0,removed=false;
 function cleanup(){if(!closed||active||removed)return;if(path.dirname(fs.realpathSync(ownRoot))!==base||!path.basename(ownRoot).startsWith('cultural-offline-v1-'))return fail();fs.rmdirSync(ownRoot);removed=true;}
 return Object.freeze({
  [CULTURAL_OFFLINE_REPLAY_BRAND]:true as const,
  verify(value:CulturalOfflineReplayInput):CulturalOfflineReplayReply{
   if(closed)return rejected('closed');active++;
   try{
    // Capture all supplied material and native byte slots before any I/O.
    const input=ownCulturalOfflineInputV1(value),m=input.material,expected=input.expectedSnapshot;
    if(m.schema!=='qimen-cultural-provider-material/1.0.0'||m.providerVersion!==CULTURAL_PROVIDER_VERSION||!expected||expected.schema!==QIMEN_CULTURAL_VERSION||expected.rulePublicationId!==QIMEN_CULTURAL_PUBLICATION)return fail('OFFLINE_UNSUPPORTED');
    if(Object.keys(m).sort().join('|')!=='blobs|jsons|ownerProfileId|providerVersion|schema|sourceRevision|sourceSessionId|storage'||m.storage!=='memory-only'||m.ownerProfileId!==input.expectedOwner.profileId||m.sourceSessionId!==input.expectedOwner.sourceSessionId)return fail();
    const authenticated=authenticateCulturalOfflineSourcesV1(m,input.uniqueBlobs,ownRoot);
    const birth=verifyCulturalOfflineBirthV1(m);
    if(birth.profile.id!==m.ownerProfileId||birth.session?.id!==m.sourceSessionId&&!(birth.session===null&&m.sourceSessionId===null))return fail();
    const archive=birth.session?authenticateCulturalOfflinePackV1(authenticated.originalKnowledgePack??fail(),birth.session):null;
    if(!birth.session&&authenticated.originalKnowledgePack!==null)return fail();
    const prepared=rederiveCulturalPreparedV1(m,birth,authenticated.sourceMetadata,archive);
    const D=culturalCanonicalDigest(m);
    if(expected.evidenceCapsuleDigest!==D)return fail();
    const replay=compareQimenCultural({...prepared,evidenceCapsuleDigest:D});
    if(replay.kind!=='result'||!same(replay.snapshot,expected))return fail();
    if(closed)return rejected('closed');
    return ownCulturalJson<CulturalOfflineReplayReply>({kind:'verified-replay',schema:CULTURAL_OFFLINE_REPLAY_VERSION,ownerProfileId:m.ownerProfileId,sourceSessionId:m.sourceSessionId,sourceRevision:m.sourceRevision,materialDigest:D,snapshotDigest:replay.snapshot.snapshotDigest,sourceDigest:authenticated.sourceMetadata.revision,snapshot:replay.snapshot,generationAuthority:false,storageAuthority:false,verifiedScope:'fixed-cultural-sources-birth-labels-selection-and-derived-result'});
   }catch(error){return rejected(classify(error));}finally{active--;cleanup();}
  },
  close(){closed=true;cleanup();},
 });
}
