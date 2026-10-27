/** Browser-safe applicability for the independently published naming7 supplemental review.
 * Publication-time source validation is performed by validate-review.mjs; caller supplies
 * the active knowledge-package SHA, rather than trusting an input character to self-declare it.
 */
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
export function assertPlainJson(value,stack=new Set(),depth=0){
  if(depth>70)throw new Error('Review input exceeds JSON depth');
  if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return;
  if(!Array.isArray(value)&&!object(value))throw new Error('Review input must be plain JSON');
  if(stack.has(value))throw new Error('Review input is cyclic');stack.add(value);
  if(Array.isArray(value)){
    if(Object.getPrototypeOf(value)!==Array.prototype||Reflect.ownKeys(value).length!==value.length+1)throw new Error('Review arrays must be dense without extra fields');
    for(let index=0;index<value.length;index++){const descriptor=Object.getOwnPropertyDescriptor(value,String(index));if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw new Error('Review arrays cannot contain accessors or holes');assertPlainJson(descriptor.value,stack,depth+1);}
  }else for(const key of Reflect.ownKeys(value)){
    const descriptor=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw new Error('Review records cannot contain accessors, symbols or hidden fields');assertPlainJson(descriptor.value,stack,depth+1);
  }
  stack.delete(value);
}
const canonical=value=>{assertPlainJson(value);const sort=v=>Array.isArray(v)?v.map(sort):object(v)?Object.fromEntries(Object.keys(v).sort().map(key=>[key,sort(v[key])])):v;return JSON.stringify(sort(value));};
function selectedMeaningMatches(meaning,definitions){
  const walk=(remaining,used,depth)=>depth<3&&definitions.some(definition=>!used.has(definition)&&(remaining===definition||remaining.startsWith(definition+'；')&&walk(remaining.slice(definition.length+1),new Set([...used,definition]),depth+1)));
  return typeof meaning==='string'&&definitions.every(definition=>typeof definition==='string'&&definition.length)&&walk(meaning,new Set(),0);
}
function matchingEntry(entry,binding,expected,documentaryOnly=false){
  if(!entry||entry.char!==binding.char||entry.pinyin!==binding.pinyin||entry.tone!==binding.tone||entry.sourceId!==binding.sourceId)return false;
  const expectedReadings=expected.readings.filter(row=>row.pinyin===binding.pinyin&&row.tone===binding.tone&&row.sourceId===binding.sourceId&&row.word===binding.dictionaryWord);
  const actualReadings=Array.isArray(entry.readings)?entry.readings.filter(row=>row.pinyin===binding.pinyin&&row.tone===binding.tone&&row.sourceId===binding.sourceId&&row.word===binding.dictionaryWord):[];
  if(expectedReadings.length!==1||actualReadings.length!==1||canonical(actualReadings[0])!==canonical(expectedReadings[0]))return false;
  const reading=actualReadings[0];
  return entry.meaning===expected.meaning&&selectedMeaningMatches(entry.meaning,reading.meanings)&&(documentaryOnly||reading.referenceOnly!==true&&reading.meanings.includes(binding.dictionarySense));
}
/** The immutable supplemental table must first pass its independent source/manifest validator.
 * This factory never changes a character, its elements or any old naming result.
 */
