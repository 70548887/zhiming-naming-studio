import React,{useEffect,useRef,useState} from 'react';
import {ArrowUpRight,ChartNoAxesColumnIncreasing,LoaderCircle,Search,X} from 'lucide-react';
import {assertOfficialNamePopularityCatalog,type OfficialNamePopularityCatalog,type OfficialNamePopularitySexCohort} from '../shared/official-name-popularity';
import {assertOfficialNamePopularityReferenceDTO,createOfficialNamePopularityReferenceDTO,lookupOfficialNamePopularityReference,type OfficialNamePopularityReferenceDTO,type OfficialNamePopularityReferenceResult} from '../shared/official-name-popularity-reference';
import './OfficialNamePopularity.css';

export interface OfficialNamePopularityApi {getOfficialNamePopularity():Promise<OfficialNamePopularityCatalog>;}
type Selection='all'|OfficialNamePopularitySexCohort;
type LoadState='loading'|'ready'|'error';
type LookupResult=OfficialNamePopularityReferenceResult;
const sexLabel=(value:OfficialNamePopularitySexCohort)=>value==='male'?'男性新生儿':'女性新生儿';
const errorText=(value:unknown)=>value instanceof Error?value.message:String(value);
const people=(value:number)=>value.toLocaleString('zh-CN');

function OfficialReportLink({source}:{source:{readonly url:string}}){
 return <a href={source.url} target="_blank" rel="noopener noreferrer">查看官方报告<ArrowUpRight size={14}/></a>;
}

export function OfficialPopularitySourceDetails({catalog}:{catalog:OfficialNamePopularityCatalog}){
 const {cohort,report}=catalog;
 return <details className="official-popularity-details"><summary>数据版本与统计口径</summary>
  <dl><dt>资料版本</dt><dd>2021 年登记给名榜 · {catalog.dataVersion.split('/').at(-1)}</dd><dt>官方报告</dt><dd>{report.title} · {report.publisher}</dd><dt>转载网站</dt><dd>{report.hostName}</dd><dt>报告发布</dt><dd>{report.visiblePublishedAt}</dd><dt>统计群体</dt><dd>{cohort.description}</dd><dt>公布母数</dt><dd>合计 {cohort.denominators.total.published}；男性 {cohort.denominators.male.published}；女性 {cohort.denominators.female.published}</dd><dt>母数精度</dt><dd>报告按 {people(cohort.denominators.total.publishedResolutionPeople)} 人的精度公布母数，未公布精确人数与舍入规则，因此不把它当作精确分母计算重名率。</dd></dl>
  <p>榜单限当年出生且在统计截止日之前已登记户籍的新生儿，不包含截至该日尚未登记者。这里只查询给名，不含姓氏。</p>
  <p>未上榜只表示这张前十榜没有公布该给名的人数，不能解释为零人、无重名或罕见。不同字形、简繁与同音名字分别查询。</p>
  <OfficialReportLink source={catalog.source}/>
 </details>;
}

export function OfficialPopularityCatalogView({reference,selection,onChoose}:{reference:OfficialNamePopularityReferenceDTO;selection:Selection;onChoose:(name:string)=>void}){
 assertOfficialNamePopularityReferenceDTO(reference);
 return <div className="official-popularity-tables">{reference.tables.filter(table=>selection==='all'||table.sexCohort===selection).map(table=><section className="official-popularity-table panel" key={table.tableNumber} aria-label={sexLabel(table.sexCohort)+'历史给名榜'}>
  <table><caption><span>{reference.historicalScope.birthYear} 年</span>{sexLabel(table.sexCohort)}给名前十</caption><thead><tr><th scope="col">排名</th><th scope="col">给名</th><th scope="col">公布人数（人）</th></tr></thead><tbody>{table.rows.map(row=><tr className="official-popularity-row" key={row.rank} data-sex-cohort={table.sexCohort} data-given-name={row.givenName} data-reported-people={row.reportedPeople}>
   <td>{row.rank}</td><th scope="row"><button type="button" aria-label={'查询给名'+row.givenName} onClick={()=>onChoose(row.givenName)}>{row.givenName}</button></th><td>{people(row.reportedPeople)}</td>
  </tr>)}</tbody></table><p className="official-popularity-table-scope">{reference.historicalScope.birthYear} 年出生，截至 {reference.historicalScope.registeredBy} 已登记户籍；给名不含姓氏。</p><OfficialReportLink source={reference.source}/>
 </section>)}</div>;
}

export function OfficialPopularityResults({result}:{result:LookupResult}){
 return <section className="official-popularity-results" aria-labelledby="official-popularity-results-title"><h3 id="official-popularity-results-title">给名“{result.givenName}”的历史记录</h3><div className="official-popularity-result-grid">{result.records.map(record=><article className={'official-popularity-result panel '+record.status} key={record.sexCohort} data-given-name={result.givenName} data-sex-cohort={record.sexCohort} data-result-status={record.status} data-reported-people={record.reportedPeople??undefined}>
  <h4>{result.historicalScope.birthYear} 年 · {sexLabel(record.sexCohort)}</h4>
  {record.status==='listed'&&record.reportedPeople!==null?<><div className="official-popularity-count"><strong>{people(record.reportedPeople)}</strong><span>人</span></div><p>该榜第 {record.rank} 名 · 官方公布人数</p></>:<><strong className="official-popularity-unpublished">人数未公布</strong><p>未列入该榜前十，不代表零人或没有重名。</p></>}
  <p className="official-popularity-result-scope">{result.historicalScope.birthYear} 年出生，截至 {result.historicalScope.registeredBy} 已登记户籍；仅统计给名，不含姓氏。</p><OfficialReportLink source={result.source}/>
 </article>)}</div></section>;
}

