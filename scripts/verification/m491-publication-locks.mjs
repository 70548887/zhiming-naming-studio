import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {isDeepStrictEqual as same} from 'node:util';
import {TRUSTED,PUBLICATION_RUNTIME_POLICY} from './m491-publication-trusted.mjs';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const policy=PUBLICATION_RUNTIME_POLICY;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const safeRel=v=>typeof v==='string'&&v.length>0&&!v.includes('\\')&&!v.includes(':')&&!v.startsWith('/')&&v.split('/').every(x=>x&&x!=='.'&&x!=='..'&&!['__proto__','prototype','constructor'].includes(x));
const rootPath=(roots,key,rel)=>{if(!plain(roots)||typeof roots[key]!=='string'||!safeRel(rel))throw Error('Portable publication root or relative path invalid: '+key+'/'+rel);const root=path.resolve(roots[key]),file=path.resolve(root,rel);if(file!==root&&!file.startsWith(root+path.sep))throw Error('Portable publication path escapes root: '+rel);return file;};
function readFresh(file){
 file=path.resolve(file);let current=path.parse(file).root;
 for(const part of file.slice(current.length).split(path.sep).filter(Boolean)){current=path.join(current,part);if(fs.lstatSync(current).isSymbolicLink())throw Error('Linked publication input rejected');}
 const fd=fs.openSync(file,'r');let before,after,bytes;
 try{before=fs.fstatSync(fd,{bigint:true});if(!before.isFile())throw Error('Ordinary publication input required');bytes=fs.readFileSync(fd);after=fs.fstatSync(fd,{bigint:true});}finally{fs.closeSync(fd);}
 const now=fs.statSync(file,{bigint:true});
 if(before.dev!==after.dev||before.ino!==after.ino||before.size!==after.size||before.mtimeNs!==after.mtimeNs||before.ctimeNs!==after.ctimeNs||after.dev!==now.dev||after.ino!==now.ino||after.size!==now.size||after.mtimeNs!==now.mtimeNs||after.ctimeNs!==now.ctimeNs||BigInt(bytes.length)!==now.size)throw Error('Publication input changed during fresh read');
 return bytes;
}
function managed(ref){
 if(!safeRel(ref.file))throw Error('Unsafe managed publication path');const bytes=readFresh(path.join(projectRoot,...ref.file.split('/')));
 if(bytes.length!==ref.bytes||sha(bytes)!==ref.sha256)throw Error('Managed publication input bytes/SHA differ: '+ref.file);
 return bytes;
}
function version(actual,expected){return actual.bytes===expected.bytes&&actual.sha256===expected.sha256;}
function runtimeReaderVersion(){
 const bytes=readFresh(path.join(projectRoot,...policy.readerFile.split('/'))),actual={file:policy.readerFile,sha256:sha(bytes),bytes:bytes.length};
 if(version(actual,policy.old))return{status:'verbatim',actual,baseline:{...policy.old},scope:'historical-reader-identity;no-publication-activation'};
 if(!version(actual,policy.current))throw Error('Actual current project runtime reader has unknown bytes/SHA');
 // Fixed raw review records are re-read on every migrated invocation. Their
 // embedded workstation paths are historical prose and are never followed.
 const receipt=JSON.parse(managed(policy.receipt)),review=JSON.parse(managed(policy.review));
 if(receipt.schema!=='M541-runtime-reader-migration-receipt/1'||receipt.decision!=='APPROVED-EXACT-RUNTIME-READER-MIGRATION-SOURCE-ONLY'||receipt.old?.path!==policy.readerFile||receipt.new?.path!==policy.readerFile||!version(receipt.old,policy.old)||!version(receipt.new,policy.current)||receipt.sourceReview?.sha256!==policy.review.sha256||review.schema!=='M518-M506-m393-cache-independent-source-review/1'||review.decision!==receipt.sourceReview.decision||review.pins?.before?.matches!==true||review.pins?.after?.matches!==true||!version(review.pins.before,policy.old)||!version(review.pins.after,policy.current)||review.pins.patch.sha256!==receipt.sourceReview.patchSha256||receipt.requiredChecks?.candidateOnlyScopePreserved!==true||receipt.requiredChecks?.noWholeNameScoreOrRankingGrant!==true||receipt.requiredChecks?.noM476Raw44Mutation!==true||receipt.requiredChecks?.noM476SourceReceiptMutation!==true||receipt.requiredChecks?.oldPublicationBaselineRepinStillPending!==true)throw Error('Fixed M541/M518 exact migration closure differs');
 return{status:'migrated',actual,baseline:{...policy.old},receipt:{...policy.receipt},sourceReview:{...policy.review},scope:'exact-runtime-reader-source-only;publication-baseline-unchanged;no-publication-activation'};
}

