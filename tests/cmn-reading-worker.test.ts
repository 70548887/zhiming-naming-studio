import {afterAll,beforeAll,expect,it} from 'vitest';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import{performance}from'node:perf_hooks';import{build}from'esbuild';
import {CmnReadingWorkerHost,cmnReadingWorkerFile} from '../src/main/cmn-reading-worker-host';
import{CMN_READING_INPUTS}from'../src/main/cmn-reading-pins';
const parent=fs.realpathSync.native(os.tmpdir()),data=path.resolve('data');let dir:string,entry:string,fault:string;const hosts:CmnReadingWorkerHost[]=[];
const host=(file=entry,options={requestTimeoutMs:5000,idleTimeoutMs:100})=>{const h=new CmnReadingWorkerHost(file,options);hosts.push(h);return h;};
beforeAll(async()=>{dir=fs.realpathSync.native(fs.mkdtempSync(path.join(parent,'cmn-worker-test-')));entry=path.join(dir,'cmn-reading-worker.cjs');fault=path.join(dir,'data');await build({entryPoints:[path.resolve('src/main/cmn-reading-worker.ts')],outfile:entry,bundle:true,platform:'node',target:'node22',format:'cjs',logLevel:'silent'});fs.mkdirSync(fault);for(const p of CMN_READING_INPUTS){const rel=p.file.slice(5),dst=path.join(fault,rel);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(path.join(data,rel),dst);fs.chmodSync(dst,0o600);}},15000);
afterAll(async()=>{await Promise.all(hosts.map(h=>h.close()));if(dir){if(!dir.startsWith(parent+path.sep))throw Error('Unsafe cleanup');fs.rmSync(dir,{recursive:true,force:true});}});
function fixture(name:string,body:string){const file=path.join(dir,name+'.cjs');fs.writeFileSync(file,"const{parentPort}=require('node:worker_threads');\n"+body,{flag:'wx'});return file;}
it('resolves only the explicit dist-electron entry from the original app data root',()=>{expect(cmnReadingWorkerFile(path.join(dir,'data'))).toBe(path.join(dir,'dist-electron/cmn-reading-worker.cjs'));expect(cmnReadingWorkerFile(path.join(dir,'app.asar/data'))).toBe(path.join(dir,'app.asar/dist-electron/cmn-reading-worker.cjs'));});
it('runs cold CPU parsing in a real Node Worker while the parent timer responds',async()=>{
  const h=host(),started=performance.now();let firedAt=0,settled=false,beats=0;const heartbeat=setInterval(()=>beats++,5);const timer=new Promise<void>(r=>setTimeout(()=>{firedAt=performance.now();r();},0));
  const pending=h.query('长',data).then(q=>{settled=true;return q;});await timer;expect(settled).toBe(false);let q;try{q=await pending;}finally{clearInterval(heartbeat);}
  expect(beats).toBeGreaterThan(2);expect(q.options.map(o=>o.pinyin)).toEqual(['cháng','zhàng','zhǎng']);expect(q.currentDefault?.pinyin).toBe('cháng');expect(h.snapshot().pending).toBe(0);
  console.info('CMN_REAL_WORKER_TIMER',{timerMs:firedAt-started,totalMs:performance.now()-started,heartbeatTicks:beats});
},10000);
it('correlates simultaneous queries and retains actual references and unavailable results',async()=>{
  const h=host(),chars=['行','沈','重','长','燚','行'];const results=await Promise.all(chars.map(c=>h.query(c,data)));expect(results.map(q=>q.char)).toEqual(chars);expect(results[0].options.map(o=>o.pinyin)).toEqual(['xíng','háng','xìng','hàng']);expect(results[1].references[0].selectable).toBe(false);expect(results[2].status).toBe('unavailable');expect(results[4].status).toBe('unavailable');
},10000);
it('rejects same-size/same-mtime source tampering after a successful worker query',async()=>{
  const h=host(),file=path.join(fault,'raw/kTraditionalVariant.txt'),original=fs.readFileSync(file),time=new Date('2020-01-01T00:00:00.000Z');fs.utimesSync(file,time,time);await h.query('长',fault);const before=fs.statSync(file,{bigint:true}),changed=Buffer.from(original);changed[changed.length-1]^=1;fs.writeFileSync(file,changed);fs.utimesSync(file,time,time);expect(fs.statSync(file,{bigint:true}).mtimeNs).toBe(before.mtimeNs);expect(fs.statSync(file).size).toBe(original.length);
  try{await expect(h.query('长',fault)).rejects.toThrow('source rejected');}finally{fs.writeFileSync(file,original);fs.utimesSync(file,time,time);}expect((await h.query('长',fault)).status).toBe('available');
},10000);
it('settles missing startup entry and actual worker errors rather than hanging',async()=>{
  await expect(host(path.join(dir,'missing.cjs')).query('行',data)).rejects.toThrow('worker error');
  const bad=fixture('throws',"throw new Error('actual startup failure');");await expect(host(bad).query('行',data)).rejects.toThrow('worker error');
});
it('rejects protocol errors and bounds unresponsive worker requests',async()=>{
  const wrong=fixture('wrong',"parentPort.postMessage({version:'wrong',kind:'ready'});");const h=host(wrong);await expect(h.query('行',data)).rejects.toThrow('invalid protocol');expect(h.snapshot().active).toBe(false);
  const original=JSON.parse(fs.readFileSync(path.resolve('tests/fixtures/cmn-reading-query-m141.json'),'utf8')).queries.find((q:{char:string})=>q.char==='长');
  for(const [name,change]of [['null-option','q.options=[null];'],['unknown-source',"q.source.profileSha256='unknown';"]]){
    const bad=fixture(name,"const q="+JSON.stringify(original)+";"+change+"parentPort.postMessage({version:'cmn-reading-worker/1.0.0',kind:'ready'});parentPort.on('message',m=>parentPort.postMessage({version:'cmn-reading-worker/1.0.0',kind:'result',id:m.id,query:q}));");
    await expect(host(bad).query('长',data)).rejects.toThrow('invalid response');
  }
  const silent=fixture('silent',"parentPort.on('message',()=>{});");const slow=host(silent,{requestTimeoutMs:150,idleTimeoutMs:100});await expect(slow.query('行',data)).rejects.toThrow('timed out');expect(slow.snapshot().pending).toBe(0);expect(slow.snapshot().active).toBe(false);
});
it('close rejects pending work, terminates the worker and prevents later restart',async()=>{
  const silent=fixture('close-silent',"parentPort.on('message',()=>{});"),h=host(silent),pending=h.query('行',data);const rejected=expect(pending).rejects.toThrow('closed');await h.close();await rejected;expect(h.snapshot()).toEqual({active:false,pending:0,closed:true});await expect(h.query('行',data)).rejects.toThrow('closed');
});
it('bounds the queue and retires an idle worker without changing the result',async()=>{
  const h=new CmnReadingWorkerHost(entry,{requestTimeoutMs:5000,idleTimeoutMs:30,maxPending:1});hosts.push(h);const first=h.query('行',data);await expect(h.query('长',data)).rejects.toThrow('queue full');expect((await first).char).toBe('行');await new Promise(r=>setTimeout(r,80));expect(h.snapshot().active).toBe(false);
},10000);
