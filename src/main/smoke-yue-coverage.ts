import type {BrowserWindow} from 'electron';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import type {StudioService} from './service';
import {atomicWrite} from './store';
import type {BirthProfile,NamingPreferences,NamingSession,YueReadingSelection,SessionRevision} from '../shared/types';
import {YUE_HOMOPHONE_VERSION} from '../domain/yue-homophones';
import {YUE_HOMOPHONE_CURRENT_VERSION,ALL_YUE_HOMOPHONE_SOURCE_IDS,resolveSessionYueHomophoneVersion,yueHomophoneSourceIdsForVersion} from '../domain/yue-homophone-router';

const definitions=[
 {key:'expandedStrict',surname:'刘',pinyin:'liú',given:'文',tokens:['lau4','man4'],mode:'strict',version:YUE_HOMOPHONE_CURRENT_VERSION,term:'流氓',comparison:'exact'},
 {key:'expandedAlternate',surname:'刘',pinyin:'liú',given:'望',tokens:['lau4','mong4'],mode:'strict',version:YUE_HOMOPHONE_CURRENT_VERSION,term:'流氓',comparison:'exact'},
 {key:'expandedTone',surname:'简',pinyin:'jiǎn',given:'湘',tokens:['gaan2','soeng1'],mode:'ignore-tone',version:YUE_HOMOPHONE_CURRENT_VERSION,term:'奸商',comparison:'tone-only'},
 {key:'expandedStrictNoMatch',surname:'简',pinyin:'jiǎn',given:'湘',tokens:['gaan2','soeng1'],mode:'strict',version:YUE_HOMOPHONE_CURRENT_VERSION,term:null,comparison:null},
 {key:'expandedUnconfirmed',surname:'刘',pinyin:'liú',given:'文',tokens:['lau4','man4'],mode:'strict',version:YUE_HOMOPHONE_CURRENT_VERSION,term:null,comparison:null,unknown:true},
 {key:'legacyBase',surname:'刘',pinyin:'liú',given:'文',tokens:['lau4','man4'],mode:'strict',version:YUE_HOMOPHONE_VERSION,term:null,comparison:null},
 {key:'disabled',surname:'刘',pinyin:'liú',given:'文',tokens:['lau4','man4'],mode:'none',version:null,term:null,comparison:null},
] as const;
type CaseKey=typeof definitions[number]['key'];
const serialized=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
const family=(tokens:string[]):YueReadingSelection=>({tokens,origin:'user',confirmed:true});

