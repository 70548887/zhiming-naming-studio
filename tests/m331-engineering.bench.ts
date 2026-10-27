/** Opt-in engineering observation: explicit bench config only; outside normal test discovery. */
import {it,expect,vi} from 'vitest';
import {performance} from 'node:perf_hooks';
import * as before from './helpers/m331-baseline/naming';
import {verifyCandidateFacts as oldVerify} from './helpers/m331-baseline/candidate-facts';
import {recomputeCandidateFactsBatchForRuleVersion as batch} from '../src/domain/naming';
import {verifyCandidateFacts as newVerify} from '../src/main/candidate-facts';
import {benchmarkFixture,scalarRows,sessionFromCandidates,transparentMap} from './helpers/m331-candidate-fixture';
import {NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION} from '../src/shared/naming-rules';
import type {NameCandidate} from '../src/shared/types';

function deterministic<T>(run:()=>T):T {
  const actual=globalThis.crypto;let index=0;
  vi.stubGlobal('crypto',new Proxy(actual,{get(target,key){if(key==='randomUUID')return()=>`00000000-0000-4000-8000-${String(++index).padStart(12,'0')}`;const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}}));
  try{return run();}finally{vi.unstubAllGlobals();}
}
const sample=(run:()=>unknown)=>{const start=performance.now();const result=deterministic(run);return{ms:performance.now()-start,result};};
const median=(rows:number[])=>[...rows].sort((a,b)=>a-b)[Math.floor(rows.length/2)];

it('records same-input pure engineering counts and timings with full-field equality',()=>{
  const observations=[];
  for(const version of [NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION]){
    const {fixture:f,rows}=benchmarkFixture(version);
    const scalar=()=>scalarRows(f,rows,before.evaluateNameForRuleVersionWithContext,before.evaluateNameWithResolvedBasisForRuleVersion);
    const grouped=()=>batch(version,f.context,f.profile,f.preferences,f.analysis,f.characters,f.citations,rows,f.basis);
    const baseline=deterministic(scalar);expect(deterministic(grouped)).toEqual(baseline);
    const oldProbe=transparentMap(f.characters),newProbe=transparentMap(f.characters);
    deterministic(()=>scalarRows({...f,characters:oldProbe.characters},rows,before.evaluateNameForRuleVersionWithContext,before.evaluateNameWithResolvedBasisForRuleVersion));
    deterministic(()=>batch(version,f.context,f.profile,f.preferences,f.analysis,newProbe.characters,f.citations,rows,f.basis));
    expect(newProbe.counts.characterMaps).toBe(1);expect(oldProbe.counts.characterMaps).toBeGreaterThan(newProbe.counts.characterMaps);
    const beforeTimes:number[]=[],afterTimes:number[]=[];
    for(let repeat=0;repeat<3;repeat++){
      const order=repeat%2?['after','before']:['before','after'];
      for(const label of order){const result=sample(label==='before'?scalar:grouped);expect(result.result).toEqual(baseline);(label==='before'?beforeTimes:afterTimes).push(result.ms);}
    }
    const candidates=baseline.filter((row):row is NameCandidate=>row!==null).slice(0,12);expect(candidates).toHaveLength(12);
    const session=sessionFromCandidates(f,candidates),originalSession=structuredClone(session);
    const oldFacts=()=>oldVerify(session,f.archive,f.archive),newFacts=()=>newVerify(session,f.archive,f.archive);
    const expectedFactResult=oldFacts();expect(newFacts()).toEqual(expectedFactResult);expect(session).toEqual(originalSession);
    const oldFactTimes:number[]=[],newFactTimes:number[]=[];
    for(let repeat=0;repeat<3;repeat++){
      const order=repeat%2?['after','before']:['before','after'];
      for(const label of order){const measured=sample(()=>{const verify=label==='before'?oldFacts:newFacts;return[verify(),verify()];});expect(measured.result).toEqual([expectedFactResult,expectedFactResult]);(label==='before'?oldFactTimes:newFactTimes).push(measured.ms);}
    }
    expect(session).toEqual(originalSession);
    const row={version,kind:'pure-same-input-engineering-observation',rows:rows.length,origins:['local','ai'],dataset:{characters:f.characters.length,citations:f.citations.length},counts:{before:{...oldProbe.counts},after:{...newProbe.counts}},
      evaluation:{beforeMs:beforeTimes,afterMs:afterTimes,beforeMedianMs:median(beforeTimes),afterMedianMs:median(afterTimes)},
      facts:{candidates:12,passesPerSample:2,beforeMs:oldFactTimes,afterMs:newFactTimes,beforeMedianMs:median(oldFactTimes),afterMedianMs:median(newFactTimes)},
      allCandidateFieldsEqual:true,fullVerificationResultEqual:true,sessionUnchanged:true,
      limits:'One machine, no CPU isolation; timings are engineering overhead observations, not clean profiling or end-to-end generate/Store/source-admission/91-timeout acceptance. No Store/Service/DB/Worker executed.'};
    observations.push(row);console.info('M331_ENGINEERING_OBSERVATION '+JSON.stringify(row));
  }
  expect(observations).toHaveLength(2);
},180000);
