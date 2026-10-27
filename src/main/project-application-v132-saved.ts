import type {ProjectApplicationCertificate,ProjectApplicationNamingInput,ProjectApplicationTuple,SavedProjectApplicationV132} from '../shared/project-application-v132';
import {PROJECT_APPLICATION_V132_NAMING_INPUT} from '../shared/project-application-v132';
import {applicationDigest,applicationSame,exactApplicationRecord,freezeApplication} from './project-application-v132-common';

export function projectSavedApplicationV132(certificate:ProjectApplicationCertificate):SavedProjectApplicationV132 {
 const value={schema:'project-naming-use/2' as const,tuple:certificate.tuple,replay:certificate.replay,certificate,application:{status:'applied' as const,policyId:certificate.tuple.policyId,elements:certificate.effectiveElements}};
 return freezeApplication({...value,digest:applicationDigest(value)});
}
export function assertSavedApplicationEnvelopeV132(value:unknown,tuple:ProjectApplicationTuple):asserts value is SavedProjectApplicationV132 {
 exactApplicationRecord(value,['schema','tuple','replay','certificate','application','digest']);
 if(value.schema!=='project-naming-use/2'||!applicationSame(value.tuple,tuple))throw Error('PROJECT_APPLICATION_SAVED_INVALID: unsupported exact engine/application tuple');
 exactApplicationRecord(value.replay,['schema','profile','baseAnalysis','entryPolicy']);
 if(value.replay.schema!=='project-application-replay/1'||value.replay.entryPolicy!=='month-branch-only')throw Error('PROJECT_APPLICATION_SAVED_INVALID: fixed replay input missing');
}
/** Exact equality only after the owning adapter has rebuilt the full versioned result. */
export function assertSavedApplicationMatchesV132(saved:unknown,expected:SavedProjectApplicationV132):void {
 if(!applicationSame(saved,expected))throw Error('PROJECT_APPLICATION_SAVED_INVALID: complete snapshot differs from pinned replay');
}
export function projectNamingApplicationInputV132(certificate:ProjectApplicationCertificate,origin:ProjectApplicationNamingInput['origin']):ProjectApplicationNamingInput {
 return freezeApplication({schema:PROJECT_APPLICATION_V132_NAMING_INPUT,origin,tuple:certificate.tuple,profileId:certificate.profileId,certificateDigest:certificate.digest,elements:certificate.effectiveElements});
}
