import {after,before,describe,it} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';
import {convert,PACKAGE_ROOT,DEFAULT_SOURCE_ROOT,VERSION,RULE_VERSION,THEMES,STAGES} from './convert.mjs';
import {assessReview,ARTIFACT_FILES,verify} from './verify.mjs';
import {INPUT_PINS,SOURCE_PINS} from './pins.mjs';

// Standalone candidate tests. No Store, Service, AI, runtime registration,
// production data mutation or generation eligibility is exercised here.
const digest=value=>createHash('sha256').update(value).digest('hex');
const objectDigest=value=>digest(JSON.stringify(value));
const json=(root,file)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const sourceOptions={sourceRoot:DEFAULT_SOURCE_ROOT,packageRoot:PACKAGE_ROOT};
const tempParent=fs.realpathSync.native(tmpdir());
let ownedRoot,sourceCopy,packageCopy,actual,decisions,dictionary,dataset,domain;
function rejectM921(body,code){
  assert.throws(body,error=>error instanceof Error&&error.message.startsWith('M921_')&&(!code||error.message==='M921_'+code));
}
function mutatePublication(body){const publication=structuredClone(actual.publication);body(publication);return publication;}
function reviewRequest(record,stage='pool',extra={}){return{candidateCaseId:record.candidateCaseId,char:record.identity.char,pinyin:record.identity.pinyin,tone:record.identity.tone,senseId:record.identity.senseId,stage,themeIds:[],requestedGivenNameLength:1,namePart:'given-name',...extra};}
function assertNoGrant(result){
  assert.equal(result.generationEligible,false);assert.equal(result.admissionGranted,false);assert.equal(result.runtimeProjectWish,null);assert.equal(result.wholeNameMeaning,null);assert.equal(result.scoreDelta,0);assert.equal(result.automaticSemanticCreditAllowed,false);assert.equal(result.elementModification,false);
}
function writeJson(file,value){const temporary=file+'.m921-tests.tmp';fs.writeFileSync(temporary,JSON.stringify(value,null,2)+'\n');fs.renameSync(temporary,file);}
function repackManifest(root){
  // Deliberately independent of seal.mjs: an attacker can recompute closure
  // bytes, but those bytes must never mint a source or generation grant.
  const manifest={schema:'m921-publication-manifest/1',version:VERSION,activation:'off',admissionGranted:false,productionApproved:false,formalCoverageAdded:0,defaultAutomaticCoverageAdded:0,files:ARTIFACT_FILES.map(file=>{const bytes=fs.readFileSync(path.join(root,file));return{file,sha256:digest(bytes),bytes:bytes.length};})};
  writeJson(path.join(root,'manifest.json'),manifest);return manifest;
}
function assertManifestBytes(root,manifest){
  assert.deepEqual(manifest.files.map(pin=>pin.file),ARTIFACT_FILES);
  for(const pin of manifest.files){const bytes=fs.readFileSync(path.join(root,pin.file));assert.equal(bytes.length,pin.bytes);assert.equal(digest(bytes),pin.sha256);}
}
function wrongTone(value){return value%4+1;}
function toneOf(pinyin){
  const marks=[...pinyin.normalize('NFD')].filter(char=>'\u0304\u0301\u030c\u0300'.includes(char));assert.equal(marks.length,1);return new Map([['\u0304',1],['\u0301',2],['\u030c',3],['\u0300',4]]).get(marks[0]);
}
function verifyChanged(publication,code='PUBLICATION_REPLAY'){rejectM921(()=>verify({...sourceOptions,publication}),code);}

