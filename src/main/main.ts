import { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } from 'electron';
import {invokeWithCustomerWriteNotice} from './customer-write-notice-transport';
import {CULTURAL_WORKFLOW_METHODS} from '../shared/cultural-workflow-api';
import {CULTURAL_COMPARISON_CATALOG_METHODS} from '../shared/cultural-comparison-catalog';
import { join } from 'node:path';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { Store, atomicWrite } from './store';
import { readCustomerBackupFile } from './customer-backup-file';
import {CUSTOMER_RESTORE_COMMITTED_WARNING} from '../shared/restore-result';
import { StudioService } from './service';
import { EndpointSecretStorage } from './credentials';
import { reportHTML } from './report';
import {exportCandidate2ReportWithDialog} from './candidate2-report-export';
import type { NamingSession } from '../shared/types';
import { sessionReportFilename } from '../shared/session-catalog';
import { sessionBatchLabel } from '../shared/session-catalog';
import {smokeRestoreDrafts} from './smoke-restore-drafts';
import {smokeSolarTime} from './smoke-solar-time';
import {smokeFollowingRestrictions} from './smoke-following-restrictions';
import {smokeDitianRen} from './smoke-ditian-ren';
import {smokeRenNecessary} from './smoke-ren-necessary';
import {smokeRenActions} from './smoke-ren-actions';
import {smokeRenCapacities} from './smoke-ren-capacities';
import {smokeNameReadings} from './smoke-name-readings';
import {smokeYueHomophones} from './smoke-yue-homophones';
import {smokeYueCoverage} from './smoke-yue-coverage';
import {smokeRenDirections} from './smoke-ren-directions';
import {smokeClassics} from './smoke-classics';
import {smokeNamingRules} from './smoke-naming-rules';
import {smokeNamingV5} from './smoke-naming-v5';
import {smokeRenJointBattle} from './smoke-ren-joint-battle';
import {smokeNamingV6} from './smoke-naming-v6';
import {smokeOfficialNamePopularity} from './smoke-official-name-popularity';

import {smokeNamingV7} from './smoke-naming-v7';
import {preflightCmnReadingUiSmoke,smokeCmnReadingUi} from './smoke-cmn-reading-ui';
import {createCmnReadingQuitObserver,type CmnQuitEvent} from './smoke-cmn-reading-quit';
import {smokeDesktopWorkflow139,createDesktop139FileRoutes} from './smoke-desktop-workflow-139';
import {smokeDesktopWorkflow145,createDesktop145FileRoutes} from './smoke-desktop-workflow-145';
import {smokeDesktopWorkflow176,createDesktop176FileRoutes} from './smoke-desktop-workflow-176';
import {preflightDesktop176,assertDesktop176Context,assertDesktop176PhaseMethod,writeDesktop176Artifact,type Desktop176Context} from './smoke-desktop-workflow-176-context';
import {isNamingV7SmokeRequested,preflightNamingV7Smoke,assertNamingV7SmokeContext,writeNamingV7SmokeArtifact,writeNamingV7SmokeFile,type NamingV7SmokeContext} from './smoke-naming-v7-preflight';

