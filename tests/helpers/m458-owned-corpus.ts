import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {basename,dirname,isAbsolute,join,relative,resolve} from 'node:path';

const prefix='naming-m458-';
const same=(left:string,right:string)=>process.platform==='win32'?left.toLowerCase()===right.toLowerCase():left===right;
function inside(parent:string,target:string):boolean {
  const path=relative(parent,target);return path===''||(!path.startsWith('..')&&!isAbsolute(path));
}
export function actualDirectory(value:string):string {
  if(!isAbsolute(value))throw new Error('M458 fixture paths must be absolute');
  const absolute=resolve(value),stat=fs.lstatSync(absolute),actual=fs.realpathSync.native(absolute);
  if(!stat.isDirectory()||stat.isSymbolicLink()||!same(actual,absolute))throw new Error('M458 fixture directory must be actual, without an outward link');
  return actual;
}
/** Windows may spell the OS temp directory with a normal 8.3 name. Only
 * this implicit OS path is canonicalized; caller-supplied paths stay strict.
 * Inspect its lexical ancestors first so canonicalization cannot hide a link. */
function implicitTemporaryParent():string {
  const value=tmpdir();
  if(!isAbsolute(value))throw new Error('M458 fixture paths must be absolute');
  const absolute=resolve(value);
  for(let cursor=absolute;;cursor=dirname(cursor)){
    const stat=fs.lstatSync(cursor);
    if(!stat.isDirectory()||stat.isSymbolicLink())throw new Error('M458 implicit temporary parent contains a link or non-directory');
    if(dirname(cursor)===cursor)break;
  }
  return actualDirectory(fs.realpathSync.native(absolute));
}
export function actualFile(value:string):string {
  if(!isAbsolute(value))throw new Error('M458 fixture paths must be absolute');
  const absolute=resolve(value),stat=fs.lstatSync(absolute),actual=fs.realpathSync.native(absolute);
  if(!stat.isFile()||stat.isSymbolicLink()||!same(actual,absolute))throw new Error('M458 fixture input must be an actual regular file');
  return actual;
}
function tree(directory:string):void {
  for(const entry of fs.readdirSync(directory)){
    const file=join(directory,entry),stat=fs.lstatSync(file);
    if(stat.isSymbolicLink()||!same(fs.realpathSync.native(file),file))throw new Error('M458 fixture tree contains a link');
    if(stat.isDirectory())tree(file);else if(!stat.isFile())throw new Error('M458 fixture tree contains a non-regular input');
  }
}
export interface OwnedCorpus {
  readonly root:string;readonly dataDir:string;readonly sourceDir:string;
  file(value:string):string;
  close():void;
}
/** Only a fresh native temporary child becomes writable. Supplied directories
 * are a read-only source and a parent, never a reusable mutable corpus. */
export function createOwnedCorpus(sourceDirectory:string,parentDirectory?:string):OwnedCorpus {
  const sourceDir=actualDirectory(sourceDirectory),specifiedParent=parentDirectory??process.env.RUNNER_TEMP;
  const parent=specifiedParent===undefined?implicitTemporaryParent():actualDirectory(specifiedParent);
  if(inside(sourceDir,parent))throw new Error('M458 temporary parent must not be inside its source tree');
  tree(sourceDir);
  const root=fs.realpathSync.native(fs.mkdtempSync(join(parent,prefix))),identity=fs.lstatSync(root,{bigint:true});
  let closed=false;
  const assertRoot=()=>{
    if(closed)throw new Error('M458 owned fixture has already been cleaned');
    const stat=fs.lstatSync(root,{bigint:true});
    if(dirname(root)!==parent||!basename(root).startsWith(prefix)||stat.isSymbolicLink()||!stat.isDirectory()||stat.dev!==identity.dev||stat.ino!==identity.ino||!same(fs.realpathSync.native(root),root))throw new Error('M458 owned fixture identity changed');
  };
  const file=(value:string)=>{
    assertRoot();const absolute=resolve(value);
    if(!inside(root,absolute))throw new Error('M458 fault path escapes its exact owned root');
    const actualParent=fs.realpathSync.native(dirname(absolute));
    if(!inside(root,actualParent))throw new Error('M458 fault parent points outside its owned root');
    const stat=fs.lstatSync(absolute,{throwIfNoEntry:false});
    if(stat?.isSymbolicLink())throw new Error('M458 fault file is a link');
    if(stat&&!inside(root,fs.realpathSync.native(absolute)))throw new Error('M458 fault file points outside its owned root');
    return absolute;
  };
  const dataDir=join(root,'data');
  try{
    fs.cpSync(sourceDir,dataDir,{recursive:true,errorOnExist:true,force:false,dereference:false,filter:source=>{
      const stat=fs.lstatSync(source);if(stat.isSymbolicLink()||!same(fs.realpathSync.native(source),source))throw new Error('M458 source changed to a link during copy');return true;
    }});
    tree(dataDir);assertRoot();
  }catch(error){console.error('M458_PREPARATION_FAILURE_RETAINED',root);throw error;}
  return Object.freeze({root,dataDir,sourceDir,file,close(){assertRoot();tree(root);fs.rmSync(root,{recursive:true,force:false});closed=true;}});
}
