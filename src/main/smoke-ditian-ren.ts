import type {BrowserWindow} from 'electron';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {Store,atomicWrite} from './store';
import type {StudioService} from './service';
import type {BirthProfile,NamingPreferences,NamingSession} from '../shared/types';
import {LEGACY_REN_METHOD} from '../shared/ren-method';
const SOURCE_ID='bazi-ditian-ren-2600158';

/** Real generated/stored cases, not source examples relabelled with an invented birth date. */
export async function smokeDitianRen(window:BrowserWindow,service:StudioService,out:string,base:BirthProfile,preferences:NamingPreferences,exportPdf:(session:NamingSession,file:string)=>Promise<string>,capture:()=>Promise<Buffer>) {
  const definitions=[
    {key:'strong-yes',label:'任注从强同盘隔离验收',change:{birthDate:'1914-11-25',birthTime:'13:30:00'},expectedCase:'strong-wood-yes'},
    {key:'strong-no',label:'任注从强对照隔离验收',change:{birthDate:'1914-03-10',birthTime:'21:30:00'},expectedCase:'strong-wood-no'},
    {key:'solar-unknown',label:'任注未知日主隔离验收',change:{birthDate:'2024-02-10',birthTime:'',timeUnknown:true,timeBasis:'apparent-solar' as const,birthLongitude:87.6168},expectedCase:null}
  ];
  const expectedSource=service.bootstrap().sources.find(source=>source.id===SOURCE_ID);
  if(!expectedSource)throw new Error('任注启动来源未登记。');
  const sessions:Record<string,NamingSession>={};
  for(const definition of definitions){
    const profile:BirthProfile={...base,id:'smoke-ren-'+definition.key,customerName:definition.label,renMethod:LEGACY_REN_METHOD,calendar:'solar',leapMonth:false,timezone:'Asia/Shanghai',timeUnknown:false,timeBasis:'civil',birthLongitude:undefined,fatherName:'',motherName:'',notes:'隔离运行映射：原书仅记录四柱；当前出生输入只用于核程序运行，不声称取得原书公历生日。',...definition.change};
    const generated=(await service.generate(profile,{...preferences,length:2,requiredChars:'安宁',generationChar:'',forbiddenChars:'',elderTaboo:'',numerology:false,zodiacRules:false})).session;
    const session=service.saveSession({...generated,reviewNote:'任注独立原书对读；有效作用与通用成格仍依所列条件核定。'}),ren=session.analysis.renCommentary;
    if(!ren||!session.analysis.bazi.version.includes('/1.10.0;')||ren.sourceId!==SOURCE_ID||!isDeepStrictEqual(session.sourceSnapshot?.sources.find(source=>source.id===SOURCE_ID),expectedSource)||ren.structureGraph.edges.some(edge=>edge.effectiveAction!=='unknown')||ren.structureGraph.actionContracts.length!==11)throw new Error('任注实际保存版本、来源或有效作用边界失败：'+definition.key);
    if(definition.expectedCase&&!ren.sourceCaseMatches.some(item=>item.caseId===definition.expectedCase))throw new Error('实际出生输入没有匹配核定原书四柱：'+definition.key);
    if(!definition.expectedCase&&(ren.input.complete||ren.input.dayStem!==undefined||ren.sourceCaseMatches.length||session.analysis.bazi.evidence!==undefined))throw new Error('未知太阳日界仍伪造任注完整源例或日主。');
    sessions[definition.key]=session;
  }
  const originalBytes=readFileSync(join(service.store.userDir,'customers.sqlite'));
  const reader=await new Store(service.store.userDir,service.store.dataDir,join(service.store.dataDir,'..','node_modules/sql.js/dist/sql-wasm.wasm')).init();
  try{for(const session of Object.values(sessions))if(!isDeepStrictEqual(reader.rows<NamingSession>('sessions').find(item=>item.id===session.id),session))throw new Error('任注方案重新打开Store不一致。');}finally{reader.db.close();}
  if(!originalBytes.equals(readFileSync(join(service.store.userDir,'customers.sqlite'))))throw new Error('任注只读重开改变客户库。');
  const pdfs:Record<string,string>={};
  for(const key of ['strong-yes','solar-unknown']){pdfs[key]=join(out,key==='strong-yes'?'ren-known-report.pdf':'ren-unknown-report.pdf');await exportPdf(sessions[key],pdfs[key]);}
  const sessionsFile=join(out,'ren-sessions.json');atomicWrite(sessionsFile,JSON.stringify(sessions,null,2));
  await new Promise<void>(resolve=>{window.webContents.once('did-finish-load',()=>resolve());window.webContents.reload();});
  const ui:Record<string,any>={};
  for(const definition of definitions){
    const current=await window.webContents.executeJavaScript(`(async()=>{
      const wait=async(test,label)=>{for(let i=0;i<160;i++){const value=test();if(value)return value;await new Promise(r=>setTimeout(r,40));}throw new Error('Ren UI wait: '+label);};
      const nav=async(text)=>{(await wait(()=>[...document.querySelectorAll('nav .nav-item')].find(node=>node.textContent.includes(text)),text)).click();};
      await nav('方案与报告');const item=await wait(()=>[...document.querySelectorAll('.session-item')].find(node=>node.getAttribute('title')?.includes(${JSON.stringify(sessions[definition.key].id)})),'actual session');item.click();
      await wait(()=>document.querySelector('.session-item[aria-current="true"]')?.getAttribute('title')?.includes(${JSON.stringify(sessions[definition.key].id)}),'selected session');await nav('八字与五行');
      const panel=await wait(()=>document.querySelector('.ren-commentary'),'saved independent panel');panel.scrollIntoView({block:'start'});
      const summary=panel.querySelector('.ren-graph>summary');if(!summary)throw new Error('Ren graph details missing');summary.click();
      const graphGroup=panel.querySelector('.ren-graph-group>summary');if(graphGroup)graphGroup.click();
      const sources=panel.querySelector('.ren-sources>summary');sources.click();
      const exportInputs=panel.querySelectorAll('.ren-input dd');return {text:panel.innerText,caseCount:panel.querySelectorAll('.ren-case').length,knownPillars:[...exportInputs].map(node=>node.textContent),graphOpened:summary.parentElement.open,sourceOpened:sources.parentElement.open,sourceText:sources.parentElement.innerText,actionContracts:panel.querySelectorAll('.ren-action-contract').length,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,inputMethod:'Explicit DOM click only; native desktop keyboard not asserted'};
    })()`);
    if(current.horizontalOverflow||!current.graphOpened||!current.sourceOpened||current.actionContracts!==11||!current.text.includes('有效作用：未裁决')||!current.sourceText.includes(SOURCE_ID))throw new Error('任注真实UI没有保留关系、依赖或来源范围：'+definition.key);
    if(definition.expectedCase&&!current.caseCount||!definition.expectedCase&&current.caseCount)throw new Error('任注UI同盘数量错误。');
    ui[definition.key]=current;
    if(definition.key==='strong-yes'){const preview=await capture();if(preview.length>500000)throw new Error('任注预览大于500KB');atomicWrite(join(out,'ren-preview.jpg'),preview);}
  }
  return {realStoredSessions:true,readOnlyReloadUnchanged:true,sourceId:SOURCE_ID,cases:Object.fromEntries(Object.entries(sessions).map(([key,session])=>[key,{sessionId:session.id,profileId:session.profileId,sourceBound:isDeepStrictEqual(session.sourceSnapshot?.sources.find(source=>source.id===SOURCE_ID),expectedSource),analysis:session.analysis,profile:session.profile}])),ui,pdfs,sessionsFile,note:'Three actual service-generated/stored/reopened sessions. Recorded source charts were matched only after actual input yielded identical4pillars; no Gregorian birth date asserted for the book. Browser actual keyboard validation is separate; hidden desktop uses explicit DOM clicks.'};
}
