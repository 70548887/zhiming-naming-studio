const PROFILE='project-dictionary-object-elements/1.0.0';
const ELEMENTS=['木','水','火','金','土'];
const clone=value=>JSON.parse(JSON.stringify(value));
const failure=(status,reason)=>({profileId:PROFILE,status,effectiveElements:[],matchingSourceCandidates:[],conditionalAssessment:null,reason,traditionalAssessment:{status:'pending',elements:[]}});
/** Descriptor-only JSON validation: never evaluates getters or toJSON. */
export function canonicalPlainJson(value,depth=0){
 if(depth>80)throw Error('JSON nesting limit');
 if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
 if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 if(Array.isArray(value)){
  if(Object.getPrototypeOf(value)!==Array.prototype)throw Error('Nonplain array');
  const lengthDescriptor=Object.getOwnPropertyDescriptor(value,'length');
  const length=lengthDescriptor?.value;
  if(!Number.isSafeInteger(length)||length<0||length>100000)throw Error('Invalid array length');
  const keys=Reflect.ownKeys(value);
  if(keys.length!==length+1||keys.some(k=>typeof k!=='string'||k!=='length'&&!/^(0|[1-9]\d*)$/.test(k)))throw Error('Extra array metadata');
  const parts=[];for(let i=0;i<length;i++){const d=Object.getOwnPropertyDescriptor(value,String(i));if(!d||!Object.hasOwn(d,'value')||!d.enumerable)throw Error('Array hole or accessor');parts.push(canonicalPlainJson(d.value,depth+1));}
  return '['+parts.join(',')+']';
 }
 if(value&&typeof value==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(value))){
  const keys=Reflect.ownKeys(value);if(keys.some(k=>typeof k!=='string'))throw Error('Symbol key');
  return '{'+keys.sort().map(k=>{const d=Object.getOwnPropertyDescriptor(value,k);if(!d||!Object.hasOwn(d,'value')||!d.enumerable)throw Error('Hidden property or accessor');return JSON.stringify(k)+':'+canonicalPlainJson(d.value,depth+1);}).join(',')+'}';
 }
 throw Error('Non JSON value');
}
/** Pure lookup. Entry identity is the immutable MOE source entry, not display meaning text. */
export function lookupElementAssessment(overlay,input){
 try{input=JSON.parse(canonicalPlainJson(input));}catch{return failure('invalid-input','输入必须是无访问器、空位、隐藏字段和非JSON值的普通JSON对象。');}
 const required=['char','pinyin','sourceEntrySha256'],allowed=[...required,'sourceReadingSha256','profileOptIn','confirmedEvidenceIds'];
 if(!input||Array.isArray(input)||typeof input!=='object'||Object.keys(input).some(k=>!allowed.includes(k))||required.some(k=>!Object.hasOwn(input,k)))return failure('invalid-input','输入字段必须严格符合lookup契约。');
 if(typeof input.char!=='string'||[...input.char].length!==1||/^[\uD800-\uDFFF]$/u.test(input.char)||typeof input.pinyin!=='string'||!input.pinyin.trim()||typeof input.sourceEntrySha256!=='string'||!/^[0-9a-f]{64}$/.test(input.sourceEntrySha256)||Object.hasOwn(input,'sourceReadingSha256')&&(typeof input.sourceReadingSha256!=='string'||!/^[0-9a-f]{64}$/.test(input.sourceReadingSha256))||Object.hasOwn(input,'profileOptIn')&&typeof input.profileOptIn!=='boolean')return failure('invalid-input','原字须为单一Unicode标量，读音须非空，SHA须64位小写十六进制，开关须布尔。');
 try{overlay=JSON.parse(canonicalPlainJson(overlay));}catch{return failure('invalid-overlay','overlay必须是经过固定来源锁校验的普通JSON资料。');}
 if(!overlay||overlay.profileId!==PROFILE||!Array.isArray(overlay.rows))return failure('profile-mismatch','独立项目profile不匹配。');
 if(!input||typeof input.char!=='string'||typeof input.pinyin!=='string'||typeof input.sourceEntrySha256!=='string')return failure('binding-mismatch','必须提供原字、默认读音和完整原条SHA。');
 const row=overlay.rows.find(r=>r.char===input.char);
 if(!row)return failure('not-covered','本profile只覆盖固定522个原空标签字符。');
 if(row.defaultPinyin!==input.pinyin||row.sourceBinding.sourceEntrySha256!==input.sourceEntrySha256)return failure('binding-mismatch','原字默认读音或完整原条SHA不匹配。');
 if(input.sourceReadingSha256!==undefined&&row.sourceBinding.sourceReadingSha256!==input.sourceReadingSha256)return failure('binding-mismatch','默认读音原条SHA不匹配。');
 const selected=input.confirmedEvidenceIds===undefined?[]:input.confirmedEvidenceIds;
 if(!Array.isArray(selected)||selected.some(s=>typeof s!=='string')||new Set(selected).size!==selected.length)return failure('selection-mismatch','已确认义项ID必须是不重复的字符串数组。');
 if(selected.some(id=>!row.evidenceBySense.some(e=>e.evidenceId===id)))return failure('selection-mismatch','已确认义项ID不属于该原字与默认读音。');
 const selectedEvidence=row.evidenceBySense.filter(e=>selected.includes(e.evidenceId));
 const byOriginalSense=new Map();
 for(const e of selectedEvidence){const prev=byOriginalSense.get(e.sourceRecordId);if(prev&&prev.elements.join()!==e.elements.join())return failure('ambiguous-referent-selection','同一原义中的替代材料或对象必须确认其中一个所指。');byOriginalSense.set(e.sourceRecordId,e);}
 const active=input.profileOptIn===true?row.evidenceBySense.filter(e=>selected.includes(e.evidenceId)):[];
 return {profileId:PROFILE,authority:'project-convention',status:row.evidenceBySense.length?'candidate':'pending',coverageTier:row.coverageTier,scope:'selected-dictionary-sense-and-referent',activation:row.activation,sourceBinding:clone(row.sourceBinding),matchingSourceCandidates:clone(row.evidenceBySense),conditionalAssessment:{availableElements:[...row.availableElements],evidenceBySense:clone(row.evidenceBySense),requiresProfileOptIn:true,requiresSenseConfirmation:true},effectiveElements:ELEMENTS.filter(el=>active.some(e=>e.elements.includes(el))),activeEvidenceIds:active.map(e=>e.evidenceId),selectionStatus:active.length?'sense-confirmed':'not-selected',confirmedEvidenceIds:[...selected],correspondenceEvidence:clone(row.correspondenceEvidence),reasonCategory:row.reasonCategory,reason:row.reason,traditionalAssessment:clone(row.traditionalAssessment)};
}

