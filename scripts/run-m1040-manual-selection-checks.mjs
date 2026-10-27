import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,resolve} from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const compiler=process.argv[2],evidence=resolve(process.argv[3]??join(root,'.local/m1040-selection-checks'));
if(!compiler||!existsSync(compiler))throw Error('Pass an existing TypeScript compiler file; no install or full-project type run is performed.');
mkdirSync(evidence,{recursive:true});
const results=[];
function run(label,args){
 const output=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,M1040_EVIDENCE_DIR:evidence},encoding:'utf8',timeout:45000,maxBuffer:512*1024});
 writeFileSync(join(evidence,label+'.stdout.log'),output.stdout??'');writeFileSync(join(evidence,label+'.stderr.log'),(output.stderr??'')+(output.error?String(output.error):''));
 const result={label,status:output.status,signal:output.signal,error:output.error?String(output.error):null,passed:output.status===0};results.push(result);console.log(JSON.stringify(result));
 if(!result.passed){console.log((output.stdout??'').slice(-7000)+(output.stderr??'').slice(-2000));return false;}return true;
}
const pure=run('pure-suite',['--test','--test-concurrency=1','--test-reporter=tap','tests/m1040-manual-meaning-selection-directory.test.mjs']);
if(pure)run('own-type-contract',[resolve(compiler),'--noEmit','--strict','--target','ES2022','--module','ESNext','--moduleResolution','Bundler','--skipLibCheck','tests/m1040-manual-meaning-selection.contract.mts']);
writeFileSync(join(evidence,'checks.json'),JSON.stringify({task:'M1040-MANUAL-MEANING-SELECTION-DIRECTORY',results,oldSuiteRun:false,fullProjectTypesRun:false,sqlOrNativeRun:false},null,2)+'\n');
if(results.length!==2||results.some(r=>!r.passed))process.exitCode=1;
