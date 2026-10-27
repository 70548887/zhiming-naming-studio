import {types} from 'node:util';
import {validNumerologySnapshot} from '../domain/numerology';
import type {NamingSession} from '../shared/types';

type Role='session'|'candidates'|'candidate'|'numerology'|'strokes'|'stroke'|'plain';
function need(condition:unknown,reason:string):asserts condition {if(!condition)throw Error('Reviewed numerology snapshot: '+reason);}

/** Adapt only an owned result of the existing numerology producer. The ordinary
 * request, review, proof and restore JSON readers remain strict. */
export function normalizeReviewedNumerologySnapshotForAttach(input:NamingSession):NamingSession {
 const active=new WeakSet<object>();let nodes=0,units=0;
 const copy=(value:unknown,role:Role,depth:number):unknown=>{
  need(++nodes<=500000&&depth<=64&&!types.isProxy(value),'plain JSON/Proxy budget');
  if(typeof value==='string'){units+=value.length;need(units<=16000000,'text budget');return value;}
  if(value===null||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return value;
  need(value&&typeof value==='object'&&!active.has(value),'plain acyclic JSON');
  const array=Array.isArray(value),prototype=Object.getPrototypeOf(value);
  need(array?prototype===Array.prototype:prototype===null||prototype===Object.prototype,'plain JSON prototype');
  if(role==='candidates'||role==='strokes')need(array,'numerology container array');
  if(role==='session'||role==='candidate'||role==='numerology'||role==='stroke')need(!array,'numerology container object');
  const keys=Reflect.ownKeys(value);need(keys.length<=100001,'own field budget');active.add(value);
  try{
   if(array){
    const length=Object.getOwnPropertyDescriptor(value,'length');
    need(length&&Object.hasOwn(length,'value')&&Number.isSafeInteger(length.value)&&length.value>=0&&length.value<=100000&&keys.length===length.value+1,'dense own array');
    const result:unknown[]=[];
    for(let index=0;index<length.value;index++){
     const item=Object.getOwnPropertyDescriptor(value,String(index));need(item&&item.enumerable&&Object.hasOwn(item,'value'),'own array data');
     const childRole:Role=role==='candidates'?'candidate':role==='strokes'?'stroke':'plain';
     Object.defineProperty(result,String(index),{value:copy(item.value,childRole,depth+1),enumerable:true,writable:true,configurable:true});
    }
    return result;
   }
   const result:Record<string,unknown>={};
   for(const key of keys){
    need(typeof key==='string','string own fields');units+=key.length;need(units<=16000000,'text budget');
    const item=Object.getOwnPropertyDescriptor(value,key);need(item&&item.enumerable&&Object.hasOwn(item,'value'),'own enumerable data');
    if(role==='stroke'&&key==='selectedRecordId'&&item.value===undefined){
     const status=Object.getOwnPropertyDescriptor(value,'status');
     need(status&&status.enumerable&&Object.hasOwn(status,'value')&&(status.value==='missing'||status.value==='ambiguous'),'undefined selected record requires an unresolved stroke');
     // This exact optional field is emitted by analyzeNumerology. No other
     // undefined value, path or mandatory field is silently omitted.
     continue;
    }
    const childRole:Role=role==='session'&&key==='candidates'?'candidates':role==='candidate'&&key==='numerology'?'numerology':role==='numerology'&&key==='strokes'?'strokes':'plain';
    Object.defineProperty(result,key,{value:copy(item.value,childRole,depth+1),enumerable:true,writable:true,configurable:true});
   }
   return result;
  }finally{active.delete(value);}
 };
 const session=copy(input,'session',0) as NamingSession;
 need(session.profile&&session.profile.namingPreferences&&session.preferences,'frozen numerology preference');
 const enabled=session.profile.namingPreferences.numerology;
 need(typeof enabled==='boolean'&&session.preferences.numerology===enabled,'numerology enable state');
 need(Array.isArray(session.candidates),'candidate array');
 for(const candidate of session.candidates){
  need(candidate&&typeof candidate==='object'&&!Array.isArray(candidate),'candidate object');
  const present=Object.hasOwn(candidate,'numerology');
  if(enabled)need(present&&validNumerologySnapshot(candidate.numerology,session.profile.surname,candidate.givenName),'required valid numerology snapshot');
  else need(!present,'disabled numerology must remain absent');
 }
 return session;
}
