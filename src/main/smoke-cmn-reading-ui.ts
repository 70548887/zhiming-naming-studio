import type {BrowserWindow} from 'electron';
import {reloadNamingV7Page} from './smoke-naming-v7-waits';
import {createCmnSmokeRequestWitness,focusCmnSmokeNativeWindow} from './smoke-cmn-reading-witness';
import type {CmnQuitKind,CmnQuitArmed,CmnQuitReceipt} from './smoke-cmn-reading-quit';
import {lstatSync,realpathSync,readdirSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve,parse,sep,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import type {StudioService} from './service';
import type {BirthProfile,NamingPreferences,NamingSession} from '../shared/types';
import {CMN_READING_INPUTS} from './cmn-reading-pins';

const SCHEMA='cmn-reading-ui-native/1.0.0';
const hash=(value:Uint8Array)=>createHash('sha256').update(value).digest('hex');
function fact(value:unknown,message:string):asserts value{if(!value)throw new Error('普通话桌面验收：'+message);}
const atomicWrite=(file:string,value:string|Uint8Array)=>{writeFileSync(file+'.tmp',value,{flag:'wx'});renameSync(file+'.tmp',file);};
export interface CmnReadingSmokeContext{kind:typeof SCHEMA;caseRoot:string;appRoot:string;userData:string;out:string}
const contexts=new WeakSet<CmnReadingSmokeContext>();
function ordinary(file:string,directory:boolean){
 fact(file.length>0&&isAbsolute(file),'缺少明确的绝对隔离路径。');const absolute=resolve(file),root=parse(absolute).root;let current=root;
 for(const part of absolute.slice(root.length).split(sep).filter(Boolean)){current=join(current,part);const stat=lstatSync(current);fact(!stat.isSymbolicLink(),'拒绝重解析路径：'+current);}
 const stat=lstatSync(absolute);fact(directory?stat.isDirectory():stat.isFile(),'路径类型不符：'+absolute);
 fact(resolve(realpathSync(absolute)).toLowerCase()===absolute.toLowerCase(),'实际路径与声明路径不符。');return absolute;
}
/** The fault/retry scope uses only a fresh extracted app copy,never a worktree,
 * the normal customer directory,or files inside an ASAR. */
export function preflightCmnReadingUiSmoke(appRoot:string):CmnReadingSmokeContext{
 fact(process.env.NAMING_STUDIO_SMOKE_SCOPE==='cmn-reading-ui'&&process.env.NAMING_STUDIO_SMOKE_EXIT==='1','缺少独立scope或退出标记。');
 const caseRoot=ordinary(process.env.NAMING_STUDIO_CMN_CASE_ROOT||'',true);
 fact(resolve(caseRoot)!==parse(caseRoot).root,'case不得是驱动器根目录。');
 const actualApp=ordinary(appRoot,true),userData=ordinary(process.env.NAMING_STUDIO_USER_DATA||'',true),out=ordinary(process.env.NAMING_STUDIO_SMOKE||'',true);
 fact(actualApp===join(caseRoot,'app')&&userData===join(caseRoot,'user-data')&&out===join(caseRoot,'out'),'app/user/out必须是专用case的三个直接子目录。');
 fact(readdirSync(userData).length===0&&readdirSync(out).length===0,'必须使用全新客户库与输出目录。');
 const markerFile=ordinary(join(caseRoot,'cmn-reading-smoke-case.json'),false),marker=JSON.parse(readFileSync(markerFile,'utf8')) as {schema?:string;normalCustomerData?:boolean;appFiles?:{file:string;sha256:string}[]};
 fact(marker.schema===SCHEMA&&marker.normalCustomerData===false&&Array.isArray(marker.appFiles)&&marker.appFiles.length>20,'隔离case清单无效。');
 for(const row of marker.appFiles){fact(typeof row.file==='string'&&!isAbsolute(row.file)&&!row.file.includes(':')&&!row.file.includes('\\')&&!row.file.split('/').some(p=>p===''||p==='.'||p==='..')&&/^[a-f0-9]{64}$/.test(row.sha256),'清单相对路径或摘要无效。');const file=ordinary(join(actualApp,row.file),false);fact(hash(readFileSync(file))===row.sha256,'实际构建副本与清单不符：'+row.file);}
 for(const required of['dist/index.html','dist-electron/main.cjs','dist-electron/preload.cjs','dist-electron/cmn-reading-worker.cjs','package.json'])fact(marker.appFiles.some(row=>row.file===required),'缺少实际构建产物：'+required);
 for(const pin of CMN_READING_INPUTS){const bytes=readFileSync(ordinary(join(actualApp,pin.file),false));fact(bytes.length===pin.bytes&&hash(bytes)===pin.sha256,'固定来源与已审身份不符：'+pin.file);}
 const context:CmnReadingSmokeContext=Object.freeze({kind:SCHEMA,caseRoot,appRoot:actualApp,userData,out});contexts.add(context);return context;
}
export function assertCmnReadingUiSmoke(context:CmnReadingSmokeContext,service?:StudioService){
 fact(contexts.has(context)&&context.kind===SCHEMA,'不是已验证的本进程隔离票据。');
 fact(process.env.NAMING_STUDIO_SMOKE_SCOPE==='cmn-reading-ui'&&process.env.NAMING_STUDIO_SMOKE_EXIT==='1'&&resolve(process.env.NAMING_STUDIO_CMN_CASE_ROOT||'')===context.caseRoot&&resolve(process.env.NAMING_STUDIO_SMOKE||'')===context.out&&resolve(process.env.NAMING_STUDIO_USER_DATA||'')===context.userData,'运行中隔离环境改变。');
 if(service)fact(resolve(service.store.userDir)===context.userData&&resolve(service.store.dataDir)===join(context.appRoot,'data'),'Store不属于该专用case。');
}
export async function cmnSmokeDeadline<T>(stage:string,work:()=>Promise<T>,ms=15000):Promise<T>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([Promise.resolve().then(work),new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>reject(new Error('普通话桌面阶段超时：'+stage)),ms);})]);}finally{if(timer)clearTimeout(timer);}
}
/** Send a real native key sequence. Chromium summary/button Enter activation
 * requires the char CR event;nontext Space/Escape/Tab behavior stays as proven. */
