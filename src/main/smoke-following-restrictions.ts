import type {BrowserWindow} from 'electron';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {Store,atomicWrite} from './store';
import type {StudioService} from './service';
import type {BirthProfile,NamingPreferences,NamingSession} from '../shared/types';

const SOURCE_ID='bazi-following-restrictions-qiongtong-2294674';

/** Isolated Electron smoke: every example is generated, saved and reread from the real customer store. */
export async function smokeFollowingRestrictions(window:BrowserWindow,service:StudioService,out:string,base:BirthProfile,preferences:NamingPreferences,exportPdf:(session:NamingSession,file:string)=>Promise<string>,capture:()=>Promise<Buffer>) {
  const beforeUI=await window.webContents.executeJavaScript(`(async()=>{
    const page=document.querySelector('nav .nav-item[aria-current="page"]')?.textContent.trim()||'八字与五行';
    const reports=[...document.querySelectorAll('nav .nav-item')].find(e=>e.textContent.includes('方案与报告'));if(!reports)throw new Error('Missing saved-session navigation');reports.click();
    for(let i=0;i<150;i++){if(document.querySelector('.session-catalog')){const selected=document.querySelector('.session-item[aria-current="true"]');return {page,selectedTitle:selected?.getAttribute('title')||''};}await new Promise(r=>setTimeout(r,40));}throw new Error('Following restriction baseline catalog did not load');
  })()`);
  const definitions:{key:string;label:string;change:Partial<BirthProfile>;expected:('applies'|'not-applicable'|'pending')[]}[]=[
    {key:'jia-yin',label:'甲寅月份限制验收',change:{birthDate:'2024-02-10',birthTime:'09:30:00'},expected:['applies','not-applicable']},
    {key:'gui-wei',label:'癸未月份限制验收',change:{birthDate:'2024-07-08',birthTime:'09:30:00'},expected:['not-applicable','applies']},
    {key:'jia-lichun-pending',label:'交立春月份待定验收',change:{birthDate:'2027-02-04',birthTime:'',timeUnknown:true},expected:['pending','not-applicable']},
    {key:'solar-day-pending',label:'太阳日主待定限制验收',change:{birthDate:'2024-02-10',birthTime:'',timeUnknown:true,timeBasis:'apparent-solar',birthLongitude:87.6168},expected:['pending','pending']}
  ];
  const sessions:Record<string,NamingSession>={};
  const expectedSource=service.bootstrap().sources.find(source=>source.id===SOURCE_ID);
  if(!expectedSource)throw new Error('月份限制固定来源未在实际启动资料中登记。');
  for(const definition of definitions){
    const profile:BirthProfile={...base,id:'smoke-following-'+definition.key,customerName:definition.label,calendar:'solar',leapMonth:false,timezone:'Asia/Shanghai',timeUnknown:false,timeBasis:'civil',birthLongitude:undefined,fatherName:'',motherName:'',notes:'隔离自动验收：真实生成与存盘；本固定版月份限制不代表完整从格或其他流派结论。',...definition.change};
    const generated=(await service.generate(profile,{...preferences,length:2,requiredChars:'安宁',generationChar:'',forbiddenChars:'',elderTaboo:'',numerology:false,zodiacRules:false})).session;
    const session=service.saveSession({...generated,reviewNote:'隔离烟测已审阅：月份限制按原句范围，其他未核格局条件继续保留。'});
    const restrictions=session.analysis.bazi.monthFollowingRestrictions;
    if(!restrictions||!isDeepStrictEqual(restrictions.checks.map(check=>check.status),definition.expected)||restrictions.sourceId!==SOURCE_ID||restrictions.checks.some(check=>check.scope!=='fixed-source-clause-only')||!isDeepStrictEqual(session.sourceSnapshot?.sources.find(source=>source.id===SOURCE_ID),expectedSource))throw new Error('实际生成的月份限制状态、范围或来源不符：'+definition.key);
    if(definition.key==='jia-lichun-pending'&&(session.analysis.bazi.pillars.some(pillar=>pillar.label==='月柱')||restrictions.checks[0].dayStem!=='甲'||!isDeepStrictEqual(restrictions.checks[0].monthBranches,['丑','寅'])))throw new Error('交立春未知月柱没有保留实际可能月份。');
    if(definition.key==='solar-day-pending'&&(session.analysis.bazi.evidence!==undefined||session.analysis.bazi.pillars.some(pillar=>pillar.label==='日柱'||pillar.label==='时柱')||session.analysis.bazi.favorable.length))throw new Error('太阳日界待定仍补造日主或依赖证据。');
    sessions[definition.key]=session;
  }
  const beforeReload=readFileSync(join(service.store.userDir,'customers.sqlite'));
  const reader=await new Store(service.store.userDir,service.store.dataDir,join(service.store.dataDir,'..','node_modules/sql.js/dist/sql-wasm.wasm')).init();
  const reloaded:Record<string,NamingSession>={};
  try{
    const rows=reader.rows<NamingSession>('sessions');
    for(const definition of definitions){const found=rows.find(row=>row.id===sessions[definition.key].id);if(!found||!isDeepStrictEqual(found,sessions[definition.key]))throw new Error('重新打开实际客户库未保持完整方案：'+definition.key);reloaded[definition.key]=found;}
  }finally{reader.db.close();}
  if(!readFileSync(join(service.store.userDir,'customers.sqlite')).equals(beforeReload))throw new Error('月份限制只读重开改变了客户库。');
  const pdf=join(out,'following-restrictions-report.pdf');await exportPdf(reloaded['jia-yin'],pdf);
  const sessionsFile=join(out,'following-restrictions-sessions.json');atomicWrite(sessionsFile,JSON.stringify(reloaded,null,2));
  await new Promise<void>(resolve=>{window.webContents.once('did-finish-load',()=>resolve());window.webContents.reload();});
  const ui:Record<string,{text:string;applies:number;pending:number;horizontalOverflow:boolean}>={};
  let keyboard:Record<string,unknown>|undefined;
  for(const definition of definitions){
    const selection=await window.webContents.executeJavaScript(`(async()=>{
      const wait=async(test,label)=>{for(let i=0;i<150;i++){const value=test();if(value)return value;await new Promise(r=>setTimeout(r,40));}throw new Error('Following restriction UI wait: '+label);};
      const nav=async(text)=>{(await wait(()=>[...document.querySelectorAll('nav .nav-item')].find(e=>e.textContent.includes(text)),text)).click();};
      await nav('方案与报告');const selected=await wait(()=>[...document.querySelectorAll('.session-item')].find(e=>e.getAttribute('title')?.includes(${JSON.stringify(reloaded[definition.key].id)})),'actual saved session');selected.click();
      await wait(()=>document.querySelector('.session-item[aria-current="true"]')?.getAttribute('title')?.includes(${JSON.stringify(reloaded[definition.key].id)}),'selected session identity');await nav('八字与五行');
      const panel=await wait(()=>document.querySelector('.month-following-restrictions'),'stored restriction panel');panel.scrollIntoView({block:'start'});
      await new Promise(r=>setTimeout(r,80));return {text:panel.innerText,applies:panel.querySelectorAll('.following-restriction.applies').length,pending:panel.querySelectorAll('.following-restriction.pending').length,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};
    })()`);
    const applies=definition.expected.filter(status=>status==='applies').length,pending=definition.expected.filter(status=>status==='pending').length;
    if(selection.applies!==applies||selection.pending!==pending||selection.horizontalOverflow||!selection.text.includes('未命中限制不代表从格成立')||applies&&!selection.text.includes('本固定版本原句不取')||pending&&!selection.text.includes('暂不裁决'))throw new Error('月份限制实际界面未保持状态或范围：'+definition.key);
    ui[definition.key]=selection;
    if(definition.key==='jia-yin'){
      const before=await window.webContents.executeJavaScript(`(()=>{const summary=document.querySelector('.following-restriction.applies details>summary');if(!summary)throw new Error('Missing restriction native summary');summary.focus();return {focused:document.activeElement===summary,closed:!summary.parentElement.open};})()`);
      let nativeEnterVerified=false,nativeError:string|null=null;
      try{
        window.webContents.sendInputEvent({type:'keyDown',keyCode:'Enter'});window.webContents.sendInputEvent({type:'keyUp',keyCode:'Enter'});
        const native=await window.webContents.executeJavaScript(`(async()=>{for(let i=0;i<100;i++){const summary=document.querySelector('.following-restriction.applies details>summary');if(summary?.parentElement.open)return {opened:true,summaryFocus:document.activeElement===summary};await new Promise(r=>setTimeout(r,30));}throw new Error('Native Enter did not expand restriction source details in this isolated desktop window');})()`);
        nativeEnterVerified=!!native.opened&&!!native.summaryFocus;
        if(!nativeEnterVerified)nativeError='Native Enter result did not retain focus on the restriction summary.';
      }catch(error){nativeError=error instanceof Error?error.message:String(error);}
      const opened=await window.webContents.executeJavaScript(`(async()=>{const summary=document.querySelector('.following-restriction.applies details>summary');if(!summary)throw new Error('Missing restriction source disclosure after native input attempt');summary.focus();if(!summary.parentElement.open)summary.click();for(let i=0;i<100;i++){if(summary.parentElement.open)return {opened:true,summaryFocus:document.activeElement===summary,text:summary.parentElement.innerText,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};await new Promise(r=>setTimeout(r,30));}throw new Error('Restriction DOM source disclosure did not expand');})()`);
      if(!before.focused||!before.closed||!opened.opened||!opened.summaryFocus||opened.horizontalOverflow||!opened.text.includes(SOURCE_ID)||!opened.text.includes('oldid=2294674'))throw new Error('月份限制原文展开、范围、焦点或横向布局验收失败。');
      keyboard={before,opened,nativeEnterVerified,nativeError,nativeEnterPending:!nativeEnterVerified,sourceDisclosureVerified:!!opened.opened&&!!opened.summaryFocus,inputMethod:nativeEnterVerified?'Electron webContents.sendInputEvent Enter keyDown/keyUp on focused native summary.':'Electron Enter keyDown/keyUp attempted without forcing window focus; explicit DOM summary.click() fallback verified source disclosure, not native keyboard.',scope:'Isolated desktop source-disclosure and DOM focus check; native input result is separately recorded.',note:'浏览器真实 Enter 展开和 summary 焦点已独立验过；桌面隐藏窗口的原生键盘未通过时保留待复验，不以 DOM 点击结果冒充。'};
      const preview=await capture();if(preview.length>500000)throw new Error('月份限制界面预览大于500KB。');atomicWrite(join(out,'following-restrictions-preview.jpg'),preview);
    }
  }
  const restoredUI=await window.webContents.executeJavaScript(`(async()=>{
    const wait=async(test,label)=>{for(let i=0;i<150;i++){const value=test();if(value)return value;await new Promise(r=>setTimeout(r,40));}throw new Error('Following restore UI wait: '+label);};
    const nav=async(text)=>{(await wait(()=>[...document.querySelectorAll('.nav-item')].find(e=>e.textContent.includes(text)),text)).click();};
    await nav('方案与报告');const title=${JSON.stringify(beforeUI.selectedTitle)};
    if(title){const item=await wait(()=>[...document.querySelectorAll('.session-item')].find(e=>e.getAttribute('title')===title),'original selection');item.click();await wait(()=>document.querySelector('.session-item[aria-current="true"]')?.getAttribute('title')===title,'restored original selection');}
    await nav(${JSON.stringify(beforeUI.page)});await wait(()=>document.querySelector('.nav-item.active')?.textContent.trim()===${JSON.stringify(beforeUI.page)},'original page');return {page:document.querySelector('.nav-item.active')?.textContent.trim()||'',selectedTitle:title};
  })()`);
  if(restoredUI.page!==beforeUI.page)throw new Error('月份限制验收后没有还原原页面。');
  const cases=Object.fromEntries(definitions.map(definition=>{const session=reloaded[definition.key];return [definition.key,{sessionId:session.id,profileId:session.profileId,profile:session.profile,restrictions:session.analysis.bazi.monthFollowingRestrictions,hasEvidence:session.analysis.bazi.evidence!==undefined,hasDayPillar:session.analysis.bazi.pillars.some(p=>p.label==='日柱'),hasMonthPillar:session.analysis.bazi.pillars.some(p=>p.label==='月柱'),sourceBound:isDeepStrictEqual(session.sourceSnapshot?.sources.find(source=>source.id===SOURCE_ID),expectedSource),reloadedEqual:isDeepStrictEqual(session,sessions[definition.key]),reviewSaved:session.reviewNote.includes('隔离烟测已审阅')}];}));
  return {realStoredSessions:Object.values(cases).every(value=>value.reloadedEqual&&value.reviewSaved),sourceId:SOURCE_ID,cases,ui,keyboard,restoredUI,originalUI:beforeUI,storeReloadDidNotWrite:true,pdf,sessionsFile,note:'四例均由实际service.generate/saveSession保存，再重新打开Store逐字段核对。桌面原生Enter结果单独记录；未生效时使用明确DOM点击核对原文展开，原生复验继续待补。浏览器真实键盘另有独立验收；未伪造完整从格结论。'};
}
