import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createM921GenerationFixture} from '../tests/helpers/m921-generation-fixture';
const root=path.resolve(process.argv[2]??'');if(!process.argv[2])throw Error('Evidence root required');
const output=path.join(root,'official-fixture.json');if(fs.existsSync(output))throw Error('Never replace an official fixture record');
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const owned=await createM921GenerationFixture(process.cwd());
// The owned fixture is intentionally preserved in this dedicated D case for
// four read-only processes; no archive/runtime or original file is overwritten.
if(!path.resolve(owned.root).startsWith(path.join(root,'tmp')+path.sep))throw Error('Official fixture must live in this managed D temp root');
const baseline=await import(pathToFileURL(path.resolve('.local/m938/baseline-paths.mjs')).href),candidate=await import(pathToFileURL(path.resolve('.local/m938/candidate-paths.mjs')).href);
const resources:{path:string;bytes:number;sha256:string}[]=[],directories:string[]=[];
function inspect(directory:string){directories.push(directory);for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())inspect(file);else if(entry.isFile()){const bytes=fs.readFileSync(file);resources.push({path:path.relative(owned.root,file).replaceAll('\\','/'),bytes:bytes.length,sha256:hash(bytes)});}else throw Error('Official fixture must be physical');}}
inspect(owned.root);
for(const directory of directories){baseline.__m938PhysicalDirectory(directory);candidate.__m938PhysicalDirectory(directory);}
for(const entry of resources){const file=path.join(owned.root,entry.path);if(baseline.__m938PhysicalFile(file)!==file||candidate.__m938PhysicalFile(file)!==file)throw Error('Official fixed path identity changed');}
const original='D:/Codex-NamingStudio-Evidence/m925-candidate2-store/runs/native-single-01/single-native-customers.sqlite',bytes=fs.readFileSync(original),expected='ed28859a002328ad9a9c03fa8ef3881c194a37fb0bad836fe94e948adc246fb1';
if(hash(bytes)!==expected)throw Error('Actual native DB original changed');const copy=path.join(root,'input-customers.sqlite');fs.writeFileSync(copy,bytes,{flag:'wx'});
const value={schema:'m938-official-readonly-fixture/1',root:owned.root,applicationBundlePath:owned.applicationBundlePath,assetDir:owned.assetDir,dataDir:owned.dataDir,consumerPublicationDir:owned.consumerPublicationDir,database:{original,copy,bytes:bytes.length,sha256:expected},directoriesCompared:directories.length,filesCompared:resources.length,resources,fixturePreserved:true,ownerVerifyCalls:0};
fs.writeFileSync(output+'.tmp',JSON.stringify(value,null,2)+'\n');fs.renameSync(output+'.tmp',output);console.log(JSON.stringify({output,root:owned.root,directoriesCompared:directories.length,filesCompared:resources.length,ownerVerifyCalls:0}));
