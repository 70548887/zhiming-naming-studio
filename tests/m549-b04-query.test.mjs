import test from 'node:test';
import assert from 'node:assert/strict';
import {loadVerifiedB04ContextCandidate,queryB04ContextCandidate} from '../scripts/meaning-context-m460-b04-candidate.mjs';
import {createMeaningContextLookup} from '../src/domain/meaning-context-next.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const capsule=loadVerifiedB04ContextCandidate(path.join(projectRoot,'data'),path.join(projectRoot,'data'));
const trusted={packSha256:capsule.publication.base.knowledgePackSha256,activeVersion:capsule.publication.base.activeVersion};
const first=capsule.publication.cases[0];
const requestFor=row=>({char:row.char,givenName:row.givenName,characters:row.characterBindings.map(b=>b.character),confirmedReadings:row.confirmedReadings,choice:{usage:row.selection.usage,caseId:row.selection.caseId,senseId:row.selection.senseId,contextKey:row.selection.contextKey}});

test('B04 ready query is exact full-word context only and carries no authority',()=>{
  const result=queryB04ContextCandidate(capsule,requestFor(first),trusted);
  assert.equal(result.status,'explanation-ready');
  assert.equal(result.dictionaryOriginal,first.source.definition.def);
  assert.equal(result.scope,'complete-given-name-dictionary-reference');
  assert.equal(result.independentCharacterMeaningApproved,false);
  assert.equal(result.wholeNameApproved,false);
  assert.equal(result.automaticSemanticCreditAllowed,false);
  assert.equal(result.scoreDelta,0);
  assert.equal(result.projectWish,null);
});

test('B04 requires both confirmed readings and an explicit exact context choice',()=>{
  const missing={...requestFor(first),confirmedReadings:[null,first.confirmedReadings[1]]};
  assert.equal(queryB04ContextCandidate(capsule,missing,trusted).status,'needs-confirmed-reading');
  const noChoice={...requestFor(first)};delete noChoice.choice;
  assert.equal(queryB04ContextCandidate(capsule,noChoice,trusted).status,'needs-explicit-choice');
});

test('B04 rejects whole-word substitution and wrong character bindings',()=>{
  assert.equal(queryB04ContextCandidate(capsule,{...requestFor(first),givenName:first.char},trusted).status,'not-covered');
  const wrong={...requestFor(first),characters:first.characterBindings.map(b=>({...b.character,meaning:'tampered'}))};
  assert.equal(queryB04ContextCandidate(capsule,wrong,trusted).status,'not-applicable');
});

test('B04 preserves missing source POS and cannot become standalone character meaning',()=>{
  assert.equal(capsule.semantic.sourcePOSMissing,20);
  assert.ok(capsule.publication.cases.every(row=>!Object.hasOwn(row.source.definition,'type')));
  assert.equal(capsule.semantic.formalCoverageAdded,0);
  assert.equal(capsule.publication.policy.wholeNameApproved,false);
  assert.equal(capsule.publication.policy.automaticSemanticCreditAllowed,false);
});

test('B04 candidate rows remain isolated from old40 full-word publication',()=>{
  const old=JSON.parse(fs.readFileSync(path.join(projectRoot,'data/meaning-context-v1-1.json'),'utf8'));
  assert.equal(old.cases.length,40);
  const oldIds=new Set(old.cases.map(row=>row.caseId));
  assert.equal(capsule.publication.cases.some(row=>oldIds.has(row.caseId)),false);
  assert.equal(capsule.publication.cases.some(row=>old.cases.some(oldRow=>oldRow.givenName===row.givenName)),false);
  const oldLookup=createMeaningContextLookup(old);
  const oldRow=old.cases[0];
  const oldResult=oldLookup.lookup({char:oldRow.char,givenName:oldRow.givenName,characters:oldRow.characterBindings.map(b=>b.character),confirmedReadings:oldRow.confirmedReadings,choice:{usage:oldRow.selection.usage,caseId:oldRow.selection.caseId,senseId:oldRow.selection.senseId,contextKey:oldRow.selection.contextKey}},trusted);
  assert.equal(oldResult.status,'explanation-ready');
});
