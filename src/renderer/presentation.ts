import { useEffect, useSyncExternalStore } from 'react';

export const PRESENTATION_STORAGE_KEY = 'studio.presentation.v1';
export interface PresentationSettings {
  density: 'comfortable' | 'compact';
  fontSize: 'standard' | 'large';
}
export const DEFAULT_PRESENTATION: Readonly<PresentationSettings> = Object.freeze({ density: 'comfortable', fontSize: 'standard' });
type PresentationStorage = Pick<Storage, 'getItem' | 'setItem'>;
export interface PresentationSnapshot { value: Readonly<PresentationSettings>; notice: string }

/** Only these two non-personal display preferences are accepted or stored. */
export function parsePresentation(raw: string | null): PresentationSettings | null {
  if (raw === null) return { ...DEFAULT_PRESENTATION };
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const value = data as Record<string, unknown>;
    if (Object.keys(value).length !== 2 || (value.density !== 'comfortable' && value.density !== 'compact') || (value.fontSize !== 'standard' && value.fontSize !== 'large')) return null;
    return { density: value.density as PresentationSettings['density'], fontSize: value.fontSize as PresentationSettings['fontSize'] };
  } catch { return null; }
}

export function createPresentationStore(options: { storage: () => PresentationStorage | null; apply: (value: Readonly<PresentationSettings>) => void }) {
  let state: PresentationSnapshot = { value: DEFAULT_PRESENTATION, notice: '' };
  let initialized = false;
  const listeners = new Set<() => void>();
  const publish = (value: Readonly<PresentationSettings>, notice: string) => {
    state = { value: Object.freeze({ ...value }), notice };
    options.apply(state.value);
    for (const listener of listeners) listener();
  };
  const refresh = () => {
    initialized = true;
    try {
      const storage = options.storage();
      if (!storage) throw new Error('Storage unavailable');
      const parsed = parsePresentation(storage.getItem(PRESENTATION_STORAGE_KEY));
      publish(parsed ?? DEFAULT_PRESENTATION, parsed ? '' : '本机显示设置已损坏，已使用默认显示。重新选择可保存设置。');
    } catch {
      publish(DEFAULT_PRESENTATION, '本机显示设置读取失败，已使用默认显示。本次切换仍可生效。');
    }
  };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    activate() { if (!initialized) refresh(); },
    refresh,
    update(change: Partial<PresentationSettings>) {
      if (!initialized) refresh();
      const next = { density: change.density ?? state.value.density, fontSize: change.fontSize ?? state.value.fontSize };
      if (!parsePresentation(JSON.stringify(next))) {
        publish(state.value, '显示选项无效，未更改设置。');
        return;
      }
      try {
        const storage = options.storage();
        if (!storage) throw new Error('Storage unavailable');
        storage.setItem(PRESENTATION_STORAGE_KEY, JSON.stringify(next));
        publish(next, '显示设置已保存到本机。');
      } catch {
        publish(next, '显示设置未能保存，本次窗口已生效；重新打开后可能恢复原设置。');
      }
    },
  };
}

const presentationStore = createPresentationStore({
  storage: () => typeof window === 'undefined' ? null : window.localStorage,
  apply: value => {
    const root = typeof document === 'undefined' ? undefined : document.documentElement;
    if (root) {
      root.dataset.density = value.density;
      root.dataset.fontSize = value.fontSize;
    }
  },
});
const serverSnapshot: PresentationSnapshot = { value: DEFAULT_PRESENTATION, notice: '' };

/** Mount PresentationRoot once so the saved preference applies on every page. */
export function usePresentationSettings() {
  const state = useSyncExternalStore(presentationStore.subscribe, presentationStore.getSnapshot, () => serverSnapshot);
  useEffect(() => {
    presentationStore.activate();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === PRESENTATION_STORAGE_KEY || event.key === null) presentationStore.refresh();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
  return { ...state, update: presentationStore.update };
}
