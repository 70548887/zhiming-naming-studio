import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import type {Socket} from 'node:net';
import {performance} from 'node:perf_hooks';
import {createServer,type ViteDevServer} from 'vite';
import initSqlJs from 'sql.js';
import {studioDevPlugin} from '../../scripts/dev-plugin';
import {Store} from '../../src/main/store';
import {bindCompactCustomerDatabase,isCompactCustomerDatabase} from '../../src/main/compact-customer-store';

const workspace=fs.realpathSync.native(process.cwd());
const dataDirectory=path.join(workspace,'data');
const wasmFile=createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm');
const temporaryRoot=fs.realpathSync.native(os.tmpdir());
const directoryPrefix='naming-m869-http-';
const evidenceDirectory=path.join(workspace,'.local','m869-helper');
const ownedDirectories=new Set<string>();
const transports=new Set<HttpTransport>();
const appTransports=new WeakMap<M869HttpApp,HttpTransport>();
const operations:Array<Record<string,unknown>>=[];
let initializationQueue=Promise.resolve();

export interface M869HttpResponse<T=unknown> {status:number;body:T;}
export interface M869HttpApp {
  directory:string;
  baseUrl:string;
  port:number;
  server:ViteDevServer;
  bootstrapResponse:M869HttpResponse;
  close():Promise<void>;
}
interface HttpTransport {
  directory:string;
  baseUrl:string;
  port:number;
  server:ViteDevServer;
  sockets:Set<Socket>;
  closed:boolean;
  closing?:Promise<void>;
}
export interface M869SqlSnapshot {
  sessions:Array<{id:string;json:string}>;
  revisions:Array<{id:number;session_id:string;created_at:string;json:string}>;
  profiles:Array<{id:string;json:string}>;
  databaseSha256:string;
}
export interface M869BackupResult {magic:string;bytes:number;sha256:string;}

const sha256=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');

function assertPlainDirectory(directory:string):void {
  const stat=fs.lstatSync(directory);
  if(!stat.isDirectory()||stat.isSymbolicLink()||fs.realpathSync.native(directory)!==directory)throw Error('M869 directory is not a plain canonical directory: '+directory);
}

function assertOwnedDirectory(directory:string):void {
  if(!ownedDirectories.has(directory)||path.dirname(directory)!==temporaryRoot||!path.basename(directory).startsWith(directoryPrefix))throw Error('M869 directory is not owned by this fixture: '+directory);
  assertPlainDirectory(directory);
}

/** Check every entry before recursive cleanup; never traverse an outward junction. */
function assertOwnedTree(directory:string):void {
  assertOwnedDirectory(directory);
  const inspect=(entry:string):void=>{
    const stat=fs.lstatSync(entry),real=fs.realpathSync.native(entry),relative=path.relative(directory,real);
    if(stat.isSymbolicLink()||relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative)||real!==entry)throw Error('M869 owned tree contains a link or changed boundary: '+entry);
    if(stat.isDirectory())for(const name of fs.readdirSync(entry))inspect(path.join(entry,name));
  };
  inspect(directory);
}

function writeLedger():void {
  assertPlainDirectory(workspace);
  for(const directory of [path.join(workspace,'.local'),evidenceDirectory]) {
    if(!fs.existsSync(directory))fs.mkdirSync(directory);
    assertPlainDirectory(directory);
  }
  const file=path.join(evidenceDirectory,'runtime-ledger.json');
  if(fs.existsSync(file)) {
    const stat=fs.lstatSync(file);
    if(!stat.isFile()||stat.isSymbolicLink()||fs.realpathSync.native(file)!==file)throw Error('M869 runtime ledger boundary changed');
  }
  const temporary=file+'.'+process.pid+'.'+randomUUID()+'.tmp';
  fs.writeFileSync(temporary,JSON.stringify({suite:'tests/m869-reviewed-http.test.ts',generatedAt:new Date().toISOString(),operations,notes:['HTTP observations record actual route/status/duration; they do not supply test verdicts.','Disk SQL rows are observations only; product Store validation supplies authority.']},null,2)+'\n',{encoding:'utf8',flag:'wx'});
  fs.renameSync(temporary,file);
}

function record(operation:Record<string,unknown>):void {operations.push(operation);writeLedger();}

export function createM869Directory(label:string):string {
  if(!/^[a-z0-9-]+$/.test(label))throw Error('M869 directory label must contain lowercase letters, digits or hyphens');
  const directory=fs.realpathSync.native(fs.mkdtempSync(path.join(temporaryRoot,directoryPrefix+label+'-')));
  ownedDirectories.add(directory);
  assertOwnedDirectory(directory);
  record({operation:'create-owned-directory',directory});
  return directory;
}

