import type {CharacterEntry,CharacterReading} from './types';
import {selectedMeaningBelongsToReading} from './character-reading';

/** Optional reference metadata is paired and literal. It never supplies an entity definition. */
export function validReadingReferenceMetadata(reading:unknown):boolean{
 try{
  if(!reading||typeof reading!=='object'||Array.isArray(reading))return false;
  const flag=Object.getOwnPropertyDescriptor(reading,'referenceOnly'),reference=Object.getOwnPropertyDescriptor(reading,'sourceReference');
  if(!flag&&!reference)return true;
  if(!flag||!reference||!('value'in flag)||!('value'in reference)||!flag.enumerable||!reference.enumerable||flag.value!==true)return false;
  const value=reference.value;
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))||Reflect.ownKeys(value).length!==3)return false;
  const values:Record<string,unknown>={};for(const key of ['kind','rawDefinitionIndex','text']){const descriptor=Object.getOwnPropertyDescriptor(value,key);if(!descriptor||!('value'in descriptor)||!descriptor.enumerable)return false;values[key]=descriptor.value;}
  const meanings=Object.getOwnPropertyDescriptor(reading,'meanings');
  const definitions=meanings&&'value'in meanings?meanings.value:undefined;
  if(!Array.isArray(definitions)||Object.getPrototypeOf(definitions)!==Array.prototype||definitions.length!==1||Reflect.ownKeys(definitions).length!==2)return false;
  const definition=Object.getOwnPropertyDescriptor(definitions,'0');
  return values.kind==='dictionary-cross-reference'&&Number.isSafeInteger(values.rawDefinitionIndex)&&(values.rawDefinitionIndex as number)>=0&&typeof values.text==='string'&&values.text.trim().length>0&&values.text.length<=2000&&!/[\u0000-\u001f]/u.test(values.text)&&!!definition&&'value'in definition&&definition.enumerable===true&&definition.value==='辞典参照：'+values.text;
 }catch{return false;}
}
export function selectedReferenceOnlyReading(entry:CharacterEntry):CharacterReading|undefined{
 return entry.readings?.find(reading=>validReadingReferenceMetadata(reading)&&reading.referenceOnly===true&&reading.pinyin===entry.pinyin&&reading.tone===entry.tone&&reading.sourceId===entry.sourceId&&selectedMeaningBelongsToReading(entry.meaning,reading.meanings));
}
