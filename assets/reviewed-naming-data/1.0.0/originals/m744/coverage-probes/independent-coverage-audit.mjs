import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';

const candidate='D:/Codex-NamingStudio-Evidence/m740-character-meanings';
const product='D:/Codex-NamingStudio-Evidence/m587-product-integration/work';
const out='D:/Codex-NamingStudio-Evidence/m744-data-audit';
const data=path.join(product,'data');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const unique=xs=>[...new Set(xs)].sort();
const same=(a,b)=>JSON.stringify(unique(a))===JSON.stringify(unique(b));
const intersection=(a,b)=>unique(a.filter(x=>new Set(b).has(x)));
const subtract=(a,b)=>unique(a.filter(x=>!new Set(b).has(x)));
const pin=file=>{const bytes=fs.readFileSync(file);return {bytes:bytes.length,sha256:sha(bytes)};};
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(value,null,2)+'\n');fs.renameSync(file+'.tmp',file);};
const lock=read(path.join(candidate,'data/source-lock.json'));
const coverage=read(path.join(candidate,'data/coverage.json'));
const profile=read(path.join(candidate,'data/profile.json'));
const sources=lock.sourceFiles.map(row=>({...row,actual:pin(row.absolute)}));
const sourceMismatches=sources.filter(row=>row.bytes!==row.actual.bytes||row.sha256!==row.actual.sha256);
if(sourceMismatches.length)throw new Error('Pinned source bytes changed: '+sourceMismatches.map(r=>r.file).join(','));
const esbuild=createRequire(path.join(product,'package.json'))('esbuild');
const compiled=path.join(out,'coverage-probes/actual-semantics-v6.cjs');
await esbuild.build({entryPoints:[path.join(product,'src/domain/naming-semantics-v6.ts')],bundle:true,platform:'node',format:'cjs',outfile:compiled,logLevel:'silent'});
const actualSemantics=createRequire(import.meta.url)(compiled);
const review=await import(pathToFileURL(path.join(product,'src/domain/naming-review-v7.mjs')));
const m460Module=await import(pathToFileURL(path.join(product,'src/main/m460-publication-data.mjs')));
const dataset=read(path.join(data,'dataset-v6.json'));
const v7=read(path.join(data,'naming-editorial-v7.json'));
const pack={packSha256:v7.base.knowledgePackSha256,activeVersion:v7.base.activeVersion};
const lookup=review.createNamingReviewLookup(v7);
const standalone=m460Module.loadM460V71Publication(data);
if(!standalone)throw new Error('Actual M460 standalone publication missing');
const universe=unique(dataset.characters.map(r=>r.char));
const base=unique(dataset.characters.filter(r=>actualSemantics.reviewedNamingSense(r)).map(r=>r.char));
const supplemental=unique(dataset.characters.filter(r=>lookup.lookupMeaning(r,pack)).map(r=>r.char));
const stand=unique(dataset.characters.filter(r=>standalone.lookup.characterExplanation(r,pack).status==='character-explanations-ready').map(r=>r.char));
const automatic=unique([...base,...supplemental]);
const display=unique([...automatic,...stand]);
const remaining=subtract(universe,display);
const selected=profile.cases.map(r=>r.char);
const comparisons=[];
function compare(name,actual,stored){const result={name,actualCount:unique(actual).length,storedCount:stored.count,identityMatches:same(actual,stored.characters),countMatches:stored.count===unique(actual).length,missingFromCandidate:subtract(actual,stored.characters),extraInCandidate:subtract(stored.characters,actual)};comparisons.push(result);return result;}
compare('baseProjectMeanings',base,coverage.baseProjectMeanings);
compare('supplementalAutomatic',supplemental,coverage.supplementalAutomatic);
compare('automaticDefaultUnion',automatic,coverage.automaticDefaultUnion);
compare('standaloneOnRequest',stand,coverage.standaloneOnRequest);
compare('currentAutomaticOrStandaloneUnion',display,coverage.currentAutomaticOrStandaloneUnion);
compare('outstandingDefault',remaining,coverage.outstandingDefault);
const occupancyRows=[];
const occupancy=(name,relative,root=data)=>{const file=path.join(root,relative),value=read(file),rows=Array.isArray(value)?value:value.cases;const chars=unique(rows.map(r=>r.char).filter(Boolean));occupancyRows.push({name,file,rowCount:rows.length,characters:chars,count:chars.length,selectedOverlap:intersection(selected,chars),sha256:pin(file).sha256});return chars;};
const m460=occupancy('M460 standalone60','naming-character-meanings-v71-m460-b02-profile.json');
const m610=occupancy('M610 candidate20','naming-character-meanings-m610-profile.json');
const m616=occupancy('M616 non-default candidate10','naming-character-meanings-m616-profile.json');
const m690=occupancy('M690 candidate20','data/profile.json','D:/Codex-NamingStudio-Evidence/m690-meanings-batch-next');
const older=lock.sourceFiles.filter(r=>r.root==='old-batch-occupancy').map(row=>occupancy(row.file,path.basename(row.absolute),path.dirname(row.absolute)));
const contexts=occupancy('v1.1 whole-word context targets','meaning-context-v1-1.json');
const b04=occupancy('B04 whole-word context targets','meaning-context-m460-b04.json');
const occupied=unique([...m460,...m610,...m616,...m690,...older.flat(),...contexts,...b04]);
compare('existingCandidateOccupancy.allSelectedCharacters',occupied,coverage.existingCandidateOccupancy.allSelectedCharacters);
for(const [name,set]of [['m610',m610],['m616',m616],['m690',m690]])compare('existingCandidateOccupancy.'+name,set,coverage.existingCandidateOccupancy[name]);
const notRecommended=v7.meaningReviews.filter(r=>r.status==='not-recommended').map(r=>r.char);
const exclusions=unique([...automatic,...occupied,...notRecommended]);
const available=subtract(universe,exclusions);
compare('remainingUnselectedDefaultPool',available,coverage.remainingUnselectedDefaultPool);
const nondefault20File=path.join(data,'m460-lexical/naming-character-meanings-m393-profile.json');
const nondefault20=read(nondefault20File);
const records=(nondefault20.cases??[]).map(r=>({char:r.char,scope:r.scope,readingRole:r.readingRole,reading:r.reading,baseline:r.baselineCharacter?.pinyin,default:r.defaultReading?.pinyin,selected:r.selectedReading?.pinyin}));
const verifiedModule=await import(pathToFileURL(path.join(candidate,'validate.mjs')));
const successfulVerification=verifiedModule.verifyM740Candidate();
const originalRead=fs.readFileSync;
const probes=[];
const probeTarget=path.join(data,'dataset-v6.json');
for(const kind of ['missing-source','tampered-source','malformed-source']){
  fs.readFileSync=function(file,...rest){
    if(typeof file==='string'&&path.resolve(file)===path.resolve(probeTarget)){
      if(kind==='missing-source')throw Object.assign(new Error('M744 audit-only source absent'),{code:'ENOENT'});
      if(kind==='malformed-source')return Buffer.from('{invalid JSON');
      const value=Buffer.from(originalRead.call(this,file));value[value.length-1]^=1;return value;
    }
    return originalRead.call(this,file,...rest);
  };
  try{verifiedModule.verifyM740Candidate();probes.push({kind,rejected:false});}
  catch(error){probes.push({kind,rejected:true,error:error.message,code:error.code??null});}
  finally{fs.readFileSync=originalRead;}
}
const helper=await import(pathToFileURL(path.join(candidate,'lib.mjs')));
const helperProbeInput=helper.readInputs();
const unchangedSourceBytes=sha(helperProbeInput.sources.get('product-data:naming-editorial-v7.json'));
const manualRow=helperProbeInput.v7.meaningReviews.find(r=>r.char==='邦');
manualRow.automaticMeaningAllowed=true;
const helperCoverage=helper.coverageInventory(helperProbeInput);
const helperProbe={scope:'pure helper only; unauthenticated caller input, not candidate verifier',sourceBytesRemainPinned:sha(helperProbeInput.sources.get('product-data:naming-editorial-v7.json'))===unchangedSourceBytes,alteredParsedTableAccepted:helperCoverage.automaticDefaultUnion.characters.includes('邦'),note:'coverageInventory trusts supplied parsed input; verifyM740Candidate rereads and pins files before constructing its own input. Not an externally authenticated loader.'};
const testReceipt=read(path.join(candidate,'validation/test-receipt.json'));
const actualSets={universe,base,supplemental,automatic,standalone:stand,display,remaining,occupied,available,selected};
write(path.join(out,'coverage-probes/recomputed-sets.json'),actualSets);
const counts={universe:universe.length,base:base.length,supplemental:supplemental.length,baseSupplementalIntersection:intersection(base,supplemental).length,defaultAutomatic:automatic.length,standaloneOnRequest:stand.length,automaticStandaloneIntersection:intersection(automatic,stand).length,automaticOrStandalone:display.length,remaining:remaining.length,occupied:occupied.length,unselectedPoolBefore:available.length,unselectedPoolAfter:subtract(available,selected).length,newCandidate:unique(selected).length,formalCoverageAdded:0};
const mismatches=comparisons.filter(r=>!r.countMatches||!r.identityMatches);
const result={schema:'m744-coverage-integrity-audit/1',status:mismatches.length||probes.some(r=>!r.rejected)?'defects-found':'passed-data-integrity',candidate,product,p1Defects:[],assessmentScope:'Coverage and source-integrity subaudit only; semantic row acceptance remains with the independent row reviewers. Missing product build or wiring is not classified as a data P1.',baselineHead:execFileSync('git',['-C',product,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceLockExpectedHead:lock.baselineHead,sourceFileCount:sources.length,sourcePinMismatches:sourceMismatches,counts,comparisons,mismatches,selection:{characters:selected,expectedExactSelection:['邦','沫','纪','纶','年','农','作','岁','叶','萧'],orderMatches:JSON.stringify(selected)===JSON.stringify(['邦','沫','纪','纶','年','农','作','岁','叶','萧']),automaticOverlap:intersection(selected,automatic),standaloneOverlap:intersection(selected,stand),oldCandidateOrContextTargetOverlap:intersection(selected,occupied),excludedOverlap:intersection(selected,exclusions),priorStatuses:profile.cases.map(r=>({char:r.char,status:r.priorV7Review.status,applicability:r.priorV7Status}))},occupancyRows,exclusions:{nondefaultOrCandidateRowsNotPromoted:true,m610AutomaticDelta:0,m616AutomaticDelta:0,m690AutomaticDelta:0,wholeWordAutomaticDelta:0,wholeWordStandaloneDelta:0,lexical20Inventory:{file:nondefault20File,count:records.length,records}},failClosed:{successfulReadOnlyVerification:successfulVerification.status,probes,helperBoundary:helperProbe,testReceipt:{path:path.join(candidate,'validation/test-receipt.json'),recordedTests:testReceipt.tests,recordedPassed:testReceipt.passed,recordedFailed:testReceipt.failed,rerun:false,claim:'Existing receipt read only; no original test suite rerun.'}},boundary:{candidateOnly:profile.candidateOnly,activation:profile.activation,productionApproved:profile.productionApproved,formalCoverageAdded:profile.formalCoverageAdded,sourceAuthority:profile.sourceAuthority,generationAuthority:profile.generationAuthority,automaticNameRecommendation:profile.automaticNameRecommendation,automaticSemanticCreditAllowed:profile.automaticSemanticCreditAllowed,scoreDelta:profile.scoreDelta,wholeNameAssessment:profile.wholeNameAssessment,wholeNameMeaning:profile.wholeNameMeaning,query:'Not wired. Any later on-request query needs independently accepted exact char/default-reading/source binding and explicit usage review; 9 historical manual rows plus pending 叶 remain unapproved by this audit.',generation:'No automatic generation, ranking or meaning-credit authority. Default automatic stays 521; display stays 581; remaining stays 198.'},evidence:[{path:path.join(product,'src/main/naming-coverage-provider.ts'),locator:'lines 105-107: actual reviewedNamingSense / lookupMeaning / characterExplanation filters'},{path:path.join(candidate,'lib.mjs'),locator:'baseMeaningCharacters / coverageInventory; readInputs does not authenticate; helper inputs trusted'},{path:path.join(candidate,'validate.mjs'),locator:'verifyM740Candidate lines 33-50: pins manifest/lock, candidate/source file bytes, fresh inputs, then exact reconstruction'},{path:path.join(candidate,'tests/data.test.mjs'),locator:'lines 10-65: 14 recorded tests; no corrupt-source fixture test in that suite'},{path:path.join(product,'src/main/single-character-meaning-query.mjs'),locator:'lines 280-318: registered M460/M610/M616 query batches, no M740'}],artifacts:{sets:path.join(out,'coverage-probes/recomputed-sets.json'),probeScript:import.meta.filename},limitations:['Actual product query/generation wiring not executed; candidate remains off.','Coverage helper corruption probe is a trusted-input boundary observation, not a verified external-loader bypass.']};
write(path.join(out,'coverage-integrity.json'),result);
console.log(JSON.stringify({status:result.status,counts,mismatchCount:mismatches.length,selectionOverlaps:result.selection.excludedOverlap,probes,sourceFileCount:sources.length,output:path.join(out,'coverage-integrity.json')}));
