/** Responsive outer watchdog, independent from each child120s watchdog. */
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
const root=path.resolve(process.argv[2]??'');if(!process.argv[2])throw Error('Evidence root required');
const output=path.join(root,'abba-parent.json');if(fs.existsSync(output))throw Error('Never overwrite an ABBA attempt');
const bundleManifest=JSON.parse(fs.readFileSync(path.join(root,'replay-bundles-r4.json'),'utf8')),order=['a1','b1','b2','a2'],events=[],startedUtc=new Date().toISOString();
let actualPid,activeWatcher,globalTimedOut=false,failedCase;
const write=value=>{fs.writeFileSync(output+'.tmp',JSON.stringify(value,null,2)+'\n');fs.renameSync(output+'.tmp',output);};
const globalTimer=setTimeout(()=>{globalTimedOut=true;events.push({phase:'outer-watchdog160s',utc:new Date().toISOString(),actualPid});try{if(actualPid)process.kill(actualPid,'SIGKILL');}catch{}try{activeWatcher?.kill('SIGKILL');}catch{}},160000);
write({status:'running',parentPid:process.pid,startedUtc,order,events});
try{
 for(const id of order){
  const bundle=bundleManifest.rows.find(row=>row.name===(id.startsWith('a')?'baseline':'candidate')).outfile,begin=new Date().toISOString();
  const code=await new Promise(resolve=>{
   const child=spawn(process.execPath,[path.resolve('scripts/m938-run-watchdog.mjs'),root,bundle,id],{cwd:process.cwd(),env:process.env,stdio:['ignore','pipe','pipe','ipc'],windowsHide:true});activeWatcher=child;
   child.stdout.on('data',bytes=>process.stdout.write(bytes));child.stderr.on('data',bytes=>process.stderr.write(bytes));
   child.on('message',event=>{if(event.phase==='actual-child-started')actualPid=event.pid;events.push(event);write({status:'running',parentPid:process.pid,startedUtc,order,activeCase:id,events});});
   child.on('error',error=>{events.push({id,phase:'watcher-error',error:String(error)});resolve(1);});child.on('exit',code=>resolve(code));
  });
  const terminal={id,phase:'case-terminal',startedUtc:begin,finishedUtc:new Date().toISOString(),code,actualPid};events.push(terminal);actualPid=undefined;activeWatcher=undefined;process.stdout.write(JSON.stringify(terminal)+'\n');
  if(code!==0||globalTimedOut){failedCase=id;throw Error('Stopped after failed case '+id);}
 }
 clearTimeout(globalTimer);write({status:'passed',parentPid:process.pid,startedUtc,finishedUtc:new Date().toISOString(),order,globalTimedOut:false,events});
}catch(error){clearTimeout(globalTimer);write({status:'failed',parentPid:process.pid,startedUtc,finishedUtc:new Date().toISOString(),order,failedCase,globalTimedOut,error:String(error),events});process.exitCode=1;}
