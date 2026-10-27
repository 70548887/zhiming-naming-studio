import fs from 'node:fs';
import path from 'node:path';
import pins from '../../src/main/bazi-root-feedback-v132-r2-pins.json';
import {buildRootFeedbackV132R2} from '../../scripts/build-root-feedback-v132-r2.mjs';

/** Copy only the Git-owned frozen inputs; this does not compile any preview. */
export function copyPreviewInputs(sourceRoot:string,root=process.cwd()){
  const publication='assets/bazi-root-feedback/1.3.2-r2';
  const copy=(from:string,to:string)=>{fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);};
  for(const row of pins.closure.files)copy(path.join(root,row.sourcePath),path.join(sourceRoot,row.sourcePath));
  copy(path.join(root,'src/main/bazi-root-feedback-v132-r2-pins.json'),path.join(sourceRoot,'src/main/bazi-root-feedback-v132-r2-pins.json'));
  fs.cpSync(path.join(root,publication),path.join(sourceRoot,publication),{recursive:true});
  return{sourceRoot,assetRoot:path.join(sourceRoot,'assets')};
}

/** Existing Service tests build exact CJS into their own disposable dist tree. */
export async function buildPreviewFixture(directory:string,root=process.cwd()){
  const {sourceRoot,assetRoot}=copyPreviewInputs(path.join(directory,'fixed-source'),root);
  const file=path.join(sourceRoot,'dist-electron/bazi-root-feedback/1.3.2-r2/root-feedback.cjs');
  const receipt=await buildRootFeedbackV132R2({root:sourceRoot,outfile:file});
  return{assetRoot,file,receipt};
}
