import React,{useEffect,useRef,useState} from 'react';
import {ArrowUpRight,BookOpen,ChevronLeft,ChevronRight,LoaderCircle,Search,X} from 'lucide-react';
import type {ClassicBookId,ClassicSearchResponse,ClassicSection} from '../shared/classics-types';
import {mapClassicReadingMatch,parseClassicReading} from '../shared/classics-reading';
import './ClassicsLibrary.css';

export interface ClassicsLibraryApi {
 searchClassics(query:string,bookId?:ClassicBookId,page?:number):Promise<ClassicSearchResponse>;
 readClassicSection(id:string):Promise<ClassicSection>;
}
type LoadState='loading'|'ready'|'error';
export interface ClassicTextMatch {sectionId:string;start:number;end:number;}
export type ClassicReadingMode='reading'|'raw';
const errorText=(error:unknown)=>error instanceof Error?error.message:String(error);

export function ClassicSourceDetails({section}:{section:ClassicSection}){
 return <details className="classic-source-details"><summary>版本与来源</summary><dl>
  <dt>电子版本</dt><dd>{section.bookTitle} · 修订 {section.revision}</dd>
  <dt>章节</dt><dd>{section.path.join(' / ')||section.title}</dd>
  <dt>原文位置</dt><dd>第 {section.start.toLocaleString()} 至 {section.end.toLocaleString()} 个原始字符区间（从零计，末位不含）</dd>
  <dt>文本校验</dt><dd className="mono">{section.sha256}</dd>
  <dt>来源与许可</dt><dd>{section.source.name} · {section.source.license}</dd>
 </dl><p>{section.quality.note}</p><a href={section.source.url} target="_blank" rel="noopener noreferrer">查看固定来源<ArrowUpRight size={14}/></a></details>;
}

export function ClassicSectionView({section,onRead,onBack,headingRef,match,matchRef,mode,onModeChange}:{section:ClassicSection;onRead:(id:string)=>void;onBack:()=>void;headingRef?:React.RefObject<HTMLHeadingElement|null>;match?:ClassicTextMatch|null;matchRef?:React.RefObject<HTMLElement|null>;mode:ClassicReadingMode;onModeChange:(mode:ClassicReadingMode)=>void}){
 const privateUse=section.quality.privateUseCharacters;
 const hasMatch=!!match&&match.sectionId===section.id&&Number.isSafeInteger(match.start)&&Number.isSafeInteger(match.end)&&match.start>=section.start&&match.start<section.end&&match.end>match.start;
 const reading=mode==='reading'?parseClassicReading(section.rawText,section.start):null;
 const displayText=reading?reading.text:section.rawText,characters=[...displayText],sourceEnd=hasMatch?Math.min(match!.end,section.end):0;
 const ranges=hasMatch?(reading?mapClassicReadingMatch(reading,match!.start,sourceEnd):[{displayStart:match!.start-section.start,displayEnd:sourceEnd-section.start,sourceStart:match!.start,sourceEnd}]):[];
 const incompleteDisplayMatch=!!reading&&hasMatch&&ranges.reduce((sum,range)=>sum+range.sourceEnd-range.sourceStart,0)<sourceEnd-match!.start;
 const fragments:React.ReactNode[]=[];let previous=0;
 for(const [index,range]of ranges.entries()){fragments.push(characters.slice(previous,range.displayStart).join(''));fragments.push(<mark key={index} tabIndex={-1} ref={index===0?matchRef:undefined} aria-label="原文匹配位置">{characters.slice(range.displayStart,range.displayEnd).join('')}</mark>);previous=range.displayEnd;}
 fragments.push(characters.slice(previous).join(''));
 return <article className="classic-reader panel" aria-labelledby="classic-reader-title">
  <header><span className="classic-book-label"><BookOpen size={16}/>{section.bookTitle}</span>
   <h3 id="classic-reader-title" ref={headingRef} tabIndex={-1}>{section.title}</h3>
   {section.path.length>1&&<p className="classic-chapter-path">{section.path.join(' / ')}</p>}
   <div className="classic-reading-mode segmented" role="group" aria-label="原文显示方式"><button className={mode==='reading'?'selected':''} aria-pressed={mode==='reading'} onClick={()=>onModeChange('reading')}>阅读</button><button className={mode==='raw'?'selected':''} aria-pressed={mode==='raw'} onClick={()=>onModeChange('raw')}>原始文本</button></div>
   <button className="text-button" onClick={onBack}>返回章节列表</button>
  </header>
  {privateUse.length>0&&<div className="classic-quality-note" role="note"><strong>本节有 {privateUse.length} 个待校字</strong><p>原文私用字按原码点保留：{[...new Set(privateUse.map(item=>item.codepoint))].join('、')}。可对照来源核查。</p></div>}
  {hasMatch&&match!.end>section.end&&<p className="classic-cross-section">匹配内容延伸至下一节，可继续阅读。</p>}
  {incompleteDisplayMatch&&<p className="classic-cross-section">部分匹配位于原始标记中，可切换“原始文本”核对。</p>}
  {!displayText.trim()&&mode==='reading'&&<p className="classic-empty-section">本节为书目或分篇标记，可继续阅读下一节，或查看原始文本。</p>}
  <div className="classic-reader-text" aria-label="完整章节原文">{fragments}</div>
  <nav className="classic-reading-nav" aria-label="连续阅读">
   <button className="button secondary" disabled={!section.previousSectionId} onClick={()=>section.previousSectionId&&onRead(section.previousSectionId)}><ChevronLeft size={16}/>上一节</button>
   <button className="button secondary" disabled={!section.nextSectionId} onClick={()=>section.nextSectionId&&onRead(section.nextSectionId)}>下一节<ChevronRight size={16}/></button>
  </nav><ClassicSourceDetails section={section}/>
 </article>;
}

