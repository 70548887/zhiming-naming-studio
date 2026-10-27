import fs from 'node:fs';
import path from 'node:path';
const groups=['c2-native-environment','c2-fixed-core-environment','legacy-external-environment','windows-path-environment','cultural-fixed-source-environment','explicit-output-environment','desktop-runtime-environment'];
const relative=value=>typeof value==='string'&&value.startsWith('tests/')&&!path.isAbsolute(value)&&!value.includes('\\')&&value.split('/').every(part=>part&&part!=='.'&&part!=='..');
function regularFile(file,label){let stat;try{stat=fs.lstatSync(file);}catch(error){throw Error(label+': required regular file is missing or unreadable: '+file,{cause:error});}if(!stat.isFile()||stat.isSymbolicLink())throw Error(label+': required regular file is not installed: '+file);}
function physicalDirectory(directory,label){if(typeof directory!=='string'||!path.isAbsolute(directory))throw Error(label+': explicit absolute directory required');let stat;try{stat=fs.lstatSync(directory);}catch(error){throw Error(label+': directory is missing or unreadable',{cause:error});}if(!stat.isDirectory()||stat.isSymbolicLink())throw Error(label+': ordinary physical directory required');return directory;}
export function environmentTestSelection({root,manifest,env,platform=process.platform}){
 if(typeof root!=='string'||!path.isAbsolute(root)||manifest?.schema!=='naming-test-environment-partition/1'||!Array.isArray(manifest.entries)||!Array.isArray(manifest.integrationDependencies))throw Error('Invalid environment partition configuration');
 const group=env.NAMING_ENVIRONMENT_TEST_GROUP;if(!groups.includes(group))throw Error('Choose an explicit known NAMING_ENVIRONMENT_TEST_GROUP; missing prerequisites are not skipped acceptance.');
 const all=[...manifest.entries,...manifest.integrationDependencies],seen=new Set();
 for(const entry of all){if(!relative(entry?.file)||!groups.includes(entry.group)||seen.has(entry.file))throw Error('Invalid or duplicate explicit environment file');seen.add(entry.file);}
 for(const companion of manifest.portableCompanions??[])if(seen.has(companion.file))throw Error('Portable companion must not be excluded: '+companion.file);
 const selected=all.filter(entry=>entry.group===group);if(!selected.length)throw Error('Selected environment group has no declared tests');
 for(const entry of selected)regularFile(path.join(root,...entry.file.split('/')),'Environment test '+entry.file);
 for(const entry of selected)if(entry.cpuWindowFlag!==undefined){
  if(!['M937_ACTUAL_CPU_WINDOW','M937_REPLAY_CPU_WINDOW'].includes(entry.cpuWindowFlag))throw Error('Unknown explicit CPU-window prerequisite');
  if(env[entry.cpuWindowFlag]!=='1')throw Error(entry.cpuWindowFlag+' must explicitly equal 1 for '+entry.file+'; this preflight never opens a heavy CPU window automatically');
 }
 if(group.startsWith('c2-')){
  const material=physicalDirectory(env.CANDIDATE2_ACCEPTANCE_M873_DIR,'CANDIDATE2_ACCEPTANCE_M873_DIR');
  for(const file of ['compiled-r2/consumer.cjs','runs/run-3/consumer-execution-manifest.json','runs/run-3/persisted-envelope.json','runs/run-3/source-blobs-managed.sqlite'])regularFile(path.join(material,...file.split('/')),'Fixed M873 material');
 }
 const environment={};
 if(group==='legacy-external-environment'){
  environment.M919_REPLAY_REQUIRE_FIXTURE='1';
  const fixture=physicalDirectory(env.M919_REPLAY_FIXTURE_DIR,'M919_REPLAY_FIXTURE_DIR');
  for(const file of ['synthetic-three-revisions.nsbk','synthetic-three-revisions-identity.json'])regularFile(path.join(fixture,file),'M919 fixture');
 }
 if(group==='windows-path-environment'){
  if(platform!=='win32')throw Error('Windows physical path tests require Windows');
  physicalDirectory(env.M938_PATH_TEST_ROOT,'M938_PATH_TEST_ROOT');
 }
 if(group==='cultural-fixed-source-environment'){
  const fixture=physicalDirectory(env.M925_REAL_RESTORE_CASE,'M925_REAL_RESTORE_CASE');
  regularFile(path.join(fixture,'fixture','synthetic-three-revisions.nsbk'),'M925 actual sealed NSBK');
 }
 for(const entry of selected)if(entry.outputEnvironment)physicalDirectory(env[entry.outputEnvironment],entry.outputEnvironment);
 return {group,include:selected.map(entry=>entry.file),environment,acceptanceAuthority:false,scope:'file and prerequisite shape only; actual tests authenticate content and execute separately'};
}
