import type {BrowserWindow} from 'electron';
import initSqlJs from 'sql.js';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import type {BirthProfile,NamingPreferences,NamingSession} from '../shared/types';
import {atomicWrite} from './store';
import type {StudioService} from './service';

const plain=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
const hash=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');

/** Generates both readings from real, accepted knowledge packages in an isolated desktop instance. */
export async function smokeNamingRules(window:BrowserWindow,service:StudioService,out:string,base:BirthProfile,preferences:NamingPreferences,exportPdf:(session:NamingSession,file:string)=>Promise<string>,capture:()=>Promise<Buffer>){
 if(process.env.NAMING_STUDIO_SMOKE_SCOPE!=='naming-readings'||!process.env.NAMING_STUDIO_USER_DATA)throw new Error('读音释义验收须使用独立专用范围。');
 const profile:BirthProfile={...base,id:'smoke-naming-default',customerName:'读音释义隔离验收',fatherName:'林知远',motherName:'陈安宁',birthTime:'',timeUnknown:true,monthAuthorityMethod:'no-fixed-day/1.0.0',seasonalMethod:'no-monthly/1.0.0',renMethod:'none'};
 const pref:NamingPreferences={...preferences,requiredChars:'安',length:2,generationChar:'乐',forbiddenChars:'',elderTaboo:'',style:'清朗自然',meanings:'平安、快乐',industry:'',preferredElements:[],zodiacRules:false,numerology:false,avoidParentNames:false,yueReading:false,imageryReading:false,yueHomophones:'none'};
 delete pref.yueHomophoneRuleVersion;
 const invoke=(p:BirthProfile)=>window.webContents.executeJavaScript(`window.studio.generate(${JSON.stringify(p)},${JSON.stringify(pref)})`);
 const before:NamingSession=(await invoke(profile)).session;
 const original=service.store.dataset.characters.find(row=>row.char==='乐');
 const reading=original?.readings?.find(row=>row.pinyin==='yuè');
 if(!original||!reading)throw new Error('实际已发布字库缺少乐yuè来源读音。');
 const selectedBefore=before.candidates.find(row=>row.givenName==='乐安');
 if(!selectedBefore?.meaning.includes('愿孩子常怀喜悦')||!selectedBefore.pinyin.includes('lè')||!before.namingRules)throw new Error('默认读音组合寓意或新版本快照未生效。');
 const SQL=await initSqlJs({locateFile:()=>join(service.store.dataDir,'../node_modules/sql.js/dist/sql-wasm.wasm')});
 const db=new SQL.Database(new Uint8Array(readFileSync(join(service.store.dataDir,'knowledge.sqlite'))));let alternative:Uint8Array;
 const changed={...plain(original),pinyin:reading.pinyin,tone:reading.tone,sourceId:reading.sourceId,meaning:reading.meanings[0]};
 try{db.run('UPDATE characters SET json=? WHERE id=?',[JSON.stringify(changed),'乐']);alternative=db.export();}finally{db.close();}
 const preview=service.prepareDataPack(alternative),installed=service.applyDataPackPreview(preview.id);
 const after:NamingSession=(await invoke({...profile,id:'smoke-naming-yue',customerName:'音乐读音释义隔离验收'})).session;
 const selectedAfter=after.candidates.find(row=>row.givenName==='乐安');
 if(!selectedAfter||!selectedAfter.pinyin.includes('yuè')||selectedAfter.meaning.includes('愿孩子常怀喜悦')||selectedAfter.meaning.includes('乐：快乐')||!selectedAfter.warnings.some(value=>value.includes('命名适用义')&&/尚未|待/u.test(value))||!isDeepStrictEqual(selectedAfter.characters.find(row=>row.char==='乐'),changed)||!after.namingRules||after.namingRules.dataVersion!==after.dataVersion||before.dataVersion===after.dataVersion)throw new Error('音乐读音仍借默认喜悦之义、遗失原字典事实或未记录新规则与所选包。');
 const saved:NamingSession=await window.webContents.executeJavaScript(`window.studio.saveSession(${JSON.stringify({...after,candidates:after.candidates.map(row=>({...row,favorite:row.id===selectedAfter.id})),reviewNote:'音乐读音只保留对应字典义；命名适用义待审，未采用快乐寓意。'})})`);
 const database=join(service.store.userDir,'customers.sqlite'),bytes=readFileSync(database),histories=plain(service.listHistory(saved.id));
 await new Promise<void>(resolve=>{window.webContents.once('did-finish-load',()=>resolve());window.webContents.reload();});
 const ui=await window.webContents.executeJavaScript(`(async()=>{
  const wait=async(test,label)=>{for(let index=0;index<180;index++){const value=test();if(value)return value;await new Promise(resolve=>setTimeout(resolve,40));}throw new Error('Naming reading UI: '+label);};
  (await wait(()=>[...document.querySelectorAll('nav .nav-item')].find(node=>node.textContent.includes('方案与报告')),'report nav')).click();
  (await wait(()=>[...document.querySelectorAll('.session-item')].find(node=>node.getAttribute('title')?.includes(${JSON.stringify(saved.id)})),'saved session')).click();
  await wait(()=>document.querySelector('.session-item[aria-current="true"]')?.getAttribute('title')?.includes(${JSON.stringify(saved.id)}),'selected');
  const names=await wait(()=>document.querySelector('.report-paper .report-names'),'names'),status=await wait(()=>document.querySelector('.session-naming-rule-status'),'rule notice');
  names.scrollIntoView({block:'center'});await new Promise(resolve=>setTimeout(resolve,120));
  return {names:names.innerText,status:status.innerText,sessionTitle:document.querySelector('.session-item[aria-current="true"]')?.getAttribute('title'),horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};
 })()`);
 if(ui.horizontalOverflow||!ui.names.includes(selectedAfter.fullName)||!ui.names.includes('yuè')||ui.names.includes('愿孩子常怀喜悦')||!ui.status.includes('命名释义已绑定适用读音'))throw new Error('实际报告界面读音、释义或新规则说明不符。');
 const previewFile=join(out,'naming-reading-preview.jpg'),image=await capture();if(image.length>500000)throw new Error('读音预览超过500KB。');atomicWrite(previewFile,image);
 const files:Record<string,string>={};for(const [key,session]of Object.entries({default:before,alternative:saved})){const file=join(out,'naming-'+key+'-session.json');atomicWrite(file,JSON.stringify(session,null,2));files[key]=file;}
 const historyFile=join(out,'naming-reading-histories.json');atomicWrite(historyFile,JSON.stringify(histories,null,2));
 const pdfFile=join(out,'naming-reading-report.pdf');await exportPdf(saved,pdfFile);
 if(!bytes.equals(readFileSync(database))||!isDeepStrictEqual(service.store.rows<NamingSession>('sessions').find(row=>row.id===saved.id),plain(saved))||!isDeepStrictEqual(service.listHistory(saved.id),histories))throw new Error('报告浏览或导出改写保存方案与历史。');
 return {schema:'naming-reading-smoke/1.0.0',database,databaseSha256:hash(bytes),actualImportedPackSha256:hash(alternative),installed,preview:{id:preview.id},files,historyFile,previewFile,pdfFile,ui,cases:{default:{id:before.id,dataVersion:before.dataVersion,namingRules:before.namingRules},alternative:{id:saved.id,dataVersion:saved.dataVersion,namingRules:saved.namingRules}},invariants:{actualAcceptedPack:true,originalDictionaryFactPreserved:true,defaultMeaningPreserved:true,alternativeDoesNotBorrowDefaultMeaning:true,ruleVersionAndPackRecorded:true,readOnlyReportAndHistory:true},limits:['Real Electron preload IPC and DOM controls in isolated customer/knowledge files.','Native chooser/keyboard/close, external AI, signing and cross-machine acceptance not performed by this smoke.']};
}
