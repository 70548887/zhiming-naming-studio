import {readWordPronunciationPreference} from './word-pronunciation-reference';
import {readNamingElementMethodSelection} from './project-naming-use';
import {canonicalPlainJson} from './plain-json';
import {namePhoneticReviewHistoryText} from './name-phonetic-presentation';
import {readNamePhoneticPreferences} from './name-phonetic-preferences';
import type { BirthProfile, NameCandidate, NamingPreferences, NamingSession, QimenChart } from './types';
import { normalizeMonthAuthorityMethod } from './month-authority-method';
import { normalizeSeasonalMethod } from './seasonal-method';
import { normalizeBirthTimeBasis } from './birth-time-basis';
import { normalizeRenMethod } from './ren-method';
import { validYueHomophoneRuleVersion } from './yue-homophone-types';

export const DEFAULT_NAMING_PREFERENCES: NamingPreferences = {length:2,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',style:'典雅清朗',meanings:'',industry:'',priority:'balanced',preferredElements:[],zodiacRules:true,numerology:false,avoidParentNames:true,imageryReading:false,yueReading:false,yueHomophones:'none'};

export function normalizePreferences(p?: Partial<NamingPreferences>): NamingPreferences {
  const namingElementMethod=p===undefined?undefined:readNamingElementMethodSelection(p);
  if(namingElementMethod){const manual=Object.getOwnPropertyDescriptor(p!,'preferredElements');if(manual&&(!Object.hasOwn(manual,'value')||!manual.enumerable))throw new Error('项目命名人工五行不得为访问器或隐藏字段。');if(manual?.value!==undefined){canonicalPlainJson(manual.value);if(!Array.isArray(manual.value)||manual.value.some(element=>!['木','火','土','金','水'].includes(element)))throw new Error('项目命名人工五行须为有效元素数组。');}}
  const parentMode=p&&Object.getOwnPropertyDescriptor(p,'parentNamePhonetics');
  if(parentMode&&(!Object.hasOwn(parentMode,'value')||!parentMode.enumerable||!['none','strict','ignore-tone'].includes(parentMode.value)))throw new Error('家庭给名读音模式必须为明确的关闭、严格或忽略声调比较。');
  const wordEnabled=readWordPronunciationPreference(p);
  if(p&&Object.hasOwn(p,'yueHomophoneRuleVersion')&&(!validYueHomophoneRuleVersion(p.yueHomophoneRuleVersion)||!['strict','ignore-tone'].includes(p.yueHomophones??'none')))throw new Error('粤语词汇规则版本无效，或关闭复核时仍附带版本。');
  if(p&&Object.hasOwn(p,'elementAssessment')&&typeof p.elementAssessment!=='boolean')throw new Error('项目意象开关必须为明确布尔值。');
  const namePhonetics=readNamePhoneticPreferences((p??{}) as NamingPreferences);
  const normalized:NamingPreferences={...DEFAULT_NAMING_PREFERENCES,...p,...(namingElementMethod?{namingElementMethod}:{}),...(namePhonetics?{namePhonetics}:{}),avoidParentNames:p?.avoidParentNames!==false,imageryReading:p?.imageryReading===true,yueReading:p?.yueReading===true,yueHomophones:p?.yueHomophones??'none',preferredElements:[...(p?.preferredElements??[])]};
  if(!wordEnabled)delete normalized.wordPronunciationReference;return normalized;
}

export function preferencesForProfile(profile:BirthProfile,sessions:NamingSession[]):NamingPreferences {
  const latest=sessions.filter(s=>s.profileId===profile.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
  return normalizePreferences(profile.namingPreferences??latest?.preferences);
}

/** Compare the draft's naming inputs to the immutable inputs used for this result. */
export function namingInputKey(profile:BirthProfile,prefs:NamingPreferences):string {
  const {id,surname,surnamePinyin,gender,calendar,birthDate,leapMonth,birthTime,timeUnknown,birthPlace,timezone}=profile;
  const normalized=normalizePreferences(prefs);
  const descriptor=Object.getOwnPropertyDescriptor(profile,'parentNameReadings');
  if(descriptor&&(!Object.hasOwn(descriptor,'value')||!descriptor.enumerable))throw new Error('家庭给名读音不得含访问器或隐藏字段。');
  const rawReadings=descriptor?.value;
  if(rawReadings!==undefined&&!Array.isArray(rawReadings))throw new Error('家庭给名读音必须为确认记录数组。');
  const stableReadings=rawReadings===undefined?undefined:JSON.parse(canonicalPlainJson(rawReadings));
  const parentReadings=stableReadings?.length?stableReadings.sort((a:{role:string},b:{role:string})=>a.role.localeCompare(b.role)):undefined;
  // An explicit frozen 1.0 selection has the same naming input as a legacy, unversioned 1.0 form.
  if(normalized.yueHomophoneRuleVersion==='yue-homophone-review/1.0.0')delete normalized.yueHomophoneRuleVersion;
  return JSON.stringify({profile:{id,surname:surname.trim(),surnamePinyin:surnamePinyin.trim(),gender,calendar,birthDate,leapMonth:!!leapMonth,birthTime:timeUnknown?'':birthTime,timeUnknown:!!timeUnknown,birthPlace:birthPlace.trim(),timezone:timezone.trim(),fatherName:(profile.fatherName??'').trim(),motherName:(profile.motherName??'').trim(),...(parentReadings?{parentNameReadings:parentReadings}:{}),monthAuthorityMethod:normalizeMonthAuthorityMethod(profile.monthAuthorityMethod),seasonalMethod:normalizeSeasonalMethod(profile.seasonalMethod),renMethod:normalizeRenMethod(profile.renMethod),timeBasis:normalizeBirthTimeBasis(profile.timeBasis),birthLongitude:profile.birthLongitude??null},preferences:{...normalized,preferredElements:[...normalized.preferredElements].sort()}});
}

export function isSessionCurrent(profile:BirthProfile,prefs:NamingPreferences,session:NamingSession|null):boolean {
  return !!session&&profile.id===session.profileId&&namingInputKey(profile,prefs)===namingInputKey(session.profile,session.preferences);
}

export interface DraftTicket { revision:number; profileId:string; inputKey:string; }
export function createDraftTicket(revision:number,profile:BirthProfile,prefs:NamingPreferences):DraftTicket {
  return {revision,profileId:profile.id,inputKey:namingInputKey(profile,prefs)};
}
export function canApplyDraftResult(ticket:DraftTicket,revision:number,profile:BirthProfile,prefs:NamingPreferences):boolean {
  return ticket.revision===revision&&ticket.profileId===profile.id&&ticket.inputKey===namingInputKey(profile,prefs);
}

/** Shared by the screen preview and PDF renderer so the delivered list cannot differ. */
export function getReportCandidates(session:NamingSession):NameCandidate[] {
  const favorites=session.candidates.filter(c=>c.favorite);
  return favorites.length?favorites:session.candidates;
}

import {modernRecordLabel} from './modern-practical-evidence';

export interface ReviewChange { name:string; field:string; before:string; after:string; }
export function compareSessionReviews(before:NamingSession,after:NamingSession):ReviewChange[] {
  const changes:ReviewChange[]=[];
  const add=(name:string,field:string,a:string,b:string)=>{if(a!==b)changes.push({name,field,before:a||'（空）',after:b||'（空）'});};
  add('方案','总体审阅',before.reviewNote,after.reviewNote);
  const markers=(q:QimenChart)=>!q.available?'出生时刻未知，未生成':!q.auxiliary?'本版快照未生成旬空、驿马':`${q.auxiliary.hourGanzhi}时；${q.auxiliary.markers.map(m=>`${m.label} ${m.branches.join('、')} → ${m.palaces.join('、')}宫`).join('；')}；规则 ${q.auxiliary.version}`;
  add('方案','奇门辅助标记',markers(before.analysis.qimen),markers(after.analysis.qimen));
  const structural=(q:QimenChart)=>!q.available?'时刻未知，未生成':!q.patterns?'本版快照未生成结构标记':`${q.patterns.checks.map(check=>`${q.patterns!.rules.find(rule=>rule.id===check.ruleId)?.name||check.ruleId}：${check.status==='matched'?'命中':'未命中'}`).join('；')}；规则 ${q.patterns.version}`;
  add('方案','奇门结构检查',structural(before.analysis.qimen),structural(after.analysis.qimen));
  const baziEvidence=(s:NamingSession)=>{const e=s.analysis.bazi.evidence;if(!e)return '本版快照未保存八字分层证据';return `${e.stems.length}明干/${e.hiddenStems.length}藏干；${e.relations.map(r=>`${r.label} ${r.pillars.join('/')} ${r.subjects.join('、')}`).join('；')||'所查关系未出现'}；月令方法 ${e.monthAuthority.methodId||'旧版未记录选表'}，${e.monthAuthority.status==='not-evaluated'?'未按分日定位':e.monthAuthority.status==='determined'?'已定位单一表段':'区间待复核'}${e.monthAuthority.candidates.length?'（'+e.monthAuthority.candidates.map(c=>c.sourceTerm||c.stem||'未定原词').join('、')+'）':''}；${e.opinions.map(o=>`${o.method==='fuyi'?'扶抑':'季节意象'} ${o.elements.join('、')||'待复核'}（${o.profile}）`).join('；')}；规则 ${e.version}`;};
  add('方案','八字分层证据',baziEvidence(before),baziEvidence(after));
  const monthlySeasonal=(s:NamingSession)=>{const m=s.analysis.bazi.evidence?.monthlySeasonal;if(!m)return '本版快照未记录逐月调候资料意见';return `${m.methodId} · ${{'not-selected':'未启用','initial-reference':'原文初步参考','conditions-reviewed':'已列事实条件已核对',pending:'待复核'}[m.status]}；${m.cases.map(item=>`${item.dayMaster}${item.monthBranch}：${item.initialUses.map(use=>`${use.stem}（${{first:'先用',support:'辅用',parallel:'并列',unranked:'未排序'}[use.role]}）`).join('、')||'初用待审'}；${item.conditionBranches.map(branch=>`${branch.id} ${branch.result}`).join('、')||'无已列事实条件'}`).join('\n')}；规则 ${m.version}`;};
  add('方案','逐月调候资料意见',monthlySeasonal(before),monthlySeasonal(after));
  add('方案','人工喜用',normalizePreferences(before.preferences).preferredElements.join('、'),normalizePreferences(after.preferences).preferredElements.join('、'));
  const fields=[['meaning','组合寓意'],['reason','推荐理由'],['traditionalReason','传统依据'],['reviewNote','审阅备注']] as const;
  for(const old of before.candidates){
    const next=after.candidates.find(c=>c.id===old.id);
    if(!next){changes.push({name:old.fullName,field:'候选名单',before:'已收录',after:'已移除'});continue;}
    for(const [key,label] of fields)add(old.fullName,label,old[key],next[key]);
    add(old.fullName,'现代实用性说明',modernRecordLabel(old),modernRecordLabel(next));
    add(old.fullName,'收藏状态',old.favorite?'已收藏':'未收藏',next.favorite?'已收藏':'未收藏');
    const numeric=(name:NameCandidate)=>{const n=name.numerology;if(!n)return '未开启';return `${{complete:'已计算',pending:'待核对',unsupported:'当前结构不支持'}[n.status]}\n${n.strokes.map(s=>{const r=s.options.find(r=>r.id===s.selectedRecordId);return r?`${s.inputChar} → ${r.glyph} ${r.count}画（${r.sourceId}）`:`${s.inputChar}：待确认`;}).join('；')}\n${n.grids.map(g=>`${g.name} ${g.value}（${g.element}）`).join('；')}\n规则 ${n.rule.version} · 资料 ${n.dataVersion}`;};
    add(old.fullName,'数理字形与五格',numeric(old),numeric(next));
    const yue=(candidate:NameCandidate)=>{const value=candidate.yueReading;if(!value)return '未启用';return [value.surname,...value.given].map(unit=>unit.text+'：'+(unit.selection?unit.selection.tokens.join(' ')+'（'+(unit.selection.origin==='dictionary'?'确认词典候选':'家庭手工确认')+'）':'待确认')).join('；')+'；'+value.version;};
    add(old.fullName,'粤语读音确认',yue(old),yue(next));
    const terms=(candidate:NameCandidate)=>{const result=candidate.yueHomophones;return result?(result.mode==='strict'?'保留声调严格比较':'含忽略声调复核')+'；'+(result.status==='assessed'?'已按有限词表检查':'读音未齐，暂未检查')+'；'+result.matches.map(match=>match.span.text+'→'+match.term+'（'+(match.comparison==='exact'?'音节与声调一致':'仅去调近似')+'）').join('、')+'；规则 '+result.version:'未启用';};
    add(old.fullName,'粤语词汇联想复核',terms(old),terms(next));
    add(old.fullName,'独立词音复核',namePhoneticReviewHistoryText(old.namePhoneticReviews),namePhoneticReviewHistoryText(next.namePhoneticReviews));
  }
  for(const next of after.candidates)if(!before.candidates.some(c=>c.id===next.id))changes.push({name:next.fullName,field:'候选名单',before:'未收录',after:'已收录'});
  return changes;
}
