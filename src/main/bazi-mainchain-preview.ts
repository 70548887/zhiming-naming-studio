import {analyzeProfile} from '../domain/engine';
import type {BirthProfile} from '../shared/types';
import {METHOD_140,analyzeMethod140,inputFromExistingBazi140,summarizeDeclaredCases140} from '../domain/bazi-mainchain';
import type {ChartResult140,MethodResult140} from '../domain/bazi-mainchain';
import {BAZI_MAINCHAIN_PREVIEW_VERSION,readBaziMainchainPreviewOptions} from '../shared/bazi-mainchain';
import type {BaziMainchainAlternativePreview,BaziMainchainPreview,BaziMainchainPreviewOptions,BaziMainchainQualitativeCase,BaziMainchainRecordedBirth,BaziMainchainSource} from '../shared/bazi-mainchain';
import sourceLock from '../domain/bazi-mainchain/project/rules/source-lock-1.1.0.json';
import rules from '../domain/bazi-mainchain/project/rules/project-mainchain-1.1.0.json';

const clone=<T>(value:T):T=>structuredClone(value);
const branchLabels:Record<ChartResult140['branch'],string>={hua:'顺化', 'cong-output':'从儿','cong-strong':'从强','cong-wealth':'从财','cong-officer':'从杀','regular-weak':'常规偏弱扶抑','regular-strong':'常规偏旺扶抑','regular-balanced':'中和条件化方案'};
const positions=[['year','年柱'],['month','月柱'],['day','日柱'],['hour','时柱']] as const;
function recordedBirth(profile:BirthProfile):BaziMainchainRecordedBirth {
 return clone({calendar:profile.calendar,birthDate:profile.birthDate,birthTime:profile.birthTime,timeUnknown:profile.timeUnknown,leapMonth:profile.leapMonth,timezone:profile.timezone,birthPlace:profile.birthPlace,...(profile.timeBasis!==undefined?{timeBasis:profile.timeBasis}:{}),...(profile.birthLongitude!==undefined?{birthLongitude:profile.birthLongitude}:{})});
}
function sources():BaziMainchainSource[]{
 return sourceLock.sources.map(source=>({id:source.id,
  role:source.id===rules.sourceIds.facts?'calendar-facts':source.id===rules.sourceIds.ren?'classical-principle':source.id===rules.sourceIds.qiong?'initial-reference':'project-assumption',
  scope:source.scope,...('license'in source?{license:source.license}:{}),...('url'in source?{url:source.url}:{}),...('sha256'in source?{sha256:source.sha256}:{}),...('rawSha256'in source?{sha256:source.rawSha256}:{})}));
}
function qualitative(result:ChartResult140):BaziMainchainQualitativeCase {
 return clone({caseId:result.caseId,coverage:result.coverage,strength:result.strength,branch:result.branch,branchLabel:branchLabels[result.branch],summary:result.summary.map(line=>line.replace(`采用${result.branch}项目分支`,`采用${branchLabels[result.branch]}项目分支`)),
  primary:result.uses.filter(item=>item.role==='primary').map(item=>item.element),secondary:result.uses.filter(item=>item.role==='secondary').map(item=>item.element),avoid:result.uses.filter(item=>item.role==='avoid').map(item=>item.element),
  conditionalAlternatives:result.alternativeUses,seasonal:{elements:result.seasonal.projectElements,status:result.seasonal.status,reasons:result.seasonal.reasons}});
}
function validateOptions(options:BaziMainchainPreviewOptions):void {
 readBaziMainchainPreviewOptions(options);
}

