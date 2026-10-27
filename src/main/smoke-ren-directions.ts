import type {BrowserWindow} from 'electron';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import type {StudioService} from './service';
import {atomicWrite} from './store';
import type {BirthProfile,NamingPreferences,NamingSession,SessionRevision} from '../shared/types';
import {REN_CAPACITY_METHOD,REN_DIRECTION_METHOD} from '../shared/ren-method';
import {analyzeProfile as analyzeFrozen13} from '../domain/engine-v13';
import {evaluateName} from '../domain/naming';
import {REN_DIRECTIONS_SOURCE_ID} from '../domain/ren-directions';

const definitions=[
 {key:'wood',date:'2023-02-15',time:'22:00:00',pillars:['癸卯','甲寅','甲辰','乙亥'],checks:[['met','met'],['not-met','unknown']]},
 {key:'woodMetal',date:'1950-03-10',time:'22:00:00',pillars:['庚寅','己卯','甲辰','乙亥'],checks:[['met','met'],['not-met','unknown']]},
 {key:'woodClash',date:'2023-02-15',time:'20:00:00',pillars:['癸卯','甲寅','甲辰','甲戌'],checks:[['met','met'],['not-met','unknown']]},
 {key:'fire',date:'1977-06-18',time:'14:00:00',pillars:['丁巳','丙午','丙午','乙未'],checks:[['not-met','unknown'],['met','met']]},
 {key:'fireDing',date:'1977-06-19',time:'12:00:00',pillars:['丁巳','丙午','丁未','丙午'],checks:[['not-met','unknown'],['met','met']]},
 {key:'fireClash',date:'1977-06-19',time:'22:00:00',pillars:['丁巳','丙午','丁未','辛亥'],checks:[['not-met','unknown'],['met','met']]},
 {key:'unknownWood',date:'2023-02-15',time:'',unknown:true,pillars:['癸卯','甲寅','甲辰'],checks:[['met','met'],['not-met','unknown']]},
 {key:'solarUnknown',date:'2023-02-15',time:'',unknown:true,solar:true,pillars:['癸卯','甲寅'],checks:[['unknown','unknown'],['unknown','unknown']]},
 {key:'missing',date:'2023-02-16',time:'22:00:00',pillars:['癸卯','甲寅','乙巳','丁亥'],checks:[['not-met','unknown'],['not-met','unknown']]},
 {key:'legacy',date:'2023-02-15',time:'22:00:00',legacy:true,pillars:['癸卯','甲寅','甲辰','乙亥'],checks:[]},
] as const;
type CaseKey=typeof definitions[number]['key'];
const plain=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));

