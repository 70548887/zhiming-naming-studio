/** A selected dictionary display may concatenate at most three distinct verbatim definitions. */
export function selectedMeaningBelongsToReading(meaning:string,definitions:string[]):boolean{
 const matches=(remaining:string,used:Set<string>,depth:number):boolean=>depth<3&&definitions.some(definition=>!used.has(definition)&&(remaining===definition||remaining.startsWith(definition+'；')&&matches(remaining.slice(definition.length+1),new Set([...used,definition]),depth+1)));
 return typeof meaning==='string'&&definitions.every(definition=>typeof definition==='string')&&matches(meaning,new Set(),0);
}
