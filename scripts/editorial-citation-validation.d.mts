import type {CharacterEntry,Citation} from '../src/shared/types';
export function validateEditorialCitations(editorial:unknown,dataset:{characters:CharacterEntry[];citations:Citation[]}):{rules:number;names:number;continuousNames:number;recombinedNames:number;canonicalIdentitiesMatched:boolean;excerptsAndReadingsMatched:boolean};
