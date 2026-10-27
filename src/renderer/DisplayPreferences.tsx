import React, { useId } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { usePresentationSettings } from './presentation';

export function PresentationRoot() {
  usePresentationSettings();
  return null;
}

export function DisplayPreferences() {
  const { value, update, notice } = usePresentationSettings();
  const labelId = useId();
  return <section className="panel settings-panel presentation-settings" aria-labelledby={labelId}>
    <div className="panel-title"><SlidersHorizontal size={18}/><h2 id={labelId}>显示偏好</h2><span className="tag">仅此设备</span></div>
    <p className="muted small">切换后立即生效，自动保存在本机；不影响报告字号或工作室设置。</p>
    <fieldset className="presentation-choice"><legend>界面密度</legend><div className="presentation-options">
      <label><input type="radio" name={`${labelId}-density`} checked={value.density === 'comfortable'} onChange={() => update({ density: 'comfortable' })}/><span>舒适<small>更多留白，便于浏览</small></span></label>
      <label><input type="radio" name={`${labelId}-density`} checked={value.density === 'compact'} onChange={() => update({ density: 'compact' })}/><span>紧凑<small>缩小间距，保留字号</small></span></label>
    </div></fieldset>
    <fieldset className="presentation-choice"><legend>界面字号</legend><div className="presentation-options">
      <label><input type="radio" name={`${labelId}-font`} checked={value.fontSize === 'standard'} onChange={() => update({ fontSize: 'standard' })}/><span>标准<small>输入文字 13 px</small></span></label>
      <label><input type="radio" name={`${labelId}-font`} checked={value.fontSize === 'large'} onChange={() => update({ fontSize: 'large' })}/><span>大字<small>输入文字 15 px</small></span></label>
    </div></fieldset>
    <p className="presentation-notice" role="status" aria-live="polite">{notice || '显示偏好只包含密度与字号，不保存客户资料。'}</p>
  </section>;
}
