import {types,isDeepStrictEqual as equal} from 'node:util';
import {createCandidate2GenerationAdoptionV2} from './candidate2-generation-adoption-v2';
import {ownAdoptionEnvelopeV2} from './candidate2-generation-adoption-codec-v2';
import {snapshotApplicationJson} from './project-application-v132-r2-json';
import {Candidate2SemanticError,candidate2SemanticNeed as need} from './candidate2-semantic-errors-v1';
import {CANDIDATE2_NAMING_SELECTION} from '../shared/candidate2-naming-consumer-v1';
import type {Candidate2NamingSelection,Candidate2NamingGeneration} from '../shared/candidate2-naming-consumer-v1';
import type {Candidate2SemanticConfigurationV1} from '../shared/candidate2-semantic-composition-v1';
import type {Candidate2AdoptionEnvelopeV2} from '../shared/candidate2-generation-adoption-v2';
import type {BirthProfile,NamingPreferences} from '../shared/types';

declare const contextBrand:unique symbol;
export interface Candidate2SemanticOwnedContextV1 {readonly [contextBrand]:true}
export interface Candidate2SemanticContextDescriptionV1 {
  readonly origin:'generation'|'replay';readonly envelope:Candidate2AdoptionEnvelopeV2;
  readonly generation:Candidate2NamingGeneration;
  readonly profile:BirthProfile;readonly preferences:NamingPreferences;readonly computationPreferences:NamingPreferences;
}
const exact=(value:unknown,fields:readonly string[]):void=>{
  need(!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===fields.length&&fields.every(key=>Object.hasOwn(value,key)),'C2_SEMANTIC_INPUT_INVALID','exact configuration fields required');
};
/** The only context issuer invokes the real fixed C2 owner itself. Serialized
 * envelopes are replay inputs, never a way to issue a generation context. */
export function createCandidate2SemanticConstraintAdapterV1(configuration:Candidate2SemanticConfigurationV1){
  need(arguments.length===1,'C2_SEMANTIC_INPUT_INVALID','one main configuration required');
  let config:Candidate2SemanticConfigurationV1;
  try{config=snapshotApplicationJson(configuration) as Candidate2SemanticConfigurationV1;}catch{throw new Candidate2SemanticError('C2_SEMANTIC_INPUT_INVALID','ordinary main configuration required');}
  exact(config,['applicationBundlePath','assetDir','dataDir','consumerPublicationDir','mechanics']);exact(config.mechanics,['seed','excludeNames']);
  const owner=createCandidate2GenerationAdoptionV2(config),issued=new WeakMap<object,Candidate2SemanticContextDescriptionV1>();
  function failed(error:unknown):never {
    if(error instanceof Candidate2SemanticError)throw error;
    const message=error instanceof Error?error.message:'C2 operation failed';
    throw new Candidate2SemanticError(/UNSUPPORTED|CONFLICT/.test(message)?'C2_SEMANTIC_UNSUPPORTED':'C2_SEMANTIC_C2_REJECTED',message);
  }
  function register(envelope:Candidate2AdoptionEnvelopeV2,origin:'generation'|'replay'):Candidate2SemanticOwnedContextV1 {
    const generation=envelope.session.candidate2Naming.generation;
    need(equal(generation.selection,CANDIDATE2_NAMING_SELECTION)&&generation.preferences.preferredElements.length===0&&!Object.hasOwn(generation.preferences,'namingElementMethod'),'C2_SEMANTIC_C2_REJECTED','original C2 preferences/selection');
    need(equal(generation.profile.namingPreferences,generation.preferences)&&equal(generation.domainProjection.applied,generation.application.application.elements.applied),'C2_SEMANTIC_C2_REJECTED','actual C2 calculation basis');
    const computationPreferences=snapshotApplicationJson({...generation.preferences,preferredElements:[...generation.domainProjection.applied]}) as NamingPreferences;
    const context=Object.freeze(Object.create(null)) as Candidate2SemanticOwnedContextV1;
    issued.set(context,Object.freeze({origin,envelope,generation,profile:generation.profile,preferences:generation.preferences,computationPreferences}));return context;
  }
  return Object.freeze({
    generateOriginal(profile:BirthProfile,preferences:NamingPreferences,selection:Candidate2NamingSelection){
      need(arguments.length===3,'C2_SEMANTIC_INPUT_INVALID','exact original profile/preferences/selection required');
      try{const proposal=owner.generate(profile,preferences,selection),envelope=owner.createSaved(proposal);return Object.freeze({context:register(envelope,'generation'),envelope});}
      catch(error){return failed(error);}
    },
    replayOriginal(input:unknown){
      need(arguments.length===1,'C2_SEMANTIC_INPUT_INVALID','recorded C2 envelope only');
      try{
        const envelope=ownAdoptionEnvelopeV2(input);owner.verifySaved(envelope);
        return register(envelope,'replay');
      }catch(error){return failed(error);}
    },
    describe(context:Candidate2SemanticOwnedContextV1):Candidate2SemanticContextDescriptionV1 {
      need(arguments.length===1&&!!context&&typeof context==='object'&&!types.isProxy(context)&&issued.has(context),'C2_SEMANTIC_UNTRUSTED_CONTEXT','this adapter actual context required');
      return issued.get(context)!;
    },
  });
}
