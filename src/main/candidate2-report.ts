import type {Element,NameCandidate,NamingSession,SourceRecord} from '../shared/types';
import type {Candidate2AdoptedNamingSessionV1} from '../shared/candidate2-generation-adoption-v1';
import {CANDIDATE2_NAMING_CONSUMER_VERSION,CANDIDATE2_NAMING_SELECTION} from '../shared/candidate2-naming-consumer-v1';
import {snapshotApplicationJson} from './project-application-v132-r2-json';
import {canonicalPlainJson} from '../shared/plain-json';

export interface Candidate2ProjectReport {html:string;styles:string;adoptedLabel?:string;}
const styles='.candidate2-project-report{margin:14px 0;padding:12px 14px;border:1px solid #d9dfd9;border-radius:6px}.candidate2-project-report h2{font-size:13pt;margin:0 0 8px}.candidate2-project-report h3{font-size:10pt;letter-spacing:0;margin:12px 0 6px}.candidate2-project-report table{font-size:8.5pt}.candidate2-project-report th{width:29%}.candidate2-project-report .c2-report-original-scores th{width:20%}.candidate2-project-report .c2-report-original-scores caption{text-align:left;font-weight:bold;margin-bottom:5px}.candidate2-project-report tr,.candidate2-project-review{break-inside:avoid}.candidate2-project-report td,.candidate2-project-report p,.candidate2-project-report li{overflow-wrap:anywhere}.candidate2-project-report .c2-report-note{font-size:8pt;color:#64766b}.candidate2-project-report .c2-report-review-text{white-space:pre-wrap}';
const esc=(value:unknown)=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const equal=(left:unknown,right:unknown)=>canonicalPlainJson(left)===canonicalPlainJson(right);
const text=(value:unknown):value is string=>typeof value==='string';
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const hash=(value:unknown)=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const elements=(value:unknown):value is Element[]=>Array.isArray(value)&&value.length<=5&&new Set(value).size===value.length&&value.every(item=>['木','火','土','金','水'].includes(item));
const join=(values:readonly Element[])=>values.join('、')||'未列出';
const row=(label:string,value:unknown)=>`<tr><th>${esc(label)}</th><td>${esc(value)}</td></tr>`;
const unsupported=():Candidate2ProjectReport=>({styles,adoptedLabel:'未核实（candidate.2 保存依据不完整）',html:'<section class="candidate2-project-report" data-candidate2-project-report><h2>项目固定取法与人工审阅</h2><p>此方案的项目固定取法记录不完整，或当前报告不支持其保存版本。本节未采用原喜用候选或人工审阅草稿替代生成记录，请核对原方案及其来源。</p><p>传统判断：未知（unknown）。本报告呈现不提供来源认证或保存权限。</p></section>'});
function sources(value:unknown):value is SourceRecord[]{return Array.isArray(value)&&value.length<=500&&value.every(source=>record(source)&&['id','name','url','commit','license','sha256','note'].every(key=>text(source[key]))&&Array.isArray(source.files)&&source.files.every(text));}
const immutableCandidate=(value:NameCandidate)=>Object.fromEntries(Object.entries(value).filter(([key])=>!['meaning','reason','traditionalReason','reviewNote','favorite','warnings'].includes(key)));

/** Presentation only, after the owning main process has read and authenticated
 * its canonical saved C2 session. The guards below select a supported display
 * projection; they do not authenticate client JSON, replay sources, grant CAS
 * authority, recompute a chart, or change saved facts/scores/manual intent. */
