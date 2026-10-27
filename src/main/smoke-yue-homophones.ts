import type {BrowserWindow} from 'electron';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import type {BirthProfile,NamingPreferences,NamingSession,YueReadingSelection} from '../shared/types';
import {YUE_HOMOPHONE_SOURCE_IDS} from '../domain/yue-homophones';
import type {StudioService} from './service';
import {atomicWrite} from './store';
import {reportHTML} from './report';

/** Synthetic family-confirmed readings exercise real isolated SQL/service/UI/report paths, not a name recommendation. */
export async function smokeYueHomophones(window:BrowserWindow,service:StudioService,out:string,base:BirthProfile,preferences:NamingPreferences,exportPDF:(session:NamingSession,file:string)=>Promise<string>,capture:()=>Promise<Buffer>){
 if(!process.env.NAMING_STUDIO_SMOKE||!process.env.NAMING_STUDIO_USER_DATA)throw new Error('粤语词汇复核验收只允许独立自动验收窗口与客户库。');
 const files:Record<string,string>={},ui:Record<string,unknown>={};
 const serialized=(session:NamingSession)=>JSON.parse(JSON.stringify(session)) as NamingSession;
 const snapshot=(key:string,session:NamingSession)=>{
  const actual=service.store.rows<NamingSession>('sessions').find(value=>value.id===session.id);
  if(!actual||!isDeepStrictEqual(actual,serialized(session)))throw new Error('粤语词汇复核真实SQL快照不一致：'+key);
  const file=join(out,'yue-homophone-'+key+'.json');atomicWrite(file,JSON.stringify(actual,null,2));files[key]=file;return actual;
 };
 const firstOnly=(session:NamingSession)=>service.saveSession({...session,candidates:session.candidates.map((candidate,index)=>({...candidate,favorite:index===0})),reviewNote:'仅收藏第一名；所录粤语音节是合成验收家庭确认输入，不是词典姓氏义项或实际客户读法证据。'});
 const family=(tokens:string[]):YueReadingSelection=>({tokens,origin:'user',confirmed:true});
 const assertUnchanged=(before:NamingSession,after:NamingSession,id:string)=>{
  const old=before.candidates.find(candidate=>candidate.id===id),current=after.candidates.find(candidate=>candidate.id===id);
  if(!old||!current||!isDeepStrictEqual(serialized(before).analysis,serialized(after).analysis)||!isDeepStrictEqual(old.evaluation,current.evaluation)||before.candidates.some((candidate,index)=>candidate.id!==after.candidates[index]?.id))throw new Error('粤语词汇提醒改动了出生盘、原评分或候选排序。');
 };
 const checkSources=(session:NamingSession)=>{
  for(const id of YUE_HOMOPHONE_SOURCE_IDS)if(session.sourceSnapshot?.sources.filter(source=>source.id===id).length!==1)throw new Error('真实粤语词汇方案遗漏独立来源：'+id);
 };
 const readUI=async(key:string,session:NamingSession,expectedTerm?:string,expectedComparison?:string,screenshot=false)=>{
  await new Promise<void>(resolve=>{window.webContents.once('did-finish-load',()=>resolve());window.webContents.reload();});
  const result=await window.webContents.executeJavaScript(`(async()=>{
   const wait=async(test,label)=>{for(let attempt=0;attempt<180;attempt++){const found=test();if(found)return found;await new Promise(resolve=>setTimeout(resolve,40));}throw new Error('Yue homophones UI wait: '+label);};
   const reports=await wait(()=>[...document.querySelectorAll('nav .nav-item')].find(node=>node.textContent.includes('方案与报告')),'report navigation');reports.click();
   const saved=await wait(()=>[...document.querySelectorAll('.session-item')].find(node=>node.getAttribute('title')?.includes(${JSON.stringify(session.id)})),'actual saved session');saved.click();
   await wait(()=>document.querySelector('.session-item[aria-current="true"]')?.getAttribute('title')?.includes(${JSON.stringify(session.id)}),'selected actual session');
   const summaries=await wait(()=>{const nodes=[...document.querySelectorAll('.report-paper .yue-homophone-review')];return nodes.length?nodes:null;},'saved lexical summaries');
   const summaryTexts=summaries.map(node=>node.innerText);
   if(!${!!expectedTerm}){if(!summaryTexts.every(text=>text.includes('读音未全部确认')&&text.includes('暂未检查')))throw new Error('Unconfirmed lexical UI asserted assessment');return {summaryTexts,detail:null,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};}
   if(!summaryTexts.every(text=>text.includes('有限词表匹配 1 项')))throw new Error('Actual matched lexical summary is missing');
   const workbench=await wait(()=>[...document.querySelectorAll('nav .nav-item')].find(node=>node.textContent.includes('起名工作台')),'workbench navigation');workbench.click();
   const candidate=await wait(()=>[...document.querySelectorAll('.name-card')].find(node=>node.querySelector('h3')?.textContent===${JSON.stringify(session.candidates[0].fullName)}),'actual candidate');candidate.querySelector('.name-main').click();
   const detail=await wait(()=>document.querySelector('[role="dialog"] .yue-homophone-review'),'lexical detail');
   await wait(()=>detail.innerText.includes(${JSON.stringify(expectedTerm)})&&detail.innerText.includes(${JSON.stringify(expectedComparison)}),'actual term and comparison');
   const match=detail.querySelector('article');const evidence=match?.querySelector('details');if(evidence)evidence.open=true;
   detail.scrollIntoView({block:'start'});await new Promise(resolve=>setTimeout(resolve,100));
   return {summaryTexts,detail:detail.innerText,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,sourceIds:[...detail.querySelectorAll('li')].filter(node=>node.innerText.includes('yue-homophones-')).map(node=>node.innerText),savedStatus:[...document.querySelectorAll('[role="dialog"] [role="status"]')].map(node=>node.innerText)};
  })()`);
  if(result.horizontalOverflow)throw new Error('粤语词汇复核实际界面横向溢出。');
  if(expectedTerm&&(!result.detail?.includes('CC-BY-SA-4.0')||!result.detail.includes('CC-BY-4.0')||!result.detail.includes('不描述孩子的属性')))throw new Error('粤语词汇复核界面遗漏原义来源或范围说明。');
  ui[key]=result;
  if(screenshot){const bytes=await capture();if(bytes.length>500000)throw new Error('粤语词汇复核预览超过500KB');const file=join(out,'yue-homophone-'+key+'-preview.jpg');atomicWrite(file,bytes);files[key+'Preview']=file;}
 };
 const profile:BirthProfile={...base,id:'smoke-yue-words-strict',customerName:'粤语严格词汇联想隔离验收',surname:'溫',surnamePinyin:'wēn',birthDate:'2026-10-17',birthTime:'09:30:00',timeUnknown:false,timeBasis:'civil',birthLongitude:undefined,renMethod:'none',fatherName:'',motherName:'',notes:'合成验收，不代表真实客户或推荐姓名；家庭手录音节不作为词典姓氏证明。'};
 const pref:NamingPreferences={...preferences,length:1,generationChar:'',requiredChars:'奕',forbiddenChars:'',elderTaboo:'',preferredElements:[],zodiacRules:false,numerology:false,yueReading:true,yueHomophones:'strict',imageryReading:false};
 const strictGenerated=(await service.generate(profile,pref)).session;
 if(!strictGenerated.candidates.length||strictGenerated.candidates.some(candidate=>candidate.givenName!=='奕'||candidate.yueHomophones?.status!=='not-assessed'||candidate.yueHomophones.matches.length||candidate.yueHomophones.selectedTokens.length))throw new Error('真实严格词汇方案初始被误判为已查。');
 const strictPending=snapshot('strict-pending',firstOnly(strictGenerated));checkSources(strictPending);await readUI('strict-pending',strictPending);
 const first=strictPending.candidates[0];
 const strict=snapshot('strict',service.updateYueReading(strictPending.id,first.id,{surname:family(['wan1']),given:[family(['jik6'])]},strictPending.reviewRevision,strictPending.reviewToken));
 assertUnchanged(strictPending,strict,first.id);
 const strictMatch=strict.candidates[0].yueHomophones?.matches;
 if(strict.candidates[0].yueHomophones?.status!=='assessed'||strictMatch?.length!==1||strictMatch[0].term!=='瘟疫'||strictMatch[0].comparison!=='exact'||!isDeepStrictEqual(strictMatch[0].actualTokens,['wan1','jik6'])||!isDeepStrictEqual(strictMatch[0].span,{start:0,endExclusive:2,text:'溫奕',scope:'whole-full-name'}))throw new Error('真实严格音节确认未保留唯一词汇匹配。');
 const strictHtml=reportHTML(strict,service.bootstrap().settings);
 if(!strictHtml.includes('所选音节与声调一致')||!strictHtml.includes('流行性烈性传染病')||!YUE_HOMOPHONE_SOURCE_IDS.every(id=>strictHtml.includes(id)))throw new Error('严格词汇PDF源HTML缺少原义、模式或来源。');
 const strictPdf=join(out,'yue-homophone-strict.pdf');await exportPDF(strict,strictPdf);files.strictPdf=strictPdf;await readUI('strict',strict,'瘟疫','所选音节与声调一致',true);
 const toneProfile:BirthProfile={...profile,id:'smoke-yue-words-tone',customerName:'粤语显式去调词汇联想隔离验收',surname:'陈',surnamePinyin:'chén'};
 const toneGenerated=(await service.generate(toneProfile,{...pref,length:2,requiredChars:'瑞仁',yueHomophones:'ignore-tone'})).session;
 const tonePending=snapshot('tone-pending',firstOnly(toneGenerated)),toneFirst=tonePending.candidates[0];
 if(toneFirst.givenName!=='瑞仁'||toneFirst.yueHomophones?.status!=='not-assessed')throw new Error('真实去调词汇方案初始或字序不符。');
 const tone=snapshot('tone',service.updateYueReading(tonePending.id,toneFirst.id,{surname:family(['can4']),given:[family(['seoi6']),family(['jan4'])]},tonePending.reviewRevision,tonePending.reviewToken));
 assertUnchanged(tonePending,tone,toneFirst.id);checkSources(tone);
 const toneMatch=tone.candidates[0].yueHomophones?.matches;
 if(toneMatch?.length!==1||toneMatch[0].term!=='衰人'||toneMatch[0].comparison!=='tone-only'||!isDeepStrictEqual(toneMatch[0].span,{start:1,endExclusive:3,text:'瑞仁',scope:'whole-given-name'})||!isDeepStrictEqual(toneMatch[0].differentTonePositions,[1]))throw new Error('真实显式去调确认未保留字位或声调差异。');
 const toneHtml=reportHTML(tone,service.bootstrap().settings);
 if(!toneHtml.includes('仅忽略声调时近似')||!toneHtml.includes('已显式开启忽略声调复核')||!toneHtml.includes('壞人')||!YUE_HOMOPHONE_SOURCE_IDS.every(id=>toneHtml.includes(id)))throw new Error('去调词汇PDF源HTML缺少原义、显式模式或来源。');
 const tonePdf=join(out,'yue-homophone-tone.pdf');await exportPDF(tone,tonePdf);files.tonePdf=tonePdf;await readUI('tone',tone,'衰人','仅忽略声调时近似',true);
 const cleared=snapshot('tone-cleared',service.updateYueReading(tone.id,toneFirst.id,{surname:family(['can4']),given:[family(['seoi6']),null]},tone.reviewRevision,tone.reviewToken));
 if(cleared.candidates[0].yueHomophones?.status!=='not-assessed'||cleared.candidates[0].yueHomophones?.matches.length||cleared.candidates[0].yueHomophones?.selectedTokens.length)throw new Error('清除实际读音后仍保留已查词汇结果。');
 assertUnchanged(tone,cleared,toneFirst.id);await readUI('tone-cleared',cleared);
 const legacy=snapshot('none',(await service.generate({...profile,id:'smoke-yue-words-none',customerName:'旧读音1.0与词汇关闭隔离验收'},{...pref,yueHomophones:'none'})).session);
 if(legacy.candidates.some(candidate=>candidate.yueHomophones!==undefined||candidate.yueReading?.version!=='yue-name-reading/1.0.0')||legacy.sourceSnapshot?.sources.some(source=>(YUE_HOMOPHONE_SOURCE_IDS as readonly string[]).includes(source.id)))throw new Error('关闭词汇复核的旧读音方案附加了新结果或专用来源。');
 const sessions={strictPending,strict,tonePending,tone,cleared,legacy},sessionsFile=join(out,'yue-homophone-sessions.json');atomicWrite(sessionsFile,JSON.stringify(sessions,null,2));
 return{realStoredSessions:true,sqlSerializedCanonicalAgreement:true,strictExactTerm:'瘟疫',toneOnlyTerm:'衰人',clearedNotAssessed:true,unchangedBirthAnalysisAndScores:true,legacyReadingVersionUnchanged:true,ui,files,sessionsFile,
  cases:Object.fromEntries(Object.entries(sessions).map(([key,session])=>[key,{sessionId:session.id,reviewRevision:session.reviewRevision,reviewToken:session.reviewToken,names:session.candidates.map(candidate=>candidate.fullName),reviews:session.candidates.map(candidate=>candidate.yueHomophones)}])),
  note:'All sessions generated and saved via actual service in an isolated customer database. Family-user syllables are synthetic acceptance input, not proof of dictionary surname reading or real connected speech. PDF bytes are exported; independent PDF text/visual review remains a separate acceptance step.'};
}
