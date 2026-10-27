const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
export function assertContextJson(value,stack=new Set(),depth=0){
 if(depth>70)throw Error('Context input exceeds JSON depth');
 if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return;
 if(!Array.isArray(value)&&!plain(value)||stack.has(value))throw Error('Context input must be acyclic plain JSON');stack.add(value);
 if(Array.isArray(value)){if(Object.getPrototypeOf(value)!==Array.prototype||Reflect.ownKeys(value).length!==value.length+1)throw Error('Context arrays must be dense');for(let i=0;i<value.length;i++){const d=Object.getOwnPropertyDescriptor(value,String(i));if(!d||!Object.hasOwn(d,'value')||!d.enumerable)throw Error('Context accessors/holes are not supported');assertContextJson(d.value,stack,depth+1);}}
 else for(const key of Reflect.ownKeys(value)){const d=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!d||!Object.hasOwn(d,'value')||!d.enumerable)throw Error('Context accessors/hidden properties are not supported');assertContextJson(d.value,stack,depth+1);}
 stack.delete(value);
}
const canonical=value=>{assertContextJson(value);const sort=v=>Array.isArray(v)?v.map(sort):plain(v)?Object.fromEntries(Object.keys(v).sort().map(key=>[key,sort(v[key])])):v;return JSON.stringify(sort(value));};
const keys=(value,allowed,required=allowed)=>plain(value)&&Object.keys(value).every(key=>allowed.includes(key))&&required.every(key=>Object.hasOwn(value,key));
const identity=entry=>({char:entry.char,pinyin:entry.pinyin,tone:entry.tone,sourceId:entry.sourceId,meaning:entry.meaning,readings:entry.readings??[]});

/** The caller must authenticate the publication/source lock first. This is a conditional explanation selector, not an app method registration. */
export function createMeaningContextLookup(validatedPublication){
 assertContextJson(validatedPublication);
 const publication=structuredClone(validatedPublication);
 if(publication.schema!=='conditional-meaning-context-increment/1'||publication.policy.automaticSemanticCreditAllowed!==false||publication.policy.independentCharacterMeaningApproved!==false||publication.policy.wholeNameApproved!==false)throw Error('Unsupported meaning context publication');
 const cases=new Map(publication.cases.map(row=>[row.char+'\0'+row.givenName,row]));
 const lookup=(request,trustedContext)=>{
  try{
   assertContextJson(request);assertContextJson(trustedContext);
   if(!keys(trustedContext,['packSha256','activeVersion'])||trustedContext.packSha256!==publication.base.knowledgePackSha256||trustedContext.activeVersion!==publication.base.activeVersion)return{status:'not-applicable',reason:'可信活动资料包身份与固定基线不一致。'};
   if(!keys(request,['char','givenName','characters','confirmedReadings','choice'],['char','givenName','characters','confirmedReadings'])||typeof request.char!=='string'||typeof request.givenName!=='string')return{status:'not-applicable',reason:'字、完整给名与确认读音输入不完整。'};
   const row=cases.get(request.char+'\0'+request.givenName);
   if(!row)return{status:'not-covered',reason:'本批没有这个字在该完整给名中的条件证据。'};
   if(!Array.isArray(request.characters)||request.characters.length!==2||!request.characters.every((entry,index)=>canonical(identity(entry))===canonical(row.characterBindings[index].character)))return{status:'not-applicable',reason:'当前所选字、默认音、原词条或所选原义与固定记录不一致。'};
   if(!Array.isArray(request.confirmedReadings)||request.confirmedReadings.length!==2||request.confirmedReadings.some(value=>value===null))return{status:'needs-confirmed-reading',reason:'需逐位确认完整给名的两个读音，不自动采用或展开其他读音。'};
   if(!request.confirmedReadings.every((value,index)=>keys(value,['char','pinyin','tone','confirmed'])&&canonical(value)===canonical(row.confirmedReadings[index])))return{status:'not-applicable',reason:'确认读音与本完整复词的原读音不一致。'};
   if(!Object.hasOwn(request,'choice'))return{status:'needs-explicit-choice',reason:'请选择此完整给名对应的原词义项和具体取义场景。',selection:structuredClone(row.selection),source:structuredClone(row.source),priorCharacterStatusUnchanged:true};
   if(!keys(request.choice,['usage','caseId','senseId','contextKey'])||!['usage','caseId','senseId','contextKey'].every(key=>request.choice[key]===row.selection[key]))return{status:'not-applicable',reason:'所选义项、具体场景或整词用途不匹配，不能移给单字、其他名字或其他义项。'};
   return{status:'explanation-ready',char:row.char,givenName:row.givenName,scope:'complete-given-name-dictionary-reference',dictionaryOriginal:row.source.definition.def,source:structuredClone(row.source),grammar:structuredClone(row.grammar),reason:row.reason,exclusions:[...row.exclusions],selectedContext:structuredClone(row.selection),priorCharacterStatusUnchanged:true,independentCharacterMeaningApproved:false,wholeNameApproved:false,automaticSemanticCreditAllowed:false,scoreDelta:0,projectWish:null};
  }catch{return{status:'not-applicable',reason:'输入不是受支持的完整普通JSON记录。'};}
 };
 return Object.freeze({lookup});
}
