import { build,version as esbuildVersion } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import {recordCmnWorkerBuild} from './verification/cmn-worker-build-receipt.mjs';
import {verifyReviewResources} from './verification/review-resources.mjs';
import {buildRootFeedbackV132Preview} from './build-root-feedback-v132-preview.mjs';
const appVersion=JSON.parse(fs.readFileSync(path.join(process.cwd(),'package.json'),'utf8')).version;
const reviewResources=await verifyReviewResources(appVersion==='1.0.38'?{root:process.cwd(),stage:'source-prebuild'}:{root:process.cwd()});
if(reviewResources.status!=='passed')throw new Error('Reviewed runtime resources block Electron packaging: '+JSON.stringify(reviewResources.errors));
await buildRootFeedbackV132Preview(process.cwd());
await build({entryPoints:['src/main/main.ts'],outfile:'dist-electron/main.cjs',bundle:true,platform:'node',target:'node22',format:'cjs',external:['electron','sql.js'],sourcemap:true});
await build({entryPoints:['src/main/preload.ts'],outfile:'dist-electron/preload.cjs',bundle:true,platform:'node',target:'node22',format:'cjs',external:['electron'],sourcemap:true});
if(appVersion==='1.0.38'){
 const result=await build({entryPoints:['src/main/cmn-reading-worker.ts'],outfile:'dist-electron/cmn-reading-worker.cjs',bundle:true,platform:'node',target:'node22',format:'cjs',sourcemap:true,metafile:true});
 const contract=JSON.parse(fs.readFileSync(new URL('./verification/review-resources-138.json',import.meta.url),'utf8'));
 const receipt=recordCmnWorkerBuild({root:process.cwd(),spec:contract.generatedWorker,metafile:result.metafile,esbuildVersion});
 const runtime=await verifyReviewResources({root:process.cwd(),stage:'runtime-payload',expectedWorkerReceiptSha256:receipt.sha256});
 if(runtime.status!=='passed')throw Error('Reviewed runtime resources block1.0.38 worker payload: '+JSON.stringify(runtime.errors));
}else{
 await build({entryPoints:['src/main/cmn-reading-worker.ts'],outfile:'dist-electron/cmn-reading-worker.cjs',bundle:true,platform:'node',target:'node22',format:'cjs',sourcemap:true});
}
