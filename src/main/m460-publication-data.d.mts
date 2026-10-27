import type {NamingEditorialV71Data} from './naming-editorial-v7-data';
export function loadM460V71Publication(directory:string):NamingEditorialV71Data|undefined;
export function m460PublicationForSaved(sourceSha256:string):NamingEditorialV71Data|undefined;
export function isM460PublicationData(value:unknown):value is NamingEditorialV71Data;

export type M460PublicationPresence = Readonly<{schema:'m460-publication-presence/1';mode:'all-absent'|'all-present';files:ReadonlyArray<Readonly<{file:string;state:'absent'}>|Readonly<{file:string;state:'present';bytes:number;sha256:string}>>}>;
/** Fresh filesystem description, not a trusted/admission token. */
export function probeM460PublicationPresence(directory:string):M460PublicationPresence;
