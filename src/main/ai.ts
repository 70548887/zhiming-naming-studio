import type { Analysis, BirthProfile, CharacterEntry, Citation, NameCandidate, NamingPreferences, StudioSettings } from '../shared/types';
import { evaluateNameWithResolvedBasisForRuleVersion, resolveNamingBasisForRuleVersion, resolveNamingContextForRuleVersion, resolveNamingGenerationContext, NamingElementBasisError, namingElementBasisPromptTag, type ResolvedNamingBasis, parentNameReference, expandNameVariants, selectNamingCitationsForRuleVersionWithContext, reviewedNamingCitationIdsForRuleVersionWithContext, reviewedNamingVocabularyForRuleVersionWithContext,type TrustedNamingContext } from '../domain/naming';
import { normalizeCredentialEndpoint } from './credentials';
import type {NamingRuleVersion} from '../shared/naming-rules';

export const MASTER_PROMPT=`你是“知名”工作室的AI命名顾问，结合周易文化、姓名学、音韵语义与现代传播学设计新生儿名字。严格使用输入的用字、偏好、排除名单和本地原文；指定字、禁用字、字数、辈分位置必须遵守。行业意象只影响语义。你负责名字创意与主题选择，字义、读音、传统属性和出处由本地程序验证和解释。不要返回自由编写的字义、典籍、命运、人格或人口统计断言。只输出JSON：{"candidates":[{"givenName":"名字","themeIds":["从allowedThemes选择"],"citationIds":["从citations选择，未确定时留空"]}]}。尽量返回12个不同名字，兼顾古典气质、读写便利和辨识感。引用片段仅为检索资料，字面共现不等于可命名出处；未审定引用由程序清除。不要输出markdown。`;
export function creativeProseOnly(text:string){
  // Computations and population/fortune assertions belong to verified local fields, never model prose.
  return !/(八字|日主|喜用神|年柱|月柱|日柱|时柱|姓名落宫|奇门|五行|属[金木水火土]|缺[金木水火土]|必定|注定|保证.*(?:命运|富贵|成功)|改命|改运|大凶|命运|重名|同名|[《》「」“”]|源[于自]|出自|典籍|古籍|原文|诗[句经]|经文)/u.test(text);
}
export function endpoint(base:string) {
  return normalizeCredentialEndpoint(base);
}
const THEMES:Record<string,string>={peace:'平安自在',learning:'求知好学',kindness:'仁爱和善',integrity:'真诚守信',joy:'喜悦明朗',nature:'自然生机',resolve:'坚定进取'};
export function retrieveNamingCitations(pool:CharacterEntry[],citations:Citation[],pref:NamingPreferences,trustedContext?:TrustedNamingContext):Citation[]{
  const selected=resolveNamingGenerationContext(trustedContext);return retrieveNamingCitationsForRuleVersion(selected.version,pool,citations,pref,selected.context);
}
export function retrieveNamingCitationsForRuleVersion(version:NamingRuleVersion,pool:CharacterEntry[],citations:Citation[],pref:NamingPreferences,trustedContext?:TrustedNamingContext):Citation[]{
  trustedContext=resolveNamingContextForRuleVersion(version,trustedContext).context;
  const allowed=new Set(pool.map(c=>c.char)),intent=pref.style+' '+pref.meanings;
  const source=/周易|易经|八卦|乾坤|自强|厚德/.test(intent)?'zhouyi':/诗经|国风|雅颂/.test(intent)?'shijing':'';
  const required=[...pref.requiredChars,...pref.generationChar].filter(ch=>!/\s|[,，、]/.test(ch));
  const terms=[...new Set([...intent].filter(ch=>/\p{Script=Han}/u.test(ch)))];
  const reviewedIds=new Set(reviewedNamingCitationIdsForRuleVersionWithContext(version,trustedContext));
  const scored=citations.filter(c=>[...c.text].filter(ch=>allowed.has(ch)).length>=2).map(c=>({c,score:(source&&c.sourceId===source?100:0)+(reviewedIds.has(c.id)?25:0)+required.filter(ch=>c.text.includes(ch)).length*15+terms.filter(ch=>c.text.includes(ch)||c.title.includes(ch)||c.chapter.includes(ch)).length*3-Math.min(c.text.length,500)/1000})).sort((a,b)=>b.score-a.score||a.c.id.localeCompare(b.c.id));
  // Reserve a minority of references for other requested/local traditions rather than first-in-file bias.
  const primary=source?scored.filter(x=>x.c.sourceId===source).slice(0,40):scored.slice(0,30);
  const ids=new Set(primary.map(x=>x.c.id));
  const other=scored.filter(x=>!ids.has(x.c.id)&&(source?x.c.sourceId!==source:true));
  const chosen=[...primary,...other.slice(0,50-primary.length)];
  for(const item of scored){if(chosen.length>=50)break;if(!chosen.some(x=>x.c.id===item.c.id))chosen.push(item);}
  return chosen.map(x=>x.c);
}
async function completion(settings:StudioSettings,key:string,messages:{role:string;content:string}[],json=false) {
  if(!key)throw new Error('尚未保存 AI 密钥，请先到设置页配置。');
  if(!settings.model.trim())throw new Error('请先设置 AI 模型名称。');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),Math.max(5000,Math.min(120000,settings.timeoutMs)));
  try{
    const response=await fetch(endpoint(settings.apiBaseUrl),{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model:settings.model,messages,temperature:0.75,...(json?{response_format:{type:'json_object'}}:{})}),signal:controller.signal,redirect:'error'});
    if(!response.ok)throw new Error(`AI 接口返回 HTTP ${response.status}，请检查地址、模型与密钥。`);
    const raw=await response.text();if(raw.length>1000000)throw new Error('AI 响应超过允许长度。');
    let data:any;try{data=JSON.parse(raw);}catch{throw new Error('AI 接口的外层响应不是有效JSON，请检查服务是否支持兼容接口。');}
    const content=data.choices?.[0]?.message?.content;if(typeof content!=='string')throw new Error('AI 接口没有返回文本内容。');return content;
  }catch(e){if(e instanceof Error&&e.name==='AbortError')throw new Error('AI 请求超时，已保留本地命名结果。');throw e;}finally{clearTimeout(timer);}
}
export async function testAI(settings:StudioSettings,key:string){const text=await completion(settings,key,[{role:'user',content:'请只回复：连接成功'}]);if(!text.trim())throw new Error('AI 接口返回了空文本，请检查模型设置。');return '连接成功：接口已返回文本；结构化命名协议尚需生成时验证。';}
export async function generateAI(settings:StudioSettings,key:string,profile:BirthProfile,pref:NamingPreferences,analysis:Analysis,chars:CharacterEntry[],citations:Citation[],excludeNames:string[]=[],onStage?:(stage:'transport'|'json'|'candidateShape'|'localConstraints')=>void,trustedContext?:TrustedNamingContext,basis?:ResolvedNamingBasis):Promise<{candidates:NameCandidate[];warning:string}> {
  const selected=resolveNamingGenerationContext(trustedContext);return generateAIForRuleVersion(selected.version,settings,key,profile,pref,analysis,chars,citations,excludeNames,onStage,selected.context,basis);
}
export async function generateAIForRuleVersion(version:NamingRuleVersion,settings:StudioSettings,key:string,profile:BirthProfile,pref:NamingPreferences,analysis:Analysis,chars:CharacterEntry[],citations:Citation[],excludeNames:string[]=[],onStage?:(stage:'transport'|'json'|'candidateShape'|'localConstraints')=>void,trustedContext?:TrustedNamingContext,basis?:ResolvedNamingBasis):Promise<{candidates:NameCandidate[];warning:string}> {
  const namingContext=resolveNamingContextForRuleVersion(version,trustedContext);trustedContext=namingContext.context;
  const resolvedBasis=resolveNamingBasisForRuleVersion(namingContext.version,trustedContext,pref,analysis,basis);
  const parentTaboo=parentNameReference(profile,pref,chars).excluded;
  const excludedChars=expandNameVariants(pref.forbiddenChars+pref.elderTaboo+parentTaboo,chars);
  const selected=chars.filter(c=>!excludedChars.includes(c.char));
  const favored=resolvedBasis.elements;
  const pool=[...selected].sort((a,b)=>Number(b.elements.some(e=>favored.includes(e)))-Number(a.elements.some(e=>favored.includes(e)))).slice(0,160);
  // Culture intent must survive the element shortlist. Reserve usable vocabulary for the requested sources.
  if(/周易|易经|八卦|乾坤|自强|厚德|诗经|国风|雅颂/.test(pref.style+' '+pref.meanings)){
    const source=/周易|易经|八卦|乾坤|自强|厚德/.test(pref.style+' '+pref.meanings)?'zhouyi':'shijing';
    for(const reviewed of reviewedNamingVocabularyForRuleVersionWithContext(version,trustedContext,source))if(selectNamingCitationsForRuleVersionWithContext(version,trustedContext,reviewed.name,selected,citations).length)for(const ch of reviewed.name){const c=selected.find(c=>c.char===ch);if(c&&!pool.some(p=>p.char===ch))pool.push(c);}
    const relevant=retrieveNamingCitationsForRuleVersion(version,selected,citations,pref,trustedContext).slice(0,40);
    for(const reference of relevant)for(const c of selected.filter(c=>reference.text.includes(c.char)).slice(0,4))if(!pool.some(p=>p.char===c.char))pool.push(c);
  }
  for(const ch of [...pref.requiredChars,...pref.generationChar]){const c=selected.find(c=>c.char===ch);if(c&&!pool.some(p=>p.char===ch))pool.push(c);}
  const refs=retrieveNamingCitationsForRuleVersion(version,pool,citations,pref,trustedContext);
  // Deliberately omit customer name, dates, time, location and contact details.
  const {length,generationChar,requiredChars,forbiddenChars,elderTaboo,style,meanings,industry,priority,zodiacRules,avoidParentNames}=pref;
  const input={namingRules:{version:namingContext.version,sourceId:namingContext.sourceId},surname:profile.surname,surnamePinyin:profile.surnamePinyin,gender:profile.gender,preferences:{length,generationChar,requiredChars,forbiddenChars,elderTaboo,style,meanings,industry,priority,zodiacRules,avoidParentNames},favorableElements:favored,...(resolvedBasis.source==='project'?{namingElementBasis:namingElementBasisPromptTag(resolvedBasis)}:{}),excludedNames:excludeNames.slice(-300),allowedThemes:THEMES,characters:pool.map(c=>({char:c.char,pinyin:c.pinyin,meaning:c.meaning,elements:c.elements})),citations:refs};
  const messages=[{role:'system',content:MASTER_PROMPT},{role:'user',content:JSON.stringify(input)}];let last='';
  for(let attempt=0;attempt<2;attempt++){
    const content=await completion(settings,key,messages,true);
    onStage?.('transport');
    try{
      const parsed=JSON.parse(content.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));if(!Array.isArray(parsed.candidates))throw new Error('缺少 candidates 数组');
      onStage?.('json');
      const result:NameCandidate[]=[];const seen=new Set<string>();
      for(const raw of parsed.candidates.slice(0,36)){
        if(!raw||typeof raw.givenName!=='string'||seen.has(raw.givenName)||excludeNames.includes(raw.givenName)||[...raw.givenName].some(ch=>!pool.some(c=>c.char===ch)))continue;
        if(raw.meaning!==undefined&&(typeof raw.meaning!=='string'||raw.meaning.length>1800||!creativeProseOnly(raw.meaning)))continue;
        if(raw.reason!==undefined&&(typeof raw.reason!=='string'||raw.reason.length>1200||!creativeProseOnly(raw.reason)))continue;
        if(raw.themeIds!==undefined&&(!Array.isArray(raw.themeIds)||raw.themeIds.some((id:unknown)=>typeof id!=='string'||!Object.hasOwn(THEMES,id))))continue;
        if(!Array.isArray(raw.citationIds)||raw.citationIds.some((id:unknown)=>typeof id!=='string'||!refs.some(c=>c.id===id)))continue;
        const provided=refs.filter(c=>raw.citationIds.includes(c.id));if(provided.some(c=>![...raw.givenName].every(ch=>c.text.includes(ch))))continue;
        const matched=selectNamingCitationsForRuleVersionWithContext(version,trustedContext,raw.givenName,chars,provided);
        onStage?.('candidateShape');
        const c=evaluateNameWithResolvedBasisForRuleVersion(version,trustedContext,resolvedBasis,raw.givenName,profile,pref,analysis,chars,matched,'ai');if(!c)continue;
        onStage?.('localConstraints');
        // Only locally generated, source-backed explanations are published. Model prose is never trusted facts.
        const themes=(raw.themeIds||[]).map((id:string)=>THEMES[id]);
        if(themes.length)c.reason+=` AI 创意主题：${[...new Set(themes)].join('、')}，表达家庭祝愿。`;
        if(provided.length!==matched.length)c.warnings.push('AI 提议的原文仅存在字面关联，未通过命名语境审阅，已取消出处声明。');
        c.originalMeaning=c.meaning;c.citations=matched;c.warnings.push('名字由 AI 提议；读音、字义、出处与分析解释均经过本地规则处理，请起名师审阅。');result.push(c);seen.add(raw.givenName);
      }
      if(result.length)return {candidates:result,warning:result.length<12?`AI 返回 ${result.length} 个通过本地校验的候选，其余使用本地方案补齐。`:''};
      last='所有候选均未通过用字、约束或引文校验';
    }catch(error){if(error instanceof NamingElementBasisError)throw error;last='响应不是有效的候选 JSON';}
    messages.push({role:'assistant',content:content.slice(0,16000)},{role:'user',content:`校验失败：${last}。仅用给定字库与引用，修复后返回JSON。`});
  }
  throw new Error(`AI 两次结果未通过校验（${last}），已改用本地候选。`);
}
