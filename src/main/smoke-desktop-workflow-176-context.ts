import fs from 'node:fs';import {win32,join} from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {canonicalPlainJson} from '../shared/plain-json';
import {nativeWriteNamingV7Artifact} from './smoke-naming-v7-native-writer';
import {assertDesktop176Ref,desktop176Prefix,parseDesktop176TestInputFreeze,assertDesktop176PhasePolicy,type Desktop176Inputs,type Desktop176Ref,type Desktop176ResumeSeal} from './smoke-desktop-workflow-176-contract';
const hash=(bytes:string|Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const envKeys=['NAMING_STUDIO_DESKTOP_WORKFLOW','NAMING_STUDIO_SMOKE_SCOPE','NAMING_STUDIO_SMOKE','NAMING_STUDIO_USER_DATA','NAMING_STUDIO_SMOKE_EXIT','NAMING_STUDIO_DESKTOP176_INPUTS','NAMING_STUDIO_DESKTOP176_INPUTS_SHA256'] as const;
type Node={path:string;identity:string};
export interface Desktop176Context {readonly kind:'desktop176-context/1';readonly out:string;readonly userData:string;readonly plan:Readonly<Desktop176Inputs>;readonly prefix:string;}
type Private={env:(string|undefined)[];outNodes:Node[];userNodes:Node[];planFile:string;planSha256:string;normalUserData:string;};
const contexts=new WeakMap<object,Private>();
function fact(value:unknown,message:string):asserts value{if(!value)throw new Error('桌面176隔离预检：'+message);}
const folded=(value:string)=>win32.normalize(value).toLowerCase();
function absolute(value:unknown):string{
 fact(typeof value==='string'&&/^[A-Za-z]:[\\/]/.test(value)&&value===value.trim()&&!/^\\\\/.test(value),'须为本机普通绝对路径。');
 const target=win32.normalize(value),root=win32.parse(target).root;
 fact(target!==root&&value.slice(3).split(/[\\/]/).every(part=>part&&part!=='.'&&part!=='..'&&!/[. ]$/.test(part)&&!/[<>:"|?*\x00-\x1f]/.test(part)&&!/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part)),'路径含保留名、空组件或歧义。');return target;
}
function nodes(file:string,directory:boolean):Node[]{
 const target=absolute(file),root=win32.parse(target).root,parts=target.slice(root.length).split(win32.sep),result:Node[]=[];let current=root;
 for(let i=-1;i<parts.length;i++){if(i>=0)current=win32.join(current,parts[i]);const stat=fs.lstatSync(current,{bigint:true});fact(!stat.isSymbolicLink()&&stat.ino!==0n&&(i===parts.length-1?(directory?stat.isDirectory():stat.isFile()):stat.isDirectory()),'路径类型或链接身份无效。');fact(folded(fs.realpathSync.native(current))===folded(current),'路径存在别名/重定向。');result.push({path:current,identity:stat.dev+':'+stat.ino});}return result;
}
function reparseCheck(paths:Node[]){
 fact(process.platform==='win32','仅在Windows本机执行。');const names=[...new Set(paths.map(node=>node.path))],systemRoot=absolute(join(process.env.SystemRoot??'','System32'));
 const executable=join(systemRoot,'WindowsPowerShell/v1.0/powershell.exe');
 const script="$ErrorActionPreference='Stop';$p=ConvertFrom-Json ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String([Console]::In.ReadToEnd())));$r=@();foreach($f in $p){$a=[int][IO.File]::GetAttributes($f);$r+=@{path=$f;reparse=(($a -band 1024) -ne 0)}};[Console]::Out.Write((ConvertTo-Json -Compress -InputObject @($r)))";
 const rows=JSON.parse(execFileSync(executable,['-NoLogo','-NoProfile','-NonInteractive','-Command',script],{input:Buffer.from(JSON.stringify(names)).toString('base64'),encoding:'utf8',windowsHide:true,timeout:15000,maxBuffer:65536}).replace(/^\uFEFF/,''));
 fact(Array.isArray(rows)&&rows.length===names.length&&rows.every((row,index)=>row.path===names[index]&&row.reparse===false),'路径含Windows重解析点。');
}
function contains(parent:string,child:string){const relative=win32.relative(folded(parent),folded(child));return relative===''||relative!=='..'&&!relative.startsWith('..'+win32.sep)&&!win32.isAbsolute(relative);}
function resolvedEvenIfMissing(value:string):string{let current=absolute(value);const suffix:string[]=[];while(!fs.existsSync(current)){const parent=win32.dirname(current);fact(parent!==current,'找不到可解析的路径祖先。');suffix.unshift(win32.basename(current));current=parent;}return win32.join(fs.realpathSync.native(current),...suffix);}
/** Read-only path policy, not an authentication ticket. The branded preflight
 * obtains/cross-checks the forbidden root from the actual Electron App. */
export function assertDesktop176UserDataIsolation(normalUserData:string,userData:string):void{
 const normal=absolute(normalUserData),target=absolute(userData);
 fact(!contains(normal,target)&&!contains(resolvedEvenIfMissing(normal),resolvedEvenIfMissing(target)),'禁止使用normal默认USER_DATA、其后代或解析回该root的别名。');
}
export function readDesktop176Ref(ref:Desktop176Ref):Buffer{assertDesktop176Ref(ref);nodes(ref.file,false);const bytes=fs.readFileSync(ref.file);fact(bytes.length===ref.bytes&&hash(bytes)===ref.sha256,'引用的实际原件长度/SHA不符：'+ref.file);return bytes;}
export function desktop176FileRef(file:string):Desktop176Ref{const bytes=fs.readFileSync(file);return{file,sha256:hash(bytes),bytes:bytes.length};}
function freeze<T>(value:T):T{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
/** A separate phase-aware preflight. It does not widen the old134/139/145
 * empty-user-data contracts. Resume accepts only the exact sealed database. */
export function preflightDesktop176(options:{normalUserData:string}):Desktop176Context{
 canonicalPlainJson(options);
 fact(arguments.length===1&&options&&typeof options==='object'&&Object.keys(options).length===1&&typeof options.normalUserData==='string','必须由main提供真实原normal USER_DATA。');
 fact(!!process.versions.electron,'只能在实际Electron main中取得预检票据。');
 const actualApp=require('electron').app as {getPath(name:string):string};
 fact(actualApp&&typeof actualApp.getPath==='function'&&folded(options.normalUserData)===folded(actualApp.getPath('userData')),'禁止由client/plan自称normal禁root；main须在setPath前取得真实默认root。');
 fact(process.env.NAMING_STUDIO_DESKTOP_WORKFLOW==='176'&&process.env.NAMING_STUDIO_SMOKE_SCOPE==='naming-v7'&&process.env.NAMING_STUDIO_SMOKE_EXIT==='1','marker/scope/EXIT不符。');
 const out=absolute(process.env.NAMING_STUDIO_SMOKE),userData=absolute(process.env.NAMING_STUDIO_USER_DATA),planFile=absolute(process.env.NAMING_STUDIO_DESKTOP176_INPUTS),planSha256=process.env.NAMING_STUDIO_DESKTOP176_INPUTS_SHA256;
 assertDesktop176UserDataIsolation(options.normalUserData,userData);
 fact(/^[a-f0-9]{64}$/.test(planSha256??''),'需固定输入计划SHA。');
 const outNodes=nodes(out,true),userNodes=nodes(userData,true),planNodes=nodes(planFile,false);reparseCheck([...outNodes,...userNodes,...planNodes]);
 fact(!contains(out,userData)&&!contains(userData,out)&&!contains(out,planFile)&&!contains(userData,planFile),'OUT/USER_DATA/输入计划必须独立。');fact(fs.readdirSync(out).length===0,'每阶段OUT必须为空，防止覆盖原响应。');
 const planBytes=fs.readFileSync(planFile);fact(hash(planBytes)===planSha256,'输入计划原字节改变。');const plan=JSON.parse(planBytes.toString('utf8')) as Desktop176Inputs;canonicalPlainJson(plan);
 fact(plan.schema==='desktop176-input-plan/1'&&plan.appVersion==='1.0.38'&&['Development','Installed'].includes(plan.mode)&&['exercise','resume'].includes(plan.phaseID),'输入计划的精确版本/阶段不符。');
 const inputRefs=[plan.inputFreeze,plan.workflowSource,...Object.values(plan.materialIdentity),plan.legacy70.database,plan.legacy70.sqlProof,...plan.legacy70.snapshots,...Object.values(plan.fortyLifecycleEvidence).filter(value=>typeof value==='object') as Desktop176Ref[],...(plan.resume?Object.values(plan.resume):[])];
 for(const ref of inputRefs){assertDesktop176Ref(ref);fact(!contains(out,ref.file)&&!contains(userData,ref.file),'冻结输入不得位于OUT或USER_DATA内。');readDesktop176Ref(ref);}
 parseDesktop176TestInputFreeze(JSON.parse(readDesktop176Ref(plan.inputFreeze).toString('utf8')));
 fact(plan.legacy70.database.sha256==='0d8280226ec6bf2ff2009c6baa2aea0e941081c9b0ead644a4632fb577e84af7'&&plan.legacy70.sqlProof.sha256==='6fb08a85e6d301bd6e0f3cf9532352c03fed0a3f3004582211d58fa9db3f7dac'&&plan.legacy70.snapshots.length===3,'旧70必须是批准的真实native3条原件，不借134或功能mock库替补。');
 if(plan.phaseID==='exercise')fact(!plan.resume&&fs.readdirSync(userData).length===0,'exercise必须新空库，不能已有resume输入。');
 else{
  fact(!!plan.resume,'resume缺前一进程输入。');const seal=JSON.parse(readDesktop176Ref(plan.resume.seal).toString('utf8')) as Desktop176ResumeSeal;
  fact(seal.schema==='desktop176-resume-seal/1'&&seal.mode===plan.mode&&folded(seal.userData)===folded(userData)&&seal.exercisePid!==process.pid&&seal.inputFreeze.sha256===plan.inputFreeze.sha256&&seal.workflowSource.sha256===plan.workflowSource.sha256,'resume不是同模式/来源/隔离库或PID未改变。');
  const actual=desktop176FileRef(join(userData,'customers.sqlite'));fact(actual.sha256===seal.database.sha256&&actual.bytes===seal.database.bytes,'resume启动前数据库与exercise seal不符。');
 }
 const context=freeze({kind:'desktop176-context/1' as const,out,userData,plan,prefix:desktop176Prefix(plan.mode,plan.phaseID)});contexts.set(context,{env:envKeys.map(key=>process.env[key]),outNodes,userNodes,planFile,planSha256:planSha256!,normalUserData:absolute(options.normalUserData)});return context;
}
export function assertDesktop176Context(context:Desktop176Context,userData?:string){
 const record=contexts.get(context);fact(record&&envKeys.every((key,index)=>process.env[key]===record.env[index]),'必须使用本进程预检票据，环境不得漂移。');
 fact(hash(fs.readFileSync(record.planFile))===record.planSha256,'预检输入计划被修改。');if(userData)fact(folded(userData)===folded(context.userData),'Store不属于本次隔离目录。');
 assertDesktop176UserDataIsolation(record.normalUserData,context.userData);
 for(const [current,expected]of [[nodes(context.out,true),record.outNodes],[nodes(context.userData,true),record.userNodes]])fact(current.length===expected.length&&current.every((node,index)=>node.identity===expected[index].identity),'原目录身份已改变。');
}
export function assertDesktop176PhaseMethod(context:Desktop176Context,method:string):void{assertDesktop176Context(context);assertDesktop176PhasePolicy(context.plan.phaseID,method);}
export function writeDesktop176Artifact(context:Desktop176Context,name:string,content:string|Uint8Array):Desktop176Ref{
 assertDesktop176Context(context);fact(/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)&&name.startsWith(context.prefix+'-')&&!name.includes('..'),'产物必须带本mode/phase前缀，且为直接子文件。');
 const file=join(context.out,name);fact(!fs.existsSync(file),'不覆盖已有原始产物。');const bytes=typeof content==='string'?Buffer.from(content):Buffer.from(content);nativeWriteNamingV7Artifact(contexts.get(context)!.outNodes,file,bytes);return desktop176FileRef(file);
}
export function desktop176ArtifactPath(context:Desktop176Context,name:string):string{assertDesktop176Context(context);fact(/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)&&name.startsWith(context.prefix+'-')&&!name.includes('..'),'目标须带本阶段前缀。');const file=join(context.out,name);fact(!fs.existsSync(file)&&!fs.existsSync(file+'.tmp'),'目标及临时路径必须不存在。');return file;}
