import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DataMaintenanceStatus, DataPackPreview } from '../shared/data-maintenance';
import { DataMaintenance, DataPackConfirmation } from './DataMaintenance';

const preview: DataPackPreview = { id: 'preview-id', operation: 'import', current: { version: 'old-version', sha256: 'a'.repeat(64), bytes: 1024, counts: { characters: 774, citations: 1833, knowledge: 433, sources: 9 } }, incoming: { version: 'incoming-version', sha256: 'b'.repeat(64), bytes: 2048, counts: { characters: 775, citations: 1834, knowledge: 434, sources: 10 } }, changes: Object.fromEntries(['characters', 'citations', 'knowledge', 'sources'].map(table => [table, { added: 2, removed: 1, changed: 3, unchanged: 770 }])) as DataPackPreview['changes'], sourceChanges: [{ id: 'source-new', name: '新资料', kind: 'added' }, { id: 'source-old', name: '旧资料', kind: 'removed' }, { id: 'source-edited', name: '修改资料', kind: 'changed' }], expiresAt: '2026-10-18T09:30:00.000Z' };
const boundary = '知识包只替换字库、引文、知识及来源；内置术数规则和历史方案不替换。';
const status: DataMaintenanceStatus = { active: preview.current, rollback: preview.incoming, archives: { count: 2, bytes: 4096, maxCount: 50, maxBytes: 1024 * 1024 * 100 }, ruleBoundary: boundary };
const confirmation = (extra: Partial<Parameters<typeof DataPackConfirmation>[0]> = {}) => renderToStaticMarkup(<DataPackConfirmation preview={preview} boundary={boundary} busy={false} onClose={() => {}} onConfirm={() => {}} {...extra}/>);

describe('knowledge maintenance read-only preflight', () => {
  it('shows full current/incoming identities, counts, all table deltas, source differences and exact replacement scope', () => {
    const html = confirmation();
    for (const value of ['old-version', 'incoming-version', 'a'.repeat(64), 'b'.repeat(64), '1,024', '2,048', '774', '775', '本次变化摘要', '新增', '移除', '变更', '保持一致', ...preview.sourceChanges.flatMap(source => [source.id, source.name]), boundary, '历史方案', '不表示新增内容已由上游或专家认证', '确认前不会安装该包', '有效至']) expect(html).toContain(value);
    expect(html).toContain('取消导入');expect(html).toContain('确认导入此知识包');
  });
  it('gives rollback its own confirmation and never describes knowledge rollback as customer recovery', () => {
    const html = confirmation({ preview: { ...preview, operation: 'rollback' } });
    expect(html).toContain('确认回退知识数据');expect(html).toContain('将回退到');expect(html).toContain('取消回退');expect(html).toContain('确认回退此知识包');
    expect(html).toContain('不会恢复客户备份');expect(html).toContain('不会撤销客户与方案的审阅');
  });
  it('makes builtin replacement a whole-pack choice with cancel and historical archive protection',()=>{
    const html=confirmation({builtin:true});
    for(const value of ['确认使用本版内置字库','本版内置字库','将整个知识包切换','自定义条目是否移除','原活动包保留','旧方案仍使用生成时的归档','取消切换'])expect(html).toContain(value);
    expect(html).toContain('确认前不会安装该包');expect(html).not.toContain('只修改九个字');
  });
  it('allows a file-free builtin preview in browser mode and disables a redundant switch',()=>{
    const render=(builtin:DataMaintenanceStatus['active'])=>renderToStaticMarkup(<DataMaintenance status={{...status,builtin}} desktop={false} busy="" onOperation={async(_label,work)=>work()} onRefresh={async()=>{}} onRestore={()=>{}} onNotice={()=>{}}/>);
    const other=render(preview.incoming),same=render(preview.current);
    expect(other).toContain('确认切换后才替换当前活动包');
    expect(other.match(/<button[^>]*>预览本版内置字库<\/button>/)?.[0]).not.toContain('disabled');
    expect(same).toContain('已在使用本版内置字库');
    expect(same.match(/<button[^>]*>预览本版内置字库<\/button>/)?.[0]).toContain('disabled');
  });
  it('retains preview error with retry/cancel controls and clearly marks the applying stage', () => {
    expect(confirmation({ error: '预览已过期，请重新读取' })).toContain('role="alert"');
    const busy = confirmation({ busy: true });expect(busy).toContain('aria-busy="true"');expect(busy.match(/disabled=""/g)).toHaveLength(2);expect(busy).toContain('正在核对并应用');expect(busy).toContain('请稍候');
  });
  it('shows current hash, historical archive capacity and rollback availability without promising a source audit', () => {
    const html = renderToStaticMarkup(<DataMaintenance status={status} desktop busy="" onOperation={async (_label, work) => work()} onRefresh={async () => {}} onRestore={() => {}} onNotice={() => {}}/>);
    for (const value of ['a'.repeat(64), '历史知识包归档', '已归档', '容量上限', '当前可回退版本', '预览导入数据包', '预览回退上一版', '本机 AI 接口与密钥保留']) expect(html).toContain(value);
    expect(html).not.toContain('已由专家认证');
  });
  it('keeps imported names escaped and surfaces unavailable maintenance data or rollback problems', () => {
    expect(confirmation({ preview: { ...preview, sourceChanges: [{ id: '<iframe>', name: '<script>attack()</script>', kind: 'added' }] } })).toContain('&lt;script&gt;');
    const html = renderToStaticMarkup(<DataMaintenance status={{ ...status, rollback: undefined, rollbackError: '历史包损坏' }} desktop={false} busy="" onOperation={async (_label, work) => work()} onRefresh={async () => {}} onRestore={() => {}} onNotice={() => {}}/>);
    expect(html).toContain('历史包损坏');expect(html).toContain('选择文件、导入与回退请在桌面应用完成');
    const missing = renderToStaticMarkup(<DataMaintenance desktop busy="" onOperation={async (_label, work) => work()} onRefresh={async () => {}} onRestore={() => {}} onNotice={() => {}}/>);
    expect(missing).toContain('尚未取得完整维护状态');
  });
});
