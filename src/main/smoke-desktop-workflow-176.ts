import type {BrowserWindow} from 'electron';
import fs from 'node:fs';import {join,dirname} from 'node:path';import {createHash} from 'node:crypto';import {isDeepStrictEqual as equal} from 'node:util';
import initSqlJs from 'sql.js';
import type {Bootstrap,BirthProfile,NamingSession,SessionRevision,StudioAPI,CharacterEntry} from '../shared/types';
import type {CmnReadingQuery} from '../shared/cmn-reading';
import type {ParentNameReading,ParentNameReadingConfirmIntent} from '../shared/parent-name-phonetics';
import {canonicalPlainJson} from '../shared/plain-json';
import {normalizePreferences} from '../shared/workflow';
import {Store} from './store';import type {StudioService} from './service';
import {loadNamingEditorialV71Data} from './naming-editorial-v7-data';
import {reportHTML} from './report';
import {withNamingV7Deadline,reloadNamingV7Page} from './smoke-naming-v7-waits';
import {assertDesktop176Context,assertDesktop176PhaseMethod,writeDesktop176Artifact,desktop176ArtifactPath,readDesktop176Ref,desktop176FileRef,type Desktop176Context} from './smoke-desktop-workflow-176-context';
import {DESKTOP176_SCHEMA,DESKTOP176_WORKFLOW,DESKTOP176_SCENARIOS,DESKTOP176_REPRESENTATIVES,desktop176Inputs,assertDesktop176ProjectSaved,assertDesktop176PreservedLegacy,serializeDesktop176ResolvedResponse,assertDesktop176RawResult,parseDesktop176TestInputFreeze,assertDesktop176OnboardingObservation,assertDesktop176ExerciseProcessSource,type Desktop176RendererOnboarding,type Desktop176Inputs,type Desktop176Ref,type Desktop176Scenario,type Desktop176Response,type Desktop176Pdf,type Desktop176Screenshot,type Desktop176ScenarioResult,type Desktop176ResumeSeal,type Desktop176RawResult,type Desktop176ExerciseExit} from './smoke-desktop-workflow-176-contract';
import resourceContract from '../../scripts/verification/review-resources-138.json';
const sha=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
const plain=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
function fact(value:unknown,message:string):asserts value{if(!value)throw new Error('桌面176验收：'+message);}
const withoutToken=(session:NamingSession)=>{const copy=plain(session);delete copy.reviewToken;return copy;};
const canon=(value:unknown)=>canonicalPlainJson(value);
const currentRows=(store:Store)=>(store.db.exec('SELECT id,json FROM sessions ORDER BY id')[0]?.values??[]).map(([id,json])=>({id:String(id),raw:String(json),session:JSON.parse(String(json)) as NamingSession}));
const historyRows=(store:Store)=>(store.db.exec('SELECT id,session_id,json FROM revisions ORDER BY id')[0]?.values??[]).map(([id,sessionId,json])=>({id:Number(id),sessionId:String(sessionId),raw:String(json)}));
const profiles=(store:Store)=>(store.db.exec('SELECT id,json FROM profiles ORDER BY id')[0]?.values??[]).map(([id,json])=>({id:String(id),raw:String(json)}));
const dbRef=(store:Store)=>desktop176FileRef(join(store.userDir,'customers.sqlite'));
function sqlState(store:Store){return{database:dbRef(store),current:currentRows(store).map(row=>({id:row.id,rawSha256:sha(row.raw),canonical:canon(row.session)})),history:historyRows(store).map(row=>({...row,rawSha256:sha(row.raw)})),profiles:profiles(store).map(row=>({id:row.id,canonical:canon(JSON.parse(row.raw))}))};}
/** Exact runtime payload identity, not source-TS presence inside an installed App. */
export function verifyDesktop176Resources(appRoot:string,workerReceipt:Desktop176Ref){
 fact(resourceContract.applicationVersion==='1.0.38'&&Object.keys(resourceContract.files).length===137,'需要独立138的固定137件资源。');
 const contractFile=join(appRoot,'scripts/verification/review-resources-138.json');
 // The contract is compiled into main. Its source file is an external frozen
 // plan reference; installed payloads do not have to ship scripts/verification.
 const rows=Object.entries(resourceContract.files).map(([file,pin])=>{
  fact((file.startsWith('data/')||file.startsWith('assets/'))&&!file.includes('\\')&&!file.split('/').some(part=>!part||part==='.'||part==='..'),'资源相对路径不合法。');
  const content=fs.readFileSync(join(appRoot,file));fact(content.length===pin.bytes&&sha(content)===pin.sha256,'实际138资源不同：'+file);return{file,bytes:content.length,sha256:sha(content)};
 });
 const spec=resourceContract.generatedWorker,receiptBytes=fs.readFileSync(join(appRoot,spec.receiptFile));
 fact(receiptBytes.length===workerReceipt.bytes&&sha(receiptBytes)===workerReceipt.sha256,'实际worker回执与本次构建引用不符。');
 const receipt=JSON.parse(receiptBytes.toString('utf8')),worker=fs.readFileSync(join(appRoot,spec.outputFile));
 fact(receipt.schema==='cmn-worker-build-receipt/1'&&receipt.entry===spec.entry&&receipt.protocol===spec.protocol&&receipt.esbuildVersion===spec.esbuildVersion&&equal(receipt.inputFiles,spec.inputFiles)&&equal(receipt.buildScript,spec.buildScript)&&receipt.output?.file===spec.outputFile&&receipt.output.bytes===worker.length&&receipt.output.sha256===sha(worker),'worker完整产物与精确输入/入口/回执不符。');
 fact(spec.requiredTokens.every(token=>worker.toString('utf8').includes(token)),'worker入口协议缺失。');
 return{profile:resourceContract.profile,compiledContractCanonicalSha256:sha(canon(resourceContract)),sourceContractPathIfPresent:fs.existsSync(contractFile)?contractFile:null,files:rows,worker:{file:spec.outputFile,bytes:worker.length,sha256:sha(worker),receiptSha256:sha(receiptBytes),buildId:receipt.buildId},scope:'actual-runtime-files-and-current-build-reference;not-source-directory-or-age-proof'};
}
export function assertDesktop176MaterialBinding(plan:Desktop176Inputs):void{
 fact(plan.workflowSource.file.replaceAll('\\','/').endsWith('/src/main/smoke-desktop-workflow-176.ts'),'来源引用必须指向正式176工作流源码。');
 const freeze=parseDesktop176TestInputFreeze(JSON.parse(readDesktop176Ref(plan.inputFreeze).toString('utf8')));
 fact(freeze.files['src/main/smoke-desktop-workflow-176.ts']===plan.workflowSource.sha256,'工作流源码没有绑定本次最终输入freeze。');
 fact(canon(JSON.parse(readDesktop176Ref(plan.materialIdentity.resourceContract).toString('utf8')))===canon(resourceContract),'资料合同引用不是实际编译进main的137件合同。');
 const staticBindings=[['rootFeedbackManifest','assets/bazi-root-feedback/1.3.1/resource-manifest.json'],['naming71Profile','data/naming-character-meanings-v7.1-profile.json'],['naming71Admission','data/naming-character-meanings-v7.1-admission.json'],['naming71Lock','data/naming-character-meanings-v7.1-source-lock.json'],['parentMethod','data/parent-name-phonetics-method-v1.json']] as const;
 for(const[key,file]of staticBindings){const pin=(resourceContract.files as Record<string,{sha256:string;bytes:number}>)[file],ref=plan.materialIdentity[key];fact(ref.sha256===pin.sha256&&ref.bytes===pin.bytes,'资料身份被其他版本/文件顶替：'+key);readDesktop176Ref(ref);}
 const tuple=plan.materialIdentity.applicationTupleSource;readDesktop176Ref(tuple);fact(freeze.files['src/shared/naming-element-application.ts']===tuple.sha256,'应用tuple源码不属于同一最终freeze。');
}
function errorData(error:unknown):unknown{if(!(error instanceof Error)){canonicalPlainJson(error);return{received:error};}const record:Record<string,unknown>={name:error.name};for(const key of Object.getOwnPropertyNames(error)){const value=Object.getOwnPropertyDescriptor(error,key);fact(value&&Object.hasOwn(value,'value'),'不可执行错误对象访问器。');record[key]=value.value instanceof Error?errorData(value.value):value.value;}canonicalPlainJson(record);return record;}
/** The same capturer is used by every actual window.studio invocation. It
 * persists the complete JSON payload as received, never a projected summary. */
