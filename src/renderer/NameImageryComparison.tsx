import React,{useId} from 'react';
import type {NameCandidate,NameImageryAnalysis} from '../shared/types';
import {NameImageryView} from './NameImageryView';
import './NameImageryComparison.css';

export interface NameImageryComparisonProps {
  candidates:ReadonlyArray<Pick<NameCandidate,'id'|'fullName'|'imageReading'>>;
}

const supportedMappingVersion:NameImageryAnalysis['version']='project-character-imagery-outer-palace-set/1.0.0';
const outerPalaces=new Set([1,2,3,4,6,7,8,9]);
const palaceText=(values:readonly number[])=>values.length?values.map(value=>`${value}宫`).join('、'):'未列出位置';
// Compare saved rule metadata only. This does not infer character elements or generate another chart.
function metadataKey(value:unknown):string|undefined {
  try{
    const stable=(item:unknown):unknown=>{
      if(item===null||typeof item!=='object')return item;
      if(Array.isArray(item))return item.map(stable);
      return Object.fromEntries(Object.keys(item).sort().map(key=>[key,stable((item as Record<string,unknown>)[key])]));
    };
    return JSON.stringify(stable(value));
  }catch{return undefined;}
}
function completeSnapshot(analysis:NameImageryAnalysis):boolean {
  if(analysis.version!==supportedMappingVersion||analysis.mode!==supportedMappingVersion)return false;
  if(analysis.status!=='mapped'||!analysis.chart.available||analysis.chart.observationStatus!=='assessed-saved-intersection'||analysis.authority!=='project-experimental'||analysis.profile.authority!=='project-experimental')return false;
  if(!/^[a-f0-9]{64}$/u.test(analysis.chart.sha256)||!analysis.chart.version||analysis.mode!==analysis.profile.mode||analysis.version!==analysis.profile.version)return false;
  const chars=Array.from(analysis.givenName);
  if(!chars.length||chars.length>2||analysis.characterRows.length!==chars.length||analysis.characterRows.some((row,index)=>row.index!==index||row.char!==chars[index]||row.state!=='mapped'||!row.elements.length||!row.palaces.length||row.palaces.some(number=>!outerPalaces.has(number))||new Set(row.palaces).size!==row.palaces.length||row.chartObservationStatus!=='assessed-saved-intersection'))return false;
  const fromRows=new Set(analysis.characterRows.flatMap(row=>row.palaces));
  if(!analysis.unionPalaces.length||new Set(analysis.unionPalaces).size!==analysis.unionPalaces.length||fromRows.size!==analysis.unionPalaces.length||analysis.unionPalaces.some(number=>!outerPalaces.has(number)||!fromRows.has(number)))return false;
  return analysis.palaceReadings.length===analysis.unionPalaces.length&&analysis.unionPalaces.every(number=>analysis.palaceReadings.filter(reading=>reading.palace===number&&reading.snapshot.number===number).length===1);
}
function comparison(candidates:NameImageryComparisonProps['candidates']):{reason:string;common?:number[]} {
  if(candidates.length<2)return{reason:'至少需要两个已保存比较快照，才列出同盘位置集合差异。'};
  const first=candidates[0].imageReading;
  if(candidates.some(candidate=>!candidate.imageReading))return{reason:'有名字未生成项目文化比较；保留各名原记录，不合并位置集合。'};
  if(candidates.some(candidate=>!candidate.imageReading!.chart.available))return{reason:'有出生参考盘未确定；此名仅列静态项目标签，各名独立展示，不推断共同或不同盘内位置。'};
  if(candidates.some(candidate=>candidate.fullName!==candidate.imageReading!.surnameContext+candidate.imageReading!.givenName))return{reason:'名字与保存快照的姓名上下文不一致；各快照独立展示，不合并位置。'};
  if(candidates.some(candidate=>!completeSnapshot(candidate.imageReading!)))return{reason:'有名字仍有待定字位或保存对照不完整；仅列各自已保存内容，不把全名视为已映射。'};
  const profileKey=metadataKey(first!.profile);
  if(!profileKey||candidates.some(({imageReading:a})=>a!.chart.sha256!==first!.chart.sha256||a!.chart.version!==first!.chart.version||a!.version!==first!.version||a!.mode!==first!.mode||metadataKey(a!.profile)!==profileKey))return{reason:'保存盘身份或项目映射规则不同；各快照按原顺序独立展示，不合并共同或不同位置。'};
  // Equal identities must also agree on the saved palace content wherever the snapshots overlap.
  const savedPositions=new Map<number,string>();
  for(const candidate of candidates)for(const reading of candidate.imageReading!.palaceReadings){
    const key=metadataKey(reading.snapshot),existing=savedPositions.get(reading.palace);
    if(key===undefined||existing!==undefined&&existing!==key)return{reason:'相同盘身份中的保存位置内容不一致；各快照独立展示，不合并位置。'};
    savedPositions.set(reading.palace,key);
  }
  return{reason:'位置差异，不表示优劣。',common:first!.unionPalaces.filter(number=>candidates.every(candidate=>candidate.imageReading!.unionPalaces.includes(number)))};
}

