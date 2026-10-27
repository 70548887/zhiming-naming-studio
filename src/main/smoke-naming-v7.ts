import type {BrowserWindow} from 'electron';
import initSqlJs from 'sql.js';
import type {Database} from 'sql.js';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual as equal} from 'node:util';
import {preflightNamingV7Smoke,assertNamingV7SmokeContext,readNamingV7SmokeInputs,writeNamingV7SmokeFile,assertNamingV7SmokeExport,type NamingV7SmokeContext} from './smoke-naming-v7-preflight';
import {reportHTML} from './report';
import type {StudioService} from './service';
import type {BirthProfile,NamingPreferences,NamingSession,SessionRevision} from '../shared/types';
import {ALL_NAMING_RULE_SOURCE_IDS,NAMING_RULE_V5_VERSION,NAMING_RULE_V6_VERSION,NAMING_RULE_V7_VERSION,NAMING_RULE_V7_SOURCE_ID} from '../shared/naming-rules';
import table from '../../data/naming-editorial-v7.json';
import publication from '../../data/naming-editorial-meanings-v7-source-lock.json';

const LEGACY_SHA='4b59b59967c9774c8e2064aff2cab6a4e705856c907c0e69cf4e8c8b077bf3f7';
const PROVENANCE_SHA='a9a2a82698de5c6eb1a5532e3f33faa1805a9fec7460c4112e33720ebecfb805';
const hash=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
const plain=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
function requireFact(condition:unknown,message:string):asserts condition {if(!condition)throw new Error('命名7桌面验收：'+message);}
function withoutToken(session:NamingSession){const {reviewToken,...rest}=session;return rest;}
const CASES=[{key:'quoted',name:'琼莹',pdf:true},{key:'reverse',name:'莹琼',pdf:false},{key:'manual-pending',name:'碧百',pdf:true},{key:'not-recommended',name:'冠百',pdf:true}] as const;

/** Compatibility entry invokes the full read-only startup preflight, never a late existence check. */
export function assertNamingV7SmokeEnvironment(out:string){return preflightNamingV7Smoke(out);}

interface SessionRow {rowid:number;id:string;raw:string;session:NamingSession;}
interface HistoryRow {id:number;sessionId:string;createdAt:string;raw:string;}
function sessionRows(database:Database):SessionRow[]{return (database.exec('SELECT rowid,id,json FROM sessions ORDER BY rowid')[0]?.values??[]).map(([rowid,id,json])=>({rowid:Number(rowid),id:String(id),raw:String(json),session:JSON.parse(String(json)) as NamingSession}));}
function historyRows(database:Database):HistoryRow[]{return (database.exec('SELECT id,session_id,created_at,json FROM revisions ORDER BY id')[0]?.values??[]).map(([id,sessionId,createdAt,json])=>({id:Number(id),sessionId:String(sessionId),createdAt:String(createdAt),raw:String(json)}));}
function count(database:Database,tableName:'profiles'|'sessions'|'revisions'|'knowledge_archives'){return Number(database.exec('SELECT COUNT(*) FROM '+tableName)[0].values[0][0]);}

/** Capture is supplied by main.ts (1280px JPEG); independently check its actual encoded dimensions. */
export function smokeJpegDimensions(bytes:Buffer){
 requireFact(bytes.length>4&&bytes[0]===0xff&&bytes[1]===0xd8,'capture未返回JPEG。');
 let offset=2;
 while(offset+3<bytes.length){
  requireFact(bytes[offset]===0xff,'JPEG标记无效。');
  while(bytes[offset]===0xff)offset++;
  const marker=bytes[offset++];
  if(marker===0xd9||marker===0xda)break;
  if(marker===0x01||marker>=0xd0&&marker<=0xd8)continue;
  requireFact(offset+2<=bytes.length,'JPEG标记长度缺失。');const length=bytes.readUInt16BE(offset);
  requireFact(length>=2&&offset+length<=bytes.length,'JPEG标记越界。');
  if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){requireFact(length>=7,'JPEG尺寸缺失。');return {width:bytes.readUInt16BE(offset+5),height:bytes.readUInt16BE(offset+3)};}
  offset+=length;
 }
 throw new Error('命名7桌面验收：JPEG缺少实际尺寸。');
}

