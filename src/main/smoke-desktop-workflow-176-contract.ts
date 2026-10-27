import {isDeepStrictEqual} from 'node:util';
import {canonicalPlainJson} from '../shared/plain-json';
import type {BirthProfile,NamingPreferences,NamingSession} from '../shared/types';
export const DESKTOP176_SCHEMA='naming-studio-desktop176-result/1' as const;
export const DESKTOP176_WORKFLOW='desktop176/1' as const;
export const DESKTOP176_APP_VERSION='1.0.38' as const;
export const DESKTOP176_PHASES=['exercise','resume'] as const;
export const DESKTOP176_SCENARIOS=['legacy70-canonical','naming71-character40','project131-family-review'] as const;
export const DESKTOP176_REPRESENTATIVES=['静','南','黎'] as const;
export const DESKTOP176_WARNING='人工喜用选择已修改，此批候选保留生成时的用字依据；重新生成可应用新选择。';
export type Desktop176Phase=typeof DESKTOP176_PHASES[number];
export type Desktop176Mode='Development'|'Installed';
export type Desktop176Scenario=typeof DESKTOP176_SCENARIOS[number];
export interface Desktop176Ref {file:string;sha256:string;bytes:number;}
export interface Desktop176TestInputFreeze {
 readonly schema:'naming-studio-test-input-freeze/1';readonly version:'1.0.38';readonly frozenAt:string;
 readonly files:Readonly<Record<string,string>>;readonly documentation:Readonly<Record<string,string>>;
}
export interface Desktop176Response {
 requestId:string;scenarioId:Desktop176Scenario;method:string;responseKind:'resolved'|'rejected';
 transport:'renderer-preload-ipc';serialization:'complete-JSON-of-structured-value-as-received';
 request:Desktop176Ref;response:Desktop176Ref;
}
export interface Desktop176Pdf extends Desktop176Ref {sessionId:string;snapshot:Desktop176Ref;html:Desktop176Ref;phaseID:'exercise';}
export interface Desktop176Screenshot extends Desktop176Ref {mime:'image/png';width:number;height:number;phaseID:'exercise';}
export interface Desktop176ScenarioResult {
 scenarioId:Desktop176Scenario;status:'passed';customerIds:string[];sessionIds:string[];responseRequestIds:string[];
 screenshot:Desktop176Screenshot;pdf:Desktop176Pdf;artifactPhase:'exercise';evidence:Record<string,unknown>;
}
export interface Desktop176Inputs {
 schema:'desktop176-input-plan/1';appVersion:'1.0.38';mode:Desktop176Mode;phaseID:Desktop176Phase;
 inputFreeze:Desktop176Ref;workflowSource:Desktop176Ref;
 materialIdentity:{resourceContract:Desktop176Ref;rootFeedbackManifest:Desktop176Ref;naming71Profile:Desktop176Ref;naming71Admission:Desktop176Ref;naming71Lock:Desktop176Ref;parentMethod:Desktop176Ref;workerReceipt:Desktop176Ref;applicationTupleSource:Desktop176Ref;};
 legacy70:{database:Desktop176Ref;sqlProof:Desktop176Ref;snapshots:Desktop176Ref[];};
 fortyLifecycleEvidence:{report:Desktop176Ref;commandCapture:Desktop176Ref;testSource:Desktop176Ref;inputFreeze:Desktop176Ref;suite:'tests/naming-v71-service-core.test.ts';};
 resume?:{exerciseResult:Desktop176Ref;seal:Desktop176Ref;exerciseProcessReceipt:Desktop176Ref;};
}
export interface Desktop176ResumeSeal {
 schema:'desktop176-resume-seal/1';workflowId:'desktop176/1';appVersion:'1.0.38';mode:Desktop176Mode;exercisePid:number;userData:string;
 inputFreeze:Desktop176Ref;workflowSource:Desktop176Ref;database:Desktop176Ref;state:Desktop176Ref;
 scenarioSessionIds:Record<Desktop176Scenario,string[]>;
 rendererOnboarding:Desktop176RendererOnboarding;
}
export interface Desktop176RendererOnboarding {schema:'desktop176-renderer-onboarding/1';phaseID:Desktop176Phase;storageKey:'studio.onboarding.v1';rawValue:string;guideVisible:false;observation:'read-only-production-preference';}
/** Written by the outer real process driver after exercise exits, never by the
 * App before its own exit and never inserted back into its original result. */
