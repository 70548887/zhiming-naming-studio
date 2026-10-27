import {types} from 'node:util';
import {Store} from './store';
import {isCulturalOfflineReplayV1} from './qimen-cultural-offline-v1';
import type {CulturalOfflineReplayAPI} from '../shared/qimen-cultural-offline-v1';
import type {CulturalProviderMaterial} from '../shared/qimen-cultural-provider-v1';
import type {CulturalComparisonSnapshot} from '../shared/qimen-cultural-comparison';
import type {CulturalOfflineReplayReply} from '../shared/qimen-cultural-offline-v1';

const originalReadVerifiedSession=Object.getOwnPropertyDescriptor(Store.prototype,'readVerifiedSession')?.value;

export interface StoreBoundCulturalOfflineReplayInput {
 sessionId:string;
 material:CulturalProviderMaterial;
 blobs:readonly {id:string;bytes:Uint8Array}[];
 expectedSnapshot:CulturalComparisonSnapshot;
}

const rejected=(reason:'invalid-input'|'integrity'):CulturalOfflineReplayReply=>({
 kind:'rejected',reason,
 message:reason==='invalid-input'?'Store 边界只接受真实 Store、固定离线实例和有界材料。':'Store 归属、方案或快照绑定未通过核验。',
});
const plainRecord=(value:unknown,keys:readonly string[]):Record<string,unknown>|null=>{
 if(!value||typeof value!=='object'||types.isProxy(value)||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))return null;
 const own=Reflect.ownKeys(value);if(own.length!==keys.length||own.some(key=>typeof key!=='string'||!keys.includes(key)))return null;
 const out:Record<string,unknown>={};
 for(const key of keys){const descriptor=Object.getOwnPropertyDescriptor(value,key);if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)return null;out[key]=descriptor.value;}
 return out;
};

/**
 * Store-owned session boundary for the fixed offline replay. It derives the
 * owner tuple from the authenticated Store row, so callers cannot assert a
 * different profile/session owner. The adapter does not open a default path,
 * write the database, or accept a trust callback.
 */
export function verifyStoreBoundCulturalOfflineReplayV1(
 store:Store,
 replay:CulturalOfflineReplayAPI,
 value:unknown,
):CulturalOfflineReplayReply{
 try{
  if(!store||types.isProxy(store)||Object.getPrototypeOf(store)!==Store.prototype||!isCulturalOfflineReplayV1(replay))return rejected('invalid-input');
  const readDescriptor=Object.getOwnPropertyDescriptor(Store.prototype,'readVerifiedSession');
  if(!readDescriptor||!Object.hasOwn(readDescriptor,'value')||readDescriptor.value!==originalReadVerifiedSession||typeof readDescriptor.value!=='function')return rejected('invalid-input');
  const input=plainRecord(value,['blobs','expectedSnapshot','material','sessionId']);
  if(!input||typeof input.sessionId!=='string'||input.sessionId.length<1||input.sessionId.length>1000)return rejected('invalid-input');
  const session=(readDescriptor.value as Store['readVerifiedSession']).call(store,input.sessionId);
  if(!session)return rejected('integrity');
  const material=input.material as CulturalProviderMaterial,snapshot=input.expectedSnapshot as CulturalComparisonSnapshot;
  if(!material||typeof material!=='object'||!snapshot||typeof snapshot!=='object')return rejected('invalid-input');
  if(material.ownerProfileId!==session.profileId||material.sourceSessionId!==session.id)return rejected('integrity');
  if(snapshot.anchor?.ownerProfileId!==session.profileId||snapshot.anchor?.sourceSessionId!==session.id)return rejected('integrity');
  return replay.verify({material,blobs:input.blobs as StoreBoundCulturalOfflineReplayInput['blobs'],expectedSnapshot:snapshot,expectedOwner:{profileId:session.profileId,sourceSessionId:session.id}});
 }catch{return rejected('integrity');}
}
