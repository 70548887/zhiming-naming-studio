import type { QimenChart } from '../shared/types';

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
const palaceNames: Record<number, string> = { 1: '坎一宫', 2: '坤二宫', 3: '震三宫', 4: '巽四宫', 5: '中五宫', 6: '乾六宫', 7: '兑七宫', 8: '艮八宫', 9: '离九宫' };

export function qimenAuxiliaryReport(q: QimenChart): string {
  if (!q.available) return '';
  const auxiliary = q.auxiliary;
  if (!auxiliary) return '<p class="muted">当前记录未生成旬空、驿马快照；历史盘保持原记录，请按出生资料重新分析后查看。</p>';
  return `<section class="qimen-auxiliary-report"><h2>奇门辅助标记 · 旬空与驿马</h2><p>时柱依据：${esc(auxiliary.hourGanzhi)} · 驿马取时支：${esc(auxiliary.hourGanzhi.slice(-1))}<br><span class="muted">标记版本 ${esc(auxiliary.version)} · 按固定地支宫位标注</span></p><table><thead><tr><th>标记</th><th>地支</th><th>固定地支宫位</th><th>规则版本</th></tr></thead><tbody>${auxiliary.markers.map(marker => `<tr><td>${esc(marker.label)}</td><td>${esc(marker.branches.join('、'))}</td><td>${esc(marker.palaces.map(n => palaceNames[n] || `${n}宫`).join('、'))}</td><td>${esc(marker.ruleId)}<br>${esc(marker.ruleVersion)}</td></tr>`).join('')}</tbody></table><h2>触发依据</h2>${auxiliary.markers.map(marker => `<div class="qimen-marker-evidence"><b>${esc(marker.label)}</b><ul>${marker.evidence.map(evidence => `<li>${esc(evidence)}</li>`).join('')}</ul></div>`).join('')}<h2>规则条件与资料版本</h2>${auxiliary.rules.map(rule => `<div class="qimen-rule-evidence"><b>${esc(rule.name)}</b><p class="muted">${esc(rule.id)} / ${esc(rule.version)}</p><ul>${rule.conditions.map(condition => `<li>${esc(condition)}</li>`).join('')}</ul><p class="muted">${rule.sources.map(source => `${esc(source.id)} · ${esc(source.commit.slice(0, 12))}`).join('<br>')}</p></div>`).join('')}<p class="muted">完整来源链接与定位见随应用附带的 docs/QIMEN-MARKERS.md。</p>${auxiliary.warnings.map(warning => `<p class="muted">${esc(warning)}</p>`).join('')}</section>`;
}