const desktopWorkflow139Requested=process.env.NAMING_STUDIO_DESKTOP_WORKFLOW==='139';
const desktopWorkflow145Requested=process.env.NAMING_STUDIO_DESKTOP_WORKFLOW==='145';
const desktopWorkflow176Requested=process.env.NAMING_STUDIO_DESKTOP_WORKFLOW==='176';
const desktopWorkflowRequested=desktopWorkflow139Requested||desktopWorkflow145Requested||desktopWorkflow176Requested;
let desktop176Context:Desktop176Context|undefined;
let namingV7Context:NamingV7SmokeContext|undefined;
let namingV7Rejected=false;
let namingV7Completed=false;
const namingV7Stderr=(error:unknown)=>{const text=error instanceof Error?error.stack||error.message:String(error);try{process.stderr.write(text+'\n');}catch{/* stderr failure must still exit */}return text;};
if(process.env.NAMING_STUDIO_DESKTOP_WORKFLOW!==undefined&&(!desktopWorkflowRequested||process.env.NAMING_STUDIO_SMOKE_SCOPE!=='naming-v7')){
  namingV7Rejected=true;namingV7Stderr(new Error('桌面验收必须明确marker=139、145或176并使用naming-v7隔离scope。'));
}
if(!namingV7Rejected&&desktopWorkflow176Requested){
  try{const normalDefaultUserData=app.getPath('userData');desktop176Context=preflightDesktop176({normalUserData:normalDefaultUserData});}
  catch(error){namingV7Rejected=true;namingV7Stderr(error);}
}
if(!namingV7Rejected&&!desktopWorkflow176Requested&&isNamingV7SmokeRequested()){
  try{namingV7Context=preflightNamingV7Smoke();}
  catch(error){namingV7Rejected=true;namingV7Stderr(error);}
}
if(namingV7Rejected){process.exitCode=1;process.exit(1);}
else {
const failNamingV7=(error:unknown)=>{const text=namingV7Stderr(error);if(desktop176Context){try{writeDesktop176Artifact(desktop176Context,desktop176Context.prefix+'-error.txt',text);}catch{/* no fallback output writes */}}if(namingV7Context){try{writeNamingV7SmokeArtifact(namingV7Context,'smoke-error.txt',text);}catch{/* unverified or unwritable output gets no error record */}}app.exit(1);};
try{
let window:BrowserWindow;let service:StudioService;
const root=app.getAppPath();
const cmnReadingUiContext=process.env.NAMING_STUDIO_SMOKE_SCOPE==='cmn-reading-ui'?preflightCmnReadingUiSmoke(root):undefined;
if(process.env.NAMING_STUDIO_SMOKE&&!process.env.NAMING_STUDIO_USER_DATA)throw new Error('自动验收必须设置独立的 NAMING_STUDIO_USER_DATA，禁止写入正常客户目录。');
if(namingV7Context)assertNamingV7SmokeContext(namingV7Context);
if(desktop176Context)assertDesktop176Context(desktop176Context);
if(process.env.NAMING_STUDIO_USER_DATA)app.setPath('userData',desktop176Context?.userData??namingV7Context?.userData??process.env.NAMING_STUDIO_USER_DATA);
const primaryInstance=app.requestSingleInstanceLock();
if(!primaryInstance){if(namingV7Context||desktop176Context)failNamingV7(new Error(desktop176Context?'桌面176验收独立实例锁未取得':'命名7验收独立实例锁未取得'));else app.quit();}
else app.on('second-instance',()=>{if(window&&!window.isDestroyed()){if(window.isMinimized())window.restore();window.show();window.focus();}});
async function exportPDF(s:NamingSession|string,path:string,writePdf:(file:string,bytes:Uint8Array)=>void=atomicWrite){
  const printWindow=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
  try{await printWindow.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(typeof s==='string'?s:reportHTML(s,service.store.settings())));await printWindow.webContents.executeJavaScript('document.fonts.ready.then(()=>true)');
    const pdf=await printWindow.webContents.printToPDF({printBackground:true,pageSize:'A4',preferCSSPageSize:true,displayHeaderFooter:true,headerTemplate:'<div></div>',footerTemplate:'<div style="font-family:Arial;font-size:8px;color:#888;width:100%;text-align:center"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'});writePdf(path,pdf);return path;
  }finally{printWindow.destroy();}
}
async function start(){
  if(namingV7Context)assertNamingV7SmokeContext(namingV7Context);
  const user=app.getPath('userData');if(namingV7Context)assertNamingV7SmokeContext(namingV7Context,namingV7Context.out,user);const keyFile=join(user,'api-key.protected');
  if(desktop176Context)assertDesktop176Context(desktop176Context,user);
  const store=await new Store(user,join(root,'data'),join(root,'node_modules/sql.js/dist/sql-wasm.wasm')).init();
  if(desktop176Context)assertDesktop176Context(desktop176Context,user);
  if(namingV7Context)assertNamingV7SmokeContext(namingV7Context,namingV7Context.out,user);
  const secrets=new EndpointSecretStorage(keyFile,safeStorage);
  service=new StudioService(store,secrets);
  secrets.read(store.settings().apiBaseUrl);
  const invokeWithNotice=<T,>(action:()=>T)=>invokeWithCustomerWriteNotice(service.store,action,notice=>window.webContents.send('studio:customer-write-notice',notice)).then(({result})=>result);
  for(const name of ['listSessionCatalog','readSessionDetail','migrateCustomerStorage','bootstrap','saveProfile','deleteProfile','analyze','generate','saveSession','listHistory','restoreHistory','updateNumerology','updateYueReading','updateElementAssessment','recordModernPracticalEvidence','clearModernPracticalEvidence','searchKnowledge','searchClassics','readClassicSection','getOfficialNamePopularity','searchCharacters','saveSettings','saveBrand','saveAiSettings','testConnection','testNamingCapability','previewRollbackDataPack','previewBuiltinDataPack','applyDataPackPreview','discardDataPackPreview'] as const){
    ipcMain.handle('studio:'+name,(event,...args)=>{if(event.sender!==window.webContents)throw new Error('无效的调用来源。');if(desktop176Context)assertDesktop176PhaseMethod(desktop176Context,name);return invokeWithNotice(()=>(service[name] as (...a:unknown[])=>unknown).apply(service,args));});
  }
  const register=(name:string,fn:(...args:any[])=>unknown)=>ipcMain.handle('studio:'+name,(event,...args)=>{if(event.sender!==window.webContents)throw new Error('无效的调用来源。');if(desktop176Context)assertDesktop176PhaseMethod(desktop176Context,name);return invokeWithNotice(()=>fn(...args));});
  for(const name of CULTURAL_WORKFLOW_METHODS)register(name,(...args:unknown[])=>(service[name] as (...args:unknown[])=>unknown).apply(service,args));
  for(const name of CULTURAL_COMPARISON_CATALOG_METHODS)register(name,(...args:unknown[])=>(service[name] as (...args:unknown[])=>unknown).apply(service,args));
  register('getCmnReadingOptions',(...args:Parameters<StudioService['getCmnReadingOptions']>)=>service.getCmnReadingOptions(...args));
  register('confirmParentNameReading',(...args:Parameters<StudioService['confirmParentNameReading']>)=>service.confirmParentNameReading(...args));
  register('previewBaziMainchain',(...args:Parameters<StudioService['previewBaziMainchain']>)=>service.previewBaziMainchain(...args));
  register('previewBaziRootFeedback',(...args:Parameters<StudioService['previewBaziRootFeedback']>)=>service.previewBaziRootFeedback(...args));
  register('previewBaziRootFeedbackV132',(...args:Parameters<StudioService['previewBaziRootFeedbackV132']>)=>service.previewBaziRootFeedbackV132(...args));
  register('checkCandidate2NamingEligibility',(...args:Parameters<StudioService['checkCandidate2NamingEligibility']>)=>service.checkCandidate2NamingEligibility(...args));
  register('generateCandidate2',(...args:Parameters<StudioService['generateCandidate2']>)=>service.generateCandidate2(...args));
  register('reviewCandidate2',(...args:Parameters<StudioService['reviewCandidate2']>)=>service.reviewCandidate2(...args));
  register('restoreCandidate2History',(...args:Parameters<StudioService['restoreCandidate2History']>)=>service.restoreCandidate2History(...args));
  register('previewCandidate2Report',(...args:Parameters<StudioService['previewCandidate2Report']>)=>service.previewCandidate2Report(...args));
  register('exportCandidate2Report',(...args:unknown[])=>exportCandidate2ReportWithDialog(args,{
    prepare:(id,revision,token)=>service.previewCandidate2Report(id,revision,token),
    selectPath:async filename=>{const selected=await dialog.showSaveDialog(window,{title:'导出已保存项目方案报告',defaultPath:filename,filters:[{name:'PDF 报告',extensions:['pdf']}]});return selected.canceled||!selected.filePath?null:selected.filePath;},
    exportHtml:(html,filePath)=>exportPDF(html,filePath),
  }));
  register('generateReviewed',(...args:Parameters<StudioService['generateReviewed']>)=>service.generateReviewed(...args));
  register('previewGengSiReference',(...args:Parameters<StudioService['previewGengSiReference']>)=>service.previewGengSiReference(...args));
  register('previewQiongtongClauseReferences',(...args:Parameters<StudioService['previewQiongtongClauseReferences']>)=>service.previewQiongtongClauseReferences(...args));
  register('previewJiaHaiControl',(...args:Parameters<StudioService['previewJiaHaiControl']>)=>service.previewJiaHaiControl(...args));
  register('getB04WordContextOptions',(...args:Parameters<StudioService['getB04WordContextOptions']>)=>service.getB04WordContextOptions(...args));
  register('getSingleCharacterMeaningOptions',(...args:Parameters<StudioService['getSingleCharacterMeaningOptions']>)=>service.getSingleCharacterMeaningOptions(...args));
  register('listManualCharacterMeanings',(...args:Parameters<StudioService['listManualCharacterMeanings']>)=>service.listManualCharacterMeanings(...args));
  register('selectManualCharacterMeaning',(...args:Parameters<StudioService['selectManualCharacterMeaning']>)=>service.selectManualCharacterMeaning(...args));
  register('getNamingCoverage',()=>service.getNamingCoverage());
  register('getMeaningContextOptions',(...args:Parameters<StudioService['getMeaningContextOptions']>)=>service.getMeaningContextOptions(...args));
  register('updateMeaningContext',(...args:Parameters<StudioService['updateMeaningContext']>)=>service.updateMeaningContext(...args));
  const desktop139RendererNetworkAttempts:{url:string;method:string}[]=[];
  const desktop139Files=desktopWorkflow176Requested?createDesktop176FileRoutes(service,desktop176Context!,(session,file)=>exportPDF(session,file,(target,bytes)=>{writeDesktop176Artifact(desktop176Context!,target.split(/[\\/]/).at(-1)!,bytes);})):desktopWorkflow139Requested?createDesktop139FileRoutes(service,namingV7Context!,(session,file)=>exportPDF(session,file,(target,bytes)=>{writeNamingV7SmokeFile(namingV7Context!,target,bytes);})):desktopWorkflow145Requested?createDesktop145FileRoutes(service,namingV7Context!,(session,file)=>exportPDF(session,file,(target,bytes)=>{writeNamingV7SmokeFile(namingV7Context!,target,bytes);})):undefined;
  register('exportReport',async(s:NamingSession)=>{const canonical=service.saveSession(s);if(desktop139Files)return desktop139Files.report(canonical);const selected=await dialog.showSaveDialog(window,{title:'导出命名方案',defaultPath:sessionReportFilename(canonical),filters:[{name:'PDF 报告',extensions:['pdf']}]});if(selected.canceled||!selected.filePath)return null;return exportPDF(canonical,selected.filePath);});
  register('backup',async()=>{if(desktop139Files)return desktop139Files.backup();const d=await dialog.showSaveDialog(window,{title:'备份客户档案',defaultPath:'知名客户备份.sqlite',filters:[{name:'SQLite 备份',extensions:['sqlite']}]});if(d.canceled||!d.filePath)return null;atomicWrite(d.filePath,store.backupBytes());return d.filePath;});
  register('restore',async()=>{if(desktop139Files)return desktop139Files.restore();const d=await dialog.showOpenDialog(window,{title:'选择客户备份',properties:['openFile'],filters:[{name:'SQLite 备份',extensions:['sqlite']}]});if(d.canceled||!d.filePaths[0])return false;const confirm=await dialog.showMessageBox(window,{type:'question',message:'恢复将替换当前客户档案、方案与工作室品牌资料，并保留本机 AI 接口与密钥。当前库会自动保留一份恢复前备份。',buttons:['取消','恢复'],defaultId:0,cancelId:0});if(confirm.response!==1)return false;const bytes=readCustomerBackupFile(d.filePaths[0]);try{store.restore(bytes);}catch(error){
    if(error&&typeof error==='object'){
      const code=Object.getOwnPropertyDescriptor(error,'code'),operation=Object.getOwnPropertyDescriptor(error,'operation'),committed=Object.getOwnPropertyDescriptor(error,'committed'),installed=Object.getOwnPropertyDescriptor(error,'installed');
      if([code,operation,committed,installed].every(field=>field&&Object.hasOwn(field,'value'))&&code!.value==='CUSTOMER_STORAGE_RESTORE_COMMITTED'&&operation!.value==='restore'&&committed!.value===true&&installed!.value===true)return{status:'committed-with-warning' as const,warning:CUSTOMER_RESTORE_COMMITTED_WARNING};
    }
    throw error;
  }return true;});
  register('exportDataPack',async()=>{const d=await dialog.showSaveDialog(window,{title:'导出知识库数据包',defaultPath:`知名知识库-${store.dataset.version}.sqlite`,filters:[{name:'SQLite 数据包',extensions:['sqlite']}]});if(d.canceled||!d.filePath)return null;atomicWrite(d.filePath,store.currentPackBytes());return d.filePath;});
  register('importDataPack',async()=>{const d=await dialog.showOpenDialog(window,{title:'导入知识库数据包',properties:['openFile'],filters:[{name:'SQLite 数据包',extensions:['sqlite']}]});if(d.canceled)return null;return store.installPack(new Uint8Array(readFileSync(d.filePaths[0])));});
  register('previewDataPack',async()=>{const d=await dialog.showOpenDialog(window,{title:'选择数据包并预览变更',properties:['openFile'],filters:[{name:'SQLite 数据包',extensions:['sqlite']}]});if(d.canceled||!d.filePaths[0])return null;return service.prepareDataPack(new Uint8Array(readFileSync(d.filePaths[0])));});
  register('rollbackDataPack',()=>store.rollback());
  window=new BrowserWindow({width:1460,height:960,minWidth:1100,minHeight:720,title:'知名 · 起名工作室',icon:join(root,'assets/icon.ico'),backgroundColor:'#f7f6f1',autoHideMenuBar:true,show:false,webPreferences:{preload:join(root,'dist-electron/preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:!process.env.NAMING_STUDIO_SMOKE}});
  const cmnNativeDialogEvents:CmnQuitEvent[]=[];
  const cmnReadingQuitObserver=cmnReadingUiContext?createCmnReadingQuitObserver({requestQuit:()=>app.quit(),isDestroyed:()=>window.isDestroyed(),onEvent:event=>{cmnNativeDialogEvents.push(event);atomicWrite(join(cmnReadingUiContext.out,'cmn-reading-native-dialogs.json'),JSON.stringify({events:cmnNativeDialogEvents},null,2));}}):undefined;
  if(cmnReadingQuitObserver)window.on('closed',()=>cmnReadingQuitObserver.windowDestroyed());
  window.webContents.setWindowOpenHandler(({url})=>{if(desktopWorkflowRequested)return {action:'deny'};try{const target=new URL(url);if(target.protocol==='https:')void shell.openExternal(url);}catch{}return {action:'deny'};});window.webContents.on('will-navigate',e=>e.preventDefault());
  window.webContents.on('will-prevent-unload',event=>{const cmnDialogToken=cmnReadingQuitObserver?.dialogOpened();const choice=dialog.showMessageBoxSync(window,{type:'question',title:'有修改尚未保存',message:'出生资料、审阅或设置中有未保存的修改。',detail:'继续编辑可返回工作室；放弃并关闭会丢失本次未保存的修改。',buttons:['继续编辑','放弃修改并关闭'],defaultId:0,cancelId:0,noLink:true});if(choice===1)event.preventDefault();cmnReadingQuitObserver?.choiceReturned(cmnDialogToken,choice);});
  if(desktopWorkflowRequested)window.webContents.session.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*','ws://*/*','wss://*/*']},(details,done)=>{desktop139RendererNetworkAttempts.push({url:details.url,method:details.method});done({cancel:true});});
  await window.loadFile(join(root,'dist','index.html'));window.once('ready-to-show',()=>window.show());window.show();
  if(process.env.NAMING_STUDIO_SMOKE){
    const smokeCaptureRetries:{attempt:number;error:string}[]=[];
    const captureSmokePage=async()=>{let last:unknown;for(let attempt=0;attempt<3;attempt++){try{const bytes=(await window.webContents.capturePage()).resize({width:1280}).toJPEG(80);if(!bytes.length)throw new Error('Empty smoke screenshot');return bytes;}catch(error){last=error;if(!String(error).includes('UnknownVizError'))throw error;smokeCaptureRetries.push({attempt:attempt+1,error:String(error)});if(attempt<2)await new Promise(resolve=>setTimeout(resolve,400));}}throw last;};
    try{
      if(desktopWorkflow176Requested){
        const context=desktop176Context;if(!context)throw new Error('桌面176缺少阶段预检票据');
        assertDesktop176Context(context,service.store.userDir);
        if(context.plan.phaseID==='exercise'){
          const guideUI=await window.webContents.executeJavaScript(`(async()=>{for(let i=0;i<100;i++){const skip=[...document.querySelectorAll('[role="dialog"] button')].find(e=>e.textContent.includes('先跳过'));if(skip){const text=document.querySelector('[role="dialog"]').innerText;skip.click();return {firstUseShown:true,text,skipped:true};}await new Promise(r=>setTimeout(r,40));}throw new Error('Missing isolated first-use guide');})()`);
          if(!guideUI.text.includes('父母')||!guideUI.text.includes('本地'))throw new Error('首次引导说明缺失。');
        }
        const result=await smokeDesktopWorkflow176(window,service,context,desktop139Files as ReturnType<typeof createDesktop176FileRoutes>,{appVersion:app.getVersion(),preloadPath:join(root,'dist-electron/preload.cjs'),rendererNetworkAttempts:()=>[...desktop139RendererNetworkAttempts]});
        writeDesktop176Artifact(context,context.prefix+'-result.json',JSON.stringify(result,null,2));
        assertDesktop176Context(context);await window.webContents.executeJavaScript('window.__smokeReady=true');
        namingV7Completed=true;app.quit();return;
      }
      const guideUI=await window.webContents.executeJavaScript(`(async()=>{for(let i=0;i<100;i++){const skip=[...document.querySelectorAll('[role="dialog"] button')].find(e=>e.textContent.includes('先跳过'));if(skip){const text=document.querySelector('[role="dialog"]').innerText;skip.click();return {firstUseShown:true,text,skipped:true};}await new Promise(r=>setTimeout(r,40));}throw new Error('Missing isolated first-use guide');})()`);
      if(!guideUI.text.includes('父母')||!guideUI.text.includes('本地'))throw new Error('首次引导说明缺失。');
      const profile={id:'smoke-customer',customerName:'验收测试',surname:'林',surnamePinyin:'lín',gender:'中性' as const,calendar:'solar' as const,birthDate:'2026-10-17',leapMonth:false,birthTime:'09:30',timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'自动验收资料，不是实际客户',fatherName:'林知远',motherName:'陈安宁',monthAuthorityMethod:'sanming-first-paragraph/1.0.0' as const,seasonalMethod:'qiongtong-2294674-initial/1.0.0' as const};
      const pref={length:2 as const,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',style:'清朗自然',meanings:'平安、求知',industry:'',priority:'balanced' as const,preferredElements:[],zodiacRules:true,numerology:true};
      if(process.env.NAMING_STUDIO_SMOKE_SCOPE==='cmn-reading-ui'){
        if(!cmnReadingUiContext||!cmnReadingQuitObserver)throw new Error('普通话桌面验收缺少隔离预检票据或原生观察器。');
        await smokeCmnReadingUi(window,service,cmnReadingUiContext,profile,pref,captureSmokePage,(kind,onArmed)=>cmnReadingQuitObserver.request(kind,onArmed));
        return;
      }
      if(process.env.NAMING_STUDIO_SMOKE_SCOPE==='naming-v7'){
        const context=namingV7Context;if(!context)throw new Error('命名7缺少启动前预检票据');
        const naming=desktopWorkflow145Requested
          ?await smokeDesktopWorkflow145(window,service,context,captureSmokePage,desktop139Files as ReturnType<typeof createDesktop145FileRoutes>,{appVersion:app.getVersion(),preloadPath:join(root,'dist-electron/preload.cjs'),rendererNetworkAttempts:()=>[...desktop139RendererNetworkAttempts]})
          :desktopWorkflow139Requested
          ?await smokeDesktopWorkflow139(window,service,context,captureSmokePage,desktop139Files as ReturnType<typeof createDesktop139FileRoutes>,{appVersion:app.getVersion(),preloadPath:join(root,'dist-electron/preload.cjs'),rendererNetworkAttempts:()=>[...desktop139RendererNetworkAttempts]})
          :await smokeNamingV7(window,service,context.out,profile,pref,(session,file)=>exportPDF(session,file,(target,pdf)=>{writeNamingV7SmokeFile(context,target,pdf);}),captureSmokePage,context);
        assertNamingV7SmokeContext(context);
        writeNamingV7SmokeArtifact(context,'naming-v7-smoke-result.json',JSON.stringify({appVersion:app.getVersion(),guideUI,naming,smokeCaptureRetries,runtimeVersions:process.versions},null,2));
        if(desktopWorkflow139Requested)writeNamingV7SmokeArtifact(context,'desktop-workflow-139-result.json',JSON.stringify({appVersion:app.getVersion(),workflow:naming,runtimeVersions:process.versions},null,2));
        if(desktopWorkflow145Requested)writeNamingV7SmokeArtifact(context,'desktop-workflow-145-result.json',JSON.stringify({appVersion:app.getVersion(),workflow:naming,runtimeVersions:process.versions},null,2));
        await window.webContents.executeJavaScript('window.__smokeReady=true');assertNamingV7SmokeContext(context);namingV7Completed=true;app.quit();return;
      }
      if(process.env.NAMING_STUDIO_SMOKE_SCOPE==='naming-v6'){
        const naming=await smokeNamingV6(window,service,process.env.NAMING_STUDIO_SMOKE,profile,pref,exportPDF,captureSmokePage);
        const officialNamePopularity=await smokeOfficialNamePopularity(window,service,process.env.NAMING_STUDIO_SMOKE,captureSmokePage);
        atomicWrite(join(process.env.NAMING_STUDIO_SMOKE,'naming-v6-smoke-result.json'),JSON.stringify({appVersion:app.getVersion(),guideUI,naming,officialNamePopularity,smokeCaptureRetries,runtimeVersions:process.versions},null,2));
        await window.webContents.executeJavaScript('window.__smokeReady=true');if(process.env.NAMING_STUDIO_SMOKE_EXIT==='1'){app.quit();return;}
        return;
      }
      if(process.env.NAMING_STUDIO_SMOKE_SCOPE==='naming-v5'){
        const joint=await smokeRenJointBattle(window,service,process.env.NAMING_STUDIO_SMOKE,profile,pref,exportPDF,captureSmokePage);
        const naming=await smokeNamingV5(window,service,process.env.NAMING_STUDIO_SMOKE,profile,pref,exportPDF,captureSmokePage);
        atomicWrite(join(process.env.NAMING_STUDIO_SMOKE,'naming-v5-smoke-result.json'),JSON.stringify({appVersion:app.getVersion(),guideUI,joint,naming,smokeCaptureRetries,runtimeVersions:process.versions},null,2));
        await window.webContents.executeJavaScript('window.__smokeReady=true');if(process.env.NAMING_STUDIO_SMOKE_EXIT)app.quit();return;
      }
      if(process.env.NAMING_STUDIO_SMOKE_SCOPE==='naming-readings'){
        const readings=await smokeNamingRules(window,service,process.env.NAMING_STUDIO_SMOKE,profile,pref,exportPDF,captureSmokePage);
        atomicWrite(join(process.env.NAMING_STUDIO_SMOKE,'naming-reading-smoke-result.json'),JSON.stringify({appVersion:app.getVersion(),guideUI,readings,smokeCaptureRetries,runtimeVersions:process.versions},null,2));
        await window.webContents.executeJavaScript('window.__smokeReady=true');if(process.env.NAMING_STUDIO_SMOKE_EXIT)app.quit();return;
      }
      if(process.env.NAMING_STUDIO_SMOKE_SCOPE==='classics'){
        const classics=await smokeClassics(window,service,process.env.NAMING_STUDIO_SMOKE,profile,pref,exportPDF,captureSmokePage);
        atomicWrite(join(process.env.NAMING_STUDIO_SMOKE,'classics-smoke-result.json'),JSON.stringify({appVersion:app.getVersion(),guideUI,classics,smokeCaptureRetries,runtimeVersions:process.versions},null,2));
        await window.webContents.executeJavaScript('window.__smokeReady=true');if(process.env.NAMING_STUDIO_SMOKE_EXIT)app.quit();return;
      }
      if(process.env.NAMING_STUDIO_SMOKE_SCOPE==='ren-directions'){
        const directions=await smokeRenDirections(window,service,process.env.NAMING_STUDIO_SMOKE,profile,pref,exportPDF,captureSmokePage);
        atomicWrite(join(process.env.NAMING_STUDIO_SMOKE,'ren-directions-smoke-result.json'),JSON.stringify({appVersion:app.getVersion(),guideUI,directions,smokeCaptureRetries,runtimeVersions:process.versions},null,2));
        await window.webContents.executeJavaScript('window.__smokeReady=true');if(process.env.NAMING_STUDIO_SMOKE_EXIT)app.quit();return;
      }
      if(process.env.NAMING_STUDIO_SMOKE_SCOPE==='yue-coverage'){
        const coverage=await smokeYueCoverage(window,service,process.env.NAMING_STUDIO_SMOKE,profile,pref,exportPDF,captureSmokePage);
        atomicWrite(join(process.env.NAMING_STUDIO_SMOKE,'yue-coverage-smoke-result.json'),JSON.stringify({appVersion:app.getVersion(),guideUI,coverage,smokeCaptureRetries,runtimeVersions:process.versions},null,2));
        await window.webContents.executeJavaScript('window.__smokeReady=true');if(process.env.NAMING_STUDIO_SMOKE_EXIT)app.quit();return;
      }
      if(process.env.NAMING_STUDIO_SMOKE_SCOPE==='ren-capacities'){
        const capacities=await smokeRenCapacities(window,service,process.env.NAMING_STUDIO_SMOKE,profile,pref,exportPDF,captureSmokePage);
        writeFileSync(join(process.env.NAMING_STUDIO_SMOKE,'ren-capacities-smoke-result.json'),JSON.stringify({appVersion:app.getVersion(),guideUI,capacities,smokeCaptureRetries,runtimeVersions:process.versions},null,2));
        await window.webContents.executeJavaScript('window.__smokeReady=true');if(process.env.NAMING_STUDIO_SMOKE_EXIT)app.quit();return;
      }
      const result=await service.generate(profile,pref),first=result.session.candidates[0];const choices=Object.fromEntries(first.numerology!.strokes.map(c=>[String(c.position),(c.options.find(r=>r.glyph===c.inputChar&&r.sourceId==='breezy-kangxi-radicals')||c.options[0]).id]));
      result.session=service.updateNumerology(result.session.id,first.id,choices,result.session.reviewRevision??0,result.session.reviewToken);
      if(result.session.candidates[0].numerology?.status!=='complete')throw new Error('数理字形确认或五格计算验收失败。');
      const markers=result.session.analysis.qimen.auxiliary;
      if(!markers||markers.markers.length!==2||!markers.markers.some(m=>m.kind==='xunkong')||!markers.markers.some(m=>m.kind==='yima')||result.session.analysis.qimen.palaces.find(p=>p.number===5)!.marks.some(m=>m.startsWith('时')))throw new Error('旬空、驿马快照或中宫边界验收失败。');
      const patterns=result.session.analysis.qimen.patterns;
      if(!patterns||patterns.checks.length!==7||patterns.rules.length!==7||patterns.checks.some(check=>!['matched','not-matched'].includes(check.status)))throw new Error('奇门结构检查快照不完整。');
      const stemTombs=result.session.analysis.qimen.stemTombs;
      if(!stemTombs||stemTombs.checks.length!==10||stemTombs.checks[0].stem!=='甲'||stemTombs.checks[0].status!=='not-directly-observed'||stemTombs.checks.filter(check=>check.status==='not-directly-observed').length!==1)throw new Error('独立十干墓支参考或甲未直接观测状态验收失败。');
      const baziEvidence=result.session.analysis.bazi.evidence;
      if(result.session.factVerification?.status!=='verified-builtin')throw new Error('当前候选用字与引文未按内置原版本核验。');
      if(!baziEvidence||baziEvidence.stems.length!==4||baziEvidence.opinions.length!==2||baziEvidence.monthAuthority.status!=='determined'||baziEvidence.monthAuthority.methodId!==profile.monthAuthorityMethod||!baziEvidence.monthAuthority.candidates.length||baziEvidence.monthAuthority.segments.length!==1||baziEvidence.hiddenStems.length<4)throw new Error('八字分层证据或月令选表快照验收失败。');
      if(!baziEvidence.monthlySeasonal||baziEvidence.monthlySeasonal.methodId!=='qiongtong-2294674-initial/1.0.0'||!baziEvidence.monthlySeasonal.cases.length||baziEvidence.monthlySeasonal.cases[0].dayMaster!=='甲'||baziEvidence.monthlySeasonal.cases[0].monthBranch!=='戌')throw new Error('逐月初始取用参考快照验收失败。');
      const out=process.env.NAMING_STUDIO_SMOKE;await exportPDF(result.session,join(out,'sample-report.pdf'));
      const testSecret='fixture-not-a-real-key';service.saveSettings(service.store.settings(),testSecret);const protectedBytes=readFileSync(keyFile);const secretVerified=service.bootstrap().settings.hasApiKey&&!protectedBytes.includes(Buffer.from(testSecret))&&secrets.read(service.store.settings().apiBaseUrl)===testSecret&&secrets.read('https://different-fixture.example/v1')==='';service.saveSettings(service.store.settings(),'');
      const runtime=await window.webContents.executeJavaScript(`({title:document.title,bridge:typeof window.studio?.bootstrap,body:document.body.innerText.slice(0,2000)})`);
      if(!secretVerified||runtime.bridge!=='function'||!runtime.body.includes('起名工作台'))throw new Error('桌面渲染或系统密钥保护验收失败。');
      await new Promise<void>(resolve=>{window.webContents.once('did-finish-load',()=>resolve());window.webContents.reload();});
      const qimenUI=await window.webContents.executeJavaScript(`(async()=>{
        const wait=async(selector)=>{for(let i=0;i<100;i++){const e=document.querySelector(selector);if(e)return e;await new Promise(r=>setTimeout(r,40));}throw new Error('UI wait: '+selector);};
        const nav=async(text)=>{await wait('nav .nav-item');const e=[...document.querySelectorAll('nav .nav-item')].find(x=>x.textContent.includes(text));if(!e)throw new Error('Missing nav: '+text);e.click();};
        await nav('方案与报告');(await wait('.session-item')).click();await nav('奇门九宫');await wait('.qimen-patterns');
        await wait('.qimen-stem-tombs');return {body:document.querySelector('.qimen-workspace')?.innerText||'',marks:[...document.querySelectorAll('.palace-marks')].map(e=>e.innerText),structuralText:document.querySelector('.qimen-patterns')?.innerText||'',structuralChecks:document.querySelectorAll('.qimen-pattern-group').length,stemTombText:document.querySelector('.qimen-stem-tombs')?.innerText||'',stemTombChecks:document.querySelectorAll('.qimen-stem-tomb-check').length,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};
      })()`);
      if(!qimenUI.body.includes('时旬空')||!qimenUI.body.includes('时驿马')||!qimenUI.body.includes(markers.version)||qimenUI.horizontalOverflow)throw new Error('旬空、驿马实际界面验收失败。');
      if(qimenUI.structuralChecks!==7||!qimenUI.structuralText.includes(patterns.version)||!qimenUI.structuralText.includes('未命中清单'))throw new Error('七项结构检查实际界面验收失败。');
      if(qimenUI.stemTombChecks!==10||!qimenUI.stemTombText.includes('未直接观测')||!qimenUI.stemTombText.includes('乙取戌')||!qimenUI.stemTombText.includes('坤二宫'))throw new Error('独立十干墓支界面验收失败。');
      await window.webContents.executeJavaScript(`document.querySelector('.qimen-patterns').scrollIntoView({block:'start'})`);
      await new Promise(resolve=>setTimeout(resolve,120));
      const qimenScreenshot=await captureSmokePage();if(qimenScreenshot.length>500000)throw new Error('界面预览超过500KB');writeFileSync(join(out,'qimen-preview.jpg'),qimenScreenshot);
      const deliveryUI=await window.webContents.executeJavaScript(`(async()=>{
        const wait=async(selector)=>{for(let i=0;i<100;i++){const e=document.querySelector(selector);if(e)return e;await new Promise(r=>setTimeout(r,40));}throw new Error('Delivery UI wait: '+selector);};
        const nav=[...document.querySelectorAll('nav .nav-item')].find(e=>e.textContent.includes('方案与报告'));nav.click();await wait('.session-catalog');
        const exportButton=[...document.querySelectorAll('.page-heading button')].find(e=>e.textContent.includes('导出 PDF'));if(!exportButton)throw new Error('Missing export action');exportButton.click();
        const dialog=await wait('[role="dialog"] .export-confirmation');
        const result={text:dialog.innerText,names:[...dialog.querySelectorAll('.export-candidate-list strong')].map(e=>e.textContent),catalog:document.querySelector('.catalog-result-count')?.innerText||'',horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};
        [...dialog.querySelectorAll('button')].find(e=>e.textContent.includes('返回审阅')).click();return result;
      })()`);
      if(deliveryUI.names.join('|')!==result.session.candidates.map(c=>c.fullName).join('|')||!deliveryUI.text.includes(sessionBatchLabel(result.session))||deliveryUI.horizontalOverflow)throw new Error('桌面导出确认名单或批次验收失败。');
      if(!deliveryUI.text.includes(profile.fatherName)||!deliveryUI.text.includes(profile.motherName)||!deliveryUI.text.includes(profile.monthAuthorityMethod)||!deliveryUI.text.includes(profile.seasonalMethod)||!deliveryUI.text.includes('已按内置原版本核对用字与引文'))throw new Error('导出前家庭、方法或事实核验说明缺失。');
      const favorableUI=await window.webContents.executeJavaScript(`(async()=>{
        const wait=async(selector)=>{for(let i=0;i<100;i++){const e=document.querySelector(selector);if(e)return e;await new Promise(r=>setTimeout(r,40));}throw new Error('Favorable UI wait: '+selector);};
        const nav=async(text)=>{const e=[...document.querySelectorAll('nav .nav-item')].find(x=>x.textContent.includes(text));if(!e)throw new Error('Missing nav: '+text);e.click();await new Promise(r=>setTimeout(r,40));};
        const selection=()=>[...document.querySelectorAll('.manual-review .element-options button')].map(e=>({element:e.dataset.element,selected:e.getAttribute('aria-pressed')}));
        await nav('八字与五行');await wait('.manual-review');const baseline=selection();
        const element=baseline[0].element;document.querySelector('.manual-review .element-options button[data-element="'+element+'"]').click();await new Promise(r=>setTimeout(r,40));const changed=selection();
        await nav('方案与报告');await wait('.session-catalog');await nav('八字与五行');await wait('.manual-review');const returned=selection();
        await nav('方案与报告');await wait('.session-catalog');const exportButton=[...document.querySelectorAll('.page-heading button')].find(e=>e.textContent.includes('导出 PDF'));exportButton.click();await wait('.manual-review');const exportBlocked=!document.querySelector('.export-confirmation')&&document.body.innerText.includes('请先应用或撤销五行草稿后再导出');
        document.querySelector('.manual-review .element-options button[data-element="'+element+'"]').click();await new Promise(r=>setTimeout(r,40));const restored=selection();
        return {baseline,changed,returned,restored,exportBlocked,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};
      })()`);
      if(JSON.stringify(favorableUI.changed)!==JSON.stringify(favorableUI.returned)||JSON.stringify(favorableUI.baseline)!==JSON.stringify(favorableUI.restored)||!favorableUI.exportBlocked||favorableUI.horizontalOverflow||favorableUI.baseline.some((item:{selected:string|null})=>!['true','false'].includes(item.selected??'')))throw new Error('人工五行草稿、选中语义或导出保护实际界面验收失败。');
      const baziUI=await window.webContents.executeJavaScript(`(async()=>{const nav=[...document.querySelectorAll('nav .nav-item')].find(e=>e.textContent.includes('八字与五行'));nav.click();for(let i=0;i<100&&!document.querySelector('.bazi-evidence');i++)await new Promise(r=>setTimeout(r,40));const panel=document.querySelector('.bazi-evidence');if(!panel)throw new Error('Missing Bazi evidence panel');panel.scrollIntoView({block:'start'});return {text:panel.innerText,sourceCount:panel.querySelectorAll('.bazi-evidence-provenance .bazi-evidence-sources > li').length,opinionCount:panel.querySelectorAll('.bazi-evidence-opinion').length,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};})()`);
      if(baziUI.opinionCount!==2||!baziUI.text.includes('八字分层证据')||!baziUI.text.includes('司权')||!baziUI.text.includes(baziEvidence.version)||baziUI.horizontalOverflow)throw new Error('八字分层证据实际界面验收失败。');
      const baziScreenshot=await captureSmokePage();if(baziScreenshot.length>500000)throw new Error('八字预览超过500KB');writeFileSync(join(out,'bazi-evidence-preview.jpg'),baziScreenshot);
      const seasonalUI=await window.webContents.executeJavaScript(`(async()=>{const panel=document.querySelector('.monthly-seasonal.selected');if(!panel)throw new Error('Missing monthly seasonal reference');panel.scrollIntoView({block:'start'});await Promise.race([new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))),new Promise(resolve=>setTimeout(resolve,250))]);return {text:panel.innerText,cases:panel.querySelectorAll('.monthly-seasonal-case').length,uses:panel.querySelectorAll('.monthly-seasonal-uses li').length,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};})()`);
      if(seasonalUI.cases!==baziEvidence.monthlySeasonal.cases.length||!seasonalUI.text.includes(baziEvidence.monthlySeasonal.methodId)||!seasonalUI.text.includes('甲日 · 戌月')||!seasonalUI.text.includes('丁')||seasonalUI.horizontalOverflow)throw new Error('逐月调候原文参考实际界面验收失败。');
      const seasonalScreenshot=await captureSmokePage();if(seasonalScreenshot.length>500000)throw new Error('逐月参考预览超过500KB');writeFileSync(join(out,'monthly-seasonal-preview.jpg'),seasonalScreenshot);
      await window.webContents.executeJavaScript(`[...document.querySelectorAll('nav .nav-item')].find(e=>e.textContent.includes('方案与报告')).click()`);
      const sourcesUI=await window.webContents.executeJavaScript(`(async()=>{for(let i=0;i<100&&!document.querySelector('.session-sources summary');i++)await new Promise(r=>setTimeout(r,40));const summary=document.querySelector('.session-sources summary');if(!summary)throw new Error('Missing saved source registry');summary.click();document.querySelector('.session-sources').scrollIntoView({block:'start'});return {count:document.querySelectorAll('.session-source-record').length,text:document.querySelector('.session-sources').innerText,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};})()`);
      const sourceSnapshot=result.session.sourceSnapshot;
      if(!sourceSnapshot||sourcesUI.count!==sourceSnapshot.sources.length||sourcesUI.horizontalOverflow||!sourcesUI.text.includes(sourceSnapshot.dataVersion)||!sourcesUI.text.includes(sourceSnapshot.sources[0].commit))throw new Error('生成时来源清单实际界面验收失败。');
      const sourcesScreenshot=await captureSmokePage();if(sourcesScreenshot.length>500000)throw new Error('来源界面预览超过500KB');writeFileSync(join(out,'sources-preview.jpg'),sourcesScreenshot);
      const maintenanceUI=await window.webContents.executeJavaScript(`(async()=>{const nav=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='工作室设置');nav.click();for(let i=0;i<100&&!document.querySelector('.data-maintenance');i++)await new Promise(r=>setTimeout(r,40));const panel=document.querySelector('.data-maintenance');if(!panel)throw new Error('Missing maintenance panel');const before=panel.innerText;const guide=[...document.querySelectorAll('button')].find(e=>e.getAttribute('aria-label')==='使用指南'||e.textContent.trim()==='使用指南');if(!guide)throw new Error('Missing guide replay');guide.click();for(let i=0;i<100&&!document.querySelector('.first-use-guide');i++)await new Promise(r=>setTimeout(r,40));const shown=!!document.querySelector('.first-use-guide');const skip=[...document.querySelectorAll('[role="dialog"] button')].find(e=>e.textContent.includes('先跳过'));if(skip)skip.click();return{text:before,guideReopened:shown,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};})()`);
      if(!maintenanceUI.text.includes(service.bootstrap().maintenance.active.sha256)||!maintenanceUI.text.includes('历史知识包归档')||!maintenanceUI.guideReopened||maintenanceUI.horizontalOverflow)throw new Error('维护状态或引导重看界面验收失败。');
      // Smoke-only chooser fixture: clicks, confirmation and state updates still use the actual renderer and IPC.
      const initMaintenanceSql=(await import('sql.js')).default;
      const maintenanceSQL=await initMaintenanceSql({locateFile:()=>join(root,'node_modules/sql.js/dist/sql-wasm.wasm')});
      const maintenanceInitial=service.bootstrap().maintenance.active;
      const maintenanceSessionsBefore=JSON.stringify(service.bootstrap().sessions);
      const fixtureDb=new maintenanceSQL.Database(store.currentPackBytes());
      let maintenanceFixtureBytes:Uint8Array;
      try{
        const firstSource=fixtureDb.exec('SELECT rowid,json FROM sources ORDER BY rowid LIMIT 1')[0]?.values[0];
        if(!firstSource)throw new Error('维护夹具缺少可修改来源行。');
        const source=JSON.parse(String(firstSource[1]));source.commit=String(source.commit)+';isolated-smoke-preview';
        fixtureDb.run('UPDATE sources SET json=? WHERE rowid=?',[JSON.stringify(source),firstSource[0]]);
        maintenanceFixtureBytes=fixtureDb.export();
      }finally{fixtureDb.close();}
      const maintenanceFixturePath=join(out,'maintenance-preview-fixture.sqlite');writeFileSync(maintenanceFixturePath,maintenanceFixtureBytes);
      const maintenanceFixtureVersion=store.readPack(maintenanceFixtureBytes).version;
      const maintenanceFixtureSha=(await import('node:crypto')).createHash('sha256').update(maintenanceFixtureBytes).digest('hex');
      if(maintenanceFixtureSha===maintenanceInitial.sha256)throw new Error('维护夹具没有产生独立版本。');
      const originalMaintenanceChooser=dialog.showOpenDialog;
      let maintenanceChooserSelections=0;
      dialog.showOpenDialog=(async()=>{maintenanceChooserSelections++;return {canceled:false,filePaths:[maintenanceFixturePath]};}) as typeof dialog.showOpenDialog;
      let maintenancePreviewUI:Record<string,unknown>;
      try{
        const importPreview=await window.webContents.executeJavaScript(`(async()=>{
          const wait=async(test,label)=>{for(let i=0;i<150;i++){const value=test();if(value)return value;await new Promise(r=>setTimeout(r,40));}throw new Error('Maintenance UI wait: '+label);};
          await wait(()=>!document.querySelector('.first-use-guide'),'guide closed');
          const button=await wait(()=>[...document.querySelectorAll('.data-maintenance button')].find(e=>e.textContent.trim()==='预览导入数据包'&&!e.disabled),'import action');button.click();
          const panel=await wait(()=>document.querySelector('[role="dialog"] .data-pack-confirmation'),'import preview');
          panel.scrollIntoView({block:'start'});await new Promise(r=>setTimeout(r,300));
          return {text:panel.innerText,hashes:[...panel.querySelectorAll('.maintenance-sha dd')].map(e=>e.textContent),versions:[...panel.querySelectorAll('.maintenance-pack-info dd')].filter((_,i)=>i%3===0).map(e=>e.textContent),sourceChanges:panel.querySelectorAll('.maintenance-source-changes li').length,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};
        })()`);
        if(importPreview.hashes[0]!==maintenanceInitial.sha256||importPreview.hashes[1]!==maintenanceFixtureSha||!importPreview.text.includes(maintenanceInitial.version)||!importPreview.text.includes(maintenanceFixtureVersion)||!importPreview.text.includes('历史方案')||!importPreview.text.includes('内置术数规则')||importPreview.sourceChanges!==1||importPreview.horizontalOverflow)throw new Error('真实导入预览未准确显示基线、夹具哈希或替换范围。');
        const maintenancePreviewImage=await captureSmokePage();if(maintenancePreviewImage.length>500000)throw new Error('维护预览图片超过500KB');writeFileSync(join(out,'maintenance-preview.jpg'),maintenancePreviewImage);
        const cancelled=await window.webContents.executeJavaScript(`(async()=>{
          const panel=document.querySelector('.data-pack-confirmation');const cancel=[...panel.querySelectorAll('button')].find(e=>e.textContent.trim()==='取消导入');if(!cancel)throw new Error('Missing import cancel');cancel.click();
          for(let i=0;i<150;i++){const popup=document.querySelector('.data-pack-confirmation');if(!popup&&document.body.innerText.includes('已取消导入')){const state=await window.studio.bootstrap();return {active:state.maintenance.active,text:document.querySelector('.toast')?.innerText||''};}await new Promise(r=>setTimeout(r,40));}throw new Error('Import cancel did not finish');
        })()`);
        if(cancelled.active.sha256!==maintenanceInitial.sha256||cancelled.active.version!==maintenanceInitial.version||JSON.stringify(service.bootstrap().sessions)!==maintenanceSessionsBefore)throw new Error('取消导入改变了当前知识包或旧方案。');
        const applied=await window.webContents.executeJavaScript(`(async()=>{
          const wait=async(test,label)=>{for(let i=0;i<150;i++){const value=test();if(value)return value;await new Promise(r=>setTimeout(r,40));}throw new Error('Maintenance UI wait: '+label);};
          const action=await wait(()=>[...document.querySelectorAll('.data-maintenance button')].find(e=>e.textContent.trim()==='预览导入数据包'&&!e.disabled),'second import');action.click();
          const panel=await wait(()=>document.querySelector('[role="dialog"] .data-pack-confirmation'),'second preview');const beforeHashes=[...panel.querySelectorAll('.maintenance-sha dd')].map(e=>e.textContent);
          const confirm=[...panel.querySelectorAll('button')].find(e=>e.textContent.trim()==='确认导入此知识包');if(!confirm)throw new Error('Missing import confirm');confirm.click();
          await wait(()=>!document.querySelector('.data-pack-confirmation')&&!document.querySelector('.data-maintenance[aria-busy="true"]')&&document.querySelector('.data-maintenance>.maintenance-pack-info .maintenance-sha dd')?.textContent===${JSON.stringify(maintenanceFixtureSha)},'applied package refreshed');
          const state=await window.studio.bootstrap();return {beforeHashes,active:state.maintenance.active,text:document.querySelector('.toast')?.innerText||'',horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};
        })()`);
        if(applied.beforeHashes[0]!==maintenanceInitial.sha256||applied.beforeHashes[1]!==maintenanceFixtureSha||applied.active.sha256!==maintenanceFixtureSha||applied.active.version!==maintenanceFixtureVersion||JSON.stringify(service.bootstrap().sessions)!==maintenanceSessionsBefore||applied.horizontalOverflow)throw new Error('确认导入未应用预览字节、基线或改变了旧方案。');
        const rolledBack=await window.webContents.executeJavaScript(`(async()=>{
          const wait=async(test,label)=>{for(let i=0;i<150;i++){const value=test();if(value)return value;await new Promise(r=>setTimeout(r,40));}throw new Error('Maintenance UI wait: '+label);};
          const action=await wait(()=>[...document.querySelectorAll('.data-maintenance button')].find(e=>e.textContent.includes('预览回退上一版')&&!e.disabled),'rollback action');action.click();
          const panel=await wait(()=>document.querySelector('[role="dialog"] .data-pack-confirmation'),'rollback preview');const beforeText=panel.innerText,beforeHashes=[...panel.querySelectorAll('.maintenance-sha dd')].map(e=>e.textContent);
          const confirm=[...panel.querySelectorAll('button')].find(e=>e.textContent.trim()==='确认回退此知识包');if(!confirm)throw new Error('Missing rollback confirm');confirm.click();
          await wait(()=>!document.querySelector('.data-pack-confirmation')&&!document.querySelector('.data-maintenance[aria-busy="true"]')&&document.querySelector('.data-maintenance>.maintenance-pack-info .maintenance-sha dd')?.textContent===${JSON.stringify(maintenanceInitial.sha256)},'rollback refreshed');
          const state=await window.studio.bootstrap();return {beforeText,beforeHashes,active:state.maintenance.active,text:document.querySelector('.toast')?.innerText||'',horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};
        })()`);
        if(rolledBack.beforeHashes[0]!==maintenanceFixtureSha||rolledBack.beforeHashes[1]!==maintenanceInitial.sha256||!rolledBack.beforeText.includes('不会恢复客户备份')||rolledBack.active.sha256!==maintenanceInitial.sha256||rolledBack.active.version!==maintenanceInitial.version||JSON.stringify(service.bootstrap().sessions)!==maintenanceSessionsBefore||rolledBack.horizontalOverflow||maintenanceChooserSelections!==2)throw new Error('回退预览基线、恢复哈希或旧方案保持验收失败。');
        maintenancePreviewUI={note:'实际 Electron renderer 点击及 IPC 端到端；仅文件选择由隔离夹具替代，未实测原生 chooser。',fixturePath:maintenanceFixturePath,fixtureSha256:maintenanceFixtureSha,fixtureVersion:maintenanceFixtureVersion,initial:maintenanceInitial,importPreview,cancelled,applied,rolledBack,chooserFixtureSelections:maintenanceChooserSelections,existingSessionsUnchanged:true,previewScreenshot:join(out,'maintenance-preview.jpg')};
      }finally{dialog.showOpenDialog=originalMaintenanceChooser;}
      const aiSmokeSettingsBefore=JSON.stringify(service.bootstrap().settings);
      const aiSmokeCustomerBytes=readFileSync(join(user,'customers.sqlite'));
      const aiSmokeSessionsBefore=JSON.stringify(service.bootstrap().sessions);
      const aiSmokeHttp=await import('node:http');
      const aiSmokeKey='LOCAL-SMOKE-ONLY-STRUCTURED-KEY';
      let aiSmokeMode:'valid'|'malformed'='valid';
      const aiSmokeRequests:{model:string;jsonRequested:boolean;authorizationMatched:boolean;fictionalPayload:boolean}[]=[];
      const aiSmokeServer=aiSmokeHttp.createServer(async(request,response)=>{
        try{
          let raw='';for await(const chunk of request)raw+=chunk;
          const payload=JSON.parse(raw),input=JSON.parse(payload.messages?.find((message:{role:string})=>message.role==='user')?.content??'{}');
          aiSmokeRequests.push({model:String(payload.model??''),jsonRequested:payload.response_format?.type==='json_object',authorizationMatched:request.headers.authorization===`Bearer ${aiSmokeKey}`,fictionalPayload:input.preferences?.requiredChars==='安宁'&&['customerName','fatherName','motherName','birthDate','birthTime','birthPlace','notes'].every(key=>!Object.hasOwn(input,key))});
          response.setHeader('Content-Type','application/json');
          if(aiSmokeMode==='malformed'){response.end('malformed-outer-json '+aiSmokeKey);return;}
          response.end(JSON.stringify({choices:[{message:{content:JSON.stringify({candidates:[{givenName:'安宁',themeIds:['peace'],citationIds:[]}]})}}]}));
        }catch{response.statusCode=500;response.end('{}');}
      });
      await new Promise<void>((resolve,reject)=>{aiSmokeServer.once('error',reject);aiSmokeServer.listen(0,'127.0.0.1',resolve);});
      const aiSmokeAddress=aiSmokeServer.address();if(!aiSmokeAddress||typeof aiSmokeAddress==='string')throw new Error('本地AI检测夹具未取得端口。');
      const aiSmokeEndpoint=`http://127.0.0.1:${aiSmokeAddress.port}/v1`;
      let aiCapabilityUI:Record<string,unknown>;
      try{
        await window.webContents.executeJavaScript(`(async()=>{
          const findField=label=>[...document.querySelectorAll('.settings-panel .field')].find(field=>field.querySelector('label')?.textContent.trim()===label)?.querySelector('input');
          const fields={endpoint:findField('接口地址'),model:findField('模型名称'),key:findField('API 密钥')};if(Object.values(fields).some(field=>!field))throw new Error('Missing AI settings inputs');
          window.__smokeAiDraft={endpoint:fields.endpoint.value,model:fields.model.value,key:fields.key.value};
          const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
          const edit=async(field,value)=>{setter.call(field,value);field.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,40));};
          await edit(fields.endpoint,${JSON.stringify(aiSmokeEndpoint)});await edit(fields.model,'local-smoke-valid-model');await edit(fields.key,${JSON.stringify(aiSmokeKey)});
          const detect=[...document.querySelectorAll('.ai-capability button')].find(button=>button.textContent.trim()==='检测命名格式'&&!button.disabled);if(!detect)throw new Error('Missing naming capability action');detect.click();
        })()`);
        const passedCapability=await window.webContents.executeJavaScript(`(async()=>{
          for(let i=0;i<200;i++){const card=document.querySelector('.ai-capability-result.passed');if(card&&!document.querySelector('.busy-indicator')){card.scrollIntoView({block:'center'});await new Promise(r=>setTimeout(r,120));return{text:card.innerText,checks:[...card.querySelectorAll('.ai-capability-checks li')].map(row=>({label:row.querySelector('span')?.textContent,status:row.querySelector('strong')?.textContent})),horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};}await new Promise(r=>setTimeout(r,50));}throw new Error('AI capability fixture did not reach passed state');
        })()`);
        if(passedCapability.checks.length!==4||passedCapability.checks.some((check:{status:string})=>check.status!=='通过')||!passedCapability.text.includes('不认证实际创意质量')||passedCapability.text.includes(aiSmokeKey)||passedCapability.horizontalOverflow)throw new Error('真实命名格式通过卡未显示四阶段或隐私范围。');
        const aiCapabilityScreenshot=await captureSmokePage();if(aiCapabilityScreenshot.length>500000)throw new Error('AI能力预览图片超过500KB');writeFileSync(join(out,'ai-capability-preview.jpg'),aiCapabilityScreenshot);
        const staleCapability=await window.webContents.executeJavaScript(`(async()=>{
          const field=[...document.querySelectorAll('.settings-panel .field')].find(field=>field.querySelector('label')?.textContent.trim()==='模型名称')?.querySelector('input');if(!field)throw new Error('Missing model input');
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(field,'local-smoke-malformed-model');field.dispatchEvent(new Event('input',{bubbles:true}));
          for(let i=0;i<100;i++){const card=document.querySelector('.ai-capability-result.expired');if(card)return{text:card.innerText,stale:true};await new Promise(r=>setTimeout(r,40));}throw new Error('Edited model did not invalidate capability result');
        })()`);
        if(!staleCapability.text.includes('检测结果已过期'))throw new Error('模型修改后的旧检测卡没有过期说明。');
        aiSmokeMode='malformed';
        const failedCapability=await window.webContents.executeJavaScript(`(async()=>{
          const detect=[...document.querySelectorAll('.ai-capability button')].find(button=>button.textContent.trim()==='检测命名格式'&&!button.disabled);if(!detect)throw new Error('Missing repeat naming capability action');detect.click();
          for(let i=0;i<200;i++){const card=document.querySelector('.ai-capability-result.failed');if(card&&!document.querySelector('.busy-indicator'))return{text:card.innerText,checks:[...card.querySelectorAll('.ai-capability-checks li')].map(row=>({label:row.querySelector('span')?.textContent,status:row.querySelector('strong')?.textContent})),bodyContainsFixtureKey:document.body.innerText.includes(${JSON.stringify(aiSmokeKey)}),horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};await new Promise(r=>setTimeout(r,50));}throw new Error('Malformed AI fixture did not reach failed state');
        })()`);
        if(!failedCapability.text.includes('AI 接口的外层响应不是有效JSON')||failedCapability.bodyContainsFixtureKey||failedCapability.checks[0]?.status!=='未通过'||failedCapability.horizontalOverflow)throw new Error('畸形AI响应未使用固定错误或泄漏了夹具密钥。');
        if(aiSmokeRequests.length!==2||aiSmokeRequests.some(request=>!request.jsonRequested||!request.authorizationMatched||!request.fictionalPayload))throw new Error('命名格式检测未使用真实结构协议或虚构资料边界。');
        aiCapabilityUI={note:'实际 Electron DOM 与 testNamingCapability IPC，HTTP只请求本机固定夹具；未验证真实外部模型或创意质量。',endpoint:aiSmokeEndpoint,passed:passedCapability,staleAfterModelEdit:staleCapability,malformed:failedCapability,requestChecks:aiSmokeRequests,previewScreenshot:join(out,'ai-capability-preview.jpg')};
      }finally{
        try{await window.webContents.executeJavaScript(`(async()=>{
          const saved=window.__smokeAiDraft;if(!saved)return;const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
          const edit=async(label,value)=>{const field=[...document.querySelectorAll('.settings-panel .field')].find(field=>field.querySelector('label')?.textContent.trim()===label)?.querySelector('input');if(!field)throw new Error('Missing restored AI field '+label);setter.call(field,value);field.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,40));};
          await edit('接口地址',saved.endpoint);await edit('模型名称',saved.model);await edit('API 密钥',saved.key);delete window.__smokeAiDraft;
        })()`);}finally{aiSmokeServer.closeAllConnections();await new Promise<void>(resolve=>aiSmokeServer.close(()=>resolve()));}
      }
      if(JSON.stringify(service.bootstrap().settings)!==aiSmokeSettingsBefore||JSON.stringify(service.bootstrap().sessions)!==aiSmokeSessionsBefore||!readFileSync(join(user,'customers.sqlite')).equals(aiSmokeCustomerBytes))throw new Error('命名格式UI检测改变了保存设置、客户库或旧方案。');
      const aiDraftRestored=await window.webContents.executeJavaScript(`(()=>{const field=label=>[...document.querySelectorAll('.settings-panel .field')].find(field=>field.querySelector('label')?.textContent.trim()===label)?.querySelector('input')?.value;return {endpoint:field('接口地址'),model:field('模型名称'),draftKeyEmpty:field('API 密钥')==='',useAi:[...document.querySelectorAll('.settings-panel input[type="checkbox"]')].find(input=>input.className==='switch')?.checked};})()`);
      if(aiDraftRestored.endpoint!==service.store.settings().apiBaseUrl||aiDraftRestored.model!==service.store.settings().model||!aiDraftRestored.draftKeyEmpty||aiDraftRestored.useAi!==service.store.settings().useAi)throw new Error('AI检测后未恢复原草稿或改变了启用状态。');
      const restoreDraftUI=await smokeRestoreDrafts(window,store,out,captureSmokePage);
      const termsUIBefore=await window.webContents.executeJavaScript(`(async()=>{[...document.querySelectorAll('nav .nav-item')].find(button=>button.textContent.includes('八字与五行')).click();for(let i=0;i<100;i++){const summary=document.querySelector('.bazi-evidence>.traditional-terms>summary');if(summary){summary.focus();return {focused:document.activeElement===summary,initiallyClosed:!summary.parentElement.open};}await new Promise(r=>setTimeout(r,40));}throw new Error('Missing Bazi terminology summary');})()`);
      await window.webContents.executeJavaScript(`document.querySelector('.bazi-evidence>.traditional-terms>summary').click()`);
      const termsUIOpened=await window.webContents.executeJavaScript(`(async()=>{for(let i=0;i<100;i++){const panel=document.querySelector('.bazi-evidence>.traditional-terms');if(panel?.open){panel.querySelector('button').focus();return {opened:true,text:panel.innerText};}await new Promise(r=>setTimeout(r,30));}throw new Error('Terminology summary did not expand native details');})()`);
      await window.webContents.executeJavaScript(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
      const termsUIClosed=await window.webContents.executeJavaScript(`(async()=>{for(let i=0;i<100;i++){const panel=document.querySelector('.bazi-evidence>.traditional-terms');if(panel&&!panel.open)return {closed:true,summaryFocus:document.activeElement===panel.querySelector('summary')};await new Promise(r=>setTimeout(r,30));}throw new Error('Terminology Escape did not collapse');})()`);
      if(!termsUIBefore.focused||!termsUIBefore.initiallyClosed||!termsUIOpened.opened||!termsUIClosed.closed||!termsUIClosed.summaryFocus||!termsUIOpened.text.includes('透干')||!termsUIOpened.text.includes('不同流派或表中可能不同'))throw new Error('术语键盘展开、Escape或焦点恢复验收失败。');
      aiCapabilityUI={...aiCapabilityUI,draftsRestored:aiDraftRestored,savedSettingsUnchanged:true,customerArchiveBytesUnchanged:true,existingSessionsUnchanged:true};
      const termsKeyboardUI={before:termsUIBefore,opened:termsUIOpened,closed:termsUIClosed,note:'实际Electron DOM事件校验：点击原生summary展开，合成Escape核对收起与焦点恢复；真实Enter/Escape已另用浏览器键盘验证，本项不称原生键盘验收。'};
      const conditionProfile={...profile,id:'smoke-condition',birthDate:'2025-09-23',birthTime:'',timeUnknown:true};
      const conditionAnalysis=service.analyze(conditionProfile);
      if(conditionAnalysis.bazi.evidence?.seasonalConditions?.checks.length!==2||conditionAnalysis.bazi.evidence.seasonalConditions.checks.some(check=>check.status!=='uncertain'||check.observations.length!==2))throw new Error('未知时刻条件补充实盘不确定状态失败。');
      const conditionSession:NamingSession={...result.session,id:'condition-report-fixture',profileId:conditionProfile.id,profile:conditionProfile,analysis:conditionAnalysis,originalFavorable:[...conditionAnalysis.bazi.favorable]};
      await exportPDF(conditionSession,join(out,'seasonal-condition-report.pdf'));
      const congProfile={...profile,id:'smoke-cong',customerName:'从财条件验收',birthDate:'2029-06-24',birthTime:'03:30:00',timeUnknown:false,notes:'隔离自动验收：限定原句字面候选，不是真实客户或成格结论。'};
      const congSession=(await service.generate(congProfile,result.session.preferences)).session;
      const congAnalysis=congSession.analysis,congEvidence=congAnalysis.bazi.evidence?.patternEvidence;
      const congCandidate=congEvidence?.checks.find(check=>check.status==='candidate'&&check.applicability==='applicable');
      if(!congEvidence||!congCandidate||congCandidate.candidateBasis!=='literal-clause-only'||!congCandidate.missing.length||congCandidate.criteria.some(criterion=>criterion.role==='necessary'&&criterion.result!=='met'))throw new Error('从财候选隔离实盘未保留字面范围或未核条件。');
      const congReportPath=join(out,'cong-wealth-report.pdf');await exportPDF(congSession,congReportPath);
      const congUnknownAnalysis=service.analyze({...congProfile,id:'smoke-cong-unknown-analysis',timeUnknown:true,birthTime:'',notes:'仅分析的未知时刻验收，不保存候选或伪造方案。'});
      const congUnknown=congUnknownAnalysis.bazi.evidence?.patternEvidence?.checks.find(check=>check.applicability==='applicable');
      if(congUnknown?.status!=='pending'||!congUnknown.criteria.some(criterion=>criterion.result==='unknown')||congUnknownAnalysis.bazi.pillars.some(pillar=>pillar.label==='时柱'))throw new Error('从财未知时刻实盘未保留待核条件或虚构了时柱。');
      await new Promise<void>(resolve=>{window.webContents.once('did-finish-load',()=>resolve());window.webContents.reload();});
      const patternUI=await window.webContents.executeJavaScript(`(async()=>{
        const wait=async(test,label)=>{for(let i=0;i<150;i++){const value=test();if(value)return value;await new Promise(r=>setTimeout(r,40));}throw new Error('Pattern UI wait: '+label);};
        const nav=async(label)=>{const button=await wait(()=>[...document.querySelectorAll('nav .nav-item')].find(item=>item.textContent.includes(label)),'navigation '+label);button.click();};
        await nav('方案与报告');const session=await wait(()=>[...document.querySelectorAll('.session-item')].find(item=>item.textContent.includes('从财条件验收')),'saved candidate session');session.click();
        await wait(()=>document.querySelector('.session-item[aria-current="true"]')?.textContent.includes('从财条件验收'),'selected candidate identity');await nav('八字与五行');
        const card=await wait(()=>document.querySelector('.pattern-evidence-check.candidate'),'literal candidate');
        for(const selector of ['.pattern-evidence-context','.pattern-evidence-criteria']){const disclosure=card.querySelector(selector);if(disclosure&&!disclosure.open)disclosure.querySelector('summary').click();}
        const provenance=document.querySelector('.pattern-evidence-provenance');if(provenance&&!provenance.open)provenance.querySelector('summary').click();
        card.scrollIntoView({block:'start'});await new Promise(r=>setTimeout(r,120));
        return {text:card.innerText,panelText:document.querySelector('.pattern-evidence')?.innerText||'',activeCards:document.querySelectorAll('.pattern-evidence-check').length,criteria:card.querySelectorAll('.pattern-criterion').length,profile:document.querySelector('.pattern-evidence-provenance .pattern-evidence-locator')?.textContent||'',scopeText:card.querySelector('.pattern-evidence-candidate-note')?.innerText||'',genericHeading:[...document.querySelectorAll('.bazi-evidence-facts>summary')].find(summary=>summary.textContent.includes('旧通用格局'))?.textContent||'',horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};
      })()`);
      writeFileSync(join(out,'pattern-ui-result.json'),JSON.stringify(patternUI,null,2));
      if(patternUI.activeCards!==1||patternUI.criteria!==congCandidate.criteria.length||!patternUI.text.includes('字面条件候选 · 供人工复核')||!patternUI.scopeText.includes('仅软件字面结构')||!patternUI.text.includes('原典水项作用域')||!patternUI.text.includes('历史引文，不作软件结论')||!patternUI.panelText.includes(congEvidence.version)||!patternUI.genericHeading||patternUI.horizontalOverflow)throw new Error('从格原句实际UI未准确显示候选范围、必要条件或历史通用边界。');
      const congScreenshot=await captureSmokePage();if(congScreenshot.length>500000)throw new Error('从财条件预览图片超过500KB');writeFileSync(join(out,'cong-preview.jpg'),congScreenshot);
      const shaProfile={...profile,id:'smoke-sha',customerName:'从杀依赖验收',birthDate:'2024-12-09',birthTime:'13:30:00',timeUnknown:false,notes:'隔离自动验收：额外丁仅作已见信号，水多癸旺等依赖未核，不判完整从杀成立或不成立。'};
      const shaSession=(await service.generate(shaProfile,result.session.preferences)).session,shaAnalysis=shaSession.analysis;
      const shaCheck=shaAnalysis.bazi.evidence?.patternEvidence?.checks.find(check=>check.pattern==='cong-sha'&&check.applicability==='applicable');
      const shaSignal=shaCheck?.criteria.find(criterion=>criterion.decisionUse==='rejection-signal'&&criterion.result==='met');
      if(shaCheck?.status!=='pending'||!shaSignal||shaSignal.contributesToVerdict!==false||shaCheck.opposedBy.length||!shaCheck.decisionBranches?.some(branch=>branch.status==='pending'))throw new Error('从杀已见信号错误越过未核依赖，或未保留整体待审。');
      if(!shaSession.sourceSnapshot?.sources.some(source=>source.id==='bazi-cong-sha-qiongtong-2294674'))throw new Error('从杀来源未进入生成时快照。');
      const shaUnknownAnalysis=service.analyze({...shaProfile,id:'smoke-sha-unknown-analysis',birthTime:'',timeUnknown:true});
      const shaUnknown=shaUnknownAnalysis.bazi.evidence?.patternEvidence?.checks.find(check=>check.id===shaCheck.id);
      if(shaUnknown?.status!=='pending'||shaUnknown.criteria.find(criterion=>criterion.id===shaSignal.id)?.result!=='unknown'||shaUnknown.opposedBy.length)throw new Error('从杀缺时未保留信号未知状态。');
      const shaReportPath=join(out,'cong-sha-report.pdf');await exportPDF(shaSession,shaReportPath);
      await new Promise<void>(resolve=>{window.webContents.once('did-finish-load',()=>resolve());window.webContents.reload();});
      const shaUI=await window.webContents.executeJavaScript(`(async()=>{
        const wait=async(test,label)=>{for(let i=0;i<150;i++){const value=test();if(value)return value;await new Promise(r=>setTimeout(r,40));}throw new Error('Sha UI wait: '+label);};
        const nav=async(label)=>{const button=await wait(()=>[...document.querySelectorAll('nav .nav-item')].find(item=>item.textContent.includes(label)),'navigation '+label);button.click();};
        await nav('方案与报告');(await wait(()=>[...document.querySelectorAll('.session-item')].find(item=>item.textContent.includes('从杀依赖验收')),'saved sha session')).click();
        await wait(()=>document.querySelector('.session-item[aria-current="true"]')?.textContent.includes('从杀依赖验收'),'selected sha identity');await nav('八字与五行');
        const card=await wait(()=>[...document.querySelectorAll('.pattern-evidence-check')].find(item=>item.textContent.includes('丁日子月')),'applicable sha clause');
        for(const selector of ['.pattern-evidence-criteria','.pattern-evidence-decision-branches']){const disclosure=card.querySelector(selector);if(disclosure&&!disclosure.open)disclosure.querySelector('summary').click();}
        card.scrollIntoView({block:'start'});await new Promise(r=>setTimeout(r,120));
        return {text:card.innerText,activeCards:document.querySelectorAll('.pattern-evidence-check').length,criteria:card.querySelectorAll('.pattern-criterion').length,branches:card.querySelectorAll('.pattern-decision-branch').length,qualifiedSignals:[...card.querySelectorAll('.pattern-criterion')].filter(item=>item.innerText.includes('否定分支的局部信号')&&item.innerText.includes('局部事实：已知事实符合')).length,opposedCriteria:card.querySelectorAll('.pattern-criterion.opposed').length,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};
      })()`);
      if(shaUI.activeCards!==1||shaUI.criteria!==shaCheck.criteria.length||shaUI.branches!==shaCheck.decisionBranches!.length||shaUI.qualifiedSignals!==1||shaUI.opposedCriteria||!shaUI.text.includes('前提未齐 · 整句尚未裁决')||!shaUI.text.includes('依赖条件尚未齐备')||shaUI.horizontalOverflow)throw new Error('从杀实际UI没有保留局部信号与依赖前提边界。');
      const shaScreenshot=await captureSmokePage();if(shaScreenshot.length>500000)throw new Error('从杀依赖预览图片超过500KB');writeFileSync(join(out,'sha-preview.jpg'),shaScreenshot);
      const solarTime=await smokeSolarTime(window,service,out,profile,result.session.preferences,exportPDF,captureSmokePage);
      const followingRestrictions=await smokeFollowingRestrictions(window,service,out,profile,result.session.preferences,exportPDF,captureSmokePage);
      const renCommentary=await smokeDitianRen(window,service,out,profile,result.session.preferences,exportPDF,captureSmokePage);
      const renNecessary=await smokeRenNecessary(window,service,out,profile,result.session.preferences,exportPDF);
      const renActions=await smokeRenActions(window,service,out,profile,result.session.preferences,exportPDF,captureSmokePage);
      const nameReadings=await smokeNameReadings(window,service,out,profile,result.session.preferences,exportPDF,captureSmokePage);
      const yueHomophones=await smokeYueHomophones(window,service,out,profile,result.session.preferences,exportPDF,captureSmokePage);
      writeFileSync(join(out,'smoke-result.json'),JSON.stringify({yueHomophones,renActions,nameReadings,renNecessary,renCommentary,followingRestrictions,solarTime,restoreDraftUI,shaUI,shaAnalysis,shaUnknownAnalysis,shaReport:shaReportPath,shaFixtureNote:'已见信号来自隔离service.generate真实存盘，未知时刻仅analyze；未制造成格、反证或候选结论。',patternUI,congAnalysis,congUnknownAnalysis,congReport:congReportPath,congFixtureNote:'候选由隔离service.generate真实存盘；未知时刻仅service.analyze，不伪造或保存未知候选方案。',conditionAnalysis,smokeCaptureRetries,guideUI,maintenanceUI,maintenancePreviewUI,aiCapabilityUI,termsKeyboardUI,runtimeVersions:process.versions,factVerification:result.session.factVerification,favorableUI,candidates:result.session.candidates.length,names:result.session.candidates.map(c=>c.fullName),analysis:result.session.analysis,numerology:result.session.candidates[0].numerology,sourceSnapshot,reviewRevision:result.session.reviewRevision,reviewTokenPresent:!!result.session.reviewToken,bootstrap:service.bootstrap().stats,protectedSecretVerified:secretVerified,runtime,qimenUI,deliveryUI,baziUI,seasonalUI,sourcesUI,pdf:join(out,'sample-report.pdf')},null,2));
      await window.webContents.executeJavaScript(`window.__smokeReady=true`);if(process.env.NAMING_STUDIO_SMOKE_EXIT)app.quit();
    }catch(e){if(namingV7Context||desktop176Context||isNamingV7SmokeRequested()){failNamingV7(e);return;}writeFileSync(join(process.env.NAMING_STUDIO_SMOKE,'smoke-error.txt'),String(e instanceof Error?e.stack:e));app.exit(1);}
  }
}
if(primaryInstance)app.whenReady().then(start).catch(error=>{if(namingV7Context||desktop176Context||isNamingV7SmokeRequested()){failNamingV7(error);return;}if(process.env.NAMING_STUDIO_SMOKE){atomicWrite(join(process.env.NAMING_STUDIO_SMOKE,'smoke-error.txt'),error instanceof Error?error.stack||error.message:String(error));app.exit(1);return;}dialog.showErrorBox('知名启动失败',error instanceof Error?error.message:String(error));app.exit(1);});
app.on('will-quit',()=>{void service?.closeCmnReadingWorker().catch(()=>{});});
app.on('window-all-closed',()=>{if(namingV7Context||desktop176Context){if(!namingV7Completed)failNamingV7(new Error('命名7验收未完成时窗口已关闭'));return;}app.quit();});

}catch(error){if(namingV7Context||desktop176Context||isNamingV7SmokeRequested())failNamingV7(error);else throw error;}
}
