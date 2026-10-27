import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,cpSync,unlinkSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createManualM970MeaningSelectionDirectory} from '../src/main/m970-manual-meaning-selection-directory.mjs';
import {M970_MANUAL_QUERY_PINS as pins} from '../src/main/m970-manual-meaning-pins.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const dataDir=join(root,'data'),actualPackFile=join(dataDir,'knowledge-v6.sqlite');
const publicationDir=join(dataDir,...pins.publicationDirectory.split('/'));
const evidence=resolve(process.env.M1040_EVIDENCE_DIR??join(root,'.local/m1040-selection-checks'));
const baseline='935c1af017f5715c9589a5ca0f831870b06e3f6c';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const factory=extra=>createManualM970MeaningSelectionDirectory({dataDir,actualPackFile,...extra});
const list=(q,char)=>q.listAvailableMeanings({mode:'manual-request',char});
const select=(q,selectionKey)=>q.selectMeaning({mode:'manual-request',selectionKey});
const expected=[
 ['傲','ào',4,'不屈服的。',false],['革','gé',2,'去毛且經過加工處理的獸皮。',true],
 ['司','sī',1,'掌管。',false],['姿','zī',1,'容貌、態勢。',true],
 ['由','yóu',2,'途徑、方法。',true],['尤','yóu',2,'親近、喜愛。',false],
];
function boundaries(value){
 assert.equal(value.activation,'off');assert.equal(value.candidateOnly,true);
 for(const field of ['productionApproved','admissionGranted','automaticMeaningAllowed','sourceAuthority','generationAuthority','automaticNameRecommendation','automaticSemanticCreditAllowed'])assert.equal(value[field],false,field);
 for(const field of ['scoreDelta','formalCoverageAdded','automaticCoverageAdded'])assert.equal(value[field],0,field);
 assert.equal(value.wholeNameMeaning,null);assert.equal(value.usageStatus,'manual-context-required');
}
function noTechnicalIdentity(value){
 for(const [key,child]of Object.entries(value)){
  assert.ok(!/sha256|senseId|candidateId|activeVersion|packSha|rawEntryIndex|rawHeteronymIndex|rawDefinitionIndex/i.test(key),key);
  if(child&&typeof child==='object')noTechnicalIdentity(child);
 }
}
function publicationFixture(name){
 const fixture=join(evidence,'fixtures',name);mkdirSync(fixture,{recursive:true});
 cpSync(publicationDir,join(fixture,'publication'),{recursive:true});
 return join(fixture,'publication');
}

test('six reviewed literal senses list/select through opaque keys and retain zero automatic authority',()=>{
 const q=factory(),observed=[];
 for(const [char,pinyin,tone,originalMeaning,changeMeaning]of expected){
  const directory=list(q,char);boundaries(directory);assert.equal(directory.status,'available');assert.equal(directory.items.length,1);
  const item=directory.items[0];boundaries(item);noTechnicalIdentity(item);
  assert.deepEqual([item.char,item.pinyin,item.tone,item.originalMeaning,item.changeMeaning],[char,pinyin,tone,originalMeaning,changeMeaning]);
  assert.match(item.selectionKey,/^[A-Za-z0-9_-]{32}$/);assert.equal(item.sourceCitation.dictionaryName,'教育部《重編國語辭典修訂本》');
  assert.equal(item.sourceCitation.sourceId,'moe-revised');assert.equal(item.sourceCitation.license,'CC-BY-ND-3.0-TW');assert.equal(item.sourceCitation.word,char);
  assert.equal(item.manualReason,item.project.manualReason);assert.deepEqual(item.limits,item.project.limits);assert.ok(item.manualReason.length>0&&item.limits.length>0);
  const chosen=select(q,item.selectionKey);boundaries(chosen);assert.equal(chosen.status,'selected');assert.equal(chosen.reason,null);
  const original=chosen.meaningOptions.options[0];assert.equal(chosen.meaningOptions.status,'available');assert.equal(original.char,char);
  assert.equal(item.originalMeaning,original.source.definition.def);assert.deepEqual(item.original.completeOriginalEntry,original.source.completeOriginalEntry);
  assert.deepEqual(item.project,original.project);assert.equal(item.changeMeaning,original.uncertainty.selectedSenseChangedFromPrior);
  assert.equal(original.pack.packSha256,pins.expectedPackSha256);assert.equal(original.publication.manifestSha256,pins.manifest.sha256);
  assert.equal(original.sourceAuthority,false);assert.equal(original.generationAuthority,false);assert.equal(original.automaticMeaningAllowed,false);
  assert.equal(original.admissionGranted,false);assert.equal(original.scoreDelta,0);assert.equal(original.formalCoverageAdded,0);assert.equal(original.automaticCoverageAdded,0);
  assert.ok(Object.isFrozen(directory)&&Object.isFrozen(item)&&Object.isFrozen(item.sourceCitation)&&Object.isFrozen(item.original.completeOriginalEntry)&&Object.isFrozen(chosen.meaningOptions));
  observed.push({char,pinyin,tone,originalMeaning,changeMeaning,manualReason:item.manualReason,limits:item.limits,status:chosen.status,automaticCoverageAdded:0});
 }
 mkdirSync(evidence,{recursive:true});writeFileSync(join(evidence,'six-manual-results.json'),JSON.stringify(observed,null,2)+'\n');
});

