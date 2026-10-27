import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';

// Explicit capture only. Tests consume the committed snapshot and never build a
// bundle, create a Store, touch SQL, or make a transport call.
const [bundleFile,assetRoot,output]=process.argv.slice(2);
if(!bundleFile||!assetRoot||!output)throw Error('Pass fixed CJS file, bound asset directory, and new fixture output path.');
if(fs.existsSync(output))throw Error('Existing fixtures are preserved; select a new output path.');
const sha=value=>createHash('sha256').update(value).digest('hex');
const pins=JSON.parse(fs.readFileSync('src/main/bazi-root-feedback-v132-r2-pins.json','utf8'));
const bytes=fs.readFileSync(bundleFile),receipt=JSON.parse(fs.readFileSync(bundleFile+'.receipt.json','utf8'));
assert.equal(sha(bytes),receipt.output.sha256);assert.equal(bytes.length,receipt.output.bytes);
assert.equal(receipt.identity.fullClosureSha256,pins.fullClosureSha256);
assert.equal(receipt.identity.manifestSha256,pins.manifestSha256);
assert.equal(receipt.identity.publicationId,pins.publicationId);
const require=createRequire(import.meta.url),built=require(path.resolve(bundleFile));
const engine=built.createRootFeedbackV132Engine();
const resources=built.loadRootFeedbackV132Resources({assetDir:path.resolve(assetRoot)},engine);
const facade=built.createBaziRootFeedbackV132Facade(engine,resources);
const prior=JSON.parse(fs.readFileSync('tests/fixtures/project-naming-use-m153.json','utf8')).positive.profile;
const uniqueProfile={...prior,id:'m759-r2-display-unique'};
const multipleProfile={...prior,id:'m759-r2-display-multiple',calendar:'solar',birthDate:'1990-12-05',birthTime:'08:00',timeUnknown:false};
const unknownProfile={...uniqueProfile,id:'m759-r2-display-unknown',timeUnknown:true,birthTime:''};
const unique=facade.previewBaziRootFeedbackProfile(uniqueProfile);
const multiple=facade.previewBaziRootFeedbackProfile(multipleProfile);
const unknown=facade.previewBaziRootFeedbackProfile(unknownProfile);
assert.equal(unique.status,'unique-consistent-regime');
assert.equal(multiple.status,'multiple-consistent-regimes');
assert.equal(unknown.status,'pending-regime-resolution');
assert(multiple.branches[0].root.consistentIds.length>1);
const pillars=Object.fromEntries(unique.baseAnalysis.bazi.pillars.map((pillar,index)=>[['year','month','day','hour'][index],{gan:pillar.gan,zhi:pillar.zhi}]));
const failed=engine.project(engine.analyze({id:unique.branches[0].id,provenance:'known-calendar-fixture;explicit-missing-edge-fault',pillars},{},['missing-edge']));
assert.equal(failed.scope,'complete-known-pillars');assert.equal(failed.resolution,'pending-regime-resolution');
assert(failed.pending.some(reason=>reason.includes('invalid-graph')));
const knownPending=structuredClone(unique);knownPending.status=failed.resolution;knownPending.branches[0].root=failed;
const project=dto=>{
 const copy=structuredClone(dto);delete copy.resourceIdentity;delete copy.sources;
 // Opaque engine detail is not rendered. All typed display fields and the real
 // birth/calendar/resource binding are retained; no altered outcome is claimed.
 for(const branch of copy.branches)branch.root.detail=null;
 return copy;
};
const result={
 schema:'m759-display-r2-bound-fixtures/1',
 provenance:{bundleSha256:sha(bytes),receiptSha256:sha(fs.readFileSync(bundleFile+'.receipt.json')),fullClosureSha256:pins.fullClosureSha256,manifestSha256:pins.manifestSha256,facadeSourcesUnchanged:true,serviceOrTransportExecuted:false,sqlExecuted:false,browserExecuted:false,projection:'resourceIdentity/sources shared once; opaque root.detail set to null only'},
 resourceIdentity:unique.resourceIdentity,sources:unique.sources,
 cases:{
  unique:{kind:'actual-fixed-facade-output',profile:uniqueProfile,fullDtoSha256:sha(JSON.stringify(unique)),dto:project(unique)},
  multiple:{kind:'actual-fixed-facade-output',profile:multipleProfile,fullDtoSha256:sha(JSON.stringify(multiple)),dto:project(multiple)},
  unknown:{kind:'actual-fixed-facade-output',profile:unknownProfile,fullDtoSha256:sha(JSON.stringify(unknown)),dto:project(unknown)},
  knownPending:{kind:'explicit-inner-kernel-fault-injection-not-service-output',profile:uniqueProfile,baseFacadeDtoSha256:sha(JSON.stringify(unique)),injection:{disabledEdges:['missing-edge'],calendarFrom:'unique.baseAnalysis.bazi.pillars',rootScope:failed.scope},dto:project(knownPending)},
 },
};
fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
process.stdout.write(JSON.stringify({file:path.resolve(output),bytes:fs.statSync(output).size,sha256:sha(fs.readFileSync(output)),statuses:Object.fromEntries(Object.entries(result.cases).map(([name,value])=>[name,value.dto.status]))})+'\n');
