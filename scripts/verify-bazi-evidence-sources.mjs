/** Source-table extraction and evidence fixtures. No application engine or calendar library is imported. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=process.cwd(),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const stable=value=>JSON.stringify(value,null,2)+'\n';
const write=(file,value)=>{const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target+'.tmp',typeof value==='string'?value:stable(value));fs.renameSync(target+'.tmp',target);};
const version='bazi-evidence-profile/1.0.0';
const sources=[
  {id:'bazi-evidence-lunar186',name:'八字关系表与既有交节区间接口：6tail/lunar-typescript 1.8.6',url:'https://github.com/6tail/lunar-typescript',commit:'0f3e95d15e31f1a7c7b93d624542649347328a20',license:'MIT',files:['data/raw/bazi-evidence-lunar-LunarUtil.ts','data/raw/bazi-evidence-lunar-Lunar.ts','data/raw/bazi-evidence-lunar-LICENSE.txt'],note:'固定v1.8.6原文件LunarUtil.ts的ZHI_HIDE_GAN、SHI_SHEN、HE_GAN_5、HE_ZHI_6，以及Lunar.ts的getPrevJie/getNextJie既有历算接口实现；归档实现不表示天文交节精度已经独立验证。源巳藏干列序丙、庚、戊仅为事实列序，不改写旧扶抑丙、戊、庚及其权重。只展示关系出现，不据此判化气、吉凶或用神。'},
  {id:'bazi-evidence-go-ganzhi',name:'干支合冲与三合三会组：deminzhang/qimen-go固定表',url:'https://github.com/deminzhang/qimen-go',commit:'4d3f58fa0f401b5b3a337f119138e99e90685dda',license:'MIT',files:['data/raw/bazi-evidence-go-ganzhi.go','data/raw/bazi-evidence-go-LICENSE.txt'],note:'xuan/ganzhi.go的HeGan、HeZhi、ChongZhi、He3Zhi、Hui3Zhi；与LunarUtil字面成员表交叉。不引入源码中的神煞、五行纯格或关系强弱判断；六合化行注释有不同读法，本版只采用成员，不输出六合或五合化气结论。无此源六害显式表，六害暂不启用。'},
  {id:'bazi-evidence-project-heuristic',name:'本产品既有扶抑与季节意象启发式',url:'local:data/bazi-evidence-project-profile.json',commit:'project-fuyi-seasonal/1.0.0',license:'MIT（仅本项目原创规则资料与说明）',files:['data/bazi-evidence-project-profile.json','data/raw/bazi-evidence-project-NOTICE.md'],note:'稳定规则资料记录本产品既有扶抑权重和季节参考，与源码格式无关；这是项目自编口径，不是古籍公式或穷通逐月调候，不支持从格合化裁决。'},
];
const research=process.argv.includes('--archive') ? JSON.parse(read('.local/bazi-109/research-source-candidates.json')) : undefined;
if(process.argv.includes('--archive'))for(const source of sources.filter(source=>source.id!=='bazi-evidence-project-heuristic')){
  const candidate=research.sources.find(item=>item.id===source.id);assert(candidate&&candidate.commit===source.commit,'Research commit mismatch '+source.id);
  for(const file of source.files){
    if(file==='data/raw/bazi-evidence-lunar-Lunar.ts'){
      const fetch=JSON.parse(read('.local/bazi-110/lunar-calendar-source-fetch.json'));
      assert(fetch.commit===source.commit&&fetch.upstreamPath==='src/lib/Lunar.ts','Calendar source commit/path mismatch');
      const bytes=fs.readFileSync(path.join(root,'.local/bazi-110/bazi-evidence-lunar-Lunar.ts'));assert(hash(bytes)===fetch.sha256,'Calendar source fetch hash mismatch');
      const target=path.join(root,file);fs.writeFileSync(target+'.tmp',bytes);fs.renameSync(target+'.tmp',target);continue;
    }
    const original='.local/bazi-109/research/'+path.basename(file),bytes=fs.readFileSync(path.join(root,original));
    assert(hash(bytes)===candidate.fileHashes[original],'Research hash mismatch '+original);
    const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target+'.tmp',bytes);fs.renameSync(target+'.tmp',target);
  }
}
for(const source of sources){
  source.fileHashes=Object.fromEntries([...source.files].sort().map(file=>[file,hash(fs.readFileSync(path.join(root,file)))]));
  source.sha256=hash(JSON.stringify(source.fileHashes));
  const license=read(source.files.find(file=>/LICENSE|NOTICE/.test(file)));assert(license.includes('Permission is hereby granted, free of charge')&&license.includes('THE SOFTWARE IS PROVIDED "AS IS"'),'Missing MIT grant '+source.id);
}

const lunar=read(sources[0].files[0]),go=read(sources[1].files[0]);
const tokens={
  tg:Object.fromEntries(['jia','yi','bing','ding','wu','ji','geng','xin','ren','gui'].map((key,index)=>[key,[...'甲乙丙丁戊己庚辛壬癸'][index]])),
  dz:Object.fromEntries(['zi','chou','yin','mao','chen','si','wu','wei','shen','you','xu','hai'].map((key,index)=>[key,[...'子丑寅卯辰巳午未申酉戌亥'][index]])),
  ss:{biJian:'比肩',jieCai:'劫财',shiShen:'食神',shangGuan:'伤官',pianCai:'偏财',zhengCai:'正财',qiSha:'七杀',zhengGuan:'正官',pianYin:'偏印',zhengYin:'正印'},
};
const translate=text=>text.replace(/\{(tg|dz|ss)\.([^}]+)\}/g,(_,group,key)=>{assert(tokens[group][key],'Unknown token '+group+'.'+key);return tokens[group][key];});
const lunarMap=name=>{
  const body=new RegExp('static '+name+': [^=]+ = \\{([\\s\\S]*?)\\n    \\};').exec(lunar)?.[1];assert(body,'Missing LunarUtil '+name);
  return Object.fromEntries([...body.matchAll(/'([^']+)':\s*(\[[^\]]*\]|'[^']*')/g)].map(([,key,value])=>[translate(key),value.startsWith('[')?[...value.matchAll(/'([^']+)'/g)].map(match=>translate(match[1])):translate(value.slice(1,-1))]));
};
const lunarArray=name=>{const body=new RegExp('static '+name+': string\\[\\] = \\[([^\\]]+)\\];').exec(lunar)?.[1];assert(body,'Missing LunarUtil '+name);return [...body.matchAll(/'([^']+)'/g)].map(match=>translate(match[1]));};
const goMap=name=>{
  const body=new RegExp('(?:var |\\n\\t)'+name+' = map\\[string\\]string\\{([\\s\\S]*?)\\n\\t?\\}').exec(go)?.[1];assert(body,'Missing Go '+name);
  return Object.fromEntries([...body.matchAll(/"([^"]+)":\s*"([^"]+)"/g)].map(([,key,value])=>[key,value]));
};
const stems=[...'甲乙丙丁戊己庚辛壬癸'],branches=[...'子丑寅卯辰巳午未申酉戌亥'];
const hidden=lunarMap('ZHI_HIDE_GAN'),tenGod=lunarMap('SHI_SHEN'),five=lunarArray('HE_GAN_5'),six=lunarArray('HE_ZHI_6');
assert(Object.keys(hidden).length===12&&Object.keys(tenGod).length===100&&five.length===10&&six.length===12,'Incomplete external fact tables');
const stemPairs=goMap('HeGan'),branchPairs=goMap('HeZhi'),clashes=goMap('ChongZhi');
assert(stems.every((stem,index)=>five[index]===stemPairs[stem]),'Lunar/Go five-combination mismatch');
assert(branches.every((branch,index)=>six[index]===branchPairs[branch]),'Lunar/Go six-combination mismatch');
const sanhe=[...go.matchAll(/he(Water|Fire|Wood|Metal)\s*= \[3\]string\{([^}]+)\}/g)].map(([,key,body])=>({subjects:[...body.matchAll(/"([^"]+)"/g)].map(match=>match[1]),element:({Water:'水',Fire:'火',Wood:'木',Metal:'金'})[key]}));
const hui=goMap('Hui3Zhi');
const sanhui=['水','木','火','金'].map(element=>({subjects:branches.filter(branch=>hui[branch]===element),element}));
assert(sanhe.length===4&&sanhui.every(group=>group.subjects.length===3),'Incomplete external triple groups');
const line=(text,needle)=>text.slice(0,text.indexOf(needle)).split('\n').length;
const locators={hidden:`src/lib/LunarUtil.ts:${line(lunar,'static ZHI_HIDE_GAN')}`,tenGod:`src/lib/LunarUtil.ts:${line(lunar,'static SHI_SHEN')}`,stemCombination:`src/lib/LunarUtil.ts:${line(lunar,'static HE_GAN_5')}; xuan/ganzhi.go:${line(go,'var HeGan')}`,branchLiuhe:`src/lib/LunarUtil.ts:${line(lunar,'static HE_ZHI_6')}; xuan/ganzhi.go:${line(go,'var HeZhi')}`,branchClash:`xuan/ganzhi.go:${line(go,'var ChongZhi')}`,branchSanhe:`xuan/ganzhi.go:${line(go,'heWater =')}`,branchSanhui:`xuan/ganzhi.go:${line(go,'Hui3Zhi =')}`};

// Independent transcriptions anchor source parsing. These are not obtained from application code.
const handHidden={子:['癸'],丑:['己','癸','辛'],寅:['甲','丙','戊'],卯:['乙'],辰:['戊','乙','癸'],巳:['丙','庚','戊'],午:['丁','己'],未:['己','丁','乙'],申:['庚','壬','戊'],酉:['辛'],戌:['戊','辛','丁'],亥:['壬','甲']};
for(const branch of branches)assert(JSON.stringify(hidden[branch])===JSON.stringify(handHidden[branch]),'Hidden-stem transcription mismatch '+branch);
for(const [pair,expected] of [['甲甲','比肩'],['甲乙','劫财'],['甲庚','七杀'],['甲辛','正官'],['乙庚','正官'],['乙辛','七杀'],['癸甲','伤官'],['癸庚','正印']])assert(tenGod[pair]===expected,'Ten-god transcription mismatch '+pair);
const pairs=(map,order)=>order.filter(subject=>order.indexOf(subject)<order.indexOf(map[subject])).map(subject=>[subject,map[subject]]);
const definitions=[
  {kind:'stem-combination',groups:pairs(stemPairs,stems).map(subjects=>({subjects})),pool:stems,locator:locators.stemCombination},
  {kind:'branch-liuhe',groups:pairs(branchPairs,branches).map(subjects=>({subjects})),pool:branches,locator:locators.branchLiuhe},
  {kind:'branch-clash',groups:pairs(clashes,branches).map(subjects=>({subjects})),pool:branches,locator:locators.branchClash},
  {kind:'branch-sanhe',groups:sanhe,pool:branches,locator:locators.branchSanhe},
  {kind:'branch-sanhui',groups:sanhui,pool:branches,locator:locators.branchSanhui},
];
const relationships=[];
for(const definition of definitions)for(const [index,group] of definition.groups.entries()){
  const expected=group.subjects;
  relationships.push({id:`${definition.kind}-${index+1}-all`,kind:definition.kind,input:[...expected],matched:true,subjects:[...expected],...(group.element?{groupElement:group.element}:{}),sourceLocator:definition.locator,evidence:'All distinct members of the fixed external source group occur.'});
  relationships.push({id:`${definition.kind}-${index+1}-reordered`,kind:definition.kind,input:[...expected].reverse().concat(expected[0]),matched:true,subjects:[...expected],...(group.element?{groupElement:group.element}:{}),sourceLocator:definition.locator,evidence:'Order and duplicate occurrences do not add or remove distinct source members.'});
  const missing=expected.slice(0,-1),foreign=definition.pool.find(subject=>!expected.includes(subject));
  relationships.push({id:`${definition.kind}-${index+1}-incomplete`,kind:definition.kind,input:[...missing,foreign],matched:false,subjects:[...expected],...(group.element?{groupElement:group.element}:{}),sourceLocator:definition.locator,evidence:'At least one member of this exact source group is absent; repeated members do not complete it.'});
}
const fixture={version,method:'literal-fixed-upstream-tables-with-independent-transcription-anchors',scope:'Fact memberships only. No application engine/calendar import; not evidence of transformation, strength, fate or favorable-element judgments.',sources:sources.map(({id,commit})=>({id,commit})),hiddenStems:branches.map(branch=>({branch,expected:hidden[branch],sourceId:sources[0].id,sourceLocator:locators.hidden})),tenGod:stems.flatMap(dayMaster=>stems.map(stem=>({dayMaster,stem,expected:tenGod[dayMaster+stem],sourceId:sources[0].id,sourceLocator:locators.tenGod}))),tables:{stemCombinations:definitions[0].groups,branchLiuhe:definitions[1].groups,branchClashes:definitions[2].groups,branchSanhe:sanhe,branchSanhui:sanhui},relationships,disabled:['branch-harm','month-day-command','seasonal-school-opinion','following-pattern','transformation-verdict']};
const lock={version,hashConvention:'sha256(JSON.stringify(fileHashes)); fileHashes keys sorted by relative path',scope:'Deterministic stem/branch memberships and source-order hidden stems. Does not modify legacy fuyi weights.',sources};
if(process.argv.includes('--write')){
  write('data/bazi-evidence-source-lock.json',lock);write('tests/fixtures/bazi-evidence-examples.json',fixture);
}else{
  assert(read('data/bazi-evidence-source-lock.json')===stable(lock),'Source manifest differs; inspect intentional changes before --write');
  assert(read('tests/fixtures/bazi-evidence-examples.json')===stable(fixture),'Evidence fixture differs; do not regenerate from application output');
}
const result={version,sourceCount:sources.length,sourceManifestSha256:hash(read('data/bazi-evidence-source-lock.json')),hiddenStemCases:fixture.hiddenStems.length,tenGodCases:fixture.tenGod.length,relationshipCases:relationships.length,rawHashesVerified:sources.reduce((sum,source)=>sum+Object.keys(source.fileHashes).length,0),independentOfApplication:true};
write('.local/bazi-110/source-verification.json',result);console.log(JSON.stringify(result,null,2));
