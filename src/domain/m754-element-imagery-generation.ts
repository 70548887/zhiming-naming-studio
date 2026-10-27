import {generateLocalForRuleVersionWithContext} from './naming';
import type {CharacterEntry} from '../shared/types';

/** Uses the actual versioned generator. The caller must supply a verified main-process projection. */
export function generateM754ProjectedLocalPreview(
 projection:{characters:CharacterEntry[]},
 version:Parameters<typeof generateLocalForRuleVersionWithContext>[0],
 context:Parameters<typeof generateLocalForRuleVersionWithContext>[1],
 profile:Parameters<typeof generateLocalForRuleVersionWithContext>[2],
 preferences:Parameters<typeof generateLocalForRuleVersionWithContext>[3],
 analysis:Parameters<typeof generateLocalForRuleVersionWithContext>[4],
 citations:Parameters<typeof generateLocalForRuleVersionWithContext>[6],
 seed=0,excludeNames:string[]=[]
){return generateLocalForRuleVersionWithContext(version,context,profile,preferences,analysis,projection.characters,citations,seed,excludeNames);}