export function sendCmnSmokeKeyboardSequence(contents:Pick<BrowserWindow['webContents'],'sendInputEvent'>,keyCode:string,modifiers:('shift')[]=[]) {
 const nativeKey=keyCode==='Return'?'Enter':keyCode,events:{type:'keyDown'|'char'|'keyUp';keyCode:string;modifiers:('shift')[]}[]=[{type:'keyDown',keyCode:nativeKey,modifiers}];
 if(nativeKey==='Enter')events.push({type:'char',keyCode:'\r',modifiers});
 events.push({type:'keyUp',keyCode:nativeKey,modifiers});for(const event of events)contents.sendInputEvent(event);return events;
}
type WorkerSnapshot={active:boolean;pending:number;closed:boolean};
function hostSnapshot(service:StudioService):WorkerSnapshot{
 const host=(service as unknown as {cmnWorker?:{snapshot:()=>WorkerSnapshot}}).cmnWorker;
 return host?.snapshot()??{active:false,pending:0,closed:false};
}
const TOOLS=[
 'const pause=()=>new Promise(r=>setTimeout(r,8))',
 'const wait=async(fn,label)=>{for(let n=0;n<1500;n++){const v=fn();if(v)return v;await pause();}throw Error("UI wait: "+label)}',
 'const buttons=()=>[...document.querySelectorAll("button")]',
 'const button=text=>buttons().find(b=>b.textContent.trim()===text)',
 'const nav=async text=>{const b=button(text);if(!b)throw Error("Missing nav "+text);b.click();await pause()}',
 'const browser=char=>[...document.querySelectorAll(".cmn-reading-browser")].find(d=>d.querySelector(":scope>summary")?.textContent.endsWith(" · "+char))',
].join(';')+';';

