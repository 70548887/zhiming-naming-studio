import React, { useEffect, useRef } from 'react';
import { Modal } from './Modal';

export type StudioShortcut = 'save' | 'search' | 'export' | 'help';
export interface StudioShortcutActions {
  onSave?: () => void;
  onSearch?: () => void;
  onExport?: () => void;
  onHelp?: () => void;
}
export interface ShortcutKey {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  isComposing?: boolean;
  keyCode?: number;
  defaultPrevented?: boolean;
  repeat?: boolean;
}

/** Keyboard matching has no DOM side effects and is shared by the live hook. */
export function resolveShortcut(event: ShortcutKey, context: { editable?: boolean; modalOpen?: boolean } = {}): StudioShortcut | null {
  if (event.defaultPrevented || event.isComposing || event.keyCode === 229 || event.repeat || context.modalOpen || event.altKey) return null;
  const command = !!event.ctrlKey || !!event.metaKey;
  if (command) {
    if (event.ctrlKey && event.metaKey) return null;
    const key = event.key.toLowerCase();
    if (key === 's' && !event.shiftKey) return 'save';
    if (key === 'k' && !event.shiftKey) return 'search';
    if (key === 'e' && event.shiftKey) return 'export';
    return null;
  }
  if (event.key === '?' && !context.editable) return 'help';
  return null;
}

export function shortcutTargetIsEditable(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== 'function') return false;
  const element = target as Element;
  if (element.closest('input,textarea,select,[role="textbox"],[role="combobox"]')) return true;
  const editable = element.closest('[contenteditable]');
  return !!editable && editable.getAttribute('contenteditable') !== 'false';
}

const actionsByShortcut = { save: 'onSave', search: 'onSearch', export: 'onExport', help: 'onHelp' } as const;
export function useStudioShortcuts(actions: StudioShortcutActions) {
  const current = useRef(actions);
  current.current = actions;
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const action = resolveShortcut(event, {
        editable: shortcutTargetIsEditable(event.target),
        modalOpen: !!document.querySelector?.('[aria-modal="true"]:not([hidden])'),
      });
      if (!action) return;
      const callback = current.current[actionsByShortcut[action]];
      if (!callback) return;
      event.preventDefault();
      callback();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);
}

export interface ShortcutHelpProps {
  onClose: () => void;
  available?: Partial<Record<Exclude<StudioShortcut, 'help'>, boolean>>;
}
export function ShortcutHelp({ onClose, available = {} }: ShortcutHelpProps) {
  return <Modal title="键盘快捷键" subtitle="只对当前页面中可执行的操作生效。" onClose={onClose}>
    <dl className="shortcut-list">
      {available.save && <div><dt><kbd>Ctrl / ⌘</kbd> + <kbd>S</kbd></dt><dd>保存当前页面的修改</dd></div>}
      {available.search && <div><dt><kbd>Ctrl / ⌘</kbd> + <kbd>K</kbd></dt><dd>聚焦当前页面的搜索框</dd></div>}
      {available.export && <div><dt><kbd>Ctrl / ⌘</kbd> + <kbd>Shift</kbd> + <kbd>E</kbd></dt><dd>打开报告导出确认</dd></div>}
      <div><dt><kbd>?</kbd></dt><dd>打开本帮助（输入文字时不生效）</dd></div>
    </dl>
    <p className="shortcut-help-note">Windows 使用 Ctrl，macOS 使用 ⌘。输入法组字期间暂停快捷键；弹窗内请使用操作按钮，Esc 可返回或关闭弹窗。</p>
    {!available.save && !available.search && !available.export && <p className="shortcut-help-note">当前页面没有可用的保存、搜索或报告导出操作。</p>}
  </Modal>;
}