async function withPreviewEnvironment<T>(directory:string,run:()=>Promise<T>):Promise<T> {
  let release!:()=>void;
  const previous=initializationQueue;
  initializationQueue=new Promise<void>(resolve=>{release=resolve;});
  await previous;
  const prior=process.env.NAMING_STUDIO_PREVIEW_DATA;
  try {
    assertOwnedTree(directory);
    process.env.NAMING_STUDIO_PREVIEW_DATA=directory;
    return await run();
  } finally {
    if(prior===undefined)delete process.env.NAMING_STUDIO_PREVIEW_DATA;
    else process.env.NAMING_STUDIO_PREVIEW_DATA=prior;
    release();
  }
}

async function closeTransport(transport:HttpTransport):Promise<void> {
  if(transport.closing)return transport.closing;
  if(transport.closed)return;
  transport.closing=(async()=>{
    const started=performance.now();
    try {
      const http=transport.server.httpServer;
      if(http&&'closeIdleConnections' in http)http.closeIdleConnections();
      if(http&&'closeAllConnections' in http)http.closeAllConnections();
      for(const socket of transport.sockets)socket.destroy();
      await transport.server.close();
      if(http?.listening||[...transport.sockets].some(socket=>!socket.destroyed))throw Error('M869 HTTP transport did not fully close');
      transport.closed=true;
      transports.delete(transport);
      record({operation:'close-http-server',directory:transport.directory,port:transport.port,milliseconds:Math.round(performance.now()-started)});
    } catch(error) {
      record({operation:'close-http-server',directory:transport.directory,port:transport.port,milliseconds:Math.round(performance.now()-started),error:error instanceof Error?error.message:String(error)});
      throw error;
    }
  })();
  return transport.closing;
}

async function requestM869(transport:HttpTransport,method:string,args:readonly unknown[],expectedStatus:number):Promise<M869HttpResponse> {
  if(transport.closed||transport.closing||!transport.server.httpServer?.listening)throw Error('M869 HTTP app is closed');
  assertOwnedDirectory(transport.directory);
  if(!/^[A-Za-z][A-Za-z0-9]*$/.test(method)||!Array.isArray(args))throw Error('M869 HTTP request arguments are invalid');
  const route='/__studio_api/'+method,started=performance.now();
  let status:number|undefined,errorMessage:string|undefined;
  try {
    const response=await fetch(transport.baseUrl+route,{method:'POST',headers:{'Content-Type':'application/json','X-Studio-Local-Request':'1'},body:JSON.stringify(args),redirect:'error',signal:AbortSignal.timeout(120000)});
    status=response.status;
    const body:unknown=JSON.parse(await response.text());
    const detail=body!==null&&typeof body==='object'&&'error' in body&&typeof body.error==='string'?': '+body.error.slice(0,400):'';
    if(status!==expectedStatus)throw Error('M869 '+route+' returned HTTP '+status+'; expected '+expectedStatus+detail);
    return {status,body};
  } catch(error) {
    errorMessage=error instanceof Error?error.message:String(error);
    throw error;
  } finally {
    record({operation:'http-post',directory:transport.directory,port:transport.port,route,...(status===undefined?{}:{status}),milliseconds:Math.round(performance.now()-started),...(errorMessage?{error:errorMessage}:{})});
  }
}

/** The real bootstrap request pins the dev plugin's lazy Store before env restore. */
export async function startM869Http(directory?:string,label='app'):Promise<M869HttpApp> {
  const owned=directory??createM869Directory(label);
  assertOwnedDirectory(owned);
  if([...transports].some(transport=>transport.directory===owned&&!transport.closed))throw Error('M869 directory already has an open HTTP app');
  return withPreviewEnvironment(owned,async()=>{
    if([...transports].some(transport=>transport.directory===owned&&!transport.closed))throw Error('M869 directory already has an open HTTP app');
    const server=await createServer({configFile:false,root:workspace,cacheDir:path.join(owned,'vite-cache'),plugins:[studioDevPlugin()],optimizeDeps:{noDiscovery:true,include:[]},server:{host:'127.0.0.1',port:0,strictPort:true,hmr:false},logLevel:'error'});
    const transport:HttpTransport={directory:owned,baseUrl:'',port:0,server,sockets:new Set<Socket>(),closed:false};
    transports.add(transport);
    const http=server.httpServer;
    if(!http){await closeTransport(transport);throw Error('M869 Vite did not create an HTTP server');}
    http.on('connection',(socket:Socket)=>{transport.sockets.add(socket);socket.once('close',()=>transport.sockets.delete(socket));});
    try {
      // Installed Vite treats config port:0 as a fallback in server.listen(). Its
      // native listen wrapper still awaits Vite initServer/buildStart hooks.
      await new Promise<void>((resolve,reject)=>{
        const ready=()=>{http.off('error',failed);resolve();};
        const failed=(error:Error)=>{http.off('listening',ready);reject(error);};
        http.once('error',failed);
        http.once('listening',ready);
        try{http.listen({host:'127.0.0.1',port:0});}
        catch(error){http.off('error',failed);http.off('listening',ready);reject(error);}
      });
      const address=http.address();
      if(!address||typeof address==='string'||address.address!=='127.0.0.1'||address.port===5173||address.port===0)throw Error('M869 expected a random loopback HTTP listener');
      transport.port=address.port;
      transport.baseUrl='http://127.0.0.1:'+address.port;
      const bootstrapResponse=await requestM869(transport,'bootstrap',[],200);
      if(!fs.existsSync(path.join(owned,'customers.sqlite')))throw Error('M869 bootstrap did not persist its owned customers.sqlite');
      const app:M869HttpApp={directory:owned,baseUrl:transport.baseUrl,port:transport.port,server,bootstrapResponse,close:()=>closeTransport(transport)};
      appTransports.set(app,transport);
      record({operation:'start-http-server',directory:owned,port:transport.port,bootstrapStatus:bootstrapResponse.status});
      return app;
    } catch(error) {
      try{await closeTransport(transport);}catch(cleanupError){throw new AggregateError([error,cleanupError],'M869 HTTP startup and cleanup failed');}
      throw error;
    }
  });
}