before(async()=>{
  ownedRoot=fs.mkdtempSync(path.join(tempParent,'m921-node-tests-'));sourceCopy=path.join(ownedRoot,'source');packageCopy=path.join(ownedRoot,'package');
  fs.mkdirSync(sourceCopy);fs.cpSync(PACKAGE_ROOT,packageCopy,{recursive:true});
  for(const [file,pin]of Object.entries(SOURCE_PINS)){
    const bytes=fs.readFileSync(path.join(DEFAULT_SOURCE_ROOT,file));assert.equal(bytes.length,pin.bytes);assert.equal(digest(bytes),pin.sha256);
    const target=path.join(sourceCopy,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
  }
  for(const [file,pin]of Object.entries(INPUT_PINS)){const bytes=fs.readFileSync(path.join(PACKAGE_ROOT,file));assert.equal(bytes.length,pin.bytes);assert.equal(digest(bytes),pin.sha256);}
  actual=convert(sourceOptions);assert.equal(verify(sourceOptions).ok,true);
  decisions=fs.readFileSync(path.join(PACKAGE_ROOT,'inputs/m917-rows.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  dictionary=JSON.parse(gunzipSync(fs.readFileSync(path.join(DEFAULT_SOURCE_ROOT,'data/raw/moe-revised.json.gz'))).toString('utf8'));
  dataset=json(DEFAULT_SOURCE_ROOT,'data/dataset-v6.json');
  const outfile=path.join(ownedRoot,'actual-semantic-v72.mjs');
  await build({entryPoints:[path.join(DEFAULT_SOURCE_ROOT,'src/domain/naming-semantic-admission-v72.ts')],outfile,bundle:true,platform:'node',format:'esm',logLevel:'silent'});
  domain=await import(pathToFileURL(outfile).href);
});
after(()=>{
  if(!ownedRoot)return;const stat=fs.lstatSync(ownedRoot),resolved=fs.realpathSync.native(ownedRoot);
  assert.equal(path.dirname(resolved),tempParent);assert.match(path.basename(resolved),/^m921-node-tests-/u);assert.equal(stat.isDirectory(),true);assert.equal(stat.isSymbolicLink(),false);assert.equal(resolved,ownedRoot);
  fs.rmSync(resolved,{recursive:true,force:false});
});

describe('M921 fixed-source forty-row candidate conversion and strict no-grant boundaries',{concurrency:false},()=>{
  it('keeps code-owned pin records immutable against caller hash replacement',()=>{
    for(const pins of [INPUT_PINS,SOURCE_PINS]){assert.equal(Object.isFrozen(pins),true);for(const pin of Object.values(pins)){assert.equal(Object.isFrozen(pin),true);const expected=pin.sha256;assert.throws(()=>{pin.sha256='0'.repeat(64);},TypeError);assert.equal(pin.sha256,expected);}}
    rejectM921(()=>verify(null),'VERIFY_CONFIG');
  });
  it('rederives the sealed forty-row artifacts from every actual fixed source and input file',()=>{
    assert.equal(Object.keys(SOURCE_PINS).length,10);assert.equal(Object.keys(INPUT_PINS).length,13);
    assert.deepEqual(json(PACKAGE_ROOT,'publication.json'),actual.publication);assert.deepEqual(json(PACKAGE_ROOT,'lineage.json'),actual.lineage);assert.deepEqual(json(PACKAGE_ROOT,'revision-proposals.json'),actual.revisionProposals);assert.deepEqual(json(PACKAGE_ROOT,'source-lock.json'),actual.sourceLock);
    assert.deepEqual(verify(sourceOptions),{ok:true,publicationVersion:VERSION,rows:40,sourceGeneral:38,sourcePending:2,semanticClear:37,migrationHold:1,pendingRevisions:3,runtimeProjectWish:null,activation:'off',admissionGranted:false,formalCoverageAdded:0,defaultAutomaticCoverageAdded:0,authority:'candidate-artifact-verification-only'});
    assertManifestBytes(PACKAGE_ROOT,json(PACKAGE_ROOT,'manifest.json'));assert.equal(actual.publication.activation,'not-current');assert.equal(actual.publication.productionApproved,false);
    for(const row of actual.publication.rows){assert.equal(row.candidateOnly,true);assert.equal(row.activation,'off');assert.equal(row.generationAuthority,false);assert.equal(row.project.projectWish,null);assert.equal(row.binding.admissionGranted,false);}
    for(const record of actual.publication.records){assert.equal(record.ruleVersion,RULE_VERSION);assert.equal(record.productionActivation,'off');assert.equal(record.approvedScope,'none');assert.equal(record.project.projectWish,null);assert.deepEqual(record.grants,{eligibilityPolicyApproved:false,sourceAuthorityFromCaller:false,automaticSemanticCreditAllowed:false,scoreDelta:0,wholeNameMeaning:null,wholeNameApproved:false,personalityPrediction:false,fortunePrediction:false,elementModification:false});}
  });

  it('checks all forty coordinates, complete raw entries, selected pinyin/tones and two-batch lineage independently of converter output',()=>{
    assert.equal(decisions.length,40);assert.equal(new Set(decisions.map(row=>row.candidateId)).size,40);
    const review=json(PACKAGE_ROOT,'inputs/m916-semantic-review.json').rows,reviewInput=json(PACKAGE_ROOT,'inputs/m916-review-input.json').rows;
    const upstream=new Map(),subsets=new Map();
    for(const batch of ['m910','m914']){
      const selection=json(PACKAGE_ROOT,`inputs/${batch}-selection.json`).selected,subset=json(PACKAGE_ROOT,`inputs/${batch}-source-subset.json`).entries;assert.equal(selection.length,20);assert.equal(subset.length,20);
      for(const row of selection){assert.equal(upstream.has(row.candidateId),false);upstream.set(row.candidateId,row);const matched=subset.find(item=>item.char===row.char&&['rawEntryIndex','rawHeteronymIndex','rawDefinitionIndex'].every(key=>item[key]===row[key]));assert.ok(matched);subsets.set(row.candidateId,matched);}
    }
    for(const decision of decisions){
      const row=actual.publication.rows.find(item=>item.caseId===decision.candidateId),record=actual.publication.records.find(item=>item.candidateCaseId===decision.candidateId),line=actual.lineage.rows.find(item=>item.candidateCaseId===decision.candidateId);
      const original=upstream.get(decision.candidateId),subset=subsets.get(decision.candidateId),reviewed=review.find(item=>item.candidateId===decision.candidateId),rawReview=reviewInput.find(item=>item.candidateId===decision.candidateId);
      assert.ok(row&&record&&line&&original&&subset&&reviewed&&rawReview);assert.deepEqual(reviewed,rawReview);assert.deepEqual(row.priorV7Review,reviewed);assert.equal(row.priorV7ReviewSha256,objectDigest(reviewed));assert.equal(decision.sourceRowSHA256,objectDigest(reviewed));
      const coordinate=decision.definitionCoordinate,entry=dictionary[coordinate.rawEntryIndex],heteronym=entry.heteronyms[coordinate.rawHeteronymIndex],definition=heteronym.definitions[coordinate.rawDefinitionIndex],base=dataset.characters.find(item=>item.char===decision.char);
      assert.deepEqual(row.source.completeOriginalEntry,entry);assert.deepEqual(subset.completeOriginalEntry,entry);assert.equal(decision.sourceSHA256,objectDigest(entry));assert.equal(row.source.parsedEntrySha256,objectDigest(entry));assert.deepEqual(row.source.definition,definition);assert.deepEqual(definition,decision.sourceDefinition);assert.deepEqual(definition,subset.sourceDefinition);
      for(const key of ['char','pinyin','tone','sourceId','dictionaryWord']){assert.equal(original[key],decision[key]);assert.equal(subset[key],decision[key]);assert.equal(reviewed[key],decision[key]);}
      assert.equal(entry.title,decision.dictionaryWord);assert.equal(heteronym.pinyin,decision.pinyin);assert.equal(toneOf(heteronym.pinyin),decision.tone);assert.equal(definition.def,decision.dictionarySense);assert.equal(definition.type,decision.sourcePOS);
      for(const key of ['rawEntryIndex','rawHeteronymIndex','rawDefinitionIndex']){assert.equal(row.source[key],coordinate[key]);assert.equal(record.identity[key],coordinate[key]);assert.equal(original[key],coordinate[key]);assert.equal(reviewed[key],coordinate[key]);}
      assert.deepEqual(row.baselineCharacter,base);assert.equal(record.identity.baselineCharacterSha256,objectDigest(base));assert.equal(record.identity.definitionSha256,objectDigest(definition));assert.equal(record.identity.definitionTextSha256,digest(definition.def));assert.equal(record.identity.senseId,`moe-revised:${coordinate.rawEntryIndex}:${coordinate.rawHeteronymIndex}:${coordinate.rawDefinitionIndex}`);
      assert.equal(row.pinyin,base.pinyin);assert.equal(row.tone,base.tone);assert.notEqual(row.defaultReading.referenceOnly,true);
      assert.equal(row.defaultReading.pinyin,decision.pinyin);assert.equal(row.defaultReading.tone,decision.tone);assert.ok(row.defaultReading.meanings.includes(definition.def));
      assert.equal(line.sourceRowSHA256,decision.sourceRowSHA256);assert.equal(line.originalSourceSHA256,decision.sourceSHA256);assert.equal(line.rawFileSHA256,decision.rawFileSHA256);assert.deepEqual(line.definitionCoordinate,coordinate);assert.equal(line.originalProjectMeaning,decision.projectMeaning);assert.equal(line.documentaryProjectWish,decision.documentaryProjectWish);assert.equal(line.runtimeProjectWish,null);assert.equal(line.newIndependentDecisionId,null);
      if(decision.char!==decision.dictionaryWord){assert.equal(row.glyph.kind,'fixed-unicode-direct-two-way');assert.equal(row.glyph.proof.length,2);for(const proof of row.glyph.proof){const lines=fs.readFileSync(path.join(DEFAULT_SOURCE_ROOT,proof.file),'utf8').split(/\r?\n/u);assert.equal(lines[proof.lineNumberOneBased-1],proof.line);assert.equal(proof.sha256,SOURCE_PINS[proof.file].sha256);}}
    }
  });

  it('preserves37 clear plus two original source-pending and one separate川 migration hold, with three unapproved narrow proposals',()=>{
    assert.deepEqual(actual.lineage.sourceClassification,{general:38,pending:2});assert.deepEqual(actual.lineage.independentDisposition,{semanticClear:37,sourcePending:2,migrationHold:1});
    const rows=actual.publication.rows;assert.equal(rows.filter(row=>row.binding.independentDisposition==='semantic-clear').length,37);assert.deepEqual(rows.filter(row=>row.binding.independentDisposition==='source-pending').map(row=>row.char).sort(),['方','锋'].sort());assert.deepEqual(rows.filter(row=>row.binding.independentDisposition==='migration-hold').map(row=>row.char),['川']);
    assert.equal(rows.find(row=>row.char==='川').binding.sourceClassification,'general');assert.equal(actual.revisionProposals.rows.length,3);
    for(const proposal of actual.revisionProposals.rows){assert.ok(['方','锋','川'].includes(proposal.char));assert.equal(proposal.status,'pending-independent-decision');assert.equal(proposal.decisionId,null);assert.equal(proposal.admissionGranted,false);assert.equal(proposal.generationEligibilityGranted,false);assert.equal(proposal.activation,'off');assert.notEqual(proposal.proposedMeaning,proposal.sourceMeaning);assert.equal(proposal.sourceDefinitionSha256,objectDigest(proposal.sourceDefinition));const record=actual.publication.records.find(row=>row.candidateCaseId===proposal.candidateCaseId);assert.equal(record.decision,'pending');assert.equal(record.newReview.independentDecisionId,null);assert.equal(record.newReview.decisionRequired,true);}
    assert.equal(actual.revisionProposals.admissionGranted,false);
  });

  for(const [label,change]of [
    ['pinyin',row=>{row.identity.pinyin+='-caller';}],
    ['tone',row=>{row.identity.tone=wrongTone(row.identity.tone);}],
    ['coordinate',row=>{row.identity.rawDefinitionIndex++;}],
    ['source identity',row=>{row.identity.sourceId='caller-source';}],
  ])it(`rejects wrong ${label} for each of the forty source-bound records after re-reading actual fixed originals`,()=>{
    for(let index=0;index<40;index++){const publication=mutatePublication(p=>change(p.records[index]));verifyChanged(publication);}
  });

  it('rejects per-row dictionary text, raw coordinates and selected-reading tampering in all forty raw material rows',()=>{
    for(let index=0;index<40;index++){
      const publication=mutatePublication(p=>{const row=p.rows[index];row.source.definition.def+=' CALLER';row.source.rawDefinitionIndex++;row.pinyin+='-caller';row.tone=wrongTone(row.tone);});verifyChanged(publication);
    }
  });

  it('rereads all ten fixed source files and rejects an addressed source substitute even when caller source-lock hashes are recomputed',()=>{
    const originalLock=fs.readFileSync(path.join(packageCopy,'source-lock.json'));
    for(const [file,pin]of Object.entries(SOURCE_PINS)){
      const source=path.join(sourceCopy,file),bytes=fs.readFileSync(source);assert.equal(digest(bytes),pin.sha256);
      try{
        const changed=Buffer.from(bytes);changed[changed.length-1]^=1;fs.writeFileSync(source,changed);
        const lock=json(packageCopy,'source-lock.json');lock.sourcePins[file]={...lock.sourcePins[file],sha256:digest(changed),bytes:changed.length};writeJson(path.join(packageCopy,'source-lock.json'),lock);repackManifest(packageCopy);
        rejectM921(()=>verify({sourceRoot:sourceCopy,packageRoot:packageCopy}),'FIXED_SOURCE_'+file);
      }finally{fs.writeFileSync(source,bytes);fs.writeFileSync(path.join(packageCopy,'source-lock.json'),originalLock);repackManifest(packageCopy);}
    }
    assert.equal(verify({sourceRoot:sourceCopy,packageRoot:packageCopy}).ok,true);
  });

  it('rereads all thirteen pinned decision inputs rather than accepting a resealed caller decision lineage',()=>{
    for(const file of Object.keys(INPUT_PINS)){
      const target=path.join(packageCopy,file),bytes=fs.readFileSync(target);
      try{fs.writeFileSync(target,Buffer.concat([bytes,Buffer.from('\n')]));repackManifest(packageCopy);rejectM921(()=>verify({sourceRoot:sourceCopy,packageRoot:packageCopy}),'FIXED_SOURCE_'+file);}
      finally{fs.writeFileSync(target,bytes);repackManifest(packageCopy);}
    }
  });

  it('rejects source or generation self-authorization after every visible output and manifest hash has been resealed',()=>{
    const publication=structuredClone(actual.publication),record=publication.records[0],row=publication.rows[0];
    record.decision='allow-single-character-generation';record.approvedScope='single-character-project-intent-only';record.sourceIdentityDecision='accepted-for-this-glyph-reading-sense-only';record.grants.eligibilityPolicyApproved=true;record.productionActivation='on';row.activation='on';row.generationAuthority=true;
    record.identity.sourceCaseSha256=objectDigest(row);record.projectSha256=objectDigest(record.project);publication.identity.candidateProfileSha256=objectDigest(publication.rows);publication.identity.policySha256=objectDigest(publication.records);
    writeJson(path.join(packageCopy,'publication.json'),publication);const manifest=repackManifest(packageCopy);assertManifestBytes(packageCopy,manifest);
    try{rejectM921(()=>verify({sourceRoot:sourceCopy,packageRoot:packageCopy}),'PUBLICATION_BYTES');}
    finally{writeJson(path.join(packageCopy,'publication.json'),actual.publication);repackManifest(packageCopy);}
  });

  for(const [label,change]of [
    ['custom theme',p=>{p.themes.push('caller-good-fortune');p.records[0].usage={mode:'explicit-themes',anyOf:['caller-good-fortune']};p.records[0].machineConditions.requiredThemeIds=['caller-good-fortune'];}],
    ['whole-name claim',p=>{p.records[0].grants.wholeNameApproved=true;p.records[0].grants.wholeNameMeaning='全名必定成功';p.records[0].candidateConstraints.namePart='whole-name';}],
    ['runtime wish',p=>{p.records[0].project.projectWish='愿你必定富贵';p.rows[0].project.projectWish='愿你必定富贵';}],
    ['semantic score',p=>{p.records[0].grants.scoreDelta=1;p.records[0].grants.automaticSemanticCreditAllowed=true;}],
    ['production activation',p=>{p.activation='current';p.productionApproved=true;p.rows[0].candidateOnly=false;}],
    ['source rewrite',p=>{p.records[0].sourceFieldMayBeRewritten=true;p.rows[0].source.completeOriginalEntry.title='caller';}],
  ])it(`rejects ${label} escalation in otherwise real converted candidate output`,()=>{verifyChanged(mutatePublication(change));});

  it('keeps actual readonly assessment in all six stages without theme, wish, score or generation authority',()=>{
    const record=actual.publication.records.find(row=>row.decision==='manual-only');assert.ok(record);
    for(const stage of STAGES){const reply=assessReview(sourceOptions,reviewRequest(record,stage));assert.equal(reply.status,'manual-only');assertNoGrant(reply);}
    for(const char of ['方','锋','川']){const held=actual.publication.records.find(row=>row.identity.char===char);assert.ok(held);const reply=assessReview(sourceOptions,reviewRequest(held));assert.equal(reply.status,'pending-independent-decision');assertNoGrant(reply);}
    for(const themeId of THEMES){assertNoGrant(assessReview(sourceOptions,reviewRequest(record,'ai',{themeIds:[themeId]})));}
  });

  it('rejects mismatched readonly request identity, unregistered themes and caller fields that claim wish/whole-name/score/activation',()=>{
    const record=actual.publication.records[0],request=reviewRequest(record);
    for(const changed of [
      {...request,pinyin:request.pinyin+'-caller'}, {...request,tone:wrongTone(request.tone)}, {...request,senseId:request.senseId+':caller'}, {...request,char:'錯'},
      {...request,themeIds:['caller-custom-theme']}, {...request,namePart:'whole-name'}, {...request,requestedGivenNameLength:3},
      {...request,wholeNameMeaning:'全名已经审核'}, {...request,runtimeProjectWish:'愿望变为事实'}, {...request,scoreDelta:100}, {...request,activation:'on'}, {...request,admissionGranted:true}, {...request,verifySource:()=>true},
    ])rejectM921(()=>assessReview(sourceOptions,changed));
  });

  it('does not invoke candidate/config/request accessors or Proxy traps while rejecting them',()=>{
    let calls=0;const publication=mutatePublication(()=>{});Object.defineProperty(publication,'activation',{enumerable:true,get(){calls++;return'not-current';}});rejectM921(()=>verify({...sourceOptions,publication}));
    const proxy=new Proxy(actual.publication,{get(){calls++;throw Error('Proxy must not run');},ownKeys(){calls++;throw Error('Proxy keys must not run');}});rejectM921(()=>verify({...sourceOptions,publication:proxy}));
    const options={...sourceOptions};Object.defineProperty(options,'sourceRoot',{enumerable:true,get(){calls++;return DEFAULT_SOURCE_ROOT;}});rejectM921(()=>verify(options));assert.equal(calls,0);
  });

  it('uses the actual existing pure semantic-v72 consumer for all40 times6 stages and never obtains eligibility or a runtime registration claim',()=>{
    const handle=domain.createNamingSemanticAdmissionHandle(actual.publication);let checks=0;
    for(const row of actual.publication.rows)for(const stage of STAGES){const result=domain.assessNamingSemanticAdmission(handle,row.baselineCharacter,{stage,themeIds:[],requestedGivenNameLength:1,namePart:'given-name'});assert.notEqual(result.status,'eligible');assert.ok(['manual-only','pending-source-identity'].includes(result.status));assert.equal(result.project,null);assert.equal(result.wholeNameMeaning,null);assert.equal(result.scoreDelta,0);assert.equal(result.automaticSemanticCreditAllowed,false);checks++;}
    assert.equal(checks,240);assert.equal(actual.publication.productionApproved,false);assert.equal(actual.publication.activation,'not-current');
  });

  it('the actual pure consumer rejects unknown themes and whole-name or semantic-credit output assertions',()=>{
    const handle=domain.createNamingSemanticAdmissionHandle(actual.publication),row=actual.publication.rows[0];
    const denied=domain.assessNamingSemanticAdmission(handle,row.baselineCharacter,{stage:'ai',themeIds:['caller-theme'],requestedGivenNameLength:1,namePart:'given-name'});assert.equal(denied.status,'rejected-integrity');assert.equal(denied.reasonCode,'unknown-theme');
    assert.throws(()=>domain.assessNamingSemanticAdmission(handle,row.baselineCharacter,{stage:'save',themeIds:[],requestedGivenNameLength:1,namePart:'whole-name'}));
    assert.equal(domain.assertNamingSemanticOutput(null,{scoreDelta:1,wholeNameMeaning:null,generatedText:'逐字',expectedText:'逐字'}).ok,false);assert.equal(domain.assertNamingSemanticOutput(null,{scoreDelta:0,wholeNameMeaning:'全名承诺',generatedText:'全名承诺',expectedText:'逐字'}).ok,false);
  });
});
