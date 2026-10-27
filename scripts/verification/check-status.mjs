import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {safeRoot,safeRelativeInput,newEvidencePath,writeNewJson} from './safe-paths.mjs';

export function checkStatus(root,{requireReleaseEvidence=false}={}){
  root=safeRoot(root);
  const pkg=JSON.parse(fs.readFileSync(safeRelativeInput(root,'package.json'),'utf8'));
  const status=fs.readFileSync(safeRelativeInput(root,'docs/CURRENT-STATUS.md'),'utf8');
  const match=/^##\s+已交付[：:]\s*(\d+\.\d+\.\d+)\s*$/m.exec(status);
  if(!match)throw new Error('Current status needs exactly one published-version heading');
  if([...status.matchAll(/^##\s+已交付[：:]\s*\d+\.\d+\.\d+\s*$/gm)].length!==1)throw new Error('Multiple current published versions');
  const publishedVersion=match[1],compare=(a,b)=>{const aa=a.split('.').map(Number),bb=b.split('.').map(Number);for(let i=0;i<3;i++){if(aa[i]!==bb[i])return aa[i]-bb[i];}return 0;};
  if(!/^\d+\.\d+\.\d+$/.test(pkg.version)||compare(pkg.version,publishedVersion)<0)throw new Error('Current source version cannot precede the published version');
  const expected='NamingStudio-'+publishedVersion+'-verification.json';
  if(!status.includes('../release/'+expected))throw new Error('Published version and authoritative verification link disagree');
  const counts=/最近一次已交付版本的完整回归为\s*\*\*(\d+)\s*个测试文件[、，,]\s*(\d+)\s*项通过\*\*/.exec(status);
  if(!counts)throw new Error('Current status must label the published regression count explicitly');
  const manifestPath=path.join(root,'release',expected),available=fs.existsSync(manifestPath);
  if(requireReleaseEvidence&&!available)throw new Error('Published release evidence was required but is absent');
  if(available){
    const release=JSON.parse(fs.readFileSync(safeRelativeInput(root,path.relative(root,manifestPath)),'utf8'));
    if(release.version!==publishedVersion||release.status!=='local-verified-release'||release.verification?.fullRegression?.files!==Number(counts[1])||release.verification?.fullRegression?.tests!==Number(counts[2]))throw new Error('Published version or test counts differ from the authoritative release record');
  }
  return {schema:'current-status-check/1',status:'passed',sourceVersion:pkg.version,publishedVersion,publishedRegression:{files:Number(counts[1]),tests:Number(counts[2])},releaseRecord:manifestPath,releaseEvidence:available?'present-and-metadata-matched':'not-present-in-source-checkout',scope:available?'Document version/count identity checked; use the release verifier for artifact bytes and evidence.':'Source-only check. A clean checkout does not ship ignored installers or historical local evidence; published runtime, signing and cross-machine acceptance are not inferred.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    let root=process.cwd(),output,required=false;const args=process.argv.slice(2);
    for(let i=0;i<args.length;i++)if(args[i]==='--require-release-evidence')required=true;else if(['--root','--output'].includes(args[i])&&args[i+1]){const name=args[i++];if(name==='--root')root=args[i];else output=args[i];}else throw new Error('Unsupported status option: '+args[i]);
    if(output)newEvidencePath(root,path.resolve(output));const result=checkStatus(root,{requireReleaseEvidence:required});if(output)writeNewJson(root,path.resolve(output),result);console.log(JSON.stringify(result,null,2));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