export interface CmnSmokeQuitDraftSnapshot{
 note:{id:string;labels:string[];value:string;disabled:boolean}|null;dirtyCaption:string|null;saveEnabled:boolean;documentHasFocus:boolean;
 guardProbe:{synthetic:boolean;cancelable:boolean;isTrusted:boolean;defaultPrevented:boolean;dispatchReturned:boolean};
 activation:{isActive?:boolean;hasBeenActive?:boolean};
}
/** Readiness describes the actual existing App handler,not a synthetic quit. */
export function cmnSmokeQuitDraftIsReady(snapshot:CmnSmokeQuitDraftSnapshot,draft:string){
 return Boolean(snapshot.note&&snapshot.note.id&&!snapshot.note.disabled&&snapshot.note.labels.includes('审阅备注')&&snapshot.note.value===draft&&snapshot.dirtyCaption==='审阅尚未保存'&&snapshot.saveEnabled&&snapshot.documentHasFocus&&snapshot.guardProbe.synthetic&&snapshot.guardProbe.cancelable&&!snapshot.guardProbe.isTrusted&&snapshot.guardProbe.defaultPrevented&&snapshot.guardProbe.dispatchReturned===false&&snapshot.activation.hasBeenActive===true);
}
/** Read the original onboarding preference;dismiss only its real visible UI. */
export async function ensureCmnSmokeFirstUseGuideClosed(window:BrowserWindow){
 const source=[
  "const visible=e=>e.getClientRects().length>0&&!e.closest('[hidden],[inert]');",
  "const guide=()=>[...document.querySelectorAll('[role=dialog]')].find(d=>visible(d)&&d.querySelector('h2')?.textContent.trim()==='欢迎来到知名起名工作室');",
  "const dismissed=()=>{try{const v=JSON.parse(localStorage.getItem('studio.onboarding.v1'));return v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===2&&v.version===1&&v.dismissed===true;}catch{return false;}};",
 ].join('');
 const found=await cmnSmokeDeadline('actual first-use guide readiness',()=>window.webContents.executeJavaScript('(async()=>{'+source+'for(let n=0;n<375;n++){if(guide())return{shown:true};if(dismissed())return{shown:false,preferenceAlreadyDismissed:true};await new Promise(r=>setTimeout(r,8));}throw Error("Actual first-use guide state not ready");})()'),5000);
 if(!found.shown)return found;await focusCmnSmokeNativeWindow(window);
 const skipFocused=await window.webContents.executeJavaScript('(()=>{'+source+'const d=guide(),b=d&&[...d.querySelectorAll("button")].find(b=>b.textContent.trim()==="先跳过");if(!b)throw Error("Missing actual first-use skip control");b.focus();return document.activeElement===b;})()');fact(skipFocused,'实际首次引导按钮未获得焦点。');
 sendCmnSmokeKeyboardSequence(window.webContents,'Enter');
 return cmnSmokeDeadline('actual first-use guide closed',()=>window.webContents.executeJavaScript('(async()=>{'+source+'for(let n=0;n<375;n++){if(!guide())return{shown:true,actualSkipKeyUsed:true,preferenceDismissed:dismissed()};await new Promise(r=>setTimeout(r,8));}throw Error("Actual first-use guide did not close");})()'),5000);
}
/** Native editing plus an observable original-handler readiness gate. No
 * business flag,substitute listener,returnValue or dialog response is set. */
