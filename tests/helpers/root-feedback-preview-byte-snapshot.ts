import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

/** Includes membership as well as bytes, so new generated asset files fail. */
export function previewSourceSnapshot(root:string){
  const records:Array<{file:string;bytes:number;sha256:string}>=[];
  const visit=(relative:string)=>{
    const file=path.join(root,relative),stat=fs.lstatSync(file);
    if(stat.isSymbolicLink())throw Error('Linked snapshot source: '+relative);
    if(stat.isDirectory()){for(const child of fs.readdirSync(file).sort())visit(relative+'/'+child);}
    else{const bytes=fs.readFileSync(file);records.push({file:relative,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
  };
  for(const name of ['src','scripts','data','assets','package.json','tsconfig.json'])if(fs.existsSync(path.join(root,name)))visit(name);
  return records;
}