export function OfficialNamePopularity({api=window.studio}:{api?:OfficialNamePopularityApi}){
 const [catalog,setCatalog]=useState<OfficialNamePopularityCatalog|null>(null),[state,setState]=useState<LoadState>('loading'),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const [reference,setReference]=useState<OfficialNamePopularityReferenceDTO|null>(null);
 const [query,setQuery]=useState(''),[submitted,setSubmitted]=useState<string|null>(null),[selection,setSelection]=useState<Selection>('all');
 const inputRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  let active=true;setState('loading');setError('');setCatalog(null);setReference(null);
  Promise.resolve().then(()=>{if(active)return api.getOfficialNamePopularity();}).then(value=>{if(active){assertOfficialNamePopularityCatalog(value);const dto=createOfficialNamePopularityReferenceDTO(value);setCatalog(structuredClone(value));setReference(dto);setState('ready');}}).catch(reason=>{if(active){setError(errorText(reason));setState('error');}});
  return()=>{active=false;};
 },[api,retry]);
 let result:OfficialNamePopularityReferenceResult|null=null,queryError='';
 if(reference&&submitted!==null){try{result=lookupOfficialNamePopularityReference(reference,{givenName:submitted,sexCohorts:selection==='all'?['male','female']:[selection]});}catch(reason){queryError=errorText(reason);}}
 const browse=()=>{setQuery('');setSubmitted(null);setSelection('all');inputRef.current?.focus();};
 const choose=(name:string)=>{setQuery(name);setSubmitted(name);};
 return <section className="official-name-popularity" aria-label="历史姓名统计" aria-busy={state==='loading'}>
  <header className="official-popularity-intro"><div><span className="official-popularity-kicker"><ChartNoAxesColumnIncreasing size={17}/>官方历史榜单</span><h2>历史姓名统计</h2><p>查询 2021 年出生且截至当年年底已登记的新生儿给名前十，男女分别列示。</p></div><span className="official-popularity-year">2021 年 · 已登记新生儿</span></header>
  <p className="official-popularity-boundary">这是历史给名榜，不是当前全国重名率。统计不含姓氏，不合并同音、简繁或不同字形。</p>
  <form className="official-popularity-controls" onSubmit={event=>{event.preventDefault();if(state==='ready')setSubmitted(query);}}>
   <label className="official-popularity-input-label" htmlFor="official-given-name-input">给名（不含姓氏）<span className="official-popularity-search"><Search size={17}/><input id="official-given-name-input" ref={inputRef} data-shortcut-search type="text" autoComplete="off" aria-label="给名（不含姓氏）" aria-describedby={'official-popularity-query-help'+(queryError?' official-popularity-query-error':'')} aria-invalid={!!queryError} value={query} onChange={event=>{setQuery(event.target.value);setSubmitted(null);}} placeholder="例如：沐宸"/>{query&&<button type="button" aria-label="清空给名" onClick={browse}><X size={16}/></button>}</span></label>
   <label className="official-popularity-range">查看范围<select aria-label="查看榜单范围" value={selection} onChange={event=>setSelection(event.target.value as Selection)}><option value="all">男女两榜</option><option value="male">男性新生儿榜</option><option value="female">女性新生儿榜</option></select></label>
   <button type="submit" className="button primary" disabled={state!=='ready'}>查询给名</button><button type="button" className="button secondary" onClick={browse}>浏览两榜</button>
  </form>
  <p id="official-popularity-query-help" className="official-popularity-help">请直接输入给名，例如“沐宸”；输入“王沐宸”会按完整原字查询，不会自动去姓。</p>
  {state==='loading'&&<p className="official-popularity-loading" role="status"><LoaderCircle size={17} className="spin"/>正在读取本地历史榜单…</p>}
  {state==='error'&&<div className="official-popularity-error" role="alert"><strong>历史榜单读取未完成</strong><p>{error}</p><p>可以重试，已输入的给名会保留。</p><button type="button" className="button secondary" onClick={()=>setRetry(value=>value+1)}>重新读取榜单</button></div>}
  {state==='ready'&&catalog&&reference&&<>
   {queryError&&<div className="official-popularity-error" id="official-popularity-query-error" role="alert"><strong>给名查询未完成</strong><p>{queryError}</p></div>}
   {!queryError&&result?<OfficialPopularityResults result={result}/>:<>{query&&submitted===null&&<p className="official-popularity-pending" role="status">输入已更新，点击“查询给名”查看结果。下方仍为历史前十榜单。</p>}<OfficialPopularityCatalogView reference={reference} selection={selection} onChoose={choose}/></>}
   <p className="official-popularity-readonly">仅供了解历史用名趋势，不据此调整起名评分。</p><OfficialPopularitySourceDetails catalog={catalog}/>
  </>}
 </section>;
}
