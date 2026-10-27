import type {NamingPreferences} from './types';
import {readNamePhoneticPreferences} from './name-phonetic-preferences';
/** Form-only dependency cleanup; never mutates an existing saved session or snapshot. */
export function wordReferenceDraftPreferences(next:NamingPreferences):NamingPreferences {
 const copy={...next};
 if(!readNamePhoneticPreferences(next))delete copy.wordPronunciationReference;
 return copy;
}