export function createNamingReviewLookup(table){
  assertPlainJson(table);
  const copy=structuredClone(table),rows=new Map(copy.meaningReviews.map(row=>[row.char,row])),baseline=new Map(copy.baselineCharacters.map(entry=>[entry.char,entry]));
  const contextMatches=context=>object(context)&&Object.keys(context).every(key=>['packSha256','activeVersion','givenName'].includes(key))&&context.packSha256===copy.base.knowledgePackSha256&&context.activeVersion===copy.base.knowledgePackSha256.slice(0,12);
  const applicability=(entry,context)=>{
    try{
      assertPlainJson(entry);assertPlainJson(context);
      if(!contextMatches(context))return{status:'not-applicable',reason:'Trusted active knowledge-pack SHA or its runtime version differs from the reviewed base.'};
      const row=rows.get(entry.char);if(!row)return{status:'not-reviewed-by-overlay',reason:'Keep the frozen earlier naming rules for this character.'};
      if(row.status!=='approved')return{status:row.status,reason:row.reason,scope:row.scope};
      if(!matchingEntry(entry,row.binding,baseline.get(entry.char)))return{status:'not-applicable',reason:'Default pronunciation, source word, complete source reading or selected dictionary meaning differs.'};
      if(!row.automaticMeaningAllowed||row.applicability.mode==='manual-confirmation-required')return{status:'manual-confirmation-required',reason:row.applicability.reason,scope:row.scope};
      if(row.applicability.mode==='allowed-names'&&(!context.givenName||!row.applicability.allowedNames.includes(context.givenName)))return{status:'not-applicable',reason:'The complete given name is outside the explicitly reviewed combination list.',scope:row.scope};
      if(!['any-name','allowed-names'].includes(row.applicability.mode))return{status:'not-applicable',reason:'No automatic usage mode was adopted.'};
      return {status:'applicable',scope:row.scope,reviewId:`meaning137:${row.pendingIndex}:${row.char}`};
    }catch{return{status:'not-applicable',reason:'Input is not a supported plain saved character record.'};}
  };
  const lookupMeaning=(entry,context)=>{
    const result=applicability(entry,context);if(result.status!=='applicable')return undefined;
    const row=rows.get(entry.char);
    return structuredClone({reviewId:result.reviewId,char:row.char,meaning:row.namingMeaning,projectWish:row.projectWish,useKind:row.useKind,scope:row.scope,binding:row.binding,warnings:row.warnings,sourceIds:copy.sourceIds,automaticMeaningAllowed:true,automaticSemanticCreditAllowed:false});
  };
  const reviewMeaning=(entry,context)=>{
    try{
      assertPlainJson(entry);assertPlainJson(context);if(!contextMatches(context))return undefined;
      const row=rows.get(entry.char),expected=baseline.get(entry.char);if(!row||!expected)return undefined;
      if(row.binding){if(!matchingEntry(entry,row.binding,expected,true))return undefined;}
      else if(canonical({char:entry.char,pinyin:entry.pinyin,tone:entry.tone,sourceId:entry.sourceId,meaning:entry.meaning,readings:entry.readings??[]})!==canonical(expected))return undefined;
      return structuredClone({...row,automaticSemanticCreditAllowed:false,displayOnlyReview:true});
    }catch{return undefined;}
  };
  const lookupCitation=(name,entries,citations,context)=>{
    try{
      assertPlainJson(entries);assertPlainJson(citations);assertPlainJson(context);
      if(!contextMatches(context)||typeof name!=='string'||[...name].length!==2||entries.length!==2)return undefined;
      const rule=copy.nameRules.find(row=>row.name===name);if(!rule)return undefined;
      if(!rule.readings.every((binding,index)=>binding.char===[...name][index]&&matchingEntry(entries[index],binding,baseline.get(binding.char))))return undefined;
      if(!citations.some(citation=>canonical(citation)===canonical(rule.citation)))return undefined;
      return structuredClone(rule);
    }catch{return undefined;}
  };
  return Object.freeze({applicability,lookupMeaning,reviewMeaning,describeReview:reviewMeaning,lookupCitation});
}


const V71_PROFILE='naming-character-meanings-v7.1/1',V71_RULE='naming-editorial-7.1.0',V71_SOURCE='naming-character-meanings-v7.1-fixed';
const v71Exact=(value,keys)=>object(value)&&Object.keys(value).length===keys.length&&Object.keys(value).every(key=>keys.includes(key));
const v71Freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))v71Freeze(child);Object.freeze(value);}return value;};
/** Inputs are authenticated by the fixed main loader. Reuse this module's
 * plain-JSON and canonical comparison boundaries; do not alter7.0 lookup. */