/** Real isolated service, stored snapshots, renderer controls and PDF exports; no rule bypass or fabricated saved result. */
export async function smokeYueCoverage(window:BrowserWindow,service:StudioService,out:string,base:BirthProfile,preferences:NamingPreferences,exportPdf:(session:NamingSession,file:string)=>Promise<string>,capture:()=>Promise<Buffer>) {
 if(!process.env.NAMING_STUDIO_SMOKE||!process.env.NAMING_STUDIO_USER_DATA||process.env.NAMING_STUDIO_SMOKE_SCOPE!=='yue-coverage')throw new Error('粤语词表覆盖验收须使用专用隔离范围。');
 const sessions={} as Record<CaseKey,NamingSession>,initial={} as Record<CaseKey,NamingSession>;
 const expectedKeys=definitions.map(item=>item.key),ui:Record<string,any>={},screenshots:Array<{file:string;caseKey:CaseKey;bytes:number;widthLimit:number}>=[];
 const database=join(service.store.userDir,'customers.sqlite');
 const current=(sessionId:string)=>{const found=service.store.rows<NamingSession>('sessions').find(item=>item.id===sessionId);if(!found)throw new Error('实际粤语方案不存在。');return found;};
 const unchanged=(before:NamingSession,after:NamingSession)=>{
  if(!isDeepStrictEqual(serialized(before.analysis),serialized(after.analysis))||before.candidates.length!==after.candidates.length||before.candidates.some((candidate,index)=>candidate.id!==after.candidates[index]?.id||candidate.fullName!==after.candidates[index].fullName||!isDeepStrictEqual(candidate.evaluation,after.candidates[index].evaluation)))throw new Error('粤语确认改变了原出生分析、评分或候选顺序。');
 };
 const pref:NamingPreferences={...preferences,length:1,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',preferredElements:[],zodiacRules:false,numerology:false,avoidParentNames:true,imageryReading:false,yueReading:true,yueHomophones:'none'};
 delete pref.yueHomophoneRuleVersion;
 for(const definition of definitions) {
  const profile:BirthProfile={...base,id:'smoke-yue-coverage-'+definition.key,customerName:'粤语覆盖隔离验收-'+definition.key,surname:definition.surname,surnamePinyin:definition.pinyin,birthDate:'2026-10-17',birthTime:'unknown' in definition?'':'09:30:00',timeUnknown:'unknown' in definition,timeBasis:'civil',renMethod:'none',fatherName:'',motherName:'',notes:'人工构造的软件验收姓名与家庭确认音节，不是推荐名、真人、真实家庭姓氏读法或连读录音证明。'};
  delete profile.birthLongitude;
  const selected:NamingPreferences={...pref,requiredChars:definition.given,yueHomophones:definition.mode};
  // Missing version deliberately exercises the backward-compatible generation API for the base package.
  if(definition.version&&definition.key!=='legacyBase')selected.yueHomophoneRuleVersion=definition.version;
  const generated=(await service.generate(profile,selected)).session;
  if(generated.candidates.length!==1||generated.candidates[0].givenName!==definition.given||generated.candidates[0].fullName!==definition.surname+definition.given)throw new Error('普通命名过滤未生成指定合法单字姓名：'+definition.key);
  initial[definition.key]=serialized(generated);
  let session=service.saveSession({...generated,candidates:generated.candidates.map((candidate,index)=>({...candidate,favorite:index===0})),reviewNote:'仅收藏首候选；有限词汇复核不改评分，不作孩子属性评价。'});
  const first=session.candidates[0];
  session=service.updateYueReading(session.id,first.id,{surname:family([definition.tokens[0]]),given:[definition.key==='expandedUnconfirmed'?null:family([definition.tokens[1]])]},session.reviewRevision,session.reviewToken);
  unchanged(generated,session);
  const version=resolveSessionYueHomophoneVersion(session),review=session.candidates[0].yueHomophones;
  if(version!==definition.version||definition.version&&session.preferences.yueHomophoneRuleVersion!==definition.version)throw new Error('实际生成/确认词表版本不符：'+definition.key);
  const ids=session.sourceSnapshot!.sources.map(source=>source.id).filter(id=>(ALL_YUE_HOMOPHONE_SOURCE_IDS as readonly string[]).includes(id));
  if(!isDeepStrictEqual(ids,definition.version?[...yueHomophoneSourceIdsForVersion(definition.version)]:[]))throw new Error('真实保存的词汇专用来源跨版：'+definition.key);
  if(definition.key==='disabled') {if(review||Object.hasOwn(session.preferences,'yueHomophoneRuleVersion'))throw new Error('关闭方案保存了词汇结果或版本。');}
  else if(definition.key==='expandedUnconfirmed') {if(review?.status!=='not-assessed'||session.candidates[0].yueReading?.status!=='partial'||review.matches.length)throw new Error('实际部分确认方案被误判为已检查。');}
  else if(review?.status!=='assessed'||!isDeepStrictEqual(review.matches.map(match=>[match.term,match.comparison]),definition.term?[[definition.term,definition.comparison]]:[]))throw new Error('实际确认词汇结果不符：'+definition.key);
  sessions[definition.key]=current(session.id);
 }
 const compareKeys=['expandedStrict','legacyBase','disabled'] as const;
 for(const key of compareKeys.slice(1)) {
  if(!isDeepStrictEqual(sessions.expandedStrict.analysis,sessions[key].analysis)||!isDeepStrictEqual(sessions.expandedStrict.candidates.map(candidate=>({name:candidate.fullName,evaluation:candidate.evaluation})),sessions[key].candidates.map(candidate=>({name:candidate.fullName,evaluation:candidate.evaluation}))))throw new Error('词表开关或版本改变同名方案分析/评分。');
 }
 const strictRule=sessions.expandedStrict.candidates[0].yueHomophones!.matches[0].ruleId,alternateRule=sessions.expandedAlternate.candidates[0].yueHomophones!.matches[0].ruleId;
 if(strictRule===alternateRule)throw new Error('两条显式流氓读法错误地共用一条规则。');
 window.setSize(1100,800);
 ui.display=await window.webContents.executeJavaScript(`(async()=>{
  const wait=async(test,label)=>{for(let i=0;i<180;i++){const value=test();if(value)return value;await new Promise(resolve=>setTimeout(resolve,40));}throw new Error('Yue coverage display:'+label);};
  (await wait(()=>document.querySelector('.settings-nav'),'settings')).click();
  for(const text of ['紧凑','大字'])(await wait(()=>[...document.querySelectorAll('.presentation-choice label')].find(node=>node.textContent.includes(text)),text)).querySelector('input').click();
  await wait(()=>document.documentElement.dataset.fontSize==='large'&&document.documentElement.dataset.density==='compact','display applied');
  return {width:innerWidth,height:innerHeight,font:document.documentElement.dataset.fontSize,density:document.documentElement.dataset.density,inputMethod:'Actual DOM control clicks in isolated Electron; no native keyboard claim'};
 })()`);
 const reload=async()=>{await new Promise<void>(resolve=>{window.webContents.once('did-finish-load',()=>resolve());window.webContents.reload();});};
 const tools=`
  const pause=()=>new Promise(resolve=>setTimeout(resolve,100));
  const wait=async(test,label)=>{for(let i=0;i<180;i++){const value=await test();if(value)return value;await new Promise(resolve=>setTimeout(resolve,40));}throw new Error('Yue coverage UI:'+label);};
  const nav=async(text)=>{(await wait(()=>[...document.querySelectorAll('nav .nav-item')].find(node=>node.textContent.includes(text)),text)).click();await pause();};
  const field=text=>[...document.querySelectorAll('.field')].find(node=>node.querySelector('label')?.textContent===text)?.querySelector('select');
  const change=async(node,value)=>{if(!node)throw new Error('Missing UI control');Object.getOwnPropertyDescriptor(node instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(node,value);node.dispatchEvent(new Event(node instanceof HTMLSelectElement?'change':'input',{bubbles:true}));await pause();};
  const open=async(id)=>{await nav('方案与报告');(await wait(()=>[...document.querySelectorAll('.session-item')].find(node=>node.getAttribute('title')?.includes(id)),'saved session '+id)).click();await wait(()=>document.querySelector('.session-item[aria-current="true"]')?.getAttribute('title')?.includes(id),'selected session');await nav('起名工作台');};
  const preferences=async()=>{(await wait(()=>[...document.querySelectorAll('.form-tabs button')].find(node=>node.textContent==='起名偏好'),'preference tab')).click();await pause();};
  const detail=async(fullName)=>{(await wait(()=>[...document.querySelectorAll('.name-card')].find(node=>node.querySelector('h3')?.textContent===fullName),'candidate '+fullName)).querySelector('.name-main').click();return wait(()=>document.querySelector('[role="dialog"] .yue-reading'),'Yue reading detail');};
  const geometry=()=>({width:innerWidth,height:innerHeight,font:document.documentElement.dataset.fontSize,density:document.documentElement.dataset.density,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1});
 `;
 await reload();
 ui.legacyVersion=await window.webContents.executeJavaScript(`(async()=>{${tools}
  await open(${JSON.stringify(sessions.legacyBase.id)});await preferences();
  const selected=field('词汇覆盖范围')?.value;if(selected!==${JSON.stringify(YUE_HOMOPHONE_VERSION)})throw new Error('Loaded base package silently upgraded');
  await change(field('粤语词汇联想复核'),'ignore-tone');if(field('词汇覆盖范围')?.value!==selected)throw new Error('Mode switch upgraded base coverage');
  await change(field('粤语词汇联想复核'),'strict');await change(field('词汇覆盖范围'),${JSON.stringify(YUE_HOMOPHONE_CURRENT_VERSION)});
  await wait(()=>document.querySelector('.stale-banner'),'coverage switch stale');
  const button=document.querySelector('.result-actions button[aria-label="导出报告"]');button.click();await pause();
  const result={selected,modeChangeKeptBase:true,coverageChangedTo:field('词汇覆盖范围').value,dirty:document.querySelector('.workflow-statusbar')?.innerText.includes('重新生成'),staleBanner:!!document.querySelector('.stale-banner'),exportDisabled:button.disabled,exportDialogAbsent:![...document.querySelectorAll('[role="dialog"]')].some(node=>node.innerText.includes('导出')),...geometry()};
  if(!result.exportDisabled||!result.exportDialogAbsent||!result.dirty)throw new Error('Changed coverage did not block stale export');return result;
 })()`);
 await reload();
 ui.defaultExpanded=await window.webContents.executeJavaScript(`(async()=>{${tools}
  await open(${JSON.stringify(sessions.disabled.id)});await preferences();if(field('粤语词汇联想复核')?.value!=='none')throw new Error('Disabled saved mode not loaded');
  await change(field('粤语词汇联想复核'),'strict');const selected=field('词汇覆盖范围')?.value;
  if(selected!==${JSON.stringify(YUE_HOMOPHONE_CURRENT_VERSION)})throw new Error('New enable did not explicitly select expanded coverage');return {selected,staleBanner:!!document.querySelector('.stale-banner'),...geometry()};
 })()`);
 ui.disableVersion=await window.webContents.executeJavaScript(`(async()=>{${tools}
  await change(field('粤语词汇联想复核'),'none');
  (await wait(()=>[...document.querySelectorAll('.form-footer button')].find(node=>node.textContent==='保存档案'),'save actual disabled preferences')).click();
  const saved=await wait(async()=>{const boot=await window.studio.bootstrap(),profile=boot.profiles.find(value=>value.id===${JSON.stringify(sessions.disabled.profileId)});return profile?.namingPreferences?.yueHomophones==='none'&&!Object.hasOwn(profile.namingPreferences,'yueHomophoneRuleVersion')?profile:null;},'disabled saved preference without version');
  return {coverageControlAbsent:!field('词汇覆盖范围'),savedMode:saved.namingPreferences.yueHomophones,versionFieldPresent:Object.hasOwn(saved.namingPreferences,'yueHomophoneRuleVersion'),...geometry()};
 })()`);
 await reload();
 ui.readingRoundtrip=await window.webContents.executeJavaScript(`(async()=>{${tools}
  const id=${JSON.stringify(sessions.expandedUnconfirmed.id)},candidateId=${JSON.stringify(sessions.expandedUnconfirmed.candidates[0].id)};
  await open(id);await detail(${JSON.stringify(sessions.expandedUnconfirmed.candidates[0].fullName)});
  const candidate=async()=>{const boot=await window.studio.bootstrap();return boot.sessions.find(value=>value.id===id)?.candidates.find(value=>value.id===candidateId);};
  const before=await candidate();if(before.yueReading.status!=='partial')throw new Error('Expected actual partial confirmed state');
  let section=document.querySelector('[role="dialog"] .yue-reading');
  for(const [index,token] of ['lau4','man4'].entries()){await change(section.querySelectorAll('.name-reading-units select')[index],'user');await change(section.querySelectorAll('.name-reading-units article')[index].querySelector('input'),token);}
  const save=section.querySelector('.yue-reading-action button');if(save.disabled)throw new Error('Actual confirmation control remained disabled');save.click();
  const confirmed=await wait(async()=>{const value=await candidate();return value?.yueReading.status==='confirmed'&&value.yueHomophones?.matches.some(match=>match.term==='流氓')?value:null;},'confirmed UI/IPC saved');
  await wait(()=>{const node=document.querySelector('[role="dialog"] .yue-reading');return node?.innerText.includes('所选字音已确认')&&!node.querySelector('select')?.disabled&&node.querySelector('.yue-reading-action button')?.disabled;},'confirmation finished');
  section=document.querySelector('[role="dialog"] .yue-reading');for(const select of section.querySelectorAll('.name-reading-units select'))await change(select,'');
  section.querySelector('.yue-reading-action button').click();
  const cleared=await wait(async()=>{const value=await candidate();return value?.yueReading.status==='unconfirmed'&&value.yueHomophones?.status==='not-assessed'?value:null;},'cleared UI/IPC saved');
  await wait(()=>{const node=document.querySelector('[role="dialog"] .yue-reading');return node?.innerText.includes('读音待确认')&&!node.querySelector('select')?.disabled&&node.querySelector('.yue-reading-action button')?.disabled;},'clear finished');
  const panel=document.querySelector('[role="dialog"] .yue-homophone-review');panel.scrollIntoView({block:'start'});await pause();
  return {sessionId:id,candidateId,beforeStatus:before.yueReading.status,confirmedStatus:confirmed.yueReading.status,confirmedTerms:confirmed.yueHomophones.matches.map(match=>match.term),clearedStatus:cleared.yueReading.status,clearedLexicalStatus:cleared.yueHomophones.status,clearedMatches:cleared.yueHomophones.matches.length,panelText:panel.innerText,...geometry(),inputMethod:'Actual select/input/save controls; update persisted through normal preload IPC'};
 })()`);
 sessions.expandedUnconfirmed=current(sessions.expandedUnconfirmed.id);unchanged(initial.expandedUnconfirmed,sessions.expandedUnconfirmed);
 if(sessions.expandedUnconfirmed.candidates[0].yueReading?.status!=='unconfirmed'||sessions.expandedUnconfirmed.candidates[0].yueHomophones?.status!=='not-assessed')throw new Error('实际UI清除未保存为未确认。');
 const takePreview=async(caseKey:CaseKey,name:string)=>{const bytes=await capture();if(bytes.length>500000)throw new Error('粤语覆盖界面预览超过500KB');const file=join(out,name);atomicWrite(file,bytes);screenshots.push({file,caseKey,bytes:bytes.length,widthLimit:1280});};
 await takePreview('expandedUnconfirmed','expanded-unconfirmed-preview.jpg');
 await reload();
 ui.expandedMatch=await window.webContents.executeJavaScript(`(async()=>{${tools}
  await open(${JSON.stringify(sessions.expandedStrict.id)});await detail(${JSON.stringify(sessions.expandedStrict.candidates[0].fullName)});
  const panel=await wait(()=>document.querySelector('[role="dialog"] .yue-homophone-review'),'expanded match');
  for(const node of panel.querySelectorAll('details'))if(!node.open)node.querySelector('summary').click();
  panel.scrollIntoView({block:'start'});await pause();
  const result={text:panel.innerText,...geometry()};if(!result.text.includes('流氓')||!result.text.includes('29条')||!result.text.includes('CC-BY-SA-4.0')||!result.text.includes('CC-BY-4.0')||!result.text.includes('不描述孩子的属性'))throw new Error('Expanded actual UI omitted term/source/scope');return result;
 })()`);
 await takePreview('expandedStrict','expanded-strict-preview.jpg');
 for(const entry of Object.values(ui))if(entry?.horizontalOverflow)throw new Error('1100px大字紧凑实际界面横向溢出。');
 const histories={} as Record<CaseKey,SessionRevision[]>,caseRecords:Record<string,unknown>={};
 const databaseBefore=readFileSync(database);
 for(const key of expectedKeys) {
  const session=current(sessions[key].id);sessions[key]=session;unchanged(initial[key],session);
  const snapshotFile=join(out,'yue-coverage-'+key+'.json');atomicWrite(snapshotFile,JSON.stringify(session,null,2));histories[key]=service.listHistory(session.id);
  const candidate=session.candidates[0],review=candidate.yueHomophones;
  caseRecords[key]={sessionId:session.id,profileId:session.profileId,candidateId:candidate.id,fullName:candidate.fullName,mode:session.preferences.yueHomophones??'none',ruleVersion:resolveSessionYueHomophoneVersion(session),status:review?.status??null,selectedTokens:review?.selectedTokens??[],matches:review?.matches.map(match=>({ruleId:match.ruleId,term:match.term,comparison:match.comparison}))??[],reviewRevision:session.reviewRevision,reviewToken:session.reviewToken,snapshotFile};
 }
 if(!databaseBefore.equals(readFileSync(database)))throw new Error('读取实际方案与历史改变了客户库字节。');
 const unknownHistory=histories.expandedUnconfirmed.map(row=>row.session.candidates[0]);
 if(!unknownHistory.some(candidate=>candidate.yueReading?.status==='partial')||!unknownHistory.some(candidate=>candidate.yueReading?.status==='confirmed'&&candidate.yueHomophones?.matches.some(match=>match.term==='流氓')))throw new Error('真实部分确认/全确认审阅历史缺失。');
 const historyFile=join(out,'yue-coverage-histories.json');atomicWrite(historyFile,JSON.stringify(histories,null,2));
 const pdfDefinitions=[['expandedStrict','expanded-strict-report.pdf'],['expandedTone','expanded-ignore-tone-report.pdf'],['expandedUnconfirmed','expanded-unconfirmed-report.pdf'],['legacyBase','legacy-base-report.pdf']] as const;
 const pdfs=[];
 for(const [caseKey,name] of pdfDefinitions) {const session=sessions[caseKey],file=join(out,name);await exportPdf(session,file);pdfs.push({file,caseKey,sessionId:session.id,reviewRevision:session.reviewRevision,reviewToken:session.reviewToken,candidateIds:session.candidates.filter(candidate=>candidate.favorite).map(candidate=>candidate.id)});}
 const backupBytesValidated=service.store.backupBytes().length;
 // Finish without a pending modal/draft so normal app shutdown is not a native-close acceptance test.
 await window.webContents.executeJavaScript(`(()=>{document.querySelector('[role="dialog"] button[aria-label="关闭"]')?.click();return true;})()`);
 return {schemaVersion:'yue-coverage-smoke/1.0.0',database,definitions,cases:caseRecords,histories:{snapshotFile:historyFile,byCase:Object.fromEntries(expectedKeys.map(key=>[key,{sessionId:sessions[key].id,revisionIds:histories[key].map(row=>row.id),count:histories[key].length}]))},pdfs,screenshots,ui,sources:service.bootstrap().sources.filter(source=>(ALL_YUE_HOMOPHONE_SOURCE_IDS as readonly string[]).includes(source.id)),invariants:{ordinaryMandarinValidationUsed:true,sameNameScoresAndAnalysisUnchanged:true,confirmationScoresAnalysisAndOrderUnchanged:true,oldBaseScopeRetained:true,disabledNoResultVersionOrDedicatedSource:true,readOnlyCurrentHistoryDidNotRewriteDatabase:true,backupBytesValidated},limits:['Artificial acceptance names and family-user Jyutping are not recommendations, real-person records or proof of family surname pronunciation.','DOM control and IPC checks are actual renderer operations; no native keyboard, chooser or close acceptance is claimed.','Four actual PDFs exported; independent text, layout and visual review remains a separate gate.','No external AI, signing or clean second-Windows claim.']};
}
