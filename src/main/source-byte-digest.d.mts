import type {Buffer} from 'node:buffer';

/** Pure SHA-256 of the supplied bytes; no source eligibility or authentication. */
export function digestSourceBytes(bytes:Buffer):string;
