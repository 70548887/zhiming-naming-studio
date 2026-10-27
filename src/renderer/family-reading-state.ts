import type {CmnReadingOption,CmnReadingQuery} from '../shared/cmn-reading';
export type ParentRole='father'|'mother';
/** UI intent only; the shared serializer/validator owns all saved record fields. */
export interface ParentReadingIntent {role:ParentRole;fullName:string;surnameLength:number;givenName:string;readings:({position:number;char:string;origin:'dictionary';option:CmnReadingOption}|{position:number;char:string;origin:'family-confirmed';pinyin:string})[];}
export interface FamilyReadingRow {position:number;char:string;query?:CmnReadingQuery;error:string;origin:'dictionary'|'family-confirmed'|null;optionId:string;manualPinyin:string;familyAcknowledged:boolean;}
export interface FamilyReadingState {fullName:string;surnameLength:number|null;givenName:string;phase:'idle'|'loading'|'ready'|'error'|'confirming';rows:FamilyReadingRow[];error:string;notice:string;confirmed:boolean;focusSerial:number;}
export interface FamilyReadingConfig {role:ParentRole;getOptions:(char:string)=>Promise<CmnReadingQuery>;onConfirm:(intent:ParentReadingIntent)=>void|Promise<void>;onInvalidate:(role:ParentRole)=>void;isDisabled?:()=>boolean;}
const clone=<T>(value:T):T=>structuredClone(value);
const manualShape=(text:string)=>/^[a-züv]+(?:[1-5])$/i.test(text)||/^[a-z]+u:[a-z]*[1-5]$/i.test(text);
export function canConfirmFamilyReading(state:FamilyReadingState):boolean {
 return state.surnameLength!==null&&state.rows.length>0&&state.rows.length<=4&&state.phase!=='loading'&&state.phase!=='confirming'&&state.rows.every(row=>row.origin==='dictionary'?row.query?.status==='available'&&row.query.options.some(option=>option.optionId===row.optionId&&option.char===row.char):row.origin==='family-confirmed'&&row.familyAcknowledged&&manualShape(row.manualPinyin));
}
export function createFamilyReadingController(config:FamilyReadingConfig) {
 let state:FamilyReadingState={fullName:'',surnameLength:null,givenName:'',phase:'idle',rows:[],error:'',notice:'',confirmed:false,focusSerial:0};
 let active=true,initialized=false,epoch=0;const listeners=new Set<()=>void>();
 const publish=(patch:Partial<FamilyReadingState>)=>{state={...state,...patch};for(const listener of listeners)listener();};
 const invalidate=()=>{epoch++;config.onInvalidate(config.role);};
 const editable=()=>active&&!config.isDisabled?.()&&state.phase!=='confirming';
 const feedback=(error:string)=>publish({phase:'error',error,notice:'',focusSerial:state.focusSerial+1});
 const editRow=(position:number,mutate:(row:FamilyReadingRow)=>FamilyReadingRow)=>{if(!editable()||!state.rows[position])return;invalidate();publish({rows:state.rows.map((row,index)=>index===position?mutate(row):row),phase:'ready',confirmed:false,error:'',notice:'读音选择已改变；请重新确认完整给名。'});};
 const setName=(fullName:string)=>{if(!active||initialized&&fullName===state.fullName)return;if(typeof fullName!=='string')throw Error('家庭原姓名须为文本。');if(initialized)invalidate();else epoch++;initialized=true;publish({fullName,surnameLength:null,givenName:'',rows:[],phase:'idle',confirmed:false,error:'',notice:fullName?'请选择姓与给名的分界，再确认读音。':''});};
 const setBoundary=(n:number|null)=>{if(!editable()||n===state.surnameLength)return;const chars=[...state.fullName];if(n!==null&&(!Number.isInteger(n)||n<1||n>Math.min(4,chars.length-1)||chars.length-n>4))throw Error('姓氏分界须按原姓名的Unicode字位选择，本比较只支持1–4字给名。');invalidate();const given=n===null?'':chars.slice(n).join('');publish({surnameLength:n,givenName:given,rows:[...given].map((char,position)=>({position,char,error:'',origin:null,optionId:'',manualPinyin:'',familyAcknowledged:false})),phase:'idle',confirmed:false,error:'',notice:'分界已改变；尚未确认本次给名读音。'});};
 const load=async()=>{if(!editable()||state.surnameLength===null||!state.rows.length)return;const ticket=++epoch,name=state.fullName,boundary=state.surnameLength;publish({phase:'loading',error:'',notice:'正在读取本地词典选项。'});
  const queries=await Promise.all(state.rows.map(async row=>{try{const q=await config.getOptions(row.char);if(!q||q.char!==row.char||q.profile!=='cmn-character-source/1.0.0'||!Array.isArray(q.options)||!['available','reference-only','unavailable'].includes(q.status)||q.options.some(option=>option.char!==row.char))throw Error('读音返回资料与当前字不一致。');return{query:clone(q),error:''};}catch(error){return{query:undefined,error:error instanceof Error?error.message:'本地读音暂不可读取。'};}}));
  if(!active||ticket!==epoch||name!==state.fullName||boundary!==state.surnameLength)return;publish({phase:'ready',rows:state.rows.map((row,index)=>({...row,...queries[index]})),notice:queries.some(row=>row.error)?'部分字的词典读取未完成；可以重试或由家庭明确录入读音。':'词典选项已读取；仍需逐字明确选择，未自动采用默认读音。'});
 };
 const confirm=async()=>{if(!editable())return;if(!canConfirmFamilyReading(state)){feedback('请明确分界，并逐字选择或由家庭确认读音。');return;}
  const intent:ParentReadingIntent={role:config.role,fullName:state.fullName,surnameLength:state.surnameLength!,givenName:state.givenName,readings:state.rows.map(row=>row.origin==='dictionary'?{position:row.position,char:row.char,origin:'dictionary',option:clone(row.query!.options.find(option=>option.optionId===row.optionId)!)}:{position:row.position,char:row.char,origin:'family-confirmed',pinyin:row.manualPinyin})};
  const ticket=++epoch;publish({phase:'confirming',error:'',notice:''});try{await config.onConfirm(clone(intent));if(!active||ticket!==epoch)return;publish({phase:'ready',confirmed:true,error:'',notice:'本次给名读音已确认到资料草稿；保存档案或生成方案后留存。',focusSerial:state.focusSerial+1});}catch(error){if(!active||ticket!==epoch)return;feedback(error instanceof Error?error.message:'确认未完成，请核对后重试。');}
 };
 return {subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},getSnapshot:()=>state,setName,setBoundary,load,confirm,
  chooseOrigin:(position:number,origin:'dictionary'|'family-confirmed')=>{if(!['dictionary','family-confirmed'].includes(origin))throw Error('读音来源选项无效。');editRow(position,row=>({...row,origin,optionId:'',familyAcknowledged:false}));},
  chooseOption:(position:number,id:string)=>editRow(position,row=>{if(row.origin!=='dictionary'||row.query?.status!=='available'||!row.query.options.some(o=>o.optionId===id))throw Error('请从当前本字词典选项中明确选择。');return{...row,optionId:id};}),
  setManual:(position:number,text:string)=>editRow(position,row=>({...row,manualPinyin:text,familyAcknowledged:false})),
  acknowledge:(position:number,checked:boolean)=>editRow(position,row=>({...row,familyAcknowledged:checked})),
  activate:()=>{if(active)return;active=true;epoch++;},
  dispose:()=>{active=false;epoch++;listeners.clear();if(state.phase==='loading'||state.phase==='confirming')state={...state,phase:'idle',notice:'请求已中止；请重新读取或确认。'};}
 };
}
