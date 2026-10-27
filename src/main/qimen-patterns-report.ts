import type { QimenChart, QimenPatternLayer } from '../shared/types';

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
const palaceNames: Record<number, string> = { 1: '坎一宫', 2: '坤二宫', 3: '震三宫', 4: '巽四宫', 5: '中五宫', 6: '乾六宫', 7: '兑七宫', 8: '艮八宫', 9: '离九宫' };
const layerNames: Record<QimenPatternLayer, string> = { doors: '八门盘', 'heaven-stems': '天盘干', stars: '九星盘' };
const schoolName = '时家转盘 · 甲己符头拆补 · 中五寄坤二 · 天禽随天芮';
const palaceText = (palaces: number[]) => palaces.map(number => palaceNames[number] || `${number}宫`).join('、');
const list = (items: string[]) => `<ul>${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;

export const qimenPatternsReportStyles = `.qimen-patterns-report{break-before:page;font-size:8.5pt;line-height:1.5}.qimen-patterns-report>h2:first-child{margin-top:0}.qimen-patterns-report h2{font-size:14pt;margin:15px 0 8px}.qimen-patterns-report h3{font-family:'Microsoft YaHei','Noto Sans CJK SC',sans-serif;font-size:10pt;letter-spacing:0;line-height:1.6;margin:0 0 5px}.qimen-patterns-report p{margin:5px 0}.qimen-patterns-report ul{margin:4px 0;padding-left:17px}.qimen-patterns-report li,.qimen-patterns-report p{overflow-wrap:anywhere}.qimen-patterns-report .muted{font-size:7.5pt}.qimen-pattern-report-rule{break-inside:avoid;padding:10px 12px;border:1px solid #d9dfd9;border-radius:5px;margin:11px 0}.qimen-pattern-report-rule .rule-status{font-size:8pt;font-weight:400;color:#718078}.qimen-pattern-report-result{border-left:2px solid #b69962;padding-left:9px;margin:6px 0}.qimen-pattern-report-label{font-weight:600}.qimen-pattern-report-source{color:#718078;font-size:7pt;line-height:1.45;margin-top:7px}.qimen-pattern-report-rule strong{font-weight:600}.qimen-pattern-report-source ul{padding-left:14px}.qimen-pattern-report-source li{margin:3px 0}`;

export function qimenPatternsReport(chart: QimenChart): string {
  if (!chart.available) return '';
  const patterns = chart.patterns;
  if (!patterns) return '<p class="muted">原记录未包含门迫、击刑、入墓与伏吟反吟的结构标记；保留历史盘原始内容，请按出生资料重新分析后查看。</p>';
  const unmatched = patterns.checks.filter(check => check.status === 'not-matched');
  return `<section class="qimen-patterns-report"><h2>奇门盘层结构标记</h2><p>已核查 ${patterns.checks.length} 项规则 · 命中 ${patterns.findings.length} 条标记 · 涉及 ${patterns.checks.filter(check => check.status === 'matched').length} 项规则</p><p>流派与盘式：${schoolName}</p><p class="muted">${esc(patterns.school)} · 结构标记版本 ${esc(patterns.version)}<br>分别核对八门、天盘干与九星的位置关系</p><p>未命中清单：${unmatched.length ? unmatched.map(check => `${esc(patterns.rules.find(rule => rule.id === check.ruleId)?.name || check.ruleId)}（${esc(layerNames[check.layer])}）`).join('；') : '本盘各项规则均有对应标记。'}</p>${patterns.checks.map(check => {
    const rule = patterns.rules.find(item => item.id === check.ruleId);
    const findings = patterns.findings.filter(finding => finding.ruleId === check.ruleId);
    return `<article class="qimen-pattern-report-rule"><h3>${esc(rule?.name || check.ruleId)} · ${esc(layerNames[check.layer])} <span class="rule-status">${check.status === 'matched' ? `命中 ${findings.length} 条` : '未命中'}</span></h3>${findings.map(finding => `<div class="qimen-pattern-report-result"><span class="qimen-pattern-report-label">${esc(finding.label)}</span> · ${esc(finding.subjects.join('、'))} · ${esc(palaceText(finding.palaces))}${finding.evidence.some(item => !check.evidence.includes(item)) ? list(finding.evidence.filter(item => !check.evidence.includes(item))) : ''}</div>`).join('')}<p><strong>核查依据</strong></p>${list(check.evidence)}${rule ? `<p><strong>规则条件</strong></p>${list(rule.conditions)}<div class="qimen-pattern-report-source"><strong>资料来源</strong><ul>${rule.sources.map(source => `<li>${esc(source.id)} · ${esc(source.commit)}<br>定位 ${esc(source.locator)}<br>${esc(source.url)}</li>`).join('')}</ul></div>` : ''}<p class="muted">规则 ${esc(check.ruleId)} / ${esc(check.ruleVersion)}</p></article>`;
  }).join('')}${patterns.warnings.map(warning => `<p class="muted">${esc(warning)}</p>`).join('')}</section>`;
}
