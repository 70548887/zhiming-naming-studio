import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(ROOT,'.local/m1024');fs.mkdirSync(out,{recursive:true});
const config=path.join(out,'contract-tsconfig.json');fs.writeFileSync(config,JSON.stringify({compilerOptions:{target:'ES2022',module:'ESNext',moduleResolution:'Bundler',strict:true,noEmit:true,skipLibCheck:true,types:[],lib:['ES2022']},files:[path.join(ROOT,'tests/m1024-manual-character-meaning.contract.ts')]},null,2)+'\n');
const compiler='D:/Codex-NamingStudio-Evidence/m768-next-integration/node_modules/typescript/bin/tsc';
const result=spawnSync(process.execPath,[compiler,'--project',config,'--pretty','false'],{cwd:ROOT,encoding:'utf8',timeout:10000,maxBuffer:256*1024});
fs.writeFileSync(path.join(out,'types.stdout.log'),result.stdout||'');fs.writeFileSync(path.join(out,'types.stderr.log'),result.stderr||'');
const receipt={task:'M1024',exitCode:result.status,error:result.error?.message,scope:'Only new declaration plus one consumer contract and existing DTO type; no whole application typecheck or JS check',expectedErrorAssertions:3,wholeTypes:false,sourceGraphSmall:true};fs.writeFileSync(path.join(out,'type-result.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));if(result.status!==0){console.log(result.stdout||'');console.error(result.stderr||'');process.exitCode=result.status||1;}
