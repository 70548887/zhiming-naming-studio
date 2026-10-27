import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

const key=value=>process.platform==='win32'?path.resolve(value).toLowerCase():path.resolve(value);
export function isInside(root,target){const relative=path.relative(key(root),key(target));return !!relative&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);}

/** Every existing component is inspected; lexical containment never authorizes a junction. */
export function assertNoReparse(target,{allowMissing=false}={}){
  if(typeof target!=='string'||!target||/[\u0000-\u001f]/u.test(target))throw new Error('Invalid filesystem path');
  const absolute=path.resolve(target),parsed=path.parse(absolute);let current=parsed.root,missing=false;
  for(const component of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)){
    if(component==='.'||component==='..'||process.platform==='win32'&&/[<>:"|?*]/u.test(component))throw new Error('Unsafe filesystem path component');
    current=path.join(current,component);
    if(missing)continue;
    let stat;try{stat=fs.lstatSync(current);}catch(error){if(error.code==='ENOENT'&&allowMissing){missing=true;continue;}throw error;}
    if(stat.isSymbolicLink())throw new Error('Filesystem reparse point or symbolic link is not allowed: '+current);
    // Normal NTFS 8.3 names may canonicalize without being a reparse point.
    // The lstat decision above is made before following any component.
    current=fs.realpathSync.native(current);
  }
  if(missing&&!allowMissing)throw new Error('Expected existing filesystem input');
  return current;
}
export function safeRoot(root){const absolute=assertNoReparse(path.resolve(root));if(!fs.statSync(absolute).isDirectory())throw new Error('Project root must be a directory');return absolute;}
export function safeInput(root,file,{allowExternal=false}={}){
  const base=safeRoot(root),declared=path.resolve(file);
  if(!allowExternal&&!isInside(base,declared))throw new Error('Input escapes project root: '+file);
  const target=assertNoReparse(declared);
  if(!allowExternal&&!isInside(base,target))throw new Error('Input escapes project root: '+file);
  return target;
}
export function safeRelativeInput(root,file){
  if(typeof file!=='string'||!file||path.isAbsolute(file)||path.win32.isAbsolute(file)||file.replaceAll('\\','/').split('/').some(part=>!part||part==='.'||part==='..'))throw new Error('Input escapes project or is not a safe relative path');
  const base=safeRoot(root);return safeInput(base,path.resolve(base,file));
}

/** Reports may only be newly created under explicit, non-product evidence roots. */
export function newEvidencePath(root,file){
  const base=safeRoot(root),declared=path.resolve(file);
  if(!isInside(base,declared))throw new Error('Evidence output must remain inside the selected project root');
  const target=assertNoReparse(declared,{allowMissing:true});
  if(!isInside(base,target))throw new Error('Evidence output must remain inside the selected project root');
  const first=path.relative(base,target).split(path.sep)[0].toLowerCase();
  if(!['verification-output','.local'].includes(first))throw new Error('Evidence output must be under verification-output or .local; product inputs are protected');
  if(fs.existsSync(target))throw new Error('Evidence output already exists; never overwrite inputs or earlier evidence');
  return target;
}
function ensureSafeDirectories(root,directory){
  const base=safeRoot(root),relative=path.relative(base,directory);if(!isInside(base,directory))throw new Error('Evidence parent must remain inside project');
  let current=base;
  for(const component of relative.split(path.sep).filter(Boolean)){
    current=path.join(current,component);
    try{fs.mkdirSync(current);}catch(error){if(error.code!=='EEXIST')throw error;}
    assertNoReparse(current);if(!fs.statSync(current).isDirectory())throw new Error('Evidence parent is not a directory');
  }
}
export function reserveEvidenceDirectory(root,directory){const target=newEvidencePath(root,directory);ensureSafeDirectories(root,path.dirname(target));fs.mkdirSync(target);assertNoReparse(target);return target;}
export function writeNewJson(root,file,value){
  const target=newEvidencePath(root,file);ensureSafeDirectories(root,path.dirname(target));
  const temporary=path.join(path.dirname(target),'.'+path.basename(target)+'.'+randomUUID()+'.tmp');
  const bytes=JSON.stringify(value,null,2)+'\n';fs.writeFileSync(temporary,bytes,{flag:'wx'});
  try{assertNoReparse(path.dirname(target));if(fs.existsSync(target))throw new Error('Evidence appeared before commit; refusing overwrite');fs.linkSync(temporary,target);}finally{fs.unlinkSync(temporary);}
  return target;
}
