import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),output=path.join(ROOT,'.local/m1024');
fs.mkdirSync(output,{recursive:true});
const startedAt=new Date().toISOString(),args=['--test','--test-concurrency=1','--test-reporter=tap',path.join(ROOT,'tests/m1024-manual-character-meaning-query.test.mjs')];
const result=spawnSync(process.execPath,args,{cwd:ROOT,encoding:'utf8',timeout:30000,maxBuffer:512*1024});
const write=(name,b)=>{const p=path.join(output,name);fs.writeFileSync(p+'.tmp',b);fs.renameSync(p+'.tmp',p);};
write('checks.tap',result.stdout||'');write('checks.stderr.log',result.stderr||'');
const count=n=>Number(result.stdout?.match(new RegExp('^# '+n+' (\\d+)','m'))?.[1]??0);
const receipt={task:'M1024',baseline:'c86600dcb9f51e02aeffa48ec74922fe983d6121',startedAt,completedAt:new Date().toISOString(),exitCode:result.status,error:result.error?.message,signal:result.signal,tests:count('tests'),passed:count('pass'),failed:count('fail'),skipped:count('skipped'),command:[process.execPath,...args],scope:'New manual query adapter suite only; actual data/package; no mocks/source-authentication replacements',sourceDictionaryOriginalRead:true,oldM970OrM976TestsRun:false,Store:false,SQL:false,native:false,wholeTypecheck:false,largeReplay:false,fullRegression:false,productionRegistration:false,formalCoverageAdded:0};
write('check-result.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));if(result.status!==0){console.log((result.stdout||'').slice(-14000));console.error(result.stderr||result.error?.message||'');process.exitCode=result.status||1;}