export async function prepareCmnSmokeQuitDraft(window:BrowserWindow,draft:string,expectedSavedNote:string){
 await ensureCmnSmokeFirstUseGuideClosed(window);await focusCmnSmokeNativeWindow(window);
 const scope=[
  "const visible=e=>e.getClientRects().length>0&&!e.closest('[hidden],[inert]');",
  "const fields=()=>[...document.querySelectorAll('[role=dialog] .review-section .field')].filter(f=>visible(f)&&f.querySelector('label')?.textContent.trim()==='审阅备注');",
  "const note=()=>{const f=fields();if(f.length!==1)return null;return f[0].querySelector('textarea');};",
  "const snapshot=()=>{const input=note(),dialog=input?.closest('[role=dialog]'),status=dialog?.querySelector('.candidate-review-actions [role=status]'),save=dialog&&[...dialog.querySelectorAll('.candidate-review-actions button')].find(b=>b.textContent.trim()==='保存审阅'),event=new Event('beforeunload',{cancelable:true}),dispatchReturned=window.dispatchEvent(event);return{at:performance.now(),note:input?{id:input.id,labels:[...(input.labels||[])].map(l=>l.textContent),value:input.value,disabled:input.disabled}:null,noteFocused:document.activeElement===input,dirtyCaption:status?.textContent??null,saveEnabled:!!save&&!save.disabled,documentHasFocus:document.hasFocus(),guardProbe:{synthetic:true,cancelable:event.cancelable,isTrusted:event.isTrusted,defaultPrevented:event.defaultPrevented,dispatchReturned},activation:{isActive:navigator.userActivation?.isActive,hasBeenActive:navigator.userActivation?.hasBeenActive}};};",
 ].join('');
 const before=await cmnSmokeDeadline('actual review-note target',()=>window.webContents.executeJavaScript('(async()=>{'+scope+'for(let n=0;n<375;n++){const input=note();if(input){input.focus();input.select();return snapshot();}await new Promise(r=>setTimeout(r,8));}throw Error("Current visible review-note field not found");})()'),5000);
 fact(before.note&&before.noteFocused&&before.note.value===expectedSavedNote&&before.dirtyCaption==='审阅已保存'&&!before.guardProbe.defaultPrevented,'退出草稿前不是实际已保存的干净审阅状态：'+JSON.stringify(before));
 await window.webContents.insertText(draft);
 const after=await cmnSmokeDeadline('actual dirty App unload guard',()=>window.webContents.executeJavaScript('(async()=>{'+scope+'const draft='+JSON.stringify(draft)+',ready=('+cmnSmokeQuitDraftIsReady.toString()+'),first=snapshot(),start=performance.now();let last=first;for(let n=0;n<375;n++){last=snapshot();if(ready(last,draft))return{first,ready:last,waitMs:performance.now()-start};await new Promise(r=>setTimeout(r,8));}throw Error("Actual App unload guard/dirty input/activation not ready: "+JSON.stringify(last));})()'),5000);
 return{draft,textareaId:after.ready.note.id,before,firstAfterNativeInput:after.first,ready:after.ready,guardWaitMs:after.waitMs,syntheticGuardProbeOnly:true,actualNativeQuitNotYetRequested:true};
}
/** IPC generation persists real plans but does not run App.performGenerate's
 * refresh callback. Reload the original renderer so its own mount bootstrap
 * supplies SavedSessions;do not inject React state or manufacture entries. */
export async function refreshCmnSmokeSavedPlans(window:BrowserWindow,customerNames:readonly string[]){
 fact(customerNames.length===2&&new Set(customerNames).size===2,'刷新验收须绑定两个实际已存方案。');
 await reloadNamingV7Page(window.webContents,15000);
 await ensureCmnSmokeFirstUseGuideClosed(window);
 const expected=JSON.stringify(customerNames);
 const source='(async()=>{'+TOOLS+'await wait(()=>button("方案与报告"),"reloaded App bootstrap");await nav("方案与报告");const names='+expected+';await wait(()=>names.every(name=>buttons().some(b=>b.textContent.includes(name))),"post-reload saved entries");return{expectedCustomers:names,matchedCustomers:names.filter(name=>buttons().some(b=>b.textContent.includes(name))),originalAppMountBootstrap:true};})()';
 return cmnSmokeDeadline('post-generate renderer reload/bootstrap',()=>window.webContents.executeJavaScript(source),15000);
}
/** The observer delegates unmodified real Service calls. It never holds,
 * substitutes or fabricates IPC/worker responses or native dialog choices. */