export async function postM869(app:M869HttpApp,method:string,args:readonly unknown[],expectedStatus=200):Promise<M869HttpResponse> {
  const transport=appTransports.get(app);
  if(!transport)throw Error('M869 HTTP app is not owned by this fixture');
  return requestM869(transport,method,args,expectedStatus);
}

/** Read the actual persisted logical views without opening another product Store. */
export async function snapshotM869Sql(directory:string):Promise<M869SqlSnapshot> {
  assertOwnedTree(directory);
  const bytes=fs.readFileSync(path.join(directory,'customers.sqlite'));
  const SQL=await initSqlJs({locateFile:()=>wasmFile}),db=new SQL.Database(new Uint8Array(bytes));
  try {
    if(isCompactCustomerDatabase(db))bindCompactCustomerDatabase(db);
    db.run('PRAGMA query_only=ON');
    const sessions=(db.exec('SELECT id,json FROM sessions ORDER BY id')[0]?.values??[]).map(([id,json])=>({id:String(id),json:String(json)}));
    const revisions=(db.exec('SELECT id,session_id,created_at,json FROM revisions ORDER BY id')[0]?.values??[]).map(([id,sessionId,createdAt,json])=>({id:Number(id),session_id:String(sessionId),created_at:String(createdAt),json:String(json)}));
    const profiles=(db.exec('SELECT id,json FROM profiles ORDER BY id')[0]?.values??[]).map(([id,json])=>({id:String(id),json:String(json)}));
    const databaseSha256=sha256(bytes);
    record({operation:'snapshot-disk-sql',directory,databaseSha256,databaseBytes:bytes.byteLength,sessions:sessions.length,revisions:revisions.length,profiles:profiles.length});
    return {sessions,revisions,profiles,databaseSha256};
  } finally {db.close();}
}

function assertNoOpenTransport(directory:string):void {
  if([...transports].some(transport=>transport.directory===directory&&!transport.closed))throw Error('M869 close the directory HTTP app before opening a backup/restore Store');
}

async function withOwnedStore<T>(directory:string,action:(store:Store)=>T):Promise<T> {
  assertOwnedTree(directory);
  assertNoOpenTransport(directory);
  const store=new Store(directory,dataDirectory,wasmFile);
  let initialized=false;
  try {await store.init();initialized=true;return action(store);}
  finally {
    if(initialized)store.db.close();
    else try{store.db?.close();}catch{/* Failed init may already have closed its database. */}
  }
}

/** devPlugin has no chooser routes; use real product NSBK after both apps close. */
export async function restoreM869Backup(sourceDirectory:string,targetDirectory:string):Promise<M869BackupResult> {
  assertOwnedTree(sourceDirectory);
  assertOwnedTree(targetDirectory);
  if(sourceDirectory===targetDirectory)throw Error('M869 backup source and restore target must be distinct owned directories');
  assertNoOpenTransport(sourceDirectory);
  assertNoOpenTransport(targetDirectory);
  const started=performance.now();
  const backup=await withOwnedStore(sourceDirectory,store=>store.backupBytes());
  const metadata={magic:Buffer.from(backup.subarray(0,8)).toString('ascii'),bytes:backup.byteLength,sha256:sha256(backup)};
  if(metadata.magic!=='NSBK0001')throw Error('M869 real Store backup did not return the NSBK envelope');
  await withOwnedStore(targetDirectory,store=>store.restore(new Uint8Array(backup)));
  record({operation:'restore-real-store-backup',sourceDirectory,targetDirectory,...metadata,milliseconds:Math.round(performance.now()-started)});
  return metadata;
}

export async function cleanupM869Directories():Promise<void> {
  const failures:unknown[]=[];
  for(const transport of [...transports])try{await closeTransport(transport);}catch(error){failures.push(error);}
  for(const directory of [...ownedDirectories]) {
    try {
      assertNoOpenTransport(directory);
      assertOwnedTree(directory);
      fs.rmSync(directory,{recursive:true,force:false});
      ownedDirectories.delete(directory);
      record({operation:'remove-owned-directory',directory});
    } catch(error){failures.push(error);}
  }
  if(failures.length)throw new AggregateError(failures,'M869 owned fixture cleanup failed');
}
