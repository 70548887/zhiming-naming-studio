import type {ReactElement} from 'react';
import {describe, expect, it, vi} from 'vitest';
const active = vi.hoisted(() => ({current: null as null | {index: number; slots: unknown[]}}));
vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>();
  function slot<T>(create: () => T): {owner: {index: number; slots: unknown[]}; index: number; value: T} {
    const owner = active.current;
    if (!owner) throw new Error('Test hook owner is missing.');
    const index = owner.index++;
    if (!(index in owner.slots)) owner.slots[index] = create();
    return {owner, index, value: owner.slots[index] as T};
  }
  return {...actual,
    useId: () => slot(() => `test-${active.current!.index}`).value,
    useRef: <T,>(value: T) => slot(() => ({current: value})).value,
    useState: <T,>(initial: T | (() => T)) => {
      const current = slot(() => typeof initial === 'function' ? (initial as () => T)() : initial);
      return [current.value, (next: T | ((previous: T) => T)) => {
        current.owner.slots[current.index] = typeof next === 'function'
          ? (next as (previous: T) => T)(current.owner.slots[current.index] as T) : next;
      }];
    },
    useMemo: <T,>(create: () => T, deps: unknown[]) => {
      const current = slot(() => ({deps: [...deps], value: create()}));
      if (!deps.every((value, index) => Object.is(value, current.value.deps[index])) || deps.length !== current.value.deps.length) {
        current.value.deps = [...deps]; current.value.value = create();
      }
      return current.value.value;
    },
  };
});
import {ProjectNamingMethodField, type ProjectNamingMethodFieldProps, type ProjectNamingMethodFieldViewProps} from '../src/renderer/ProjectNamingMethodField';
import {ProjectNamingApplicationGate, type ProjectNamingApplicationGateProps} from '../src/renderer/ProjectNamingApplicationGate';
import {PROJECT_NAMING_METHOD_ID} from '../src/shared/project-naming-use';
import type {NamingPreferences} from '../src/shared/types';
import {getProjectNamingContextKey, type ProjectNamingGateState} from '../src/renderer/project-naming-method-state';

