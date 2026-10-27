import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DisplayPreferences } from './DisplayPreferences';
import { ShortcutHelp, resolveShortcut } from './Shortcuts';

describe('display and keyboard preference UI', () => {
  it('offers independently named native radio groups and a local save status', () => {
    const html = renderToStaticMarkup(<DisplayPreferences/>);
    expect(html).toContain('显示偏好');
    expect(html).toContain('仅此设备');
    expect(html).toContain('不影响报告字号');
    expect(html.match(/type="radio"/g)).toHaveLength(4);
    expect(html.match(/checked=""/g)).toHaveLength(2);
    const names = [...html.matchAll(/name="([^"]+)"/g)].map(match => match[1]);
    expect(names[0]).toBe(names[1]);
    expect(names[2]).toBe(names[3]);
    expect(names[0]).not.toBe(names[2]);
    expect(html).toContain('role="status"');
    expect(html).toContain('输入文字 13 px');
    expect(html).toContain('输入文字 15 px');
  });

  it('shows help only for callbacks actually available on the current page', () => {
    const available = renderToStaticMarkup(<ShortcutHelp onClose={() => {}} available={{ save: true, search: true }}/>);
    expect(available).toContain('保存当前页面的修改');
    expect(available).toContain('聚焦当前页面的搜索框');
    expect(available).not.toContain('打开报告导出确认');
    const empty = renderToStaticMarkup(<ShortcutHelp onClose={() => {}}/>);
    expect(empty).not.toContain('保存当前页面的修改');
    expect(empty).toContain('当前页面没有可用的保存');
    expect(empty).toContain('输入法组字期间暂停快捷键');
    expect(empty).toContain('弹窗内请使用操作按钮');
    expect(empty).toContain('只对当前页面中可执行的操作生效');
    expect(empty).toContain('<kbd>?</kbd>');
  });
});

describe('contextual shortcut matching', () => {
  it.each(['Control', 'Meta'])('supports %s save/search and the intentional export chord', modifier => {
    const command = modifier === 'Control' ? { ctrlKey: true } : { metaKey: true };
    expect(resolveShortcut({ key: 'S', ...command }, { editable: true })).toBe('save');
    expect(resolveShortcut({ key: 'k', ...command })).toBe('search');
    expect(resolveShortcut({ key: 'E', shiftKey: true, ...command })).toBe('export');
    expect(resolveShortcut({ key: 'e', ...command })).toBeNull();
    expect(resolveShortcut({ key: 's', shiftKey: true, ...command })).toBeNull();
  });

  it('opens help only outside editable fields without consuming ordinary typing', () => {
    expect(resolveShortcut({ key: '?', shiftKey: true })).toBe('help');
    expect(resolveShortcut({ key: '?' }, { editable: true })).toBeNull();
    expect(resolveShortcut({ key: 's' })).toBeNull();
    expect(resolveShortcut({ key: '/' })).toBeNull();
    expect(resolveShortcut({ key: '?', ctrlKey: true })).toBeNull();
    expect(resolveShortcut({ key: '?', altKey: true })).toBeNull();
  });

  it('never triggers any shortcut over a dialog or while IME owns the key', () => {
    for (const key of [{ key: 's', ctrlKey: true }, { key: 'k', metaKey: true }, { key: 'E', shiftKey: true, ctrlKey: true }, { key: '?' }]) {
      expect(resolveShortcut(key, { modalOpen: true })).toBeNull();
      expect(resolveShortcut({ ...key, isComposing: true })).toBeNull();
      expect(resolveShortcut({ ...key, keyCode: 229 })).toBeNull();
    }
  });

  it('respects handled events, auto-repeat, alternate modifiers and native Escape ownership', () => {
    for (const blocked of [{ defaultPrevented: true }, { repeat: true }, { altKey: true }, { metaKey: true }]) expect(resolveShortcut({ key: 's', ctrlKey: true, ...blocked })).toBeNull();
    expect(resolveShortcut({ key: 'Escape' })).toBeNull();
    expect(resolveShortcut({ key: 'Tab' })).toBeNull();
  });
});
