import type {ParentNameReading,ParentNameReadings,ParentNameReadingConfirmIntent,ParentRole} from '../shared/parent-name-phonetics';
import {createParentReadingDraftTicketGuard} from './parent-reading-draft-ticket';

export interface ParentReadingProfileDraft {id:string;fatherName?:string;motherName?:string;parentNameReadings?:ParentNameReadings;}
export interface ParentDraftReplacementTicket {readonly profileId:string;readonly draftRevision:number;}
export class ParentReadingDraftChangedError extends Error {
 constructor(){super('资料或读音选择已改变，本次旧确认未写入草稿。');this.name='ParentReadingDraftChangedError';}
}
export interface ParentReadingDraftBridgeConfig<P extends ParentReadingProfileDraft> {
 /** Pure fetch: no profile/draft writes before this Promise returns. */
 confirmApi:(profile:P,intent:ParentNameReadingConfirmIntent)=>Promise<ParentNameReading>;
 /** Synchronous notification: update refs and setProfile(next), not setProfile(updater). */
 onDraft:(next:P)=>void;
}
const clone=<T>(value:T):T=>structuredClone(value);
const keyFor=(role:ParentRole)=>role==='father'?'fatherName':'motherName';
function withoutRole<P extends ParentReadingProfileDraft>(profile:P,role:ParentRole):P {
 const next=clone(profile),records=next.parentNameReadings?.filter(row=>row.role!==role);
 if(records?.length)next.parentNameReadings=records;else delete next.parentNameReadings;
 return next;
}
/** One authoritative parent-owned draft. Route every profile mutation through it. */
export function createParentReadingDraftBridge<P extends ParentReadingProfileDraft>(initialDraft:P,config:ParentReadingDraftBridgeConfig<P>) {
 let draft=clone(initialDraft),loadEpoch=0,draftRevision=0,active=true;
 const replacements=new WeakSet<object>();
 const guard=createParentReadingDraftTicketGuard(draft.id);
 const notify=(next:P)=>{draft=clone(next);draftRevision++;config.onDraft(clone(draft));};
 const invalidate=(role:ParentRole)=>{guard.invalidate(role);notify(withoutRole(draft,role));};
 const loadDraft=(next:P)=>{guard.loadProfile(next.id);loadEpoch++;notify(next);};
 const replaceDraft=(next:P)=>{
  if(next.id!==draft.id){loadDraft(next);return;}
  let accepted=clone(next);
  for(const role of ['father','mother'] as const){if((draft[keyFor(role)]??'')!==(next[keyFor(role)]??'')){guard.invalidate(role);accepted=withoutRole(accepted,role);}}
  notify(accepted);
 };
 const editParentName=(role:ParentRole,fullName:string)=>{
  // Every explicit name edit invalidates, even if a caller sends the same text twice.
  guard.invalidate(role);notify(withoutRole({...draft,[keyFor(role)]:fullName},role));
 };
 const editField=<K extends keyof P>(key:K,value:P[K])=>{
  if(key==='fatherName'){editParentName('father',String(value??''));return;}
  if(key==='motherName'){editParentName('mother',String(value??''));return;}
  if(key==='parentNameReadings')throw Error('确认记录只能由规范确认回调或档案加载写入。');
  replaceDraft({...draft,[key]:clone(value)});
 };
 const confirm=async(intent:ParentNameReadingConfirmIntent,ownerStillCurrent:()=>boolean=()=>true):Promise<ParentNameReading>=>{
  if(!ownerStillCurrent())throw new ParentReadingDraftChangedError();
  const sent=clone(intent),role=sent.role,ticket=guard.begin(role),profile=clone(draft);
  if(sent.fullName!==(profile[keyFor(role)]??''))throw new ParentReadingDraftChangedError();
  let record:ParentNameReading;
  try{record=clone(await config.confirmApi(clone(profile),clone(sent)));}
  catch(error){if(!ownerStillCurrent()||!guard.stillCurrent(ticket))throw new ParentReadingDraftChangedError();throw error;}
  if(!ownerStillCurrent()||!guard.stillCurrent(ticket))throw new ParentReadingDraftChangedError();
  // Main performs full canonical/source validation; this checks the request/response binding.
  if(record.role!==role||record.fullName!==sent.fullName||record.surnameLength!==sent.surnameLength||record.givenName!==[...sent.fullName].slice(sent.surnameLength).join(''))throw Error('确认返回与本次家庭姓名分界不一致，未写入草稿。');
  const committed=guard.commitIfCurrent(ticket,()=>{
   const next=withoutRole(draft,role);
   next.parentNameReadings=[...(next.parentNameReadings??[]),clone(record)];
   notify(next);
  });
  if(!committed)throw new ParentReadingDraftChangedError();
  return clone(record);
 };
 return {getDraft:()=>clone(draft),getLoadEpoch:()=>loadEpoch,editField,loadDraft,editParentName,invalidate,confirm,
  cancelPendingConfirmations:()=>{guard.invalidate('father');guard.invalidate('mother');},
  captureReplacementTicket:():ParentDraftReplacementTicket=>{const ticket=Object.freeze({profileId:draft.id,draftRevision});replacements.add(ticket);return ticket;},
  loadDraftIfCurrent:(ticket:ParentDraftReplacementTicket,next:P):boolean=>{
   if(!active||!replacements.has(ticket)||ticket.profileId!==draft.id||ticket.profileId!==next.id||ticket.draftRevision!==draftRevision)return false;
   replacements.delete(ticket);loadDraft(next);return true;
  },
  activate:()=>{if(!active){active=true;draftRevision++;}guard.activate();},
  dispose:()=>{active=false;draftRevision++;guard.dispose();}};
}