/** Actual main/preload Service, SQL, saved HTML and injected BrowserWindow.printToPDF acceptance. */
export async function smokeNamingV7(window:BrowserWindow,service:StudioService,out:string,base:BirthProfile,preferences:NamingPreferences,exportPdf:(session:NamingSession,file:string)=>Promise<string>,capture:()=>Promise<Buffer>,validatedContext?:NamingV7SmokeContext){
 assertNamingV7SmokeContext(validatedContext,out);
 const environment=validatedContext;assertNamingV7SmokeContext(environment,out,service.store.userDir);
 const writeArtifact=(file:string,bytes:string|Uint8Array)=>writeNamingV7SmokeFile(environment,file,bytes);
 requireFact(resolve(service.store.userDir)===environment.userData,'Store目录与专用USER_DATA不符。');
 requireFact(count(service.store.db,'profiles')===0&&count(service.store.db,'sessions')===0&&count(service.store.db,'revisions')===0,'USER_DATA必须为全新验收库，不能复用已有客户。');
 requireFact(service.store.settings().useAi===false,'当前隔离设置必须关闭外部AI。');
 const {fixtureBytes,provenanceBytes}=readNamingV7SmokeInputs(environment);
 requireFact(fixtureBytes.length===11005952&&hash(fixtureBytes)===LEGACY_SHA&&hash(provenanceBytes)===PROVENANCE_SHA,'真实134原件字节或provenance不符。');
 const provenance=JSON.parse(provenanceBytes.toString('utf8')) as {capturedFromRelease:string;sourceDatabaseSha256:string;normalCustomerData:boolean;sessions:{id:string;version:string;rawSha256:string}[]};
 requireFact(provenance.capturedFromRelease==='1.0.34'&&provenance.sourceDatabaseSha256===LEGACY_SHA&&provenance.normalCustomerData===false&&provenance.sessions.length===27,'旧库来源身份不符。');
 const SQL=await initSqlJs({locateFile:()=>join(service.store.dataDir,'../node_modules/sql.js/dist/sql-wasm.wasm')});
 const original=new SQL.Database(new Uint8Array(fixtureBytes));let oldRows:SessionRow[],oldHistories:HistoryRow[];
 try{
  oldRows=sessionRows(original);oldHistories=historyRows(original);
  requireFact(oldRows.length===27&&oldHistories.length===7&&count(original,'knowledge_archives')===4,'旧库current/history/archive数量不符。');
  requireFact(oldRows.filter(row=>row.session.namingRules?.version===NAMING_RULE_V5_VERSION).length===16&&oldRows.filter(row=>row.session.namingRules?.version===NAMING_RULE_V6_VERSION).length===11,'旧5/6版本分布不符。');
  for(const row of oldRows){const bound=provenance.sessions.find(value=>value.id===row.id);requireFact(bound?.rawSha256===hash(row.raw)&&bound.version===row.session.namingRules?.version,'旧current原始SQL绑定不符：'+row.id);requireFact(row.session.candidates.every(candidate=>!Object.hasOwn(candidate,'namingMeaningReview')),'旧库已被追加7快照。');}
 }finally{original.close();}
 const ipc=<T,>(method:string,args:unknown[]=[])=>window.webContents.executeJavaScript(`window.studio[${JSON.stringify(method)}](...${JSON.stringify(args)})`) as Promise<T>;
 const database=join(service.store.userDir,'customers.sqlite'),beforeRestorePack=hash(service.store.currentPackBytes());
 assertNamingV7SmokeContext(environment,out,service.store.userDir);service.store.restore(new Uint8Array(fixtureBytes));
 const legacyPhases:Record<string,unknown>={};
 const verifyLegacy=(phase:string)=>{
  const current=service.store.rows<NamingSession>('sessions'),currentSql=sessionRows(service.store.db),histories=historyRows(service.store.db);
  const bindings=oldRows.map(old=>{const stored=current.find(row=>row.id===old.id),sql=currentSql.find(row=>row.id===old.id);requireFact(stored&&sql&&equal(withoutToken(stored),withoutToken(old.session)),'旧current除恢复令牌外被改动：'+old.id);requireFact(stored.candidates.every(candidate=>!Object.hasOwn(candidate,'namingMeaningReview')),'旧方案被回填7快照。');return {sessionId:old.id,version:stored.namingRules?.version,dataVersion:stored.dataVersion,originalRawSha256:hash(old.raw),currentRawSha256:hash(sql.raw),originalReviewToken:old.session.reviewToken,currentReviewToken:stored.reviewToken,permittedDifference:'reviewToken only on restore'};});
  for(const old of oldHistories)requireFact(histories.find(row=>row.id===old.id)?.raw===old.raw,'原134历史JSON被改动：'+old.id);
  legacyPhases[phase]={bindings,historyRawJsonUnchanged:true};return bindings;
 };
 verifyLegacy('after-original-restore');
 const afterRestorePack=hash(service.store.currentPackBytes());let builtinSwitch:unknown={action:'already-active',sha256:afterRestorePack};
 if(afterRestorePack!==table.base.knowledgePackSha256){
  const preview=await ipc<{id:string;incoming:{sha256:string}}>('previewBuiltinDataPack');requireFact(preview.incoming.sha256===table.base.knowledgePackSha256,'本版内置包预览不是已审实际6包。');
  await ipc('applyDataPackPreview',[preview.id]);builtinSwitch={action:'actual-preload-preview-and-apply',preview};
 }
 requireFact(hash(service.store.currentPackBytes())===table.base.knowledgePackSha256&&service.store.dataset.version===table.base.activeVersion,'生成7之前未实际启用已审完整知识包。');
 requireFact(service.store.settings().useAi===false,'旧库恢复后外部AI仍须关闭。');
 const oldWinter=oldRows.find(row=>row.session.namingRules?.version===NAMING_RULE_V6_VERSION&&row.session.dataVersion===table.base.activeVersion&&row.session.candidates.some(candidate=>candidate.givenName==='冬'));
 requireFact(oldWinter,'原134缺少明确内置6冬样本。');
 const snapshots:Record<string,NamingSession>={},reviewBindings:Record<string,unknown>={},parentChecks:unknown[]=[];
 const profileFor=(key:string):BirthProfile=>{const profile:BirthProfile={...base,id:'smoke-naming7-'+key,customerName:'命名7隔离验收-'+key,surname:'林',surnamePinyin:'lín',fatherName:'林知远',motherName:'陈安宁',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'',timeUnknown:true,leapMonth:false,timeBasis:'civil',timezone:'Asia/Shanghai',renMethod:'none',monthAuthorityMethod:'no-fixed-day/1.0.0',seasonalMethod:'no-monthly/1.0.0',notes:'独立虚构家庭；真实应用保存/报告验收，不是实际客户。'};delete profile.birthLongitude;return profile;};
 const preferencesFor=(name:string):NamingPreferences=>{const pref:NamingPreferences={...preferences,length:2,generationChar:[...name][0],requiredChars:[...name][1],forbiddenChars:'',elderTaboo:'',style:'清朗自然',meanings:'平安、求知',industry:'',preferredElements:[],zodiacRules:false,numerology:false,avoidParentNames:true,imageryReading:false,yueReading:false,yueHomophones:'none'};delete pref.yueHomophoneRuleVersion;return pref;};
 const assertCurrent=(session:NamingSession,name:string)=>{
  const candidate=session.candidates[0],snapshot=candidate?.namingMeaningReview;
  requireFact(session.candidates.length===1&&candidate.givenName===name,'实际生成未得到唯一指定顺序姓名：'+name);
  requireFact(session.namingRules?.version===NAMING_RULE_V7_VERSION&&session.namingRules.sourceId===NAMING_RULE_V7_SOURCE_ID&&session.dataVersion===table.base.activeVersion&&session.factVerification?.datasetSha256===table.base.knowledgePackSha256,'当前7方法、包或事实身份不符。');
  const sources=session.sourceSnapshot?.sources.filter(source=>(ALL_NAMING_RULE_SOURCE_IDS as readonly string[]).includes(source.id));
  requireFact(sources?.length===1&&sources[0].id===NAMING_RULE_V7_SOURCE_ID&&sources[0].sha256===publication.sources[0].sha256,'生成时专用来源不是唯一固定7。');
  requireFact(snapshot?.version===NAMING_RULE_V7_VERSION&&snapshot.givenName===name&&snapshot.sourceSha256===publication.sources[0].sha256&&snapshot.packSha256===table.base.knowledgePackSha256&&snapshot.activeVersion===session.dataVersion&&snapshot.rows.map(row=>row.char).join('')===name,'保存的逐字审阅绑定不符。');
  requireFact(session.profile.fatherName==='林知远'&&session.profile.motherName==='陈安宁'&&session.preferences.avoidParentNames===true&&candidate.characters.every(entry=>!['知','远','安','宁'].includes(entry.char)),'父母姓名或避字未保存。');
  for(const entry of candidate.characters)requireFact(equal(entry,service.store.dataset.characters.find(row=>row.char===entry.char)),'候选字典原记录被改动。');
 };
 for(const item of CASES){
  const generated=await ipc<{session:NamingSession}>('generate',[profileFor(item.key),preferencesFor(item.name)]),session=generated.session;assertCurrent(session,item.name);
  const saved=await ipc<NamingSession>('saveSession',[{...session,reviewNote:'隔离审阅：保留原义、独立通用取意与整名原句边界。',candidates:session.candidates.map(candidate=>({...candidate,favorite:true,reviewNote:'仅审阅备注；不编辑生成时审阅快照。'}))}]);
  requireFact(saved.reviewRevision===1&&equal(saved.candidates[0].namingMeaningReview,session.candidates[0].namingMeaningReview),'实际审阅保存改变快照或修订号。');
  const histories=await ipc<SessionRevision[]>('listHistory',[saved.id]);requireFact(histories.length===1&&equal(histories[0].session.candidates[0].namingMeaningReview,session.candidates[0].namingMeaningReview),'实际历史未保存原快照。');
  snapshots[item.key]=plain(saved);reviewBindings[item.key]={sessionId:saved.id,generatedRevision:session.reviewRevision,savedRevision:saved.reviewRevision,firstHistoryId:histories[0].id};
 }
 const quoted=snapshots.quoted.candidates[0],reverse=snapshots.reverse.candidates[0],quotedRule=table.nameRules.find(row=>row.name==='琼莹')!;
 const quotedYing=quotedRule.readings.find(binding=>binding.char==='莹');
 requireFact(equal(quoted.citations,[quotedRule.citation])&&quoted.meaning.includes(quotedRule.meaning)&&quotedYing?.dictionaryWord==='瑩'&&quotedYing.rawEntryIndex===96948&&quotedYing.rawHeteronymIndex===0&&quotedYing.rawDefinitionIndex===1&&quotedYing.dictionarySense==='美石。','琼莹整名解释未采用同句美石义。');
 const ying=quoted.namingMeaningReview!.rows.find(row=>row.char==='莹')!,generalYing=table.meaningReviews.find(row=>row.char==='莹')!;
 requireFact(ying.applicability.status==='applicable'&&ying.automaticMeaning?.binding.rawDefinitionIndex===0&&equal(ying.automaticMeaning.binding,generalYing.binding),'莹的单字通用义与整名选义未分别保存。');
 requireFact(reverse.citations.length===0&&!table.nameRules.some(row=>row.name==='莹琼')&&reverse.meaning.includes('逐字家庭期许'),'倒序名被误授整名出处或通用说明缺失。');
 const manual=snapshots['manual-pending'].candidates[0],notRecommended=snapshots['not-recommended'].candidates[0];
 requireFact(equal(manual.namingMeaningReview!.rows.map(row=>row.applicability.status),['manual-confirmation-required','pending']),'碧百未保持人工/待审边界。');
 requireFact(notRecommended.namingMeaningReview!.rows[0].applicability.status==='not-recommended','冠的暂不推荐状态未保留。');
 for(const candidate of [manual,notRecommended])for(const row of candidate.namingMeaningReview!.rows){requireFact(!Object.hasOwn(row,'automaticMeaning'),'未自动采用的单字被附加自动说明。');if(row.review?.projectWish)requireFact(!candidate.meaning.includes(row.review.projectWish),'人工/待审/不推荐的新增项目期许被自动用于名字。');}
 for(const [key,name]of [['father','知百'],['mother','安百']]as const){
  const before=readFileSync(database),sessionsBefore=count(service.store.db,'sessions'),profilesBefore=count(service.store.db,'profiles');
  const outcome=await window.webContents.executeJavaScript(`(async()=>{try{await window.studio.generate(${JSON.stringify(profileFor('parent-'+key))},${JSON.stringify(preferencesFor(name))});return{accepted:true,error:''};}catch(error){return{accepted:false,error:String(error?.message||error)};}})()`);
  requireFact(outcome.accepted===false&&String(outcome.error).includes('父母姓名避讳')&&readFileSync(database).equals(before)&&count(service.store.db,'sessions')===sessionsBefore&&count(service.store.db,'profiles')===profilesBefore,'实际父母避字冲突未拒绝或修改了SQL。');parentChecks.push({parent:key,name,...outcome,databaseUnchanged:true});
 }
 const first=snapshots.quoted,history=(await ipc<SessionRevision[]>('listHistory',[first.id]))[0];
 const restoredHistory=await ipc<NamingSession>('restoreHistory',[first.id,history.id,first.reviewRevision,first.reviewToken]);
 requireFact(restoredHistory.reviewRevision===2&&equal(restoredHistory.candidates[0].namingMeaningReview,first.candidates[0].namingMeaningReview),'实际历史恢复改变逐字审阅。');snapshots.quoted=plain(restoredHistory);
 const allBefore=service.store.rows<NamingSession>('sessions'),historyBefore=historyRows(service.store.db),backup=service.store.backupBytes(),backupFile=join(out,'naming-v7-roundtrip.sqlite');writeArtifact(backupFile,backup);
 assertNamingV7SmokeContext(environment,out,service.store.userDir);service.store.restore(new Uint8Array(backup));
 const allAfter=service.store.rows<NamingSession>('sessions');
 for(const before of allBefore){const after=allAfter.find(row=>row.id===before.id);requireFact(after&&equal(withoutToken(after),withoutToken(before))&&after.reviewToken!==before.reviewToken,'备份往返除恢复令牌外改变方案。');}
 requireFact(equal(historyRows(service.store.db),historyBefore),'备份往返改变原始历史JSON。');verifyLegacy('after-generated-backup-roundtrip');
 for(const item of CASES){snapshots[item.key]=plain(allAfter.find(session=>session.id===snapshots[item.key].id)!);assertCurrent(snapshots[item.key],item.name);}
 requireFact(allAfter.length===31&&count(service.store.db,'revisions')===12,'最终current/history数量不符。');
 const snapshotFiles:Record<string,string>={},sql=sessionRows(service.store.db),profiles=service.store.db.exec('SELECT id,json FROM profiles')[0]?.values??[];
 const sqlBindings=CASES.map(item=>{const session=snapshots[item.key],row=sql.find(value=>value.id===session.id)!,file=join(out,'naming-v7-'+item.key+'.json');writeArtifact(file,JSON.stringify(session,null,2));snapshotFiles[item.key]=file;requireFact(equal(row.session,session),'导出快照与真实SQL不一致。');const profile=profiles.find(([id])=>id===session.profileId);requireFact(profile&&JSON.parse(String(profile[1])).fatherName===session.profile.fatherName&&JSON.parse(String(profile[1])).motherName===session.profile.motherName,'父母名未绑定真实profiles SQL。');return{key:item.key,sessionId:session.id,profileId:session.profileId,sqlRowid:row.rowid,rawJsonSha256:hash(row.raw),snapshotFile:file,snapshotSha256:hash(readFileSync(file)),profileRawJsonSha256:hash(String(profile[1])),reviewRevision:session.reviewRevision,reviewToken:session.reviewToken,candidateIds:session.candidates.map(candidate=>candidate.id),dataVersion:session.dataVersion,namingRules:session.namingRules};});
 const historiesFile=join(out,'naming-v7-histories.json'),legacyFile=join(out,'naming-v7-legacy-current.json'),settingsFile=join(out,'naming-v7-report-settings.json');
 writeArtifact(historiesFile,JSON.stringify(historyRows(service.store.db).map(row=>({...row,rawJsonSha256:hash(row.raw)})),null,2));writeArtifact(legacyFile,JSON.stringify(oldRows.map(old=>allAfter.find(row=>row.id===old.id)),null,2));writeArtifact(settingsFile,JSON.stringify(service.store.settings(),null,2));
 const finalDatabase=readFileSync(database),ui:Record<string,unknown>={},screenshots:unknown[]=[],pdfs:unknown[]=[];
 for(const item of CASES.filter(item=>item.pdf)){
  const session=snapshots[item.key],html=reportHTML(session,service.store.settings()),htmlFile=join(out,'naming-v7-'+item.key+'.html'),file=join(out,'naming-v7-'+item.key+'.pdf');
  requireFact(html.includes('单字通用取意')&&html.includes('不代表本名出处采用义'),'PDF源HTML未分隔单字与整名说明。');
  if(item.key!=='quoted')requireFact(!html.includes('<b>逐字家庭期许'),'PDF源HTML自动展示未采用的新增家庭期许。');
  writeArtifact(htmlFile,html);assertNamingV7SmokeExport(environment,file);requireFact(await exportPdf(session,file)===file,'真实注入PDF回调未绑定目标文件。');
  assertNamingV7SmokeContext(environment,out,service.store.userDir);const bytes=readFileSync(file);requireFact(bytes.length>5&&bytes.subarray(0,5).toString('ascii')==='%PDF-','真实导出未生成PDF。');
  pdfs.push({key:item.key,file,sha256:hash(bytes),bytes:bytes.length,htmlFile,htmlSha256:hash(html),sessionId:session.id,reviewRevision:session.reviewRevision,reviewToken:session.reviewToken,candidateIds:session.candidates.map(candidate=>candidate.id),snapshotFile:snapshotFiles[item.key],exportRoute:'main.ts injected exportPDF -> BrowserWindow.printToPDF'});
 }
 window.setSize(1100,800);
 await new Promise<void>(resolveReload=>{window.webContents.once('did-finish-load',()=>resolveReload());window.webContents.reload();});
 const tools=`const wait=async(test,label)=>{for(let index=0;index<300;index++){const value=test();if(value)return value;await new Promise(resolve=>setTimeout(resolve,40));}throw new Error('Naming7 UI:'+label);};const nav=async(text)=>(await wait(()=>[...document.querySelectorAll('nav .nav-item')].find(node=>node.textContent.includes(text)),text)).click();const geom=()=>({width:innerWidth,height:innerHeight,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1});`;
 const view=async(key:string,session:NamingSession,withCapture:boolean)=>{
  const expectedStates=session.candidates[0].namingMeaningReview?.rows.map(row=>({'applicable':'automatic','manual-confirmation-required':'manual','pending':'pending','not-recommended':'not-recommended','not-reviewed-by-overlay':'outside','not-applicable':'not-applicable','approved':'unrecorded'}[row.applicability.status]))??[];
  const state=await window.webContents.executeJavaScript(`(async()=>{${tools}await nav('方案与报告');(await wait(()=>[...document.querySelectorAll('.session-item')].find(node=>node.getAttribute('title')?.includes(${JSON.stringify(session.id)})),'saved row')).click();await wait(()=>document.querySelector('.session-item[aria-current="true"]')?.getAttribute('title')?.includes(${JSON.stringify(session.id)}),'selected');const report=await wait(()=>document.querySelector('.report-paper .report-names'),'report names'),status=await wait(()=>document.querySelector('.session-naming-rule-status'),'rule status');const result={sessionId:${JSON.stringify(session.id)},reportText:report.innerText,status:status.innerText,...geom()};await nav('起名工作台');const parentValue=text=>[...document.querySelectorAll('.field')].find(node=>node.querySelector('label')?.textContent.includes(text))?.querySelector('input')?.value;result.fatherName=parentValue('爸爸姓名');result.motherName=parentValue('妈妈姓名');(await wait(()=>[...document.querySelectorAll('.name-card .name-main')].find(node=>node.textContent.includes(${JSON.stringify(session.candidates[0].fullName)})),'current candidate')).click();const dialog=await wait(()=>document.querySelector('[role="dialog"]'),'candidate dialog');await wait(()=>dialog.textContent.includes(${JSON.stringify(session.candidates[0].fullName)}),'dialog name');const review=dialog.querySelector('.naming-meaning-review');result.states=review?[...review.querySelectorAll('.naming-review-character')].map(node=>node.getAttribute('data-review-state')):[];result.reviewText=review?.innerText||'';result.automaticWishCount=review?.querySelectorAll('.naming-review-wish').length||0;(review||dialog).scrollIntoView({block:'center'});return result;})()`);
  requireFact(!state.horizontalOverflow&&state.reportText.includes(session.candidates[0].fullName)&&state.reportText.includes(session.candidates[0].meaning)&&state.status.includes(session.namingRules!.version)&&equal(state.states,expectedStates),'真实报告/详情页面、已保存整名释义或逐字状态不符：'+key);
  requireFact(state.fatherName===(session.profile.fatherName||'')&&state.motherName===(session.profile.motherName||''),'重开后父母输入框未保留。');
  if(expectedStates.length){requireFact(state.reviewText.includes('单字通用取意')&&state.reviewText.includes('不代表本名出处采用义'),'界面未分隔单字参考与整名选义。');if(key==='manual-pending'||key==='not-recommended')requireFact(state.automaticWishCount===0,'界面展示了未自动采用的家庭期许。');}
  if(withCapture){await window.webContents.executeJavaScript(`(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().filter(animation=>animation.effect?.getTiming().iterations!==Infinity).map(animation=>animation.finished.catch(()=>undefined)));await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return true;})()`);const image=await capture(),dimensions=smokeJpegDimensions(image);requireFact(image.length<=500000&&dimensions.width>0&&dimensions.height>0&&dimensions.width<=1280&&dimensions.height<=1280,'截图超出1280px/500KB。');const file=join(out,'naming-v7-ui-'+key+'.jpg');writeArtifact(file,image);screenshots.push({key,file,sha256:hash(image),bytes:image.length,...dimensions});}
  ui[key]=state;
  await window.webContents.executeJavaScript(`(async()=>{${tools}(await wait(()=>document.querySelector('[role="dialog"] button[aria-label="关闭"]'),'close candidate')).click();await wait(()=>!document.querySelector('[role="dialog"]'),'closed');return true;})()`);
 };
 for(const item of CASES.filter(item=>item.pdf))await view(item.key,snapshots[item.key],true);
 await view('legacy-v6-winter',allAfter.find(row=>row.id===oldWinter.id)!,false);
 requireFact(readFileSync(database).equals(finalDatabase)&&equal(service.store.rows<NamingSession>('sessions'),allAfter)&&hash(service.store.currentPackBytes())===table.base.knowledgePackSha256,'只读UI/PDF改变了客户库、方案或实际活动包。');
 requireFact(hash(readFileSync(environment.legacySql))===LEGACY_SHA&&hash(readFileSync(environment.legacyProvenance))===PROVENANCE_SHA,'原134只读输入被改变。');
 return {schema:'naming-v7-smoke/1.0.0',database,databaseSha256:hash(finalDatabase),sqlBindings,snapshotFiles,historiesFile,legacyFile,settingsFile,legacy:{fixtureFile:environment.legacySql,fixtureSha256:LEGACY_SHA,provenanceFile:environment.legacyProvenance,provenanceSha256:PROVENANCE_SHA,originRelease:'1.0.34',currentCount:27,v5Count:16,v6Count:11,historyCount:7,phases:legacyPhases,readOnlyOriginalsUnchanged:true},activePack:{beforeRestoreSha256:beforeRestorePack,afterRestoreSha256:afterRestorePack,builtinSwitch,finalSha256:hash(service.store.currentPackBytes()),activeVersion:service.store.dataset.version},source7:{version:NAMING_RULE_V7_VERSION,sourceId:NAMING_RULE_V7_SOURCE_ID,sha256:publication.sources[0].sha256},parentChecks,reviewBindings,backup:{file:backupFile,sha256:hash(backup),currentOnlyRefreshesReviewToken:true,historyRawJsonUnchanged:true},pdfs,screenshots,ui,counts:{sessions:allAfter.length,histories:count(service.store.db,'revisions'),archives:count(service.store.db,'knowledge_archives')},limits:['Only the supplied actual installed134 fixture is treated as historical release data; no old release is regenerated.','Current backup restore refreshes reviewToken for ABA protection; all other snapshot fields and historical raw JSON remain unchanged.','Three PDFs use the real main.ts injected exporter; no historical PDF or native file-chooser acceptance is claimed.','DOM/preload interactions are not native keyboard/close or second-machine acceptance.','No normal customer data, normal5173/native window, external AI, full application build or installation is operated by this module preparation task.']};
}
