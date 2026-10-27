import React, {useId} from 'react';
import {
  getProjectNamingGenerationPermission, readProjectNamingIntent,
  type ProjectNamingGateState,
} from './project-naming-method-state';
import {projectNamingChoiceLabel} from './ProjectNamingMethodField';
import './project-naming-method.css';

export interface ProjectNamingApplicationGateProps {
  preferences: unknown;
  state: ProjectNamingGateState;
  /** Recompute from the current profile and preferences, not from an accepted preview. */
  currentContextKey: string;
  previewAvailable: boolean;
  onPreview: () => void | Promise<void>;
  disabled?: boolean;
  disabledReason?: string;
  id?: string;
}

/** Read-only gate view. The owner must use the same permission guard for every generation entry. */
export function ProjectNamingApplicationGate({preferences, state, currentContextKey, previewAvailable,
  onPreview, disabled = false, disabledReason, id}: ProjectNamingApplicationGateProps) {
  const generatedId = useId();
  const baseId = id ?? `project-naming-gate-${generatedId}`;
  const intent = readProjectNamingIntent(preferences);
  const current = state.contextKey === currentContextKey;
  const permission = getProjectNamingGenerationPermission(preferences, state, currentContextKey);
  const gate = previewAvailable && current && state.phase === 'ready' ? state.gate : null;
  const previewDisabled = disabled || !previewAvailable || intent.status !== 'project' || (current && state.phase === 'loading');
  const run = () => {if (!previewDisabled) void onPreview();};
  return <section className="project-naming-gate" aria-labelledby={`${baseId}-title`}>
    <div className="project-naming-heading"><h3 id={`${baseId}-title`}>项目取法采用条件</h3><span className="project-naming-badge">预览</span></div>
    {intent.status === 'legacy' ? <p className="project-naming-help">当前使用原有取法，无需运行项目采用条件预览。</p>
      : intent.status !== 'project' ? <p role="alert" className="project-naming-warning">{intent.message}</p>
      : <>
        <p className="project-naming-help">{projectNamingChoiceLabel(intent.choice)}。预览仅核对本次资料是否满足采用条件。</p>
        {!previewAvailable && <p className="project-naming-warning" role="status">采用条件预览接口尚未接通，暂不能使用项目取法生成。</p>}
        {disabled && <p className="project-naming-notice" role="status">{disabledReason || '当前有其他操作进行中，请稍后核对。'}</p>}
        <button type="button" disabled={previewDisabled} onClick={run} aria-busy={current && state.phase === 'loading'}
          aria-describedby={`${baseId}-feedback`}>{current && state.phase === 'loading' ? '正在核对采用条件…' : '核对本次采用条件'}</button>
        <div id={`${baseId}-feedback`} className="project-naming-feedback" aria-live="polite" aria-atomic="true">
          {gate?.status === 'blocked' ? <div className="project-naming-warning">
            <strong>项目取法暂不能用于本次生成</strong>
            <ul>{gate.reasons.map((reason, index) => <li key={`${reason.code}-${index}`}>{reason.message}</li>)}</ul>
          </div> : gate?.status === 'applicable' && permission.allowed ? <div className="project-naming-success">
            <strong>预览：采用条件已满足</strong>
            <p>本次资料可提交项目取法。生成时将重新核对；生成并保存后才形成采用记录。</p>
            <dl className="project-naming-elements">
              <dt>预览主用</dt><dd>{gate.effectiveElements.primary.join('、') || '未列出'}</dd>
              <dt>预览辅用</dt><dd>{gate.effectiveElements.secondary.join('、') || '未列出'}</dd>
              <dt>预览回避</dt><dd>{gate.effectiveElements.avoid.join('、') || '未列出'}</dd>
              <dt>预览选字五行</dt><dd>{gate.effectiveElements.applied.join('、') || '未列出'}</dd>
            </dl>
          </div> : <p className={current && state.phase === 'error' ? 'project-naming-warning' : 'project-naming-notice'}>
            {!previewAvailable ? '预览接口可用后，请重新核对本次采用条件。'
              : !current ? '资料或取法已变化，请重新核对本次采用条件。'
              : state.phase === 'loading' ? '核对完成前，项目取法暂不能用于生成。'
              : state.error || (!permission.allowed ? permission.reasons.join('；') : '') || state.notice || '尚未核对本次采用条件。'}
          </p>}
        </div>
      </>}
  </section>;
}
