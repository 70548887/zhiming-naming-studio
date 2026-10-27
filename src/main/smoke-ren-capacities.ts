import type {BrowserWindow} from 'electron';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import type {StudioService} from './service';
import {atomicWrite} from './store';
import {REN_ACTION_METHOD,REN_CAPACITY_METHOD} from '../shared/ren-method';
import {REN_CAPACITIES_SOURCE_ID} from '../domain/ren-capacities';
import type {BirthProfile,NamingPreferences,NamingSession} from '../shared/types';

/** Dedicated isolated installed/production-runtime check; all charts come from actual calendar inputs. */
export async function smokeRenCapacities(window:BrowserWindow,service:StudioService,out:string,base:BirthProfile,preferences:NamingPreferences,exportPdf:(session:NamingSession,file:string)=>Promise<string>,capture:()=>Promise<Buffer>){
  if(!process.env.NAMING_STUDIO_SMOKE||!process.env.NAMING_STUDIO_USER_DATA||process.env.NAMING_STUDIO_SMOKE_SCOPE!=='ren-capacities')throw new Error('局部能力验收须使用专用隔离自动验收范围。');
  const pref:NamingPreferences={...preferences,length:2,requiredChars:'安宁',generationChar:'',forbiddenChars:'',elderTaboo:'',preferredElements:[],numerology:false,zodiacRules:false,imageryReading:false,yueReading:false,yueHomophones:'none'};
  const source=service.bootstrap().sources.find(item=>item.id===REN_CAPACITIES_SOURCE_ID);
  if(!source)throw new Error('局部能力来源未登记。');
  const definitions=[
    {key:'known',date:'2012-03-15',time:'14:00:00',unknown:false,pillars:['壬辰','癸卯','乙亥','癸未'],capacity:'met'},
    {key:'second',date:'2003-04-01',time:'22:00:00',unknown:false,pillars:['癸未','乙卯','甲辰','乙亥'],capacity:'met'},
    {key:'outside',date:'2012-03-15',time:'16:00:00',unknown:false,pillars:['壬辰','癸卯','乙亥','甲申'],capacity:'unknown'},
    {key:'unknown',date:'2012-03-15',time:'',unknown:true,pillars:['壬辰','癸卯','乙亥'],capacity:'unknown'}
  ] as const;
  const sessions:Record<string,NamingSession>={},files:Record<string,string>={},ui:Record<string,unknown>={};
  for(const definition of definitions){
    const profile:BirthProfile={...base,id:'smoke-capacity-'+definition.key,customerName:'局部能力隔离验收-'+definition.key,surname:'林',surnamePinyin:'lín',birthDate:definition.date,birthTime:definition.time,timeUnknown:definition.unknown,timezone:'Asia/Shanghai',timeBasis:'civil',birthLongitude:undefined,renMethod:REN_CAPACITY_METHOD,fatherName:'',motherName:'',notes:'真实历法输入；仅验证原文限定局部能力，不作历史原例或完整判格金标。'};
    const generated=(await service.generate(profile,pref)).session;
    const session=service.saveSession({...generated,candidates:generated.candidates.map((candidate,index)=>({...candidate,favorite:index===0})),reviewNote:'确认原句限定能力；不外推金运、净作用或完整从强。'});
    const result=session.analysis.renCommentary?.capacityAnalysis;
    if(!result||session.analysis.renCommentary?.version!==REN_CAPACITY_METHOD||!session.analysis.bazi.version.includes('/1.13.0;')||!isDeepStrictEqual(session.analysis.bazi.pillars.map(p=>p.gan+p.zhi),definition.pillars)||result.checks.length!==2||result.checks.some(check=>check.capability!==definition.capacity||check.netEffect!=='unknown')||result.netEffect!=='unknown'||result.formationDecision!=='not-evaluated')throw new Error('实际局部能力或历法范围不符：'+definition.key);
    if(!isDeepStrictEqual(session.sourceSnapshot?.sources.find(item=>item.id===REN_CAPACITIES_SOURCE_ID),source))throw new Error('局部能力真实保存来源不符。');
    const database=join(service.store.userDir,'customers.sqlite'),before=readFileSync(database),stored=service.store.rows<NamingSession>('sessions').find(item=>item.id===session.id);
    if(!isDeepStrictEqual(stored,JSON.parse(JSON.stringify(session)))||!before.equals(readFileSync(database)))throw new Error('实际保存或只读不变量失败。');
    sessions[definition.key]=stored!;const file=join(out,'ren-capacities-'+definition.key+'.json');atomicWrite(file,JSON.stringify(stored,null,2));files[definition.key]=file;
    if(definition.key!=='second'){const pdf=join(out,'ren-capacities-'+definition.key+'.pdf');await exportPdf(stored!,pdf);files[definition.key+'Pdf']=pdf;}
  }
  const oldProfile:BirthProfile={...sessions.known.profile,id:'smoke-capacity-legacy',customerName:'局部能力旧1.2隔离对照',renMethod:REN_ACTION_METHOD};
  const old=(await service.generate(oldProfile,pref)).session;
  if(old.analysis.renCommentary?.capacityAnalysis!==undefined||old.sourceSnapshot?.sources.some(item=>item.id===REN_CAPACITIES_SOURCE_ID)||!isDeepStrictEqual(old.analysis.renCommentary?.actionAnalysis,sessions.known.analysis.renCommentary?.actionAnalysis)||!isDeepStrictEqual(old.analysis.renCommentary?.structureGraph,sessions.known.analysis.renCommentary?.structureGraph))throw new Error('1.3改动旧条件动作或回填旧取法。');
  sessions.legacy=old;const oldFile=join(out,'ren-capacities-legacy.json');atomicWrite(oldFile,JSON.stringify(old,null,2));files.legacy=oldFile;
  let narrowLayout:unknown;
  if(process.env.NAMING_STUDIO_CAPACITY_NARROW==='1'){
    window.setSize(1100,800);
    narrowLayout=await window.webContents.executeJavaScript(`(async()=>{
      const wait=async(test,label)=>{for(let i=0;i<150;i++){const value=test();if(value)return value;await new Promise(resolve=>setTimeout(resolve,40));}throw new Error('Capacity display:'+label);};
      (await wait(()=>document.querySelector('.settings-nav'),'settings')).click();
      const choose=async(text)=>(await wait(()=>[...document.querySelectorAll('.presentation-choice label')].find(node=>node.textContent.includes(text)),'display '+text)).querySelector('input').click();
      await choose('紧凑');await choose('大字');await wait(()=>document.documentElement.dataset.fontSize==='large'&&document.documentElement.dataset.density==='compact','applied display');
      return {width:innerWidth,height:innerHeight,font:document.documentElement.dataset.fontSize,density:document.documentElement.dataset.density,inputFont:getComputedStyle(document.querySelector('input')).fontSize};
    })()`);
  }
  for(const key of ['known','outside','unknown']as const){
    const session=sessions[key];await new Promise<void>(resolve=>{window.webContents.once('did-finish-load',()=>resolve());window.webContents.reload();});
    const state=await window.webContents.executeJavaScript(`(async()=>{
      const wait=async(test,label)=>{for(let i=0;i<180;i++){const value=test();if(value)return value;await new Promise(resolve=>setTimeout(resolve,40));}throw new Error('Capacity UI:'+label);};
      const nav=async(label)=>(await wait(()=>[...document.querySelectorAll('nav .nav-item')].find(node=>node.textContent.includes(label)),label)).click();
      await nav('方案与报告');(await wait(()=>[...document.querySelectorAll('.session-item')].find(node=>node.getAttribute('title')?.includes(${JSON.stringify(session.id)})),'stored session')).click();
      await wait(()=>document.querySelector('.session-item[aria-current="true"]')?.getAttribute('title')?.includes(${JSON.stringify(session.id)}),'selected session');await nav('八字与五行');
      const panel=await wait(()=>document.querySelector('.ren-capacities'),'capacity panel');for(const detail of panel.querySelectorAll('details'))if(!detail.open)detail.querySelector('summary').click();
      panel.scrollIntoView({block:'start'});await new Promise(resolve=>setTimeout(resolve,100));
      return {text:panel.innerText,viewport:{width:innerWidth,height:innerHeight,font:document.documentElement.dataset.fontSize,density:document.documentElement.dataset.density},classes:[...panel.querySelectorAll('.ren-capacity-check')].map(node=>node.className),horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,methodOptions:[...document.querySelectorAll('#birth-ren-method option')].map(node=>({value:node.value,label:node.textContent})),inputMethod:'DOM clicks in isolated Electron window; not native keyboard acceptance'};
    })()`);
    if(state.horizontalOverflow||state.classes.length!==2||state.classes.some((value:string)=>!value.split(' ').includes(key==='known'?'met':'unknown'))||!state.text.includes('也不表示木局永不受金克')||!state.text.includes('净作用：待核')||key==='known'&&!state.text.includes('生助能力获原句支持')||key==='outside'&&!state.text.includes('不在本证明子域')||key==='unknown'&&!state.text.includes('本证明仍缺条件'))throw new Error('实际局部能力界面解释失败：'+key);
    ui[key]=state;const preview=await capture();if(preview.length>500000)throw new Error('局部能力预览超过500KB');const previewFile=join(out,'ren-capacities-'+key+'-preview.jpg');atomicWrite(previewFile,preview);files[key+'Preview']=previewFile;
  }
  const backup=service.store.backupBytes();
  return{scope:'Dedicated actual1.3calendar/store/renderer/PDF checks; no external AI/native chooser/signing/cross-machine claim',realStoredSessions:true,legacyNoBackfill:true,sourceId:REN_CAPACITIES_SOURCE_ID,definitions,sessions:Object.fromEntries(Object.entries(sessions).map(([key,session])=>[key,{id:session.id,profileId:session.profileId,baziVersion:session.analysis.bazi.version,renVersion:session.analysis.renCommentary?.version,capacity:session.analysis.renCommentary?.capacityAnalysis,reviewRevision:session.reviewRevision}])),files,ui,narrowLayout,backupBytesValidated:backup.length,database:join(service.store.userDir,'customers.sqlite')};
}
