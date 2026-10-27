import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {canonicalPlainJson} from '../shared/plain-json';
import type {BirthProfile} from '../shared/types';
import {snapshotApplicationJson} from './project-application-v132-r2-json';
export const applicationDigest=(value:unknown)=>createHash('sha256').update(canonicalPlainJson(value)).digest('hex');
export const applicationSame=(a:unknown,b:unknown)=>canonicalPlainJson(a)===canonicalPlainJson(b);
export function freezeApplication<T>(value:T):T {
 return snapshotApplicationJson(value) as T;
}
export function exactApplicationRecord(value:unknown,keys:readonly string[]):asserts value is Record<string,unknown> {
 if(!value||typeof value!=='object'||types.isProxy(value)||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))||Reflect.ownKeys(value).length!==keys.length)throw Error('PROJECT_APPLICATION_INPUT_INVALID: exact plain fields required.');
 for(const key of Reflect.ownKeys(value)){const row=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!keys.includes(key)||!row||!Object.hasOwn(row,'value')||!row.enumerable)throw Error('PROJECT_APPLICATION_INPUT_INVALID: accessors, hidden and extra fields are rejected.');}
}
export function readApplicationProfile(value:unknown):BirthProfile {
 value=snapshotApplicationJson(value);
 const allowed=['id','customerName','surname','surnamePinyin','gender','calendar','birthDate','leapMonth','birthTime','timeUnknown','birthPlace','timezone','notes','fatherName','motherName','parentNameReadings','namingPreferences','monthAuthorityMethod','seasonalMethod','timeBasis','birthLongitude','renMethod'];
 if(!value||typeof value!=='object'||types.isProxy(value)||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw Error('PROJECT_APPLICATION_INPUT_INVALID: profile must be plain data.');
 const copied:Record<string,unknown>={};
 for(const key of Reflect.ownKeys(value)){
  const row=Object.getOwnPropertyDescriptor(value,key);
  if(typeof key!=='string'||!allowed.includes(key)||!row||!Object.hasOwn(row,'value')||!row.enumerable)throw Error('PROJECT_APPLICATION_INPUT_INVALID: invalid profile fields.');
  copied[key]=row.value;
 }
 canonicalPlainJson(copied);
 for(const key of ['id','customerName','surname','surnamePinyin','gender','calendar','birthDate','birthTime','birthPlace','timezone','notes'])if(typeof copied[key]!=='string')throw Error('PROJECT_APPLICATION_INPUT_INVALID: required profile string '+key);
 if(typeof copied.timeUnknown!=='boolean'||typeof copied.leapMonth!=='boolean'||!['solar','lunar'].includes(copied.calendar as string)||!(copied.id as string).length)throw Error('PROJECT_APPLICATION_INPUT_INVALID: profile flags or identity missing.');
 return freezeApplication(copied) as unknown as BirthProfile;
}