function SnapshotSources({analysis}:{analysis:NameImageryAnalysis}){
  if(analysis.chart.available)return <details className="name-imagery-comparison__sources"><summary>查看本名保存的方法、来源与盘内说明</summary><NameImageryView analysis={analysis}/></details>;
  return <details className="name-imagery-comparison__sources"><summary>查看本名静态标签的保存来源</summary>
    <p>方法说明：姓名意象与九宫对照。项目元素来自保存的项目编辑标签；不补算盘内结构。</p>
    <p>{analysis.profile.name} · {analysis.version}</p>
    <ul>{analysis.sourceReferences.map((source,index)=><li key={index}>{source.id} · {source.locator} · {source.version}<br/>{source.note}</li>)}</ul>
    <ul>{analysis.limitations.map((item,index)=><li key={index}>{item}</li>)}</ul>
    <p>保存盘版本：{analysis.chart.version}；保存盘 SHA-256：{analysis.chart.sha256}</p>
  </details>;
}

/** Display only the candidate's saved imageReading. No API, recalculation, selection state or sorting. */
export function NameImageryComparison({candidates}:NameImageryComparisonProps){
  const titleId=useId(),result=comparison(candidates),canCompare=result.common!==undefined;
  return <section className="name-imagery-comparison" aria-labelledby={titleId} data-summary-state={canCompare?'comparable':candidates.length<2?'insufficient':'not-comparable'}>
    <header><h2 id={titleId}>项目文化比较</h2><p>按当前名字顺序，对照宝宝出生参考盘与各名字的项目元素标签。方法说明：姓名意象与九宫对照。</p></header>
    <p className="name-imagery-comparison__boundary">只展示位置差异，不评分或改变排序。项目标签不是辞书统一认定的汉字五行；不从寓意、读音或 AI 补定元素。姓氏仅作上下文。</p>
    {canCompare?<section className="name-imagery-comparison__shared" aria-label="同盘位置集合差异">
      <h3>同一保存盘与规则的位置集合</h3><p>{result.reason}</p>
      <dl><div><dt>所有名字共同位置</dt><dd>{result.common!.length?palaceText(result.common!):'无共同位置'}</dd></div></dl>
      <ul>{candidates.map((candidate,index)=>{
        const remaining=candidate.imageReading!.unionPalaces.filter(number=>!result.common!.includes(number));
        return <li key={candidate.id+':'+index}><strong>{candidate.fullName}</strong> · 本名其余位置：{remaining.length?palaceText(remaining):'无其余位置'}</li>;
      })}</ul>
      <p>本名其余位置是扣除所有名字共同位置后的集合；不表示其他名字都没有这些位置。位置相同或不同均不代表姓名作用。</p>
    </section>:<p className="name-imagery-comparison__status" role="status">{result.reason}</p>}
    {!candidates.length?<p>尚未选择比较的名字。</p>:<ol className="name-imagery-comparison__grid" aria-label="候选名字保存的文化比较快照">
      {candidates.map((candidate,index)=>{
        const analysis=candidate.imageReading,headingId=titleId+'-candidate-'+index;
        return <li key={candidate.id+':'+index}><article className="name-imagery-comparison__candidate" aria-labelledby={headingId}>
          <h3 id={headingId}>{candidate.fullName}</h3>
          {!analysis?<p className="name-imagery-comparison__status">未生成项目文化比较</p>:<>
            <p className="name-imagery-comparison__status">{!analysis.chart.available?'出生参考盘未确定 · 仅列静态标签':analysis.status==='partial'||analysis.characterRows.some(row=>row.state==='unresolved')?'部分字位标签待定 · 不作全名已映射声明':'已保存项目标签与对应位置'}</p>
            <section aria-label="逐字项目元素标签"><h4>逐字项目标签与依据</h4><ol className="name-imagery-comparison__characters">{analysis.characterRows.map((row,rowIndex)=><li key={row.index+':'+rowIndex}>
              <h5>第 {row.index+1} 字 · {row.char} <small>{row.pinyin}</small></h5>
              <dl><div><dt>项目元素标签</dt><dd>{row.elements.length?row.elements.join('、'):'待定，未补定元素'}</dd></div><div><dt>标签依据</dt><dd>{row.labelBasis||'保存记录未列出标签依据'}</dd></div><div><dt>标签来源</dt><dd>{row.labelSourceId}；字典来源另记为 {row.dictionarySourceId}</dd></div><div><dt>原保存字位位置集合</dt><dd>{row.palaces.length?palaceText(row.palaces):'待定，未列位置'}</dd></div></dl>
              {row.state==='unresolved'&&<p>此字位待定，不用其他字位的标签补齐。</p>}
              {row.missing.map((message,i)=><p key={i}>{message}</p>)}
            </li>)}</ol></section>
            <dl><div><dt>原保存外八宫集合{!analysis.chart.available?'（静态）':''}</dt><dd>{analysis.unionPalaces.length?palaceText(analysis.unionPalaces):'无已映射位置；未定字位仍待定'}</dd></div></dl>
            {!analysis.chart.available?<p>参考盘未确定，不展示或推断对应星、门、神，也不补齐盘内观察。</p>:<section aria-label="各自保存盘的对应位置"><h4>对应保存盘的位置、星、门、神</h4>
              {!analysis.palaceReadings.length?<p>此快照未列出可对照的盘内位置。</p>:<ul className="name-imagery-comparison__palaces">{analysis.palaceReadings.map((reading,i)=><li key={reading.palace+':'+i}>
                <h5>{reading.snapshot.trigram}{reading.palace}宫 · {reading.snapshot.direction}</h5>
                <dl><div><dt>星</dt><dd>{reading.snapshot.star}</dd></div><div><dt>门</dt><dd>{reading.snapshot.door}</dd></div><div><dt>神</dt><dd>{reading.snapshot.god}</dd></div></dl>
                <p>{reading.note}</p>
              </li>)}</ul>}
            </section>}
            <SnapshotSources analysis={analysis}/>
          </>}
        </article></li>;
      })}
    </ol>}
  </section>;
}