export function createDesktop176IpcCapture(context:Desktop176Context,execute:(method:keyof StudioAPI,args:unknown[])=>Promise<unknown>){
 const records:Desktop176Response[]=[];
 return{records,async call<T>(scenarioId:Desktop176Scenario,method:keyof StudioAPI,args:unknown[]=[]):Promise<T>{
  assertDesktop176PhaseMethod(context,method);
  const requestId=context.prefix+'-'+String(records.length+1).padStart(4,'0');
  const request=writeDesktop176Artifact(context,requestId+'-request.json',JSON.stringify({requestId,scenarioId,method,args})+'\n');
  try{const received=await execute(method,args),encoded=serializeDesktop176ResolvedResponse(received),response=writeDesktop176Artifact(context,requestId+'-response.json',encoded);records.push({requestId,scenarioId,method,responseKind:'resolved',transport:'renderer-preload-ipc',serialization:'complete-JSON-of-structured-value-as-received',request,response});return JSON.parse(encoded) as T;}
  catch(error){const response=writeDesktop176Artifact(context,requestId+'-response.json',JSON.stringify(errorData(error))+'\n');records.push({requestId,scenarioId,method,responseKind:'rejected',transport:'renderer-preload-ipc',serialization:'complete-JSON-of-structured-value-as-received',request,response});throw error;}
 }};
}
/** Native file routes are called only through existing registered preload IPC.
 * The first restore imports the exact synthetic old70 witness; the second uses
 * the one backup created in this exercise. Resume cannot call any of them. */
