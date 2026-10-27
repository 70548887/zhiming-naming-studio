import type {B04WordContextApi,B04WordContextOptions,B04WordContextQuery} from '../shared/b04-word-context';

export type B04QueryPhase='idle'|'loading'|'ready'|'error';
export interface B04QueryState {
 char:string;pinyin:string;phase:B04QueryPhase;api:B04WordContextApi|undefined;
 query?:B04WordContextQuery;result?:B04WordContextOptions;error?:string;errorKind?:'input'|'request'|'response';notice?:string;
}
export function hasB04WordContextApi(value:unknown):value is B04WordContextApi {
 if(!value||typeof value!=='object')return false;
 const method=Object.getOwnPropertyDescriptor(value,'getB04WordContextOptions');
 return !!method&&Object.hasOwn(method,'value')&&typeof method.value==='function';
}
export function readB04Query(char:string,pinyin:string):B04WordContextQuery {
 const target=char.trim(),reading=pinyin.trim();
 if(!/^\p{Script=Han}$/u.test(target))throw Error('请输入一个汉字。');
 if(reading.length>80||/[\u0000-\u001f\u007f]/u.test(reading))throw Error('请填写有效的读音文本，或留空查询。');
 return reading?{char:target,pinyin:reading}:{char:target};
}
const plain=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
function hasReadonlyScope(value:Record<string,unknown>):boolean {
 return value.activation==='off'&&value.wholeWordOnly===true&&value.sourcePOS==='unknown'&&value.productionApproved===false&&value.automaticNameRecommendation===false&&value.automaticSemanticCreditAllowed===false&&value.wholeNameApproved===false&&value.wholeNameMeaning===null&&value.scoreDelta===0;
}
/** Return binding and display scope only; resource authentication remains owned by the Service. */
export function matchesB04Query(value:unknown,query:B04WordContextQuery):value is B04WordContextOptions {
 if(!plain(value)||value.schema!=='b04-word-context-options/1'||value.char!==query.char||value.pinyin!==(query.pinyin??null)||!hasReadonlyScope(value)||!Array.isArray(value.options)||!Array.isArray(value.sourceAnchors))return false;
 if(value.status!=='available'&&value.status!=='not-covered')return false;
 if(value.status==='available'?!value.options.length:!!value.options.length)return false;
 return value.options.every(option=>plain(option)&&hasReadonlyScope(option)&&typeof option.word==='string'&&!!option.word&&typeof option.givenName==='string'&&typeof option.contextLabel==='string'&&typeof option.reason==='string'&&plain(option.source)&&plain(option.grammar)&&Array.isArray(option.targetPositions)&&Array.isArray(option.confirmedReadings)&&(!query.pinyin||option.confirmedReadings.some(reading=>plain(reading)&&reading.char===query.char&&reading.pinyin===query.pinyin))&&Array.isArray(option.exclusions)&&option.exclusions.every(x=>typeof x==='string')&&Array.isArray(option.limits)&&option.limits.every(x=>typeof x==='string')&&plain(option.selection)&&option.selection.usage==='entire-given-name'&&option.projectWish===null);
}
export interface B04QueryController {
 getSnapshot:()=>B04QueryState;subscribe:(listener:()=>void)=>()=>void;
 activate:()=>void;dispose:()=>void;refreshApi:()=>void;
 setChar:(value:string)=>void;setPinyin:(value:string)=>void;query:()=>Promise<void>;
}
export function createB04QueryController({getApi,isDisabled=()=>false,initialChar='',initialPinyin=''}:{getApi:()=>B04WordContextApi|undefined;isDisabled?:()=>boolean;initialChar?:string;initialPinyin?:string}):B04QueryController {
 let alive=false,serial=0,epoch=0;
 let state:B04QueryState={char:initialChar,pinyin:initialPinyin,phase:'idle',api:getApi()};
 const listeners=new Set<()=>void>(),publish=(next:B04QueryState)=>{state=next;for(const listener of listeners)listener();};
 const change=(field:'char'|'pinyin',value:string)=>{if(state[field]===value)return;serial++;epoch++;publish({char:state.char,pinyin:state.pinyin,[field]:value,phase:'idle',api:getApi(),notice:'查询条件已修改，请重新查询。'});};
 return {
  getSnapshot:()=>state,subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);},
  activate:()=>{alive=true;},dispose:()=>{alive=false;serial++;epoch++;state={char:state.char,pinyin:state.pinyin,phase:'idle',api:getApi()};},
  refreshApi:()=>{const api=getApi();if(state.api===api)return;serial++;epoch++;publish({char:state.char,pinyin:state.pinyin,phase:'idle',api,notice:'查询服务已更新，请重新查询。'});},
  setChar:value=>change('char',value),setPinyin:value=>change('pinyin',value),
  query:async()=>{
   const api=getApi();if(!alive||isDisabled()||!hasB04WordContextApi(api)||(state.phase==='loading'&&state.api===api))return;
   let query:B04WordContextQuery;try{query=readB04Query(state.char,state.pinyin);}catch(error){publish({char:state.char,pinyin:state.pinyin,phase:'error',api,errorKind:'input',error:error instanceof Error?error.message:'请输入一个汉字。'});return;}
   const lease={api,serial:++serial,epoch};publish({char:state.char,pinyin:state.pinyin,phase:'loading',api,query});
   const owns=()=>alive&&lease.serial===serial&&lease.epoch===epoch&&getApi()===lease.api;
   try{const result=await api.getB04WordContextOptions({...query});if(!owns())return;if(!matchesB04Query(result,query)){publish({char:state.char,pinyin:state.pinyin,phase:'error',api,query,errorKind:'response',error:'返回资料与本次查询或只读范围不一致，未展示结果。'});return;}publish({char:state.char,pinyin:state.pinyin,phase:'ready',api,query,result});}
   catch{if(owns())publish({char:state.char,pinyin:state.pinyin,phase:'error',api,query,errorKind:'request',error:'暂时未能读取词境，请保留当前输入后重试。'});}
  },
 };
}
