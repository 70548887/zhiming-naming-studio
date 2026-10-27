import type {Element,NamingSession} from '../shared/types';
import {canonicalPlainJson} from '../shared/plain-json';
import {readNamingElementMethodSelection} from '../shared/project-naming-use';
import {assertNamingElementApplicationTuple,NAMING_ELEMENT_APPLICATION_POLICY} from '../shared/naming-element-application';
import {hasProjectNamingUseFootprint} from './verify-project-naming-use';

const esc=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const equal=(a:unknown,b:unknown)=>canonicalPlainJson(a)===canonicalPlainJson(b);
function elements(value:unknown):value is Element[]{return Array.isArray(value)&&value.length===new Set(value).size&&value.every(item=>['木','火','土','金','水'].includes(item));}
const styles='.project-naming-use-report{break-inside:avoid;margin:14px 0;padding:12px 14px;border:1px solid #d9dfd9;border-radius:6px}.project-naming-use-report h2{font-size:13pt;margin:0 0 8px}.project-naming-use-report table{font-size:8.5pt}.project-naming-use-report tr{break-inside:avoid}.project-naming-use-report th{width:29%}.project-naming-use-report td,.project-naming-use-report p{overflow-wrap:anywhere}.project-naming-use-report .muted{font-size:8pt}';
export interface ProjectNamingUseReport {kind:'legacy'|'saved-project'|'unsupported';adoptedLabel?:string;html:string;styles:string;}

/** Presentation of a main-process-validated saved record only. This function
 * never recomputes a chart, authenticates an imported record, or applies a live
 * manual preference to the saved score. Store/Service retain those boundaries. */
export function projectNamingUseReport(session:NamingSession):ProjectNamingUseReport {
 if(!hasProjectNamingUseFootprint(session))return{kind:'legacy',html:'',styles:''};
 try{
  const snapshot=session.analysis.projectNamingUse;
  canonicalPlainJson(snapshot);
  if(!snapshot||snapshot.schema!=='project-naming-use/1')throw new Error('采用记录格式不受支持。');
  const selection=readNamingElementMethodSelection(session.profile.namingPreferences);
  if(!selection||!equal(selection,snapshot.selection))throw new Error('生成时取法与采用记录不一致。');
  const version=session.namingRules?.version;
  assertNamingElementApplicationTuple(version,selection.methodId,snapshot.sourceRecipe.applicationPolicyVersion);
  if(!equal(snapshot.sourceRecipe,{schema:'naming-element-source-recipe/1',source:'project',namingRulesVersion:version,applicationPolicyVersion:NAMING_ELEMENT_APPLICATION_POLICY}))throw new Error('保存的命名版本与采用协议不一致。');
  const applied=snapshot.application,certificate=snapshot.engineCertificate;
  if(applied.policyId!==NAMING_ELEMENT_APPLICATION_POLICY||applied.status!=='applied'||!elements(applied.effectiveElements)||!applied.effectiveElements.length||!elements(applied.primary)||!elements(applied.secondary)||!elements(applied.avoid))throw new Error('保存的采用元素不完整。');
  if(certificate.methodId!==selection.methodId||certificate.entryPolicy!==selection.entryPolicy||certificate.applicationPolicyVersion!==applied.policyId||certificate.profileId!==session.profileId||session.profile.id!==session.profileId||!equal(certificate.effectiveElements,{primary:applied.primary,secondary:applied.secondary,avoid:applied.avoid,applied:applied.effectiveElements}))throw new Error('证书与实际采用记录不一致。');
  const sources=['project-bazi-mainchain-145','naming-element-application-v1'].map(id=>{const rows=session.sourceSnapshot?.sources.filter(source=>source.id===id)??[];if(rows.length!==1)throw new Error('保存的项目来源登记缺失或重复。');return rows[0];});
  const entry=selection.entryPolicy==='month-branch-only'?'月支取法':'月干透干提案';
  const join=(values:readonly Element[])=>values.join('、')||'未列出';
  const adoptedLabel=join(applied.effectiveElements)+'（项目主链 · '+entry+'）';
  const review=session.preferences.preferredElements;
  const reviewRow=review.length&&!equal(review,session.profile.namingPreferences?.preferredElements)?`<tr><th>后续人工审阅草稿</th><td>${esc(join(review))}（未用于本次生成；重新生成后才会采用新的选择）</td></tr>`:'';
  const html=`<section class="project-naming-use-report"><h2>生成时的取法与用字参考</h2><table><tr><th>采用取法</th><td>固定项目主链1.3.1 · ${esc(entry)}</td></tr><tr><th>本次实际选字参考</th><td>${esc(join(applied.effectiveElements))}</td></tr><tr><th>分列的项目意见</th><td>主用 ${esc(join(applied.primary))}；辅用 ${esc(join(applied.secondary))}；避用 ${esc(join(applied.avoid))}</td></tr><tr><th>原扶抑候选</th><td>${esc(join(session.originalFavorable))}（保存原值，未用来替换本次采用记录）</td></tr>${reviewRow}</table><p class="muted">以下内容照读本方案生成时保存的采用记录、证书与来源，不按当前资料库或后续人工草稿重新计算。固定项目取法不等同完整传统用神体系或奇门验名已经完成。</p><p class="muted">生成时登记的项目来源：${sources.map(source=>esc(source.name)).join('；')}。完整来源登记见本报告末尾。</p></section>`;
  return{kind:'saved-project',adoptedLabel,html,styles};
 }catch{
  return{kind:'unsupported',adoptedLabel:'未核实（采用记录不完整或当前版本不支持）',styles,html:'<section class="project-naming-use-report"><h2>生成时的取法与用字参考</h2><p>此方案包含项目取法记录，但当前报告无法完整解释其保存版本或采用内容。未改用原扶抑候选或人工草稿替代，请核对原方案与生成时来源。</p></section>'};
 }
}
