import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {performance} from 'node:perf_hooks';
import {Store} from '../src/main/store';
import {compactDecodeCounters,validateCompactCustomerStorage} from '../src/main/compact-customer-store';
const snapshot=path.resolve(process.env.M882_SNAPSHOT_DB??'D:/Codex-NamingStudio-Evidence/m804-storage-scale-current/.evidence/m804-current-fresh0/stage-snapshots/0025/customers.sqlite');
const out=path.resolve(process.env.M882_PROFILE_OUT??path.join(process.cwd(),'.local/m882-profile/profile.json'));
const wasm=path.resolve('node_modules/sql.js/dist/sql-wasm.wasm');
const timed=(name:string,fn:()=>unknown)=>{const before=compactDecodeCounters(store.db),started=performance.now();const value=fn();const after=compactDecodeCounters(store.db);phases.push({name,elapsedMs:performance.now()-started,decodeDelta:after.snapshots-before.snapshots,rawBytesDelta:after.rawBytes-before.rawBytes});return value;};
let store:Store;const phases:any[]=[];
async function main(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'m882-compact-profile-')),dbDir=path.join(root,'store');fs.mkdirSync(dbDir);fs.copyFileSync(snapshot,path.join(dbDir,'customers.sqlite'));try{
 store=await new Store(dbDir,path.resolve('data'),wasm).init();
 const counts={roots:Number(store.db.exec('SELECT COUNT(*) FROM snapshot_roots')[0].values[0][0]),blobs:Number(store.db.exec('SELECT COUNT(*) FROM snapshot_blobs')[0].values[0][0]),sessions:Number(store.db.exec('SELECT COUNT(*) FROM session_records')[0].values[0][0]),revisions:Number(store.db.exec('SELECT COUNT(*) FROM revision_records')[0].values[0][0]),referencedRoots:Number(store.db.exec("SELECT COUNT(*) FROM snapshot_roots r WHERE EXISTS (SELECT 1 FROM session_records s WHERE s.snapshot_sha=r.sha) OR EXISTS (SELECT 1 FROM revision_records v WHERE v.snapshot_sha=r.sha)")[0].values[0][0])};
 timed('root-compact-json',()=>store.db.exec('SELECT compact_json(sha) FROM snapshot_roots ORDER BY rowid'));
 timed('session-compact-json',()=>store.db.exec('SELECT compact_json(snapshot_sha) FROM session_records ORDER BY rowid'));
 timed('revision-compact-json',()=>store.db.exec('SELECT compact_json(snapshot_sha) FROM revision_records ORDER BY id'));
 timed('full-validateCompactCustomerStorage',()=>validateCompactCustomerStorage(store.db));
 const result={schema:'m882-compact-profile/1',snapshot:{path:snapshot,bytes:fs.statSync(snapshot).size},counts,phases,finalDecodeCounters:compactDecodeCounters(store.db),cpuProfileRequested:true,notes:['Each phase runs the real compact_json SQL function on the same fixed database connection.','Full validation remains unchanged; no cache or validation result is reused.','This profile is diagnostic only; M891 default failure was not rerun.']};fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,counts,phases,finalDecodeCounters:result.finalDecodeCounters}));
 }finally{try{store?.db.close();}catch{}fs.rmSync(root,{recursive:true,force:true});}}
main().catch(error=>{console.error(error);process.exitCode=1;});
