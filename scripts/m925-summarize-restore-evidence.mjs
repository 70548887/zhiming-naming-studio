import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(process.argv[2]??''),runs=process.argv.slice(3);
if(runs.length!==4)throw Error('Four chronological ABBA runs required');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'input-manifest.json'),'utf8'));
const rows=runs.map(id=>{
 const directory=path.join(root,'runs',id),record=JSON.parse(fs.readFileSync(path.join(directory,'run.json'),'utf8')),result=JSON.parse(fs.readFileSync(path.join(directory,'result.json'),'utf8'));
 if(record.status!=='passed'||record.profile||record.inputSha256!==manifest.fixtureSha256)throw Error('Missing valid unprofiled real run '+id);
 return {...record,installedSha256:result.installedSha256,preimageSha256:result.preimageSha256,cleanStagingHash:result.plan.cleanStagingHash,recordSha256:hash(fs.readFileSync(path.join(directory,'run.json')))};
});
for(let i=1;i<rows.length;i++)if(Date.parse(rows[i].startedUtc)<Date.parse(rows[i-1].finishedUtc))throw Error('Runs overlap or ABBA order is false');
if(new Set(rows.map(row=>row.pid)).size!==4)throw Error('Expected separate fresh Node processes');
const outputEquivalence=JSON.parse(fs.readFileSync(path.join(root,'restored-content-differences.json'),'utf8'));
if(!outputEquivalence.passed||JSON.stringify(outputEquivalence.runs)!==JSON.stringify(runs)||new Set(rows.map(row=>row.preimageSha256)).size!==1)throw Error('Validated restore content/preimages differ');
const phase=(row,name)=>{const value=row.completed.find(item=>item.phase===name);if(!value)throw Error('Missing phase '+name);return value;};
const comparisons=['prepare','commit'].map(name=>{
 const a=[phase(rows[0],name),phase(rows[3],name)],b=[phase(rows[1],name),phase(rows[2],name)];
 const average=(values,key)=>values.reduce((sum,row)=>sum+row[key],0)/values.length;
 const baselineMs=average(a,'elapsedMs'),candidateMs=average(b,'elapsedMs');
 return {phase:name,baselineMs,candidateMs,reductionPercent:(1-candidateMs/baselineMs)*100,baselineCpuUserUs:average(a,'cpuUserUs'),candidateCpuUserUs:average(b,'cpuUserUs'),candidateAllUnder15s:b.every(row=>row.elapsedMs<=15000)};
});
const evidence={schema:'m925-controlled-real-restore-abba/1',order:runs,fixtureSha256:manifest.fixtureSha256,resourceManifestSha256:hash(fs.readFileSync(path.join(root,'input-manifest.json'))),processState:'four fresh Node processes; initialization precedes timed prepare/commit',filesystemCache:'uncontrolled, not a cold-disk claim',concurrentMachineLoad:'uncontrolled shared Windows host; two observations per version only',crossOperationCache:'unchanged: distinct prepare and commit scopes',sameInstalledBytes:false,installedContentEquivalentExceptVerifiedTokenRotation:true,outputEquivalenceSha256:hash(fs.readFileSync(path.join(root,'restored-content-differences.json'))),samePreimageBytes:true,comparisons,performanceGate15sPassed:comparisons.every(row=>row.candidateAllUnder15s),runs:rows};
const output=path.join(root,'abba-'+runs.join('-')+'.json');fs.writeFileSync(output+'.tmp',JSON.stringify(evidence,null,2)+'\n');fs.renameSync(output+'.tmp',output);
console.log(JSON.stringify({output,comparisons,performanceGate15sPassed:evidence.performanceGate15sPassed}));
