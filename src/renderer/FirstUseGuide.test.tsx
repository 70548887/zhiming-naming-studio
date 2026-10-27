import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { dismissGuide, FirstUseGuideDialog, GUIDE_STORAGE_KEY, readGuidePreference } from './FirstUseGuide';

describe('local first-use guide', () => {
  it('explains local, optional AI, parent avoidance, opt-in rules and human review with a skip action', () => {
    const html = renderToStaticMarkup(<FirstUseGuideDialog onClose={() => {}} onDone={() => {}}/>);
    for (const word of ['本地模式', '无需配置接口也能起名', '父母姓名选填', '完整父母姓名', '默认不启用', '独立显示', '保存档案或重新生成', '先跳过', '使用指南', '不替换当前输入']) expect(html).toContain(word);
    expect(html).not.toContain('type="password"');expect(html).not.toContain('<input');
  });
  it('stores only the device-level read/skip flag under its own key', () => {
    const values = new Map<string, string>(), writes: [string, string][] = [];
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { writes.push([key, value]);values.set(key, value); } };
    expect(readGuidePreference(storage).dismissed).toBe(false);expect(dismissGuide(storage)).toBe('');expect(readGuidePreference(storage).dismissed).toBe(true);
    expect(writes).toEqual([[GUIDE_STORAGE_KEY, '{"version":1,"dismissed":true}']]);
  });
  it('treats corrupt or unavailable preferences as an optional readable guide rather than blocking startup', () => {
    expect(readGuidePreference({ getItem: () => '{bad', setItem() {} }).dismissed).toBe(false);
    expect(readGuidePreference({ getItem: () => '{"version":1,"dismissed":true,"customer":"should-not-exist"}', setItem() {} }).dismissed).toBe(false);
    expect(readGuidePreference({ getItem() { throw new Error('read'); }, setItem() {} }).notice).toContain('读取失败');
    expect(dismissGuide({ getItem: () => null, setItem() { throw new Error('write'); } })).toContain('未能保存');
  });
});
