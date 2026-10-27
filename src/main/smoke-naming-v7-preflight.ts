import {constants,lstatSync,realpathSync,readdirSync,openSync,fstatSync,readFileSync,closeSync} from 'node:fs';
import type {BigIntStats} from 'node:fs';
import {win32,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {nativeWriteNamingV7Artifact} from './smoke-naming-v7-native-writer';

const SQL_SHA='4b59b59967c9774c8e2064aff2cab6a4e705856c907c0e69cf4e8c8b077bf3f7';
const PROVENANCE_SHA='a9a2a82698de5c6eb1a5532e3f33faa1805a9fec7460c4112e33720ebecfb805';
const ENV_KEYS=['NAMING_STUDIO_SMOKE_SCOPE','NAMING_STUDIO_SMOKE','NAMING_STUDIO_USER_DATA','NAMING_STUDIO_SMOKE_EXIT','NAMING_STUDIO_V7_LEGACY_SQL','NAMING_STUDIO_V7_LEGACY_PROVENANCE'] as const;
const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
function fact(condition:unknown,message:string):asserts condition {if(!condition)throw new Error('命名7入口预检：'+message);}
const fold=(value:string)=>win32.normalize(value).toLowerCase();
interface PathNode {path:string;real:string;identity:string;directory:boolean;}
interface InspectedPath {path:string;real:string;identity:string;nodes:PathNode[];}
export interface NamingV7SmokeContext {
 readonly kind:'naming-v7-preflight/r3';readonly out:string;readonly userData:string;
 readonly legacySql:string;readonly legacyProvenance:string;readonly exit:'1';
 readonly legacySha256:string;readonly provenanceSha256:string;
}
interface PrivateContext {
 context:NamingV7SmokeContext;env:Record<typeof ENV_KEYS[number],string>;
 paths:{out:InspectedPath;user:InspectedPath;sql:InspectedPath;provenance:InspectedPath};
 fixtureBytes:Buffer;provenanceBytes:Buffer;
}
const contexts=new WeakMap<object,PrivateContext>();

/** V7-only input is an explicit intent, including a missing/misspelled scope. */
export function isNamingV7SmokeRequested():boolean {
 return process.env.NAMING_STUDIO_SMOKE_SCOPE==='naming-v7'||process.env.NAMING_STUDIO_V7_LEGACY_SQL!==undefined||process.env.NAMING_STUDIO_V7_LEGACY_PROVENANCE!==undefined;
}

function localAbsolute(value:unknown,label:string):string {
 fact(typeof value==='string'&&value.length>0&&value===value.trim(),label+'缺失或包含首尾空白');
 fact(/^[a-zA-Z]:[\\/]/.test(value)&&!/^\\\\/.test(value),label+'必须是本机驱动器绝对路径，不接受UNC或设备命名空间');
 const normalized=win32.normalize(value),root=win32.parse(normalized).root;
 fact(fold(normalized)!==fold(root),label+'不得指向文件系统根目录');
 const parts=value.slice(3).split(/[\\/]/);
 fact(parts.length>0&&parts.every(part=>part.length>0&&part!=='.'&&part!=='..'&&!/[. ]$/.test(part)&&!/[<>:"|?*\x00-\x1f]/.test(part)&&!/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part)),label+'包含歧义、保留或非普通文件名组件');
 return normalized;
}
function identity(stat:BigIntStats):string {fact(stat.ino!==0n,'文件系统没有可核验的文件身份');return stat.dev.toString()+':'+stat.ino.toString();}
function inspect(value:string,label:string,directory:boolean):InspectedPath {
 const path=localAbsolute(value,label),parsed=win32.parse(path),parts=path.slice(parsed.root.length).split(win32.sep),nodes:PathNode[]=[];
 let current=parsed.root;
 for(let index=-1;index<parts.length;index++){
  if(index>=0)current=win32.join(current,parts[index]);
  const stat=lstatSync(current,{bigint:true});
  fact(!stat.isSymbolicLink(),label+'的叶或祖先含符号链接/junction');
  const isLeaf=index===parts.length-1;
  fact(isLeaf?(directory?stat.isDirectory():stat.isFile()):stat.isDirectory(),label+'的路径类型不符');
  const real=realpathSync.native(current);
  // Real-path aliasing (including unexpected mount/SUBST resolution) is not silently accepted.
  fact(fold(real)===fold(current),label+'的实际路径与指定路径存在别名或重定向');
  nodes.push({path:current,real,identity:identity(stat),directory:stat.isDirectory()});
 }
 const leaf=nodes[nodes.length-1];return{path,real:leaf.real,identity:leaf.identity,nodes};
}

/** Stats.isSymbolicLink does not represent every Windows reparse tag. Read the native attribute bit too. */
function rejectAnyReparse(paths:InspectedPath[]):void {
 fact(process.platform==='win32','本验收只接受Windows本机路径，其他平台不降级');
 const names=[...new Set(paths.flatMap(item=>item.nodes.map(node=>node.path)))];
 const systemRoot=process.env.SystemRoot;
 fact(typeof systemRoot==='string'&&/^[a-zA-Z]:[\\/]/.test(systemRoot),'缺少可定位Windows只读属性查询的SystemRoot');
 const executable=win32.join(systemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe');
 const script="$ErrorActionPreference='Stop'; $guardJson=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String([Console]::In.ReadToEnd())); $guardPaths=ConvertFrom-Json -InputObject $guardJson; $guardResult=@(); for($guardIndex=0;$guardIndex -lt $guardPaths.Count;$guardIndex++){ $guardAttribute=[int][IO.File]::GetAttributes([string]$guardPaths[$guardIndex]); $guardResult+=@{index=$guardIndex;attributes=$guardAttribute;reparse=(($guardAttribute -band 1024) -ne 0)} }; [Console]::Out.Write((ConvertTo-Json -Compress -InputObject @($guardResult)))";
 let rows:unknown;
 try{const text=execFileSync(executable,['-NoLogo','-NoProfile','-NonInteractive','-Command',script],{input:Buffer.from(JSON.stringify(names),'utf8').toString('base64'),encoding:'utf8',windowsHide:true,timeout:15000,maxBuffer:1024*1024});rows=JSON.parse(text.replace(/^\uFEFF/,'').trim());}
 catch{throw new Error('命名7入口预检：Windows重解析属性查询失败，未降级放行');}
 fact(Array.isArray(rows)&&rows.length===names.length,'Windows属性结果不完整');
 for(let index=0;index<rows.length;index++){const row=rows[index];fact(row&&row.index===index&&Number.isInteger(row.attributes)&&typeof row.reparse==='boolean'&&row.reparse===false&&(row.attributes&1024)===0,'路径叶或祖先存在Windows重解析点，或属性无法确认');}
}
function contains(parent:InspectedPath,child:InspectedPath):boolean {
 if(child.nodes.some(node=>node.identity===parent.identity))return true;
 const relative=win32.relative(fold(parent.real),fold(child.real));
 return relative===''||relative!=='..'&&!relative.startsWith('..'+win32.sep)&&!win32.isAbsolute(relative);
}
function independent(paths:PrivateContext['paths']):void {
 fact(!contains(paths.out,paths.user)&&!contains(paths.user,paths.out),'输出和用户目录不得相同或双向嵌套');
 for(const input of [paths.sql,paths.provenance])fact(!contains(paths.out,input)&&!contains(paths.user,input),'旧输入不得位于输出或用户目录之内');
 fact(paths.sql.identity!==paths.provenance.identity,'两份旧输入不能是同一文件或硬链接别名');
}
function readPinned(path:InspectedPath,sha:string,bytes:number|undefined):Buffer {
 const fd=openSync(path.path,constants.O_RDONLY);
 try{const stat=fstatSync(fd,{bigint:true});fact(stat.isFile()&&identity(stat)===path.identity,'输入在校验期间被替换');fact(bytes===undefined?stat.size<=262144n:stat.size===BigInt(bytes),'旧输入大小不符');const data=readFileSync(fd);fact(digest(data)===sha,'旧输入原件摘要不符');return data;}finally{closeSync(fd);}
}

/** Read-only, complete preflight. Targets must already exist and be empty; no probe writes/mkdir. */
export function preflightNamingV7Smoke(out?:string):NamingV7SmokeContext {
 const env=Object.fromEntries(ENV_KEYS.map(key=>[key,process.env[key]])) as Record<typeof ENV_KEYS[number],string>;
 fact(env.NAMING_STUDIO_SMOKE_SCOPE==='naming-v7','scope必须明确为naming-v7');
 fact(ENV_KEYS.every(key=>typeof env[key]==='string'&&env[key].length>0),'必须同时指定scope、输出、用户目录、EXIT和真实134两份输入');
 fact(env.NAMING_STUDIO_SMOKE_EXIT==='1','EXIT必须严格等于1');
 const output=localAbsolute(env.NAMING_STUDIO_SMOKE,'输出');
 if(out!==undefined)fact(fold(localAbsolute(out,'输出参数'))===fold(output),'输出参数与SMOKE不一致');
 const paths={out:inspect(output,'输出',true),user:inspect(env.NAMING_STUDIO_USER_DATA,'用户目录',true),sql:inspect(env.NAMING_STUDIO_V7_LEGACY_SQL,'旧SQLite',false),provenance:inspect(env.NAMING_STUDIO_V7_LEGACY_PROVENANCE,'旧来源登记',false)};
 independent(paths);rejectAnyReparse(Object.values(paths));
 fact(readdirSync(paths.user.path).length===0,'USER_DATA必须是预先建立的全新空目录，不接受已有customers.sqlite或其他内容');
 fact(readdirSync(paths.out.path).length===0,'输出必须是预先建立的空目录');
 const fixtureBytes=readPinned(paths.sql,SQL_SHA,11005952),provenanceBytes=readPinned(paths.provenance,PROVENANCE_SHA,undefined);
 const provenance=JSON.parse(provenanceBytes.toString('utf8'));
 fact(provenance.capturedFromRelease==='1.0.34'&&provenance.sourceDatabaseSha256===SQL_SHA&&provenance.normalCustomerData===false&&Array.isArray(provenance.sessions)&&provenance.sessions.length===27,'受控134来源身份不符');
 const context=Object.freeze({kind:'naming-v7-preflight/r3' as const,out:paths.out.real,userData:paths.user.real,legacySql:paths.sql.real,legacyProvenance:paths.provenance.real,exit:'1' as const,legacySha256:SQL_SHA,provenanceSha256:PROVENANCE_SHA});
 contexts.set(context,{context,env,paths,fixtureBytes,provenanceBytes});return context;
}

/** Freshness is checked once before initialization; later checks preserve its authority and path identities. */
export function assertNamingV7SmokeContext(value:unknown,out?:string,userData?:string):asserts value is NamingV7SmokeContext {
 fact(!!value&&typeof value==='object'&&contexts.has(value),'缺少本进程早期完整预检票据');
 const record=contexts.get(value)!;
 fact(ENV_KEYS.every(key=>process.env[key]===record.env[key]),'预检后环境被改变');
 if(out!==undefined)fact(fold(localAbsolute(out,'输出参数'))===fold(record.context.out),'输出参数不符');
 if(userData!==undefined)fact(fold(localAbsolute(userData,'Store用户目录'))===fold(record.context.userData),'Store用户目录不符');
 const next={out:inspect(record.context.out,'输出',true),user:inspect(record.context.userData,'用户目录',true),sql:inspect(record.context.legacySql,'旧SQLite',false),provenance:inspect(record.context.legacyProvenance,'旧来源登记',false)};
 independent(next);rejectAnyReparse(Object.values(next));
 for(const key of ['out','user','sql','provenance'] as const)fact(next[key].identity===record.paths[key].identity,'预检后的路径身份发生变化：'+key);
}
export function readNamingV7SmokeInputs(context:NamingV7SmokeContext):{fixtureBytes:Buffer;provenanceBytes:Buffer} {
 assertNamingV7SmokeContext(context);const record=contexts.get(context)!;
 // Reading the original handles again proves unchanged source bytes; return independent copies.
 readPinned(record.paths.sql,SQL_SHA,11005952);readPinned(record.paths.provenance,PROVENANCE_SHA,undefined);
 return{fixtureBytes:Buffer.from(record.fixtureBytes),provenanceBytes:Buffer.from(record.provenanceBytes)};
}
export function namingV7SmokeArtifactPath(context:NamingV7SmokeContext,name:string):string {
 assertNamingV7SmokeContext(context);
 fact(/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)&&!name.includes('..'),'产物必须是输出目录中的普通单文件名');
 const file=localAbsolute(join(context.out,name),'产物');
 try{const stat=lstatSync(file,{bigint:true});fact(stat.isFile()&&!stat.isSymbolicLink(),'已有产物不是普通文件');const existing=inspect(file,'已有产物',false);rejectAnyReparse([existing]);fact(![contexts.get(context)!.paths.sql.identity,contexts.get(context)!.paths.provenance.identity].includes(identity(stat)),'产物不能别名到输入');}
 catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 return file;
}
export function writeNamingV7SmokeArtifact(context:NamingV7SmokeContext,name:string,bytes:string|Uint8Array):string {
 const file=namingV7SmokeArtifactPath(context,name),record=contexts.get(context)!;
 // Path inspection is diagnostic only. The native writer must reacquire and
 // authenticate every original directory under no-write/no-delete sharing and
 // retain those handles until its temporary file has been renamed by handle.
 // No artifact byte is written by Node before the physical constraint exists.
 nativeWriteNamingV7Artifact(record.paths.out.nodes.map(node=>({path:node.path,identity:node.identity})),file,typeof bytes==='string'?Buffer.from(bytes,'utf8'):bytes);
 return file;
}
export function writeNamingV7SmokeFile(context:NamingV7SmokeContext,file:string,bytes:string|Uint8Array):string {
 const name=win32.basename(file),expected=namingV7SmokeArtifactPath(context,name);
 fact(fold(localAbsolute(file,'产物绝对路径'))===fold(expected),'不能写入预检输出目录以外的文件');
 return writeNamingV7SmokeArtifact(context,name,bytes);
}
export function assertNamingV7SmokeExport(context:NamingV7SmokeContext,file:string):void {
 const name=win32.basename(file),expected=namingV7SmokeArtifactPath(context,name);
 fact(fold(localAbsolute(file,'PDF目标'))===fold(expected)&&/\.pdf$/i.test(name),'PDF只能导出到已验证输出目录');
 // The real exporter uses a temporary sibling. It must not reuse any caller-supplied leaf.
 for(const candidate of [expected,expected+'.tmp']){
  try{lstatSync(candidate);throw new Error('命名7入口预检：PDF目标或临时路径已存在，不复用');}
  catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 }
}
