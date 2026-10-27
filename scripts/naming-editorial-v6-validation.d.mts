export const V6_VERSION:string,V6_DATA_VERSION:string,V6_SOURCE_ID:string;
export const V6_CORRECTED_CHARACTERS:string[];
export const V6_INPUT_HASHES:Record<string,string>;
export const V6_BASE:Record<string,string>;
export function deriveV6CharacterOverride(before:any,sourceEvidence:any):any;
export function validateNamingEditorialV6Inputs(inputs:{table:any;baseDataset:any;nextDataset:any;base5:any;base4:any;corrections:any;semanticReview:any;rawMoe:any[]}):{characters:number;unchangedCharacters:number;overrides:number;names:number;oldNames:number;defaultPronunciationChanges:number;addedHeteronyms:number;semanticMigrations:number};