/** Uses the repository's actual calendar/time analysis. No Service, score or history writes. */
export function previewBaziMainchain(profile:BirthProfile,options:BaziMainchainPreviewOptions={}):BaziMainchainPreview {
 validateOptions(options);
 const basis=profile.timeBasis??'civil';
 const output:BaziMainchainPreview={schema:BAZI_MAINCHAIN_PREVIEW_VERSION,status:'pending-calendar',profileId:profile.id,recordedBirth:recordedBirth(profile),
  method:{id:METHOD_140,status:'independent-project-proposal',entryPolicy:options.fromOutputMonthStem===true?'month-stem-proposal':'month-branch-only',defaultProductIntegration:false},
  calendar:{engineVersion:null,solarDate:null,lunarDate:null,basis,timezone:profile.timezone,calculationDateTime:null,dayStatus:null,dayDateCandidates:[],pillars:positions.map(([position,label])=>({position,label,gan:null,zhi:null})),warnings:[]},
  headline:[],opinion:null,entryComparison:null,pending:[],conflicts:[],
  assumptions:['历法与时间基准复用当前仓库 analyzeProfile；不从旧喜用或评分导入结论。','四柱作用的数值权重、阈值和充分条件属于独立项目提案，经典仅提供所列原则及语境。','月支入口默认保留；月干入口须显式启用，且保留两条路线结果。','缺时不补午时；未确定的日、月、年不任取一个方案。'],
  sources:sources(),details:{timeBasis:null,method:null,originalMonthBranch:null,calendarError:null,calendarEngineWarnings:[]}};
 let analysis:ReturnType<typeof analyzeProfile>;
 try{analysis=analyzeProfile(clone(profile));}
 catch(error){output.status='invalid-input';output.details.calendarError=error instanceof Error?error.message:String(error);output.headline=['出生资料未通过现有历法校验，尚未进入主链。'];output.pending=[{code:'invalid-input',explanation:output.details.calendarError}];return output;}
 const bazi=analysis.bazi,time=bazi.timeBasis;
 output.calendar={engineVersion:bazi.version,solarDate:bazi.solarDate,lunarDate:bazi.lunarDate,basis:time?.basis??basis,timezone:time?.timezone??profile.timezone,
  calculationDateTime:profile.timeUnknown?null:time?.calculationDateTime??null,dayStatus:time?.dayStatus??null,dayDateCandidates:time?[...time.dayCandidates]:[],
  pillars:positions.map(([position,label])=>{const found=bazi.pillars.filter(pillar=>pillar.label===label);if(found.length>1)throw new Error('现有历法返回重复柱位：'+label);const pillar=found[0];return{position,label,gan:pillar?.gan??null,zhi:pillar?.zhi??null};}),
  warnings:[...new Set(time?.warnings??[])]};
 output.details.timeBasis=time?clone(time):null;
 output.details.calendarEngineWarnings=[...bazi.warnings];
 output.sources.push({id:'repository-calendar:'+bazi.version,role:'calendar-facts',scope:'复用现有历法模块返回的已确定柱与时间基准；不采用其旧喜用、旺弱、明字计数或评分。'});
 if(time)output.sources.push({id:time.sourceId??time.methodId,role:'calendar-facts',scope:'现有出生时间基准；版本 '+time.version+'，方法 '+time.methodId+'。公式修正与政策原样留在展开详情，未重写天文算法。'});
 const unresolved=output.calendar.pillars.filter(pillar=>pillar.position!=='hour'&&(!pillar.gan||!pillar.zhi));
 for(const pillar of unresolved)output.pending.push({code:({year:'year-undetermined',month:'month-undetermined',day:'day-undetermined'}as const)[pillar.position as 'year'|'month'|'day'],explanation:`${pillar.label}未由现有历法确定；需补充出生时间或明确候选记录，暂不构造该柱。`});
 if(time?.dayStatus==='uncertain'&&!unresolved.some(item=>item.position==='day'))output.pending.push({code:'day-undetermined',explanation:'当前时间基准覆盖多个日期；暂不任取日柱。'});
 if(profile.timeUnknown)output.pending.push({code:'hour-unknown',explanation:'出生小时未提供；当前不补午时、不穷举并冒称已覆盖全部时辰。'});
 if(output.calendar.warnings.length)output.pending.push({code:'calendar-review',explanation:output.calendar.warnings.join('；')});
 if(unresolved.length||time?.dayStatus==='uncertain'){
  output.headline=['现有历法仍有年、月或日待定，主链暂不作取用结论。',...(profile.timeUnknown?['小时未提供，保留缺时状态。']:[])];
  return output;
 }
 const hour=output.calendar.pillars.find(pillar=>pillar.position==='hour')!;
 if(profile.timeUnknown&&(hour.gan||hour.zhi))throw new Error('缺时记录的现有历法意外给出时柱，停止主链。');
 if(!profile.timeUnknown&&(!hour.gan||!hour.zhi)){
  output.pending.push({code:'hour-unknown',explanation:'已填写时间，但现有历法未返回确定时柱，暂不作完整盘。'});output.headline=['时柱未由现有历法确定，主链尚未执行。'];return output;
 }
 const input=inputFromExistingBazi140([{id:profile.id,provenance:`repository:${bazi.version};${time?.methodId??'recorded-calendar'};${profile.calendar}:${profile.birthDate};timezone:${profile.timezone}`,bazi}],profile.timeUnknown?'missing-hour':'none');
 const method=analyzeMethod140(input,options),result=method.results[0];
 output.details.method=method;output.opinion=qualitative(result);
 output.status=profile.timeUnknown?'provisional-missing-hour':result.decisionStatus==='competing-interpretations'?'conditional-opinion':'project-opinion';
 output.headline=[...output.opinion.summary];
 if(result.decisionStatus==='competing-interpretations')output.pending.push({code:'conditional-use',explanation:result.missing.join('；')});
 if(options.fromOutputMonthStem){
  const original=analyzeMethod140(input,{fromOutputMonthStem:false});output.details.originalMonthBranch=original;
  const originalOpinion=qualitative(original.results[0]),changed=JSON.stringify(originalOpinion)!==JSON.stringify(output.opinion);
  output.entryComparison={originalMonthBranch:originalOpinion,selectedProposal:clone(output.opinion),changed};
  if(changed)output.conflicts.push({kind:'entry-policy',explanation:'月干提案与默认月支入口产生不同取用；两种项目路线均保留，未合并为经典定论。'});
 }
 if(result.seasonal.status==='conflict-with-main')output.conflicts.push({kind:'seasonal-main',explanation:'寒暖辅助方向与所选主分支存在冲突，保留层次与理由，未自动覆盖主用。'});
 for(const explanation of result.limitations)output.pending.push({code:'scope-not-implemented',explanation});
 output.assumptions.push(...method.assumptions);
 return output;
}

