import fs from 'node:fs';import path from 'node:path';import {tmpdir} from 'node:os';import {randomUUID,createHash} from 'node:crypto';import {createRequire} from 'node:module';import {runInNewContext} from 'node:vm';import {spawn,execFileSync} from 'node:child_process';import {once} from 'node:events';import ts from 'typescript';
export const hash=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
export const nativePath=()=>path.resolve(process.env.NAMING_SMOKE_V7_NATIVE||'src/main/smoke-naming-v7-native-writer.ts');
export interface NativeCase {root:string;out:string;ancestor:string;alternate:string;input:string;nodes:{path:string;identity:string}[];cleanup:()=>void;}
export function nativeCase(label:string):NativeCase {
 const requestedParent=path.resolve(process.env.NAMING_SMOKE_V7_TEST_WORK||path.join(tmpdir(),'naming-native-tests'));
 fs.mkdirSync(requestedParent,{recursive:true});
 // Keep the fixture path identical to the native handle's physical name,
 // even when Windows TEMP is configured with an8.3 alias.
 const parent=fs.realpathSync.native(requestedParent);const root=fs.mkdtempSync(path.join(parent,'native-'+label+'-')),ancestor=path.join(root,'ancestor'),out=path.join(ancestor,'out'),alternate=path.join(root,'alternate'),input=path.join(root,'controlled-input.txt');
 fs.mkdirSync(out,{recursive:true});fs.mkdirSync(path.join(alternate,'out'),{recursive:true});fs.writeFileSync(input,'CONTROLLED_NATIVE_INPUT');
 const names:string[]=[];for(let cursor=out;;cursor=path.dirname(cursor)){names.unshift(cursor);if(cursor===path.dirname(cursor))break;}
 const nodes=names.map(file=>{const stat=fs.lstatSync(file,{bigint:true});return{path:file,identity:stat.dev+':'+stat.ino};});
 return{root,out,ancestor,alternate,input,nodes,cleanup:()=>{if(!path.resolve(root).startsWith(parent+path.sep))throw new Error('Unsafe native test cleanup');fs.rmSync(root,{recursive:true,force:true});}};
}
type Writer=(nodes:{path:string;identity:string}[],file:string,bytes:Uint8Array)=>void;
export function loadWriter(transform?:(script:string)=>string):{write:Writer;sourceSha256:string} {
 const file=nativePath(),source=fs.readFileSync(file,'utf8'),module:{exports:Record<string,unknown>}={exports:{}},require=createRequire(path.join(process.cwd(),'package.json'));
 const env=new Proxy({...process.env},{get:(target,key)=>typeof key==='string'?target[Object.keys(target).find(name=>name.toLowerCase()===key.toLowerCase())||key]:Reflect.get(target,key)});
 const importer=(id:string)=>{if(id==='node:child_process')return{execFileSync:(executable:string,args:string[],options:unknown)=>{const altered=[...args];if(transform)altered[altered.length-1]=transform(altered[altered.length-1]);return execFileSync(executable,altered,options as Parameters<typeof execFileSync>[2]);}};return require(id);};
 runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:importer,process:{env,platform:process.platform},Buffer,Uint8Array},{filename:file});
 return{write:module.exports.nativeWriteNamingV7Artifact as Writer,sourceSha256:hash(source)};
}
const actor=String.raw`param([string]$Request)
$ErrorActionPreference='Stop'
$r=ConvertFrom-Json ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Request)))
$ready=[Threading.EventWaitHandle]::new($false,[Threading.EventResetMode]::ManualReset,('Local\NamingV7Ready'+$r.nonce))
$go=[Threading.EventWaitHandle]::new($false,[Threading.EventResetMode]::ManualReset,('Local\NamingV7Go'+$r.nonce))
$done=[Threading.EventWaitHandle]::new($false,[Threading.EventResetMode]::ManualReset,('Local\NamingV7Done'+$r.nonce))
$held=$null;$result=@{mode=$r.mode;gateSeen=$false;mutationSucceeded=$false;error=0;inputBefore=[IO.File]::ReadAllText($r.input)}
try {
 if(-not $ready.WaitOne(20000)){throw 'Missing native test gate'};$result.gateSeen=$true
 if($r.mode -eq 'hold-write'){
  Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;using Microsoft.Win32.SafeHandles;public static class NativeRaceActor{[DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]public static extern SafeFileHandle CreateFileW(string p,uint a,uint s,IntPtr q,uint d,uint f,IntPtr t);}'
  $held=[NativeRaceActor]::CreateFileW($r.out,0x40000000,7,[IntPtr]::Zero,3,0x02200000,[IntPtr]::Zero)
  if($held.IsInvalid){throw 'Failed to acquire preexisting writer'};$result.mutationSucceeded=$true
 }else{
  $target=if($r.mode -eq 'out'){$r.out}elseif($r.mode -eq 'ancestor'){$r.ancestor}else{[IO.Directory]::GetFiles($r.out,'.naming-v7-*.tmp')[0]}
  if(-not $target){throw 'Missing native temporary leaf'};$result.target=$target
  try{
   if($r.mode -eq 'temp'){[IO.File]::Move($target,$target+'.held');New-Item -ItemType HardLink -Path $target -Target $r.input | Out-Null}
   else{[IO.Directory]::Move($target,$target+'-held');New-Item -ItemType Junction -Path $target -Target $r.alternate | Out-Null}
   $result.mutationSucceeded=$true
  }catch{$result.error=$_.Exception.GetBaseException().HResult -band 65535;$result.message=$_.Exception.Message}
 }
}catch{$result.actorError=$_.Exception.ToString()}
finally{
 $result.inputAfter=[IO.File]::ReadAllText($r.input)
 [IO.File]::WriteAllText($r.report,(ConvertTo-Json -Depth 8 -Compress -InputObject $result),[Text.UTF8Encoding]::new($false))
 $go.Set() | Out-Null
 if($null -ne $held){$done.WaitOne(20000) | Out-Null;$held.Dispose()}
 $ready.Dispose();$go.Dispose();$done.Dispose()
}
`;
export async function interleave(value:NativeCase,point:'before-open'|'before-write'|'before-rename'|'before-locks',mode:'out'|'ancestor'|'temp'|'hold-write'){
 const nonce=randomUUID().replaceAll('-',''),actorFile=path.join(value.root,'actor.ps1'),report=path.join(value.root,'actor-result.json');fs.writeFileSync(actorFile,actor);
 const request=Buffer.from(JSON.stringify({...value,cleanup:undefined,nodes:undefined,nonce,mode,report}),'utf8').toString('base64'),executable=path.win32.join(process.env.SystemRoot||Object.entries(process.env).find(([key])=>key.toLowerCase()==='systemroot')![1]!,'System32/WindowsPowerShell/v1.0/powershell.exe');
 const child=spawn(executable,['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',actorFile,'-Request',request],{windowsHide:true,stdio:['ignore','pipe','pipe']});let actorStderr='';child.stderr.on('data',bytes=>{actorStderr+=bytes.toString();});const exited=once(child,'exit');
 const eventPrefix='Local'+String.fromCharCode(92);
 const gate=`private static void TestGate(){using(var ready=new System.Threading.EventWaitHandle(false,System.Threading.EventResetMode.ManualReset,@"${eventPrefix}NamingV7Ready${nonce}"))using(var go=new System.Threading.EventWaitHandle(false,System.Threading.EventResetMode.ManualReset,@"${eventPrefix}NamingV7Go${nonce}")){ready.Set();if(!go.WaitOne(20000))throw new IOException("Test gate timeout");}}`;
 const needle=point==='before-open'?'        temporary = CreateFileW(temporaryPath,':point==='before-write'?'        if (bytes.Length != 0) {':point==='before-rename'?'        RenameHeldFile(temporary, file);':'      List<SafeFileHandle> directories';
 const writer=loadWriter(script=>{if(script.split(needle).length!==2)throw new Error('Gate anchor count differs');return script.replace('public static class AtomicWriter {','public static class AtomicWriter {\n'+gate+'\n').replace(needle,needle.match(/^ */)![0]+'TestGate();\n'+needle);});
 const destination=path.join(value.out,'race-artifact.json'),bytes=Buffer.from('NATIVE_RACE_CONTROLLED_BYTES');let error='';
 try{writer.write(value.nodes,destination,bytes);}catch(caught){error=String(caught);}
 finally{if(mode==='hold-write')execFileSync(executable,['-NoLogo','-NoProfile','-NonInteractive','-Command',`$e=[Threading.EventWaitHandle]::OpenExisting('${eventPrefix}NamingV7Done${nonce}');$e.Set()|Out-Null;$e.Dispose()`],{windowsHide:true,stdio:'pipe'});}
 await exited;
 const externalFiles:string[]=[];const walk=(directory:string)=>{for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const item=path.join(directory,entry.name);if(entry.isDirectory())walk(item);else externalFiles.push(item);}};walk(value.alternate);
 const result={point,mode,destination,bytes,error,actor:JSON.parse(fs.readFileSync(report,'utf8')),actorStderr,sourceSha256:writer.sourceSha256,alternateEntries:fs.readdirSync(value.alternate),externalFiles,input:fs.readFileSync(value.input,'utf8')};
 if(process.env.NAMING_NATIVE_TRACE_FILE)fs.appendFileSync(process.env.NAMING_NATIVE_TRACE_FILE,JSON.stringify(result)+'\n');
 return result;
}
