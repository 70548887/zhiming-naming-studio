import {analyzeProfile} from '../domain/engine';
import {resolveRootCalendarBranches} from '../domain/bazi-root-calendar-branches';
import type {BirthProfile} from '../shared/types';
import {readRootFeedbackFacadeOptions,type RootFeedbackFacadeOptions} from '../shared/bazi-root-feedback-facade';
import {ROOT_FEEDBACK_V132_FACADE_SCHEMA,type RootFeedbackV132FacadeDTO} from '../shared/bazi-root-feedback-v132-r2-facade';
import {assertRootFeedbackV132Engine,ROOT_FEEDBACK_V132_METHOD_ID,type RootFeedbackV132Engine} from './bazi-root-feedback-v132-r2-engine';
import {assertRootFeedbackV132ResourceBinding,type VerifiedRootFeedbackV132Resources} from './bazi-root-feedback-v132-r2-resources';
export function createBaziRootFeedbackV132Facade(engine:RootFeedbackV132Engine,resources:VerifiedRootFeedbackV132Resources){
 assertRootFeedbackV132Engine(engine);assertRootFeedbackV132ResourceBinding(resources,engine);
 return Object.freeze({
  previewBaziRootFeedbackProfile(profile:BirthProfile,value?:RootFeedbackFacadeOptions):RootFeedbackV132FacadeDTO {
   assertRootFeedbackV132ResourceBinding(resources,engine);
   const options=readRootFeedbackFacadeOptions(value),base=analyzeProfile(structuredClone(profile)),partition=resolveRootCalendarBranches(profile,base);
   const branches=partition.branches.map(part=>{const hypothetical=profile.timeUnknown&&partition.branches.length>1,result=engine.analyze({...part.chart,provenance:'fixed-validated-calendar-facts/1;'+base.bazi.version+';'+partition.timeBasis.methodId},options,[],hypothetical);return{id:part.chart.id,kind:profile.timeUnknown?'unknown-hour-interval' as const:'recorded-instant' as const,hypothetical,root:engine.project(result)};});
   if(!branches.length)throw Error('ROOT_FEEDBACK_V132_EMPTY_BRANCHES');
   return{schema:ROOT_FEEDBACK_V132_FACADE_SCHEMA,methodId:ROOT_FEEDBACK_V132_METHOD_ID,profileId:profile.id,entryPolicy:options.fromOutputMonthStem?'month-stem-proposal':'month-branch-only',status:profile.timeUnknown||!partition.complete||branches.length!==1?'pending-regime-resolution':branches[0].root.resolution,baseAnalysis:structuredClone(base),resourceIdentity:resources.resourceIdentity,sources:resources.sources,branches,calendar:{partitionComplete:partition.complete,warnings:[...partition.warnings]},applicationGate:{status:'blocked',reasons:[{code:'version-not-admitted-for-application',message:'1.3.2 has an independent preview publication; naming application and new saved certificates require an independently admitted policy and replay tuple.'}]}};
  },
  verifyApplicationCertificate(_saved:unknown):never {throw Error('ROOT_FEEDBACK_V132_SAVED_REPLAY_UNSUPPORTED: 1.3.2 has no admitted application/saved certificate tuple.');}
 });
}