test('unknown character and wrong keys never receive the authentication anchor meaning',()=>{
 const q=factory(),unknown=list(q,'曌');boundaries(unknown);assert.equal(unknown.status,'not-covered');assert.deepEqual(unknown.items,[]);
 const wrong=select(q,'not-issued-here');boundaries(wrong);assert.equal(wrong.status,'invalid-selection');assert.equal(wrong.meaningOptions,null);
 assert.throws(()=>select(q,''),/opaque selectionKey/);assert.throws(()=>q.selectMeaning({mode:'manual-request'}),/missing/);
});

test('explicit manual mode only; caller identities, approvals, Proxies and getters rejected',()=>{
 const q=factory(),key=list(q,'革').items[0].selectionKey;
 for(const request of [{char:'革'},{mode:'automatic',char:'革'},{mode:'manual-request',char:'革',senseId:'caller'},{mode:'manual-request',char:'革',packSha256:pins.expectedPackSha256},{mode:'manual-request',char:'革',productionApproved:true},{mode:'manual-request',char:'革',theme:'改革'}])assert.throws(()=>q.listAvailableMeanings(request));
 for(const request of [{selectionKey:key},{mode:'automatic',selectionKey:key},{mode:'manual-request',selectionKey:key,char:'革'},{mode:'manual-request',selectionKey:key,activeVersion:pins.expectedActiveVersion},{mode:'manual-request',selectionKey:key,admissionGranted:true}])assert.throws(()=>q.selectMeaning(request));
 let touched=0;const proxy=new Proxy({mode:'manual-request',char:'革'},{ownKeys(){touched++;throw Error('proxy trap');},getPrototypeOf(){touched++;throw Error('proxy trap');}});
 assert.throws(()=>q.listAvailableMeanings(proxy),/non-Proxy/);assert.equal(touched,0);
 const getter={mode:'manual-request',get char(){touched++;return '革';}};assert.throws(()=>q.listAvailableMeanings(getter),/accessor/);assert.equal(touched,0);
 assert.throws(()=>createManualM970MeaningSelectionDirectory({dataDir}),/missing/);
 assert.throws(()=>createManualM970MeaningSelectionDirectory({dataDir,actualPackFile,approved:true}),/extra/);
 assert.equal(select(q,key).status,'selected');
});

test('keys belong to one factory; relisting a character invalidates only its older key',()=>{
 const first=factory(),second=factory();
 const old=list(first,'革').items[0].selectionKey,other=list(first,'司').items[0].selectionKey;
 assert.equal(select(second,old).status,'invalid-selection');
 const fresh=list(first,'革').items[0].selectionKey;assert.notEqual(fresh,old);
 assert.equal(select(first,old).status,'invalid-selection');assert.equal(select(first,fresh).status,'selected');assert.equal(select(first,other).status,'selected');
});

test('actual active/archive pack is reread; bad/missing pack fails and clears old keys',()=>{
 const fixture=join(evidence,'fixtures','actual-pack');mkdirSync(fixture,{recursive:true});
 const packFile=join(fixture,'actual.sqlite'),bytes=readFileSync(actualPackFile);writeFileSync(packFile,bytes);
 const q=factory({actualPackFile:packFile}),key=list(q,'由').items[0].selectionKey;
 const damaged=Buffer.from(bytes);damaged[damaged.length-1]^=1;writeFileSync(packFile,damaged);
 assert.throws(()=>select(q,key),/actual active\/archive pack changed/);assert.throws(()=>list(q,'由'),/actual active\/archive pack changed/);
 writeFileSync(packFile,bytes);assert.equal(select(q,key).status,'invalid-selection');
 const current=list(q,'由').items[0].selectionKey;assert.equal(select(q,current).status,'selected');
 unlinkSync(packFile);assert.throws(()=>select(q,current),/ENOENT/);writeFileSync(packFile,bytes);assert.equal(select(q,current).status,'invalid-selection');
});