export function createNamingCharacterReview71(profile,admission,identity){
 assertPlainJson(profile);assertPlainJson(admission);assertPlainJson(identity);
 const require71=(ok,message)=>{if(!ok)throw Error('Naming7.1 character notes: '+message);};
 require71(v71Exact(profile,['schema','profileVersion','ruleVersion','sourceId','subset','base','scope','policy','cases'])&&profile.schema==='naming-character-meanings-profile/1'&&profile.profileVersion===V71_PROFILE&&profile.ruleVersion===V71_RULE&&profile.sourceId===V71_SOURCE,'unknown fixed profile');
 require71(profile.base.packSha256==='1875aa49dcfaeca0f266a3be7578e4d4b2a9b2c9c1f59fd79699a3e26d5d6b8b'&&profile.base.activeVersion==='1875aa49dcfa'&&profile.base.baseEngineVersion==='naming-editorial-7.0.0'&&profile.base.baseTableSha256==='392fa47441a0c410b0903c3e85853081225a1a5e9f540b5467e4ea4e2151cc48'&&profile.base.baseLockSha256==='2945297a7f4bca1489e12018cce2848909fc35716c999b7d309e9a79633f7476','base7 identity differs');
 require71(v71Exact(identity,['ruleVersion','profileVersion','sourceId','subsetSha256','profileSha256','admissionSha256','lockSha256','manifestSha256','sourceSha256'])&&identity.profileVersion===V71_PROFILE&&identity.ruleVersion===V71_RULE&&identity.sourceId===V71_SOURCE&&['subsetSha256','profileSha256','admissionSha256','lockSha256','manifestSha256','sourceSha256'].every(k=>typeof identity[k]==='string'&&/^[a-f0-9]{64}$/.test(identity[k])&&identity[k]!=='0'.repeat(64))&&profile.subset.sha256===identity.subsetSha256,'trusted main profile identity absent');
 const policy=profile.policy;
 require71(v71Exact(policy,['perPositionSingleCharacterRequest','completeRequestMustBeAdmitted','wholeNameAssessment','wholeNameMeaning','automaticNameRecommendation','automaticSemanticCreditAllowed','scoreDelta','defaultDictionaryUnchanged','oldV7SelectionAndScoringUnchanged','noHistoricalBackfill'])&&profile.scope==='per-character-project-explanation-only'&&policy.perPositionSingleCharacterRequest===true&&policy.completeRequestMustBeAdmitted===true&&policy.wholeNameAssessment==='not-assessed'&&policy.wholeNameMeaning===null&&policy.automaticNameRecommendation===false&&policy.automaticSemanticCreditAllowed===false&&policy.scoreDelta===0,'profile scope is not character-only');
 require71(Array.isArray(profile.cases)&&profile.cases.length===40&&new Set(profile.cases.map(r=>r.caseId)).size===40&&new Set(profile.cases.map(r=>r.char)).size===40,'exact40 case identity required');
 const caseIds=profile.cases.map(r=>r.caseId).sort();
 require71(v71Exact(admission,['schema','profileVersion','ruleVersion','sourceId','profileSha256','decision','activation','testOnly','approvedCaseIds','reviewedSelection','scope','wholeNameAssessment','wholeNameMeaning','automaticNameRecommendation','automaticSemanticCreditAllowed','scoreDelta'])&&admission.schema==='naming-character-meanings-admission/1'&&admission.profileVersion===V71_PROFILE&&admission.ruleVersion===V71_RULE&&admission.sourceId===V71_SOURCE&&admission.profileSha256===identity.profileSha256&&admission.decision==='approved-character-notes'&&admission.activation===V71_RULE&&admission.testOnly===false&&canonical(admission.approvedCaseIds)===canonical(caseIds)&&admission.scope===profile.scope&&admission.wholeNameAssessment==='not-assessed'&&admission.wholeNameMeaning===null&&admission.automaticNameRecommendation===false&&admission.automaticSemanticCreditAllowed===false&&admission.scoreDelta===0,'complete immutable production admission absent');
 for(const row of profile.cases)require71(typeof row.char==='string'&&[...row.char].length===1&&row.baselineCharacter.char===row.char&&row.baselineCharacter.pinyin===row.selectedPinyin&&row.baselineCharacter.tone===row.tone&&row.original.sourceId==='moe-revised'&&row.scope===profile.scope&&row.wholeNameAssessment==='not-assessed'&&row.wholeNameMeaning===null&&row.automaticNameRecommendation===false&&row.automaticSemanticCreditAllowed===false&&row.scoreDelta===0&&!Object.hasOwn(row,'proposedAutomaticScope'),'row cannot carry name-level or scoring permission');
 const table=v71Freeze(structuredClone(profile)),grant=v71Freeze(structuredClone(admission)),trusted=v71Freeze(structuredClone(identity)),byChar=new Map(table.cases.map(row=>[row.char,row]));
 const contextOk=context=>v71Exact(context,['packSha256','activeVersion'])&&context.packSha256===table.base.packSha256&&context.activeVersion===table.base.activeVersion;
 const generateCharacterNotes=request=>{
  try{
   assertPlainJson(request);
   if(!v71Exact(request,['ruleVersion','givenName','characters','context']))return{status:'not-applicable',reason:'Only complete explicit character-note requests are accepted.'};
   if(request.ruleVersion!==V71_RULE)return{status:'wrong-rule-version',reason:'Saved or current7.0 is not the7.1 character-note rule.'};
   if(!contextOk(request.context))return{status:'not-applicable',reason:'Actual archived pack identity differs.'};
   if(typeof request.givenName!=='string'||![1,2].includes([...request.givenName].length)||!Array.isArray(request.characters)||request.characters.map(c=>c.char).join('')!==request.givenName)return{status:'not-applicable',reason:'Complete requested text and original character sequence differ.'};
   const rows=[];
   for(const [position,entry]of request.characters.entries()){
    const row=byChar.get(entry.char);if(!row)return{status:'not-covered',reason:'The entire requested sequence is not covered; no partial-name permission.'};
    if(canonical(entry)!==canonical(row.baselineCharacter))return{status:'not-applicable',reason:'Complete saved character/default reading/source or glyph differs.'};
    if(!grant.approvedCaseIds.includes(row.caseId))return{status:'not-admitted',reason:'An exact character case lacks immutable admission.'};
    rows.push({position,caseId:row.caseId,char:row.char,selectedPinyin:row.selectedPinyin,tone:row.tone,dictionaryOriginal:row.original.definition.def,originalSourceBinding:structuredClone(row.original),glyph:structuredClone(row.glyph),projectMeaning:row.editorial.meaning,projectWish:row.editorial.projectWish,editorialAttribution:row.editorial.attribution,editorialLicense:row.editorial.license,limits:[...row.editorial.limits],scope:'per-character-project-explanation-only',wholeNameAssessment:'not-assessed',wholeNameMeaning:null,automaticNameRecommendation:false,automaticSemanticCreditAllowed:false,scoreDelta:0});
   }
   return{status:'character-explanations-ready',ruleVersion:V71_RULE,scope:'per-character-project-explanation-only',givenNameContext:request.givenName,profile:structuredClone(trusted),rows,admittedCharacterCaseIds:rows.map(r=>r.caseId),wholeNameAssessment:'not-assessed',wholeNameMeaning:null,automaticNameRecommendation:false,automaticSemanticCreditAllowed:false,scoreDelta:0};
  }catch{return{status:'not-applicable',reason:'Request is not bounded plain saved data.'};}
 };
 const characterExplanation=(entry,context)=>{try{assertPlainJson(entry);assertPlainJson(context);return generateCharacterNotes({ruleVersion:V71_RULE,givenName:entry.char,characters:[entry],context});}catch{return{status:'not-applicable',reason:'Original character is not plain data.'};}};
 return Object.freeze({generateCharacterNotes,characterExplanation});
}
