import React,{useEffect,useId,useMemo,useSyncExternalStore} from 'react';
import type {CmnReadingDefinition,CmnReadingOption,CmnReadingQuery,CmnReadingReference,CmnReadingSourceIdentity} from '../shared/cmn-reading';
import './CmnReadingView.css';

export type CmnReadingLoader=(char:string)=>Promise<CmnReadingQuery>;
export interface CmnReadingViewState{expanded:boolean;phase:'idle'|'loading'|'ready'|'error';query?:CmnReadingQuery}
/** Calls the product's read API only; no saved-plan or scoring operation is exposed. */
export const loadCmnReadingOptions:CmnReadingLoader=async char=>{
 const api=window.studio as typeof window.studio&{getCmnReadingOptions?:CmnReadingLoader};
 if(typeof api?.getCmnReadingOptions!=='function')throw new Error('读音资料服务尚未连接。');
 return api.getCmnReadingOptions(char);
};
export function createCmnReadingController(char:string,loader:CmnReadingLoader){
 let state:CmnReadingViewState={expanded:false,phase:'idle'},active=false,epoch=0;
 const listeners=new Set<()=>void>(),publish=(next:CmnReadingViewState)=>{state=next;for(const listener of listeners)listener();};
 const load=async()=>{
  if(!active||!state.expanded||state.phase==='loading')return;
  const ticket=++epoch;publish({expanded:true,phase:'loading'});
  try{
   const query=await loader(char);
   if(!active||ticket!==epoch||!state.expanded)return;
   if(!query||query.char!==char||query.profile!=='cmn-character-source/1.0.0'||!['available','reference-only','unavailable'].includes(query.status)||!Array.isArray(query.options)||!Array.isArray(query.references)||!query.source)throw new Error('返回资料与当前汉字不一致。');
   publish({expanded:true,phase:'ready',query});
  }catch{if(active&&ticket===epoch&&state.expanded)publish({expanded:true,phase:'error'});}
 };
 return{
  subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};},
  getSnapshot:()=>state,
  activate(){active=true;if(state.phase==='loading')publish({expanded:state.expanded,phase:'idle'});if(state.expanded&&state.phase==='idle')void load();},
  dispose(){active=false;epoch++;},
  setExpanded(expanded:boolean){
   if(!expanded){epoch++;publish(state.phase==='loading'?{expanded:false,phase:'idle'}:{...state,expanded:false});return Promise.resolve();}
   publish({...state,expanded:true});return state.phase==='idle'?load():Promise.resolve();
  },
  retry:load,
 };
}
const reasonText:Record<NonNullable<CmnReadingQuery['unavailableReason']>,string>={
 'not-in-fixed-character-set':'本字不在这批固定字库的资料范围内。',
 'no-moe-reading-identity':'当前字条没有能与本版词典核对的读音身份。',
 'source-entry-missing':'尚未找到可核对的原始词条。',
};
const definitionKind:Record<CmnReadingDefinition['kind'],string>={
 definition:'词典原义','dictionary-reference':'词典参见（未展开所引词条）','internal-reading-reference':'读音互见（未展开其他读音义项）','empty-definition-reference':'此记录未提供独立释义',
};
function SourceVersion({source,limitations}:{source:CmnReadingSourceIdentity;limitations:string[]}){
 return <details className="cmn-reading-source"><summary>查看词典版本与许可</summary><dl>
  <dt>词典</dt><dd>教育部《重编国语辞典修订本》固定版本</dd><dt>资料范围</dt><dd>台湾教育部词典记录；不同地区的读法和姓名用法仍需另行核对。</dd>
  <dt>来源编号</dt><dd>{source.sourceId}</dd><dt>固定版本</dt><dd>{source.commit}</dd><dt>许可</dt><dd>{source.license}</dd><dt>来源地址</dt><dd>{source.url}</dd>
  <dt>原始文件</dt><dd>{source.rawFile}</dd><dt>文件摘要</dt><dd>{source.rawSha256}</dd><dt>解压后摘要</dt><dd>{source.rawJsonSha256}</dd>
  <dt>字库版本</dt><dd>{source.datasetVersion}</dd><dt>字库文件</dt><dd>{source.datasetFile}</dd><dt>字库摘要</dt><dd>{source.datasetSha256}</dd>
  <dt>参考方法</dt><dd>{source.profile}</dd><dt>方法摘要</dt><dd>{source.profileSha256}</dd><dt>读音标准</dt><dd>{source.standard}</dd>
 </dl>{limitations.length>0&&<><h6>来源范围原注</h6><ul>{limitations.map((text,i)=><li key={i}>{text}</li>)}</ul></>}</details>;
}
function OriginalDefinition({definition:d}:{definition:CmnReadingDefinition}){
 return <li className={d.kind==='definition'?'cmn-reading-definition':'cmn-reading-definition cmn-reading-reference-definition'}>
  <span className="cmn-reading-kind">{definitionKind[d.kind]}</span>{d.original.type&&<span className="cmn-reading-word-class"> · {d.original.type}</span>}
  <p>{d.original.def||'原记录未附释义正文。'}</p>
  {!!d.original.quote?.length&&<><h6>原条引文</h6>{d.original.quote.map((text,i)=><blockquote key={i}>{text}</blockquote>)}</>}
  {!!d.original.example?.length&&<><h6>原条例句</h6><ul>{d.original.example.map((text,i)=><li key={i}>{text}</li>)}</ul></>}
  {!!d.original.link?.length&&<><h6>原条参见文字</h6><ul>{d.original.link.map((text,i)=><li key={i}>{text}</li>)}</ul></>}
 </li>;
}
function ReadingOption({option:o,currentPinyin}:{option:CmnReadingOption;currentPinyin:string}){
 const hasMeaning=o.definitions.some(d=>d.kind==='definition'&&d.original.def.trim().length>0);
 return <section className="cmn-reading-option">
  <header><h5>{o.pinyin}</h5><div className="cmn-reading-tags">{o.pinyin===currentPinyin&&<span>与本名读音相同</span>}{o.isCurrentDefault&&<span>字库默认</span>}{o.label&&<span>原注：{o.label}</span>}</div></header>
  <p className="cmn-reading-glyph">姓名原字：{o.char} · 词典字形：{o.glyph.dictionaryWord}</p>
  {!hasMeaning&&<p className="cmn-reading-notice">本读音记录仅含参见或互见，不据此补成独立字义。</p>}
  {o.definitions.length>0?<ol className="cmn-reading-definitions">{o.definitions.map(d=><OriginalDefinition key={d.definitionId} definition={d}/>)}</ol>:<p>此读音记录未附独立释义。</p>}
  <details className="cmn-reading-source"><summary>查看此读音的完整来源</summary><dl>
   <dt>词典</dt><dd>教育部《重编国语辞典修订本》</dd><dt>来源编号</dt><dd>{o.source.sourceId}</dd><dt>读音原文</dt><dd>{o.heteronym.rawPinyin}</dd><dt>注音原文</dt><dd>{o.heteronym.rawBopomofo}</dd>
   <dt>词条</dt><dd>{o.entry.title}</dd><dt>词条位置</dt><dd>{o.entry.path} · 原索引 {o.entry.index}</dd><dt>词条摘要</dt><dd>{o.entry.sha256}</dd>
   <dt>读音位置</dt><dd>{o.heteronym.path} · 原索引 {o.heteronym.index}</dd><dt>读音摘要</dt><dd>{o.heteronym.sha256}</dd>
   <dt>选项编号</dt><dd>{o.optionId}</dd><dt>字条身份摘要</dt><dd>{o.characterIdentitySha256}</dd><dt>字库登记繁体</dt><dd>{o.glyph.recordedTraditional}</dd>
   <dt>字形关联</dt><dd>{o.glyph.kind==='same-character'?'同一字形':'已有字条记录的 Unicode 繁体对应；不替换姓名原字'}</dd><dt>已有读音记录位置</dt><dd>{o.glyph.characterReadingIndices.join('、')}</dd>
  </dl>{o.glyph.variantEvidence&&<><h6>字形对应原始记录</h6><p>{o.glyph.variantEvidence.file} · 第 {o.glyph.variantEvidence.line} 行</p><p>{o.glyph.variantEvidence.text}</p><p>{o.glyph.variantEvidence.sha256}</p></>}
   <h6>义项记录位置</h6><ul>{o.definitions.map(d=><li key={d.definitionId}>{d.definitionId}<br/>{d.path} · 原索引 {d.index}</li>)}</ul>
  </details>
 </section>;
}
function ReferenceRecord({reference:r}:{reference:CmnReadingReference}){
 return <details className="cmn-reading-reference-record"><summary>{r.glyph.dictionaryWord} · {r.reason==='unparsed-reading'?'原记录读音未能明确解析':'仅有引用、未附独立释义'}</summary><p>此项仅供核对原记录，不作为可采用的读音或义项。</p><p>词条位置：{r.entry.path} · 读音位置：{r.heteronym.path}</p><pre>{JSON.stringify(r.heteronym.original,null,2)}</pre><dl><dt>词条摘要</dt><dd>{r.entry.sha256}</dd><dt>读音摘要</dt><dd>{r.heteronym.sha256}</dd></dl></details>;
}
export function CmnReadingContent({char,currentPinyin,state,onRetry}:{char:string;currentPinyin:string;state:CmnReadingViewState;onRetry:()=>void}){
 const q=state.query?.char===char?state.query:undefined;
 return <div className="cmn-reading-content">
  <p className="cmn-reading-current">本名用字：<strong>{char}</strong> · 本名采用：<strong>{currentPinyin||'未记录'}</strong></p>
  <p className="cmn-reading-scope">以下仅供查阅词典读音与原文义项；浏览不会更改名字读音或评分，也不代表该读音、字义适合用作姓名。</p>
  {(state.phase==='idle'||state.phase==='loading')&&<p role="status">正在读取“{char}”的词典资料……</p>}
  {state.phase==='error'&&<div className="cmn-reading-error" role="alert"><p>暂时无法读取可核对的词典资料，尚未取得其他读音与义项。</p><button type="button" className="button secondary" onClick={onRetry}>重新读取词典资料</button></div>}
  {state.phase==='ready'&&q&&<>
   <p>字库默认读音：{q.currentDefault?.pinyin||'未提供'}{q.currentDefault?.recordedTraditional&&(' · 字库登记繁体：'+q.currentDefault.recordedTraditional)}</p>
   {q.status==='unavailable'&&<p className="cmn-reading-notice" role="status">{q.unavailableReason?reasonText[q.unavailableReason]:'尚无可核对的词典读音资料。'}保留当前名字记录，不补造备选读音。</p>}
   {q.status==='reference-only'&&<p className="cmn-reading-notice" role="status">本字目前只有原始参见资料，没有可直接浏览的独立读音义项。</p>}
   {q.status==='available'&&(q.options.length>0?<div className="cmn-reading-options">{q.options.map(o=><ReadingOption key={o.optionId} option={o} currentPinyin={currentPinyin}/>)}</div>:<p className="cmn-reading-notice">此响应未提供独立读音资料，保留当前名字记录。</p>)}
   {q.references.length>0&&<section className="cmn-reading-references"><h5>仅供核对的原始参见资料</h5>{q.references.map(r=><ReferenceRecord key={r.heteronym.path} reference={r}/>)}</section>}
   <SourceVersion source={q.source} limitations={q.limitations}/>
  </>}
 </div>;
}
export function CmnReadingView({char,currentPinyin,getOptions=loadCmnReadingOptions}:{char:string;currentPinyin:string;getOptions?:CmnReadingLoader}){
 const id=useId(),controller=useMemo(()=>createCmnReadingController(char,getOptions),[char,getOptions]),state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
 useEffect(()=>{controller.activate();return()=>controller.dispose();},[controller]);
 return <details key={char} className="cmn-reading-browser" onToggle={event=>{if(event.target===event.currentTarget)void controller.setExpanded(event.currentTarget.open);}}>
  <summary id={id+'-summary'}>其他读音与义项<span className="cmn-reading-summary-char"> · {char}</span></summary>
  {state.expanded&&<section aria-labelledby={id+'-summary'} aria-busy={state.phase==='loading'}><CmnReadingContent char={char} currentPinyin={currentPinyin} state={state} onRetry={()=>void controller.retry()}/></section>}
 </details>;
}
