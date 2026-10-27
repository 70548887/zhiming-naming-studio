import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyNamingEditorialV7,verifyNamingCharacterMeanings71 } from './naming-editorial-v7-rebuild.mjs';

const args=process.argv.slice(2);
if(args.length===1&&args[0]==='--help')console.log('Usage: node scripts/build-naming-editorial-v7.mjs --verify (offline, read-only)');
else if(args.length===3&&args[0]==='--profile'&&args[1]==='naming-character-meanings-v7.1/1'&&args[2]==='--verify'){
  try{const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));console.log(JSON.stringify(verifyNamingCharacterMeanings71(file=>fs.readFileSync(path.join(root,file))),null,2));}
  catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}
}
else if(args.length!==1||args[0]!=='--verify'){
  console.error('Usage: node scripts/build-naming-editorial-v7.mjs --verify. No default data writes.');
  process.exitCode=2;
}else{
  try{
    const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
    const readBytes=file=>fs.readFileSync(path.join(root,file));
    console.log(JSON.stringify(verifyNamingEditorialV7(readBytes),null,2));
  }catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}
}
