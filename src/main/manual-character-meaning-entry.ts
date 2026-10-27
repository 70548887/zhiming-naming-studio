import {createManualM970MeaningSelectionDirectory} from './m970-manual-meaning-selection-directory.mjs';
import {snapshotApplicationJson} from './project-application-v132-r2-json';
import type {ManualCharacterMeaningDirectory,ManualCharacterMeaningSelection,ManualCharacterMeaningLimits} from '../shared/manual-character-meaning-api';

export interface ManualMeaningOwnedContext{dataDir:string;actualPackFile:string;owner:object;identity:string;}
const boundary:ManualCharacterMeaningLimits={usageStatus:'manual-context-required',candidateOnly:true,activation:'off',productionApproved:false,admissionGranted:false,automaticMeaningAllowed:false,automaticNameRecommendation:false,automaticSemanticCreditAllowed:false,sourceAuthority:false,generationAuthority:false,wholeNameMeaning:null,scoreDelta:0,formalCoverageAdded:0,automaticCoverageAdded:0};
function capture(raw:unknown,field:'char'|'selectionKey'){
 const value=snapshotApplicationJson(raw) as Record<string,unknown>;
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2||!Object.hasOwn(value,'mode')||!Object.hasOwn(value,field)||value.mode!=='manual-request'||typeof value[field]!=='string')throw Error('MANUAL_MEANING_INPUT_INVALID: explicit manual request fields required');
 if(field==='char'&&([...value.char as string].length!==1||/[\uD800-\uDFFF\u0000-\u001f]/u.test(value.char as string)))throw Error('MANUAL_MEANING_INPUT_INVALID: single Unicode scalar required');
 if(field==='selectionKey'&&(!(value.selectionKey as string).length||(value.selectionKey as string).length>128))throw Error('MANUAL_MEANING_INPUT_INVALID: bounded opaque selection required');
 return value as unknown as {mode:'manual-request';char:string;selectionKey:string};
}
/** Same-factory opaque keys are private to a trusted current pack owner.
 * Every call still enters the unchanged M1040/935 byte-verification path. */
export class ManualCharacterMeaningEntry{
 #cached?:{context:ManualMeaningOwnedContext;factory:ReturnType<typeof createManualM970MeaningSelectionDirectory>};
 constructor(readonly getOwnedContext:()=>ManualMeaningOwnedContext){}
 #factory(){
  let context:ManualMeaningOwnedContext;try{context=this.getOwnedContext();}catch(error){this.#cached=undefined;throw error;}
  const old=this.#cached;
  if(!old||old.context.owner!==context.owner||old.context.identity!==context.identity||old.context.dataDir!==context.dataDir||old.context.actualPackFile!==context.actualPackFile){this.#cached=undefined;const factory=createManualM970MeaningSelectionDirectory({dataDir:context.dataDir,actualPackFile:context.actualPackFile});this.#cached={context,factory};}
  return this.#cached!.factory;
 }
 list(raw:unknown):ManualCharacterMeaningDirectory{
  if(arguments.length!==1)throw Error('MANUAL_MEANING_INPUT_INVALID: exactly one list request required');
  const request=capture(raw,'char'),reply=this.#factory().listAvailableMeanings({mode:'manual-request',char:request.char});
  return snapshotApplicationJson({...boundary,schema:reply.schema,mode:reply.mode,char:reply.char,status:reply.status,items:reply.items.map(item=>({selectionKey:item.selectionKey,char:item.char,pinyin:item.pinyin,tone:item.tone,originalMeaning:item.originalMeaning,sourceCitation:{dictionaryName:item.sourceCitation.dictionaryName,word:item.sourceCitation.word,pinyin:item.sourceCitation.pinyin,license:item.sourceCitation.license},changeMeaning:item.changeMeaning,manualReason:item.manualReason,limits:item.limits}))}) as ManualCharacterMeaningDirectory;
 }
 select(raw:unknown):ManualCharacterMeaningSelection{
  if(arguments.length!==1)throw Error('MANUAL_MEANING_INPUT_INVALID: exactly one selection request required');
  const request=capture(raw,'selectionKey'),reply=this.#factory().selectMeaning({mode:'manual-request',selectionKey:request.selectionKey});
  if(reply.status==='invalid-selection')return snapshotApplicationJson({...boundary,schema:reply.schema,mode:reply.mode,status:reply.status,reason:reply.reason,explanation:null}) as ManualCharacterMeaningSelection;
  const option=reply.meaningOptions.options[0];if(reply.meaningOptions.status!=='available'||reply.meaningOptions.options.length!==1||!option)throw Error('MANUAL_MEANING_RESULT_INVALID: selected explanation unavailable');
  return snapshotApplicationJson({...boundary,schema:reply.schema,mode:reply.mode,status:reply.status,reason:null,explanation:{char:option.char,selectionKey:request.selectionKey,meaning:option.meaning,manualReason:option.manualReason,limits:option.limits}}) as ManualCharacterMeaningSelection;
 }
}
