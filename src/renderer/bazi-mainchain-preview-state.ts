import type { BirthProfile } from '../shared/types';
import type { BaziMainchainPreview, BaziMainchainPreviewOptions } from '../shared/bazi-mainchain';

/** Structural equivalent of Pick<StudioAPI, 'previewBaziMainchain'>. */
export interface BaziMainchainPreviewAPI {
  previewBaziMainchain(profile: BirthProfile, options?: BaziMainchainPreviewOptions): Promise<BaziMainchainPreview>;
}

export interface BaziMainchainPreviewState {
  readonly phase: 'idle' | 'loading' | 'ready' | 'error';
  readonly result: BaziMainchainPreview | null;
  readonly error: string;
  readonly proposal: boolean;
  readonly stale: boolean;
  readonly notice: string;
  /** Changes only when an explicit run produces an accepted result or error. */
  readonly focusSerial: number;
}

export interface BaziMainchainPreviewController {
  getSnapshot(): BaziMainchainPreviewState;
  subscribe(listener: () => void): () => void;
  setContext(profile: BirthProfile | null): void;
  setProposal(proposal: boolean): void;
  run(): Promise<void>;
  retry(): Promise<void>;
  /** Reopens a disposed controller without reviving earlier requests. */
  activate(): void;
  dispose(): void;
}

export interface BaziMainchainPreviewControllerOptions {
  isDisabled?: () => boolean;
}

/** Key order does not matter, but every supplied field (including parents) does. */
function signature(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(signature).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${signature((value as Record<string, unknown>)[key])}`).join(',')}}`;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return '主链预览失败，请重试。';
}

/**
 * A local preview draft: no constructor, context, option, or lifecycle action
 * calls the API. Each explicit run receives its own deep copy of the profile.
 */
export function createBaziMainchainPreviewController(
  api: BaziMainchainPreviewAPI,
  options: BaziMainchainPreviewControllerOptions = {},
): BaziMainchainPreviewController {
  let profile: BirthProfile | null = null;
  let profileSignature = signature(null);
  let requestSerial = 0;
  let disposed = false;
  const listeners = new Set<() => void>();
  let state: BaziMainchainPreviewState = Object.freeze({
    phase: 'idle', result: null, error: '', proposal: false,
    stale: false, notice: '', focusSerial: 0,
  });

  function publish(next: BaziMainchainPreviewState): void {
    state = Object.freeze(next);
    for (const listener of [...listeners]) listener();
  }

  function setContext(nextProfile: BirthProfile | null): void {
    if (disposed) return;
    const copiedProfile = nextProfile === null ? null : structuredClone(nextProfile);
    const nextSignature = signature(copiedProfile);
    if (nextSignature === profileSignature) return;
    profile = copiedProfile;
    profileSignature = nextSignature;
    requestSerial++;
    publish({
      ...state, phase: 'idle', result: null, error: '', stale: false,
      notice: copiedProfile ? '资料已更新，请运行预览。' : '',
    });
  }

  function setProposal(proposal: boolean): void {
    if (disposed || proposal === state.proposal) return;
    requestSerial++;
    publish({
      ...state, proposal, stale: state.result !== null,
      phase: state.error ? 'error' : state.result ? 'ready' : 'idle',
      notice: state.result
        ? '选项已更改；现有结果已过期，请重新运行预览。'
        : '选项已更改，请运行预览。',
    });
  }

  async function run(): Promise<void> {
    if (disposed) return;
    if (options.isDisabled?.()) {
      publish({ ...state, notice: '当前有其他操作进行中，请稍后运行预览。' });
      return;
    }
    const serial = ++requestSerial;
    if (!profile) {
      publish({
        ...state, phase: 'error', result: null, stale: false,
        error: '请先选择或填写出生资料。', notice: '', focusSerial: state.focusSerial + 1,
      });
      return;
    }

    const submittedProfile = structuredClone(profile);
    const submittedId = profile.id;
    const submittedSignature = profileSignature;
    const submittedProposal = state.proposal;
    const isCurrent = () => !disposed && serial === requestSerial
      && submittedSignature === profileSignature && submittedProposal === state.proposal;
    publish({
      ...state, phase: 'loading', error: '', stale: state.result !== null,
      notice: '正在使用当前资料生成预览。',
    });

    try {
      const result = await api.previewBaziMainchain(submittedProfile, { fromOutputMonthStem: submittedProposal });
      if (!isCurrent()) return;
      if (result.profileId !== submittedId) throw new Error('预览返回的资料标识不匹配，请重试。');
      const expectedPolicy = submittedProposal ? 'month-stem-proposal' : 'month-branch-only';
      if (result.method?.entryPolicy !== expectedPolicy) throw new Error('预览返回的入口策略与本次选项不匹配，请重试。');
      publish({
        ...state, phase: 'ready', result: structuredClone(result), error: '',
        stale: false, notice: '', focusSerial: state.focusSerial + 1,
      });
    } catch (error) {
      if (!isCurrent()) return;
      publish({
        ...state, phase: 'error', error: errorMessage(error), stale: state.result !== null,
        notice: state.result ? '现有结果已过期；重试将使用当前资料和选项。' : '重试将使用当前资料和选项。',
        focusSerial: state.focusSerial + 1,
      });
    }
  }

  return {
    getSnapshot: () => state,
    // A new React subscription may precede activate() during StrictMode setup.
    subscribe: listener => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    setContext,
    setProposal,
    run,
    retry: run,
    activate: () => {
      if (!disposed) return;
      requestSerial++;
      disposed = false;
    },
    dispose: () => {
      requestSerial++;
      disposed = true;
      listeners.clear();
      if (state.phase === 'loading') {
        state = Object.freeze({
          ...state, phase: state.result ? 'ready' : 'idle', stale: state.result !== null,
          notice: state.result ? '现有结果已过期，请重新运行预览。' : '',
        });
      }
    },
  };
}