export interface Desktop176ExerciseExit {
 schema:'naming-studio-desktop176-process/1';appVersion:'1.0.38';phaseID:'exercise';mode:Desktop176Mode;pid:number;exitCode:0;naturalExit:true;
 startedAt:string;terminalAt:string;completedAt:string;
 executable:Desktop176Ref;userData:string;inputFreeze:Desktop176Ref;workflowSource:Desktop176Ref;result:Desktop176Ref;
 stageProcess:Desktop176Ref;
}
export interface Desktop176RawResult {
 schema:typeof DESKTOP176_SCHEMA;workflowId:typeof DESKTOP176_WORKFLOW;appVersion:'1.0.38';mode:Desktop176Mode;phaseID:Desktop176Phase;
 status:'awaiting-resume'|'completed';captureCompleteness:'full-original-responses';
 pid:number;executable:Desktop176Ref;userData:string;startedAt:string;completedAt:string;
 inputFreeze:Desktop176Ref;workflowSource:Desktop176Ref;materialIdentity:Desktop176Inputs['materialIdentity'];
 runtimeProcess:Desktop176Ref;sqlProof:Desktop176Ref;originalResponses:Desktop176Response[];
 scenarios:Desktop176ScenarioResult[];reopenScope:'renderer-reload-and-store-reopen'|'separate-process-resume';
 generationCoverage:'representative-only';coverageInventory40:Desktop176Ref;fortyLifecycleEvidence:Desktop176Inputs['fortyLifecycleEvidence'];
 resumeSeal:Desktop176Ref;resumeEvidence?:{exercisePid:number;resumePid:number;exerciseResult:Desktop176Ref;exerciseProcessReceipt:Desktop176Ref;runtimeInputBefore:Desktop176Ref;runtimeInputAfter:Desktop176Ref;};
 AIEnabled:false;networkAttempts:unknown[];rendererNetworkAttempts:unknown[];nativeExecutionRequiredForAcceptance:true;
 scope:string;
}
function fact(condition:unknown,message:string):asserts condition{if(!condition)throw new Error('桌面176合同：'+message);}
/** Pure policy only; main must use the context-authenticated wrapper before
 * invoking any actual Service/Store/file route. */
export function assertDesktop176PhasePolicy(phaseID:Desktop176Phase,method:string):void{
 fact(DESKTOP176_PHASES.includes(phaseID)&&typeof method==='string'&&/^[A-Za-z][A-Za-z0-9]*$/.test(method),'未知阶段或API方法。');
 if(phaseID==='resume')fact(method==='bootstrap'||method==='listHistory','resume只允许bootstrap/listHistory，必须在Service调用前拒绝写入。');
}
export function assertDesktop176OnboardingObservation(value:unknown,phaseID:Desktop176Phase,expected?:Desktop176RendererOnboarding):Desktop176RendererOnboarding{
 canonicalPlainJson(value);fact(!!value&&typeof value==='object'&&!Array.isArray(value),'引导观察须为普通记录。');
 const record=value as Record<string,unknown>;fact(record.storageKey==='studio.onboarding.v1'&&typeof record.rawValue==='string'&&record.guideVisible===false,'实际引导偏好缺失/未持久化或欢迎弹窗仍显示。');
 let preference:unknown;try{preference=JSON.parse(record.rawValue);}catch{throw new Error('桌面176合同：实际本地引导偏好损坏，不伪造已读。');}
 fact(!!preference&&typeof preference==='object'&&!Array.isArray(preference)&&Object.keys(preference).length===2&&(preference as {version?:unknown}).version===1&&(preference as {dismissed?:unknown}).dismissed===true,'实际本地引导状态不符合production已跳过记录。');
 if(expected)fact(expected.phaseID==='exercise'&&expected.storageKey===record.storageKey&&expected.rawValue===record.rawValue&&expected.guideVisible===false,'resume的引导状态不同于exercise真实留下的seal。');
 return Object.freeze({schema:'desktop176-renderer-onboarding/1',phaseID,storageKey:'studio.onboarding.v1',rawValue:record.rawValue,guideVisible:false,observation:'read-only-production-preference'});
}
/** The outer post-exit receipt supplements, and never replaces, original P. */
export function assertDesktop176ExerciseProcessSource(exit:Desktop176ExerciseExit,value:unknown):void{
 assertDesktop176Ref(exit.stageProcess);canonicalPlainJson(value);fact(!!value&&typeof value==='object'&&!Array.isArray(value),'缺原始stage process对象。');
 const record=value as Record<string,unknown>;
 fact(record.schema==='naming-studio-smoke-process/1'&&record.version==='1.0.38'&&record.mode===exit.mode&&record.status==='completed'&&record.pid===exit.pid&&record.exitCode===0&&record.signal===null&&record.launchError===null,'postreceipt的原P版本/进程/退出状态不符。');
 assertDesktop176Ref(record.executable);assertDesktop176Ref(record.result);assertDesktop176Ref(record.sourceFreeze);
 fact(isDeepStrictEqual(record.executable,exit.executable)&&isDeepStrictEqual(record.result,exit.result)&&isDeepStrictEqual(record.sourceFreeze,exit.inputFreeze),'原P必须全ref绑定同exe、原176结果与test-input-freeze，拒绝别名/换源。');
}
/** One exact production freeze DTO. Object-valued file identities are not an
 * alternate format. A future files[path].sha256 access is a TypeScript error. */