export function candidate2ProjectReport(session:NamingSession):Candidate2ProjectReport {
 try{
  // Keep legacy report bytes unchanged, including old optional undefined
  // fields. Only a C2 footprint enters this presentation snapshot gate.
  const marker=Object.getOwnPropertyDescriptor(session,'candidate2Naming'),id=Object.getOwnPropertyDescriptor(session,'id');
  if(!marker&&!(id&&Object.hasOwn(id,'value')&&typeof id.value==='string'&&id.value.startsWith('c2s_')))return {html:'',styles:''};
  const saved=snapshotApplicationJson(session) as NamingSession&{candidate2Naming?:unknown};
  if(!Object.hasOwn(saved,'candidate2Naming')&&!saved.id.startsWith('c2s_'))return {html:'',styles:''};
  const attachment=saved.candidate2Naming;
  if(!record(attachment)||attachment.schema!=='candidate2-naming-session/1'||!record(attachment.generation)||!record(attachment.sessionBinding))return unsupported();
  const generation=attachment.generation;
  if(generation.schema!=='candidate2-naming-generation/1'||generation.status!=='generated'||generation.consumerVersion!==CANDIDATE2_NAMING_CONSUMER_VERSION||!equal(generation.selection,CANDIDATE2_NAMING_SELECTION)||!record(generation.application)||!record(generation.dataIdentity)||!record(generation.domainProjection))return unsupported();
  const application=generation.application,identity=generation.dataIdentity,projection=generation.domainProjection;
  if(application.schema!=='project-naming-use/2'||!record(application.tuple)||!record(application.application)||!record(application.certificate)||!record(application.application.elements))return unsupported();
  const tuple=application.tuple,adopted=application.application,certificate=application.certificate,opinions=adopted.elements as Record<string,unknown>;
  if(tuple.methodId!==CANDIDATE2_NAMING_SELECTION.methodId||tuple.entryPolicy!==CANDIDATE2_NAMING_SELECTION.entryPolicy||tuple.policyId!==CANDIDATE2_NAMING_SELECTION.policyId||tuple.policyPublicationId!==CANDIDATE2_NAMING_SELECTION.publicationId||tuple.enginePublicationId!=='bazi-root-feedback/1.3.2;preview-publication-r2'||tuple.namingInputVersion!=='project-naming-input/1.0.0'||adopted.status!=='applied'||adopted.policyId!==tuple.policyId)return unsupported();
  if(certificate.schema!=='project-application-certificate/1'||certificate.traditionalStatus!=='unknown'||certificate.profileId!==saved.profileId||!equal(certificate.tuple,tuple)||!equal(certificate.effectiveElements,opinions)||!sources(certificate.sources))return unsupported();
  if(!['primary','secondary','avoid','applied'].every(key=>elements(opinions[key]))||!(opinions.applied as Element[]).length)return unsupported();
  if(!record(generation.profile)||generation.profile.id!==saved.profileId||saved.profile.id!==saved.profileId||!equal(saved.profile,generation.profile)||!record(generation.preferences)||!Array.isArray(generation.preferences.preferredElements)||generation.preferences.preferredElements.length!==0||!elements(saved.preferences.preferredElements))return unsupported();
  if(!record(generation.baseAnalysis)||!record(generation.baseAnalysis.bazi)||!equal(saved.analysis,generation.baseAnalysis)||!elements(saved.originalFavorable)||!equal(saved.originalFavorable,generation.baseAnalysis.bazi.favorable))return unsupported();
  if(projection.schema!=='candidate2-domain-element-projection/1'||projection.source!=='candidate.2-authorized-elements'||projection.baseAnalysisUnchanged!==true||!equal(projection.applied,opinions.applied)||!equal(projection.userManualElements,[]))return unsupported();
  if(!equal(attachment.sessionBinding,{sessionId:saved.id,profileId:saved.profileId,createdAt:saved.createdAt})||!record(attachment.request)||attachment.request.schema!=='candidate2-session-request/1'||!equal(attachment.request.selection,CANDIDATE2_NAMING_SELECTION))return unsupported();
  if(!record(attachment.sourceCapsule)||attachment.sourceCapsule.role!=='candidate2-source-capsule'||attachment.sourceCapsule.codec!=='deflate-raw/1'||!hash(attachment.sourceCapsule.sha)||!hash(attachment.sourceWitnessDigest)||!hash(attachment.sourceSnapshotDigest)||!hash(attachment.attachmentDigest))return unsupported();
  if(identity.schema!=='candidate2-naming-data/1'||identity.namingRulesVersion!=='naming-editorial-7.1.0'||identity.activeVersion!==saved.dataVersion||!text(identity.metadataVersion)||!hash(identity.packSha256)||!hash(identity.datasetSha256)||!hash(identity.semanticSha256)||!sources(identity.sources))return unsupported();
  if(!saved.sourceSnapshot||saved.sourceSnapshot.version!=='session-sources/1.0.0'||saved.sourceSnapshot.dataVersion!==saved.dataVersion||!sources(saved.sourceSnapshot.sources)||saved.namingRules?.version!==identity.namingRulesVersion)return unsupported();
  if(!Number.isSafeInteger(saved.reviewRevision)||saved.reviewRevision!<0||!text(saved.reviewNote)||!Array.isArray(generation.candidates)||generation.candidates.length!==saved.candidates.length||!saved.candidates.length)return unsupported();
  for(let index=0;index<saved.candidates.length;index++){
   const current=saved.candidates[index],original=generation.candidates[index] as NameCandidate;
   if(!record(current)||!record(original)||!text(current.fullName)||!equal(immutableCandidate(current),immutableCandidate(original))||!['meaning','reason','traditionalReason','reviewNote'].every(key=>text(current[key as keyof NameCandidate]))||typeof current.favorite!=='boolean')return unsupported();
   if(!record(original.evaluation)||!(['sound','meaning','simplicity','traditional','distinctiveness'] as const).every(key=>typeof original.evaluation[key]==='number'&&Number.isFinite(original.evaluation[key])))return unsupported();
  }
  const value=saved as Candidate2AdoptedNamingSessionV1,g=value.candidate2Naming.generation,applicationValue=g.application;
  const elementRows=row('项目主用意见',join(applicationValue.application.elements.primary))+row('项目辅用意见',join(applicationValue.application.elements.secondary))+row('项目避用意见',join(applicationValue.application.elements.avoid))+row('本次实际项目选字输入',join(applicationValue.application.elements.applied));
  const manual=join(value.preferences.preferredElements);
  const scoreColumns=[['sound','读音'],['meaning','寓意'],['simplicity','简明'],['traditional','传统用字参考'],['distinctiveness','辨识']] as const;
  const reviewHtml=value.candidates.map((candidate,index)=>{const original=g.candidates[index];return `<article class="candidate2-project-review"><h3>${esc(candidate.fullName)} · 生成时原分值</h3><table class="c2-report-original-scores"><caption>生成时原五项分值（照录，不重新评分）</caption><thead><tr>${scoreColumns.map(([key,label])=>`<th>${esc(label)}（${esc(key)}）</th>`).join('')}</tr></thead><tbody><tr>${scoreColumns.map(([key])=>`<td>${esc(original.evaluation[key])}</td>`).join('')}</tr></tbody></table><p class="c2-report-note">traditional 数值是生成时保存的项目分项，不等于传统体系已认证；传统判断状态仍为未知（unknown），与下列人工传统参考说明分列。</p><h3>${esc(candidate.fullName)} · 人工审阅文本</h3><table>${row('收藏状态',candidate.favorite?'已收藏':'未收藏')}${row('组合寓意',candidate.meaning)}${row('推荐理由',candidate.reason)}${row('传统参考说明（人工文本）',candidate.traditionalReason)}${row('候选审阅备注',candidate.reviewNote||'未填写')}</table></article>`;}).join('');
  const sourceNames=(values:readonly SourceRecord[])=>values.map(source=>`${source.name}（${source.id}）`).join('；')||'未列出';
  const html=`<section class="candidate2-project-report" data-candidate2-project-report><h2>项目固定取法与人工审阅</h2><p><strong>传统判断：未知（unknown）</strong>。固定项目取法与人工说明均不代表完整传统用神体系、吉凶或运势结论。</p><h3>生成时固定取法</h3><table>${row('取法标识',g.selection.methodId)}${row('入法范围','月支取法（'+g.selection.entryPolicy+'）')}${row('应用策略',applicationValue.tuple.policyId)}${row('项目发布版本',applicationValue.tuple.policyPublicationId)}${row('固定引擎发布版本',applicationValue.tuple.enginePublicationId)}${row('生成器版本',g.consumerVersion)}</table><h3>生成时项目采用记录</h3><table>${elementRows}</table><p class="c2-report-note">以上分列照读原保存的项目意见。项目避用不是硬性过滤条件；不把主用、辅用、避用合并为传统统一权威。</p><h3>原分析与后续人工审阅分列</h3><table>${row('原八字喜用候选',join(value.originalFavorable))}${row('当前人工喜用审阅草稿',manual)}${row('人工审阅版本',value.reviewRevision)}${row('方案人工审阅备注',value.reviewNote||'未填写')}</table><p class="c2-report-note">人工喜用草稿未用于本批生成；本节不据此重新计算、替换项目采用记录或改写任何原候选事实及评分。人工传统参考说明也不改变未知的传统判断状态。</p>${reviewHtml}<h3>生成时保存的来源登记</h3><table>${row('方案数据版本',value.dataVersion)}${row('资料元数据版本',g.dataIdentity.metadataVersion)}${row('命名规则版本',g.dataIdentity.namingRulesVersion)}${row('项目取法来源',sourceNames(applicationValue.certificate.sources))}${row('命名资料来源',sourceNames(g.dataIdentity.sources))}${row('方案来源清单',sourceNames(value.sourceSnapshot.sources))}${row('原资料包摘要',g.dataIdentity.packSha256)}${row('原来源凭据摘要',value.candidate2Naming.sourceWitnessDigest)}${row('原来源快照摘要',value.candidate2Naming.sourceSnapshotDigest)}</table><p class="c2-report-note">本节仅呈现由主进程读取的原保存记录；来源登记和摘要不是客户端自证，本报告呈现不重新认证来源或提供保存权限。完整生成时资料登记见报告来源部分。</p></section>`;
  return {html,styles,adoptedLabel:join(applicationValue.application.elements.applied)+'（candidate.2 项目采用）'};
 }catch{return unsupported();}
}
