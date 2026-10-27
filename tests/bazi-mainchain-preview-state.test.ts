import { describe, expect, it, vi } from 'vitest';
import type { BirthProfile } from '../src/shared/types';
import type { BaziMainchainPreview, BaziMainchainPreviewOptions } from '../src/shared/bazi-mainchain';
import { createBaziMainchainPreviewController } from '../src/renderer/bazi-mainchain-preview-state';

function profile(id = 'profile-a'): BirthProfile {
  return {
    id, customerName: '客户', surname: '张', surnamePinyin: 'zhang', gender: '中性',
    calendar: 'solar', birthDate: '2000-01-01', leapMonth: false, birthTime: '',
    timeUnknown: true, birthPlace: '上海', timezone: 'Asia/Shanghai', notes: '',
    fatherName: '张父', motherName: '李母',
    namingPreferences: {
      length: 2, generationChar: '', requiredChars: '', forbiddenChars: '', elderTaboo: '',
      style: '', meanings: '', industry: '', priority: 'balanced', preferredElements: ['木'],
      zodiacRules: false, numerology: false,
    },
  };
}

function preview(
  profileId = 'profile-a',
  proposal = false,
  status: BaziMainchainPreview['status'] = 'project-opinion',
): BaziMainchainPreview {
  return {
    schema: 'bazi-mainchain-preview/1.0.2', status, profileId,
    recordedBirth: {
      calendar: 'solar', birthDate: '2000-01-01', birthTime: '', timeUnknown: true,
      leapMonth: false, timezone: 'Asia/Shanghai', birthPlace: '上海',
    },
    method: {
      id: 'test-method', status: 'independent-project-proposal',
      entryPolicy: proposal ? 'month-stem-proposal' : 'month-branch-only', defaultProductIntegration: false,
    },
    calendar: {
      engineVersion: null, solarDate: null, lunarDate: null, basis: 'civil', timezone: 'Asia/Shanghai',
      calculationDateTime: null, dayStatus: null, dayDateCandidates: [], pillars: [], warnings: [],
    },
    headline: ['测试预览'], opinion: null, entryComparison: null, pending: [], conflicts: [], assumptions: [], sources: [],
    details: { timeBasis: null, method: null, originalMonthBranch: null, calendarError: null, calendarEngineWarnings: [] },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe('explicit mainchain preview controller', () => {
  it('stays idle without a profile and never calls the API from context or option changes', async () => {
    const api = { previewBaziMainchain: vi.fn(async () => preview()) };
    const controller = createBaziMainchainPreviewController(api);
    const initial = controller.getSnapshot();
    expect(initial).toEqual({ phase: 'idle', result: null, error: '', proposal: false, stale: false, notice: '', focusSerial: 0 });
    expect(controller.getSnapshot()).toBe(initial);
    controller.setProposal(true);
    controller.setContext(profile());
    controller.activate();
    expect(api.previewBaziMainchain).not.toHaveBeenCalled();
    controller.setContext(null);
    await controller.run();
    expect(api.previewBaziMainchain).not.toHaveBeenCalled();
    expect(controller.getSnapshot()).toMatchObject({ phase: 'error', result: null, stale: false });
    expect(controller.getSnapshot().error).toContain('出生资料');
  });

  it('always sends an explicit boolean and marks a changed option result stale until the next run', async () => {
    const api = { previewBaziMainchain: vi.fn(async (_profile: BirthProfile, options?: BaziMainchainPreviewOptions) => preview('profile-a', options?.fromOutputMonthStem)) };
    const controller = createBaziMainchainPreviewController(api);
    controller.setContext(profile());
    await controller.run();
    expect(api.previewBaziMainchain.mock.calls[0][1]).toEqual({ fromOutputMonthStem: false });
    const original = controller.getSnapshot().result;
    controller.setProposal(true);
    expect(controller.getSnapshot()).toMatchObject({ phase: 'ready', result: original, proposal: true, stale: true });
    expect(api.previewBaziMainchain).toHaveBeenCalledTimes(1);
    controller.setProposal(false);
    expect(controller.getSnapshot().stale).toBe(true);
    controller.setProposal(true);
    await controller.run();
    expect(api.previewBaziMainchain.mock.calls[1][1]).toEqual({ fromOutputMonthStem: true });
    expect(controller.getSnapshot()).toMatchObject({ phase: 'ready', proposal: true, stale: false, error: '', focusSerial: 2 });
    expect(controller.getSnapshot().result?.method.entryPolicy).toBe('month-stem-proposal');
  });

  it('copies the whole profile at context and request boundaries, including parents and nested preferences', async () => {
    const original = profile();
    const untouched = structuredClone(original);
    const received: BirthProfile[] = [];
    const api = { previewBaziMainchain: vi.fn(async (input: BirthProfile) => {
      received.push(structuredClone(input));
      input.fatherName = '服务侧修改';
      input.namingPreferences!.preferredElements.push('火');
      return preview();
    }) };
    const controller = createBaziMainchainPreviewController(api);
    controller.setContext(original);
    original.motherName = '调用方未提交的新值';
    await controller.run();
    await controller.retry();
    expect(received).toEqual([untouched, untouched]);
    expect(original).toEqual({ ...untouched, motherName: '调用方未提交的新值' });
  });

  it('uses all context fields to invalidate a same-id request, and preserves equal reordered context', async () => {
    const old = deferred<BaziMainchainPreview>();
    const api = { previewBaziMainchain: vi.fn(() => old.promise) };
    const controller = createBaziMainchainPreviewController(api);
    const input = profile();
    controller.setContext(input);
    const running = controller.run();
    const loading = controller.getSnapshot();
    controller.setContext(Object.fromEntries(Object.entries(input).reverse()) as unknown as BirthProfile);
    expect(controller.getSnapshot()).toBe(loading);
    input.fatherName = '新父名';
    controller.setContext(input);
    expect(controller.getSnapshot()).toMatchObject({ phase: 'idle', result: null, stale: false, error: '' });
    old.resolve(preview());
    await running;
    expect(controller.getSnapshot().result).toBeNull();
    await controller.run();
    input.namingPreferences!.preferredElements.push('水');
    controller.setContext(input);
    expect(controller.getSnapshot().result).toBeNull();
    expect(controller.getSnapshot().phase).toBe('idle');
  });

  it('clears prior results and errors immediately when selecting a different profile', async () => {
    const api = { previewBaziMainchain: vi.fn(async () => preview()) };
    const controller = createBaziMainchainPreviewController(api);
    controller.setContext(profile());
    await controller.run();
    controller.setContext(profile('profile-b'));
    expect(controller.getSnapshot()).toMatchObject({ phase: 'idle', result: null, error: '', stale: false });
    await controller.run();
    expect(controller.getSnapshot().error).toContain('资料标识不匹配');
    controller.setContext(profile('profile-c'));
    expect(controller.getSnapshot()).toMatchObject({ phase: 'idle', result: null, error: '', stale: false });
  });

  it('rejects late success and failure from both earlier runs and an earlier option draft', async () => {
    const first = deferred<BaziMainchainPreview>();
    const second = deferred<BaziMainchainPreview>();
    const third = deferred<BaziMainchainPreview>();
    const api = { previewBaziMainchain: vi.fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
      .mockImplementationOnce(() => third.promise) };
    const controller = createBaziMainchainPreviewController(api);
    controller.setContext(profile());
    const firstRun = controller.run();
    const secondRun = controller.run();
    controller.setProposal(true);
    const thirdRun = controller.run();
    third.resolve(preview('profile-a', true));
    await thirdRun;
    const accepted = controller.getSnapshot();
    first.resolve(preview());
    second.reject(new Error('已过期失败'));
    await Promise.all([firstRun, secondRun]);
    expect(controller.getSnapshot()).toBe(accepted);
    expect(accepted).toMatchObject({ phase: 'ready', proposal: true, stale: false, error: '', focusSerial: 1 });
  });

  it('cannot revive a request after a profile A to B to A change', async () => {
    const late = deferred<BaziMainchainPreview>();
    const controller = createBaziMainchainPreviewController({ previewBaziMainchain: () => late.promise });
    controller.setContext(profile());
    const running = controller.run();
    controller.setContext(profile('profile-b'));
    controller.setContext(profile());
    late.resolve(preview());
    await running;
    expect(controller.getSnapshot()).toMatchObject({ phase: 'idle', result: null, focusSerial: 0 });
  });

  it.each<BaziMainchainPreview['status']>([
    'project-opinion', 'conditional-opinion', 'provisional-missing-hour', 'pending-calendar', 'invalid-input',
  ])('keeps DTO status %s as a successful response without deriving a different opinion', async status => {
    const response = preview('profile-a', false, status);
    const controller = createBaziMainchainPreviewController({ previewBaziMainchain: async () => response });
    controller.setContext(profile());
    await controller.run();
    expect(controller.getSnapshot()).toMatchObject({ phase: 'ready', error: '', stale: false });
    expect(controller.getSnapshot().result).toEqual(response);
    expect(controller.getSnapshot().result).not.toBe(response);
  });

  it.each([
    { name: 'wrong-profile', response: preview('profile-b'), message: '资料标识不匹配' },
    { name: 'wrong-entry-policy', response: preview('profile-a', true), message: '入口策略' },
  ])('retains a useful error for $name rather than accepting it as current', async ({ response, message }) => {
    const controller = createBaziMainchainPreviewController({ previewBaziMainchain: async () => response });
    controller.setContext(profile());
    await controller.run();
    expect(controller.getSnapshot()).toMatchObject({ phase: 'error', result: null, stale: false, focusSerial: 1 });
    expect(controller.getSnapshot().error).toContain(message);
  });

  it('retains a failure and old result as stale, then retries with the current profile and option', async () => {
    const received: BirthProfile[] = [];
    const api = { previewBaziMainchain: vi.fn()
      .mockResolvedValueOnce(preview())
      .mockRejectedValueOnce(new Error('日历计算失败'))
      .mockImplementationOnce(async (input: BirthProfile, options: BaziMainchainPreviewOptions) => {
        received.push(input);
        return preview(input.id, options.fromOutputMonthStem);
      }) };
    const controller = createBaziMainchainPreviewController(api);
    controller.setContext(profile());
    await controller.run();
    await controller.run();
    expect(controller.getSnapshot()).toMatchObject({ phase: 'error', error: '日历计算失败', stale: true });
    expect(controller.getSnapshot().result).not.toBeNull();
    controller.setProposal(true);
    expect(controller.getSnapshot().error).toBe('日历计算失败');
    const current = { ...profile('profile-b'), motherName: '当前母名', notes: '当前资料' };
    controller.setContext(current);
    await controller.retry();
    expect(received).toEqual([current]);
    expect(api.previewBaziMainchain.mock.calls[2][1]).toEqual({ fromOutputMonthStem: true });
    expect(controller.getSnapshot()).toMatchObject({ phase: 'ready', error: '', stale: false });
  });

  it('ignores disposed requests through StrictMode reactivation and supports fresh subscriptions and runs', async () => {
    const old = deferred<BaziMainchainPreview>();
    const fresh = deferred<BaziMainchainPreview>();
    const api = { previewBaziMainchain: vi.fn().mockImplementationOnce(() => old.promise).mockImplementationOnce(() => fresh.promise) };
    const controller = createBaziMainchainPreviewController(api);
    const oldListener = vi.fn();
    controller.subscribe(oldListener);
    controller.setContext(profile());
    const oldRun = controller.run();
    controller.dispose();
    const oldCalls = oldListener.mock.calls.length;
    const newListener = vi.fn();
    const unsubscribe = controller.subscribe(newListener);
    controller.activate();
    expect(controller.getSnapshot().phase).toBe('idle');
    const freshRun = controller.run();
    fresh.resolve(preview());
    await freshRun;
    const accepted = controller.getSnapshot();
    old.resolve(preview());
    await oldRun;
    expect(controller.getSnapshot()).toBe(accepted);
    expect(oldListener).toHaveBeenCalledTimes(oldCalls);
    expect(newListener).toHaveBeenCalledTimes(2);
    unsubscribe();
    controller.setProposal(true);
    expect(newListener).toHaveBeenCalledTimes(2);
    controller.dispose();
    await controller.run();
    expect(api.previewBaziMainchain).toHaveBeenCalledTimes(2);
  });

  it('blocks external disabled runs with a notice while retaining a completed result', async () => {
    let disabled = false;
    const api = { previewBaziMainchain: vi.fn(async () => preview()) };
    const controller = createBaziMainchainPreviewController(api, { isDisabled: () => disabled });
    controller.setContext(profile());
    await controller.run();
    const result = controller.getSnapshot().result;
    disabled = true;
    await controller.run();
    await controller.retry();
    expect(api.previewBaziMainchain).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot()).toMatchObject({ phase: 'ready', result, stale: false, focusSerial: 1 });
    expect(controller.getSnapshot().notice).toContain('稍后');
    disabled = false;
    await controller.retry();
    expect(api.previewBaziMainchain).toHaveBeenCalledTimes(2);
    expect(controller.getSnapshot().notice).toBe('');
  });
});
