import { isDeepStrictEqual } from 'node:util';
import { QIMEN_RULE_VERSION } from '../domain/engine';
import { QIMEN_V3_RULE_VERSION } from '../domain/engine-v7';
import { expectedBazi, expectedQimen } from './expected-analysis';
import { validQimenSnapshotV2 } from './qimen-snapshot-v2';
import { compatibleSavedAnalysisVersions } from './saved-analysis-policy';
import { validateBirthTimeInput } from '../shared/birth-time-basis';
import type { BaziAnalysis, BirthProfile, QimenChart } from '../shared/types';

/** Current and frozen1.3 plates bind every field to trusted inputs, including their explanation. */
export function validQimenSnapshot(q:QimenChart,b:BaziAnalysis,profile?:BirthProfile):boolean {
  if(!q||!b||!compatibleSavedAnalysisVersions(b.version,q.version))return false;
  try{if(!profile||q.version!==QIMEN_RULE_VERSION&&validateBirthTimeInput(profile).basis==='apparent-solar')return false;}catch{return false;}
  if(q.version!==QIMEN_RULE_VERSION&&q.version!==QIMEN_V3_RULE_VERSION)return validQimenSnapshotV2(q,b,profile);
  if(!profile)return false;
  try{
    const dayHour=(value:Pick<BaziAnalysis,'pillars'>)=>value.pillars.filter(pillar=>pillar.label==='日柱'||pillar.label==='时柱').map(({label,gan,zhi})=>({label,gan,zhi}));
    return isDeepStrictEqual(dayHour(b),dayHour(expectedBazi(profile,b.version) as BaziAnalysis))&&isDeepStrictEqual(q,expectedQimen(profile,q.version));
  }catch{return false;}
}
