// Isolated byte fixture for the real managed-extension reader. Source files
// are copied but never executed. Legacy package projection is test setup only.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export async function createSourceExtensionFixture({projectRoot,projection='legacy-known-only'}){
 if(!path.isAbsolute(projectRoot)||!['legacy-known-only','actual'].includes(projection))throw Error('Explicit project root and known fixture projection required');
 const parent=fs.realpathSync.native(os.tmpdir()),root=fs.realpathSync.native(fs.mkdtempSync(path.join(parent,'m929-extension-negative-')));
 const profileFile='scripts/verification/source-profile-138-extensions.json',profile=JSON.parse(fs.readFileSync(path.join(projectRoot,profileFile)));
 const sourceFiles=[...profile.sourceRoles,...profile.resources,...profile.readerCompanions,...profile.readerTransitions].map(row=>row.file);
 const groupCandidateFile='scripts/verification/extension-evidence/m940/project-v132-correspondence-candidate.json',groupCandidate=JSON.parse(fs.readFileSync(path.join(projectRoot,groupCandidateFile)));
 const supportFiles=[profileFile,profile.historicalSourceInventory.file,profile.historicalResourceContract.file,...profile.reviews.map(row=>row.file),
  'package.json','scripts/verification/source-profile-138-approvals.json','scripts/verification/review-source-profile-138-m480.json',
  'scripts/verification/review-resources-136.json','scripts/verification/review-resources-137.json','scripts/verification/review-resources-138.json',
  'scripts/verification/outer-source-admission-138.mjs','scripts/verification/source-profile-138.mjs','scripts/verification/review-resources.mjs',
  'scripts/verification/m491-publication-locks.mjs','scripts/verification/m491-publication-trusted.mjs','scripts/verification/common.mjs','scripts/verification/safe-paths.mjs','scripts/verification/cmn-worker-build-receipt.mjs',
  'scripts/verification/qiongtong-source-registration-929.mjs','scripts/verification/extension-evidence/m929/M925-SOURCE-PINS.json',
  'scripts/verification/project-v132-source-group-940.mjs','scripts/verification/project-v132-registration-944.mjs',groupCandidateFile,groupCandidate.manifest.file,groupCandidate.manifestCopy.file,...groupCandidate.priorEvidence.map(row=>row.file),...groupCandidate.mapped.map(row=>row.resourceFile),
  'scripts/verification/extension-evidence/m944/M940-MANIFEST.json','scripts/verification/extension-evidence/m944/M940-build-pins-original.json',
  'scripts/verification/consumer-source-registration-964.mjs','scripts/verification/extension-evidence/m964/M957-manifest.json',
  'scripts/verification/imagery-source-registration-980.mjs','scripts/verification/extension-evidence/m980/M975-manifest.json',
  'scripts/verification/coverage-source-registration-1011.mjs','scripts/verification/extension-evidence/m1011/manifest.json','scripts/verification/extension-evidence/m1011/receipt.json','scripts/verification/extension-evidence/m1011/source-profile-m980-original.json',
  'scripts/verification/semantic-source-registration-1035.mjs','scripts/verification/extension-evidence/m1035/manifest.json','scripts/verification/extension-evidence/m1035/receipt.json','scripts/verification/extension-evidence/m1035/source-profile-m1011-original.json',
  'scripts/verification/qimen-cultural-source-registration-1066.mjs','scripts/verification/extension-evidence/m1066/SOURCE-PINS.json','scripts/verification/extension-evidence/m1066/receipt.json','scripts/verification/extension-evidence/m1066/source-profile-m1035-original.json'];
 const inside=relative=>{if(typeof relative!=='string'||!relative||/[\\:]/u.test(relative)||relative.startsWith('/')||relative.split('/').some(part=>!part||part==='.'||part==='..'))throw Error('Unsafe isolated fixture relative path');return path.join(root,...relative.split('/'));};
 for(const relative of new Set([...sourceFiles,...supportFiles])){const target=inside(relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(projectRoot,relative),target);}
 const pkg=JSON.parse(fs.readFileSync(inside('package.json')));
 if(projection==='legacy-known-only'){pkg.build.files=[...profile.packageProjection.legacyBuildFiles,...profile.packageProjection.explicitAppends];fs.writeFileSync(inside('package.json'),JSON.stringify(pkg));}
 const dependencyDirectory=fs.realpathSync.native(path.join(projectRoot,'node_modules'));fs.symlinkSync(dependencyDirectory,path.join(root,'node_modules'),'junction');
 let disposed=false;
 const dispose=()=>{if(disposed)return;const resolved=fs.realpathSync.native(root);if(path.dirname(resolved)!==parent||!path.basename(resolved).startsWith('m929-extension-negative-')||resolved!==root||fs.lstatSync(root).isSymbolicLink())throw Error('Fixture cleanup target is not its owned temporary directory');fs.unlinkSync(path.join(root,'node_modules'));fs.rmSync(root,{recursive:true,force:false});disposed=true;};
 try{
  const normal=await import(pathToFileURL(inside('scripts/verification/outer-source-admission-138.mjs')).href);
  const group=await import(pathToFileURL(inside('scripts/verification/qiongtong-source-registration-929.mjs')).href);
  const projectGroup=await import(pathToFileURL(inside('scripts/verification/project-v132-registration-944.mjs')).href);
  const consumerGroup=await import(pathToFileURL(inside('scripts/verification/consumer-source-registration-964.mjs')).href);
  const imageryGroup=await import(pathToFileURL(inside('scripts/verification/imagery-source-registration-980.mjs')).href);
  const coverageGroup=await import(pathToFileURL(inside('scripts/verification/coverage-source-registration-1011.mjs')).href);
  const semanticGroup=await import(pathToFileURL(inside('scripts/verification/semantic-source-registration-1035.mjs')).href);
  const qimenCulturalGroup=await import(pathToFileURL(inside('scripts/verification/qimen-cultural-source-registration-1066.mjs')).href);
  return{root,normal,group,projectGroup,consumerGroup,imageryGroup,coverageGroup,semanticGroup,qimenCulturalGroup,projection,file:inside,read:relative=>fs.readFileSync(inside(relative)),write:(relative,bytes)=>{const target=inside(relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);},dispose};
 }catch(error){dispose();throw error;}
}
