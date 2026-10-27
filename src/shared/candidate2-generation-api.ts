import type {NamingPreferences} from './types';
import type {Candidate2NamingSelection} from './candidate2-naming-consumer-v1';
import type {Candidate2AdoptedNamingSessionV2} from './candidate2-generation-adoption-v2';

export interface Candidate2GenerateSavedResult {
 schema:'candidate2-generate-saved/1';
 status:'saved';
 session:Candidate2AdoptedNamingSessionV2;
 messages:string[];
 traditionalStatus:'unknown';
}

export interface Candidate2GenerationAPI {
 generateCandidate2(profileId:string,prefs:NamingPreferences,selection:Candidate2NamingSelection):Promise<Candidate2GenerateSavedResult>;
}