function harness() {
  const owner = {index: 0, slots: [] as unknown[]};
  return <T,>(render: () => T): T => {owner.index = 0; active.current = owner; try {return render();} finally {active.current = null;}};
}
function preferences(): NamingPreferences {
  return {length: 2, generationChar: '', requiredChars: '', forbiddenChars: '', elderTaboo: '', style: '', meanings: '', industry: '',
    priority: 'balanced', preferredElements: ['木', '水'], zodiacRules: false, numerology: false};
}
function field(render: ReturnType<typeof harness>, prefs: unknown, onChange: ProjectNamingMethodFieldProps['onChange'], disabled = false, contextKey = 'owner-a') {
  return (render(() => ProjectNamingMethodField({preferences: prefs, contextKey, onChange, disabled})) as ReactElement<ProjectNamingMethodFieldViewProps>).props;
}
function findButton(tree: unknown): {disabled?: boolean; onClick?: () => void} | undefined {
  if (Array.isArray(tree)) return tree.map(findButton).find(Boolean);
  if (!tree || typeof tree !== 'object') return;
  const element = tree as ReactElement<{children?: unknown; disabled?: boolean; onClick?: () => void}>;
  if (element.type === 'button') return element.props;
  return findButton(element.props?.children);
}
describe('controlled selector owner callbacks and controlled gate actions', () => {
  it('does not change preferences until an explicit clear confirmation', () => {
    const render = harness(), prefs = preferences(), original = structuredClone(prefs), change = vi.fn();
    field(render, prefs, change).onChoose('month-stem-proposal');
    expect(change).not.toHaveBeenCalled(); expect(prefs).toEqual(original);
    const confirmation = field(render, prefs, change);
    expect(confirmation.pendingChoice).toBe('month-stem-proposal'); confirmation.onConfirmClear();
    expect(change).toHaveBeenCalledOnce();
    const [next, transition] = change.mock.calls[0];
    expect(next.preferredElements).toEqual([]);
    expect(next.namingElementMethod).toEqual({methodId: PROJECT_NAMING_METHOD_ID, entryPolicy: 'month-stem-proposal'});
    expect(transition).toEqual({clearManualDraft: true}); expect(prefs).toEqual(original);
  });
  it('can cancel clearing without altering the existing manual choices', () => {
    const render = harness(), prefs = preferences(), change = vi.fn();
    field(render, prefs, change).onChoose('month-branch-only');
    field(render, prefs, change).onCancelClear();
    expect(field(render, prefs, change).pendingChoice).toBeNull();
    expect(change).not.toHaveBeenCalled(); expect(prefs.preferredElements).toEqual(['木', '水']);
  });
  it('selects an empty-manual project atomically and switching to legacy removes its own field', () => {
    const render = harness(), prefs = {...preferences(), preferredElements: []}, change = vi.fn();
    field(render, prefs, change).onChoose('month-branch-only');
    expect(change.mock.calls[0][1]).toEqual({clearManualDraft: true});
    const next = change.mock.calls[0][0];
    field(render, next, change).onChoose('legacy');
    expect(Object.hasOwn(change.mock.calls[1][0], 'namingElementMethod')).toBe(false);
    expect(Object.hasOwn(next, 'namingElementMethod')).toBe(true);
  });
  it('retires old clear callbacks after input changes and an A→B→A cycle', () => {
    const render = harness(), prefs = preferences(), change = vi.fn();
    field(render, prefs, change).onChoose('month-branch-only');
    const old = field(render, prefs, change);
    field(render, {...prefs, requiredChars: '宁'}, change);
    expect(field(render, prefs, change).pendingChoice).toBeNull();
    old.onConfirmClear(); old.onChoose('month-stem-proposal');
    expect(change).not.toHaveBeenCalled(); expect(field(render, prefs, change).pendingChoice).toBeNull();
  });
  it('retires a clear confirmation across customers even when both have identical preferences', () => {
    const render = harness(), prefs = preferences(), change = vi.fn();
    field(render, prefs, change, false, 'profile-a').onChoose('month-branch-only');
    const old = field(render, prefs, change, false, 'profile-a');
    expect(field(render, prefs, change, false, 'profile-b').pendingChoice).toBeNull();
    old.onConfirmClear(); expect(change).not.toHaveBeenCalled();
    expect(field(render, prefs, change, false, 'profile-a').pendingChoice).toBeNull();
    old.onConfirmClear(); expect(change).not.toHaveBeenCalled();
  });
  it('blocks previously captured callbacks while disabled and rejects unknown method intent', () => {
    const render = harness(), prefs = preferences(), change = vi.fn();
    const old = field(render, {...prefs, preferredElements: []}, change);
    field(render, {...prefs, preferredElements: []}, change, true); old.onChoose('month-branch-only');
    expect(change).not.toHaveBeenCalled();
    const unknown = {...prefs, namingElementMethod: {methodId: 'unsupported', entryPolicy: 'month-branch-only'}};
    field(render, unknown, change).onChoose('legacy');
    expect(change).not.toHaveBeenCalled(); expect(field(render, unknown, change).error).toContain('未知项目命名方法');
  });
  it('calls the preview callback only on an explicit enabled project action', () => {
    const render = harness(), prefs = {...preferences(), preferredElements: [], namingElementMethod: {methodId: PROJECT_NAMING_METHOD_ID, entryPolicy: 'month-branch-only' as const}}, preview = vi.fn();
    const currentContextKey = getProjectNamingContextKey(null, prefs);
    const state: ProjectNamingGateState = {phase: 'idle', gate: null, error: '', notice: '', contextKey: currentContextKey};
    const base: ProjectNamingApplicationGateProps = {preferences: prefs, state, currentContextKey, previewAvailable: true, onPreview: preview};
    for (const patch of [{previewAvailable: false}, {disabled: true}, {state: {...state, phase: 'loading' as const}}]) {
      const button = findButton(render(() => ProjectNamingApplicationGate({...base, ...patch})))!;
      expect(button.disabled).toBe(true); button.onClick!(); expect(preview).not.toHaveBeenCalled();
    }
    const button = findButton(render(() => ProjectNamingApplicationGate(base)))!;
    expect(preview).not.toHaveBeenCalled(); button.onClick!(); expect(preview).toHaveBeenCalledOnce();
  });
});
