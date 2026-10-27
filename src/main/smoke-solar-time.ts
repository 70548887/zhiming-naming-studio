import type {BrowserWindow}from'electron';import{writeFileSync}from'node:fs';import{join}from'node:path';
import type{BirthProfile,NamingPreferences,NamingSession}from'../shared/types';import type{StudioService}from'./service';
/** Real isolated service generation and renderer selection; no fabricated unknown-time chart. */
export async function smokeSolarTime(window:BrowserWindow,service:StudioService,out:string,base:BirthProfile,preferences:NamingPreferences,exportPdf:(session:NamingSession,file:string)=>Promise<string>,capture:()=>Promise<Buffer>){
 const profile:BirthProfile={...base,id:'smoke-solar',customerName:'真太阳时隔离验收',birthDate:'2024-02-10',birthTime:'00:30:00',timeUnknown:false,timeBasis:'apparent-solar',birthLongitude:87.6168,fatherName:'',motherName:'',notes:'隔离自动验收：原民用生日保留，校正后跨日前一日，不是实际客户。'};
 const known=(await service.generate(profile,{...preferences,requiredChars:'知微',numerology:false})).session,trace=known.analysis.bazi.timeBasis;
 if(trace?.basis!=='apparent-solar'||trace.dayStatus!=='determined'||!trace.calculationDateTime?.startsWith('2024-02-09')||!known.analysis.bazi.solarDate.startsWith('2024-02-10')||known.analysis.bazi.zodiac!=='龙'||known.analysis.qimen.version!=='zhuanpan-chaibu-futou-kun2/1.4.0'||!known.sourceSnapshot?.sources.some(source=>source.id==='solar-time-noaa-julian-century'))throw new Error('真太阳时跨日、原记录或来源范围验收失败。');
 const knownPath=join(out,'solar-known-report.pdf');await exportPdf(known,knownPath);
 const unknown=(await service.generate({...profile,id:'smoke-solar-unknown',customerName:'真太阳时未知区间验收',birthTime:'',timeUnknown:true},{...preferences,requiredChars:'安宁',numerology:false})).session;
 if(unknown.analysis.bazi.timeBasis?.dayStatus!=='uncertain'||unknown.analysis.bazi.pillars.some(p=>p.label==='日柱'||p.label==='时柱')||unknown.analysis.bazi.favorable.length||unknown.analysis.bazi.evidence!==undefined||unknown.analysis.qimen.available)throw new Error('未知真太阳日界仍伪造日主、喜用或唯一奇门盘。');
 const unknownPath=join(out,'solar-unknown-report.pdf');await exportPdf(unknown,unknownPath);
 await new Promise<void>(resolve=>{window.webContents.once('did-finish-load',()=>resolve());window.webContents.reload();});
 const ui=await window.webContents.executeJavaScript(`(async()=>{
  const wait=async(test,label)=>{for(let i=0;i<150;i++){const value=test();if(value)return value;await new Promise(r=>setTimeout(r,40));}throw new Error('Solar UI wait: '+label);};
  const nav=async(text)=>{(await wait(()=>[...document.querySelectorAll('nav .nav-item')].find(e=>e.textContent.includes(text)),text)).click();};
  await nav('方案与报告');(await wait(()=>[...document.querySelectorAll('.session-item')].find(e=>e.textContent.includes('真太阳时未知区间验收')),'unknown saved session')).click();
  await wait(()=>document.querySelector('.session-item[aria-current="true"]')?.textContent.includes('真太阳时未知区间验收'),'selected unknown');await nav('八字与五行');
  await wait(()=>document.body.innerText.includes('日主待定'),'pending day explanation');
  return {text:document.body.innerText,solarPanel:document.querySelector('.birth-time-basis')?.innerText||'',horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};
 })()`);
 if(!ui.text.includes('2024-02-09')||!ui.text.includes('2024-02-10')||!ui.text.includes('暂停')||ui.horizontalOverflow)throw new Error('真太阳时未知区间界面未保留原记录或暂停原因。');
 const image=await capture();if(image.length>500000)throw new Error('真太阳时预览大于500KB');writeFileSync(join(out,'solar-unknown-preview.jpg'),image);
 writeFileSync(join(out,'solar-sessions.json'),JSON.stringify({known,unknown},null,2));
 return {known:known.analysis,unknown:unknown.analysis,ui,sourceId:'solar-time-noaa-julian-century',knownPdf:knownPath,unknownPdf:unknownPath,realStoredSessions:true};
}