export function ClassicsLibrary({api=window.studio}:{api?:ClassicsLibraryApi}){
 const [query,setQuery]=useState(''),[bookId,setBookId]=useState<ClassicBookId|''>(''),[page,setPage]=useState(1);
 const [response,setResponse]=useState<ClassicSearchResponse|null>(null),[state,setState]=useState<LoadState>('loading'),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const [selectedId,setSelectedId]=useState(''),[section,setSection]=useState<ClassicSection|null>(null),[readState,setReadState]=useState<LoadState>('ready'),[readError,setReadError]=useState(''),[readRetry,setReadRetry]=useState(0);
 const [selectedMatch,setSelectedMatch]=useState<ClassicTextMatch|null>(null);
 const [readMode,setReadMode]=useState<ClassicReadingMode>('reading');
 const searchRef=useRef<HTMLInputElement>(null),listHeadingRef=useRef<HTMLHeadingElement>(null),readerHeadingRef=useRef<HTMLHeadingElement>(null),matchRef=useRef<HTMLElement>(null);
 useEffect(()=>{
  let cancelled=false;setState('loading');setError('');
  const timer=setTimeout(()=>{api.searchClassics(query,bookId||undefined,page).then(value=>{if(!cancelled){setResponse(value);setState('ready');}}).catch(reason=>{if(!cancelled){setError(errorText(reason));setState('error');}});},180);
  return()=>{cancelled=true;clearTimeout(timer);};
 },[api,query,bookId,page,retry]);
 useEffect(()=>{
  if(!selectedId)return;let cancelled=false;setReadState('loading');setReadError('');setSection(null);
  api.readClassicSection(selectedId).then(value=>{if(!cancelled){setSection(value);setReadState('ready');}}).catch(reason=>{if(!cancelled){setReadError(errorText(reason));setReadState('error');}});
  return()=>{cancelled=true;};
 },[api,selectedId,readRetry]);
 useEffect(()=>{if(section&&readState==='ready'){const target=selectedMatch&&matchRef.current||readerHeadingRef.current;target?.focus({preventScroll:true});target?.scrollIntoView({block:selectedMatch?'center':'nearest'});}},[section,readState,selectedMatch,readMode]);
 const books=response?.books||[],selectedBook=books.find(book=>book.id===bookId);
 const resetReading=()=>{setSelectedId('');setSelectedMatch(null);setSection(null);setReadError('');setReadState('ready');};
 const chooseBook=(value:ClassicBookId|'')=>{setBookId(value);setPage(1);resetReading();};
 const changeQuery=(value:string)=>{setQuery(value);setPage(1);resetReading();};
 const readSection=(id:string)=>{setSelectedMatch(null);setSelectedId(id);};
 const backToList=()=>{listHeadingRef.current?.focus();};
 return <section className="classics-library" aria-label="原典全文检索">
  <div className="classic-library-intro"><div><h2>原典全文</h2><p>离线检索、按章节连续阅读。保留固定电子版本的原字与标记，繁简异写请换用原文用字检索。</p></div>{books.length>0&&<span>{books.length} 部古籍 · {books.reduce((sum,book)=>sum+book.sectionCount,0)} 节</span>}</div>
  <div className="classic-library-controls"><label>选择古籍<select aria-label="选择古籍" value={bookId} onChange={event=>chooseBook(event.target.value as ClassicBookId|'')}><option value="">全部古籍</option>{books.map(book=><option value={book.id} key={book.id}>{book.title}</option>)}</select></label>
   <div className="classic-search-input"><Search size={17}/><input ref={searchRef} data-shortcut-search type="search" aria-label="检索原典全文" value={query} onChange={event=>changeQuery(event.target.value)} placeholder="输入原文关键词，如五行、通根"/>{query&&<button aria-label="清空原典关键词" onClick={()=>{changeQuery('');searchRef.current?.focus();}}><X size={16}/></button>}</div>
  </div>
  {selectedBook&&<p className="classic-book-description">{selectedBook.title} · {selectedBook.sectionCount} 节 · {selectedBook.codepoints.toLocaleString()} 个原始字符{selectedBook.quality.privateUseCount>0?` · ${selectedBook.quality.privateUseCount} 个待校私用字`:''}</p>}
  <p className="classic-library-boundary">全文供原典阅读与条件核查；条文的适用前提需分别核对。</p>
  <div className="classic-library-layout"><section className="classic-search-results" aria-labelledby="classic-results-title" aria-busy={state==='loading'}>
   <h3 id="classic-results-title" tabIndex={-1} ref={listHeadingRef}>{query.trim()?'检索结果':'章节目录'}</h3>
   {state==='loading'&&<p className="classic-loading" role="status"><LoaderCircle size={17} className="spin"/>正在检索本地原典…</p>}
   {state==='error'&&<div className="classic-error" role="alert"><strong>原典检索未完成</strong><p>{error}</p><button className="button secondary" onClick={()=>setRetry(value=>value+1)}>重新检索</button></div>}
   {state==='ready'&&response&&<><p className="classic-result-count" role="status">{response.query?`“${response.query}” · `:''}{response.total}{response.query?' 处匹配':' 节'}{response.total>0?` · 第 ${response.page} / ${response.pageCount} 页`:''}</p>
    {response.total===0&&<div className="classic-empty"><BookOpen size={27}/><strong>未找到匹配原文</strong><p>可缩短关键词，或使用原书繁体、异体字再次检索。</p><button className="text-button" onClick={()=>changeQuery('')}>浏览章节目录</button></div>}
    <ol className="classic-hits">{response.hits.map(hit=><li key={hit.id}><button className={'classic-hit'+(selectedId===hit.sectionId&&(!response.query||selectedMatch?.start===hit.sourceStart)?' selected':'')} onClick={()=>{setSelectedMatch(response.query?{sectionId:hit.sectionId,start:hit.sourceStart,end:hit.sourceEnd}:null);setSelectedId(hit.sectionId);}} aria-pressed={selectedId===hit.sectionId&&(!response.query||selectedMatch?.start===hit.sourceStart)}><span className="classic-hit-book">{hit.bookTitle}</span><strong>{hit.sectionTitle}</strong>{hit.sectionPath.length>1&&<span className="classic-hit-path">{hit.sectionPath.join(' / ')}</span>}<span className="classic-hit-excerpt">{hit.readingExcerpt.trim()||'本节暂无可读正文，可打开原始文本核对。'}</span><span className="classic-hit-action">阅读本节<ChevronRight size={14}/></span></button></li>)}</ol>
    {response.pageCount>1&&<nav className="classic-pagination" aria-label="原典结果翻页"><button className="button secondary" disabled={response.page<=1} onClick={()=>setPage(response.page-1)}><ChevronLeft size={15}/>上一页</button><span>{response.page} / {response.pageCount}</span><button className="button secondary" disabled={response.page>=response.pageCount} onClick={()=>setPage(response.page+1)}>下一页<ChevronRight size={15}/></button></nav>}
   </>}
  </section><div className="classic-reader-area" aria-busy={readState==='loading'}>
   {!selectedId&&<div className="classic-reader-placeholder panel"><BookOpen size={32}/><h3>选择章节，阅读完整原文</h3><p>每节均可查看固定来源、版本和原文定位。含疑字的章节保留原字并提示核查。</p></div>}
   {selectedId&&readState==='loading'&&<p className="classic-loading" role="status"><LoaderCircle size={17} className="spin"/>正在读取完整章节…</p>}
   {selectedId&&readState==='error'&&<div className="classic-error" role="alert"><strong>章节读取未完成</strong><p>{readError}</p><button className="button secondary" onClick={()=>setReadRetry(value=>value+1)}>重新读取</button></div>}
   {selectedId&&readState==='ready'&&section&&<ClassicSectionView section={section} onRead={readSection} onBack={backToList} headingRef={readerHeadingRef} match={selectedMatch} matchRef={matchRef} mode={readMode} onModeChange={setReadMode}/>}
  </div></div>
 </section>;
}
