import type {SingleCharacterMeaningOptions,SingleCharacterMeaningQuery} from '../shared/single-character-meaning';

/** Consumer of the existing query method; no endpoint or server contract is created here. */
export interface SingleCharacterMeaningQueryApi {
 getSingleCharacterMeaningOptions:(input:SingleCharacterMeaningQuery)=>SingleCharacterMeaningOptions|Promise<SingleCharacterMeaningOptions>;
}
export interface CharacterMeaningState {
 char:string;pinyin:string;tone:string;
 phase:'idle'|'loading'|'ready'|'error';api:SingleCharacterMeaningQueryApi|undefined;
 query?:SingleCharacterMeaningQuery;result?:SingleCharacterMeaningOptions;
 error?:string;inputError?:boolean;notice?:string;
}
export function hasSingleCharacterMeaningQuery(value:unknown):value is SingleCharacterMeaningQueryApi {
 if(!value||typeof value!=='object')return false;
 try{const descriptor=Object.getOwnPropertyDescriptor(value,'getSingleCharacterMeaningOptions');return !!descriptor&&Object.hasOwn(descriptor,'value')&&typeof descriptor.value==='function';}catch{return false;}
}
export function characterMeaningQuery(char:string,pinyin:string,tone:string):SingleCharacterMeaningQuery {
 const target=char.trim();if(!/^\p{Script=Han}$/u.test(target))throw Error('请输入一个汉字。');
 if(pinyin.length>80||/[\u0000-\u001f\u007f]/u.test(pinyin))throw Error('读音须为有效拼音文本；留空时不发送读音筛选。');
 if(tone!==''&&!/^[1-5]$/.test(tone))throw Error('请选择第 1–4 声或轻声，也可不指定声调。');
 return {char:target,...(pinyin.trim()?{pinyin}:{}),...(tone?{tone:Number(tone)}:{})};
}
const own=(value:unknown,key:string):unknown=>{if(!value||typeof value!=='object')return undefined;try{const descriptor=Object.getOwnPropertyDescriptor(value,key);return descriptor&&Object.hasOwn(descriptor,'value')?descriptor.value:undefined;}catch{return undefined;}};
const plain=(value:unknown):boolean=>!!value&&typeof value==='object'&&!Array.isArray(value);
const text=(value:unknown):value is string=>typeof value==='string';
const strings=(value:unknown):boolean=>Array.isArray(value)&&value.every(item=>typeof item==='string');
const toneValue=(value:unknown):boolean=>typeof value==='number'&&Number.isInteger(value)&&value>=1&&value<=5;
function readonlyScope(value:unknown):boolean {return own(value,'scope')==='on-request-supplement-only'&&own(value,'wholeNameMeaning')===null&&own(value,'automaticNameRecommendation')===false&&own(value,'automaticSemanticCreditAllowed')===false&&own(value,'scoreDelta')===0;}
function validBatch(value:unknown):boolean {
 if(!plain(value)||!text(own(value,'batchId'))||!text(own(value,'sourceId'))||!text(own(value,'publicationState'))||!text(own(value,'activation'))||own(value,'productionApproved')!==false)return false;
 return (own(value,'admission')==='approved-character-notes'&&own(value,'candidateOnly')===false)||(own(value,'admission')==='candidate-awaiting-independent-review'&&own(value,'candidateOnly')===true);
}
/** Checks displayed DTO fields and request binding, not the loader's resource authentication. */
export function validCharacterMeaningResult(value:unknown,query:SingleCharacterMeaningQuery):value is SingleCharacterMeaningOptions {
 try{
  if(!plain(value)||own(value,'schema')!=='single-character-meaning-options/1'||own(value,'char')!==query.char||!readonlyScope(value)||!strings(own(value,'limits')))return false;
  const pinyin=own(value,'pinyin'),status=own(value,'status'),options=own(value,'options'),batch=own(value,'source');
  if(pinyin!==null&&!text(pinyin))return false;if(query.pinyin!==undefined&&pinyin!==query.pinyin)return false;
  if(!Array.isArray(options))return false;
  if(status==='ambiguous-reading'||status==='not-covered')return options.length===0&&batch===null;
  if(status!=='available'||options.length===0||!text(pinyin)||!pinyin||!validBatch(batch))return false;
  return options.every(option=>{
   const source=own(option,'source'),project=own(option,'project'),optionBatch=own(option,'batch'),defaultReading=own(option,'defaultReading'),definition=own(source,'definition');
   if(!plain(option)||!readonlyScope(option)||own(option,'char')!==query.char||own(option,'pinyin')!==pinyin||!toneValue(own(option,'tone'))||(query.tone!==undefined&&own(option,'tone')!==query.tone)||!text(own(option,'meaning'))||!strings(own(option,'limits')))return false;
   if(!validBatch(optionBatch)||own(optionBatch,'batchId')!==own(batch,'batchId')||own(optionBatch,'sourceId')!==own(batch,'sourceId')||own(optionBatch,'admission')!==own(batch,'admission'))return false;
   if(!plain(source)||!text(own(source,'sourceId'))||!text(own(source,'word'))||own(source,'pinyin')!==pinyin||own(source,'tone')!==own(option,'tone')||!plain(definition)||!text(own(definition,'def'))||!text(own(source,'sourcePOS'))||!text(own(source,'license'))||!Array.isArray(own(source,'readings')))return false;
   if(!plain(project)||!text(own(project,'meaning'))||!text(own(project,'attribution'))||!text(own(project,'license'))||!strings(own(project,'limits'))||(own(project,'projectWish')!==null&&!text(own(project,'projectWish'))))return false;
   return defaultReading===undefined||(plain(defaultReading)&&text(own(defaultReading,'pinyin'))&&toneValue(own(defaultReading,'tone'))&&text(own(defaultReading,'word'))&&strings(own(defaultReading,'meanings')));
  });
 }catch{return false;}
}
export interface CharacterMeaningController {
 getSnapshot:()=>CharacterMeaningState;subscribe:(listener:()=>void)=>()=>void;
 activate:()=>void;dispose:()=>void;refreshApi:()=>void;
 setChar:(value:string)=>void;setPinyin:(value:string)=>void;setTone:(value:string)=>void;query:()=>Promise<void>;
}
export function createCharacterMeaningController({getApi,isDisabled=()=>false}:{getApi:()=>SingleCharacterMeaningQueryApi|undefined;isDisabled?:()=>boolean}):CharacterMeaningController {
 let alive=false,serial=0,epoch=0,state:CharacterMeaningState={char:'',pinyin:'',tone:'',phase:'idle',api:getApi()};const listeners=new Set<()=>void>();
 const publish=(next:CharacterMeaningState)=>{state=next;for(const listener of listeners)listener();};
 const idle=(api:SingleCharacterMeaningQueryApi|undefined,notice?:string):CharacterMeaningState=>({char:state.char,pinyin:state.pinyin,tone:state.tone,phase:'idle',api,notice});
 const change=(key:'char'|'pinyin'|'tone',value:string)=>{if(state[key]===value)return;serial++;epoch++;publish({...idle(getApi(),'查询条件已改变，请点击查阅。'),[key]:value});};
 return {
  getSnapshot:()=>state,subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);},activate:()=>{alive=true;},dispose:()=>{alive=false;serial++;epoch++;state=idle(getApi());},
  refreshApi:()=>{const api=getApi();if(state.api===api)return;serial++;epoch++;publish(idle(api,'查询服务已更新，请重新查阅。'));},
  setChar:value=>change('char',value),setPinyin:value=>change('pinyin',value),setTone:value=>change('tone',value),
  query:async()=>{
   const api=getApi();if(!alive||isDisabled()||!hasSingleCharacterMeaningQuery(api))return;
   if(state.api!==api){serial++;epoch++;publish(idle(api));}if(state.phase==='loading')return;
   let query:SingleCharacterMeaningQuery;try{query=characterMeaningQuery(state.char,state.pinyin,state.tone);}catch(error){publish({...idle(api),phase:'error',inputError:true,error:error instanceof Error?error.message:'请检查查询条件。'});return;}
   const lease={api,serial:++serial,epoch};publish({...idle(api),phase:'loading',query});const owns=()=>alive&&serial===lease.serial&&epoch===lease.epoch&&getApi()===lease.api;
   try{const result=await api.getSingleCharacterMeaningOptions({...query});if(!owns())return;if(!validCharacterMeaningResult(result,query)){publish({...idle(api),phase:'error',query,error:'返回资料与查询读音或只读范围不一致，未展示结果。'});return;}publish({...idle(api),phase:'ready',query,result});}
   catch{if(owns())publish({...idle(api),phase:'error',query,error:'本次释义资料暂不可读取，旧结果已隐藏。请保留输入后重试。'});}
  },
 };
}
