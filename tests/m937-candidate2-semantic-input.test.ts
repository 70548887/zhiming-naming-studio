import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {fileURLToPath} from 'node:url';
import {captureCandidate2SemanticRequestV1,createCandidate2SemanticCompositionV1} from '../src/main/candidate2-semantic-composition-v1';
import {createCandidate2SemanticConstraintAdapterV1} from '../src/main/candidate2-semantic-constraint-adapter-v1';
import {CANDIDATE2_NAMING_SELECTION} from '../src/shared/candidate2-naming-consumer-v1';
import {M923_FAMILY} from '../src/shared/naming-semantic-m923';
import {normalizePreferences} from '../src/shared/workflow';
import positive from './fixtures/project-naming-use-m153.json';
import type {BirthProfile} from '../src/shared/types';
import type {Candidate2SemanticRequestV1} from '../src/shared/candidate2-semantic-composition-v1';

// Portable request checks use checked-in inputs and the actual capture API.
// No external artifact fixture, runtime installation or evidence output runs.
const root=fileURLToPath(new URL('../',import.meta.url));
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
const selection={...M923_FAMILY,enabled:true as const};
function request(char='安'):Candidate2SemanticRequestV1 {
  return {profile:clone(positive.positive.profile) as BirthProfile,preferences:normalizePreferences({length:1,requiredChars:char,zodiacRules:false,numerology:false}),candidate2Selection:CANDIDATE2_NAMING_SELECTION,semanticSelection:selection,themeIds:[]};
}

describe('M937 lightweight exact request boundary; no C2 computations',()=>{
  it('captures both explicit selections and sorted known themes with no defaults',()=>{
    const raw=request();raw.themeIds=['water-bubbles','agriculture'];const result=captureCandidate2SemanticRequestV1(raw);
    expect(result.themeIds).toEqual(['agriculture','water-bubbles']);expect(result.profile).toEqual(raw.profile);expect(result.preferences).toEqual(raw.preferences);expect(Object.isFrozen(result)).toBe(true);
  });
  it.each(['profile','preferences','candidate2Selection','semanticSelection','themeIds'])('rejects missing %s',key=>{
    const input:any=clone(request());delete input[key];expect(()=>captureCandidate2SemanticRequestV1(input)).toThrow('C2_SEMANTIC_INPUT_INVALID');
  });
  it.each(['trusted','pass','analysis','generation','owner','basis','mechanics','seed','excludeNames'])('rejects caller %s field',key=>{
    expect(()=>captureCandidate2SemanticRequestV1({...request(),[key]:true})).toThrow('C2_SEMANTIC_INPUT_INVALID');
  });
  it.each(['candidate2Selection','semanticSelection'])('rejects false, absent-content and foreign %s',key=>{
    for(const value of [{enabled:false},{},{...selection,familyId:'foreign'},null])expect(()=>captureCandidate2SemanticRequestV1({...request(),[key]:value})).toThrow('C2_SEMANTIC_SELECTION_REQUIRED');
  });
  it('rejects duplicate/free-text theme IDs instead of interpreting them',()=>{
    for(const themeIds of [['自然'],['agriculture','agriculture']])expect(()=>captureCandidate2SemanticRequestV1({...request(),themeIds})).toThrow('C2_SEMANTIC_SELECTION_REQUIRED');
  });
  it('never invokes getter, proxy or toJSON when capturing request',()=>{
    let calls=0;const value=clone(request());Object.defineProperty(value,'profile',{enumerable:true,get(){calls++;throw Error('getter');}});
    expect(()=>captureCandidate2SemanticRequestV1(value)).toThrow();expect(calls).toBe(0);
    const proxy=new Proxy(request(),{ownKeys(){calls++;throw Error('proxy');}});expect(()=>captureCandidate2SemanticRequestV1(proxy)).toThrow();expect(calls).toBe(0);
    expect(()=>captureCandidate2SemanticRequestV1({...request(),toJSON(){calls++;}})).toThrow();expect(calls).toBe(0);
  });
  it('rejects factory/operation argument omissions before physical runtime construction',()=>{
    expect(()=>(createCandidate2SemanticCompositionV1 as (...args:unknown[])=>unknown)()).toThrow('C2_SEMANTIC_INPUT_INVALID');
    expect(()=>(createCandidate2SemanticConstraintAdapterV1 as (...args:unknown[])=>unknown)()).toThrow('C2_SEMANTIC_INPUT_INVALID');
    expect(()=>createCandidate2SemanticConstraintAdapterV1({trusted:true} as any)).toThrow('C2_SEMANTIC_INPUT_INVALID');
  });
  it('new source modules parse syntactically without executing any generation',()=>{
    for(const relative of ['src/main/candidate2-semantic-errors-v1.ts','src/main/candidate2-semantic-constraint-adapter-v1.ts','src/main/candidate2-semantic-composition-v1.ts','src/shared/candidate2-semantic-composition-v1.ts']){
      const output=ts.transpileModule(fs.readFileSync(path.join(root,relative),'utf8'),{fileName:relative,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
      expect(output.diagnostics?.filter(item=>item.category===ts.DiagnosticCategory.Error),relative).toEqual([]);
    }
  });
});
