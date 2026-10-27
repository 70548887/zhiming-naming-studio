import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(process.argv[2]??'');if(!process.argv[2])throw Error('Evidence root required');
const output=path.join(root,'extra-path-guards.json');if(fs.existsSync(output))throw Error('Never overwrite prior guards');
const a=await import(pathToFileURL(path.resolve('.local/m938/baseline-paths.mjs')).href),b=await import(pathToFileURL(path.resolve('.local/m938/candidate-paths.mjs')).href);
const directory=path.join(root,'literal~路径 space');fs.mkdirSync(directory);const file=path.join(directory,'文件~1.txt');fs.writeFileSync(file,'literal tilde');
const cases=[];
for(const [kind,target]of [['directory',directory],['file',file]]){const method=kind==='file'?'__m938PhysicalFile':'__m938PhysicalDirectory',before=a[method](target),after=b[method](target);if(before!==after)throw Error('Literal tilde path outcome differs');cases.push({kind,target,equal:true});}
const fixed=JSON.parse(fs.readFileSync(path.join(root,'official-fixture.json'),'utf8')),target=path.join(fixed.root,fixed.resources.find(row=>row.path==='data/knowledge-v6.sqlite').path);
const native=Object.getOwnPropertyDescriptor(fs.realpathSync,'native');if(!native)throw Error('Missing native descriptor');
try{Object.defineProperty(fs.realpathSync,'native',{...native,value(){throw Error('M938 changed late native property');}});if(b.__m938PhysicalFile(target)!==target)throw Error('Captured native primitive changed');cases.push({kind:'captured-native-property-after-module-load',equal:true});}finally{Object.defineProperty(fs.realpathSync,'native',native);}
fs.writeFileSync(output+'.tmp',JSON.stringify({schema:'m938-extra-path-guards/1',cases,shortAliasActual8dot3:'not executed; literal tilde and namespace/UNC dispatch retain original resolver',passed:true},null,2)+'\n');fs.renameSync(output+'.tmp',output);console.log(JSON.stringify({cases:cases.length,passed:true}));