export function createDesktop176FileRoutes(service:StudioService,context:Desktop176Context,print:(session:NamingSession,file:string)=>Promise<string>){
 assertDesktop176Context(context,service.store.userDir);let restores=0,backup:Desktop176Ref|undefined;const reports:Desktop176Pdf[]=[];
 const exercise=()=>{assertDesktop176Context(context,service.store.userDir);fact(context.plan.phaseID==='exercise','resume只读，禁止文件写入API。');};
 return{
  restore(){exercise();fact(restores<2,'只允许旧70导入和本次备份恢复。');const ref=restores===0?context.plan.legacy70.database:backup;fact(ref,'先创建本进程备份。');service.store.restore(new Uint8Array(readDesktop176Ref(ref)));restores++;return true;},
  backup(){exercise();fact(restores===1&&!backup,'备份仅在导入旧70后创建一次。');backup=writeDesktop176Artifact(context,context.prefix+'-backup.sqlite',service.store.backupBytes());return backup.file;},
  async report(canonical:NamingSession){exercise();fact(reports.length<3,'只导出三组代表PDF。');const stem=context.prefix+'-report-'+String(reports.length+1).padStart(2,'0');
   const snapshot=writeDesktop176Artifact(context,stem+'-session.json',JSON.stringify(canonical,null,2)+'\n'),html=writeDesktop176Artifact(context,stem+'.html',reportHTML(canonical,service.store.settings())),file=desktop176ArtifactPath(context,stem+'.pdf');
   fact(await print(canonical,file)===file,'原生PDF打印器返回其他目标。');const content=fs.readFileSync(file);fact(content.subarray(0,5).toString()==='%PDF-'&&content.length>2000,'没有实际PDF字节。');reports.push({...desktop176FileRef(file),sessionId:canonical.id,snapshot,html,phaseID:'exercise'});return file;
  },
  receipts(){return plain({restores,backup,reports});}
 };
}
export type Desktop176FileRoutes=ReturnType<typeof createDesktop176FileRoutes>;
export function checkFullRegression(context:Desktop176Context){
 const refs=context.plan.fortyLifecycleEvidence,report=JSON.parse(readDesktop176Ref(refs.report).toString('utf8')),capture=JSON.parse(readDesktop176Ref(refs.commandCapture).toString('utf8'));
 fact(refs.suite==='tests/naming-v71-service-core.test.ts'&&refs.inputFreeze.sha256===context.plan.inputFreeze.sha256&&capture.status==='completed'&&capture.exitCode===0&&capture.signal===null&&capture.sourceFreeze?.sha256===refs.inputFreeze.sha256&&capture.freezeAfter?.sha256===refs.inputFreeze.sha256,'40生命周期必须绑定同一最终完整回归的真实成功命令和freeze。');
 const suite=report.testResults?.find((row:{name?:string})=>row.name?.replaceAll('\\','/').endsWith('/'+refs.suite));
 fact(report.success===true&&suite?.assertionResults?.length===12&&suite.assertionResults.every((row:{status:string})=>row.status==='passed')&&suite.assertionResults.filter((row:{title:string})=>row.title.startsWith('actual71 characters batch ')).length===8,'最终full未实际包含完整12项/8独立5字批次。');
 const freeze=parseDesktop176TestInputFreeze(JSON.parse(readDesktop176Ref(refs.inputFreeze).toString('utf8')));fact(freeze.files[refs.suite]===refs.testSource.sha256,'40生命周期suite源码没有绑定最终freeze。');
 return{suite:refs.suite,actualCases:12,independentFiveCharacterBatches:8,characterCount:40,evidence:refs,scope:'separate-final-full-regression-not-desktop40-generation'};
}
async function legacySource(context:Desktop176Context,dataDir:string){
 const proof=JSON.parse(readDesktop176Ref(context.plan.legacy70.sqlProof).toString('utf8'));fact(proof.expectedVersion==='1.0.37'&&proof.ok===true&&proof.bindings?.length===3&&proof.database?.sha256After===context.plan.legacy70.database.sha256,'旧70真native SQL绑定回执不符。');
 const SQL=await initSqlJs({locateFile:()=>join(dataDir,'../node_modules/sql.js/dist/sql-wasm.wasm')}),database=new SQL.Database(new Uint8Array(readDesktop176Ref(context.plan.legacy70.database)));
 try{
  const current=(database.exec('SELECT id,json FROM sessions ORDER BY id')[0]?.values??[]).map(([id,raw])=>({id:String(id),raw:String(raw),session:JSON.parse(String(raw)) as NamingSession}));
  const history=(database.exec('SELECT id,session_id,json FROM revisions ORDER BY id')[0]?.values??[]).map(([id,sessionId,raw])=>({id:Number(id),sessionId:String(sessionId),raw:String(raw)}));
  fact(current.length===3&&history.length===23&&current.every(row=>row.session.namingRules?.version==='naming-editorial-7.0.0'),'旧70原件应为3个真实旧命名方案/23历史。');
  for(const row of current){const binding=proof.bindings.find((value:{sessionId:string})=>value.sessionId===row.id);fact(binding?.sqlJsonSha256===sha(row.raw),'旧70 SQL原JSON不符。');const snapshotRef=context.plan.legacy70.snapshots.find(ref=>ref.sha256===binding.snapshotSha256);fact(snapshotRef&&canon(JSON.parse(readDesktop176Ref(snapshotRef).toString('utf8')))===canon(row.session),'必须按SQLbinding选完整原snapshot，不猜导出时点。');}
  for(const row of history)fact(proof.historyBindings.find((value:{revisionId:number})=>value.revisionId===row.id)?.sqlJsonSha256===sha(row.raw),'旧历史原始JSON不符。');
  return{current,history,proofRef:context.plan.legacy70.sqlProof};
 }finally{database.close();}
}
async function screenshot(window:BrowserWindow,context:Desktop176Context,scenario:Desktop176Scenario,session:NamingSession):Promise<{ref:Desktop176Screenshot;ui:unknown}>{
 window.setSize(1100,800);
 const ui=await withNamingV7Deadline('desktop176:ui:'+scenario,()=>window.webContents.executeJavaScript(`(async()=>{const wait=async(fn,label)=>{for(let i=0;i<250;i++){const value=fn();if(value)return value;await new Promise(r=>setTimeout(r,40));}throw Error('desktop176 UI '+label);};const nav=async(label)=>(await wait(()=>[...document.querySelectorAll('nav .nav-item')].find(node=>node.textContent.includes(label)),label)).click();await nav('方案与报告');(await wait(()=>[...document.querySelectorAll('.session-item')].find(node=>node.getAttribute('title')?.includes(${JSON.stringify(session.id)})),'saved session')).click();await wait(()=>document.querySelector('.session-item[aria-current="true"]')?.getAttribute('title')?.includes(${JSON.stringify(session.id)}),'selected');await nav('起名工作台');(await wait(()=>[...document.querySelectorAll('.name-card .name-main')].find(node=>node.textContent.includes(${JSON.stringify(session.candidates[0].fullName)})),'candidate')).click();const dialog=await wait(()=>document.querySelector('[role="dialog"]'),'detail');await document.fonts.ready;const text=dialog.innerText;return{sessionId:${JSON.stringify(session.id)},name:${JSON.stringify(session.candidates[0].fullName)},text,character71Rows:dialog.querySelectorAll('.naming-review-character71-ready').length,projectPanels:dialog.querySelectorAll('.saved-project-naming-use').length,parentPanels:dialog.querySelectorAll('.saved-parent-phonetics').length,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};})()`),20000);
 fact(!ui.horizontalOverflow&&ui.text.includes(session.candidates[0].fullName),'真实详情未出现保存姓名或布局溢出。');
 if(scenario==='naming71-character40')fact(ui.character71Rows>0&&ui.text.includes('7.1'),'代表详情未显示实际71逐字说明。');
 if(scenario==='project131-family-review')fact(ui.text.includes('1.3.1')&&ui.parentPanels>0&&ui.text.includes('林沐')&&ui.text.includes('陈子'),'真实详情缺项目或父母保存面板。');
 let image=await window.webContents.capturePage();if(image.getSize().width>1280)image=image.resize({width:1280});let png=image.toPNG();for(let i=0;png.length>500000&&i<6;i++){image=image.resize({width:Math.floor(image.getSize().width*.85)});png=image.toPNG();}
 fact(png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&png.length<=500000,'截图须为原生PNG且小于500KB。');const width=png.readUInt32BE(16),height=png.readUInt32BE(20);fact(width<=1280&&height<=1280,'PNG尺寸超过1280px。');
 const ref={...writeDesktop176Artifact(context,context.prefix+'-'+scenario+'.png',png),mime:'image/png' as const,width,height,phaseID:'exercise' as const};
 await window.webContents.executeJavaScript(`document.querySelector('[role="dialog"] button[aria-label="关闭"]')?.click()`);return{ref,ui};
}
async function observeOnboarding(window:BrowserWindow,phaseID:'exercise'|'resume',expected?:Desktop176RendererOnboarding){
 const observation=await window.webContents.executeJavaScript(`(async()=>{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return{storageKey:'studio.onboarding.v1',rawValue:localStorage.getItem('studio.onboarding.v1'),guideVisible:!!document.querySelector('.first-use-guide')};})()`);
 return assertDesktop176OnboardingObservation(observation,phaseID,expected);
}
export async function smokeDesktopWorkflow176(window:BrowserWindow,service:StudioService,context:Desktop176Context,files:Desktop176FileRoutes,metadata:{appVersion:string;preloadPath:string;rendererNetworkAttempts:()=>unknown[]}):Promise<Desktop176RawResult>{
 assertDesktop176Context(context,service.store.userDir);fact(!!process.versions.electron&&metadata.appVersion==='1.0.38'&&window.webContents.getURL().startsWith('file:'),'仅实际1.0.38 Electron file窗口可运行。');fact(service.store.settings().useAi===false,'隔离App禁止AI。');
 const startedAt=new Date().toISOString(),appRoot=dirname(service.store.dataDir),executable=desktop176FileRef(process.execPath),plan=context.plan;
 fact(metadata.preloadPath===join(appRoot,'dist-electron/preload.cjs'),'preload不属于本App。');
 assertDesktop176MaterialBinding(plan);const resourceReceipt=verifyDesktop176Resources(appRoot,plan.materialIdentity.workerReceipt);
 fact(JSON.parse(fs.readFileSync(join(appRoot,'package.json'),'utf8')).version==='1.0.38','实际App package版本不同。');
 const runtimeProcess=writeDesktop176Artifact(context,context.prefix+'-live-process.json',JSON.stringify({schema:'desktop176-live-process/1',pid:process.pid,executable,mode:plan.mode,phaseID:plan.phaseID,userData:service.store.userDir,appRoot,runtimeVersions:process.versions,preload:desktop176FileRef(metadata.preloadPath),resourceReceipt,postExitReceipt:'outer-driver-only'},null,2)+'\n');
 const bridge=await window.webContents.executeJavaScript(`({protocol:location.protocol,nodeRequire:typeof require,userAgent:navigator.userAgent,methods:['bootstrap','generate','saveProfile','saveSession','listHistory','restoreHistory','getCmnReadingOptions','confirmParentNameReading','searchCharacters','backup','restore','exportReport'].map(method=>[method,typeof window.studio?.[method]])})`);
 fact(bridge.protocol==='file:'&&bridge.nodeRequire==='undefined'&&bridge.userAgent.includes('Electron/')&&bridge.methods.every((row:string[])=>row[1]==='function'),'真实隔离preload bridge不完整。');
 const transport=createDesktop176IpcCapture(context,(method,args)=>withNamingV7Deadline('desktop176:ipc:'+method,()=>window.webContents.executeJavaScript(`window.studio[${JSON.stringify(method)}](...${JSON.stringify(args)})`),method==='exportReport'?90000:['generate','restore','backup'].includes(method)?60000:30000));
 const call=transport.call.bind(transport),networkAttempts:unknown[]=[],oldFetch=globalThis.fetch;globalThis.fetch=(async(...args:unknown[])=>{networkAttempts.push({kind:'main-fetch',target:String(args[0])});throw Error('desktop176 offline');}) as typeof fetch;
 try{
  if(plan.phaseID==='resume'){
   fact(plan.resume,'缺exercise退出后的固定resume输入。');const sealBytes=readDesktop176Ref(plan.resume.seal),runtimeInputBefore=desktop176FileRef(plan.resume.seal.file),seal=JSON.parse(sealBytes.toString('utf8')) as Desktop176ResumeSeal;
   const prior=JSON.parse(readDesktop176Ref(plan.resume.exerciseResult).toString('utf8')) as Desktop176RawResult,exit=JSON.parse(readDesktop176Ref(plan.resume.exerciseProcessReceipt).toString('utf8')) as Desktop176ExerciseExit;
   assertDesktop176RawResult(prior);fact(prior.status==='awaiting-resume'&&prior.phaseID==='exercise'&&prior.mode===plan.mode&&prior.pid===seal.exercisePid&&prior.pid!==process.pid&&equal(prior.executable,executable)&&prior.userData===context.userData,'resume的前进程/模式/程序/目录身份不同。');
   fact(seal.rendererOnboarding,'resume seal缺exercise真实引导观察。');const rendererOnboarding=await observeOnboarding(window,'resume',seal.rendererOnboarding);
   fact(exit.schema==='naming-studio-desktop176-process/1'&&exit.appVersion==='1.0.38'&&exit.phaseID==='exercise'&&exit.mode===plan.mode&&exit.pid===seal.exercisePid&&exit.exitCode===0&&exit.naturalExit===true&&equal(exit.executable,executable)&&exit.userData===context.userData&&equal(exit.result,plan.resume.exerciseResult)&&equal(exit.inputFreeze,plan.inputFreeze)&&equal(exit.workflowSource,plan.workflowSource)&&Number.isFinite(Date.parse(exit.terminalAt))&&Date.parse(exit.terminalAt)>=Date.parse(prior.completedAt)&&Date.parse(exit.terminalAt)<=Date.parse(startedAt),'exercise须真实退出，且外层post-exit原件须绑定该raw结果和退出时序。');
   assertDesktop176ExerciseProcessSource(exit,JSON.parse(readDesktop176Ref(exit.stageProcess).toString('utf8')));
   const expected=JSON.parse(readDesktop176Ref(seal.state).toString('utf8')),before=sqlState(service.store);fact(before.database.sha256===seal.database.sha256,'resume Store启动后数据库已改变。');
   const scenarios:Desktop176ScenarioResult[]=[];
   for(const id of DESKTOP176_SCENARIOS){const boot=await call<Bootstrap>(id,'bootstrap');const sessionIds=seal.scenarioSessionIds[id];for(const sessionId of sessionIds){const saved=boot.sessions.find(row=>row.id===sessionId);fact(saved&&canon(saved)===expected.current.find((row:{id:string})=>row.id===sessionId)?.canonical,'独立进程bootstrap保存结果不同。');if(id==='project131-family-review')assertDesktop176ProjectSaved(saved,expected.projectOriginal);const history=await call<SessionRevision[]>(id,'listHistory',[sessionId]);const actual=history.map(row=>({id:Number(row.id),canonical:canon(row.session)}));const wanted=expected.history.filter((row:{sessionId:string})=>row.sessionId===sessionId).map((row:{id:number;raw:string})=>({id:row.id,canonical:canon(JSON.parse(row.raw))}));fact(equal(actual.sort((a,b)=>a.id-b.id),wanted.sort((a:{id:number},b:{id:number})=>a.id-b.id)),'独立进程历史原结果不同。');}
    const old=prior.scenarios.find(row=>row.scenarioId===id)!;scenarios.push({...old,responseRequestIds:transport.records.filter(row=>row.scenarioId===id).map(row=>row.requestId),evidence:{...old.evidence,rendererOnboarding,resume:{newPid:process.pid,exercisePid:seal.exercisePid,bootstrapAndHistoryPreserved:true,readOnly:true}}});
   }
   const after=sqlState(service.store),runtimeInputAfter=desktop176FileRef(plan.resume.seal.file);readDesktop176Ref(plan.resume.seal);fact(equal(runtimeInputBefore,runtimeInputAfter)&&equal(runtimeInputBefore,plan.resume.seal),'resume运行期间seal原件被修改。');fact(equal(before,after)&&equal(before.current,expected.current)&&equal(before.history,expected.history)&&equal(before.profiles,expected.profiles),'resume改变DB或完整current/history/profile不符。');
   const sqlProof=writeDesktop176Artifact(context,context.prefix+'-sql-proof.json',JSON.stringify({schema:'desktop176-resume-sql/1',before,after,unchanged:true,seal:plan.resume.seal},null,2)+'\n');
   const result:Desktop176RawResult={schema:DESKTOP176_SCHEMA,workflowId:DESKTOP176_WORKFLOW,appVersion:'1.0.38',mode:plan.mode,phaseID:'resume',status:'completed',captureCompleteness:'full-original-responses',pid:process.pid,executable,userData:context.userData,startedAt,completedAt:new Date().toISOString(),inputFreeze:plan.inputFreeze,workflowSource:plan.workflowSource,materialIdentity:plan.materialIdentity,runtimeProcess,sqlProof,originalResponses:transport.records,scenarios,reopenScope:'separate-process-resume',generationCoverage:'representative-only',coverageInventory40:prior.coverageInventory40,fortyLifecycleEvidence:prior.fortyLifecycleEvidence,resumeSeal:plan.resume.seal,resumeEvidence:{exercisePid:seal.exercisePid,resumePid:process.pid,exerciseResult:plan.resume.exerciseResult,exerciseProcessReceipt:plan.resume.exerciseProcessReceipt,runtimeInputBefore,runtimeInputAfter},AIEnabled:false,networkAttempts,rendererNetworkAttempts:plain(metadata.rendererNetworkAttempts()),nativeExecutionRequiredForAcceptance:true,scope:'actual separate App process read-only IPC resume; no generation/save/backup/export and no self post-exit receipt'};
   assertDesktop176RawResult(result);return result;
  }
  const exerciseOnboarding=await observeOnboarding(window,'exercise');
  const initial=await call<Bootstrap>('legacy70-canonical','bootstrap');fact(!initial.sessions.length&&!initial.profiles.length&&!historyRows(service.store).length,'exercise须为新隔离库。');
  const legacy=await legacySource(context,service.store.dataDir);fact(await call<boolean>('legacy70-canonical','restore')===true,'真实IPC旧70导入失败。');
  const checkLegacy=()=>{const now=currentRows(service.store);for(const old of legacy.current){const saved=now.find(row=>row.id===old.id);fact(saved,'旧70保存行丢失。');assertDesktop176PreservedLegacy(old.session,saved.session,true);}for(const old of legacy.history)fact(historyRows(service.store).find(row=>row.id===old.id)?.raw===old.raw,'旧70原history JSON改变。');};checkLegacy();
  const fullRegression=checkFullRegression(context),published=loadNamingEditorialV71Data(service.store.dataDir),inventoryRows:unknown[]=[];
  for(const row of published.profile.cases){const found=await call<CharacterEntry[]>('naming71-character40','searchCharacters',[row.char]);fact(equal(found.find(entry=>entry.char===row.char),row.baselineCharacter),'40条原字典IPC身份不同。');inventoryRows.push({caseId:row.caseId,char:row.char,selectedPinyin:row.selectedPinyin,dictionaryFromActualIpc:found.find(entry=>entry.char===row.char),projectExplanationFromFixedReadonlyLoader:row.editorial,original:row.original,scoreDelta:row.scoreDelta,scope:row.scope,wholeNameAssessment:row.wholeNameAssessment,explanationIpcExists:false});}
  fact(inventoryRows.length===40&&new Set(published.profile.cases.map(row=>row.caseId)).size===40,'固定40清单不完整。');
  const coverageInventory40=writeDesktop176Artifact(context,context.prefix+'-inventory40.json',JSON.stringify({schema:'desktop176-inventory40/1',generationCoverage:'representative-only',representatives:DESKTOP176_REPRESENTATIVES,rows:inventoryRows,source:plan.materialIdentity.naming71Profile,explanationReadScope:'actual-fixed-main-loader-not-a-new-IPC-endpoint',fullLifecycle:fullRegression},null,2)+'\n');
  const generated71:NamingSession[]=[];
  for(const char of DESKTOP176_REPRESENTATIVES){const input=desktop176Inputs('desktop176-'+plan.mode+'-71-'+char,char),session=(await call<{session:NamingSession}>('naming71-character40','generate',[input.profile,input.preferences])).session;
   fact(session.namingRules?.version==='naming-editorial-7.1.0'&&session.candidates.length===1&&session.candidates[0].givenName===char,'没有真实71代表生成。');const snapshot=session.candidates[0].namingMeaningReview;fact(snapshot?.version==='naming-editorial-7.1.0'&&snapshot.scoreDelta===0&&snapshot.automaticSemanticCreditAllowed===false&&snapshot.rows[0].kind==='character-level-project-explanation'&&snapshot.rows[0].characterExplanation.status==='character-explanations-ready','代表没有实际消费新增单字说明。');
   const approved=published.profile.cases.find(row=>row.char===char)!;fact(snapshot.rows[0].characterExplanation.rows[0].caseId===approved.caseId&&session.candidates[0].meaning.includes(approved.editorial.meaning.replace(/[。；;]+$/g,'')),'代表说明没有完整来源绑定。');generated71.push(await call<NamingSession>('naming71-character40','saveSession',[{...session,reviewNote:'desktop176实际71代表保存'}]));
  }
  const input=desktop176Inputs('desktop176-'+plan.mode+'-project-family','沐',true),readings:ParentNameReading[]=[];
  for(const [role,char,pinyin,tone]of [['father','沐','mù',4],['mother','子','zi',5]] as const){const query=await call<CmnReadingQuery>('project131-family-review','getCmnReadingOptions',[char]),option=query.options.find(row=>row.pinyin===pinyin&&row.tone===tone);fact(option,'实际worker没有所需固定来源候选。');const intent:ParentNameReadingConfirmIntent={role,fullName:role==='father'?'林沐':'陈子',surnameLength:1,readings:[{position:0,char,origin:'dictionary',option}]};readings.push(await call<ParentNameReading>('project131-family-review','confirmParentNameReading',[input.profile,intent]));}
  input.profile.parentNameReadings=readings;await call<BirthProfile>('project131-family-review','saveProfile',[input.profile]);
  const original=(await call<{session:NamingSession}>('project131-family-review','generate',[input.profile,input.preferences])).session;assertDesktop176ProjectSaved(original);
  const draft=plain(original);draft.preferences={...draft.preferences,preferredElements:['水']};draft.reviewNote='desktop176保存人工水草稿，仍保留原项目采用';let project=await call<NamingSession>('project131-family-review','saveSession',[draft]);assertDesktop176ProjectSaved(project,original);
  fact(equal(normalizePreferences(project.preferences).preferredElements,['水']),'读UI normalize丢失水草稿。');
  const beforeCAS=dbRef(service.store);let rejected=false;try{const stale=plain(original);stale.reviewNote='应拒绝的过期窗口';await call('project131-family-review','saveSession',[stale]);}catch{rejected=true;}fact(rejected&&equal(beforeCAS,dbRef(service.store)),'过期CAS没有拒绝或改变DB。');
  const note=plain(project);note.reviewNote='desktop176归档真实水草稿';project=await call<NamingSession>('project131-family-review','saveSession',[note]);const histories=await call<SessionRevision[]>('project131-family-review','listHistory',[project.id]),target=histories.find(row=>equal(row.session.preferences.preferredElements,['水']));fact(target,'没有真实水草稿历史。');project=await call<NamingSession>('project131-family-review','restoreHistory',[project.id,target.id,project.reviewRevision,project.reviewToken]);assertDesktop176ProjectSaved(project,original);
  const beforeBackup=(await call<Bootstrap>('project131-family-review','bootstrap')).sessions,backup=await call<string>('project131-family-review','backup');fact(backup===files.receipts().backup?.file,'backup没有受控OUT路径。');
  const changed=plain(project);changed.reviewNote='只存在于备份后的改动';await call('project131-family-review','saveSession',[changed]);fact(await call<boolean>('project131-family-review','restore')===true,'真实备份恢复失败。');
  let boot=await call<Bootstrap>('project131-family-review','bootstrap');for(const old of beforeBackup){const restored=boot.sessions.find(row=>row.id===old.id);fact(restored&&canon(withoutToken(restored))===canon(withoutToken(old))&&restored.reviewToken!==old.reviewToken,'backup恢复没有保留完整方案事实并旋转token。');}project=boot.sessions.find(row=>row.id===project.id)!;assertDesktop176ProjectSaved(project,original);checkLegacy();
  const beforeReopen=dbRef(service.store),reader=await new Store(service.store.userDir,service.store.dataDir,join(appRoot,'node_modules/sql.js/dist/sql-wasm.wasm')).init();
  try{for(const old of boot.sessions)fact(canon(reader.readVerifiedSession(old.id))===canon(old),'真实新Store重开结果不同。');}finally{reader.db.close();}
  await reloadNamingV7Page(window.webContents);boot=await call<Bootstrap>('project131-family-review','bootstrap');fact(equal(beforeReopen,dbRef(service.store)),'renderer reload或新Store只读核对改变DB。');
  const selectedLegacy=legacy.current.find(row=>row.session.candidates.some(candidate=>candidate.givenName==='斐然'))??legacy.current[0];
  const byScenario:Record<Desktop176Scenario,NamingSession[]>={'legacy70-canonical':legacy.current.map(row=>boot.sessions.find(session=>session.id===row.id)!),'naming71-character40':generated71.map(row=>boot.sessions.find(session=>session.id===row.id)!),'project131-family-review':[boot.sessions.find(row=>row.id===project.id)!]};
  const representatives:Record<Desktop176Scenario,NamingSession>={'legacy70-canonical':boot.sessions.find(row=>row.id===selectedLegacy.id)!,'naming71-character40':byScenario['naming71-character40'][0],'project131-family-review':byScenario['project131-family-review'][0]};
  const scenarios:Desktop176ScenarioResult[]=[];
  for(const scenarioId of DESKTOP176_SCENARIOS){const session=representatives[scenarioId];await call<string>(scenarioId,'exportReport',[session]);const pdf=files.receipts().reports.at(-1)!;fact(pdf.sessionId===session.id,'PDF没有绑定实际导出会话。');const shot=await screenshot(window,context,scenarioId,session);scenarios.push({scenarioId,status:'passed',customerIds:byScenario[scenarioId].map(row=>row.profileId),sessionIds:byScenario[scenarioId].map(row=>row.id),responseRequestIds:transport.records.filter(row=>row.scenarioId===scenarioId).map(row=>row.requestId),screenshot:shot.ref,pdf,artifactPhase:'exercise',evidence:{ui:shot.ui,...(scenarioId==='legacy70-canonical'?{completeCanonicalPreserved:true,historyRawPreserved:true,originalSqlProof:plan.legacy70.sqlProof}:scenarioId==='naming71-character40'?{inventoryCount:40,generatedRepresentatives:3,generationCoverage:'representative-only',notesDoNotAddScore:true,fullLifecycleEvidence:plan.fortyLifecycleEvidence}:{projectMethod:'project-bazi-mainchain-145/1.3.1',applicationPolicy:'naming-element-application/1.0.0',generationPreferredElements:[],reviewPreferredElements:['水'],traditionalScore:40,parentsConfirmed:true,casRejectedWithoutDatabaseChange:true,historyRestored:true,backupRestored:true,rendererReloadAndNewStoreReadPreserved:true})}});}
  checkLegacy();const finalState=sqlState(service.store),state=writeDesktop176Artifact(context,context.prefix+'-resume-state.json',JSON.stringify({...finalState,projectOriginal:original},null,2)+'\n');
  const rendererOnboarding=await observeOnboarding(window,'exercise',exerciseOnboarding);for(const scenario of scenarios)scenario.evidence.rendererOnboarding=rendererOnboarding;
  const seal:Desktop176ResumeSeal={schema:'desktop176-resume-seal/1',workflowId:DESKTOP176_WORKFLOW,appVersion:'1.0.38',mode:plan.mode,exercisePid:process.pid,userData:context.userData,inputFreeze:plan.inputFreeze,workflowSource:plan.workflowSource,database:finalState.database,state,scenarioSessionIds:Object.fromEntries(scenarios.map(row=>[row.scenarioId,row.sessionIds])) as Record<Desktop176Scenario,string[]>,rendererOnboarding};
  const resumeSeal=writeDesktop176Artifact(context,context.prefix+'-resume-seal.json',JSON.stringify(seal,null,2)+'\n'),sqlProof=writeDesktop176Artifact(context,context.prefix+'-sql-proof.json',JSON.stringify({schema:'desktop176-exercise-sql/1',...finalState,legacyCanonicalPreserved:true,files:files.receipts(),bridge},null,2)+'\n');
  const result:Desktop176RawResult={schema:DESKTOP176_SCHEMA,workflowId:DESKTOP176_WORKFLOW,appVersion:'1.0.38',mode:plan.mode,phaseID:'exercise',status:'awaiting-resume',captureCompleteness:'full-original-responses',pid:process.pid,executable,userData:context.userData,startedAt,completedAt:new Date().toISOString(),inputFreeze:plan.inputFreeze,workflowSource:plan.workflowSource,materialIdentity:plan.materialIdentity,runtimeProcess,sqlProof,originalResponses:transport.records,scenarios,reopenScope:'renderer-reload-and-store-reopen',generationCoverage:'representative-only',coverageInventory40,fortyLifecycleEvidence:plan.fortyLifecycleEvidence,resumeSeal,AIEnabled:false,networkAttempts,rendererNetworkAttempts:plain(metadata.rendererNetworkAttempts()),nativeExecutionRequiredForAcceptance:true,scope:'actual built App preload IPC,representative71 and fixed40 inventory,SQL/history/backup/native3PDF/3PNG; separate-process resume still required'};
  assertDesktop176RawResult(result);return result;
 }finally{globalThis.fetch=oldFetch;await service.closeCmnReadingWorker();}
}
