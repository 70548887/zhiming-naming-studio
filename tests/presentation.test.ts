import { describe, expect, it, vi } from 'vitest';
import { createPresentationStore, DEFAULT_PRESENTATION, parsePresentation, PRESENTATION_STORAGE_KEY, type PresentationSettings } from '../src/renderer/presentation';

function storageWith(raw: string | null = null) {
  const items = new Map<string, string>();
  if (raw !== null) items.set(PRESENTATION_STORAGE_KEY, raw);
  return {
    items,
    getItem: vi.fn((key: string) => items.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { items.set(key, value); }),
  };
}

describe('local display preference storage', () => {
  it('loads existing device settings once across subscribers and applies them', () => {
    const storage = storageWith('{"density":"compact","fontSize":"large"}');
    const apply = vi.fn();
    const store = createPresentationStore({ storage: () => storage, apply });
    expect(apply).not.toHaveBeenCalled();
    store.activate();
    expect(store.getSnapshot().value).toEqual({ density: 'compact', fontSize: 'large' });
    expect(apply).toHaveBeenLastCalledWith({ density: 'compact', fontSize: 'large' });
    const snapshot = store.getSnapshot();
    store.activate();
    expect(store.getSnapshot()).toBe(snapshot);
    expect(storage.getItem).toHaveBeenCalledTimes(1);
  });

  it('persists density and font independently without including other application data', () => {
    const storage = storageWith();
    const store = createPresentationStore({ storage: () => storage, apply: () => {} });
    store.activate();
    store.update({ density: 'compact' });
    store.update({ fontSize: 'large', customerName: '不应存储' } as Partial<PresentationSettings>);
    expect(JSON.parse(storage.items.get(PRESENTATION_STORAGE_KEY)!)).toEqual({ density: 'compact', fontSize: 'large' });
    expect([...storage.items.keys()]).toEqual([PRESENTATION_STORAGE_KEY]);
    expect(storage.items.get(PRESENTATION_STORAGE_KEY)).not.toContain('不应存储');
    expect(store.getSnapshot().notice).toContain('已保存到本机');
  });

  it('shares live changes with mounted subscribers and detaches them cleanly', () => {
    const store = createPresentationStore({ storage: () => storageWith(), apply: () => {} });
    store.activate();
    const first = vi.fn(), second = vi.fn();
    const unsubscribe = store.subscribe(first);
    store.subscribe(second);
    store.update({ fontSize: 'large' });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.update({ density: 'compact' });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
    expect(Object.isFrozen(store.getSnapshot().value)).toBe(true);
  });

  it('recovers corrupted data visibly and replaces it only after an explicit change', () => {
    const storage = storageWith('{broken');
    const store = createPresentationStore({ storage: () => storage, apply: () => {} });
    store.activate();
    expect(store.getSnapshot().value).toEqual(DEFAULT_PRESENTATION);
    expect(store.getSnapshot().notice).toContain('已损坏');
    expect(storage.setItem).not.toHaveBeenCalled();
    store.update({ fontSize: 'large' });
    expect(JSON.parse(storage.items.get(PRESENTATION_STORAGE_KEY)!)).toEqual({ density: 'comfortable', fontSize: 'large' });
    expect(store.getSnapshot().notice).toContain('已保存');
  });

  it('keeps the window usable and reports both inaccessible storage and failed writes', () => {
    const apply = vi.fn();
    const store = createPresentationStore({ storage: () => { throw new Error('SecurityError'); }, apply });
    store.activate();
    expect(store.getSnapshot().value).toEqual(DEFAULT_PRESENTATION);
    expect(store.getSnapshot().notice).toContain('读取失败');
    store.update({ fontSize: 'large' });
    expect(store.getSnapshot().value.fontSize).toBe('large');
    expect(apply).toHaveBeenLastCalledWith({ density: 'comfortable', fontSize: 'large' });
    expect(store.getSnapshot().notice).toContain('未能保存');
  });

  it('does not call a failed write successful and recovers when storage becomes writable', () => {
    const storage = storageWith();
    const originalSet = storage.setItem.getMockImplementation()!;
    storage.setItem.mockImplementation(() => { throw new Error('QuotaExceededError'); });
    const store = createPresentationStore({ storage: () => storage, apply: () => {} });
    store.update({ density: 'compact' });
    expect(store.getSnapshot().notice).toContain('未能保存');
    expect(store.getSnapshot().notice).not.toContain('已保存');
    expect(storage.items.has(PRESENTATION_STORAGE_KEY)).toBe(false);
    storage.setItem.mockImplementation(originalSet);
    store.update({ fontSize: 'large' });
    expect(store.getSnapshot().notice).toContain('已保存到本机');
    expect(parsePresentation(storage.items.get(PRESENTATION_STORAGE_KEY)!)).toEqual({ density: 'compact', fontSize: 'large' });
  });

  it('refreshes from a changed or removed device preference without writing it back', () => {
    const storage = storageWith();
    const store = createPresentationStore({ storage: () => storage, apply: () => {} });
    store.activate();
    storage.items.set(PRESENTATION_STORAGE_KEY, '{"density":"compact","fontSize":"large"}');
    store.refresh();
    expect(store.getSnapshot().value.fontSize).toBe('large');
    storage.items.delete(PRESENTATION_STORAGE_KEY);
    store.refresh();
    expect(store.getSnapshot().value).toEqual(DEFAULT_PRESENTATION);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('rejects invalid enum values instead of changing CSS attributes or persisting them', () => {
    const storage = storageWith();
    const apply = vi.fn();
    const store = createPresentationStore({ storage: () => storage, apply });
    store.activate();
    store.update({ density: 'tiny' } as unknown as Partial<PresentationSettings>);
    expect(store.getSnapshot().value).toEqual(DEFAULT_PRESENTATION);
    expect(store.getSnapshot().notice).toContain('无效');
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalledWith(expect.objectContaining({ density: 'tiny' }));
  });

  it.each(['{}', 'null', '[]', '"compact"', '{"density":["compact"],"fontSize":"large"}', '{"density":"compact","fontSize":"large","apiKey":"secret"}', '{"density":"comfortable","fontSize":false}'])('rejects malformed or unrelated stored records: %s', raw => {
    expect(parsePresentation(raw)).toBeNull();
  });
});
