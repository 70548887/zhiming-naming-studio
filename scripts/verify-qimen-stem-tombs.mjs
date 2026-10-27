/** External-source table + independent existing plate fixtures. No application engine is imported. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const root=process.cwd(),read=file=>fs.readFileSync(path.join(root,file),'utf8'),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const assert=(ok,message)=>{if(!ok)throw new Error(message);},stable=value=>JSON.stringify(value,null,2)+'\n';
const write=(file,value)=>{const output=path.join(root,file);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output+'.tmp',typeof value==='string'?value:stable(value));fs.renameSync(output+'.tmp',output);};
const VERSION='qimen-go-explicit-stem-tombs/1.0.0',ID='qimen-go-stem-tombs',COMMIT='4d3f58fa0f401b5b3a337f119138e99e90685dda';
const files=['data/raw/qimen-stem-tombs-go-defs.go','data/raw/qimen-stem-tombs-go-ganzhi.go','data/raw/qimen-stem-tombs-go-LICENSE.txt'];
if(process.argv.includes('--archive'))for(const [input,output,expected]of [
 ['data/raw/qimen-patterns-go-qimen_defs.go',files[0],'bacb7684160cb0d4297e1a13fb3674c7eebf56183fea2e7a5c12bb18a7dd47ac'],
 ['data/raw/bazi-evidence-go-ganzhi.go',files[1],'0dd04c5c2f290e87822ff85770f203467c1a7a69ced56990d808c718aa14b401'],
 ['data/raw/qimen-patterns-go-LICENSE.txt',files[2],'cfdb13c1a086ecc3f498b6a75a65d1dab3d93072c58efd26d383db776749b996']
]){const bytes=fs.readFileSync(path.join(root,input));assert(sha(bytes)===expected,'Existing fixed archive changed '+input);fs.writeFileSync(path.join(root,output)+'.tmp',bytes);fs.renameSync(path.join(root,output)+'.tmp',path.join(root,output));}
const defs=read(files[0]),ganzhi=read(files[1]),license=read(files[2]);assert(license.includes('MIT License')&&license.includes('Permission is hereby granted, free of charge'),'MIT grant missing');
const stringMap=(source,name)=>{const body=new RegExp('var '+name+' = map\\[string\\]string\\{([\\s\\S]*?)\\n\\}').exec(source)?.[1];assert(body,'Missing '+name);return Object.fromEntries([...body.matchAll(/"([^"]+)":\s*"([^"]+)"/g)].map(([,key,value])=>[key,value]));};
const tombs=stringMap(defs,'QMTomb'),hideJia=stringMap(defs,'HideJia');
const palaceBody=/var ZhiGong9 = map\[string\]int\{([\s\S]*?)\n\}/.exec(ganzhi)?.[1];assert(palaceBody,'Missing ZhiGong9');const palaces=Object.fromEntries([...palaceBody.matchAll(/"([^"]+)":\s*(\d+)/g)].map(([,key,value])=>[key,Number(value)]));
const hand={甲:['未',2],乙:['戌',6],丙:['戌',6],丁:['丑',8],戊:['戌',6],己:['丑',8],庚:['丑',8],辛:['辰',4],壬:['辰',4],癸:['未',2]};
for(const [stem,[branch,palace]]of Object.entries(hand))assert(tombs[stem]===branch&&palaces[branch]===palace,'Independent ten-stem transcription mismatch '+stem);
assert(Object.keys(tombs).length===10&&Object.keys(hideJia).length===6,'Incomplete fixed source tables');
const locator='xuan/qimen_defs.go:220–224 QMTomb; xuan/ganzhi.go:43–46 ZhiGong9';
const entries=[...'甲乙丙丁戊己庚辛壬癸'].map(stem=>({stem,tombBranch:tombs[stem],palace:palaces[tombs[stem]],sourceLocator:locator,note:stem==='甲'?'原表列甲未；本转盘明干无甲，不把六仪代号反推甲的位置。':stem==='乙'?'本表乙戌乾六，与既有三奇乙坤二读法不同；两个profile分别保留。':''}));
const table={version:VERSION,id:VERSION,sourceId:ID,title:'qimen-go固定十干墓支表参考（显式天盘干）',scope:{layer:'heaven-only',palaces:[1,2,3,4,6,7,8,9],executableStems:[...'乙丙丁戊己庚辛壬癸'],center:'不检查中五说明副本；寄干随天芮按实际外宫核对一次。',lodgedStem:'仅核实际天盘主干与本盘已提供的天芮寄干；这是本产品的限定应用范围。',hiddenJia:'甲为not-directly-observed，不从甲子戊/甲戌己等六仪身份伪造甲的独立落宫。',excluded:['earth-stems','hidden-stems','path-stems','name-to-palace','life-fortune']},entries,disagreements:[{id:'existing-three-qi',note:'旧三奇读法乙坤二、丙乾六、丁艮八保持不变；新Go表乙乾六、丙乾六、丁艮八，乙存在差异，不能合并或覆盖。'},{id:'arc-ding-qian',note:'Arc固定电子转录另保留丁墓乾六；本表丁丑艮八，不以五行同属火推导替换。'},{id:'not-bazi-growth-table',note:'同一Go仓库的ZhangSheng12长生墓表与QMTomb并不相同，尤其己/庚等；本profile仅复述QMTomb，不混入八字长生表。'}],limitations:['这是固定MIT开源实现中的墓支查表，尚无同师承原典逐页背书，不称完整流派验名。','墓支转换为洛书宫来自固定ZhiGong9；命中只表示所选表的结构匹配，不输出吉凶、性格、健康或命运。','原Go renderer也查地盘干，本产品本profile不启用地盘；寄干范围采用当前转盘实际天芮数据，不声称Go renderer独立核验此寄干算法。','本轮没有建立甲遁六仪墓库反解规则、真假空、四害解除或姓名落宫。']};
const externalFile='tests/fixtures/qimen-patterns-examples.json',external=JSON.parse(read(externalFile));assert(external.cases.length===1080,'Existing independently sourced plate collection changed');
const inspect=plate=>plate.expected.palaces.filter(p=>p.number!==5).flatMap(p=>{const m=/^([乙丙丁戊己庚辛壬癸])(?:（寄([乙丙丁戊己庚辛壬癸])）)?$/.exec(p.heaven);assert(m,'Bad external heaven stem');return [{stem:m[1],palace:p.number,lodged:false},...(m[2]?[{stem:m[2],palace:p.number,lodged:true}]:[])];});
const selected=new Map(),coverage={};
for(const stem of table.scope.executableStems){
 const positives=external.cases.filter(plate=>inspect(plate).some(item=>item.stem===stem&&item.palace===palaces[tombs[stem]]));
 const negatives=external.cases.filter(plate=>inspect(plate).some(item=>item.stem===stem&&item.palace!==palaces[tombs[stem]]));
 assert(positives.length>=3&&negatives.length>=3,'Insufficient independent +/- plates '+stem);coverage[stem]={matched:positives.length,notMatched:negatives.length};
 for(const plate of [...positives.slice(0,3),...negatives.slice(0,3)])selected.set(plate.id,plate);
 const hosted=positives.find(plate=>inspect(plate).some(item=>item.stem===stem&&item.lodged));if(hosted)selected.set(hosted.id,hosted);
 const yin=positives.find(plate=>plate.suppliedJu.yang===false);if(yin)selected.set(yin.id,yin);
}
const plateCases=[...selected.values()].map(plate=>{const positions=inspect(plate),checks=entries.map(entry=>{const actual=positions.find(item=>item.stem===entry.stem);return {stem:entry.stem,status:!actual?'not-directly-observed':actual.palace===entry.palace?'matched':'not-matched',targetBranch:entry.tombBranch,targetPalace:entry.palace,...(actual?{actualPalace:actual.palace,lodged:actual.lodged}:{})};});return {id:plate.id,input:plate.input,suppliedJu:plate.suppliedJu,palaces:plate.expected.palaces,checks,tags:plate.tags,evidence:'External fixed Arc plate array retained from existing1080collection; only new墓表lookup derived from literal fixedGo QMTomb/ZhiGong9. No application function called.'};});
const tableChecks=entries.flatMap(entry=>[0,1,2].flatMap(index=>[{id:entry.stem+'-positive-'+index,stem:entry.stem,palace:entry.palace,expected:true,scope:'literal-table-only;甲不表示真实盘可观测'},{id:entry.stem+'-negative-'+index,stem:entry.stem,palace:[1,3,7].filter(p=>p!==entry.palace)[index],expected:false,scope:'literal-table-only'}]));
const fixture={version:VERSION,method:'literal-Go-source-table plus already independently archived external1080platearrays; no production engine import',externalPlateFile:externalFile,externalPlateSha256:sha(read(externalFile)),tableChecks,coverage,plateCases,甲:'All real plate cases must preserve not-directly-observed; pure table positives are not chart observations.'};
const source={id:ID,name:'qimen-go固定十干墓支表：独立显式天盘参考',url:'https://github.com/deminzhang/qimen-go',commit:COMMIT,license:'MIT',files:[...files,'data/qimen-stem-tombs-table.json'],note:'xuan/qimen_defs.go QMTomb全10项和HideJia六甲身份表；xuan/ganzhi.go ZhiGong9宫支。来源查表不提供古籍师承背书。产品仅外八宫显式乙至癸天盘主/寄干核对，甲不直接观测，地盘不核；与旧三奇乙坤二/丁艮八独立，不覆盖或混表。'};
if(process.argv.includes('--write'))write('data/qimen-stem-tombs-table.json',table);else assert(read('data/qimen-stem-tombs-table.json')===stable(table),'Tomb table changed');
source.fileHashes=Object.fromEntries([...source.files].sort().map(file=>[file,sha(fs.readFileSync(path.join(root,file)))]));source.sha256=sha(JSON.stringify(source.fileHashes));
const lock={version:VERSION,hashConvention:'sha256(JSON.stringify(fileHashes)); keys sorted by relative path',sources:[source]};
if(process.argv.includes('--write')){write('data/qimen-stem-tombs-source-lock.json',lock);write('tests/fixtures/qimen-stem-tombs-examples.json',fixture);}else{assert(read('data/qimen-stem-tombs-source-lock.json')===stable(lock),'Tomb source manifest differs');assert(read('tests/fixtures/qimen-stem-tombs-examples.json')===stable(fixture),'Tomb independent fixtures differ');}
const result={version:VERSION,entries:10,tableChecks:tableChecks.length,independentPlateCases:plateCases.length,coverage,manifestSha256:sha(read('data/qimen-stem-tombs-source-lock.json')),sourceFiles:source.files.length};write('.local/expand-114/source-verification.json',result);console.log(stable(result));
