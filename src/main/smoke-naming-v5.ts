import type {BrowserWindow} from 'electron';
import initSqlJs from 'sql.js';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import type {BirthProfile,NamingPreferences,NamingSession} from '../shared/types';
import table from '../../data/naming-editorial-v5.json';
import {NAMING_RULE_V5_VERSION,NAMING_RULE_V5_SOURCE_ID,NAMING_RULE_V4_SOURCE_ID} from '../shared/naming-rules';
import {atomicWrite} from './store';
import type {StudioService} from './service';

const plain=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
const hash=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');

/** Real generation/import/review/report operations; all customers and packages belong to this isolated smoke. */
export async function smokeNamingV5(window:BrowserWindow,service:StudioService,out:string,base:BirthProfile,preferences:NamingPreferences,exportPdf:(session:NamingSession,file:string)=>Promise<string>,capture:()=>Promise<Buffer>){
 if(process.env.NAMING_STUDIO_SMOKE_SCOPE!=='naming-v5'||!process.env.NAMING_STUDIO_USER_DATA)throw new Error('命名5.0验收须使用独立专用范围。');
 const builtin=service.store.currentPackBytes(),snapshots:Record<string,NamingSession>={},files:Record<string,string>={},ui:Record<string,any>={};
 if(hash(builtin)!==table.newDataset.sqliteSha256)throw new Error('新建隔离实例未选择已声明的新默认知识包。');
 const rule=(name:string)=>{const found=table.nameRules.find(row=>row.name===name);if(!found)throw new Error('缺少已审核名字：'+name);return found;};
 const generate=async(key:string,name:string,customerName:string)=>{
  const profile:BirthProfile={...base,id:'smoke-naming5-'+key,customerName,surname:'张',surnamePinyin:'zhāng',fatherName:'张知远',motherName:'陈安宁',birthTime:'',timeUnknown:true,renMethod:'none',monthAuthorityMethod:'no-fixed-day/1.0.0',seasonalMethod:'no-monthly/1.0.0'};
  const pref:NamingPreferences={...preferences,length:2,generationChar:[...name][0],requiredChars:[...name].slice(1).join(''),forbiddenChars:'',elderTaboo:'',meanings:'美好品格、平安',industry:'',style:'典雅有出处',preferredElements:[],zodiacRules:false,numerology:false,avoidParentNames:true,yueReading:false,imageryReading:false,yueHomophones:'none'};delete pref.yueHomophoneRuleVersion;
  const session:NamingSession=(await window.webContents.executeJavaScript(`window.studio.generate(${JSON.stringify(profile)},${JSON.stringify(pref)})`)).session;
  if(session.candidates.length!==1||session.candidates[0].givenName!==name||session.namingRules?.version!==NAMING_RULE_V5_VERSION||session.namingRules.sourceId!==NAMING_RULE_V5_SOURCE_ID||session.namingRules.dataVersion!==session.dataVersion||!session.sourceSnapshot?.sources.some(source=>source.id===NAMING_RULE_V5_SOURCE_ID)||session.sourceSnapshot.sources.some(source=>source.id===NAMING_RULE_V4_SOURCE_ID))throw new Error('实际生成名单、单一规则版本或输入包标记不符：'+key);
  snapshots[key]=plain(session);return session;
 };
 const review=async(key:string,session:NamingSession)=>{
  const saved:NamingSession=await window.webContents.executeJavaScript(`window.studio.saveSession(${JSON.stringify({...session,candidates:session.candidates.map(row=>({...row,favorite:true})),reviewNote:'隔离验收：核对已审原文、当前字典词条和家庭期许；不作命运保证。'})})`);
  snapshots[key]=plain(saved);return saved;
 };
 const positive=async(key:string,name:string,label:string)=>{
  const session=await generate(key,name,label),candidate=session.candidates[0],expected=rule(name);
  if(!candidate.meaning.includes(expected.meaning)||!candidate.citations.some(citation=>isDeepStrictEqual(citation,expected.citation)))throw new Error('实际新名未取得其完整已审原文与释义：'+name);
  return review(key,session);
 };
 const yang=await positive('yang-shan','扬善','5.0新出处隔离验收');
 const zhi=await positive('sui-zhi','遂志','志词条纠正隔离验收');
 const house=await positive('jia-yi','家宜','家词条纠正隔离验收');
 const zhiEntry=zhi.candidates[0].characters.find(row=>row.char==='志')!,houseEntry=house.candidates[0].characters.find(row=>row.char==='家')!;
 if(zhiEntry.traditional!=='志'||!zhiEntry.meaning.includes('意向、抱負、決心。')||!zhiEntry.readings?.every(row=>row.word==='志')||houseEntry.traditional!=='家'||!houseEntry.meaning.includes('眷屬共同生活的場所。')||!houseEntry.readings?.some(row=>row.word==='家'&&row.pinyin==='gū'&&row.meanings.includes('對女子的尊稱。')))throw new Error('两个实际新词条、正体或家gū原异读未完整保留。');
 const SQL=await initSqlJs({locateFile:()=>join(service.store.dataDir,'../node_modules/sql.js/dist/sql-wasm.wasm')}),db=new SQL.Database(new Uint8Array(builtin));let changed:Uint8Array;
 try{const citation={...rule('扬善').citation,text:rule('扬善').citation.text+'（隔离改文）'};db.run('UPDATE citations SET json=? WHERE id=?',[JSON.stringify(citation),citation.id]);changed=db.export();}finally{db.close();}
 const citationPreview=service.prepareDataPack(changed);service.applyDataPackPreview(citationPreview.id);
 const altered=await generate('changed-citation','扬善','完整引文身份负例隔离验收');
 if(altered.candidates[0].citations.length||altered.candidates[0].meaning.includes(rule('扬善').meaning))throw new Error('修改完整引文后仍取得新增出处故事。');
 const oldPack=new Uint8Array(readFileSync(join(service.store.dataDir,'knowledge.sqlite'))),oldPreview=service.prepareDataPack(oldPack);service.applyDataPackPreview(oldPreview.id);
 for(const [key,name,char,oldWord]of [['old-zhi','遂志','志','誌'],['old-house','家宜','家','傢']]){
  const session=await generate(key,name,'旧字库新规则隔离验收-'+char),candidate=session.candidates[0],entry=candidate.characters.find(row=>row.char===char)!;
  if(session.dataVersion!==hash(oldPack).slice(0,12)||candidate.citations.length||candidate.meaning.includes(rule(name).meaning)||!entry.readings?.some(row=>row.word===oldWord))throw new Error('旧活动包被新规则补造成纠正字义或出处：'+char);
 }
 const restorePreview=service.prepareDataPack(builtin);service.applyDataPackPreview(restorePreview.id);
 if(hash(service.store.currentPackBytes())!==hash(builtin))throw new Error('隔离验收末尾未恢复本版默认知识包。');
 const database=join(service.store.userDir,'customers.sqlite'),bytes=readFileSync(database),histories=plain(Object.fromEntries(Object.entries(snapshots).map(([key,session])=>[key,service.listHistory(session.id)])));
 await new Promise<void>(resolve=>{window.webContents.once('did-finish-load',()=>resolve());window.webContents.reload();});
 const selectReport=async(key:string,session:NamingSession)=>{
  const state=await window.webContents.executeJavaScript(`(async()=>{
   const wait=async(test,label)=>{for(let index=0;index<180;index++){const value=test();if(value)return value;await new Promise(resolve=>setTimeout(resolve,40));}throw new Error('Naming5 UI: '+label);};
   (await wait(()=>[...document.querySelectorAll('nav .nav-item')].find(node=>node.textContent.includes('方案与报告')),'report nav')).click();
   (await wait(()=>[...document.querySelectorAll('.session-item')].find(node=>node.getAttribute('title')?.includes(${JSON.stringify(session.id)})),'stored session')).click();
   await wait(()=>document.querySelector('.session-item[aria-current="true"]')?.getAttribute('title')?.includes(${JSON.stringify(session.id)}),'selected snapshot');
   const names=await wait(()=>document.querySelector('.report-paper .report-names'),'names'),status=await wait(()=>document.querySelector('.session-naming-rule-status'),'rule boundary');
   names.scrollIntoView({block:'center'});return {names:names.innerText,status:status.innerText,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};
  })()`);
  if(state.horizontalOverflow||!state.names.includes(session.candidates[0].fullName)||!state.names.includes(session.candidates[0].pinyin)||!state.status.includes(NAMING_RULE_V5_VERSION)||!state.status.includes('字典词条'))throw new Error('实际5.0报告名单或规则说明不符：'+key);
  ui[key]=state;
 };
 await selectReport('yang-shan',yang);await selectReport('jia-yi',house);
 const image=await capture(),previewFile=join(out,'naming-v5-preview.jpg');if(image.length>500000)throw new Error('命名5.0预览超过500KB。');atomicWrite(previewFile,image);
 for(const[key,session]of Object.entries(snapshots)){const stored=service.store.rows<NamingSession>('sessions').find(row=>row.id===session.id);if(!isDeepStrictEqual(stored,session))throw new Error('实际5.0存盘不等于返回快照：'+key);const file=join(out,'naming-v5-'+key+'.json');atomicWrite(file,JSON.stringify(stored,null,2));files[key]=file;}
 const historiesFile=join(out,'naming-v5-histories.json');atomicWrite(historiesFile,JSON.stringify(histories,null,2));
 const pdfs=[];for(const[key,session]of [['yang-shan',yang],['jia-yi',house]]as const){const file=join(out,'naming-v5-'+key+'.pdf');await exportPdf(session,file);pdfs.push({key,file,sessionId:session.id,reviewRevision:session.reviewRevision,reviewToken:session.reviewToken,candidateIds:session.candidates.map(row=>row.id)});}
 if(!bytes.equals(readFileSync(database))||!isDeepStrictEqual(histories,plain(Object.fromEntries(Object.entries(snapshots).map(([key,session])=>[key,service.listHistory(session.id)])))))throw new Error('5.0浏览和导出改写了方案或历史。');
 return {schema:'naming-v5-smoke/1.0.0',database,databaseSha256:hash(bytes),files,historiesFile,previewFile,pdfs,ui,activePackSha256:hash(service.store.currentPackBytes()),cases:Object.fromEntries(Object.entries(snapshots).map(([key,session])=>[key,{id:session.id,dataVersion:session.dataVersion,namingRules:session.namingRules,candidateIds:session.candidates.map(row=>row.id)}])),invariants:{realIpcGeneration:true,realAcceptedKnowledgePacks:true,newNamesSourceBound:true,twoCorrectedDictionaryWords:true,houseGuRetained:true,modifiedCitationHasNoNewSourceCredit:true,oldPackNotUpgraded:true,finalActivePackRestored:true,readOnlyReports:true},limits:['Synthetic isolated customers only; normal customer data is never opened.','Native chooser, external AI, publisher signing and cross-machine acceptance are not covered here.']};
}