export function parseDesktop176TestInputFreeze(value:unknown):Desktop176TestInputFreeze{
 canonicalPlainJson(value);
 fact(!!value&&typeof value==='object'&&!Array.isArray(value),'freeze须为普通数据对象。');
 const record=value as Record<string,unknown>,keys=Object.keys(record);
 fact(keys.length===5&&['schema','version','frozenAt','files','documentation'].every(key=>Object.hasOwn(record,key))&&record.schema==='naming-studio-test-input-freeze/1'&&record.version==='1.0.38'&&typeof record.frozenAt==='string'&&Number.isFinite(Date.parse(record.frozenAt)),'只接受精确test-input-freeze/1生产schema。');
 const stringMap=(input:unknown,label:string,nonempty:boolean):Readonly<Record<string,string>>=>{
  fact(!!input&&typeof input==='object'&&!Array.isArray(input),'freeze '+label+'须为SHA字符串映射。');
  const entries=Object.entries(input);fact(!nonempty||entries.length>0,'freeze files不得为空。');
  const output:Record<string,string>=Object.create(null);
  for(const[key,hash]of entries){fact(key.length>0&&!key.startsWith('/')&&!key.includes('\\')&&!key.includes(':')&&key.split('/').every(part=>part&&part!=='.'&&part!=='..'&&!['__proto__','prototype','constructor'].includes(part))&&typeof hash==='string'&&/^[a-f0-9]{64}$/.test(hash),'freeze '+label+'项必须是安全相对路径到完整SHA字符串，拒绝对象/缺值。');output[key]=hash;}
  return Object.freeze(output);
 };
 return Object.freeze({schema:'naming-studio-test-input-freeze/1',version:'1.0.38',frozenAt:record.frozenAt,files:stringMap(record.files,'files',true),documentation:stringMap(record.documentation,'documentation',false)});
}
export function desktop176Prefix(mode:Desktop176Mode,phase:Desktop176Phase){fact(['Development','Installed'].includes(mode)&&DESKTOP176_PHASES.includes(phase),'模式或阶段未登记。');return'desktop176-'+mode+'-'+phase;}
export function assertDesktop176Ref(value:unknown):asserts value is Desktop176Ref {
 fact(!!value&&typeof value==='object'&&!Array.isArray(value),'产物引用须为对象。');canonicalPlainJson(value);
 const row=value as Desktop176Ref;fact(typeof row.file==='string'&&row.file.length>0&&/^[a-f0-9]{64}$/.test(row.sha256)&&Number.isSafeInteger(row.bytes)&&row.bytes>0,'产物引用缺少实际路径、完整SHA或长度。');
}
export function assertDesktop176PreservedLegacy(original:NamingSession,current:NamingSession,allowRestoreToken=false):void{
 fact(original.namingRules?.version==='naming-editorial-7.0.0'&&current.namingRules?.version==='naming-editorial-7.0.0','旧70不能被升级、改名或去掉版本。');
 const before=JSON.parse(canonicalPlainJson(original)),after=JSON.parse(canonicalPlainJson(current));
 if(allowRestoreToken){delete before.reviewToken;delete after.reviewToken;}
 fact(isDeepStrictEqual(before,after),'旧70完整canonical改变，不仅比较若干挑选字段。');
}
export function serializeDesktop176ResolvedResponse(value:unknown):string{canonicalPlainJson(value);return JSON.stringify(value)+'\n';}
export function desktop176Inputs(id:string,name:string,project=false):{profile:BirthProfile;preferences:NamingPreferences}{
 fact(id.startsWith('desktop176-')&&[...name].length===1,'只接受独立176客户和单字代表样本。');
 const profile:BirthProfile={id,customerName:'桌面176合成验收-'+id,surname:'林',surnamePinyin:'lín',fatherName:project?'林沐':'林文舟',motherName:project?'陈子':'陈若兰',gender:'中性',calendar:'solar',birthDate:project?'2022-02-13':'2026-10-17',birthTime:project?'11:30':'09:30',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',timeBasis:'civil',renMethod:'none',monthAuthorityMethod:'no-fixed-day/1.0.0',seasonalMethod:'no-monthly/1.0.0',notes:'仅独立桌面验收合成资料，非正常客户；禁止外部AI。'};
 const preferences:NamingPreferences={length:1,generationChar:name,requiredChars:name,forbiddenChars:'',elderTaboo:'',style:'自然',meanings:'',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false,avoidParentNames:!project,imageryReading:false,yueReading:false,yueHomophones:'none',wordPronunciationReference:false,elementAssessment:false,...(project?{namingElementMethod:{methodId:'project-bazi-mainchain-145/1.3.1',entryPolicy:'month-branch-only'},parentNamePhonetics:'strict'}:{})};
 return{profile,preferences};
}
export function assertDesktop176ProjectSaved(session:NamingSession,original?:NamingSession):void{
 const saved=session.analysis.projectNamingUse;
 fact(session.namingRules?.version==='naming-editorial-7.1.0'&&!!saved,'须保存命名7.1与独立项目采用记录。');
 fact(saved.selection.methodId==='project-bazi-mainchain-145/1.3.1'&&saved.sourceRecipe.applicationPolicyVersion==='naming-element-application/1.0.0'&&saved.sourceRecipe.namingRulesVersion==='naming-editorial-7.1.0','项目、命名或采用协议版本不符。');
 fact(isDeepStrictEqual(saved.application.effectiveElements,['土','金'])&&isDeepStrictEqual(saved.engineCertificate.effectiveElements.applied,saved.application.effectiveElements),'项目实际采用不是已证土金。');
 fact(isDeepStrictEqual(session.analysis.bazi.favorable,['土','金','水'])&&isDeepStrictEqual(session.originalFavorable,session.analysis.bazi.favorable),'基础扶抑与项目采用未独立保留。');
 fact(session.profile.namingPreferences?.preferredElements.length===0&&session.candidates.length===1&&session.candidates[0].givenName==='沐'&&session.candidates[0].evaluation.traditional===40,'生成偏好或原始项目评分被审阅草稿覆盖。');
 fact(session.profile.fatherName==='林沐'&&session.profile.motherName==='陈子'&&session.profile.parentNameReadings?.length===2,'父母姓名/完整确认记录未保存。');
 const father=session.profile.parentNameReadings.find(row=>row.role==='father'),mother=session.profile.parentNameReadings.find(row=>row.role==='mother');
 fact(father?.readings.map(row=>row.token).join()==='mu4'&&mother?.readings.map(row=>row.token).join()==='zi5','固定来源确认音节不符。');
 fact(session.candidates[0].parentNamePhoneticReview?.result.comparisons.some(row=>row.role==='father'&&row.status==='matched')===true,'真实父亲给名比较缺失。');
 if(original){
  fact(isDeepStrictEqual(session.analysis,original.analysis)&&isDeepStrictEqual(session.sourceSnapshot,original.sourceSnapshot)&&isDeepStrictEqual(session.profile,original.profile),'人工草稿改变完整证书/来源/生成资料。');
  fact(isDeepStrictEqual(session.candidates.map(row=>row.evaluation),original.candidates.map(row=>row.evaluation)),'人工草稿重评原候选。');
  fact(isDeepStrictEqual(session.preferences.preferredElements,['水'])&&session.candidates[0].warnings.includes(DESKTOP176_WARNING),'未实际保留水草稿与明确的原依据警示。');
 }
}
export function assertDesktop176RawResult(value:Desktop176RawResult):void{
 canonicalPlainJson(value);fact(value.schema===DESKTOP176_SCHEMA&&value.workflowId===DESKTOP176_WORKFLOW&&value.appVersion===DESKTOP176_APP_VERSION,'原始结果schema/版本不符。');
 const prefix=desktop176Prefix(value.mode,value.phaseID);fact(value.status===(value.phaseID==='exercise'?'awaiting-resume':'completed'),'阶段状态不符。');
 fact(value.captureCompleteness==='full-original-responses'&&value.generationCoverage==='representative-only','原始响应或代表覆盖声明不符。');
 fact(Number.isSafeInteger(value.pid)&&value.pid>0&&value.scenarios.length===3&&isDeepStrictEqual(value.scenarios.map(row=>row.scenarioId),DESKTOP176_SCENARIOS),'PID或三组固定场景不完整。');
 const ids=new Set<string>(),responseFiles=new Set<string>();for(const row of value.originalResponses){fact(row.requestId.startsWith(prefix+'-')&&!ids.has(row.requestId)&&DESKTOP176_SCENARIOS.includes(row.scenarioId),'原响应身份重复/跨阶段。');ids.add(row.requestId);assertDesktop176Ref(row.request);assertDesktop176Ref(row.response);for(const ref of [row.request,row.response]){fact(!responseFiles.has(ref.file),'请求/响应原件不得复用覆盖。');responseFiles.add(ref.file);}fact(row.transport==='renderer-preload-ipc'&&row.serialization==='complete-JSON-of-structured-value-as-received','不得用调用元信息或截断摘要代替原响应。');if(value.phaseID==='resume')fact(['bootstrap','listHistory'].includes(row.method)&&row.responseKind==='resolved','resume只允许只读原始IPC。');}
 const pdfFiles=new Set<string>(),screenshotFiles=new Set<string>(),customerIds=new Set<string>();
 for(const row of value.scenarios){fact(row.status==='passed'&&row.responseRequestIds.length>0&&row.responseRequestIds.every(id=>ids.has(id)&&value.originalResponses.some(response=>response.requestId===id&&response.scenarioId===row.scenarioId)),'场景没有本阶段真实原响应。');assertDesktop176Ref(row.pdf);assertDesktop176Ref(row.pdf.snapshot);assertDesktop176Ref(row.pdf.html);assertDesktop176Ref(row.screenshot);fact(row.pdf.phaseID==='exercise'&&row.screenshot.phaseID==='exercise'&&row.artifactPhase==='exercise','三份PDF/截图仅exercise产生，不在resume重写。');fact(row.sessionIds.includes(row.pdf.sessionId)&&!pdfFiles.has(row.pdf.file)&&!screenshotFiles.has(row.screenshot.file),'PDF会话绑定或三组产物唯一性不符。');pdfFiles.add(row.pdf.file);screenshotFiles.add(row.screenshot.file);fact(row.screenshot.mime==='image/png'&&row.screenshot.bytes<=500000&&row.screenshot.width>0&&row.screenshot.width<=1280&&row.screenshot.height>0&&row.screenshot.height<=1280,'截图需为1280px/500KB以内实际PNG。');fact(row.customerIds.length>0&&new Set(row.customerIds).size===row.customerIds.length&&row.customerIds.every(id=>typeof id==='string'&&id&&!customerIds.has(id)),'每组必须有独立客户。');for(const id of row.customerIds)customerIds.add(id);}
 for(const ref of [value.executable,value.inputFreeze,value.workflowSource,value.runtimeProcess,value.sqlProof,value.coverageInventory40,value.resumeSeal])assertDesktop176Ref(ref);
 fact(value.AIEnabled===false&&!value.networkAttempts.length&&!value.rendererNetworkAttempts.length&&value.nativeExecutionRequiredForAcceptance===true,'未保持离线实际执行限定。');
 fact(Number.isFinite(Date.parse(value.startedAt))&&Number.isFinite(Date.parse(value.completedAt))&&Date.parse(value.completedAt)>=Date.parse(value.startedAt),'阶段起止时间无效。');
 if(value.phaseID==='exercise')fact(value.reopenScope==='renderer-reload-and-store-reopen','exercise不能冒独立进程重开。');
 if(value.phaseID==='resume'){const evidence=value.resumeEvidence;fact(!!evidence&&evidence.exercisePid!==evidence.resumePid&&evidence.resumePid===value.pid&&isDeepStrictEqual(evidence.runtimeInputBefore,evidence.runtimeInputAfter)&&value.reopenScope==='separate-process-resume','没有不同PID的同seal只读重开证据。');}
}
