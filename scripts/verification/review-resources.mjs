import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {finish,isMain,json,packageMatcher,relativeFile,safeInput,safeRoot,sha256} from './common.mjs';
import {verifyCmnWorkerRuntime} from './cmn-worker-build-receipt.mjs';
import {loadRaw138SourceProfile,RAW138_SOURCE_PROFILE_ID,RAW138_SOURCE_PROFILE_FILE,RAW138_SOURCE_PROFILE_SHA256} from './source-profile-138.mjs';
import {verifyManagedSourceExtensions} from './outer-source-admission-138.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const contracts=new Map(['36','37','38'].map(v=>['1.0.'+v,json(path.join(here,'review-resources-1'+v+'.json'))]));
const baseCounts={elements:22,phonetic:13,word:13,'meaning-v1':12,modern:1,'yue-reading-dependency':14};
const cmnFiles=['data/dataset-v6.json','data/raw/moe-revised.json.gz','data/raw/kTraditionalVariant.txt','data/raw/kSimplifiedVariant.txt','data/raw/moe-README.md','data/raw/CC-BY-ND-3.0-TW.html','data/raw/unicode-LICENSE','data/source-lock.json'].sort();
for(const [version,c]of contracts){
 const counts=version==='1.0.36'?baseCounts:version==='1.0.37'?{...baseCounts,'meaning-v1.1':18,'cmn-reading':8}:{...baseCounts,'meaning-v1.1':18,'cmn-reading':8,'naming-character-meanings-v7.1':6,'bazi-root-feedback-1.3.1':40,'parent-name-phonetics-method':1,'naming-original-dependencies':16};
 const union=[...new Set(Object.values(c.groups).flat())].sort();
 if(c.profile!=='naming-review-resources/'+version||c.applicationVersion!==version||Object.keys(c.groups).length!==Object.keys(counts).length||Object.entries(counts).some(([id,n])=>c.groups[id]?.length!==n)||!isDeepStrictEqual(union,Object.keys(c.files).sort()))throw Error('Reviewed resource contract is unknown or incomplete: '+version);
 const legacy=contracts.get('1.0.36');
 if(version==='1.0.36'&&union.length!==67)throw Error('Original136resourceidentitychanged');
 if(version==='1.0.37'){
  for(const id of Object.keys(baseCounts))if(!isDeepStrictEqual(c.groups[id],legacy.groups[id]))throw Error('Legacy resource group changed: '+id);
  for(const [file,r]of Object.entries(legacy.files))if(c.files[file]?.sha256!==r.sha256||c.files[file]?.bytes!==r.bytes)throw Error('Legacy resource identity changed: '+file);
  if(!isDeepStrictEqual([...c.groups['meaning-v1.1']].sort(),[...legacy.groups['meaning-v1'],...legacy.excludedNextBatch].sort())||!isDeepStrictEqual([...c.groups['cmn-reading']].sort(),cmnFiles)||c.excludedNextBatch.length!==0)throw Error('Reviewed137 resource membership differs');
  const readers=new Map(c.sourceReaders.map(r=>[r.file,r.sha256]));
  if(readers.get('src/main/meaning-context-data.ts')!=='aa2a38805e37a33de28301a17c3040ef20a12c542cb045b2867227be935c401c'||readers.get('src/main/store.ts')!=='9740bff328c7d6af1d06ee10b0bb39329ccf9333385d505416b5cfa37e5bebf6')throw Error('Versioned meaning loader/Store source registry identity differs');
 }
  if(version==='1.0.38'){
   const prior=contracts.get('1.0.37');
   for(const [id,files]of Object.entries(prior.groups))if(!isDeepStrictEqual(c.groups[id],files))throw Error('Original137 resource group changed in138: '+id);
   for(const [file,record]of Object.entries(prior.files))if(!isDeepStrictEqual(c.files[file],record))throw Error('Original137 resource identity changed in138: '+file);
   const added=['data/raw/naming-character-meanings-v7.1-subset.json','data/naming-character-meanings-v7.1-profile.json','data/naming-character-meanings-v7.1-admission.json','data/naming-character-meanings-v7.1-NOTICE.md','data/naming-character-meanings-v7.1-source-lock.json','data/naming-character-meanings-v7.1-manifest.json'].sort();
   if(union.length!==137||!isDeepStrictEqual(c.groups['naming-character-meanings-v7.1'],added)||c.excludedNextBatch.length!==0)throw Error('Reviewed138 exact resource membership differs');
   const originalDependencies=["data/knowledge-v6.sqlite","data/naming-editorial-dictionary-v6-source-lock.json","data/naming-editorial-meanings-v7-source-lock.json","data/naming-editorial-v4.json","data/naming-editorial-v5.json","data/naming-editorial-v6.json","data/naming-editorial-v7-NOTICE.md","data/naming-editorial.json","data/raw/naming-citations-v7-errata-r2.json","data/raw/naming-citations-v7-review.json","data/raw/naming-meanings-v7-errata-r1.json","data/raw/naming-meanings-v7-review.json","data/raw/poetry-LICENSE","data/raw/shijing.json","data/raw/zhouyi-LICENSE","data/raw/zhouyi.tar.gz"];if(!isDeepStrictEqual(c.groups['naming-original-dependencies'],originalDependencies))throw Error('Reviewed138 naming original dependency membership differs');
   const publication=c.rootFeedbackPublication,rootBase='assets/bazi-root-feedback/1.3.1/';
   if(publication?.manifestFile!==rootBase+'resource-manifest.json'||publication.manifestSha256!=='ae57f3456aa4303f2200419dae31fbac52b897ffba03354537bf3ffb6568b323'||publication.fileCount!==39||c.groups['bazi-root-feedback-1.3.1'].some(file=>!file.startsWith(rootBase))||!isDeepStrictEqual(c.groups['parent-name-phonetics-method'],['data/parent-name-phonetics-method-v1.json']))throw Error('Reviewed138 root/parent resource identity differs');
   if(c.sourceReaders.some(row=>!/^([a-f0-9]{64})$/.test(row.sha256)||row.sha256==='0'.repeat(64)))throw Error('Reviewed138 integrated source-reader pins are pending or invalid');
  }
}

