import {projectM754GenerationCharacters,type VerifiedM754ImageryResources} from './m754-element-imagery';
import {generateM754ProjectedLocalPreview} from '../domain/m754-element-imagery-generation';
import type {CharacterEntry} from '../shared/types';
import type {M754ObjectTheme} from '../shared/m754-element-imagery';

/** Opt-in preview adapter only. Source/review pins are loaded in main code, never received from IPC. */
export function generateM754ImageryLocalPreview(
 resources:VerifiedM754ImageryResources,characters:readonly CharacterEntry[],
 objectThemes:Readonly<Partial<Record<string,M754ObjectTheme>>>,
 ...args:OmitFirst<Parameters<typeof generateM754ProjectedLocalPreview>>
){const projection=projectM754GenerationCharacters(resources,characters,objectThemes);return {...generateM754ProjectedLocalPreview(projection,...args),imageryDecisions:projection.decisions,imageryPackageLockSha256:resources.packageLockSha256,imageryReviewId:resources.reviewId};}
type OmitFirst<T extends unknown[]>=T extends [unknown,...infer Rest]?Rest:never;
