import React, { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, Database, FolderOpen, History, LoaderCircle } from 'lucide-react';
import type { DataMaintenanceStatus, DataPackInfo, DataPackPreview, DataPackTable } from '../shared/data-maintenance';
import { Modal } from './Modal';
import './data-maintenance.css';

const tableNames: Record<DataPackTable, string> = { characters: '命名字库', citations: '典籍引文', knowledge: '文化知识', sources: '资料来源' };
const tables = Object.keys(tableNames) as DataPackTable[];
const changeNames = { added: '新增', removed: '移除', changed: '变更' } as const;
export const dataSize = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${Math.ceil(bytes / 1024)} KB`;
export type MaintenanceOperation = <T>(label: string, work: () => Promise<T>) => Promise<T | undefined>;

function PackInfo({ info, title }: { info: DataPackInfo; title: string }) {
  return <section className="maintenance-pack-info"><h4>{title}</h4><dl><div><dt>数据版本</dt><dd>{info.version}</dd></div><div><dt>文件大小</dt><dd>{dataSize(info.bytes)} · {info.bytes.toLocaleString()} 字节</dd></div><div className="maintenance-sha"><dt>完整 SHA-256</dt><dd>{info.sha256}</dd></div></dl><p className="maintenance-counts">{tables.map(table => <span key={table}>{tableNames[table]} <strong>{info.counts[table].toLocaleString()}</strong></span>)}</p></section>;
}

export function DataPackConfirmation({ preview, boundary, busy, error, builtin=false, onClose, onConfirm }: { preview: DataPackPreview; boundary: string; busy: boolean; error?: string; builtin?:boolean; onClose: () => void; onConfirm: () => void }) {
  const rollback = preview.operation === 'rollback';
  return <Modal title={rollback ? '确认回退知识数据' : builtin ? '确认使用本版内置字库' : '确认导入知识数据'} subtitle="先核对文件身份与变化范围，再替换当前知识包。" onClose={() => { if (!busy) onClose(); }} wide>
    <div className="data-pack-confirmation" aria-busy={busy}>
      <div className="maintenance-comparison"><PackInfo info={preview.current} title="当前使用"/><PackInfo info={preview.incoming} title={rollback ? '将回退到' : builtin ? '本版内置字库' : '将导入'}/></div>
      {builtin&&!rollback&&<p className="maintenance-boundary-inline">将整个知识包切换为本版内置字库，其中包括九个默认字典词条的纠正。自定义条目是否移除请核对下方差异；原活动包保留为可回退的上一版，旧方案仍使用生成时的归档。</p>}
      <h3>本次变化摘要</h3><div className="maintenance-table-scroll"><table><thead><tr><th>数据范围</th><th>新增</th><th>移除</th><th>变更</th><th>保持一致</th></tr></thead><tbody>{tables.map(table => <tr key={table}><th scope="row">{tableNames[table]}</th><td>{preview.changes[table].added}</td><td>{preview.changes[table].removed}</td><td>{preview.changes[table].changed}</td><td>{preview.changes[table].unchanged}</td></tr>)}</tbody></table></div>
      <details className="maintenance-source-changes"><summary>来源登记变化 · {preview.sourceChanges.length} 项</summary>{preview.sourceChanges.length ? <ul>{preview.sourceChanges.map((source, index) => <li key={`${source.id}-${index}`}><span>{changeNames[source.kind]}</span><strong>{source.name}</strong><small>{source.id}</small></li>)}</ul> : <p>来源登记字段没有变化。</p>}</details>
      <div className="maintenance-boundary"><h3>替换范围与历史方案</h3><p>{boundary}</p><p>变化数字描述数据内容差异，不表示新增内容已由上游或专家认证。请按来源与许可核对自定义包。</p><p>{rollback ? '本次仅回退知识包；不会恢复客户备份，不会撤销客户与方案的审阅。' : '确认前不会安装该包；取消后保留当前知识库和全部客户数据。'}</p></div>
      <p className="maintenance-expiry">预览有效至 {new Date(preview.expiresAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}（北京时间）。确认时会再次核对当前版本与预览的文件身份；过期或基线变化后需重新预览。</p>
      {error && <p className="inline-error maintenance-preview-error" role="alert">{error}</p>}
      <div className="maintenance-confirm-actions"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>取消{rollback ? '回退' : builtin ? '切换' : '导入'}</button><button type="button" className="button primary" disabled={busy} onClick={onConfirm}>{busy ? <LoaderCircle className="spin" size={16}/> : <Database size={16}/>} {busy ? '正在核对并应用…' : rollback ? '确认回退此知识包' : builtin ? '确认使用本版内置字库' : '确认导入此知识包'}</button></div>
      {busy && <p className="maintenance-operation-status" role="status">正在验证预览并写入知识包，请稍候。</p>}
    </div>
  </Modal>;
}

interface Props {
  status?: DataMaintenanceStatus; desktop: boolean; busy: string;
  onOperation: MaintenanceOperation; onRefresh: () => Promise<unknown>;
  onRestore: () => void; onNotice: (message: string, error?: boolean) => void;
}
export function DataMaintenance({ status, desktop, busy, onOperation, onRefresh, onRestore, onNotice }: Props) {
  const [preview, setPreview] = useState<DataPackPreview | null>(null), [error, setError] = useState(''), [previewBuiltin,setPreviewBuiltin]=useState(false);
  const previewRef = useRef(preview), mounted = useRef(true), applying = useRef(false);previewRef.current = preview;
  useEffect(() => { mounted.current = true;return () => { mounted.current = false;const current = previewRef.current;if (current && !applying.current) void window.studio.discardDataPackPreview(current.id).catch(() => {}); }; }, []);
  const adopt = async (next: DataPackPreview,builtin=false) => { if (!mounted.current) { await window.studio.discardDataPackPreview(next.id);return; }setError('');setPreviewBuiltin(builtin);setPreview(next); };
  const prepare = (kind:'import'|'rollback'|'builtin') => {
    if (busy) return;
    if (!desktop&&kind!=='builtin') { onNotice('请在桌面应用中选择文件并确认知识包维护操作。');return; }
    void onOperation(kind==='rollback' ? '读取回退预览' : kind==='builtin' ? '读取本版内置字库预览' : '读取并校验数据包', async () => {
      const next = kind==='rollback' ? await window.studio.previewRollbackDataPack() : kind==='builtin' ? await window.studio.previewBuiltinDataPack() : await window.studio.previewDataPack();
      if (!next) { onNotice('已取消选择知识数据包，当前数据未改变。');return; }
      await adopt(next,kind==='builtin');
    });
  };
  const cancel = () => {
    if (!preview || busy) return;const current = preview;
    void onOperation('取消知识包预览', async () => {
      try { await window.studio.discardDataPackPreview(current.id);setPreview(null);setError('');onNotice(`已取消${current.operation === 'rollback' ? '回退' : previewBuiltin ? '切换' : '导入'}，当前知识包与客户数据未改变。`); }
      catch (cause) { setError(`取消预览未完成：${cause instanceof Error ? cause.message : String(cause)}。可重试；尚未应用该包。`);throw cause; }
    });
  };
  const confirm = () => {
    if (!preview || busy || applying.current) return;const current = preview;applying.current = true;setError('');
    void onOperation(current.operation === 'rollback' ? '回退知识数据' : previewBuiltin ? '切换内置字库' : '导入知识数据', async () => {
      let message: string;
      try { message = await window.studio.applyDataPackPreview(current.id); }
      catch (cause) { setError(`本次未应用：${cause instanceof Error ? cause.message : String(cause)}。预览仍保留，可重试或取消后重新预览。`);throw cause; }
      finally { applying.current = false; }
      setPreview(null);setError('');onNotice(message);
      try { await onRefresh(); } catch (cause) { onNotice(`知识包已应用，但界面状态刷新失败：${cause instanceof Error ? cause.message : String(cause)}。重新打开设置可再读取。`, true); }
    }).finally(()=>{applying.current=false;}).catch(cause=>{if(mounted.current)setError(`操作回执未完成：${cause instanceof Error ? cause.message : String(cause)}。请重新核对当前知识包后再试。`);});
  };
  const exportFile = (knowledge: boolean) => {
    if (busy) return;
    void onOperation(knowledge ? '导出知识数据包' : '导出客户备份', async () => {
      const path = knowledge ? await window.studio.exportDataPack() : await window.studio.backup();
      onNotice(path ? `${knowledge ? '知识包' : '客户备份'}已保存：${path}` : `已取消${knowledge ? '知识包' : '客户备份'}导出，未写入文件。`);
    });
  };
  return <section className="panel settings-panel data-panel data-maintenance" aria-label="数据与备份维护" aria-busy={!!busy}>
    <div className="panel-title"><Database size={18}/><h2>数据与备份</h2>{status && <span className="tag">{status.active.version}</span>}</div>
    {status ? <><PackInfo info={status.active} title="当前知识包"/><p className="maintenance-boundary-inline">{status.ruleBoundary}</p><div className="maintenance-archives"><h3>历史知识包归档</h3><p>已归档 <strong>{status.archives.count}</strong> 份 · {dataSize(status.archives.bytes)}。用于按生成时知识包核对旧方案，随客户备份保留。</p><p>容量上限 {status.archives.maxCount} 份 / {dataSize(status.archives.maxBytes)}；当前使用的知识包、可回退包与历史归档各有用途，不混作客户恢复。</p></div></> : <p className="maintenance-unavailable">尚未取得完整维护状态，版本、哈希及归档信息待重新读取。</p>}
    <div className="data-actions"><div><strong>客户与方案备份</strong><p>备份客户、方案、审阅历史、工作室品牌及所需知识包归档。恢复会替换这些数据；本机 AI 接口与密钥保留。</p></div><div className="button-row"><button className="button secondary" disabled={!!busy} onClick={() => exportFile(false)}><ArrowDownToLine size={15}/>导出备份</button><button className="button secondary" disabled={!!busy} onClick={onRestore}><FolderOpen size={15}/>恢复备份</button></div></div>
    <div className="data-actions"><div><strong>本地知识数据包</strong><p>导入前先校验并查看版本、完整哈希、数据与来源变化，确认后才安装。内置术数规则与固定逐月原文随应用更新。</p>{status?.builtin&&<p>{status.builtin.sha256===status.active.sha256?'已在使用本版内置字库。':'可预览本版内置字库；确认切换后才替换当前活动包。'}</p>}{!desktop && <p className="maintenance-desktop-note">选择文件、导入与回退请在桌面应用完成。</p>}</div><div className="button-row"><button className="button secondary" disabled={!!busy} onClick={() => exportFile(true)}>导出数据包</button><button className="button secondary" disabled={!!busy} onClick={() => prepare('import')}>预览导入数据包</button><button className="button secondary" disabled={!!busy||!status?.builtin||status.builtin.sha256===status.active.sha256} onClick={() => prepare('builtin')}>预览本版内置字库</button><button className="text-button" disabled={!!busy || !status?.rollback} onClick={() => prepare('rollback')}><History size={14}/>预览回退上一版</button></div></div>
    {status?.rollback && <details className="maintenance-rollback"><summary>当前可回退版本 · {status.rollback.version}</summary><PackInfo info={status.rollback} title="可回退知识包"/><p>回退同样先预览并确认变化；只替换知识数据，不撤销历史方案和审阅。</p></details>}
    {status?.rollbackError && <p className="inline-warning" role="status">回退包状态：{status.rollbackError}</p>}
    {busy && <p className="maintenance-operation-status" role="status"><LoaderCircle className="spin" size={14}/>{busy}…</p>}
    {preview && <DataPackConfirmation preview={preview} boundary={status?.ruleBoundary || '知识包只更新字库、引文、文化知识及来源；客户、旧方案和内置术数规则不随之替换。'} busy={!!busy} error={error} builtin={previewBuiltin} onClose={cancel} onConfirm={confirm}/>}
  </section>;
}
