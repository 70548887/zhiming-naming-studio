import {withNamingV7Deadline,reloadNamingV7Page} from './smoke-naming-v7-waits';
import {canonicalPlainJson} from '../shared/plain-json';
import type {BrowserWindow} from 'electron';
import {readFileSync} from 'node:fs';import {join,dirname} from 'node:path';import {createHash} from 'node:crypto';import {isDeepStrictEqual as equal} from 'node:util';
import type {BirthProfile,NamingPreferences,NamingSession,SessionRevision,StudioAPI,YueReadingSelections} from '../shared/types';
import type {MeaningContextOptions} from '../shared/meaning-context-review';import type {ElementAssessmentChoiceInput} from '../shared/element-assessment';
import type {StudioService} from './service';import {reportHTML} from './report';import {modernRecordView} from '../shared/modern-practical-evidence';
import {assertNamingV7SmokeContext,writeNamingV7SmokeArtifact,namingV7SmokeArtifactPath,assertNamingV7SmokeExport,type NamingV7SmokeContext} from './smoke-naming-v7-preflight';
import {smokeJpegDimensions} from './smoke-naming-v7';
import resourceContract from '../../scripts/verification/review-resources-137.json';

export const DESKTOP145_MARKER='145' as const;
export const DESKTOP145_CASES=Object.freeze([
 {key:'meaning',name:'斐然',timeUnknown:false,meaning:'available',word:'no-covered-word',element:'honest-opinion'},
 {key:'word-unknown',name:'安然',timeUnknown:true,meaning:'not-covered',word:'source-word-reference',element:'honest-opinion'},
 {key:'element',name:'枫清',timeUnknown:false,meaning:'not-covered',word:'no-covered-word',element:'confirm-if-covered'},
] as const);
const BACKUP='desktop-workflow-145-backup.sqlite';
const hash=(bytes:string|Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const plain=<T,>(v:T):T=>JSON.parse(JSON.stringify(v));
function fact(value:unknown,message:string):asserts value{if(!value)throw new Error('桌面145验收：'+message);}
const withoutToken=(session:NamingSession)=>{const {reviewToken,...other}=session;return other;};
const protectedFacts=(session:NamingSession)=>session.candidates.map(c=>({id:c.id,givenName:c.givenName,fullName:c.fullName,pinyin:c.pinyin,characters:c.characters,citations:c.citations,evaluation:c.evaluation,namingMeaningReview:c.namingMeaningReview}));

/** Compare the actual restore return with the selected, independently saved
 * historical target. Mutable CAS fields belong to the current saved session. */
export function assertDesktop145RecordedHistoryRestored(restored:NamingSession,beforeRestore:NamingSession,revision:SessionRevision){
 const target=revision.session;
 fact(revision.sessionId===beforeRestore.id&&target.id===beforeRestore.id&&target.profileId===beforeRestore.profileId,'选定历史不属于当前方案。');
 fact(target.candidates.length===1&&!!target.candidates[0].modernPracticalEvidence,'选定历史缺少待恢复的完整现代记录。');
 fact(restored.id===beforeRestore.id&&restored.profileId===beforeRestore.profileId,'恢复返回了其他方案。');
 fact(canonicalPlainJson(restored.candidates)===canonicalPlainJson(target.candidates),'恢复未取回选定历史的完整候选／现代／词义／来源快照。');
 const targetMeaning=target.candidates[0].meaningContextReview;
 fact(equal(targetMeaning,beforeRestore.candidates[0].meaningContextReview),'选定历史的词义与清除前既有选择不同。');
 if(targetMeaning)fact(targetMeaning.version==='meaning-context-review/1.0.0'&&equal(targetMeaning.source,{sourceId:'project-meaning-context-next-138-v1-1',sourceSha256:'448a4a3132e0689ba5c0ffc114f439fbf0c6550e7c72a8d563080100be9aa6d2',dataSha256:'424e8b6ca9a920c8b707ac267db9609bee900a5389b3659256b4c71ad71b378d',sourceLockSha256:'473b1fb377bfeeb07c3cea800450e2ec88532b1678c9c590dcad650d8e3dd964',dataManifestSha256:'c5ac43e96b59beafaf54bce6a504ef9d97c0b59afd0687eaa7daa64ad9378ac9'}),'选定历史的当前词义来源身份不同。');
 for(const key of ['profile','analysis','originalFavorable','dataVersion','createdAt','sourceSnapshot'] as const)fact(equal(restored[key],beforeRestore[key]),'恢复改变了当前不可回退字段：'+key);
 fact(restored.reviewRevision===(beforeRestore.reviewRevision??0)+1&&typeof restored.reviewToken==='string'&&restored.reviewToken.length>0&&restored.reviewToken!==beforeRestore.reviewToken,'恢复没有执行当前版本的单次CAS／新令牌。');
 return{verified:true as const,revisionId:revision.id,sessionId:revision.sessionId,hashConvention:'sha256(canonicalPlainJson(value)); sorted JSON object keys' as const,targetSnapshotSha256:hash(canonicalPlainJson(target)),targetCandidatesSha256:hash(canonicalPlainJson(target.candidates)),targetModernSha256:hash(canonicalPlainJson(target.candidates[0].modernPracticalEvidence)),targetMeaningSha256:hash(canonicalPlainJson(targetMeaning??null)),restoredCandidatesSha256:hash(canonicalPlainJson(restored.candidates)),beforeReviewRevision:beforeRestore.reviewRevision??0,beforeReviewToken:beforeRestore.reviewToken,restoredReviewRevision:restored.reviewRevision,restoredReviewToken:restored.reviewToken};
}

/** The source-owned contract is compiled into the main bundle; every actual
 * application resource is read from app.getAppPath's data root at native run. */
export function verifyDesktop145Resources(appRoot:string){
 fact(resourceContract.schema==='current-review-runtime-resources/1'&&resourceContract.applicationVersion==='1.0.37'&&resourceContract.sourceReaders.find(row=>row.file==='src/main/store.ts')?.sha256==='9740bff328c7d6af1d06ee10b0bb39329ccf9333385d505416b5cfa37e5bebf6'&&hash(JSON.stringify(resourceContract))==='81c3a519446f9a7174f69dba3edc9e912864c28b9892ff313e464793e66fbe22','当前版资源合同对象与固定74件身份不同。');
 const files=Object.entries(resourceContract.files);fact(files.length===74,'当前资源集合不是固定74件。');
 const receipts=files.map(([file,pin])=>{fact(file.startsWith('data/')&&!file.includes('\\')&&!file.split('/').some(part=>part===''||part==='.'||part==='..'),'资源合同路径不合法。');const bytes=readFileSync(join(appRoot,file)),sha256=hash(bytes);fact(bytes.length===pin.bytes&&sha256===pin.sha256,'实际应用资源字节不符：'+file);return{file,sha256,bytes:bytes.length,modules:pin.modules};});
 return{contractSourceSha256:'60e0367eba9b531d0dce93a9015049f6ff62046892a6d08055c1fd1863e435d7',compiledContractObjectSha256:hash(JSON.stringify(resourceContract)),applicationVersion:'1.0.37',files:receipts,meaningBatch:'v1-and-current-v1.1',currentMeaningDataVersion:'meaning-context-data/1.1.0',sourceReaders:resourceContract.sourceReaders,excludedNextBatch:resourceContract.excludedNextBatch,fsRoot:appRoot};
}

/** Test-only input construction; never fabricates a result, selected source or explanation. */
export function desktop145Inputs(key:typeof DESKTOP145_CASES[number]['key'],characters:readonly {char:string}[]):{profile:BirthProfile;preferences:NamingPreferences}{
 const item=DESKTOP145_CASES.find(row=>row.key===key)!;fact(item,'场景编号无效。');
 const profile:BirthProfile={id:'desktop145-'+key,customerName:'桌面145虚构家庭-'+key,surname:'林',surnamePinyin:'lín',fatherName:'林文舟',motherName:'陈若兰',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:item.timeUnknown?'':'09:30',timeUnknown:item.timeUnknown,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',timeBasis:'civil',renMethod:'none',monthAuthorityMethod:'no-fixed-day/1.0.0',seasonalMethod:'no-monthly/1.0.0',notes:'独立虚构验收资料，不是实际客户；不外联或调用AI。'};
 const preferences:NamingPreferences={length:2,generationChar:[...item.name][0],requiredChars:[...item.name][1],forbiddenChars:characters.filter(row=>!item.name.includes(row.char)).map(row=>row.char).join(''),elderTaboo:'',style:'自然',meanings:'',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false,avoidParentNames:true,imageryReading:false,yueReading:true,yueHomophones:'none',namePhonetics:{cmn:{version:'cmn-homophone-review/1.0.0',mode:'strict'},yue:{version:'yue-homophone-review/1.2.0',mode:'strict'}},wordPronunciationReference:true,elementAssessment:true};
 fact([...preferences.forbiddenChars].length<=1000,'指定字表超过实际API约束。');return{profile,preferences};
}

export function desktop145YueChoice(session:NamingSession):YueReadingSelections|null{
 const saved=session.candidates[0].yueReading;fact(saved,'缺少实际保存的粤语候选。');
 const select=(unit:typeof saved.surname)=>{const option=unit.candidates[0];return option?{tokens:[...option.tokens],origin:'dictionary' as const,confirmed:true as const,dictionaryId:option.id}:null;};
 const surname=select(saved.surname),given=saved.given.map(select);return surname&&given.every(Boolean)?{surname,given}:null;
}
export function desktop145ElementChoices(session:NamingSession,allowConfirm:boolean):ElementAssessmentChoiceInput[]{
 const rows=session.candidates[0].elementAssessment?.rows;fact(rows?.length===2,'缺少两个真实元素意见行。');
 return rows.map(row=>{const candidate=allowConfirm?row.assessment?.matchingSourceCandidates[0]:undefined;return{position:row.position,decision:candidate?'confirmed' as const:'not-applicable' as const,confirmedEvidenceIds:candidate?[candidate.evidenceId]:[]};});
}

/** Existing preload methods retain their contracts; only the isolated marker
 * routes native file operations to bounded, checked OUT targets without dialogs. */
export function createDesktop145FileRoutes(service:StudioService,context:NamingV7SmokeContext,print:(session:NamingSession,file:string)=>Promise<string>){
 assertNamingV7SmokeContext(context,context.out,service.store.userDir);
 let savedBackup:{file:string;sha256:string;bytes:number}|undefined,restored=false;const reports:Record<string,unknown>[]=[];
 return{
  backup(){fact(!savedBackup,'本场景只允许生成一份备份。');assertNamingV7SmokeContext(context);const bytes=service.store.backupBytes(),file=writeNamingV7SmokeArtifact(context,BACKUP,bytes);savedBackup={file,sha256:hash(bytes),bytes:bytes.length};return file;},
  restore(){fact(savedBackup&&!restored,'须先创建本进程的真实备份，且只恢复一次。');assertNamingV7SmokeContext(context);const file=namingV7SmokeArtifactPath(context,BACKUP),bytes=readFileSync(file);fact(file===savedBackup.file&&hash(bytes)===savedBackup.sha256,'恢复输入与本进程备份摘要不一致。');service.store.restore(new Uint8Array(bytes));restored=true;return true;},
  async report(canonical:NamingSession){fact(reports.length<DESKTOP145_CASES.length,'报告数量超出本场景。');assertNamingV7SmokeContext(context);const name='desktop-workflow-145-report-'+String(reports.length+1).padStart(2,'0'),file=namingV7SmokeArtifactPath(context,name+'.pdf');assertNamingV7SmokeExport(context,file);const html=reportHTML(canonical,service.store.settings()),htmlFile=writeNamingV7SmokeArtifact(context,name+'.html',html);fact(await print(canonical,file)===file,'实际PDF导出器返回了其他目标。');const pdf=readFileSync(file);fact(pdf.subarray(0,5).toString()==='%PDF-'&&pdf.length>2000,'原生打印器没有返回有效PDF字节。');reports.push({file,sha256:hash(pdf),bytes:pdf.length,htmlFile,htmlSha256:hash(html),sessionId:canonical.id,reviewRevision:canonical.reviewRevision,reviewToken:canonical.reviewToken,candidateIds:canonical.candidates.map(c=>c.id)});return file;},
  receipts(){return plain({backup:savedBackup,restored,reports});},
 };
}
export type Desktop145FileRoutes=ReturnType<typeof createDesktop145FileRoutes>;

/** Prepared code only becomes native evidence when run inside the actual built
 * application. The implementation does not substitute Service calls for IPC. */
export async function smokeDesktopWorkflow145(window:BrowserWindow,service:StudioService,context:NamingV7SmokeContext,capture:()=>Promise<Buffer>,files:Desktop145FileRoutes,metadata:{appVersion:string;preloadPath:string;rendererNetworkAttempts:()=>unknown[]}){
 assertNamingV7SmokeContext(context,context.out,service.store.userDir);
 fact(!!process.versions.electron&&metadata.appVersion==='1.0.37','必须在本批真正1.0.37 Electron应用中运行。');
 fact(service.store.settings().useAi===false,'外部AI必须关闭。');
 const resourceReceipt=verifyDesktop145Resources(dirname(service.store.dataDir));
 const count=(table:'profiles'|'sessions'|'revisions')=>Number(service.store.db.exec('SELECT COUNT(*) FROM '+table)[0].values[0][0]);
 fact(count('profiles')===0&&count('sessions')===0&&count('revisions')===0,'必须使用全新独立验收库。');
 const expectedPreload=join(dirname(service.store.dataDir),'dist-electron/preload.cjs');
 fact(metadata.preloadPath===expectedPreload&&window.webContents.getURL().startsWith('file:'),'实际窗口不是本应用file页面或主入口preload目标。');const preloadSha256=hash(readFileSync(expectedPreload));
 const bridge=await withNamingV7Deadline("desktop145:preload-bridge",()=>window.webContents.executeJavaScript(`({protocol:location.protocol,userAgent:navigator.userAgent,nodeRequire:typeof require,methods:['generate','getMeaningContextOptions','updateMeaningContext','updateYueReading','updateElementAssessment','recordModernPracticalEvidence','clearModernPracticalEvidence','saveSession','listHistory','restoreHistory','backup','restore','exportReport'].map(method=>[method,typeof window.studio?.[method]])})`));
 fact(bridge.protocol==='file:'&&bridge.nodeRequire==='undefined'&&bridge.userAgent.includes('Electron/')&&bridge.methods.every((row:string[])=>row[1]==='function'),'实际renderer/preload桥不完整。');
 const calls:Record<string,unknown>[]=[],snapshots:Record<string,NamingSession>={},states:Record<string,unknown>={},networkAttempts:unknown[]=[];
 const oldFetch=globalThis.fetch;globalThis.fetch=(async(...args:unknown[])=>{networkAttempts.push({kind:'main-fetch',target:String(args[0])});throw new Error('桌面145关闭所有网络请求。');}) as typeof fetch;
 const ipc=async<T,>(method:keyof StudioAPI,args:unknown[]=[]):Promise<T>=>{const call={sequence:calls.length+1,method,argumentCount:args.length};try{const value=await withNamingV7Deadline("desktop145:ipc:"+method,()=>window.webContents.executeJavaScript(`window.studio[${JSON.stringify(method)}](...${JSON.stringify(args)})`),30000);calls.push({...call,status:'resolved'});return plain(value) as T;}catch(error){calls.push({...call,status:'rejected',error:String(error)});throw error;}};
 const bind=(session:NamingSession)=>{const row=service.store.db.exec('SELECT rowid,json FROM sessions WHERE id=?',[session.id])[0]?.values[0];fact(row,'API结果没有实际SQL行。');const saved=JSON.parse(String(row[1]));fact(equal(saved,plain(session)),'实际SQL与renderer API返回快照不同。');return{sessionId:session.id,rowid:Number(row[0]),rawJsonSha256:hash(String(row[1])),reviewRevision:session.reviewRevision,reviewToken:session.reviewToken};};
 const expectRejected=async(method:keyof StudioAPI,args:unknown[],reason:RegExp)=>{const before=readFileSync(join(service.store.userDir,'customers.sqlite'));let error='';try{await ipc(method,args);}catch(caught){error=String(caught);}fact(reason.test(error),'负例没有按真实API拒绝：'+method);fact(readFileSync(join(service.store.userDir,'customers.sqlite')).equals(before),'拒绝请求后SQL文件改变。');return{method,error,databaseUnchanged:true};};
 try{
  let confirmedYue=0,confirmedElements=0;
  for(const item of DESKTOP145_CASES){
   const input=desktop145Inputs(item.key,service.store.dataset.characters),result=await ipc<{session:NamingSession}>('generate',[input.profile,input.preferences]);let session=result.session;
   fact(session.candidates.length===1&&session.candidates[0].givenName===item.name,'真实生成没有返回唯一指定给名：'+item.name);const candidateId=session.candidates[0].id,facts=protectedFacts(session),sources=plain(session.sourceSnapshot),analysis=plain(session.analysis),originalProfile=plain(session.profile),generationPreferences=plain(session.preferences);
   fact(session.profile.fatherName==='林文舟'&&session.profile.motherName==='陈若兰'&&session.preferences.avoidParentNames===true,'虚构父母输入没有保存。');
   fact(session.namingRules?.version==='naming-editorial-7.0.0'&&session.factVerification?.datasetSha256==='1875aa49dcfaeca0f266a3be7578e4d4b2a9b2c9c1f59fd79699a3e26d5d6b8b','当前命名版本或实际原知识包不符。');
   fact(session.profile.timeUnknown===item.timeUnknown&&session.analysis.qimen.available!==item.timeUnknown,'未知出生时刻没有保留为不可排奇门的状态。');
   const initialSqlBinding=bind(session),options=await ipc<MeaningContextOptions>('getMeaningContextOptions',[session.id,candidateId]);fact(options.status===item.meaning,'实际词义覆盖范围与固定场景不符。');
   if(options.status==='available'){
    const choice=options.options[0];fact(choice,'没有主进程给出的可选原义。');session=await ipc<NamingSession>('updateMeaningContext',[session.id,candidateId,{action:'confirm-current-readings',positions:[0,1]},session.reviewRevision,session.reviewToken]);
    fact(session.candidates[0].meaningContextReview?.rows.every(row=>row.result.status!=='explanation-ready'),'尚未选义时已经标为采用。');
    session=await ipc<NamingSession>('updateMeaningContext',[session.id,candidateId,{action:'choose-context',position:choice.position,caseId:choice.caseId,senseId:choice.senseId,contextKey:choice.contextKey},session.reviewRevision,session.reviewToken]);
    fact(equal(session.candidates[0].meaningContextReview?.source,{sourceId:'project-meaning-context-next-138-v1-1',sourceSha256:'448a4a3132e0689ba5c0ffc114f439fbf0c6550e7c72a8d563080100be9aa6d2',dataSha256:'424e8b6ca9a920c8b707ac267db9609bee900a5389b3659256b4c71ad71b378d',sourceLockSha256:'473b1fb377bfeeb07c3cea800450e2ec88532b1678c9c590dcad650d8e3dd964',dataManifestSha256:'c5ac43e96b59beafaf54bce6a504ef9d97c0b59afd0687eaa7daa64ad9378ac9'})&&session.candidates[0].meaningContextReview?.version==='meaning-context-review/1.0.0'&&session.candidates[0].meaningContextReview.rows.some(row=>row.result.status==='explanation-ready'),'未采用本批meaning-context-data/1.1.0真实完整词义或固定原件身份不符。');
   }else fact(!session.candidates[0].meaningContextReview&&options.options.length===0,'未覆盖名字被补写词义结果。');
   const beforeElement=plain(session),choices=desktop145ElementChoices(session,item.element==='confirm-if-covered');session=await ipc<NamingSession>('updateElementAssessment',[session.id,candidateId,choices,session.reviewRevision,session.reviewToken]);
   confirmedElements+=session.candidates[0].elementAssessment!.rows.filter(row=>row.decision==='confirmed').length;fact(equal(session.candidates[0].meaningContextReview,beforeElement.candidates[0].meaningContextReview),'元素意见改变了独立词义选择。');
   const yue=desktop145YueChoice(session),beforeYue=plain(session);
   if(yue){session=await ipc<NamingSession>('updateYueReading',[session.id,candidateId,yue,session.reviewRevision,session.reviewToken]);fact(session.candidates[0].namePhoneticReviews?.reviews.yue?.status==='assessed','实际粤语确认后未进行所选词音复核。');confirmedYue++;}
   fact(equal(session.candidates[0].meaningContextReview,beforeYue.candidates[0].meaningContextReview)&&equal(session.candidates[0].elementAssessment,beforeYue.candidates[0].elementAssessment),'粤语选择改变了词义或元素意见。');
   const word=session.candidates[0].wordPronunciationReference?.reviews.cmn;fact(word?.status===item.word,'整词读音资料的实际未覆盖/参考状态不符。');
   if(item.key==='word-unknown')fact(word.references.some(row=>row.span.text==='安然'),'安然没有实际整词原参考。');else fact(word.references.length===0,'本未收录场景被伪造整词命中。');
   session=await ipc<NamingSession>('recordModernPracticalEvidence',[session.id,candidateId,session.reviewRevision,session.reviewToken]);fact(modernRecordView(session.candidates[0]).state==='current','实际现代记录未保存。');const modern=plain(session.candidates[0].modernPracticalEvidence),beforeReview=plain(session);
   const draft=plain(session);draft.reviewNote='桌面145实际preload/IPC普通审阅';draft.candidates[0].reviewNote='只改变审阅意见，保留原字义与独立快照。';session=await ipc<NamingSession>('saveSession',[draft]);
   fact(session.reviewRevision===beforeReview.reviewRevision!+1&&equal(session.candidates[0].modernPracticalEvidence,modern),'普通审阅没有单次CAS或改变现代记录。');
   const histories=await ipc<SessionRevision[]>('listHistory',[session.id]),revision=histories.find(row=>row.session.reviewRevision===beforeReview.reviewRevision);fact(revision,'没有真正保存的普通审阅前历史。');
   session=await ipc<NamingSession>('restoreHistory',[session.id,revision.id,session.reviewRevision,session.reviewToken]);fact(equal(session.candidates,beforeReview.candidates),'历史恢复未取回实际旧候选组合。');
   session=await ipc<NamingSession>('clearModernPracticalEvidence',[session.id,candidateId,session.reviewRevision,session.reviewToken]);fact(!Object.hasOwn(session.candidates[0],'modernPracticalEvidence'),'现代清除没有移除记录。');
   const recordedRevision=(await ipc<SessionRevision[]>('listHistory',[session.id])).find(row=>equal(row.session.candidates[0].modernPracticalEvidence,modern));fact(recordedRevision,'清除前现代记录没有真实历史见证。');const beforeRecordedRestore=plain(session);session=await ipc<NamingSession>('restoreHistory',[session.id,recordedRevision.id,session.reviewRevision,session.reviewToken]);const historyRestoreWitness=assertDesktop145RecordedHistoryRestored(session,beforeRecordedRestore,recordedRevision);
   fact(equal(protectedFacts(session),facts)&&equal(session.sourceSnapshot,sources)&&equal(session.analysis,analysis)&&equal(session.profile,originalProfile)&&equal(session.preferences,generationPreferences),'专用选择或审阅改变了出生资料/分析/生成偏好/事实/分数/命名7/生成来源。');
   snapshots[item.key]=session;states[item.key]={initialSqlBinding,finalSqlBinding:bind(session),meaningCoverage:options.status,wordStatus:word.status,wordReferences:word.references.map(row=>({id:row.id,word:row.word,span:row.span,comparison:row.comparison})),yueConfirmation:yue?'actual-dictionary-selection':'uncovered-no-invented-reading',elementChoices:choices,unknownTime:{profile:session.profile.timeUnknown,qimenAvailable:session.analysis.qimen.available,pillars:session.analysis.bazi.pillars},historyRestore:'actual-saved-revision',modernClearAndHistoryRestoration:historyRestoreWitness.verified,historyRestoreWitness};
  }
  fact(confirmedYue>0&&confirmedElements>0,'至少需一个真实粤语确认及一个有依据的元素意见确认；没有证据不虚构。');
  const beforeBackup=plain(snapshots),backupFile=await ipc<string>('backup');fact(backupFile===join(context.out,BACKUP),'备份没有走本场景固定OUT目标。');
  const first=snapshots.meaning,draft=plain(first);draft.reviewNote='只存在于备份后的受控修改';await ipc('saveSession',[draft]);fact(await ipc<boolean>('restore')===true,'真实备份恢复失败。');
  const boot=await ipc<{sessions:NamingSession[]}>('bootstrap');
  for(const item of DESKTOP145_CASES){const restored=boot.sessions.find(row=>row.id===beforeBackup[item.key].id);fact(restored&&equal(withoutToken(restored),withoutToken(beforeBackup[item.key]))&&restored.reviewToken!==beforeBackup[item.key].reviewToken,'备份恢复没有只刷新当前令牌并保留本批原结果。');snapshots[item.key]=restored;bind(restored);}
  const stale=plain(beforeBackup.meaning);stale.reviewNote='恢复前客户端不可覆盖';const rejected=await expectRejected('saveSession',[stale],/其他窗口|恢复|更新/);
  const artifacts:Record<string,unknown>={},ui:Record<string,unknown>={},screenshots:Record<string,unknown>[]=[];
  for(const item of DESKTOP145_CASES){const session=snapshots[item.key],jsonFile=writeNamingV7SmokeArtifact(context,'desktop-workflow-145-session-'+item.key+'.json',JSON.stringify(session,null,2)),pdf=await ipc<string>('exportReport',[session]);fact(pdf.endsWith('.pdf'),'报告API没有返回实际PDF。');artifacts[item.key]={sessionFile:jsonFile,sha256:hash(readFileSync(jsonFile)),pdf,sqlBinding:bind(session)};}
  window.setSize(1100,800);await reloadNamingV7Page(window.webContents);
  const tools=`const wait=async(test,label)=>{for(let i=0;i<300;i++){const value=test();if(value)return value;await new Promise(r=>setTimeout(r,40));}throw Error('Desktop145 UI:'+label);};const nav=async(text)=>(await wait(()=>[...document.querySelectorAll('nav .nav-item')].find(n=>n.textContent.includes(text)),text)).click();`;
  const databaseBeforeUI=readFileSync(join(service.store.userDir,'customers.sqlite'));
  for(const item of DESKTOP145_CASES){const session=snapshots[item.key],state=await withNamingV7Deadline("desktop145:view:"+item.key,()=>window.webContents.executeJavaScript(`(async()=>{${tools}await nav('方案与报告');(await wait(()=>[...document.querySelectorAll('.session-item')].find(n=>n.getAttribute('title')?.includes(${JSON.stringify(session.id)})),'session')).click();await wait(()=>document.querySelector('.session-item[aria-current="true"]')?.getAttribute('title')?.includes(${JSON.stringify(session.id)}),'selected');await nav('起名工作台');(await wait(()=>[...document.querySelectorAll('.name-card .name-main')].find(n=>n.textContent.includes(${JSON.stringify(session.candidates[0].fullName)})),'candidate')).click();const dialog=await wait(()=>document.querySelector('[role="dialog"]'),'detail');await wait(()=>dialog.textContent.includes(${JSON.stringify(session.candidates[0].fullName)}),'name');if(${JSON.stringify(item.meaning==='available')})await wait(()=>dialog.querySelector('.meaning-context-adopted'),'saved meaning');const parent=label=>[...document.querySelectorAll('.field')].find(n=>n.querySelector('label')?.textContent.includes(label))?.querySelector('input')?.value;await document.fonts.ready;const panelSelector=${JSON.stringify(item.key==='meaning'?'.saved-meaning-context':item.key==='word-unknown'?'.word-reference-view':'.saved-element-assessment')};const target=await wait(()=>dialog.querySelector(panelSelector),'required saved panel:'+panelSelector);if(target instanceof HTMLDetailsElement&&!target.open){target.querySelector('summary').click();await wait(()=>target.open,'saved panel open');}target.scrollIntoView({block:'center'});await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return{sessionId:${JSON.stringify(session.id)},name:${JSON.stringify(session.candidates[0].fullName)},text:dialog.innerText.slice(0,18000),panelSelector,moduleText:target.innerText,fatherName:parent('爸爸姓名'),motherName:parent('妈妈姓名'),horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,width:innerWidth,height:innerHeight};})()`));
   fact(state.fatherName==='林文舟'&&state.motherName==='陈若兰'&&!state.horizontalOverflow,'真实桌面父母输入/详情布局不符。');if(item.key==='word-unknown')fact(session.candidates[0].wordPronunciationReference!.reviews.cmn!.references.every(row=>state.moduleText.includes('原词「'+row.word+'」')),'真实WORD展开面板没有显示所保存的原词参照。');if(item.key==='element')fact(session.candidates[0].elementAssessment!.rows.flatMap(row=>row.assessment?.matchingSourceCandidates.filter(e=>row.confirmedEvidenceIds.includes(e.evidenceId))??[]).every(e=>state.moduleText.includes(e.quote)),'真实元素已保存面板缺少所选原义。');ui[item.key]=state;const bytes=await withNamingV7Deadline("desktop145:capture:"+item.key,()=>capture()),dimensions=smokeJpegDimensions(bytes);fact(bytes.length<=500000&&dimensions.width<=1280&&dimensions.height<=1280,'截图超过1280px/500KB。');const file=writeNamingV7SmokeArtifact(context,'desktop-workflow-145-'+item.key+'.jpg',bytes);screenshots.push({file,sha256:hash(bytes),bytes:bytes.length,...dimensions});
   await withNamingV7Deadline("desktop145:close:"+item.key,()=>window.webContents.executeJavaScript(`(async()=>{${tools}(await wait(()=>document.querySelector('[role="dialog"] button[aria-label="关闭"]'),'close')).click();await wait(()=>!document.querySelector('[role="dialog"]'),'closed');return true;})()`));
  }
  fact(readFileSync(join(service.store.userDir,'customers.sqlite')).equals(databaseBeforeUI),'只读桌面检查/截图改变数据库。');const rendererNetworkAttempts=plain(metadata.rendererNetworkAttempts());fact(networkAttempts.length===0&&rendererNetworkAttempts.length===0,'应用尝试了被禁的外联请求。');
  const histories=service.store.db.exec('SELECT id,session_id,json FROM revisions ORDER BY id')[0]?.values??[];writeNamingV7SmokeArtifact(context,'desktop-workflow-145-history.json',JSON.stringify(histories.map(([id,sessionId,json])=>({id,sessionId,rawJsonSha256:hash(String(json)),session:JSON.parse(String(json))})),null,2));
  const preflightInputs={sqlSha256:hash(readFileSync(context.legacySql)),provenanceSha256:hash(readFileSync(context.legacyProvenance)),usedForStartupPreflightOnly:true};fact(preflightInputs.sqlSha256===context.legacySha256&&preflightInputs.provenanceSha256===context.provenanceSha256,'受控预检原件在场景期间改变。');
  return{schema:'desktop-workflow-145/1',status:'completed',appVersion:metadata.appVersion,electron:process.versions.electron,resourceReceipt,bridge,preload:{file:expectedPreload,sha256:preloadSha256},database:join(service.store.userDir,'customers.sqlite'),databaseSha256:hash(databaseBeforeUI),calls,states,artifacts,backup:files.receipts(),rejectedStaleWrite:rejected,ui,screenshots,confirmedYue,confirmedElements,counts:{profiles:count('profiles'),sessions:count('sessions'),histories:count('revisions')},AIEnabled:false,networkAttempts,rendererNetworkAttempts,scope:'Actual built app preload/IPC/API,actual Store SQL,actual main PDF printer and capture; no native keyboard/dialog or install acceptance claimed',preflightInputs,legacyInputsUsedOnlyForExistingPreflight:true,meaningBatch:'v1-and-current-v1.1',currentMeaningDataVersion:'meaning-context-data/1.1.0',nativeExecutionRequiredForAcceptance:true};
 }finally{globalThis.fetch=oldFetch;}
}
