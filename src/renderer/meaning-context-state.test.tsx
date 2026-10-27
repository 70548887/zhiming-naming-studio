import {afterEach, describe, expect, it, vi} from 'vitest';
import type {NameCandidate, NamingSession} from '../shared/types';
import type {MeaningContextAPI, MeaningContextOptions, SavedMeaningContextReview} from '../shared/meaning-context-review';
import {REVIEW_CONFLICT_MESSAGE} from '../shared/review-version';
import {createMeaningContextController, meaningContextCanWrite, meaningOptionKey} from './meaning-context-state';

const tokenFor = (revision: number) => `00000000-0000-4000-8000-${String(revision).padStart(12, '0')}`;
const controllers: ReturnType<typeof createMeaningContextController>[] = [];
afterEach(() => { for (const controller of controllers.splice(0)) controller.dispose(); });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(accept => { resolve = accept; });
  return {promise, resolve};
}

/** Contract-only DTOs: this unit fixture neither calculates lexical meanings nor authenticates a knowledge pack. */
function fixture() {
  let revision = 5;
  let token = tokenFor(revision);
  let nextRead: (() => MeaningContextOptions | Promise<MeaningContextOptions>) | undefined;
  let savedReview: SavedMeaningContextReview | undefined;
  const confirmed = new Set<number>();
  const readings = [
    {position: 0, char: '青', pinyin: 'qīng', tone: 1},
    {position: 1, char: '云', pinyin: 'yún', tone: 2},
  ];
  const candidate: NameCandidate = {
    id: 'candidate-test', givenName: '青云', fullName: '林青云', pinyin: 'lín qīng yún',
    style: 'test', meaning: '保存的原解释', originalMeaning: '保存的原解释', reason: '测试',
    traditionalReason: '测试', citations: [], warnings: [], favorite: false, origin: 'local', reviewNote: '',
    characters: readings.map(row => ({
      char: row.char, pinyin: row.pinyin, tone: row.tone, meaning: '测试字条', traditional: row.char,
      strokes: null, elements: [], elementBasis: '测试夹具，不推定属性', tags: [], warning: '', sourceId: 'moe-revised', readings: [],
    })),
    evaluation: {sound: 50, meaning: 50, simplicity: 50, traditional: 50, distinctiveness: 50},
  };
  const options = (): MeaningContextOptions => ({
    version: 'meaning-context-options/1.0.0', productionApproved: false,
    sessionId: 'session-test', candidateId: candidate.id, reviewRevision: revision, reviewToken: token,
    status: 'available', currentReadings: readings.map(row => ({...row, confirmed: confirmed.has(row.position)})),
    options: [{
      position: 0, char: '青', givenName: '青云', caseId: 'case-test', senseId: 'sense-test', contextKey: 'context-test',
      contextLabel: '测试场景', dictionaryOriginal: '测试原文', adopted: false,
      reference: {word: '青雲', pinyin: 'qīng yún', sourceId: 'moe-revised', originalFile: 'fixture.json',
        originalSha256: 'a'.repeat(64), rawEntryIndex: 0, rawHeteronymIndex: 0, rawDefinitionIndex: 0, license: 'test-fixture'},
      grammar: {text: '测试用完整词说明'}, reason: '只测状态转换', exclusions: [],
    }],
    ...(savedReview ? {savedReview: structuredClone(savedReview)} : {}), notice: '状态机测试夹具',
  });
  const canonicalSession = (): NamingSession => ({
    id: 'session-test', profileId: 'profile-test', createdAt: '2026-01-01T00:00:00.000Z',
    profile: {id: 'profile-test', customerName: 'test', surname: '林', surnamePinyin: 'lín', gender: '中性',
      calendar: 'solar', birthDate: '2026-01-01', leapMonth: false, birthTime: '', timeUnknown: true,
      birthPlace: '', timezone: 'Asia/Shanghai', notes: ''},
    preferences: {length: 2, generationChar: '', requiredChars: '', forbiddenChars: '', elderTaboo: '', style: '',
      meanings: '', industry: '', priority: 'balanced', preferredElements: [], zodiacRules: false, numerology: false},
    analysis: {
      bazi: {solarDate: '', lunarDate: '', zodiac: '', pillars: [], elements: {金: 0, 木: 0, 水: 0, 火: 0, 土: 0},
        favorable: [], unfavorable: [], strength: '', reasons: [], seasonalAdvice: '', warnings: [], version: 'test', ruleDescription: ''},
      qimen: {available: false, reason: 'unit fixture', dun: '', ju: 0, yuan: '', solarTerm: '', xun: '', chiefStar: '',
        chiefDoor: '', palaces: [], reasons: [], warnings: [], version: 'test'},
    },
    candidates: [{...structuredClone(candidate), ...(savedReview ? {meaningContextReview: structuredClone(savedReview)} : {})}],
    reviewNote: '', originalFavorable: [], dataVersion: 'a'.repeat(12), reviewRevision: revision, reviewToken: token,
  });
  const api: MeaningContextAPI = {
    getMeaningContextOptions: vi.fn<MeaningContextAPI['getMeaningContextOptions']>(async () =>
      structuredClone(await (nextRead ? nextRead() : options()))),
    updateMeaningContext: vi.fn<MeaningContextAPI['updateMeaningContext']>(async (_session, _candidate, intent, expected, expectedToken) => {
      if (expected !== revision || expectedToken !== token) throw new Error(REVIEW_CONFLICT_MESSAGE);
      if (intent.action !== 'confirm-current-readings') throw new Error('This fixture only accepts reading confirmations.');
      for (const position of intent.positions) confirmed.add(position);
      savedReview = {
        version: 'meaning-context-review/1.0.0', productionApproved: false,
        sessionId: 'session-test', candidateId: candidate.id, givenName: candidate.givenName, fullName: candidate.fullName,
        packSha256: 'a'.repeat(64), activeVersion: 'a'.repeat(12), namingRulesVersion: 'naming-editorial-7.0.0',
        binding: {characters: candidate.characters.map((row, position) => ({
          position, char: row.char, pinyin: row.pinyin, tone: row.tone, sourceId: row.sourceId, meaning: row.meaning,
          readings: [], characterSha256: 'b'.repeat(64),
        }))},
        source: {sourceId: 'project-meaning-context-next-137', sourceSha256: 'c'.repeat(64), dataSha256: 'd'.repeat(64),
          sourceLockSha256: 'e'.repeat(64), dataManifestSha256: 'f'.repeat(64)},
        sourceSnapshot: {version: 'session-sources/1.0.0', dataVersion: 'a'.repeat(12), sources: []},
        confirmedReadings: readings.filter(row => confirmed.has(row.position)).map(row => ({...row, confirmed: true})),
        selections: [], rows: readings.map(row => ({position: row.position, char: row.char,
          result: {status: 'needs-confirmed-reading', reason: 'No lexical choice is made by this fixture.'}})),
        automaticSemanticCreditAllowed: false, independentCharacterMeaningApproved: false, wholeNameApproved: false, scoreDelta: 0,
      };
      revision++; token = tokenFor(revision);
      return canonicalSession();
    }),
  };
  const createController = (identity: {sessionId: string; candidateId: string} = {sessionId: 'session-test', candidateId: candidate.id}) => {
    const value = createMeaningContextController({...identity, givenName: '青云', fullName: '林青云', getApi: () => api});
    controllers.push(value);
    return value;
  };
  return {api, options, canonicalSession, createController,
    advance: () => { revision++; token = tokenFor(revision); },
    holdRead: (value: Promise<MeaningContextOptions>) => { nextRead = () => value; },
  };
}

