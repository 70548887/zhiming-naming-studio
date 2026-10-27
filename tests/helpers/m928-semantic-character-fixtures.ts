import {createNamingSemanticGenerationM923} from '../../src/main/naming-semantic-generation-m923';
import {getAuthenticatedM923Resources,loadM921M923Family} from '../../src/main/naming-semantic-m923-data';
import {M923_FAMILY} from '../../src/shared/naming-semantic-m923';
import type {M923GeneratedCandidate,M923GenerationRequest} from '../../src/shared/naming-semantic-m923';
import {normalizePreferences} from '../../src/shared/workflow';
import {catalogSession} from '../fixtures/catalog-session';

/** Node-only producer fixture. Browser fixtures receive serialized candidates;
 * this module must never be part of the renderer bundle. An upstream associated
 * declaration is test input, not transport or provenance authentication. */
export interface M928Current {
 contextKey:string;candidateId:string;fullName:string;givenName:string;
}
export type M928Association=({status:'upstream-associated'}&M928Current)|{status:'pending'|'unavailable'|'stale'};
export interface M928Seed {candidate:M923GeneratedCandidate;current:M928Current;association:M928Association;}
export interface M928RealFixtures {
 seeds:Record<string,M928Seed>;
 observations:Array<{key:string;producer:string;schema:string;receiptCount:number;rowCount:number;verifiedSave:boolean;verifiedRestore:boolean}>;
}
export const cloneM928=<T,>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
export const M928_FIXTURE_KEYS=['local:明','local:安','local:安明','local:安安','ai:明','ai:安','ai:安明','ai:安安'] as const;

function request(givenName:string):M923GenerationRequest {
 const base=catalogSession('m928-semantic-test-session','2026-10-17T16:00:00Z','m928-semantic-test-owner');
 return {
  profile:{...base.profile,customerName:'M928虚构测试家长',surname:'赵',surnamePinyin:'zhào',fatherName:'',motherName:''},
  preferences:normalizePreferences({...base.preferences,length:[...givenName].length as 1|2,requiredChars:'',generationChar:'',forbiddenChars:'',elderTaboo:'',preferredElements:[],meanings:'',industry:'',numerology:false,zodiacRules:false,avoidParentNames:true}),
  familySelection:{...M923_FAMILY,enabled:true},themeIds:[],
 };
}

export function createM928RealFixtures():M928RealFixtures {
 const loaded=loadM921M923Family();
 if(!loaded.ok)throw Error('M928 real fixture family load failed: '+loaded.code);
 const resources=getAuthenticatedM923Resources(loaded.handle);
 if(resources.records.length!==40||resources.records.some(row=>row.identity.char==='明')||!resources.records.some(row=>row.identity.char==='安'))throw Error('M928 fixed family prerequisite differs');
 const producer=createNamingSemanticGenerationM923(loaded.handle);
 const seeds:Record<string,M928Seed>={},observations:M928RealFixtures['observations']=[];
 for(const key of M928_FIXTURE_KEYS){
  const [origin,givenName]=key.split(':') as ['local'|'ai',string];
  const input=request(givenName);
  let candidate:M923GeneratedCandidate;
  let producerName:string;
  if(origin==='local'&&givenName==='明'){
   input.preferences.requiredChars='明';
   const generated=producer.generateLocal(input,7).candidates.find(row=>row.fullName==='赵明');
   if(!generated)throw Error('M928 real generateLocal did not produce 赵明');
   candidate=generated;producerName='generateLocal';
  }else{
   const evaluated=origin==='ai'?producer.evaluateAiProposals(input,[{givenName}])[0]:producer.evaluate(input,givenName,'local');
   if(evaluated.status!=='generated')throw Error('M928 real '+origin+' producer blocked '+givenName+': '+evaluated.code);
   candidate=evaluated.candidate;producerName=origin==='ai'?'evaluateAiProposals':'evaluate';
  }
  const save=producer.verifySaved(candidate,input,'save'),restore=producer.verifySaved(candidate,input,'restore');
  if(!save.ok||!restore.ok)throw Error('M928 real fixture producer verification failed: '+key);
  const snapshot=candidate.semanticAdoptionM923;
  if(snapshot.schema!=='m921-m923-character-generation-snapshot/2')throw Error('M928 real fixture is not snapshot/2');
  const current:M928Current={contextKey:'m928-owner-selection-epoch-1',candidateId:candidate.id,fullName:candidate.fullName,givenName:candidate.givenName};
  seeds[key]=cloneM928({candidate,current,association:{status:'upstream-associated',...current}});
  observations.push({key,producer:producerName,schema:snapshot.schema,receiptCount:snapshot.rows.filter(row=>row.adoption!==null).length,rowCount:snapshot.rows.length,verifiedSave:save.ok,verifiedRestore:restore.ok});
 }
 return {seeds,observations};
}
