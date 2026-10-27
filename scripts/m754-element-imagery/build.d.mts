export const DIRECTORY:string;
export const PROFILE:string;
export function hash(value:import('node:crypto').BinaryLike):string;
export function atomicWrite(file:string,bytes:string|Uint8Array):void;
export function compileM754Artifacts(root:string):{outputs:Map<string,string>;lockSha256:string;pinsSource:string;characters:string[];sourceBytes:number};
export function buildM754(root:string,options?:{verify?:boolean}):{characters:string[];total:number;formalKnown:number;formalUnknown:number;candidates:number;formalNew:number;lockSha256:string;verified:boolean};
