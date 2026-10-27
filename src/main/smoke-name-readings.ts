import type {BrowserWindow} from 'electron';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import type {BirthProfile,NamingPreferences,NamingSession,YueReadingSelection,YueReadingUnit} from '../shared/types';
import {REN_METHOD} from '../shared/ren-method';
import type {StudioService} from './service';
import {atomicWrite} from './store';

/** Actual generation, optimistic-review writes and report rendering in the isolated smoke window. */
export async function smokeNameReadings(window:BrowserWindow,service:StudioService,out:string,base:BirthProfile,preferences:NamingPreferences,exportPdf:(session:NamingSession,file:string)=>Promise<string>,capture:()=>Promise<Buffer>){
 if(!process.env.NAMING_STUDIO_SMOKE||!process.env.NAMING_STUDIO_USER_DATA)throw new Error('姓名读音验收只允许独立自动验收窗口与客户库。');
 const files:Record<string,string>={},ui:Record<string,any>={};
 const writeSnapshot=(key:string,session:NamingSession)=>{
  const stored=service.store.rows<NamingSession>('sessions').find(value=>value.id===session.id);
  // Store persists JSON: optional undefined object properties are omitted, while every serialized field must agree.
  if(!stored||!isDeepStrictEqual(stored,JSON.parse(JSON.stringify(session))))throw new Error('姓名读音真实存盘不一致：'+key);
  const file=join(out,'name-readings-'+key+'.json');atomicWrite(file,JSON.stringify(stored,null,2));files[key]=file;return stored;
 };
 const pdf=async(key:string,session:NamingSession)=>{const file=join(out,'name-readings-'+key+'.pdf');await exportPdf(session,file);files[key+'Pdf']=file;};
 const readUI=async(key:string,session:NamingSession,expectedStatus:string,screenshot=false)=>{
  await new Promise<void>(resolve=>{window.webContents.once('did-finish-load',()=>resolve());window.webContents.reload();});
  const state=await window.webContents.executeJavaScript(`(async()=>{
   const wait=async(test,label)=>{for(let attempt=0;attempt<180;attempt++){const value=test();if(value)return value;await new Promise(resolve=>setTimeout(resolve,40));}throw new Error('Name readings UI wait: '+label);};
   const nav=await wait(()=>[...document.querySelectorAll('nav .nav-item')].find(node=>node.textContent.includes('方案与报告')),'reports navigation');nav.click();
   const session=await wait(()=>[...document.querySelectorAll('.session-item')].find(node=>node.getAttribute('title')?.includes(${JSON.stringify(session.id)})),'actual stored session');session.click();
   await wait(()=>document.querySelector('.session-item[aria-current="true"]')?.getAttribute('title')?.includes(${JSON.stringify(session.id)}),'selected actual session');
   const names=await wait(()=>document.querySelector('.report-paper .report-names'),'report names');
   await wait(()=>names.innerText.includes(${JSON.stringify(expectedStatus)}),'saved Yue state');names.scrollIntoView({block:'center'});await new Promise(resolve=>setTimeout(resolve,100));
   return {sessionTitle:document.querySelector('.session-item[aria-current="true"]')?.getAttribute('title'),text:names.innerText,yue:[...names.querySelectorAll('.yue-reading-reference')].map(node=>node.innerText),imagery:[...names.querySelectorAll('.name-reading-summary')].filter(node=>node.querySelector('strong')?.textContent.includes('意象与九宫')).map(node=>node.innerText),candidateCount:names.querySelectorAll(':scope > div').length,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,inputMethod:'Only explicit DOM clicks in the isolated smoke BrowserWindow; native keyboard not asserted'};
  })()`);
  const count=session.candidates.some(candidate=>candidate.favorite)?session.candidates.filter(candidate=>candidate.favorite).length:session.candidates.length;
  if(state.horizontalOverflow||state.candidateCount!==count||state.yue.length!==count||state.imagery.length!==count||!state.imagery.every((text:string)=>text.includes('不作吉凶评分')))throw new Error('姓名读音报告实际界面不一致：'+key);
  if(key==='unknown'&&(!state.imagery.every((text:string)=>text.includes('出生参考盘未确定')&&text.includes('标签待定'))))throw new Error('未知时刻实际界面隐去了保存盘未定或标签待定。');
  ui[key]=state;
  if(screenshot){const image=await capture();if(image.length>500000)throw new Error('姓名读音预览超过500KB');const file=join(out,'name-readings-'+key+'-preview.jpg');atomicWrite(file,image);files[key+'Preview']=file;}
 };
 const profile:BirthProfile={...base,id:'smoke-name-readings-known',customerName:'姓名读音与意象隔离验收',surname:'欧阳',surnamePinyin:'ōu yáng',birthDate:'2026-10-17',birthTime:'09:30:00',timeUnknown:false,timeBasis:'civil',birthLongitude:undefined,renMethod:'none',fatherName:'',motherName:'',notes:'隔离自动验收；出生盘固定，复姓整体确认，不是实际客户。'};
 const pref:NamingPreferences={...preferences,length:2,generationChar:'',requiredChars:'清宁',forbiddenChars:'',elderTaboo:'',preferredElements:[],zodiacRules:false,numerology:false,yueReading:true,imageryReading:true};
 const generated=(await service.generate(profile,pref)).session;
 if(!generated.candidates.length||!generated.candidates.every(candidate=>candidate.yueReading?.status==='unconfirmed'&&candidate.imageReading?.chart.available&&candidate.imageReading.chart.sha256===createHash('sha256').update(JSON.stringify(generated.analysis.qimen)).digest('hex')))throw new Error('真实姓名候选未保留初始未确认读音或固定出生盘。');
 const pending=service.saveSession({...generated,candidates:generated.candidates.map((candidate,index)=>({...candidate,favorite:index===0})),reviewNote:'只收藏第一名；粤语候选全部尚未确认，PDF须明确保留待确认状态。'});
 writeSnapshot('pending',pending);await pdf('pending',pending);await readUI('pending',pending,'读音待确认',true);
 const first=pending.candidates[0],reading=first.yueReading!;
 const dictionary=(unit:YueReadingUnit,text:string,tokens:string[]):YueReadingSelection=>{
  const row=unit.candidates.find(candidate=>candidate.text===text&&isDeepStrictEqual(candidate.tokens,tokens));
  if(!row)throw new Error('固定粤拼候选缺失：'+text+' '+tokens.join(' '));
  return {tokens:[...row.tokens],origin:'dictionary',confirmed:true,dictionaryId:row.id};
 };
 const surname=dictionary(reading.surname,'歐陽',['au1','joeng4']);
 const partial=service.updateYueReading(pending.id,first.id,{surname,given:reading.given.map(()=>null)},pending.reviewRevision,pending.reviewToken);
 const partialReading=partial.candidates.find(candidate=>candidate.id===first.id)!.yueReading!;
 if(partialReading.status!=='partial'||partialReading.fullNameTokens.length||partialReading.given.some(unit=>unit.selection))throw new Error('复姓部分确认被伪造成全名读音。');
 writeSnapshot('partial',partial);await readUI('partial',partial,'部分读音已确认');
 const fullSelections={surname,given:partialReading.given.map((unit):YueReadingSelection=>{
  if(unit.text==='清')return {tokens:['cing1'],origin:'user',confirmed:true};
  if(unit.text==='宁')return dictionary(unit,'寧',['ning4']);
  throw new Error('本次实际候选未含预期清、宁用字。');
 })};
 let confirmed=service.updateYueReading(partial.id,first.id,fullSelections,partial.reviewRevision,partial.reviewToken);
 confirmed=service.saveSession({...confirmed,reviewNote:'复姓及宁采用经确认词典候选，清为家庭手工确认 cing1；只记录选定字音，未做粤语谐音词检查。'});
 const full=confirmed.candidates.find(candidate=>candidate.id===first.id)!,fullReading=full.yueReading!;
 if(fullReading.status!=='confirmed'||fullReading.fullNameTokens.length!==4||!isDeepStrictEqual(fullReading.fullNameTokens,['au1','joeng4',...fullReading.given.flatMap(unit=>unit.selection!.tokens)])||!fullReading.given.some(unit=>unit.selection?.origin==='user')||!fullReading.given.some(unit=>unit.selection?.origin==='dictionary')||!isDeepStrictEqual(confirmed.analysis,pending.analysis)||!isDeepStrictEqual(full.imageReading,first.imageReading))throw new Error('混合来源全确认、完整复姓或原出生盘保留失败。');
 const history=service.listHistory(confirmed.id),historyStates=history.map(revision=>revision.session.candidates.find(candidate=>candidate.id===first.id)?.yueReading?.status);
 if(!['unconfirmed','partial','confirmed'].every(status=>historyStates.includes(status as 'unconfirmed'|'partial'|'confirmed'))||!(partial.reviewRevision!>pending.reviewRevision!&&confirmed.reviewRevision!>partial.reviewRevision!)||new Set([pending.reviewToken,partial.reviewToken,confirmed.reviewToken]).size!==3)throw new Error('真实审阅版本令牌或初始、部分、全确认历史没有保留。');
 writeSnapshot('confirmed',confirmed);await pdf('confirmed',confirmed);await readUI('confirmed',confirmed,'所选字音已确认',true);
 const unknownProfile:BirthProfile={...profile,id:'smoke-name-readings-unknown',customerName:'未知时刻姓名读音与意象隔离验收',birthTime:'',timeUnknown:true,renMethod:REN_METHOD,notes:'隔离真实未知时刻；知微项目元素标签保持待定，启用数理和任注1.1，不补唯一出生盘。'};
 const unknown=writeSnapshot('unknown',(await service.generate(unknownProfile,{...pref,requiredChars:'知微',numerology:true})).session);
 if(unknown.analysis.qimen.available||unknown.analysis.qimen.palaces.length||unknown.analysis.bazi.pillars.some(pillar=>pillar.label==='时柱')||!unknown.analysis.renCommentary?.necessaryConditions||!unknown.candidates.length||unknown.candidates.some(candidate=>!candidate.numerology||candidate.yueReading?.status!=='unconfirmed'||candidate.characters.some(character=>character.elements.length)||candidate.imageReading?.status!=='chart-unavailable'||candidate.imageReading.chart.available||candidate.imageReading.chart.observationStatus!=='not-assessed'||candidate.imageReading.unionPalaces.length||candidate.imageReading.palaceReadings.length||candidate.imageReading.characterRows.some(row=>row.elements.length||row.palaces.length||row.state!=='unresolved')||candidate.imageReading.goodBadScore!==null))throw new Error('未知时刻真实组合仍补盘、补元素标签或遗漏数理/任注1.1快照。');
 await pdf('unknown',unknown);await readUI('unknown',unknown,'读音待确认',true);
 const sessions={pending,partial,confirmed,unknown},sessionsFile=join(out,'name-readings-sessions.json');atomicWrite(sessionsFile,JSON.stringify(sessions,null,2));
 const cases=Object.fromEntries(Object.entries(sessions).map(([key,session])=>[key,{sessionId:session.id,profileId:session.profileId,reviewRevision:session.reviewRevision,reviewToken:session.reviewToken,candidates:session.candidates.map(candidate=>({id:candidate.id,fullName:candidate.fullName,favorite:candidate.favorite,yueReading:candidate.yueReading,imageReading:candidate.imageReading,numerologyStatus:candidate.numerology?.status})),qimenAvailable:session.analysis.qimen.available,qimenSha256:createHash('sha256').update(JSON.stringify(session.analysis.qimen)).digest('hex'),renMethod:session.profile.renMethod}]));
 return {realStoredSessions:true,optimisticReviewWrites:true,unchangedBirthChart:true,unresolvedLabelsKept:true,historyStates,cases,ui,files,sessionsFile,note:'Actual service-generated and saved snapshots; dictionary compound surname/寧 plus user-confirmed 清; no fabricated production results. UI clicks only target the isolated smoke window. Native keyboard, connected AI and cross-machine installation are not asserted.'};
}
