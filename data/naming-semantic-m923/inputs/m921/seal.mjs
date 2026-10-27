import fs from 'node:fs';
import path from 'node:path';
import {PACKAGE_ROOT,VERSION,hash} from './convert.mjs';
import {ARTIFACT_FILES,verifyContent} from './verify.mjs';
verifyContent();
const manifest={schema:'m921-publication-manifest/1',version:VERSION,activation:'off',admissionGranted:false,productionApproved:false,formalCoverageAdded:0,defaultAutomaticCoverageAdded:0,files:ARTIFACT_FILES.map(file=>{const bytes=fs.readFileSync(path.join(PACKAGE_ROOT,file));return{file,bytes:bytes.length,sha256:hash(bytes)};})};
const output=path.join(PACKAGE_ROOT,'manifest.json');fs.writeFileSync(output+'.tmp',JSON.stringify(manifest,null,2)+'\n');fs.renameSync(output+'.tmp',output);
console.log(JSON.stringify({sealed:true,files:manifest.files.length,activation:'off',admissionGranted:false}));
