import * as fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join,resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createContext,runInContext,runInNewContext} from 'node:vm';
import * as ts from 'typescript';

export const SQL_SHA='4b59b59967c9774c8e2064aff2cab6a4e705856c907c0e69cf4e8c8b077bf3f7';
export const PROVENANCE_SHA='a9a2a82698de5c6eb1a5532e3f33faa1805a9fec7460c4112e33720ebecfb805';
export const ENV_KEYS=['NAMING_STUDIO_SMOKE_SCOPE','NAMING_STUDIO_SMOKE','NAMING_STUDIO_USER_DATA','NAMING_STUDIO_SMOKE_EXIT','NAMING_STUDIO_V7_LEGACY_SQL','NAMING_STUDIO_V7_LEGACY_PROVENANCE'] as const;
export const STARTUP_EVENTS=['app.getAppPath','app.getPath','app.setPath','app.requestSingleInstanceLock','app.whenReady','Store.constructor','Store.init','Secret.constructor','Secret.read','StudioService.constructor','BrowserWindow.constructor'] as const;
export type Env=Record<string,string|undefined>;
export interface Event {name:string;detail?:unknown;}
export interface Fixture {root:string;out:string;user:string;sql:string;provenance:string;env:Env;cleanup:()=>void;}
export const sha=(bytes:string|Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
export function productPaths(){return{main:resolve(process.env.NAMING_SMOKE_V7_ENTRY_MAIN||'src/main/main.ts'),preflight:resolve(process.env.NAMING_SMOKE_V7_PREFLIGHT||'src/main/smoke-naming-v7-preflight.ts')};}
export function fixture(label:string):Fixture {
 const requestedParent=resolve(process.env.NAMING_SMOKE_V7_TEST_WORK||join(tmpdir(),'naming-v7-entry-tests'));
 fs.mkdirSync(requestedParent,{recursive:true});
 // Windows TEMP may use an8.3 alias. Test fixtures must supply the real
 // ordinary path required by production; do not relax its alias rejection.
 const parent=fs.realpathSync.native(requestedParent);const root=fs.mkdtempSync(join(parent,label+'-')),out=join(root,'out'),user=join(root,'user');
 fs.mkdirSync(out);fs.mkdirSync(user);
 const sql=resolve('tests/fixtures/naming-session-1.0.34.sqlite'),provenance=resolve('tests/fixtures/naming-session-1.0.34-provenance.json');
 const env:Env={...process.env};for(const key of ENV_KEYS)delete env[key];
 Object.assign(env,{NAMING_STUDIO_SMOKE_SCOPE:'naming-v7',NAMING_STUDIO_SMOKE:out,NAMING_STUDIO_USER_DATA:user,NAMING_STUDIO_SMOKE_EXIT:'1',NAMING_STUDIO_V7_LEGACY_SQL:sql,NAMING_STUDIO_V7_LEGACY_PROVENANCE:provenance});
 return{root,out,user,sql,provenance,env,cleanup:()=>{const resolved=resolve(root);if(!resolved.startsWith(parent+requirePathSeparator()))throw new Error('Unsafe test cleanup');fs.rmSync(resolved,{recursive:true,force:true});}};
}
function requirePathSeparator(){return process.platform==='win32'?'\\':'/';}
export function tree(root:string):string[] {
 const result:string[]=[];const visit=(dir:string,prefix:string)=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const relative=prefix+entry.name,p=join(dir,entry.name);if(entry.isSymbolicLink())result.push(relative+'@'+fs.readlinkSync(p));else if(entry.isDirectory()){result.push(relative+'/');visit(p,relative+'/');}else result.push(relative+':'+sha(fs.readFileSync(p)));}};visit(root,'');return result.sort();
}
export interface RunOptions {env:Env;smokeThrow?:boolean;writeFailure?:boolean;smokeResult?:Record<string,unknown>;directOut?:string;onlyPreflight?:boolean;afterPreflight?:(env:Env)=>void;}
export interface EntryRun {events:Event[];writes:string[];attemptedWrites:string[];stderr:string;exits:number[];uncaught:string[];context?:unknown;smokeArgs?:unknown[];mainSha:string;preflightSha:string;}
export async function runEntry(options:RunOptions):Promise<EntryRun> {
 const paths=productPaths(),mainSource=fs.readFileSync(paths.main,'utf8'),preflightSource=fs.readFileSync(paths.preflight,'utf8');
 const result:EntryRun={events:[],writes:[],attemptedWrites:[],stderr:'',exits:[],uncaught:[],mainSha:sha(mainSource),preflightSha:sha(preflightSource)};
 const event=(name:string,detail?:unknown)=>result.events.push({name,...(detail===undefined?{}:{detail})});
 const nativeRequire=createRequire(join(process.cwd(),'package.json'));
 const inputNames=new Set([options.env.NAMING_STUDIO_V7_LEGACY_SQL,options.env.NAMING_STUDIO_V7_LEGACY_PROVENANCE].filter(Boolean));
 let activeArtifact='';
 const wrappedFs={...fs,
  readFileSync:(...args:unknown[])=>{event('fs.read',typeof args[0]==='string'?(inputNames.has(args[0])?'legacy-input':args[0]):'fd');return (fs.readFileSync as (...a:unknown[])=>unknown)(...args);},
  writeFileSync:(file:fs.PathOrFileDescriptor,bytes:unknown,...rest:unknown[])=>{const name=String(file);result.attemptedWrites.push(name);event('fs.write.attempt',name);if(options.writeFailure&&(activeArtifact==='naming-v7-smoke-result.json'||name.includes('naming-v7-smoke-result')))throw new Error('TEST_RESULT_WRITE_FAILURE');(fs.writeFileSync as (...a:unknown[])=>unknown)(file,bytes,...rest);result.writes.push(name);event('fs.write',name);},
  renameSync:(from:fs.PathLike,to:fs.PathLike)=>{fs.renameSync(from,to);event('fs.rename',String(to));result.writes.push(String(to));},
  mkdirSync:(...args:unknown[])=>{result.attemptedWrites.push(String(args[0]));throw new Error('Unexpected product mkdir: '+String(args[0]));},
  unlinkSync:(file:fs.PathLike)=>{fs.unlinkSync(file);event('fs.unlink',String(file));},
 };
 const windowsEnv=new Proxy({...options.env},{get:(target,key)=>typeof key==='string'?target[Object.keys(target).find(name=>name.toLowerCase()===key.toLowerCase())||key]:Reflect.get(target,key)});
 const fakeProcess={env:process.platform==='win32'?windowsEnv:{...options.env},platform:process.platform,versions:process.versions,version:process.version,pid:process.pid,cwd:()=>process.cwd(),stderr:{write:(value:unknown)=>{result.stderr+=String(value);event('stderr');return true;}},stdout:{write:()=>true},exit:(code=0)=>{result.exits.push(code);event('process.exit',code);},exitCode:undefined as number|undefined};
 const common={Buffer,URL,console:{log:()=>{},error:(...args:unknown[])=>{result.stderr+=args.map(String).join(' ')+'\n';event('console.error');},warn:()=>{}},process:fakeProcess,setTimeout,clearTimeout,setImmediate,clearImmediate,Uint8Array};
 const compile=(source:string,file:string)=>ts.transpileModule(source,{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 const preflightModule:{exports:Record<string,unknown>}={exports:{}};
 const nativeFile=join(dirname(paths.preflight),'smoke-naming-v7-native-writer.ts'),nativeModule:{exports:Record<string,unknown>}={exports:{}};
 const nativeImporter=(id:string)=>{if(id==='node:child_process'){const original=nativeRequire(id) as typeof import('node:child_process');return{...original,execFileSync:(...args:unknown[])=>{if(options.writeFailure&&activeArtifact==='naming-v7-smoke-result.json')throw new Error('TEST_RESULT_WRITE_FAILURE');return(original.execFileSync as (...values:unknown[])=>unknown)(...args);}};}return nativeRequire(id);};
 runInNewContext(compile(fs.readFileSync(nativeFile,'utf8'),nativeFile),{...common,module:nativeModule,exports:nativeModule.exports,require:nativeImporter,__dirname:dirname(nativeFile),__filename:nativeFile},{filename:nativeFile});
 const nativeOriginal=nativeModule.exports.nativeWriteNamingV7Artifact as (...args:unknown[])=>unknown;
 nativeModule.exports.nativeWriteNamingV7Artifact=(...args:unknown[])=>{const file=String(args[1]);result.attemptedWrites.push(file);event('native.writer.attempt',file);const returned=nativeOriginal(...args);result.writes.push(file);event('native.writer.success',file);return returned;};
 const preflightRequire=(id:string)=>{if(id==='node:fs')return wrappedFs;if(id==='./smoke-naming-v7-native-writer')return nativeModule.exports;if(id==='node:child_process'){const original=nativeRequire(id) as typeof import('node:child_process');return{...original,execFileSync:(...args:unknown[])=>{event('windows.attributes',{executable:args[0],flags:(args[1] as string[]).slice(0,4)});return(original.execFileSync as (...values:unknown[])=>unknown)(...args);}};}return nativeRequire(id);};
 runInNewContext(compile(preflightSource,paths.preflight),{...common,module:preflightModule,exports:preflightModule.exports,require:preflightRequire,__dirname:dirname(paths.preflight),__filename:paths.preflight},{filename:paths.preflight});
 const preflight={...preflightModule.exports};
 const realPreflight=preflight.preflightNamingV7Smoke as (out?:string)=>unknown;
 preflight.preflightNamingV7Smoke=(out?:string)=>{event('preflight.begin');try{const value=realPreflight(out);result.context=value;event('preflight.passed');options.afterPreflight?.(fakeProcess.env);return value;}catch(error){event('preflight.rejected',String(error));throw error;}};
 for(const key of ['writeNamingV7SmokeArtifact','writeNamingV7SmokeFile'])if(typeof preflight[key]==='function'){
  const original=preflight[key] as (...args:unknown[])=>unknown;
  preflight[key]=(...args:unknown[])=>{const previous=activeArtifact;activeArtifact=String(args[1]).split(/[\\/]/).pop()!;event('artifact.request',activeArtifact);try{return original(...args);}finally{activeArtifact=previous;}};
 }
 const record=()=>{const target=process.env.NAMING_SMOKE_V7_TRACE_FILE;if(target)fs.appendFileSync(target,JSON.stringify({user:options.env.NAMING_STUDIO_USER_DATA,scope:options.env.NAMING_STUDIO_SMOKE_SCOPE,onlyPreflight:options.onlyPreflight,...result})+'\n');};
 if(options.onlyPreflight){try{(preflight.preflightNamingV7Smoke as (out?:string)=>unknown)(options.directOut);}catch(error){result.uncaught.push(String(error));}record();return result;}
 const settings=()=>({apiBaseUrl:'https://local-fixture.invalid/v1'});
 class FakeStore {constructor(...args:unknown[]){event('Store.constructor',args);}async init(){event('Store.init');return this;}settings=settings;}
 class FakeSecret {constructor(...args:unknown[]){event('Secret.constructor',args);}read(){event('Secret.read');return '';}}
 class FakeService {store:FakeStore;constructor(store:FakeStore){event('StudioService.constructor');this.store=store;}}
 class FakeWindow {
  webContents={setWindowOpenHandler:()=>{},on:()=>{},executeJavaScript:async(code:string)=>{if(/^window\.__smokeReady\s*=\s*true;?$/.test(code.trim())){event('smoke-ready');return true;}event('declared-guide-fixture');return{firstUseShown:true,text:'父母 本地',skipped:true};},capturePage:()=>{throw new Error('Actual capture is forbidden in entry tests');}};
  constructor(...args:unknown[]){event('BrowserWindow.constructor',args);}async loadFile(){event('window.loadFile');}once(){}show(){}isDestroyed(){return false;}
 }
 const app={getAppPath:()=>{event('app.getAppPath');return process.cwd();},getPath:(name:string)=>{event('app.getPath',name);return options.env.NAMING_STUDIO_USER_DATA;},setPath:(...args:unknown[])=>event('app.setPath',args),requestSingleInstanceLock:()=>{event('app.requestSingleInstanceLock');return true;},on:()=>{},whenReady:()=>{event('app.whenReady');return Promise.resolve();},getVersion:()=>'test-entry-only',quit:()=>event('app.quit'),exit:(code:number)=>{event('app.exit',code);result.exits.push(code);}};
 const smoke=(name:string)=>async(...args:unknown[])=>{event(name);if(name==='smokeNamingV7'){result.smokeArgs=args;if(options.smokeThrow)throw new Error('TEST_SMOKE_FAILURE');return options.smokeResult||{complete:true,completed:true,status:'passed'};}return{fixture:true};};
 const controlledModules=new Map<string,{exports:Record<string,unknown>}>(),controlledRealm=createContext({...common});
 const controlledSources:Record<string,{relative:string;pin:string;imports:Record<string,string>}>= {
  './customer-backup-file':{relative:'customer-backup-file.ts',pin:'054565fdcf39e04d38f4540c97a71c76129bd6a7f4ad28809a0855efe1c9cc98',imports:{'node:fs':'controlled-fs'}},
  '../shared/restore-result':{relative:'../shared/restore-result.ts',pin:'144d9dc15d739deadf0030c3023bfc89f1cf7105d570d450d62cd9fea57b91fa',imports:{}},
  '../shared/customer-write-notice':{relative:'../shared/customer-write-notice.ts',pin:'0f0c401c19fbef8590933d90fbee0e58f91c115f43a3b98790120ce28bc49b93',imports:{}},
  './writer-finalization':{relative:'writer-finalization.ts',pin:'63a117ade3b6236dd9cdc6fc3d23f0233ea42563ad4191ac63cbaf3df9b52ab6',imports:{'node:async_hooks':'node:async_hooks','node:crypto':'node:crypto','../shared/customer-write-notice':'../shared/customer-write-notice'}},
  './customer-write-notice-invocation':{relative:'customer-write-notice-invocation.ts',pin:'c4d0782ff3294010f2af0d032983a6724ba536c930d69369fcd16f984f1740c7',imports:{}},
  './customer-write-notice-transport':{relative:'customer-write-notice-transport.ts',pin:'f13f0cdc7317a8415de3164650fb8f18f583d97268e899d05371483e4067426a',imports:{'./writer-finalization':'./writer-finalization','../shared/customer-write-notice':'../shared/customer-write-notice','./customer-write-notice-invocation':'./customer-write-notice-invocation'}}
 };
 const loadControlledModule=(id:string):Record<string,unknown>=>{
  const cached=controlledModules.get(id);if(cached)return cached.exports;
  const spec=controlledSources[id];if(!spec)throw new Error('Uncontrolled main dependency '+id);
  const file=join(dirname(paths.main),spec.relative),source=fs.readFileSync(file,'utf8');if(sha(source)!==spec.pin)throw new Error('Controlled main dependency source drift '+id);
  const loaded:{exports:Record<string,unknown>}={exports:{}};controlledModules.set(id,loaded);
  const requireControlled=(dependency:string):unknown=>{
   const target=spec.imports[dependency];if(!target)throw new Error('Uncontrolled dependency '+dependency+' in '+id);
   if(target==='controlled-fs')return wrappedFs;if(target==='node:async_hooks'||target==='node:crypto')return nativeRequire(target);return loadControlledModule(target);
  };
  const wrapper=runInContext('(function(module,exports,require,__filename,__dirname){\n'+compile(source,file)+'\n})',controlledRealm,{filename:file}) as(module:{exports:Record<string,unknown>},exports:Record<string,unknown>,require:(id:string)=>unknown,filename:string,dirname:string)=>void;
  wrapper(loaded,loaded.exports,requireControlled,file,dirname(file));return loaded.exports;
 };
 const importer=(id:string):unknown=>{
  if(id==='electron')return{app,BrowserWindow:FakeWindow,dialog:{showErrorBox:()=>event('dialog.showErrorBox')},ipcMain:{handle:()=>{}},safeStorage:{},shell:{}};
  if(id==='node:fs')return wrappedFs;
  if(id==='./customer-backup-file'||id==='../shared/restore-result'||id==='./customer-write-notice-transport')return loadControlledModule(id);
  if(id==='./store')return{Store:FakeStore,atomicWrite:(file:string,bytes:unknown)=>{result.attemptedWrites.push(file);if(options.writeFailure)throw new Error('TEST_RESULT_WRITE_FAILURE');result.writes.push(file);event('atomicWrite',file);void bytes;}};
  if(id==='./service')return{StudioService:FakeService};
  if(id==='./credentials')return{EndpointSecretStorage:FakeSecret};
  if(id==='./smoke-naming-v7-preflight')return preflight;
  if(id.includes('/smoke-'))return new Proxy({},{get:(_target,name)=>name==='__esModule'?false:smoke(String(name))});
  if(id==='./report')return{reportHTML:()=>{throw new Error('Actual report/PDF is not part of this entry test');}};
  if(id==='../shared/session-catalog')return{sessionReportFilename:()=>'',sessionBatchLabel:()=>''};
  if(id.startsWith('node:'))return nativeRequire(id);
  throw new Error('Uncontrolled main dependency '+id);
 };
 const module={exports:{}};
 try{runInNewContext(compile(mainSource,paths.main),{...common,module,exports:module.exports,require:importer,__dirname:dirname(paths.main),__filename:paths.main},{filename:paths.main});}catch(error){result.uncaught.push(String(error));}
 for(let index=0;index<8;index++)await new Promise<void>(done=>setImmediate(done));
 if(typeof fakeProcess.exitCode==='number')result.exits.push(fakeProcess.exitCode);
 record();
 return result;
}

export function oldScopeBlocks(source:string):Record<string,string> {
 const file=ts.createSourceFile('main.ts',source,ts.ScriptTarget.Latest,true),blocks:Record<string,string>={};
 const visit=(node:ts.Node)=>{if(ts.isIfStatement(node)){const condition=node.expression.getText(file),match=/NAMING_STUDIO_SMOKE_SCOPE\s*===\s*['"]([^'"]+)['"]/.exec(condition);if(match&&match[1]!=='naming-v7')blocks[match[1]]=node.getText(file).replace(/\r\n/g,'\n');}ts.forEachChild(node,visit);};visit(file);return blocks;
}