/** Explicit alternatives only. Never manufactures a date or hour from an unknown interval. */
export function previewBaziMainchainAlternatives(profiles:BirthProfile[],options:BaziMainchainPreviewOptions={}):BaziMainchainAlternativePreview {
 validateOptions(options);
 if(!Array.isArray(profiles)||profiles.length<2||profiles.length>8||new Set(profiles.map(profile=>profile.id)).size!==profiles.length)throw new Error('候选记录须为二至八条，身份不可重复。');
 const records=profiles.map(profile=>previewBaziMainchain(profile,options)),pendingRecordIds=records.filter(record=>!record.details.method).map(record=>record.profileId);
 const results=records.flatMap(record=>record.details.method?.results??[]);
 let consensus:MethodResult140['consensus']|null=results.length?summarizeDeclaredCases140(results,true):null;
 if(consensus&&pendingRecordIds.length)consensus={...consensus,favorableIntersection:[],knownOpinionIntersection:[],requiresBirthResolution:true};
 return{schema:'bazi-mainchain-alternative-preview/1.0.0',scope:'user-declared-alternative-records',status:pendingRecordIds.length?'pending-declared-records':'declared-record-opinions',records,consensus,pendingRecordIds,
  limitations:['仅比较用户明确声明的候选出生记录，不代表自动穷举全部出生日期或时辰。','待定及无效记录全部保留；只要存在未计算记录，就不发布所有候选的共同取用。','缺时的三柱意见交集不等于全部真实四柱的共同结论。']};
}