export async function smokeCmnReadingUi(window:BrowserWindow,service:StudioService,context:CmnReadingSmokeContext,base:BirthProfile,preferences:NamingPreferences,capture:()=>Promise<Buffer>,requestQuit:(kind:CmnQuitKind,onArmed:(armed:CmnQuitArmed)=>void)=>Promise<CmnQuitReceipt>){
 assertCmnReadingUiSmoke(context,service);fact(!!process.versions.electron,'必须在实际Electron主进程执行。');fact(!hostSnapshot(service).active,'首次浏览前worker已被预热。');
 fact(service.store.settings().useAi===false,'隔离设置须关闭外部AI。');
 for(const table of['profiles','sessions','revisions'])fact(Number(service.store.db.exec('SELECT COUNT(*) FROM '+table)[0].values[0][0])===0,'客户库不是空库。');
 const write=(name:string,value:unknown)=>{assertCmnReadingUiSmoke(context,service);atomicWrite(join(context.out,name),JSON.stringify(value,null,2)+'\n');};
 const stages:{stage:string;at:string;detail?:unknown}[]=[],stage=(name:string,detail?:unknown)=>{stages.push({stage:name,at:new Date().toISOString(),detail});write('cmn-reading-progress.json',{status:'in-progress',stages});};
 const contents=window.webContents,js=<T=any,>(source:string)=>cmnSmokeDeadline('renderer',()=>contents.executeJavaScript(source) as Promise<T>),ipc=<T=any,>(method:string,args:unknown[]=[])=>js<T>('window.studio['+JSON.stringify(method)+'](...'+JSON.stringify(args)+')');
 const nativeKeys:unknown[]=[],nativeFocuses:unknown[]=[];
 const keyDom=()=>js('(()=>{const e=document.activeElement,d=e?.closest("details");return{documentHasFocus:document.hasFocus(),activeTag:e?.tagName,activeText:e?.textContent?.slice(0,120),detailsOpen:d?.open,detailsBusy:d?.querySelector("[aria-busy]")?.getAttribute("aria-busy")};})()');
 const focusForInput=async()=>{const attempt={startedAt:Date.now(),before:{windowFocused:window.isFocused(),contentsFocused:contents.isFocused()},domBefore:await keyDom(),result:undefined as unknown,error:undefined as unknown};nativeFocuses.push(attempt);write('cmn-reading-native-focus.json',{attempts:nativeFocuses});try{const focus=await focusCmnSmokeNativeWindow(window);attempt.result={focus,domAfter:await keyDom()};write('cmn-reading-native-focus.json',{attempts:nativeFocuses});return focus;}catch(error){attempt.error={message:String(error),windowDestroyed:window.isDestroyed(),windowFocused:!window.isDestroyed()&&window.isFocused()};write('cmn-reading-native-focus.json',{attempts:nativeFocuses});throw error;}};
 const key=async(keyCode:string,modifiers:('shift')[]=[])=>{
  const focus=await focusForInput(),before=await keyDom(),nativeKey=keyCode==='Return'?'Enter':keyCode,record={requestedKey:keyCode,nativeKey,modifiers,focus,before,attemptedAt:Date.now(),dispatchedAt:undefined as number|undefined,inputEvents:undefined as unknown,after:undefined as unknown};nativeKeys.push(record);write('cmn-reading-key-observations.json',{events:nativeKeys,host:hostSnapshot(service)});fact(before.documentHasFocus,'真实rendererdocument尚未获得键盘焦点，未发送原生键。');
  record.inputEvents=sendCmnSmokeKeyboardSequence(contents,nativeKey,modifiers);record.dispatchedAt=Date.now();write('cmn-reading-key-observations.json',{events:nativeKeys,host:hostSnapshot(service)});await new Promise(r=>setTimeout(r,0));record.after=await keyDom();write('cmn-reading-key-observations.json',{events:nativeKeys,host:hostSnapshot(service)});
 };
 const requestTraceFailures:unknown[]=[],reportTraceFailure=(failure:unknown)=>{requestTraceFailures.push(failure);const text='CMN smoke observer evidence incomplete: '+JSON.stringify({failures:requestTraceFailures});let reportingError:unknown;try{atomicWrite(join(context.out,'cmn-reading-trace-evidence-errors.json'),text);}catch(error){reportingError=error;}try{atomicWrite(join(context.out,'smoke-error.txt'),text);}catch(error){reportingError=reportingError??error;}if(reportingError)throw reportingError;};
 const requestWitness=createCmnSmokeRequestWitness(()=>hostSnapshot(service),rows=>write('cmn-reading-real-requests.json',{rows,currentHost:hostSnapshot(service)}),reportTraceFailure),trace=requestWitness.records,original=service.getCmnReadingOptions;
 service.getCmnReadingOptions=function(char){return requestWitness.observe(char,()=>original.call(this,char));};
 const originalClose=service.closeCmnReadingWorker;
 service.closeCmnReadingWorker=async function(){write('cmn-reading-before-close.json',{phase:'before-original-close',snapshot:hostSnapshot(this),trace});await originalClose.call(this);write('cmn-reading-worker-closed.json',{phase:'after-original-close',snapshot:hostSnapshot(this),trace});};
 const sessions:NamingSession[]=[];
 for(const name of['长安','沈清']){
  const profile:BirthProfile={...base,id:'cmn-native-'+name,customerName:'普通话桌面虚构验收-'+name,fatherName:'林文舟',motherName:'陈若兰',monthAuthorityMethod:'no-fixed-day/1.0.0',seasonalMethod:'no-monthly/1.0.0',renMethod:'none',notes:'独立虚构样本；仅真实IPC/worker/键盘交互验收。'};
  const pref:NamingPreferences={...preferences,length:2,generationChar:[...name][0],requiredChars:[...name][1],forbiddenChars:'',elderTaboo:'',industry:'',zodiacRules:false,numerology:false,avoidParentNames:false,yueReading:false,yueHomophones:'none',imageryReading:false};
  sessions.push((await ipc<{session:NamingSession}>('generate',[profile,pref])).session);
 }
 const database=join(context.userData,'customers.sqlite'),savedBefore=readFileSync(database),openSession=async(s:NamingSession)=>{
  await js('(async()=>{'+TOOLS+'await nav("方案与报告");const entry=await wait(()=>buttons().find(b=>b.textContent.includes('+JSON.stringify(s.profile.customerName)+')),"saved entry");entry.click();await pause();await nav("起名工作台");const detail=await wait(()=>button("详解"),"detail");detail.click();await wait(()=>document.querySelector(\'[role="dialog"] .cmn-reading-browser\'),"readings");return true;})()');
 };
 const focusReading=async(char:string)=>{await focusForInput();return js('(async()=>{'+TOOLS+'const d=await wait(()=>browser('+JSON.stringify(char)+'),"reading");d.querySelector(":scope>summary").focus();return document.activeElement===d.querySelector(":scope>summary");})()');};
 const waitHost=async(condition:(s:WorkerSnapshot)=>boolean,label:string)=>cmnSmokeDeadline(label,async()=>{for(;;){const snapshot=hostSnapshot(service);if(condition(snapshot))return snapshot;await new Promise(r=>setTimeout(r,2));}},15000);
 const closeDetail=async()=>{await key('Escape');return js('(async()=>{'+TOOLS+'await wait(()=>!document.querySelector(\'[role="dialog"]\'),"Escape closes clean detail");return{closed:true,focus:document.activeElement?.textContent?.trim()};})()');};
 let heldSource:{file:string;held:string;bytes:Buffer}|undefined;
 try{
  stage('generated-real-IPC-plans',{names:sessions.map(s=>s.candidates[0].givenName)});
  const rendererRefresh=await refreshCmnSmokeSavedPlans(window,sessions.map(s=>s.profile.customerName));stage('renderer-reloaded-after-real-IPC-generation',rendererRefresh);
  await openSession(sessions[0]);
  fact(await focusReading('长'),'不能聚焦长字summary。');
  const coldStarted=Date.now();let mainTicks=0;const timer=setInterval(()=>mainTicks++,5);
  try{
   const coldArm=requestWitness.arm('长');stage('cold-request-armed-before-native-key',{arm:coldArm,host:hostSnapshot(service),windowFocused:window.isFocused(),contentsFocused:contents.isFocused(),dom:await keyDom()});fact(!hostSnapshot(service).active&&trace.length===0,'首次冷请求开始前已存在真实预热调用；该冷场景未覆盖。');
   await key('Enter');const dispatched=await requestWitness.waitForDispatched(coldArm);requestWitness.assertTraceComplete();fact(!!dispatched.dispatched&&dispatched.dispatched.pending>0,'实际请求未产生pending；请核对真实请求见证，不伪造worker状态。');
   const loading=await js('(()=>{'+TOOLS+'const d=browser("长");return{busy:d?.querySelector("[aria-busy]")?.getAttribute("aria-busy"),text:d?.textContent,open:d?.open,documentHasFocus:document.hasFocus(),focusInside:document.querySelector(\'[role="dialog"]\')?.contains(document.activeElement)};})()');
   stage('cold-actual-dispatch-and-loading-observed',{arm:coldArm,requestId:dispatched.requestId,request:dispatched,currentHost:hostSnapshot(service),loading});
   fact(loading.busy==='true'&&loading.text.includes('正在读取'),'真实首次请求未观察到加载。');
   const pingAt=Date.now(),rendererPing=await js('({ready:document.readyState,focus:document.activeElement?.textContent})'),pingMs=Date.now()-pingAt;
   fact(pingMs<500&&mainTicks>0,'worker期间主窗/主线程未及时响应。');
   const closed=await closeDetail();fact(closed.focus?.includes('详解'),'关闭详情后未恢复原触发按钮焦点。');
   await openSession(sessions[1]);const switchedAt=Date.now();await waitHost(s=>s.pending===0,'cold real response finishes');
   const after=await js('(()=>{const d=document.querySelector(\'[role="dialog"]\');return{title:d.querySelector(".detail-hero h2")?.textContent,summaries:[...d.querySelectorAll(".cmn-reading-browser>summary")].map(n=>n.textContent),optionCount:d.querySelectorAll(".cmn-reading-option").length};})()');
   const cold=trace.find(t=>t.char==='长');fact(cold?.finishedAt&&cold.finishedAt>switchedAt,'本次冷请求未跨过换详情边界；不把未覆盖算通过。');
   fact(after.title==='林沈清'&&!after.summaries.some((s:string)=>s.includes('长'))&&after.optionCount===0,'迟到的长字响应污染了沈详情。');
   stage('cold-loading-responsive-and-close-switch',{loading,rendererPing,pingMs,mainTicks,coldMs:Date.now()-coldStarted,closed,after,coldTrace:cold});
  }finally{clearInterval(timer);}
  fact(await focusReading('沈'),'不能聚焦沈字summary。');await key('Return');
  const shen=await js('(async()=>{'+TOOLS+'await wait(()=>browser("沈")?.querySelector(".cmn-reading-option"),"real Shen");return{readings:[...browser("沈").querySelectorAll(".cmn-reading-option h5")].map(n=>n.textContent),references:browser("沈").querySelectorAll(".cmn-reading-reference-record").length};})()');
  fact(shen.readings.length===1&&shen.readings[0]==='shěn'&&shen.references===1,'沈真实读音与参见结构不符。');
  await js('document.querySelector(\'[role="dialog"] button[aria-label="关闭"]\').focus()');await key('Tab',['shift']);
  const trap=await js('(()=>{const d=document.querySelector(\'[role="dialog"]\');return{inside:d.contains(document.activeElement),active:document.activeElement?.tagName};})()');fact(trap.inside,'Shift+Tab离开详情焦点范围。');
  await closeDetail();await openSession(sessions[1]);await focusReading('沈');await key('Space');
  const repeated=await js('(async()=>{'+TOOLS+'await wait(()=>browser("沈")?.querySelector(".cmn-reading-option"),"repeat open");return{readings:[...browser("沈").querySelectorAll(".cmn-reading-option h5")].map(n=>n.textContent)};})()');fact(repeated.readings[0]==='shěn','重新打开未显示当前字资料。');stage('keyboard-trap-repeat-open',{trap,repeated});
  const pin=CMN_READING_INPUTS.find(p=>p.file==='data/raw/kTraditionalVariant.txt')!;const file=ordinary(join(context.appRoot,pin.file),false),held=file+'.cmn-smoke-held',bytes=readFileSync(file);
  fact(hash(bytes)===pin.sha256&&!readdirSync(dirname(file)).some(n=>n.endsWith('.cmn-smoke-held')),'故障注入前原件不符或已有未恢复故障。');heldSource={file,held,bytes};write('cmn-reading-source-fault.json',{file,held,sha256:hash(bytes),privateCopyOnly:true});renameSync(file,held);
  await focusReading('清');await key('Return');
  const error=await js('(async()=>{'+TOOLS+'const d=await wait(()=>browser("清")?.querySelector(\'[role="alert"]\'),"actual source error");return{text:d.textContent,options:browser("清").querySelectorAll(".cmn-reading-option").length};})()');fact(error.options===0&&error.text.includes('重新读取'),'真实来源错误没有可重试状态。');
  renameSync(held,file);heldSource=undefined;fact(hash(readFileSync(file))===pin.sha256,'恢复原件失败。');
  await js('(async()=>{'+TOOLS+'const b=await wait(()=>browser("清")?.querySelector("button"),"retry");b.focus();return true;})()');await key('Return');
  const retry=await js('(async()=>{'+TOOLS+'await wait(()=>browser("清")?.querySelector(".cmn-reading-option"),"actual retry");return{readings:[...browser("清").querySelectorAll(".cmn-reading-option h5")].map(n=>n.textContent),alerts:browser("清").querySelectorAll(\'[role="alert"]\').length};})()');fact(retry.alerts===0&&retry.readings.length>0,'原件恢复后重试失败。');
  stage('real-source-error-and-keyboard-retry',{error,retry,sourceRestored:true});
  await closeDetail();const boot=await ipc<{sessions:NamingSession[]}>('bootstrap');
  fact(sessions.every(s=>isDeepStrictEqual(s,boot.sessions.find(row=>row.id===s.id)))&&readFileSync(database).equals(savedBefore),'只读浏览改变了方案或数据库字节。');
  await openSession(sessions[1]);
  const dirty=await prepareCmnSmokeQuitDraft(window,'原生退出取消验收：此草稿尚未保存',sessions[1].candidates[0].reviewNote??'');stage('actual-App-quit-draft-and-unload-guard-ready',dirty);
  // Await the exact real-dialog request;never inspect worker state before the
  // unchanged production handler has returned its actual continue choice.
  const continueReceipt=await requestQuit('continue',armed=>stage('awaiting-real-native-continue-editing',{requestId:armed.requestId,requestedAt:armed.requestedAt,requiredAction:'在真实原生未保存对话框选择“继续编辑”',dirty,automatedDialogResponse:false}));
  fact(continueReceipt.kind==='continue'&&continueReceipt.choice===0,'实际原生取消退出票据不符。');
  fact(!window.isDestroyed(),'原生取消退出场景实际关闭了窗口。');fact(!hostSnapshot(service).closed,'取消退出永久关闭了读音worker。');
  const afterCancel=await ipc('getCmnReadingOptions',['长']);fact(afterCancel.status==='available'&&afterCancel.char==='长','取消原生退出后真实IPC读音失败。');
  const draftAfter=await js('document.getElementById('+JSON.stringify(dirty.textareaId)+')?.value');fact(draftAfter===dirty.draft&&readFileSync(database).equals(savedBefore),'取消退出丢失未保存草稿或改写客户库。');stage('native-continue-editing-retains-worker-and-draft',{requestId:continueReceipt.requestId,receipt:continueReceipt,queryChar:afterCancel.char,queryStatus:afterCancel.status,worker:hostSnapshot(service),draftRetained:true,databaseUnchanged:true});
  const screenshot=await capture();fact(screenshot.length<500000&&screenshot[0]===0xff&&screenshot[1]===0xd8,'截图不是小于500KB的JPEG。');atomicWrite(join(context.out,'cmn-reading-ready.jpg'),screenshot);
  requestWitness.assertTraceComplete();
  write('cmn-reading-ui-result.json',{traceEvidenceComplete:true,status:'ui-passed-awaiting-final-native-discard-and-natural-exit',stages,trace,databaseSha256:hash(savedBefore),realIPC:true,mockResponses:false,sourceRestored:true,workerBeforeQuit:hostSnapshot(service),nativeProcessExitVerified:false});
  void ipc('getCmnReadingOptions',['长']).catch(()=>{});
  const quitSnapshot=await waitHost(s=>s.active&&s.pending>0,'quit while actual query pending');requestWitness.assertTraceComplete();
  const discardReceipt=await requestQuit('discard',armed=>stage('awaiting-real-native-discard-and-close',{requestId:armed.requestId,requestedAt:armed.requestedAt,requiredAction:'在真实原生未保存对话框选择“放弃修改并关闭”',snapshot:quitSnapshot,automatedDialogResponse:false}));
  fact(discardReceipt.kind==='discard'&&discardReceipt.choice===1,'实际原生放弃关闭票据不符。');
  return{status:'actual-native-discard-returned',receipt:discardReceipt,snapshot:quitSnapshot};
 }finally{
  if(heldSource){renameSync(heldSource.held,heldSource.file);fact(readFileSync(heldSource.file).equals(heldSource.bytes),'失败清理时原件恢复不一致。');}
  try{write('cmn-reading-request-observer-final.json',{trace,evidenceFailures:requestWitness.evidenceFailures(),host:hostSnapshot(service),windowDestroyed:window.isDestroyed()});requestWitness.assertTraceComplete();}finally{requestWitness.dispose();service.getCmnReadingOptions=original;}
 }
}
