export function loadFixedMoeRows(gzipBytes:Uint8Array):any[];
export function moeTitleLookup(rawMoe:any[]):Readonly<{get(title:string):Readonly<{row:any;index:number}>|undefined}>;
