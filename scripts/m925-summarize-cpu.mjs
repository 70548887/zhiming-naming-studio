import fs from 'node:fs';
import path from 'node:path';
const directory=path.resolve(process.argv[2]??''),result=[];
for(const filename of fs.readdirSync(directory).filter(name=>name.endsWith('.cpuprofile'))){
 const profile=JSON.parse(fs.readFileSync(path.join(directory,filename),'utf8'));
 const nodes=new Map(profile.nodes.map(node=>[node.id,node])),parents=new Map();
 for(const node of profile.nodes)for(const child of node.children??[])parents.set(child,node.id);
 const own=new Map(),total=new Map();
 for(let i=0;i<(profile.samples??[]).length;i++){
  const id=profile.samples[i],duration=profile.timeDeltas[i]??0;own.set(id,(own.get(id)??0)+duration);
  let parent=id;while(parent!==undefined){total.set(parent,(total.get(parent)??0)+duration);parent=parents.get(parent);}
 }
 const grouped=new Map();
 for(const [id,node]of nodes){const frame=node.callFrame,key=[frame.functionName,frame.url,frame.lineNumber].join(':');const row=grouped.get(key)??{function:frame.functionName,url:frame.url,line:frame.lineNumber+1,ownMs:0,totalMs:0};row.ownMs+=(own.get(id)??0)/1000;row.totalMs+=(total.get(id)??0)/1000;grouped.set(key,row);}
 const top=[...grouped.values()].sort((a,b)=>b.ownMs-a.ownMs).slice(0,24);result.push({phase:filename,durationMs:(profile.endTime-profile.startTime)/1000,top});
}
const output=path.join(directory,'cpu-summary.json');fs.writeFileSync(output+'.tmp',JSON.stringify(result,null,2)+'\n');fs.renameSync(output+'.tmp',output);
console.log(JSON.stringify(result.map(item=>({...item,top:item.top.slice(0,14).map(({url,...row})=>row)})),null,2));