/** Read real payload bytes, reuse reviewed locks and the existing data-module gates.
 * packageFile is explicit build metadata; payloadRoot can point at an extracted app/ folder.
 * No archive extraction, network fetch, fallback data or product write occurs here.
 */
export async function verifyReviewResources({root=process.cwd(),payloadRoot=root,packageFile=path.join(root,'package.json'),stage,expectedWorkerReceiptSha256,sourceProfile}={}){
 root=safeRoot(root);payloadRoot=safeRoot(payloadRoot);packageFile=safeInput(root,path.resolve(packageFile),{allowExternal:true});
 const errors=[],resources=[],readers=[],loaderChecks=[],buffers=new Map();
 const fail=(check,extra)=>errors.push({check,...extra});
 let pkg,matcher,contract;
 try{pkg=json(packageFile);contract=contracts.get(pkg.version);if(!contract)fail('unsupported-application-version',{expected:[...contracts.keys()],actual:pkg.version??null});else matcher=packageMatcher(pkg.build?.files);}catch(error){fail('package-declaration',{file:packageFile,message:error.message});}
  if(contract?.applicationVersion==='1.0.38'&&!['source-prebuild','runtime-payload'].includes(stage))return {schema:'current-review-resource-verification/1',status:'failed',profile:contract.profile,root,payloadRoot,packageFile,stage:stage??null,scope:'1.0.38 requires an explicit supported verification stage.',summary:{requiredFiles:0,filesIntegrityPassed:0,packageCovered:0,actualLoaderGatesPassed:0},resources,sourceReaders:readers,loaderChecks,errors:[...errors,{check:'unsupported-verification-stage',expected:['source-prebuild','runtime-payload'],actual:stage??null}],pending:[],writes:0,networkRequests:0};
 if(!contract)return {schema:'current-review-resource-verification/1',status:'failed',profile:null,root,payloadRoot,packageFile,scope:'Unsupported or unreadable application metadata; no runtime loader gate was claimed.',summary:{requiredFiles:0,filesIntegrityPassed:0,packageCovered:0,actualLoaderGatesPassed:0},resources,sourceReaders:readers,loaderChecks,errors,pending:[],writes:0,networkRequests:0};
 let sourceProfileSelection=null,sourceReaderRows=contract.sourceReaders,sourceExtensionSelection=null;
 if(contract.applicationVersion==='1.0.38'){
  // The append-only source layer is separate from the immutable137 contract.
  // Check its actual payload bytes before attempting a production admission.
  try{
   sourceExtensionSelection=verifyManagedSourceExtensions({root});
   for(const expected of sourceExtensionSelection.resources){
    const result={file:expected.file,modules:[expected.group],scope:'source-compatibility-only;no-activation-or-business-authority',expectedSha256:expected.sha256,expectedBytes:expected.bytes,packageCovered:matcher?matcher(expected.file):false};
    try{const bytes=fs.readFileSync(relativeFile(payloadRoot,expected.file));buffers.set(expected.file,bytes);result.bytes=bytes.length;result.sha256=sha256(bytes);result.integrity=bytes.length===expected.bytes&&result.sha256===expected.sha256?'passed':'failed';if(result.integrity!=='passed')fail('extension-resource-identity',{file:expected.file,expectedSha256:expected.sha256,expectedBytes:expected.bytes,actualSha256:result.sha256,actualBytes:bytes.length});}
    catch(error){result.integrity='failed';fail('extension-resource-read',{file:expected.file,message:error.message});}
    if(!result.packageCovered)fail('extension-resource-not-packaged',{file:expected.file});resources.push(result);
   }
   if(errors.length)throw new Error('Managed extension payload bytes or package projection differ.');
  }catch(error){return{schema:'current-review-resource-verification/1',status:'failed',profile:contract.profile,sourceExtensions:{status:'not-matched',productionApproved:false},root,payloadRoot,packageFile,stage,scope:'Managed extension source/payload prefix only; production admission and historical resource gates were not run.',summary:{requiredFiles:resources.length,historicalRequiredFiles:Object.keys(contract.files).length,filesIntegrityPassed:resources.filter(row=>row.integrity==='passed').length,packageCovered:resources.filter(row=>row.packageCovered).length,actualLoaderGatesPassed:0},resources,sourceReaders:readers,loaderChecks,errors:[...errors,{check:'raw138-source-extensions',message:error.message}],pending:[],writes:0,networkRequests:0};}
  try{
   if(sourceProfile!==undefined&&sourceProfile!==RAW138_SOURCE_PROFILE_ID)throw Error('Unknown raw138 source profile; no original-reader fallback is allowed.');
   const selected=loadRaw138SourceProfile({root,file:path.join(here,RAW138_SOURCE_PROFILE_FILE),sha256:RAW138_SOURCE_PROFILE_SHA256,requireReady:true,verifySources:stage==='source-prebuild'});
   sourceReaderRows=selected.sourceReaders;sourceProfileSelection={profileId:selected.profile.profileId,ref:selected.ref,outerAdmission:selected.outerAdmission,status:'fixed-source-roles-selected',compiledReaderChecked:false,runtimeAccepted:false};
  }catch(error){return {schema:'current-review-resource-verification/1',status:'failed',profile:contract.profile,sourceProfile:{profileId:sourceProfile??RAW138_SOURCE_PROFILE_ID,status:'not-admitted'},sourceExtensions:{status:sourceExtensionSelection.status,profileRef:sourceExtensionSelection.profileRef,productionApproved:false},root,payloadRoot,packageFile,stage,scope:'Raw138 source-profile admission must precede source build or payload verification; matched extension bytes are source compatibility only.',summary:{requiredFiles:Object.keys(contract.files).length+sourceExtensionSelection.resources.length,historicalRequiredFiles:Object.keys(contract.files).length,extensionResourceFiles:sourceExtensionSelection.resources.length,filesIntegrityPassed:resources.filter(row=>row.integrity==='passed').length,packageCovered:resources.filter(row=>row.packageCovered).length,actualLoaderGatesPassed:0},resources,sourceReaders:readers,loaderChecks,errors:[...errors,{check:error.code??'raw138-source-profile',message:error.message}],pending:[],writes:0,networkRequests:0};}
 }else if(sourceProfile!==undefined)fail('unsupported-source-profile',{applicationVersion:contract.applicationVersion,sourceProfile});
 const read=file=>{if(buffers.has(file))return buffers.get(file);const bytes=fs.readFileSync(relativeFile(payloadRoot,file));buffers.set(file,bytes);return bytes;};
 for(const [file,expected]of Object.entries(contract.files)){
  const result={file,modules:expected.modules,expectedSha256:expected.sha256,expectedBytes:expected.bytes,packageCovered:matcher?matcher(file):false};
  try{const bytes=read(file);result.bytes=bytes.length;result.sha256=sha256(bytes);result.integrity=bytes.length===expected.bytes&&result.sha256===expected.sha256?'passed':'failed';if(result.sha256!==expected.sha256)fail('resource-hash',{file,expected:expected.sha256,actual:result.sha256});if(bytes.length!==expected.bytes)fail('resource-bytes',{file,expected:expected.bytes,actual:bytes.length});}
  catch(error){result.integrity='failed';fail(error.code==='ENOENT'?'missing-resource':'resource-read',{file,message:error.message});}
  if(!result.packageCovered)fail('package-runtime-not-covered',{file,modules:expected.modules});resources.push(result);
 }
 const parse=file=>JSON.parse(read(file).toString('utf8').replace(/^\uFEFF/,''));
 const schema=(ok,module,expected,actual)=>{if(!ok)fail('resource-version-or-schema',{module,expected,actual});};
 try{
  const element=parse(contract.locks.elements.file);schema(element.profileId==='project-dictionary-object-elements/1.0.0','elements','project-dictionary-object-elements/1.0.0',element.profileId);if(sha256(JSON.stringify(element.projectFiles))!==element.aggregateSha256)fail('lock-aggregate',{module:'elements'});
  const phonetic=parse(contract.locks.phonetic.file);schema(phonetic.schema==='name-phonetic-source-lock/1.0.0'&&phonetic.profileVersions?.cmn==='cmn-homophone-review/1.0.0'&&phonetic.profileVersions?.yue==='yue-homophone-review/1.2.0','phonetic','cmn1.0/yue1.2',phonetic.profileVersions);
  const phoneticHashes=Object.fromEntries(Object.keys(phonetic.fileHashes).sort().map(file=>[file,sha256(read('data/name-phonetic/'+file))]));if(sha256(JSON.stringify(phoneticHashes))!==phonetic.sha256)fail('lock-aggregate',{module:'phonetic'});
  const word=parse(contract.locks.word.file);schema(word.version==='name-word-pronunciation/1.0.0','word','name-word-pronunciation/1.0.0',word.version);
  const meaningTables=[];
  for(const [module,stem,id,count,publicationSchema]of [
   ['meaning-v1','meaning-context-next','project-meaning-context-next-137',20,'dev03-meaning-next-manifest/137.batch1'],
   ...((contract.applicationVersion==='1.0.37'||contract.applicationVersion==='1.0.38')?[['meaning-v1.1','meaning-context-v1-1','project-meaning-context-next-138-v1-1',40,'meaning-context-publication-manifest/1']]:[]),
  ]){
   const definition=contract.locks[module],meaning=parse(definition.file),source=meaning.sources?.[0];
   schema(meaning.schema==='meaning-context-source-lock/1'&&meaning.sources?.length===1&&typeof source?.id==='string'&&source.id===id,module,id,source?.id);
   if(!Array.isArray(source?.files)||!source.fileHashes||!isDeepStrictEqual([...source.files].sort(),Object.keys(source.fileHashes).sort()))throw Error('Meaning source file list incomplete: '+module);
   const hashes=Object.fromEntries(Object.keys(source.fileHashes).sort().map(file=>[file,sha256(read(file))]));
   for(const [file,actual]of Object.entries(hashes))if(actual!==source.fileHashes[file])fail('meaning-original-identity',{module,file});
   if(sha256(JSON.stringify(hashes))!==source.sha256)fail('lock-aggregate',{module});
   const publication=parse('data/'+stem+'-manifest.json'),all={...hashes,[definition.file]:sha256(read(definition.file))};
   schema(publication.schema===publicationSchema,module+'-publication',publicationSchema,publication.schema);
   const published=publication.files.filter(r=>r.logicalTarget.startsWith('data/'));if(published.length!==(module==='meaning-v1'?6:16))fail('meaning-publication-files',{module});
   for(const row of published)if(all[row.logicalTarget]!==row.sha256)fail('meaning-publication-identity',{module,file:row.logicalTarget});
   if(module==='meaning-v1.1'&&!isDeepStrictEqual(published.map(r=>r.logicalTarget).sort(),Object.keys(all).sort()))fail('meaning-publication-files',{module});
   const table=parse('data/'+stem+'.json');schema(table.schema==='conditional-meaning-context-increment/1'&&table.cases?.length===count&&(module!=='meaning-v1.1'||table.dataVersion==='meaning-context-data/1.1.0'),module,'fixed'+count+'case'+(module==='meaning-v1.1'?'@1.1':''),{schema:table.schema,cases:table.cases?.length,dataVersion:table.dataVersion});meaningTables.push(table);
  }
  if(meaningTables.length===2&&!isDeepStrictEqual(meaningTables[1].cases.slice(0,20),meaningTables[0].cases))fail('meaning-historical-prefix',{module:'meaning-v1.1'});
  if(contract.applicationVersion==='1.0.37'||contract.applicationVersion==='1.0.38'){const dataset=parse('data/dataset-v6.json');schema(dataset.version==='2026.10.20.2','cmn-reading','dataset2026.10.20.2',dataset.version);}
   if(contract.applicationVersion==='1.0.38'){
    const module='naming-character-meanings-v7.1',base='data/naming-character-meanings-v7.1',lock=parse(contract.locks[module].file),source=lock.sources?.[0],profile=parse(base+'-profile.json'),admission=parse(base+'-admission.json'),subset=parse('data/raw/naming-character-meanings-v7.1-subset.json'),publication=parse(base+'-manifest.json');
    schema(lock.version==='naming-editorial-7.1.0'&&lock.profileVersion==='naming-character-meanings-v7.1/1'&&lock.sources?.length===1&&source?.id==='naming-character-meanings-v7.1-fixed',module,'fixed-character71-profile',lock.profileVersion);
    if(!source||source.files.length!==29||!isDeepStrictEqual(source.files,Object.keys(source.fileHashes).sort()))throw Error('Character71 complete29 source registry differs');
    const hashes=Object.fromEntries(source.files.map(file=>[file,sha256(read(file))]));for(const[file,actual]of Object.entries(hashes))if(actual!==source.fileHashes[file])fail('character71-original-identity',{module,file});
    if(sha256(JSON.stringify(hashes))!==source.sha256)fail('lock-aggregate',{module});
    const expectedPublication=[...source.files,contract.locks[module].file].sort();if(publication.schema!=='naming-character-meanings-v7.1-publication/1'||!isDeepStrictEqual(publication.files.map(row=>row.file),expectedPublication))fail('character71-publication-files',{module});
    for(const row of publication.files){const bytes=read(row.file);if(sha256(bytes)!==row.sha256||bytes.length!==row.bytes)fail('character71-publication-identity',{module,file:row.file});}
    const scope=value=>value.scope==='per-character-project-explanation-only'&&value.wholeNameAssessment==='not-assessed'&&value.wholeNameMeaning===null&&value.automaticNameRecommendation===false&&value.automaticSemanticCreditAllowed===false&&value.scoreDelta===0;
    schema(profile.schema==='naming-character-meanings-profile/1'&&profile.profileVersion===lock.profileVersion&&profile.ruleVersion===lock.version&&profile.sourceId===source.id&&profile.cases.length===40&&new Set(profile.cases.map(row=>row.caseId)).size===40&&new Set(profile.cases.map(row=>row.char)).size===40&&isDeepStrictEqual(profile.cases,subset.cases)&&profile.subset.sha256===sha256(read('data/raw/naming-character-meanings-v7.1-subset.json'))&&scope(subset)&&profile.cases.every(scope),module,'fixed40-scoped-character-notes',profile.cases?.length);
    schema(admission.schema==='naming-character-meanings-admission/1'&&admission.profileVersion===lock.profileVersion&&admission.ruleVersion===lock.version&&admission.sourceId===source.id&&admission.profileSha256===sha256(read(base+'-profile.json'))&&admission.decision==='approved-character-notes'&&admission.activation===lock.version&&admission.testOnly===false&&isDeepStrictEqual(admission.approvedCaseIds,profile.cases.map(row=>row.caseId).sort())&&scope(admission),module+'-admission','complete-production40',admission.decision);
   }
   if(contract.applicationVersion==='1.0.38'){
    const fixed=contract.rootFeedbackPublication,rootManifest=parse(fixed.manifestFile),base='assets/bazi-root-feedback/1.3.1/';
    schema(rootManifest.schema==='bazi-root-feedback-resource-manifest/1'&&rootManifest.methodId===fixed.methodId&&rootManifest.applicationPolicyVersion===fixed.applicationPolicyVersion&&rootManifest.publicationId===fixed.publicationId&&rootManifest.sourceRevision===fixed.sourceRevision&&isDeepStrictEqual(rootManifest.kernel,fixed.kernel)&&rootManifest.files.length===39,'bazi-root-feedback-1.3.1','exact-fixed-root-publication',rootManifest.publicationId);
    const files=[...rootManifest.files.map(row=>base+row.path),fixed.manifestFile].sort();if(!isDeepStrictEqual(files,contract.groups['bazi-root-feedback-1.3.1']))fail('root-publication-files',{module:'bazi-root-feedback-1.3.1'});
    for(const row of rootManifest.files){const bytes=read(base+row.path);if(sha256(bytes)!==row.sha256||bytes.length!==row.bytes)fail('root-publication-identity',{file:base+row.path});}
    const parent=parse('data/parent-name-phonetics-method-v1.json');schema(parent.schema==="parent-name-phonetics-method/1"&&parent.version==='parent-name-phonetics/1.0.0','parent-name-phonetics-method','parent-name-phonetics/1.0.0',parent.version);
   }
  const modern=parse('data/modern-method-references.json');schema(modern.version==='modern-practical-method-references/1.0.0','modern','modern-practical-method-references/1.0.0',modern.version);
  const yue=parse(contract.locks['yue-reading-dependency'].file);schema(yue.version==='yue-name-reading/1.0.0'&&yue.sourceVersion==='2026.08.10','yue-reading-dependency','yue-name-reading/1.0.0@2026.08.10',{version:yue.version,sourceVersion:yue.sourceVersion});
  for(const [index,s]of yue.sources.entries()){
   const map=Object.fromEntries(Object.keys(s.fileHashes).sort().map(file=>[file,sha256(read(file))]));
   const aggregate=index===0?sha256(JSON.stringify(map)):sha256(s.files.map(file=>path.posix.basename(file)+'\0'+map[file]).join('\n'));
   if(aggregate!==s.sha256)fail('lock-aggregate',{module:'yue-reading-dependency',source:s.id});
  }
 }catch(error){fail('resource-structure',{message:error.message});}
 let generatedWorker=null;
 if(contract.applicationVersion==='1.0.38'){
  const spec=contract.generatedWorker;
  if(!matcher?.(spec.outputFile)||!matcher?.(spec.receiptFile))fail('worker-package-not-covered',{outputFile:spec.outputFile,receiptFile:spec.receiptFile});
  if(stage==='source-prebuild'){
   for(const[file,pin]of Object.entries({...spec.inputFiles,[spec.buildScript.file]:spec.buildScript,[spec.helper.file]:spec.helper})){try{const bytes=fs.readFileSync(relativeFile(root,file));if(sha256(bytes)!==pin.sha256||pin.bytes!==undefined&&bytes.length!==pin.bytes)fail('worker-source-identity',{file,expected:pin.sha256,actual:sha256(bytes)});}catch(error){fail('worker-source-missing',{file,message:error.message});}}
   generatedWorker={status:'source-prebuild-verified',outputFile:spec.outputFile,receiptFile:spec.receiptFile,compiledOutputChecked:false};
  }else{try{generatedWorker=verifyCmnWorkerRuntime({root:payloadRoot,spec,expectedReceiptSha256:expectedWorkerReceiptSha256,readFile:read});}catch(error){fail('generated-worker-payload',{file:spec.outputFile,message:error.message});generatedWorker={status:'failed',outputFile:spec.outputFile};}}
 }
 // Source readers are development-layout checks; extracted apps do not ship these TS files.
 for(const expected of sourceReaderRows){let file;try{file=relativeFile(root,expected.file);}catch(error){if(error.code==='ENOENT'){if(contract.applicationVersion==='1.0.38'&&stage==='source-prebuild'){fail('source-reader-missing',{file:expected.file});readers.push({file:expected.file,status:'failed'});}else readers.push({file:expected.file,status:'not-present-in-extracted-layout'});continue;}fail('source-reader-path',{file:expected.file,message:error.message});continue;}
  const actual=sha256(fs.readFileSync(file));readers.push({file:expected.file,sha256:actual,status:actual===expected.sha256?'passed':'failed'});if(actual!==expected.sha256)fail('source-reader-version',{file:expected.file,expected:expected.sha256,actual});
 }
 for(const file of contract.excludedNextBatch){if(fs.existsSync(path.join(payloadRoot,file))&&(payloadRoot!==root||matcher?.(file)))fail('next-batch-resource-in-current-payload',{file,profile:contract.profile});}
 if(payloadRoot!==root&&fs.existsSync(path.join(payloadRoot,'package.json'))){try{const actual=json(relativeFile(payloadRoot,'package.json')).version;if(actual!==contract.applicationVersion)fail('payload-application-version',{expected:contract.applicationVersion,actual});}catch(error){fail('payload-package',{message:error.message});}}
 const integrityErrors=errors.filter(e=>!['package-runtime-not-covered','package-declaration'].includes(e.check));
 if(!integrityErrors.length){
  for(const [module,file,method,args]of [
   ['phonetic','data/name-phonetic/profile-source-loader.mjs','verifyNamePhoneticPackage',[path.join(payloadRoot,'data/name-phonetic')]],
   ['word','data/name-word-pronunciation/word-source-loader.mjs','verifyWordPronunciationPackage',[path.join(payloadRoot,'data/name-word-pronunciation')]],
   ['elements','data/element-object/load-verified-element-package.mjs','loadVerifiedElementPackage',[path.join(payloadRoot,'data/element-object'),contract.locks.elements.sha256,payloadRoot]],
  ]){try{const actual=await import(pathToFileURL(relativeFile(payloadRoot,file)).href),value=actual[method](...args);loaderChecks.push({module,status:'passed',method,engineProfileMatched:value.engineProfileMatched??null});}catch(error){fail('actual-runtime-loader',{module,method,message:error.message});loaderChecks.push({module,status:'failed',method});}}
 }
 return {schema:'current-review-resource-verification/1',status:errors.length?'failed':'passed',profile:contract.profile,root,payloadRoot,packageFile,...(contract.applicationVersion==='1.0.38'?{stage,generatedWorker,sourceProfile:sourceProfileSelection,sourceExtensions:{status:sourceExtensionSelection.status,profileRef:sourceExtensionSelection.profileRef,productionApproved:false}}:{}),scope:'Exact'+contract.applicationVersion+' historical resource union plus separately fixed source-compatible extensions;no extension activation or business authority;actualFSbytes/hash/knownversions/packagepatterns. NotASARorinstalledexecution.',summary:{requiredFiles:resources.length,historicalRequiredFiles:Object.keys(contract.files).length,extensionResourceFiles:sourceExtensionSelection?.resources.length??0,filesIntegrityPassed:resources.filter(r=>r.integrity==='passed').length,packageCovered:resources.filter(r=>r.packageCovered).length,actualLoaderGatesPassed:loaderChecks.filter(r=>r.status==='passed').length,meaningV1Files:contract.groups['meaning-v1'].length,meaningV11Files:contract.groups['meaning-v1.1']?.length??0,nextBatchV11Required:contract.applicationVersion==='1.0.37'?contracts.get('1.0.36').excludedNextBatch.length:0,cmnReadingFiles:contract.groups['cmn-reading']?.length??0,namingCharacterMeanings71Files:contract.groups['naming-character-meanings-v7.1']?.length??0,rootFeedbackFiles:contract.groups['bazi-root-feedback-1.3.1']?.length??0,parentMethodFiles:contract.groups['parent-name-phonetics-method']?.length??0,namingOriginalDependencyFiles:contract.groups['naming-original-dependencies']?.length??0},resources,sourceReaders:readers,loaderChecks,errors,pending:[],writes:0,networkRequests:0};
}
export function parseReviewResourceArguments(argv=process.argv.slice(2)){
 const args={root:process.cwd()};for(let i=0;i<argv.length;i++){const key=argv[i];if(!['--root','--payload-root','--package-file','--report','--stage','--expected-worker-receipt-sha256','--source-profile'].includes(key)||!argv[i+1]||argv[i+1].startsWith('--'))throw Error('Use --root, --payload-root, --package-file or --report with an explicit path');args[{'--root':'root','--payload-root':'payloadRoot','--package-file':'packageFile','--report':'report','--stage':'stage','--expected-worker-receipt-sha256':'expectedWorkerReceiptSha256','--source-profile':'sourceProfile'}[key]]=argv[++i];}
 args.root=safeRoot(args.root);if(args.payloadRoot)args.payloadRoot=safeRoot(args.payloadRoot);if(args.packageFile)args.packageFile=path.resolve(args.packageFile);return args;
}
if(isMain(import.meta.url)){
 try{const args=parseReviewResourceArguments(),report=await verifyReviewResources(args);finish(report,args);}catch(error){console.error(JSON.stringify({status:'failed',error:error.message}));process.exitCode=1;}
}