const BINDING_KEYS=['planScope','char','pinyin','sourceEntrySha256','sourceReadingSha256'];
const exact=(value,keys)=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
/** Main caller builds expectedBinding from the actual saved plan/dictionary, never client claims. */
export function confirmElementAssessment(verifiedOverlay,expectedBinding,selection){
 const cleanBinding=JSON.parse(canonicalPlainJson(expectedBinding));
 if(!exact(cleanBinding,BINDING_KEYS)||typeof cleanBinding.planScope!=='string'||!cleanBinding.planScope.trim()||cleanBinding.planScope.length>300)throw Error('Trusted plan binding requires exact plan,character,reading and original source identity.');
 const {planScope,...identity}=cleanBinding;
 const initial=lookupElementAssessment(verifiedOverlay,identity);
 if(!['candidate','pending'].includes(initial.status))throw Error('Actual plan/dictionary binding does not match the reviewed source.');
 if(selection===null)return {...initial,planScope,methodSelected:false,confirmedEvidenceIds:[]};
 const choice=JSON.parse(canonicalPlainJson(selection));
 if(!exact(choice,['profileId',...BINDING_KEYS,'confirmedEvidenceIds'])||choice.profileId!==PROFILE)throw Error('Sense selection accepts only its source-bound plan choice.');
 for(const key of BINDING_KEYS)if(choice[key]!==cleanBinding[key])throw Error('Sense choice belongs to another plan,character,reading or source.');
 const calculated=lookupElementAssessment(verifiedOverlay,{...identity,profileOptIn:true,confirmedEvidenceIds:choice.confirmedEvidenceIds});
 if(!['candidate','pending'].includes(calculated.status))throw Error('Invalid source sense choice: '+calculated.status);
 return {...calculated,planScope,methodSelected:true};
}

/** Recompute every field; caller supplied effective tags never authorize a selection. */
export function isCanonicalElementAssessment(value,verifiedOverlay,expectedBinding,selection){
 try{return canonicalPlainJson(value)===canonicalPlainJson(confirmElementAssessment(verifiedOverlay,expectedBinding,selection));}catch{return false;}
}
