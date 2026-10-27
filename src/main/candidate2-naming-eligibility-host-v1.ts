import {createCandidate2NamingConsumer} from './candidate2-naming-consumer-v1';
import {captureEligibilityRequest,eligibilityFailure,eligibilityResponse} from './candidate2-naming-eligibility-response-v1';
import type {Candidate2NamingEligibility} from '../shared/candidate2-naming-eligibility-v1';
import type {Candidate2NamingRequest,Candidate2NamingGeneration,Candidate2NamingReplayContext} from '../shared/candidate2-naming-consumer-v1';
import type {BirthProfile,NamingPreferences} from '../shared/types';
import {snapshotApplicationJson} from './project-application-v132-r2-json';

/** Lazy main-process port: deployment failures become unavailable diagnostics.
 * Every successful check and generate delegates to one owned consumer instance.
 * It installs no IPC/HTTP handler and accepts no client-supplied runtime API.
 */
export function createCandidate2NamingEligibilityHost(configuration:Parameters<typeof createCandidate2NamingConsumer>[0]) {
 const config=snapshotApplicationJson(configuration) as Parameters<typeof createCandidate2NamingConsumer>[0];
 let consumer:ReturnType<typeof createCandidate2NamingConsumer>|undefined;
 const current=()=>consumer??=createCandidate2NamingConsumer(config);
 return Object.freeze({
  checkEligibility(profile:BirthProfile,preferences:NamingPreferences,selection?:Candidate2NamingRequest['selection']):Candidate2NamingEligibility {
   let request:ReturnType<typeof captureEligibilityRequest>|null=null;
   try{
    request=captureEligibilityRequest(profile,preferences,selection);
    if(!request.selectionWasProvided||request.selection&&Object.keys(request.selection).length===1&&request.selection.enabled===false)return eligibilityResponse('disabled',request,[{code:'not-selected',message:'尚未明确开启 candidate.2，本次不采用新取法。'}]);
    return current().checkEligibility(request.profile,request.preferences,(request.selectionWasProvided?request.selection:undefined) as Candidate2NamingRequest['selection']);
   }catch(error){return eligibilityFailure(error,request);}
  },
  generate:(request:Candidate2NamingRequest)=>current().generate(request),
  createSaved:(result:Candidate2NamingGeneration)=>current().createSaved(result),
  verifySaved:(saved:unknown,context:Candidate2NamingReplayContext)=>current().verifySaved(saved,context),
 });
}