async function prepared() {
  const f = fixture(), controller = f.createController();
  await controller.load();
  const parent = f.options();
  controller.markExternalRevision(parent.reviewRevision, parent.reviewToken);
  controller.setReading(0, true);
  controller.setChoice(0, meaningOptionKey(parent.options[0]));
  return {...f, controller};
}

async function explicitlyReloaded() {
  const f = await prepared(), oldParent = f.options();
  f.advance();
  await f.controller.load({preserveDraft: true, userInitiated: true});
  f.controller.markExternalRevision(oldParent.reviewRevision, oldParent.reviewToken);
  return {...f, oldParent};
}

describe('meaning context explicit reload parent CAS boundary', () => {
  it('accepts only the exact old parent pair observed at explicit reload and preserves both drafts', async () => {
    const f = await explicitlyReloaded(), state = f.controller.getSnapshot();
    expect(state.needsRefresh).toBe(false);
    expect(state.options?.reviewRevision).toBe(f.oldParent.reviewRevision + 1);
    expect(state.draftPositions).toEqual([0]);
    expect(state.draftChoices[0]).toBe(meaningOptionKey(f.oldParent.options[0]));
    expect(meaningContextCanWrite(state)).toBe(true);
  });

  it('invalidates a lower revision with a new token after a backup restore', async () => {
    const f = await explicitlyReloaded();
    f.controller.markExternalRevision(1, tokenFor(99));
    expect(f.controller.getSnapshot().needsRefresh).toBe(true);
    expect(meaningContextCanWrite(f.controller.getSnapshot())).toBe(false);
    expect(f.controller.getSnapshot().draftPositions).toEqual([0]);
    expect(f.controller.getSnapshot().draftChoices[0]).toBe(meaningOptionKey(f.oldParent.options[0]));
  });

  it('invalidates the same revision with a new token and a genuinely newer parent revision', async () => {
    for (const change of ['token-only', 'newer-revision']) {
      const f = await explicitlyReloaded(), current = f.controller.getSnapshot().options!;
      f.controller.markExternalRevision(current.reviewRevision + (change === 'newer-revision' ? 1 : 0), tokenFor(88));
      expect(f.controller.getSnapshot().needsRefresh).toBe(true);
      expect(meaningContextCanWrite(f.controller.getSnapshot())).toBe(false);
    }
  });

  it('does not create a lower-parent exemption for an initial non-user read', async () => {
    const f = fixture(), oldParent = f.options(), controller = f.createController();
    f.advance();
    controller.markExternalRevision(oldParent.reviewRevision, oldParent.reviewToken);
    await controller.load();
    controller.markExternalRevision(oldParent.reviewRevision, oldParent.reviewToken);
    expect(controller.getSnapshot().needsRefresh).toBe(true);
    expect(meaningContextCanWrite(controller.getSnapshot())).toBe(false);
  });

  it('rejects the reload exemption if the parent changes again while the read is pending', async () => {
    const f = await prepared(), oldParent = f.options(), pending = deferred<MeaningContextOptions>();
    const drafts = structuredClone({positions: f.controller.getSnapshot().draftPositions, choices: f.controller.getSnapshot().draftChoices});
    f.holdRead(pending.promise);
    const loading = f.controller.load({preserveDraft: true, userInitiated: true});
    f.advance();
    const returned = f.options(), newerRevision = returned.reviewRevision + 1;
    f.controller.markExternalRevision(newerRevision, tokenFor(77));
    pending.resolve(returned);
    await loading;
    f.controller.markExternalRevision(newerRevision, tokenFor(77));
    expect(f.controller.getSnapshot().needsRefresh).toBe(true);
    expect(meaningContextCanWrite(f.controller.getSnapshot())).toBe(false);
    expect({positions: f.controller.getSnapshot().draftPositions, choices: f.controller.getSnapshot().draftChoices}).toEqual(drafts);
    expect(f.api.getMeaningContextOptions).toHaveBeenCalledTimes(2);
    expect(oldParent.reviewRevision).toBeLessThan(newerRevision);
  });

  it('rejects both revision ABA and same-revision token ABA while an explicit read is pending', async () => {
    for (const change of ['revision-ABA', 'token-ABA']) {
      const f = await prepared(), original = f.options(), pending = deferred<MeaningContextOptions>();
      const drafts = structuredClone({positions: f.controller.getSnapshot().draftPositions, choices: f.controller.getSnapshot().draftChoices});
      f.holdRead(pending.promise);
      const loading = f.controller.load({preserveDraft: true, userInitiated: true});
      f.controller.markExternalRevision(original.reviewRevision + (change === 'revision-ABA' ? 2 : 0), tokenFor(77));
      f.controller.markExternalRevision(original.reviewRevision, original.reviewToken);
      f.advance();
      pending.resolve(f.options());
      await loading;
      f.controller.markExternalRevision(original.reviewRevision, original.reviewToken);
      expect(f.controller.getSnapshot().needsRefresh, change).toBe(true);
      expect(meaningContextCanWrite(f.controller.getSnapshot()), change).toBe(false);
      expect({positions: f.controller.getSnapshot().draftPositions, choices: f.controller.getSnapshot().draftChoices}).toEqual(drafts);
      expect(f.api.updateMeaningContext).not.toHaveBeenCalled();
    }
  });

  it('does not count repeated identical parent notifications during reload as changes', async () => {
    const f = await prepared(), original = f.options(), pending = deferred<MeaningContextOptions>();
    f.holdRead(pending.promise);
    const loading = f.controller.load({preserveDraft: true, userInitiated: true});
    for (let index = 0; index < 8; index++) f.controller.markExternalRevision(original.reviewRevision, original.reviewToken);
    f.advance();
    pending.resolve(f.options());
    await loading;
    f.controller.markExternalRevision(original.reviewRevision, original.reviewToken);
    expect(f.controller.getSnapshot().needsRefresh).toBe(false);
    expect(meaningContextCanWrite(f.controller.getSnapshot())).toBe(true);
    expect(f.controller.getSnapshot().draftPositions).toEqual([0]);
    expect(f.controller.getSnapshot().draftChoices[0]).toBe(meaningOptionKey(original.options[0]));
    expect(f.api.getMeaningContextOptions).toHaveBeenCalledTimes(2);
    expect(f.api.updateMeaningContext).not.toHaveBeenCalled();
  });

  it('does not poll, write, or discard drafts after repeated notifications of the accepted old pair', async () => {
    const f = await explicitlyReloaded();
    for (let index = 0; index < 8; index++) f.controller.markExternalRevision(f.oldParent.reviewRevision, f.oldParent.reviewToken);
    expect(f.api.getMeaningContextOptions).toHaveBeenCalledTimes(2);
    expect(f.api.updateMeaningContext).not.toHaveBeenCalled();
    expect(f.controller.getSnapshot().needsRefresh).toBe(false);
    expect(f.controller.getSnapshot().draftPositions).toEqual([0]);
    expect(f.controller.getSnapshot().draftChoices[0]).toBe(meaningOptionKey(f.oldParent.options[0]));
  });

  it('never lends options or a reload exemption to another session or candidate', async () => {
    const f = await explicitlyReloaded();
    for (const identity of [{sessionId: 'other-session', candidateId: 'candidate-test'}, {sessionId: 'session-test', candidateId: 'other-candidate'}]) {
      const controller = f.createController(identity);
      await controller.load();
      expect(controller.getSnapshot().phase).toBe('load-error');
      expect(meaningContextCanWrite(controller.getSnapshot())).toBe(false);
      expect(controller.getSnapshot().options).toBeUndefined();
    }
    expect(f.api.updateMeaningContext).not.toHaveBeenCalled();
  });

  it('keeps its own canonical save ready after explicit reload without losing the pending meaning choice', async () => {
    const f = await explicitlyReloaded();
    expect(await f.controller.confirmReadings()).toBe(true);
    const saved = f.canonicalSession();
    f.controller.markExternalRevision(saved.reviewRevision, saved.reviewToken);
    const state = f.controller.getSnapshot();
    expect(state.needsRefresh).toBe(false);
    expect(state.error).toBeUndefined();
    expect(state.draftPositions).toEqual([0]);
    expect(state.draftChoices[0]).toBe(meaningOptionKey(f.oldParent.options[0]));
    expect(meaningContextCanWrite(state)).toBe(true);
    expect(f.api.updateMeaningContext).toHaveBeenCalledExactlyOnceWith('session-test', 'candidate-test',
      {action: 'confirm-current-readings', positions: [0]}, f.oldParent.reviewRevision + 1, tokenFor(f.oldParent.reviewRevision + 1));
    expect(f.api.getMeaningContextOptions).toHaveBeenCalledTimes(2);
  });
});
