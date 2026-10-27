import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SOURCE='D:/Codex-NamingStudio-Evidence/m970-data-dedup-fix';
const REVIEW='D:/Codex-NamingStudio-Evidence/m976-data-dedup-audit';
const COMMIT='dd54e0be89f4d8c71b65369c2b337e3410a61b7e';
const PACKAGE='data/manual-meaning-m970/1.0.0';
const hash=v=>createHash('sha256').update(v).digest('hex');
const need=(ok,m)=>{if(!ok)throw Error('M1024 build: '+m);};
const write=(relative,b)=>{const output=path.resolve(ROOT,relative);need(output.startsWith(ROOT+path.sep),'output escaped own worktree');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output+'.tmp',b);fs.renameSync(output+'.tmp',output);};
const pins=[],sourcePins=[];
function copyCommitted(file,target='m970/'+file){const bytes=fs.readFileSync(path.join(SOURCE,file)),committed=execFileSync('git',['show',COMMIT+':'+file],{cwd:SOURCE,maxBuffer:12*1024*1024});need(bytes.equals(committed),'original commit/file differs '+file);write(PACKAGE+'/'+target,bytes);pins.push({file:target,bytes:bytes.length,sha256:hash(bytes)});sourcePins.push({file:path.join(SOURCE,file),bytes:bytes.length,sha256:hash(bytes),commit:COMMIT});return bytes;}
const originalManifest=JSON.parse(copyCommitted('candidate/manifest.json'));
copyCommitted('M970-MANIFEST.json');copyCommitted('dedup.mjs');copyCommitted('inputs/m959-selection-original.json');
for(const pin of originalManifest.files){const bytes=copyCommitted(pin.file);need(bytes.length===pin.bytes&&hash(bytes)===pin.sha256,'fixed candidate file identity '+pin.file);}
const inputConfig=JSON.parse(fs.readFileSync(path.join(SOURCE,'inputs.json')));
const reservationDescriptors=[];
for(const d of inputConfig.reservationDescriptors){copyCommitted(d.inputCopy);reservationDescriptors.push({label:d.label,file:d.file,field:d.field,inputCopy:d.inputCopy,sha256:d.sha256});}
const reviewPins=[];for(const file of ['M976-REVIEW.json','six-character-review.json','receipt.json']){const bytes=fs.readFileSync(path.join(REVIEW,file));write(PACKAGE+'/review/'+file,bytes);const pin={file:'review/'+file,bytes:bytes.length,sha256:hash(bytes)};pins.push(pin);sourcePins.push({file:path.join(REVIEW,file),bytes:bytes.length,sha256:hash(bytes)});reviewPins.push(pin);}
const reviewReceipt=JSON.parse(fs.readFileSync(path.join(REVIEW,'receipt.json')));
need(reviewReceipt.head===COMMIT&&reviewReceipt.result==='dedup-repair-accepted-six-literal-references-verified-manual-only'&&reviewReceipt.formalCoverageAdded===0,'review is not exact dd54 manual-only');
need(reviewPins.find(p=>p.file==='review/M976-REVIEW.json').sha256===reviewReceipt.reviewSha256,'review receipt digest differs');
const basePins=[];
for(const relative of ['dataset-v6.json','knowledge-v6.sqlite','naming-editorial-v4.json','naming-editorial-v5.json','naming-editorial-v6.json','naming-editorial-v7.json','naming-character-meanings-v71-m460-b02-profile.json','naming-semantic-m923/admission-records.json','raw/moe-revised.json.gz','raw/moe-README.md','raw/CC-BY-ND-3.0-TW.html']){const bytes=fs.readFileSync(path.join(ROOT,'data',relative));basePins.push({file:relative,bytes:bytes.length,sha256:hash(bytes)});}
need(basePins.find(p=>p.file==='knowledge-v6.sqlite').sha256==='1875aa49dcfaeca0f266a3be7578e4d4b2a9b2c9c1f59fd79699a3e26d5d6b8b','actual fixed pack changed');
// Preserve the reviewed derivation code byte-for-byte; it is independently hash-bound in the package.
write('src/main/m970-manual-meaning-coverage.mjs',fs.readFileSync(path.join(SOURCE,'dedup.mjs')));
const manifest={schema:'m1024-manual-meaning-publication/1',publicationVersion:'manual-m970-query/1.0.0',sourceBatch:'M970-DATA',sourceCommit:COMMIT,sourceManifestSha256:hash(fs.readFileSync(path.join(SOURCE,'M970-MANIFEST.json'))),candidateManifestSha256:hash(fs.readFileSync(path.join(SOURCE,'candidate/manifest.json'))),sourceReviewSha256:reviewReceipt.reviewSha256,reviewScope:'source-and-literal-meaning-verified; manual-context-required; no individual adoption',expectedChars:'傲革司姿由尤',requestMode:'manual-request',scope:'on-request-supplement-only',usageStatus:'manual-context-required',individualAdmission:'not-granted',candidateOnly:true,activation:'off',productionApproved:false,automaticMeaningAllowed:false,formalCoverageAdded:0,automaticCoverageAdded:0,wholeNameMeaning:null,automaticNameRecommendation:false,automaticSemanticCreditAllowed:false,scoreDelta:0,reservationDescriptors,sourceFiles:basePins,files:pins.sort((a,b)=>a.file.localeCompare(b.file))};
write(PACKAGE+'/publication-manifest.json',JSON.stringify(manifest,null,2)+'\n');
write('src/main/m970-manual-meaning-pins.mjs','// Fixed reviewed literal references, not automatic/name/generation admission.\nexport const M970_MANUAL_QUERY_PINS='+JSON.stringify({publicationVersion:manifest.publicationVersion,publicationDirectory:'manual-meaning-m970/1.0.0',manifest:{file:'publication-manifest.json',bytes:fs.statSync(path.join(ROOT,PACKAGE,'publication-manifest.json')).size,sha256:hash(fs.readFileSync(path.join(ROOT,PACKAGE,'publication-manifest.json')))},sourceCommit:COMMIT,files:manifest.files,sourceFiles:basePins,reservationDescriptors,expectedChars:manifest.expectedChars,expectedPackSha256:'1875aa49dcfaeca0f266a3be7578e4d4b2a9b2c9c1f59fd79699a3e26d5d6b8b',expectedActiveVersion:'1875aa49dcfa'},null,2)+';\n');
write('.local/m1024/publication-build.json',JSON.stringify({task:'M1024',baseline:'c86600dcb9f51e02aeffa48ec74922fe983d6121',sourceCommit:COMMIT,sourcePins,publicationManifestSha256:hash(fs.readFileSync(path.join(ROOT,PACKAGE,'publication-manifest.json'))),packageFiles:pins.length,rawCopied:false,productionRegistration:false},null,2)+'\n');
console.log(JSON.stringify({task:'M1024',packageFiles:pins.length,actualPackSha256:basePins.find(p=>p.file==='knowledge-v6.sqlite').sha256,sourceCommit:COMMIT,review:manifest.sourceReviewSha256,publication:PACKAGE,automaticCoverageAdded:0}));
