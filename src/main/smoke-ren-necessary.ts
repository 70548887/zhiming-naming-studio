import type {BrowserWindow} from 'electron';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {Store,atomicWrite} from './store';
import type {StudioService} from './service';
import type {BirthProfile,NamingPreferences,NamingSession} from '../shared/types';
import {REN_METHOD} from '../shared/ren-method';
const SOURCE_ID='bazi-ditian-ren-necessary-2600158';

export async function smokeRenNecessary(window:BrowserWindow,service:StudioService,out:string,base:BirthProfile,preferences:NamingPreferences,exportPdf:(session:NamingSession,file:string)=>Promise<string>) {
 const defs=[
  {key:'no-wealth',date:'2020-01-04',time:'00:30:00',statuses:['contradicted','not-excluded']},
  {key:'no-output',date:'2020-03-13',time:'06:30:00',statuses:['not-excluded','contradicted']},
  {key:'child-source',date:'1902-11-24',time:'07:30:00',statuses:['not-excluded','not-excluded']},
  {key:'unknown',date:'2024-02-10',time:'',statuses:['unknown','unknown']}
 ];
 const sessions:Record<string,NamingSession>={},source=service.bootstrap().sources.find(item=>item.id===SOURCE_ID);
 if(!source)throw new Error('必要条件启动来源未登记。');
 for(const def of defs){
  const unknown=def.key==='unknown',p:BirthProfile={...base,id:'smoke-ren-necessary-'+def.key,customerName:'任注必要条件隔离验收-'+def.key,birthDate:def.date,birthTime:def.time,timeUnknown:unknown,renMethod:REN_METHOD,timeBasis:unknown?'apparent-solar':'civil',birthLongitude:unknown?87.6168:undefined,fatherName:'',motherName:'',notes:'真实输入运行核查；有限必要字面条件，不是完整从儿定格。'};
  const generated=(await service.generate(p,{...preferences,requiredChars:'安宁',generationChar:'',numerology:false,zodiacRules:false})).session;
  const saved=service.saveSession({...generated,reviewNote:'只采用有源必要条件缺项核查，不据此肯定成格。'}),ren=saved.analysis.renCommentary;
  if(!ren?.necessaryConditions||!saved.analysis.bazi.version.includes('/1.11.0;')||!isDeepStrictEqual(ren.necessaryConditions.checks.map(c=>c.status),def.statuses)||!isDeepStrictEqual(saved.sourceSnapshot?.sources.find(s=>s.id===SOURCE_ID),source))throw new Error('必要条件实际存盘不符：'+def.key);
  if(def.key==='child-source'&&!ren.sourceCaseMatches.some(c=>c.caseId==='child-xin-winter-1'))throw new Error('原书从儿运行同盘未匹配。');
  if(unknown&&(ren.input.dayStem!==undefined||ren.sourceCaseMatches.length))throw new Error('必要条件未知仍补日干或完整源例。');
  sessions[def.key]=saved;
 }
 const glyphSessions:Record<string,NamingSession>={};
 for(const [char,count]of [['厚',9],['自',6],['升',4]] as const){
  const generated=(await service.generate({...base,id:'smoke-kangxi-'+char,customerName:'康熙覆盖隔离验收-'+char,renMethod:'none'}, {...preferences,length:1,requiredChars:char,generationChar:'',numerology:true,zodiacRules:false,forbiddenChars:'',elderTaboo:''})).session;
  const candidate=generated.candidates[0],numeric=candidate?.numerology;
  if(!numeric||candidate.givenName!==char||numeric.dataVersion!=='kangxi-radical-candidates-2026.10.19-v2')throw new Error('康熙新字未真实生成：'+char);
  const choice=numeric.strokes.find(s=>s.inputChar===char&&s.role==='given');
  if(choice?.status!=='selected'||choice.options[0]?.count!==count||choice.options[0]?.sourceId!=='breezy-kangxi-radicals'||numeric.status!=='complete')throw new Error('康熙新增固定CSV字形未形成可核五格：'+char);
  glyphSessions[char]=generated;
 }
 const dbPath=join(service.store.userDir,'customers.sqlite'),before=readFileSync(dbPath),reader=await new Store(service.store.userDir,service.store.dataDir,join(service.store.dataDir,'..','node_modules/sql.js/dist/sql-wasm.wasm')).init();
 try{for(const session of [...Object.values(sessions),...Object.values(glyphSessions)])if(!isDeepStrictEqual(reader.rows<NamingSession>('sessions').find(s=>s.id===session.id),session))throw new Error('必要条件或康熙重开不一致。');}finally{reader.db.close();}
 if(!before.equals(readFileSync(dbPath)))throw new Error('必要条件只读重开改变数据库。');
 const pdfs:Record<string,string>={};for(const key of ['no-wealth','no-output']){pdfs[key]=join(out,'ren-necessary-'+key+'-report.pdf');await exportPdf(sessions[key],pdfs[key]);}
 pdfs.kangxi=join(out,'kangxi-coverage-report.pdf');await exportPdf(glyphSessions['厚'],pdfs.kangxi);
 atomicWrite(join(out,'ren-necessary-sessions.json'),JSON.stringify({necessary:sessions,glyphs:glyphSessions},null,2));
 await new Promise<void>(resolve=>{window.webContents.once('did-finish-load',resolve);window.webContents.reload();});
 const ui:Record<string,any>={};
 for(const def of defs){ui[def.key]=await window.webContents.executeJavaScript(`(async()=>{
  const wait=async(test,label)=>{for(let i=0;i<180;i++){const x=test();if(x)return x;await new Promise(r=>setTimeout(r,40));}throw new Error('Necessary UI wait:'+label);};
  const nav=async(label)=>(await wait(()=>[...document.querySelectorAll('nav .nav-item')].find(x=>x.textContent.includes(label)),label)).click();
  await nav('方案与报告');(await wait(()=>[...document.querySelectorAll('.session-item')].find(x=>x.getAttribute('title')?.includes(${JSON.stringify(sessions[def.key].id)})),'actualsession')).click();
  await wait(()=>document.querySelector('.session-item[aria-current="true"]')?.getAttribute('title')?.includes(${JSON.stringify(sessions[def.key].id)}),'selection');await nav('八字与五行');
  const panel=await wait(()=>document.querySelector('.ren-necessary'),'necessarypanel');const summary=panel.querySelector('summary');summary.click();return{text:panel.innerText,contradicted:panel.querySelectorAll('.contradicted').length,unknown:panel.querySelectorAll('.unknown').length,notExcluded:panel.querySelectorAll('.not-excluded').length,sourceExpanded:summary.parentElement.open,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,inputMethod:'Explicit DOM click;native keyboard not asserted'};
 })()`);const r=ui[def.key];if(r.horizontalOverflow||!r.sourceExpanded||!r.text.includes('仍不代表有效或成格')||r.contradicted!==def.statuses.filter(s=>s==='contradicted').length||r.unknown!==def.statuses.filter(s=>s==='unknown').length)throw new Error('必要条件界面状态不符：'+def.key);}
 return{realStoredSessions:true,readOnlyReloadUnchanged:true,sourceId:SOURCE_ID,cases:Object.fromEntries(Object.entries(sessions).map(([key,s])=>[key,{sessionId:s.id,profileId:s.profileId,analysis:s.analysis,profile:s.profile}])),glyphs:Object.fromEntries(Object.entries(glyphSessions).map(([char,s])=>[char,{sessionId:s.id,candidate:s.candidates[0]}])),ui,pdfs,sessionsFile:join(out,'ren-necessary-sessions.json'),note:'Four actual necessary-condition sessions and3newcharacter sessions;fullsource+readonlyreload verified. Presence never means formation.'};
}
