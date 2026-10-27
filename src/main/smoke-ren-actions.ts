import type {BrowserWindow} from 'electron';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import type {StudioService} from './service';
import {atomicWrite} from './store';
import {REN_ACTION_METHOD,REN_METHOD} from '../shared/ren-method';
import {REN_ACTIONS_SOURCE_ID} from '../domain/ren-actions';
import type {BirthProfile,NamingPreferences,NamingSession} from '../shared/types';

/** Real isolated service, disk and UI checks; no fabricated chart or action conclusion. */
export async function smokeRenActions(window:BrowserWindow,service:StudioService,out:string,base:BirthProfile,preferences:NamingPreferences,exportPdf:(session:NamingSession,file:string)=>Promise<string>,capture:()=>Promise<Buffer>){
  if(!process.env.NAMING_STUDIO_SMOKE||!process.env.NAMING_STUDIO_USER_DATA)throw new Error('任注条件作用验收须使用独立自动验收窗口与客户库。');
  const sessions:Record<string,NamingSession>={},files:Record<string,string>={},ui:Record<string,any>={};
  const source=service.bootstrap().sources.find(item=>item.id===REN_ACTIONS_SOURCE_ID);
  if(!source)throw new Error('任注条件作用固定来源未登记。');
  const jsonContract=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
  const writeSnapshot=(key:string,session:NamingSession)=>{
    const database=join(service.store.userDir,'customers.sqlite'),before=readFileSync(database);
    const actual=service.store.rows<NamingSession>('sessions').find(value=>value.id===session.id);
    if(!actual||!isDeepStrictEqual(actual,jsonContract(session)))throw new Error('任注条件作用真实JSON存盘不一致：'+key);
    if(!before.equals(readFileSync(database)))throw new Error('任注条件作用只读存盘核对修改了客户库。');
    const file=join(out,'ren-actions-'+key+'.json');atomicWrite(file,JSON.stringify(actual,null,2));files[key]=file;
  };
  const knownProfile:BirthProfile={...base,id:'smoke-ren-actions-known',customerName:'任注条件作用已知时刻隔离验收',surname:'林',surnamePinyin:'lín',birthDate:'1983-03-10',birthTime:'13:30:00',timeUnknown:false,timezone:'Asia/Shanghai',timeBasis:'civil',birthLongitude:undefined,renMethod:REN_ACTION_METHOD,fatherName:'',motherName:'',notes:'真实历算输入：四柱期望来自独立固定lunar原始提取；一般条件不是原书命例或完整成格。'};
  const pref:NamingPreferences={...preferences,length:2,requiredChars:'安宁',generationChar:'',forbiddenChars:'',elderTaboo:'',preferredElements:[],numerology:false,zodiacRules:false,imageryReading:false,yueReading:false,yueHomophones:'none'};
  const generated=(await service.generate(knownProfile,pref)).session;
  const expectedPillars=['癸亥','乙卯','丁酉','丁未'];
  if(!isDeepStrictEqual(generated.analysis.bazi.pillars.map(p=>p.gan+p.zhi),expectedPillars)||generated.candidates.length!==2)throw new Error('任注条件作用独立历算锚点或两候选范围不符。');
  const known=service.saveSession({...generated,candidates:generated.candidates.map((candidate,index)=>({...candidate,favorite:index===0})),reviewNote:'只收藏第一名；木局内插紧贴条件命中，力量、拔根和完整成格仍未裁决。'});
  const unknown=(await service.generate({...knownProfile,id:'smoke-ren-actions-unknown',customerName:'任注条件作用未知时刻隔离验收',birthTime:'',timeUnknown:true,notes:'同一民用生日，时刻未知；不补未时、唯一奇门或完整木局。'},pref)).session;
  const legacy=(await service.generate({...knownProfile,id:'smoke-ren-actions-v11',customerName:'任注1.1原取法隔离对照',renMethod:REN_METHOD,notes:'相同生日时刻，明确选择旧1.1，不回填新条件作用层。'},pref)).session;
  for(const[key,session]of Object.entries({known,unknown})){
    const ren=session.analysis.renCommentary,actions=ren?.actionAnalysis;
    if(!actions||ren.version!==REN_ACTION_METHOD||ren.profileId!==REN_ACTION_METHOD||!session.analysis.bazi.version.includes('/1.12.0;')||actions.sourceId!==REN_ACTIONS_SOURCE_ID||actions.version!=='1.0.0'||session.candidates.length!==2||!isDeepStrictEqual(session.sourceSnapshot?.sources.find(item=>item.id===REN_ACTIONS_SOURCE_ID),source))throw new Error('任注1.2实际版本、结果或来源不一致：'+key);
    const check=actions.checks.find(item=>item.kind==='wood-triad-clash');
    if(!check||check.id!=='wood-triad:internal-tight-clash'||check.status!==(key==='known'?'met':'unknown'))throw new Error('任注木局条文实际条件不一致：'+key);
    if(actions.formationDecision!=='not-evaluated'||actions.strengthDecision!=='not-evaluated'||actions.checks.some(item=>item.effectiveAction!=='unknown'||item.formationDecision!=='not-evaluated')||actions.rootLinks.some(link=>link.effectiveSupport!=='unknown'||!link.originalNodesRetained))throw new Error('任注条件作用把所列前提升级为有效力量或删根。');
    const nodes=ren.structureGraph.nodes,ids=new Set(nodes.map(node=>node.id));
    if(actions.rootLinks.some(link=>![link.stemNodeId,link.hiddenNodeId,link.branchNodeId].every(id=>ids.has(id)))||actions.checks.some(item=>item.nodeIds.some(id=>!ids.has(id))))throw new Error('任注条件作用根或靶标节点脱离原结构图。');
    if(key==='known'){
      if(!check.predicates.some(item=>item.id==='internal-tight-target'&&item.state==='met')||!actions.checks.some(item=>item.predicates.some(predicate=>predicate.id==='clash-capability'&&predicate.state==='unknown'))||!nodes.some(node=>node.position==='hour')||session.candidates.filter(candidate=>candidate.favorite).length!==1)throw new Error('已知木局未保留紧贴事实、未知力量或收藏范围。');
    }else if(session.analysis.qimen.available||session.analysis.qimen.palaces.length||nodes.some(node=>node.position==='hour')||session.analysis.bazi.pillars.some(pillar=>pillar.label==='时柱')||actions.rootLinks.some(link=>link.rootPosition==='hour'||link.stemPosition==='hour')||actions.input.complete)throw new Error('未知时刻条件作用仍补时柱、根或唯一盘。');
    sessions[key]=session;writeSnapshot(key,session);const file=join(out,'ren-actions-'+key+'.pdf');await exportPdf(session,file);files[key+'Pdf']=file;
  }
  if(legacy.analysis.renCommentary?.version!==REN_METHOD||legacy.analysis.renCommentary?.actionAnalysis!==undefined||legacy.sourceSnapshot?.sources.some(item=>item.id===REN_ACTIONS_SOURCE_ID)||!legacy.analysis.bazi.version.includes('/1.11.0;'))throw new Error('旧任注1.1对照被回填条件动作结果或新来源。');
  sessions.legacy=legacy;writeSnapshot('legacy',legacy);
  if(!isDeepStrictEqual(legacy.analysis.bazi.pillars.map(p=>p.gan+p.zhi),expectedPillars))throw new Error('旧取法历算锚点被新动作改变。');
  const showUI=async(key:'known'|'unknown',session:NamingSession)=>{
    await new Promise<void>(resolve=>{window.webContents.once('did-finish-load',()=>resolve());window.webContents.reload();});
    const state=await window.webContents.executeJavaScript(`(async()=>{
      const wait=async(test,label)=>{for(let attempt=0;attempt<180;attempt++){const value=test();if(value)return value;await new Promise(resolve=>setTimeout(resolve,40));}throw new Error('Ren actions UI wait:'+label);};
      const nav=async(label)=>(await wait(()=>[...document.querySelectorAll('nav .nav-item')].find(node=>node.textContent.includes(label)),label)).click();
      await nav('方案与报告');const saved=await wait(()=>[...document.querySelectorAll('.session-item')].find(node=>node.getAttribute('title')?.includes(${JSON.stringify(session.id)})),'actual stored session');saved.click();
      await wait(()=>document.querySelector('.session-item[aria-current="true"]')?.getAttribute('title')?.includes(${JSON.stringify(session.id)}),'selected actual session');await nav('八字与五行');
      const panel=await wait(()=>document.querySelector('.ren-actions'),'new action panel');const group=await wait(()=>[...panel.querySelectorAll('.ren-actions-group')].find(node=>node.querySelector(':scope > summary')?.textContent.includes('木局内插冲损条文')),'wood summary');
      const summary=group.querySelector(':scope > summary');if(!group.open)summary.click();const card=await wait(()=>group.querySelector('.ren-actions-check'),'wood check');
      const expected=${JSON.stringify(key==='known'?'所列条件已见':'尚有条件待核')};await wait(()=>card.innerText.includes(expected),'saved condition status');
      const predicates=[...card.querySelectorAll('details')].find(node=>node.querySelector('summary')?.textContent.includes('所查前提与缺项'));if(predicates&&!predicates.open)predicates.querySelector('summary').click();
      card.scrollIntoView({block:'center'});await new Promise(resolve=>setTimeout(resolve,120));
      return {sessionTitle:document.querySelector('.session-item[aria-current="true"]')?.getAttribute('title'),text:card.innerText,groupExpanded:group.open,predicatesExpanded:!!predicates?.open,statusClass:card.className,pillarLabels:[...document.querySelectorAll('.pillars .pillar > span')].map(node=>node.textContent),horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,inputMethod:'Explicit DOM clicks in isolated smoke window; no native keyboard claim'};
    })()`);
    if(state.horizontalOverflow||!state.groupExpanded||!state.predicatesExpanded||!state.text.includes('不判有效拔根')||state.statusClass.includes('met')!==(key==='known')||state.statusClass.includes('unknown')!==(key==='unknown')||(key==='unknown'&&state.pillarLabels.includes('时柱')))throw new Error('任注条件作用实际界面状态不一致：'+key);
    ui[key]=state;const preview=await capture();if(preview.length>500000)throw new Error('任注条件作用预览超过500KB。');const file=join(out,'ren-actions-'+key+'-preview.jpg');atomicWrite(file,preview);files[key+'Preview']=file;
  };
  await showUI('known',known);await showUI('unknown',unknown);
  const sessionsFile=join(out,'ren-actions-sessions.json');atomicWrite(sessionsFile,JSON.stringify(sessions,null,2));
  return{realStoredSessions:true,jsonContractComparedToActualRows:true,customerBytesUnchangedByReads:true,independentCalendarExpectation:{date:'1983-03-10',time:'13:30:00',timezone:'Asia/Shanghai',pillars:expectedPillars,basis:'Fixed upstream lunar extraction checked independently before action engine; not a source case or artificial birth chart'},sourceId:REN_ACTIONS_SOURCE_ID,actionVersion:'1.0.0',legacyNoBackfill:true,cases:Object.fromEntries(Object.entries(sessions).map(([key,session])=>[key,{sessionId:session.id,profileId:session.profileId,baziVersion:session.analysis.bazi.version,renVersion:session.analysis.renCommentary?.version,actionVersion:session.analysis.renCommentary?.actionAnalysis?.version,rootLinks:session.analysis.renCommentary?.actionAnalysis?.rootLinks,checks:session.analysis.renCommentary?.actionAnalysis?.checks,source:session.sourceSnapshot?.sources.find(item=>item.id===REN_ACTIONS_SOURCE_ID)}])),ui,files,sessionsFile,note:'Two actual1.2saved sessions and one explicit1.1control;known wood clause met,unknown hour remains unknown,no effective force or full formation.Electron DOM clicks only,no native keyboard or external AI claim.'};
}