test('changed profile with recomputed neighboring manifest hash cannot issue or preserve a key',()=>{
 const pub=publicationFixture('profile-resigned'),q=factory({publicationDir:pub});
 const key=list(q,'傲').items[0].selectionKey,profilePin=pins.files.find(p=>p.file==='m970/candidate/profile.json');
 const profileFile=join(pub,...profilePin.file.split('/')),manifestFile=join(pub,pins.manifest.file);
 const originalProfile=readFileSync(profileFile),originalManifest=readFileSync(manifestFile),profile=JSON.parse(originalProfile);
 profile.rows[0].project.meaning='unreviewed rewritten meaning';const modified=Buffer.from(JSON.stringify(profile));writeFileSync(profileFile,modified);
 const manifest=originalManifest.toString().replaceAll(profilePin.sha256,sha(modified));assert.notEqual(manifest,originalManifest.toString());writeFileSync(manifestFile,manifest);
 assert.throws(()=>list(q,'傲'),/profile changed/);assert.throws(()=>select(q,key),/profile changed/);
 writeFileSync(profileFile,originalProfile);writeFileSync(manifestFile,originalManifest);assert.equal(select(q,key).status,'invalid-selection');
 assert.equal(select(q,list(q,'傲').items[0].selectionKey).status,'selected');
});

test('missing/corrupt source after first success fails for select and unknown list; no cached fallback',()=>{
 const pub=publicationFixture('source-after-cache'),q=factory({publicationDir:pub});
 const sourceFile=join(pub,'m970/candidate/source-subset.json'),bytes=readFileSync(sourceFile),key=list(q,'姿').items[0].selectionKey;
 unlinkSync(sourceFile);
 assert.throws(()=>select(q,key),/ENOENT/);assert.throws(()=>select(q,'foreign-key'),/ENOENT/);assert.throws(()=>list(q,'曌'),/ENOENT/);
 writeFileSync(sourceFile,bytes);assert.equal(select(q,key).status,'invalid-selection');
 const current=list(q,'姿').items[0].selectionKey;writeFileSync(sourceFile,Buffer.concat([bytes,Buffer.from('\n')]));
 assert.throws(()=>select(q,current),/source-subset|changed|hash|mismatch|byte/i);writeFileSync(sourceFile,bytes);assert.equal(select(q,current).status,'invalid-selection');
 const absentData=join(evidence,'fixtures','absent-data');mkdirSync(absentData,{recursive:true});
 const badSource=factory({dataDir:absentData,publicationDir:pub});assert.throws(()=>list(badSource,'尤'),/ENOENT/);
});

test('changed publication version rejects old key even after neighboring data hashes are retained',()=>{
 const pub=publicationFixture('version'),q=factory({publicationDir:pub}),key=list(q,'尤').items[0].selectionKey;
 const file=join(pub,pins.manifest.file),bytes=readFileSync(file),changed=bytes.toString().replaceAll(pins.publicationVersion,'manual-m970-query/9.9.9');
 assert.notEqual(changed,bytes.toString());writeFileSync(file,changed);assert.throws(()=>select(q,key),/manifest|changed|mismatch|byte/i);
 writeFileSync(file,bytes);assert.equal(select(q,key).status,'invalid-selection');
});

test('original 935 tracked adapter, pins, resources and integration files have zero modifications',()=>{
 const modifications=execFileSync('git',['diff','--name-status','--diff-filter=CDMRTUXB',baseline,'--'],{cwd:root,encoding:'utf8'});
 assert.equal(modifications.trim(),'');
 assert.equal(sha(readFileSync(join(publicationDir,pins.manifest.file))),pins.manifest.sha256);
 const protectedPaths=['src/main/m970-manual-character-meaning-query.mjs','src/main/m970-manual-character-meaning-query.d.mts','src/main/m970-manual-meaning-pins.mjs','src/main/m970-manual-meaning-coverage.mjs','data/manual-meaning-m970/1.0.0'];
 assert.equal(execFileSync('git',['diff',baseline,'--',...protectedPaths],{cwd:root,encoding:'utf8'}),'');
 writeFileSync(join(evidence,'protected-baseline.json'),JSON.stringify({baseline,modifiedOriginalFiles:[],publicationSha256:pins.manifest.sha256,sourceCommit:pins.sourceCommit},null,2)+'\n');
});
