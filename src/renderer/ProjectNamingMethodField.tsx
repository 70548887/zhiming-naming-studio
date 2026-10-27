import React, {useId, useMemo, useRef, useState} from 'react';
import {
  chooseProjectNamingMethod, getProjectNamingContextKey, readProjectNamingIntent,
  type ProjectNamingChoice, type ProjectNamingPreferences,
} from './project-naming-method-state';
import './project-naming-method.css';

type ProjectChoice = Exclude<ProjectNamingChoice, 'legacy'>;
type Intent = ReturnType<typeof readProjectNamingIntent>;
export interface ProjectNamingMethodFieldProps {
  preferences: unknown;
  /** Full owner/profile/draft key from getProjectNamingContextKey(profile, preferences). */
  contextKey: string;
  onChange: (preferences: ProjectNamingPreferences, transition: {clearManualDraft: boolean}) => void;
  disabled?: boolean;
  id?: string;
}
export interface ProjectNamingMethodFieldViewProps {
  intent: Intent;
  pendingChoice: ProjectChoice | null;
  error?: string;
  disabled?: boolean;
  id: string;
  onChoose: (choice: ProjectNamingChoice) => void;
  onConfirmClear: () => void;
  onCancelClear: () => void;
}
const choices: ReadonlyArray<{value: ProjectNamingChoice; label: string; description: string}> = [
  {value: 'legacy', label: '原有取法', description: '默认；保留原有分析与人工五行选择。'},
  {value: 'month-branch-only', label: '项目月支取法 · 1.3.1', description: '以月支入口核对项目命名采用条件。'},
  {value: 'month-stem-proposal', label: '项目月干透干提案 · 1.3.1', description: '使用独立的月干透干提案入口核对采用条件。'},
];
export function projectNamingChoiceLabel(choice: ProjectNamingChoice): string {
  return choices.find(item => item.value === choice)!.label;
}

/** Controlled presentation; choosing a method never runs a preview or writes a session. */
export function ProjectNamingMethodFieldView(props: ProjectNamingMethodFieldViewProps) {
  const {intent, pendingChoice, error, disabled = false, id} = props;
  const selected = intent.status === 'legacy' ? 'legacy'
    : intent.status === 'project' ? intent.choice
    : intent.status === 'conflict' ? intent.selection.entryPolicy : null;
  const manual = intent.status === 'legacy' || intent.status === 'conflict' ? intent.manualElements : [];
  return <fieldset className="project-naming-field" disabled={disabled} aria-describedby={`${id}-help`}>
    <legend>命名五行取法</legend>
    <p id={`${id}-help`} className="project-naming-help">选择只修改本次偏好。项目取法须先核对采用条件，生成时会再次核对。</p>
    <div className="project-naming-options">
      {choices.map(choice => <label key={choice.value} className={`project-naming-option${selected === choice.value ? ' is-selected' : ''}`}>
        <input type="radio" name={`${id}-choice`} value={choice.value} checked={selected === choice.value}
          onChange={() => {if (!disabled) props.onChoose(choice.value);}}/>
        <span><strong>{choice.label}{choice.value === 'legacy' && <small>默认</small>}</strong><span>{choice.description}</span></span>
      </label>)}
    </div>
    {intent.status === 'project' && <p className="project-naming-notice">已选择项目取法。人工五行暂不可编辑；切回原有取法后可人工选择。</p>}
    {intent.status === 'legacy' && manual.length > 0 && <p className="project-naming-notice">当前人工五行：{manual.join('、')}。切换到项目取法需要明确清空这些选择。</p>}
    {(intent.status === 'invalid' || intent.status === 'conflict') && <p role="alert" className="project-naming-warning">{intent.message}</p>}
    {error && <p role="alert" className="project-naming-warning">{error}</p>}
    {pendingChoice && <div className="project-naming-clear-confirm" role="group" aria-labelledby={`${id}-clear-title`}>
      <strong id={`${id}-clear-title`}>清空人工选择并切换取法？</strong>
      <p>将清空人工五行{manual.length > 0 ? `（${manual.join('、')}）` : ''}，并取消尚未应用的人工五行草稿。随后选择“{projectNamingChoiceLabel(pendingChoice)}”。</p>
      <div className="project-naming-actions">
        <button type="button" disabled={disabled} onClick={() => {if (!disabled) props.onConfirmClear();}}>清空并切换</button>
        <button type="button" className="text-button" disabled={disabled} onClick={() => {if (!disabled) props.onCancelClear();}}>保留人工选择</button>
      </div>
    </div>}
  </fieldset>;
}

/** Produces one atomic preference transition; the owner also clears both manual draft entry paths. */
export function ProjectNamingMethodField({preferences, contextKey, onChange, disabled = false, id}: ProjectNamingMethodFieldProps) {
  const generatedId = useId();
  const preferenceKey = getProjectNamingContextKey(null, preferences);
  const token = useMemo(() => ({}), [contextKey, preferenceKey]);
  const latest = useRef({token, preferences, disabled, onChange});
  latest.current = {token, preferences, disabled, onChange};
  const [pending, setPending] = useState<{token: object; choice: ProjectChoice} | null>(null);
  const [failure, setFailure] = useState<{token: object; message: string} | null>(null);
  const pendingChoice = pending?.token === token ? pending.choice : null;
  function choose(choice: ProjectNamingChoice, clearManual = false) {
    if (latest.current.token !== token || latest.current.disabled) return;
    const result = chooseProjectNamingMethod(latest.current.preferences, choice, clearManual);
    if (result.status === 'needs-manual-clear') {
      setPending({token, choice: result.choice});
      setFailure(null);
    } else if (result.status === 'rejected') {
      setPending(null);
      setFailure({token, message: result.message});
    } else {
      setPending(null);
      setFailure(null);
      latest.current.onChange(result.preferences, {clearManualDraft: result.clearManualDraft});
    }
  }
  return <ProjectNamingMethodFieldView id={id ?? `project-naming-method-${generatedId}`}
    intent={readProjectNamingIntent(preferences)} pendingChoice={pendingChoice}
    error={failure?.token === token ? failure.message : ''} disabled={disabled}
    onChoose={choice => choose(choice)}
    onConfirmClear={() => {if (pending?.token === token && latest.current.token === token) choose(pending.choice, true);}}
    onCancelClear={() => {if (latest.current.token === token && !latest.current.disabled) setPending(null);}}/>;
}
