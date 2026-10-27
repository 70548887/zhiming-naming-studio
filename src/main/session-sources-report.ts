import type { NamingSession } from '../shared/types';
import { safeSourceUrl, sessionSourceStatus, sourceHashLabel } from '../shared/session-sources';
import { sessionFactStatus } from '../shared/candidate-facts';
import { sessionNamingRuleStatus } from '../shared/naming-rule-status';

const esc = (value:unknown) => String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));

export const sessionSourcesReportStyles = `
.session-sources-report{break-before:page;font-size:8pt;line-height:1.55}
.session-sources-report>h2:first-child{margin-top:0}
.session-sources-report>h2{break-after:avoid;font-size:14pt}
.session-source-report-record{padding:10px 0;border-top:1px solid #d9dfd9;break-inside:avoid}
.session-source-report-record h3{font-size:10pt;letter-spacing:0;line-height:1.5;margin:0 0 4px}
.session-source-report-record p{margin:3px 0;overflow-wrap:anywhere;word-break:break-word}
.session-source-report-record a{color:#315b49;text-decoration:underline}
.session-source-report-note{color:#64766b}
.session-fact-report-status{margin:10px 0;padding:8px 0;break-inside:avoid}
`;

/** Embeds historical source metadata directly in the report, without consulting current data packs. */
export function sessionSourcesReport(session:Pick<NamingSession,'dataVersion'|'sourceSnapshot'|'factVerification'|'namingRules'>):string {
  const state = sessionSourceStatus(session);
  const facts = sessionFactStatus(session);
  const naming = sessionNamingRuleStatus(session);
  return `<section class="session-sources-report"><h2>生成时资料来源</h2><p>方案数据版本：${esc(session.dataVersion)}</p><div class="session-fact-report-status"><strong>${esc(facts.label)}</strong><p class="session-source-report-note">${esc(facts.notice)}</p></div><div class="session-fact-report-status session-naming-rule-status"><strong>${esc(naming.label)}</strong><p class="session-source-report-note">${esc(naming.notice)}</p></div><p class="session-source-report-note">${esc(state.notice)}</p>${state.sources.map(source=>{
    const href = safeSourceUrl(source.url);
    const url = href ? `<a href="${esc(href)}">${esc(source.url)}</a>` : esc(source.url || '未登记');
    return `<article class="session-source-report-record"><h3>${esc(source.name)}</h3><p>${esc(source.id)} · 许可 ${esc(source.license || '未登记')}</p><p>来源地址：${url}</p><p>提交 / 版本：${esc(source.commit || '未登记')}</p><p>${esc(sourceHashLabel(source))}：${esc(source.sha256 || '未登记')}</p>${source.note ? `<p class="session-source-report-note">${esc(source.note)}</p>` : ''}${source.files.length ? `<p class="session-source-report-note">登记文件：${source.files.map(esc).join('；')}</p>` : ''}</article>`;
  }).join('')}</section>`;
}
