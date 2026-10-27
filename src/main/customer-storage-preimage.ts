import {closeSync,constants,copyFileSync,fstatSync,fsyncSync,lstatSync,openSync,readSync,realpathSync,type BigIntStats} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,isAbsolute,join,parse,resolve,sep} from 'node:path';
import {CUSTOMER_BACKUP_DATABASE_MAX_BYTES} from './customer-backup-envelope';

const fail=(detail:string):never=>{throw new Error('客户库恢复前原件未保留：'+detail);};
const folded=(file:string)=>process.platform==='win32'?file.toLowerCase():file;
const samePath=(left:string,right:string)=>folded(resolve(left))===folded(resolve(right));
const sameNode=(left:BigIntStats,right:BigIntStats)=>left.dev===right.dev&&left.ino===right.ino;
const sameFile=(left:BigIntStats,right:BigIntStats)=>sameNode(left,right)&&left.size===right.size&&left.mtimeNs===right.mtimeNs&&left.ctimeNs===right.ctimeNs;
const code=(error:unknown)=>error&&typeof error==='object'?Object.getOwnPropertyDescriptor(error,'code')?.value:undefined;
type DirectoryNode={path:string;stat:BigIntStats};

function directoryNodes(userDir:string):DirectoryNode[]{
 if(typeof userDir!=='string'||!isAbsolute(userDir))return fail('目录须为绝对实际路径。');
 const absolute=resolve(userDir),root=parse(absolute).root,nodes:DirectoryNode[]=[];
 let current=root;
 for(const part of ['',...absolute.slice(root.length).split(sep).filter(Boolean)]){
  if(part)current=join(current,part);
  const stat=lstatSync(current,{bigint:true});
  if(!stat.isDirectory()||stat.isSymbolicLink()||!samePath(realpathSync.native(current),current))return fail('目录或祖先含链接、重定向或非目录。');
  nodes.push({path:current,stat});
 }
 return nodes;
}
function recheckDirectories(nodes:DirectoryNode[]){
 for(const node of nodes){
  const stat=lstatSync(node.path,{bigint:true});
  if(!stat.isDirectory()||stat.isSymbolicLink()||!sameNode(node.stat,stat)||!samePath(realpathSync.native(node.path),node.path))return fail('保留期间目录身份已改变。');
 }
}
function regular(file:string):BigIntStats{
 const stat=lstatSync(file,{bigint:true});
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1n||!samePath(realpathSync.native(file),file))return fail('原件或目标须为无链接的实际普通文件。');
 return stat;
}
/** Compare bounded complete bytes on one native handle, then check its path again. */
function verifyFile(file:string,bytes:Buffer,expectedHash:string,flush=false,prior?:BigIntStats):BigIntStats{
 const initial=regular(file);
 if(initial.size!==BigInt(bytes.length)||prior&&!sameFile(prior,initial))return fail('文件长度或身份已改变。');
 const descriptor=openSync(file,(flush?constants.O_RDWR:constants.O_RDONLY)|(constants.O_NOFOLLOW??0));
 try{
  if(!sameFile(initial,fstatSync(descriptor,{bigint:true})))return fail('打开的文件身份不一致。');
  const hash=createHash('sha256'),chunk=Buffer.allocUnsafe(Math.min(bytes.length,1024*1024));
  let position=0;
  while(position<bytes.length){
   const count=readSync(descriptor,chunk,0,Math.min(chunk.length,bytes.length-position),position);
   if(count===0||!chunk.subarray(0,count).equals(bytes.subarray(position,position+count)))return fail('完整文件字节与计划不一致。');
   hash.update(chunk.subarray(0,count));position+=count;
  }
  if(readSync(descriptor,chunk,0,1,position)!==0||hash.digest('hex')!==expectedHash)return fail('完整文件摘要或结尾不一致。');
  if(flush)fsyncSync(descriptor);
  if(!sameFile(initial,fstatSync(descriptor,{bigint:true})))return fail('校验期间文件已改变。');
 }finally{closeSync(descriptor);}
 if(!sameFile(initial,regular(file)))return fail('关闭后文件身份已改变。');
 return initial;
}

/** Physical preimage only. The owning Store must authenticate database contents,
 * hold its writer lock and supply its own operation ID before calling this helper.
 * No failure deletes or overwrites an existing/partial preimage or the current DB. */
export function preserveCustomerStoragePreimage(userDir:string,currentBytes:Uint8Array,expectedHash:string,operation:{kind:'restore'|'compact';id:string}):string{
 const kind=operation?.kind,id=operation?.id;
 if(typeof expectedHash!=='string'||expectedHash.length!==64||!/^[a-f0-9]{64}$/.test(expectedHash)||!(currentBytes instanceof Uint8Array)||currentBytes.byteLength<1||currentBytes.byteLength>CUSTOMER_BACKUP_DATABASE_MAX_BYTES)return fail('计划摘要、字节或容量无效。');
 if(!['restore','compact'].includes(kind)||typeof id!=='string'||id.length<1||id.length>128||!/^[A-Za-z0-9]/.test(id)||/[^A-Za-z0-9_-]/.test(id))return fail('操作身份无效。');
 const bytes=Buffer.from(currentBytes);
 if(createHash('sha256').update(bytes).digest('hex')!==expectedHash)return fail('计划字节与摘要不一致。');
 const nodes=directoryNodes(userDir),directory=nodes[nodes.length-1].path;
 const current=join(directory,'customers.sqlite'),target=join(directory,`customers.before-${kind}-${expectedHash}-${id}.sqlite`);
 if(dirname(target)!==directory)return fail('目标超出受管目录。');
 const source=verifyFile(current,bytes,expectedHash);
 recheckDirectories(nodes);
 try{copyFileSync(current,target,constants.COPYFILE_EXCL);}
 catch(error){if(code(error)!=='EEXIST')throw error;}
 recheckDirectories(nodes);
 // Flushing never writes content. Suspicious existing targets are rejected before
 // opening for fsync; no cleanup removes evidence of failed/partial earlier copies.
 verifyFile(target,bytes,expectedHash,true);
 verifyFile(target,bytes,expectedHash);
 verifyFile(current,bytes,expectedHash,false,source);
 recheckDirectories(nodes);
 return target;
}
