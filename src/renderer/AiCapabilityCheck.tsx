import React, { useRef, useState } from 'react';
import { CircleCheck, FlaskConical, LoaderCircle } from 'lucide-react';
import type { AiSettings, StudioSettings } from '../shared/types';
import type { AiNamingCapability } from '../shared/ai-capability';
import type { MaintenanceOperation } from './DataMaintenance';
import './ai-capability.css';

const checks = { transport: '接口通信', json: 'JSON 解析', candidateShape: '候选结构', localConstraints: '本地约束校验' } as const;
const statusLabels = { passed: '通过', failed: '未通过', 'not-run': '未执行' } as const;
export function aiCapabilityBinding(settings: AiSettings | StudioSettings, keyDraftRevision: number, credentialRevision: number, configRevision = 0): string {
  return JSON.stringify([settings.apiBaseUrl, settings.model, settings.timeoutMs, keyDraftRevision, credentialRevision, configRevision]);
}

export function AiCapabilityResult({ result, current }: { result: AiNamingCapability; current: boolean }) {
  return <section className={`ai-capability-result ${current ? result.status : 'expired'}`} aria-label="AI 命名格式检测结果">
    <h3>{!current ? '检测结果已过期' : result.status === 'passed' ? '命名格式检测通过' : '命名格式检测未通过'}</h3>
    {!current && <p className="ai-capability-expired" role="status">接口、模型、超时或密钥状态已有变化；下方仅保留上次结果，请按当前配置重新检测。</p>}
    <dl className="ai-capability-identity"><div><dt>检测接口</dt><dd>{result.endpoint}</dd></div><div><dt>模型</dt><dd>{result.model}</dd></div><div><dt>检测时间</dt><dd>{new Date(result.checkedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}（北京时间）</dd></div></dl>
    <ul className="ai-capability-checks">{Object.entries(checks).map(([key, label]) => <li key={key}><span>{label}</span><strong>{statusLabels[result.checks[key as keyof typeof checks]]}</strong></li>)}</ul>
    <p>{result.message}</p>
    {result.limitations.length > 0 && <ul className="ai-capability-limitations">{result.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul>}
    <p className="ai-capability-scope">此结果只描述该次固定样例的格式与约束通过情况，不认证实际创意质量、所有请求成功率或姓名适用性。</p>
  </section>;
}

export function AiCapabilityCheck({ settings, apiKey, keyDraftRevision, credentialRevision, configRevision = 0, busy, onOperation }: { settings: AiSettings | StudioSettings; apiKey: string; keyDraftRevision: number; credentialRevision: number; configRevision?: number; busy: string; onOperation: MaintenanceOperation }) {
  const [recorded, setRecorded] = useState<{ result: AiNamingCapability; binding: string } | null>(null), [error, setError] = useState('');
  const running = useRef(false);
  const binding = aiCapabilityBinding(settings, keyDraftRevision, credentialRevision, configRevision);
  const detect = () => {
    if (busy || running.current) return;running.current = true;const submitted = binding;
    const input = { apiBaseUrl: settings.apiBaseUrl, model: settings.model, timeoutMs: settings.timeoutMs, useAi: settings.useAi }, submittedKey = apiKey;
    setError('');setRecorded(null);
    void onOperation('检测 AI 命名格式', async () => {
      try { const result = await window.studio.testNamingCapability(input, submittedKey || undefined);setRecorded({ result, binding: submitted }); }
      catch (cause) { setError(`检测未完成：${cause instanceof Error ? cause.message : String(cause)}。可核对设置后重试。`);throw cause; }
    }).finally(() => { running.current = false; }).catch(cause => {
      setError(`检测未完成：${cause instanceof Error ? cause.message : String(cause)}。可核对设置后重试。`);
    });
  };
  return <div className="ai-capability">
    <h3>命名协议与格式</h3><p>连接测试只检查通信；格式检测会使用虚构固定样例发起小型 AI 请求，校验失败时最多重试一次，经过与起名相同的结构解析和本地约束核对。</p><p>不发送当前客户姓名、父母姓名或出生资料，不保存检测结果，不自动启用 AI。</p>
    <button type="button" className="button secondary" disabled={!!busy} onClick={detect}>{busy === '检测 AI 命名格式' ? <LoaderCircle className="spin" size={15}/> : recorded?.result.status === 'passed' && recorded.binding === binding ? <CircleCheck size={15}/> : <FlaskConical size={15}/>} {busy === '检测 AI 命名格式' ? '正在检测命名格式…' : '检测命名格式'}</button>
    {error && <p className="inline-error ai-capability-error" role="alert">{error}</p>}
    {recorded && <AiCapabilityResult result={recorded.result} current={recorded.binding === binding}/>}
  </div>;
}
