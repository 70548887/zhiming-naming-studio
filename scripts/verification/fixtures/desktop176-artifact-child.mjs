// Bounded protocol fixture only. This launches Node, never App/SQL/Worker/PDF tools.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {randomUUID,createHash} from 'node:crypto';
const args=process.argv.slice(2),options=Object.fromEntries(Array.from({length:args.length/2},(_,i)=>[args[i*2],args[i*2+1]]));
const root=options['--root'],owned=options['--case'],mode=options['--mode'],phase=options['--phase'],scenario=options['--scenario'],capture=options['--capture'];
const area=path.join(owned,mode,phase),driver=path.join(area,'driver'),out=path.join(area,'out'),pdf=path.join(area,'pdf-operation'),completion=path.join(driver,'phase-completed.json');
const write=(file,bytes)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);return file;};
const json=(file,value)=>write(file,JSON.stringify(value,null,2)+'\n');
const ref=file=>{const bytes=fs.readFileSync(file);return{file,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};};
fs.mkdirSync(path.join(owned,mode,'user-data'),{recursive:true});
console.log('M220 bounded fixture child actually started');console.error('M220 fixture stderr before close');
const started=write(path.join(out,'child-started.log'),'Node protocol fixture; no native application.\n');
const raw=json(path.join(out,'raw.json'),{componentFixtureOnly:true,pid:process.pid});
const P=json(path.join(driver,'P.json'),{componentFixtureOnly:true,observedNodePid:process.pid});
const post=json(path.join(driver,'post.json'),{componentFixtureOnly:true});
const sql=json(path.join(driver,'sql','proof.json'),{componentFixtureOnly:true,notSqlVerification:true});
const sqlTool=json(path.join(driver,'sql','tool.json'),{componentFixtureOnly:true});
const sqlCapture=json(path.join(driver,'sql','command.json'),{componentFixtureOnly:true,notCommandCapture:true});
const sidecar=json(path.join(out,'IPC-'+randomUUID()+'.json'),{randomRuntimeSidecar:true});
const scratch=json(path.join(driver,'sql','scratch-'+randomUUID(),'rows.json'),{boundedScratch:true,referenceGraph:[ref(path.join(root,'inputs/outside.json'))]});
json(path.join(area,'phase-reserved.json'),{componentFixtureOnly:true});
if(phase==='exercise'||scenario==='database-output'||scenario==='database-tamper')write(path.join(owned,mode,'user-data','customers.sqlite'),'protocol fixture database output, not SQLite');
const emptyOut=write(path.join(driver,'sql','stdout.log'),''),emptyErr=write(path.join(driver,'sql','stderr.log'),'');
let marker=null;const extra=[];
if(phase==='exercise'){
 marker=json(path.join(pdf,'marker.json'),{componentFixtureOnly:true,notPdfOperation:true});
 extra.push(marker,write(path.join(pdf,'mock-report.pdf'),'Protocol fixture bytes; not a generated PDF.'),write(path.join(pdf,'mock-page.png'),'Protocol fixture bytes; not a screenshot.'),write(path.join(pdf,'mock-report.html'),'<p>protocol fixture</p>'));
}
const artifacts=[started,raw,P,post,sql,sqlTool,sqlCapture,sidecar,scratch,emptyOut,emptyErr,...extra].map(ref);
const record={schema:'desktop176-driver-phase-completion/1',appVersion:'1.0.38',status:'completed',mode,phaseID:phase,pid:process.pid,source:ref(fileURLToPath(import.meta.url)),config:ref(path.join(root,'inputs/config.json')),inputFreeze:ref(options['--freeze']),buildCapture:ref(path.join(root,'inputs/build.json')),workflowSource:ref(path.join(root,'inputs/workflow.mjs')),userData:path.join(owned,mode,'user-data'),raw:ref(raw),process:ref(P),post:ref(post),sql:ref(sql),sqlTool:ref(sqlTool),sqlCapture:ref(sqlCapture),marker:marker?ref(marker):null,artifacts,requiresExternalCaptureAndReview:true,noPublicationApprovedHere:true};
if(scenario==='wrong-mode')record.mode=mode==='Development'?'Installed':'Development';
if(scenario==='wrong-phase')record.phaseID=phase==='exercise'?'resume':'exercise';
if(scenario==='wrong-freeze')record.inputFreeze.sha256='0'.repeat(64);
if(scenario==='unknown-field')record.extra=true;
if(scenario==='wrong-sha')record.artifacts.find(row=>row.file===sidecar).sha256='0'.repeat(64);
if(scenario==='too-many-artifacts')record.artifacts.push(...Array.from({length:256},()=>({...record.artifacts[0]})));
if(scenario==='huge-declared-bytes')record.artifacts[0].bytes=256*1024*1024+1;
if(scenario==='wrong-bytes')record.artifacts.find(row=>row.file===sidecar).bytes++;
if(scenario==='missing')fs.unlinkSync(sidecar);
if(scenario==='tamper')fs.appendFileSync(sidecar,'tamper');
if(scenario==='outside')record.artifacts.push(ref(path.join(root,'inputs/outside.json')));
if(scenario==='duplicate')record.artifacts.push({...record.artifacts[0]});
if(scenario==='hardlink'){const alias=path.join(out,'same-file.json');fs.linkSync(raw,alias);record.artifacts.push(ref(alias));}
if(scenario==='empty-nonlog')record.artifacts.push(ref(write(path.join(out,'empty.json'),'')));
if(scenario==='self-cycle')record.artifacts.push({file:completion,sha256:'0'.repeat(64),bytes:1});
if(scenario==='capture-cycle')record.artifacts.push({file:path.join(capture,'stdout.log'),sha256:'0'.repeat(64),bytes:1});
if(scenario==='static-tamper')fs.appendFileSync(path.join(root,'inputs/config.json'),' ');
if(scenario==='delete-entry')fs.unlinkSync(fileURLToPath(import.meta.url));
if(scenario!=='no-manifest'){
 if(scenario==='empty-manifest')write(completion,'');
 else if(scenario==='malformed-manifest')write(completion,'{invalid');
 else json(completion,record);
}
if(scenario==='nonzero')process.exitCode=7;