/** Normal verification consumes canonical checkout files and its actual src
 * reader. Optional legacy inventory arguments can only match those fixed
 * inputs; they never select an approval, another project or another reader. */
export function verifyPublicationInventory(options={}){
 const errors=[],seen=new Map();let inventory,roots,runtimeReader={status:'rejected'};
 if(!plain(options)||Object.keys(options).some(key=>!['inventory','roots','baseline'].includes(key)))return{status:'failed',errors:[{check:'unmanaged-publication-options'}]};
 try{
  inventory=JSON.parse(managed(policy.inventory));const declaredRoots=JSON.parse(managed(policy.roots));
  if(!same(Object.keys(declaredRoots).sort(),['m393','m476']))throw Error('Exact portable publication roots required');
  roots=Object.fromEntries(Object.entries(declaredRoots).map(([key,rel])=>{if(!safeRel(rel))throw Error('Managed publication root must be project-relative');return[key,path.join(projectRoot,...rel.split('/'))];}));
 }catch(error){return{status:'failed',errors:[{check:'managed-publication-input',message:error.message}],runtimeReaderVersion:runtimeReader};}
 if(options.inventory!==undefined&&!same(options.inventory,inventory))errors.push({check:'fixed-publication-inventory'});
 if(options.baseline!==undefined&&!same(options.baseline,inventory))errors.push({check:'fixed-publication-baseline'});
 if(options.roots!==undefined&&(!plain(options.roots)||!same(Object.keys(options.roots).sort(),['m393','m476'])||Object.entries(roots).some(([key,value])=>typeof options.roots[key]!=='string'||path.resolve(options.roots[key])!==value)))errors.push({check:'unmanaged-publication-roots'});
 // Keep legacy structural diagnostics for callers, but canonical fixed bytes
 // remain authoritative and every managed original is still read below.
 const proposed=options.inventory??inventory;
 if(!plain(proposed)||proposed.schema!=='M491-portable-publication-locks/1')errors.push({check:'schema'});
 const publications=Array.isArray(proposed?.publications)?proposed.publications:[];
 const expectedIds=TRUSTED.publications.map(p=>p.publicationId).sort(),actualIds=publications.map(p=>p?.publicationId).sort();
 if(!same(actualIds,expectedIds))errors.push({check:'required-publication-set',expected:expectedIds,actual:actualIds});
 if(publications.length!==TRUSTED.publications.length)errors.push({check:'required-publication-count'});
 if(!proposed?.reviewedCandidateExtensions||proposed.reviewedCandidateExtensions.currentObserved?.status!=='external-observed-not-approved-by-D06')errors.push({check:'reviewedCandidateExtensions-consumption'});
 for(const pub of publications){
  if(!plain(pub)){errors.push({check:'identity'});continue;}
  const ids=seen.get(pub.sourceId)??[];if(pub.sourceId)ids.push(pub.publicationId);if(pub.sourceId)seen.set(pub.sourceId,ids);
  const trusted=TRUSTED.publications.find(p=>p.publicationId===pub.publicationId);if(!trusted)continue;
  const rows=Array.isArray(pub.files)?pub.files:[],files=rows.map(f=>f?.relativePath).sort();if(!same(files,trusted.requiredFiles))errors.push({check:'required-file-set',publication:pub.publicationId});
  if(rows.length!==trusted.requiredFileCount)errors.push({check:'required-file-count',publication:pub.publicationId});
  if(pub.sourceId!==trusted.sourceId||pub.sourceSha256!==trusted.sourceSha256||pub.ruleVersion!==trusted.ruleVersion||pub.rows!==trusted.rows||pub.scope!==trusted.scope)errors.push({check:'trusted-publication-identity',publication:pub.publicationId});
  if(!same([...new Set(rows.flatMap(f=>f?.licenseRefs??[]))].sort(),trusted.licenseRefs))errors.push({check:'trusted-license-set',publication:pub.publicationId});
  if(!pub.sourceId||!pub.publicationId||!pub.scope)errors.push({check:'identity',publication:pub.publicationId});
  if(pub.automaticNameRecommendation!==false||pub.automaticSemanticCreditAllowed!==false||pub.scoreDelta!==0||pub.rankingDelta!==0)errors.push({check:'automatic-credit',publication:pub.publicationId});
  if(pub.dependencyClass==='candidate-only'&&(pub.activation!=='off'||pub.decision!=='candidate-awaiting-independent-review'))errors.push({check:'candidate-activation',publication:pub.publicationId});
  for(const row of rows){if(!plain(row)){errors.push({check:'identity'});continue;}if(!safeRel(row.relativePath)||!['m476','m393'].includes(row.rootKey))errors.push({check:'portable-path',file:row.relativePath});if(!/^[a-f0-9]{64}$/.test(row.sha256)||!Number.isSafeInteger(row.bytes)||row.bytes<=0)errors.push({check:'identity',file:row.relativePath});if(!Array.isArray(row.licenseRefs)||!row.licenseRefs.length)errors.push({check:'license',file:row.relativePath});if(!['original-material-complete','project-character-candidate-only','candidate-only'].includes(row.dependencyClass))errors.push({check:'dependency-class',file:row.relativePath});}
 }
 // Freshly verify the full unchanged canonical44+10, even when a caller sent
 // a subset or forged metadata. No runtime migration substitutes these bytes.
 let checkedFiles=0;for(const pub of inventory.publications)for(const row of pub.files){try{const bytes=readFresh(rootPath(roots,row.rootKey,row.relativePath));checkedFiles++;if(bytes.length!==row.bytes||sha(bytes)!==row.sha256)errors.push({check:'hash-or-bytes',file:row.relativePath});}catch(error){errors.push({check:'missing-file',file:row.relativePath,message:error.message});}}
 for(const ref of policy.licenseEvidence){try{managed(ref);}catch(error){errors.push({check:'license-evidence',file:ref.file,message:error.message});}}
 for(const [sourceId,ids]of seen){const trustedAllowed=TRUSTED.duplicatePolicy[sourceId],callerAllowed=proposed.duplicatePolicy?.allowedPairs?.find(x=>x.sourceId===sourceId);if(!trustedAllowed||ids.some(id=>!trustedAllowed.includes(id))||new Set(ids).size!==ids.length)errors.push({check:'trusted-duplicate-source-publication',sourceId,publications:ids});if(!callerAllowed||ids.some(id=>!callerAllowed.publicationIds.includes(id)))errors.push({check:'duplicate-source-publication',sourceId,publications:ids});}
 try{runtimeReader=runtimeReaderVersion();}catch(error){errors.push({check:'runtime-reader-version',file:policy.readerFile,message:error.message});}
 return{status:errors.length?'failed':'passed',errors,summary:{publications:inventory.publications.length,files:inventory.publications.reduce((n,p)=>n+p.files.length,0),freshFilesChecked:checkedFiles,licenseEvidenceChecked:policy.licenseEvidence.length,sourceIds:[...seen.keys()]},runtimeReaderVersion:runtimeReader,scope:'Fresh unchanged publication originals and exact actual checkout runtime reader migration only; not activation, performance, outer admission or release.'};
}
if(import.meta.url===pathToFileURL(path.resolve(process.argv[1]??'')).href){try{
 const args=process.argv.slice(2);if(args.length!==2||args[0]!=='--output'||!args[1])throw Error('Use --output <new-report.json>; publication/roots/review inputs are fixed managed checkout files.');
 const report=verifyPublicationInventory(),out=path.resolve(args[1]);if(fs.existsSync(out)||fs.existsSync(out+'.pending'))throw Error('Preserve existing publication report');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out+'.pending',JSON.stringify(report,null,2)+'\n',{flag:'wx'});fs.renameSync(out+'.pending',out);console.log(JSON.stringify({status:report.status,summary:report.summary,runtimeReaderVersion:report.runtimeReaderVersion,errors:report.errors,report:out}));if(report.status!=='passed')process.exitCode=1;
 }catch(error){console.error(error.message);process.exitCode=1;}}