/** Real calendar, normal Mandarin filtering, actual saved rows, DOM controls and PDF bytes in a dedicated isolated scope. */
export async function smokeRenDirections(window:BrowserWindow,service:StudioService,out:string,base:BirthProfile,preferences:NamingPreferences,exportPdf:(session:NamingSession,file:string)=>Promise<string>,capture:()=>Promise<Buffer>) {
 if(!process.env.NAMING_STUDIO_SMOKE||!process.env.NAMING_STUDIO_USER_DATA||process.env.NAMING_STUDIO_SMOKE_SCOPE!=='ren-directions')throw new Error('方向局部旺势验收须使用独立专用范围。');
 const sessions={} as Record<CaseKey,NamingSession>,baselines:Record<string,unknown>={},ui:Record<string,any>={cases:{}},screenshots:Array<{file:string;caseKey:CaseKey;bytes:number}>=[];
 const pref:NamingPreferences={...preferences,length:1,requiredChars:'文',generationChar:'',forbiddenChars:'',elderTaboo:'',preferredElements:[],numerology:false,zodiacRules:false,imageryReading:false,yueReading:false,yueHomophones:'none'};delete pref.yueHomophoneRuleVersion;
 const source=service.bootstrap().sources.find(value=>value.id===REN_DIRECTIONS_SOURCE_ID);if(!source)throw new Error('方向局部旺势固定来源未登记。');
 for(const definition of definitions) {
  const profile:BirthProfile={...base,id:'smoke-ren-directions-'+definition.key,customerName:'方向原句隔离验收-'+definition.key,surname:'李',surnamePinyin:'lǐ',birthDate:definition.date,birthTime:definition.time,timeUnknown:'unknown' in definition,timezone:'Asia/Shanghai',timeBasis:'solar' in definition?'apparent-solar':'civil',renMethod:'legacy' in definition?REN_CAPACITY_METHOD:REN_DIRECTION_METHOD,fatherName:'',motherName:'',notes:'真实历法软件验收输入，非实际客户；不为原书无公历作者命例伪造生日。'};
  if('solar' in definition)profile.birthLongitude=120;else delete profile.birthLongitude;
  const generated=(await service.generate(profile,pref)).session;
  if(generated.candidates.length!==1||generated.candidates[0].fullName!=='李文'||generated.candidates[0].givenName!=='文')throw new Error('普通话正常过滤未生成合法指定单名：'+definition.key);
  const prior=analyzeFrozen13({...generated.profile,renMethod:REN_CAPACITY_METHOD}),ren=generated.analysis.renCommentary!;
  if(!isDeepStrictEqual({...generated.analysis.bazi,version:prior.bazi.version},prior.bazi)||!isDeepStrictEqual(generated.analysis.qimen,prior.qimen)||!isDeepStrictEqual(ren.capacityAnalysis,prior.renCommentary!.capacityAnalysis)||!isDeepStrictEqual(ren.actionAnalysis,prior.renCommentary!.actionAnalysis)||!isDeepStrictEqual(ren.structureGraph,prior.renCommentary!.structureGraph))throw new Error('方向层改写原分析、根图或13能力元数据：'+definition.key);
  const rescored=evaluateName('文',generated.profile,generated.preferences,prior,service.store.dataset.characters,service.store.dataset.citations,'local');
  if(!rescored||!isDeepStrictEqual(rescored.evaluation,generated.candidates[0].evaluation))throw new Error('方向局部旺势改写姓名评分或绕过普通话校验。');
  const direction=ren.directionAnalysis;
  if(!isDeepStrictEqual(generated.analysis.bazi.pillars.map(pillar=>pillar.gan+pillar.zhi),definition.pillars))throw new Error('实际公历输入四柱不符：'+definition.key);
  if('legacy' in definition) {if(direction||generated.sourceSnapshot?.sources.some(value=>value.id===REN_DIRECTIONS_SOURCE_ID))throw new Error('旧13被附加方向结果或来源。');}
  else {
   if(!direction||!isDeepStrictEqual(direction.checks.map(check=>[check.state,check.capability]),definition.checks)||!isDeepStrictEqual(direction.retainedNodeIds,ren.structureGraph.nodes.map(node=>node.id))||!isDeepStrictEqual(direction.retainedRootLinkIds,ren.actionAnalysis!.rootLinks.map(root=>root.id))||direction.netEffect!=='unknown'||direction.effectiveRootSupport!=='unknown'||direction.formationDecision!=='not-evaluated')throw new Error('实际方向证明或保留范围不符：'+definition.key);
   if(!isDeepStrictEqual(generated.sourceSnapshot?.sources.find(value=>value.id===REN_DIRECTIONS_SOURCE_ID),source))throw new Error('实际方向方案固定来源不符。');
  }
  const session=service.saveSession({...generated,candidates:generated.candidates.map((candidate,index)=>({...candidate,favorite:index===0})),reviewNote:'仅收藏首候选；局部方向旺势与净作用、各根效力、喜用分别核对。'});
  if(!isDeepStrictEqual(session.analysis,generated.analysis)||!isDeepStrictEqual(session.candidates.map(candidate=>candidate.evaluation),generated.candidates.map(candidate=>candidate.evaluation)))throw new Error('真实保存改变分析或评分。');
  sessions[definition.key]=session;baselines[definition.key]={analysis:prior,score:rescored.evaluation};
 }
 const baselineFile=join(out,'ren-directions-baselines.json');atomicWrite(baselineFile,JSON.stringify(baselines,null,2));
 window.setSize(1100,800);
 ui.display=await window.webContents.executeJavaScript(`(async()=>{
  const wait=async(test,label)=>{for(let i=0;i<180;i++){const value=test();if(value)return value;await new Promise(resolve=>setTimeout(resolve,40));}throw new Error('Direction display:'+label);};
  (await wait(()=>document.querySelector('.settings-nav'),'settings')).click();for(const text of ['紧凑','大字'])(await wait(()=>[...document.querySelectorAll('.presentation-choice label')].find(node=>node.textContent.includes(text)),text)).querySelector('input').click();
  await wait(()=>document.documentElement.dataset.fontSize==='large'&&document.documentElement.dataset.density==='compact','applied display');return {width:innerWidth,height:innerHeight,font:document.documentElement.dataset.fontSize,density:document.documentElement.dataset.density,inputMethod:'DOM clicks in isolated Electron; no native keyboard claim'};
 })()`);
 const reload=async()=>{await new Promise<void>(resolve=>{window.webContents.once('did-finish-load',()=>resolve());window.webContents.reload();});};
 const tools=`const pause=()=>new Promise(resolve=>setTimeout(resolve,100));const wait=async(test,label)=>{for(let i=0;i<180;i++){const value=test();if(value)return value;await new Promise(resolve=>setTimeout(resolve,40));}throw new Error('Direction UI:'+label);};const nav=async(text)=>{(await wait(()=>[...document.querySelectorAll('nav .nav-item')].find(node=>node.textContent.includes(text)),text)).click();await pause();};const open=async(id)=>{await nav('方案与报告');(await wait(()=>[...document.querySelectorAll('.session-item')].find(node=>node.getAttribute('title')?.includes(id)),'saved '+id)).click();await wait(()=>document.querySelector('.session-item[aria-current="true"]')?.getAttribute('title')?.includes(id),'selected saved');await nav('起名工作台');};const geometry=()=>({width:innerWidth,height:innerHeight,font:document.documentElement.dataset.fontSize,density:document.documentElement.dataset.density,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1});`;
 for(const key of ['wood','fire','unknownWood','solarUnknown','legacy'] as const) {
  await reload();const session=sessions[key];
  const state=await window.webContents.executeJavaScript(`(async()=>{${tools}
   await open(${JSON.stringify(session.id)});const method=(await wait(()=>document.querySelector('#birth-ren-method'),'method control')).value;await nav('八字与五行');
   if(${key==='legacy'}){await wait(()=>document.querySelector('.ren-capacities'),'legacy capacity');return {sessionId:${JSON.stringify(session.id)},method,directionAbsent:!document.querySelector('.ren-directions'),...geometry()};}
   const panel=await wait(()=>document.querySelector('.ren-directions'),'direction panel');for(const detail of panel.querySelectorAll('details'))if(!detail.open)detail.querySelector('summary').click();panel.scrollIntoView({block:'start'});await pause();
   return {sessionId:${JSON.stringify(session.id)},method,text:panel.innerText,classes:[...panel.querySelectorAll('.ren-capacity-check')].map(node=>node.className),expandedDetails:[...panel.querySelectorAll('details')].filter(node=>node.open).length,factCount:panel.querySelectorAll('.ren-capacity-fact').length,...geometry()};
  })()`);
  if(state.horizontalOverflow||state.method!==(key==='legacy'?REN_CAPACITY_METHOD:REN_DIRECTION_METHOD)||key==='legacy'&&!state.directionAbsent||key!=='legacy'&&(state.classes.length!==2||state.factCount!==6||state.expandedDetails<4||!state.text.includes('不作为本条正判前提')||!state.text.includes('净作用、各干有效根气、完整判格及喜用：仍待核。')||!state.text.includes(REN_DIRECTIONS_SOURCE_ID)))throw new Error('实际方向UI字位、范围或说明失败：'+key);
  if(key!=='legacy'&&!isDeepStrictEqual(state.classes.map((value:string)=>value.split(' ').at(-1)),session.analysis.renCommentary!.directionAnalysis!.checks.map(check=>check.capability)))throw new Error('实际UI能力状态与保存方案不符。');
  ui.cases[key]=state;
  if(key==='wood'||key==='unknownWood') {const bytes=await capture();if(bytes.length>500000)throw new Error('方向预览超过500KB');const file=join(out,key==='wood'?'ren-directions-wood-preview.jpg':'ren-directions-unknown-preview.jpg');atomicWrite(file,bytes);screenshots.push({file,caseKey:key,bytes:bytes.length});}
 }
 await reload();
 ui.methodSwitch=await window.webContents.executeJavaScript(`(async()=>{${tools}
  const id=${JSON.stringify(sessions.legacy.id)};await open(id);const control=await wait(()=>document.querySelector('#birth-ren-method'),'legacy method');if(control.value!==${JSON.stringify(REN_CAPACITY_METHOD)})throw new Error('Original method was not retained');
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(control,${JSON.stringify(REN_DIRECTION_METHOD)});control.dispatchEvent(new Event('change',{bubbles:true}));await wait(()=>document.querySelector('.stale-banner'),'method changed stale');
  const button=document.querySelector('.result-actions button[aria-label="导出报告"]');button.click();await pause();const before={changedTo:control.value,dirty:document.querySelector('.workflow-statusbar')?.innerText.includes('重新生成'),staleBanner:true,exportDisabled:button.disabled,exportDialogAbsent:![...document.querySelectorAll('[role="dialog"]')].some(node=>node.innerText.includes('导出'))};
  await nav('方案与报告');(await wait(()=>[...document.querySelectorAll('.session-item')].find(node=>node.getAttribute('title')?.includes(id)),'reopen original saved row')).click();
  const discard=await wait(()=>[...document.querySelectorAll('[role="dialog"] button')].find(node=>node.textContent==='放弃修改并继续'),'actual unsaved draft confirmation');discard.click();await wait(()=>!document.querySelector('.stale-banner')&&!document.querySelector('[role="dialog"]'),'original reopened');await nav('起名工作台');
  const restored=document.querySelector('#birth-ren-method')?.value,exportButton=document.querySelector('.result-actions button[aria-label="导出报告"]');const result={...before,reopenedMethod:restored,reopenedSaved:document.querySelector('.workflow-statusbar')?.innerText.includes('已保存到本机'),reopenedStaleAbsent:!document.querySelector('.stale-banner'),reopenedExportEnabled:!exportButton.disabled,...geometry()};
  if(!result.dirty||!result.exportDisabled||!result.exportDialogAbsent||restored!==${JSON.stringify(REN_CAPACITY_METHOD)}||!result.reopenedSaved||!result.reopenedStaleAbsent||!result.reopenedExportEnabled)throw new Error('Method-change stale export/reopen guard failed');return result;
 })()`);
 const database=join(service.store.userDir,'customers.sqlite'),before=readFileSync(database),caseRecords:Record<string,unknown>={},histories={} as Record<CaseKey,SessionRevision[]>;
 for(const definition of definitions) {
  const saved=service.store.rows<NamingSession>('sessions').find(value=>value.id===sessions[definition.key].id);if(!saved||!isDeepStrictEqual(saved,plain(sessions[definition.key])))throw new Error('实际方向SQL快照与生成/保存不一致。');
  sessions[definition.key]=saved;const snapshotFile=join(out,'ren-directions-'+definition.key+'.json');atomicWrite(snapshotFile,JSON.stringify(saved,null,2));histories[definition.key]=service.listHistory(saved.id);
  caseRecords[definition.key]={sessionId:saved.id,profileId:saved.profileId,candidateId:saved.candidates[0].id,fullName:saved.candidates[0].fullName,reviewRevision:saved.reviewRevision,reviewToken:saved.reviewToken,snapshotFile,baziVersion:saved.analysis.bazi.version,renVersion:saved.analysis.renCommentary!.version,complete:saved.analysis.renCommentary!.input.complete,checks:saved.analysis.renCommentary!.directionAnalysis?.checks.map(check=>({kind:check.kind,state:check.state,capability:check.capability}))??[]};
 }
 if(!before.equals(readFileSync(database)))throw new Error('只读方向方案和历史改变客户库字节。');
 const historyFile=join(out,'ren-directions-histories.json');atomicWrite(historyFile,JSON.stringify(histories,null,2));
 const pdfDefinitions=[['wood','ren-directions-wood.pdf'],['fire','ren-directions-fire.pdf'],['unknownWood','ren-directions-unknown.pdf'],['solarUnknown','ren-directions-solar-unknown.pdf']] as const,pdfs=[];
 for(const [caseKey,name]of pdfDefinitions){const session=sessions[caseKey],file=join(out,name);await exportPdf(session,file);pdfs.push({file,caseKey,sessionId:session.id,reviewRevision:session.reviewRevision,reviewToken:session.reviewToken,candidateIds:session.candidates.filter(candidate=>candidate.favorite).map(candidate=>candidate.id)});}
 return {schemaVersion:'ren-directions-smoke/1.0.0',database,definitions,cases:caseRecords,histories:{snapshotFile:historyFile,byCase:Object.fromEntries(definitions.map(({key})=>[key,{sessionId:sessions[key].id,revisionIds:histories[key].map(row=>row.id),count:histories[key].length}]))},baselineFile,pdfs,screenshots,source,ui,invariants:{ordinaryMandarinValidationUsed:true,singleFavoritePerCase:true,original13NestedAnalysisUnchanged:true,sameInputBasicAnalysisAndScoresUnchanged:true,allNodesAndRootsRetained:true,readOnlyDidNotRewriteDatabase:true,backupBytesValidated:service.store.backupBytes().length},limits:['Real civil calendar inputs, not Gregorian reconstructions of undated author cases; synthetic customer 李文 only.','DOM controls and preload IPC in an isolated Electron window, not native keyboard/close/chooser acceptance.','PDF bytes exported; independent text/layout/visual review is a separate gate.','No external AI, signing or clean second-machine claim.']};
}
