import type {PhoneticLanguage,PhoneticProfileVersion} from './name-phonetic-types';
export function verifyNamePhoneticPackage(directory?:string):{
 status:'passed';profileVersions:Record<PhoneticLanguage,PhoneticProfileVersion>;sourceIds:string[];
 profileSha256:string;sourceLockSha256:string;actualProfileObjectSha256:string;engineProfileMatched:true;filesVerified:number;
};
