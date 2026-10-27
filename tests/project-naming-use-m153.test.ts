import {afterEach, describe, expect, it, vi} from 'vitest';
import {lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync} from 'node:fs';
import {basename, dirname, join, resolve} from 'node:path';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {reportHTML} from '../src/main/report';
import {normalizePreferences} from '../src/shared/workflow';
import type {Analysis, BirthProfile, NameCandidate, NamingPreferences, NamingSession} from '../src/shared/types';
import fixture from './fixtures/project-naming-use-m153.json';

// This suite uses the repository's real data package, Store and Service. It does
// not import a private engine bundle or replace any production implementation.
const dataDir = resolve('data');
const wasm = resolve('node_modules/sql.js/dist/sql-wasm.wasm');
const localRoot = resolve('.local');
const directoryPrefix = 'project-naming-use-m153-';
const ownedDirectories = new Map<string, string>();
const openStores = new Set<Store>();
const fakeKey = 'm153-fake-key-not-a-credential';
const localEndpoint = 'http://127.0.0.1:15301/v1';

type MethodSelection = {
  methodId: 'project-bazi-mainchain-145/1.3.1';
  entryPolicy: 'month-branch-only';
};
type MethodPreferences = NamingPreferences & {namingElementMethod?: MethodSelection};
type ProjectNamingUse = {
  schema: 'project-naming-use/1';
  selection: MethodSelection;
  engineCertificate: {methodId: string; [key: string]: unknown};
  application: {
    policyId: string;
    status: 'applied';
    effectiveElements: string[];
    [key: string]: unknown;
  };
};
type ProjectAnalysis = Analysis & {projectNamingUse?: ProjectNamingUse};
type Context = {directory: string; store: Store; service: StudioService};
type AiRequest = {messages: Array<{role: string; content: string}>};

const selection = (): MethodSelection => ({
  methodId: fixture.methodId as MethodSelection['methodId'],
  entryPolicy: 'month-branch-only',
});
const positiveProfile = () => structuredClone(fixture.positive.profile) as BirthProfile;
const negativeProfile = () => structuredClone(fixture.negative.profile) as BirthProfile;
const legacyPreferences = () => normalizePreferences({
  length: 1,
  requiredChars: fixture.positive.givenName,
  preferredElements: [],
  numerology: false,
  zodiacRules: false,
});
function projectPreferences(): MethodPreferences {
  // A local structural extension lets this acceptance test compile before the
  // production shared type gains the new selection field.
  return {...legacyPreferences(), namingElementMethod: selection()};
}

async function open(key = '', existingDirectory?: string): Promise<Context> {
  let directory = existingDirectory;
  if (directory === undefined) {
    mkdirSync(localRoot, {recursive: true});
    const root = realpathSync(localRoot);
    directory = mkdtempSync(join(root, directoryPrefix));
    ownedDirectories.set(directory, root);
  } else if (!ownedDirectories.has(directory)) {
    throw new Error('Refusing to open a directory not owned by this test.');
  }
  const store = await new Store(directory, dataDir, wasm).init();
  openStores.add(store);
  const service = new StudioService(store, {read: () => key, write: () => {}}, false);
  return {directory, store, service};
}
function close(store: Store) {
  store.db.close();
  openStores.delete(store);
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  for (const store of [...openStores]) close(store);
  for (const [directory, root] of ownedDirectories) {
    const absolute = resolve(directory);
    const stat = lstatSync(absolute);
    if (dirname(absolute) !== root || !basename(absolute).startsWith(directoryPrefix)
      || stat.isSymbolicLink() || !stat.isDirectory() || realpathSync(absolute) !== absolute) {
      throw new Error('Refusing to remove an unverified test directory: ' + absolute);
    }
    rmSync(absolute, {recursive: true, force: false});
    ownedDirectories.delete(directory);
  }
});

const disk = (store: Store) => readFileSync(join(store.userDir, 'customers.sqlite'));
function current(store: Store, id: string): NamingSession {
  const session = store.rows<NamingSession>('sessions').find(row => row.id === id);
  expect(session, 'the real saved session must remain readable').toBeDefined();
  return session!;
}
function candidate(session: NamingSession, origin?: NameCandidate['origin']): NameCandidate {
  const value = session.candidates.find(row => row.givenName === fixture.positive.givenName
    && (origin === undefined || row.origin === origin));
  expect(value, 'the required name must survive real generation').toBeDefined();
  return value!;
}
function projectUse(session: NamingSession): ProjectNamingUse {
  const value = (session.analysis as ProjectAnalysis).projectNamingUse;
  expect(value, 'a selected method must have a persisted application certificate').toBeDefined();
  return value!;
}
function assertProject(session: NamingSession, origin?: NameCandidate['origin']) {
  expect(candidate(session, origin).evaluation.traditional).toBe(fixture.positive.expectedTraditional);
  expect((session.preferences as MethodPreferences).namingElementMethod).toEqual(selection());
  expect((session.profile.namingPreferences as MethodPreferences | undefined)?.namingElementMethod).toEqual(selection());
  expect(session.preferences.preferredElements).toEqual([]);
  expect(session.originalFavorable).toEqual(fixture.positive.legacyElements);
  expect(session.analysis.bazi.favorable).toEqual(fixture.positive.legacyElements);
  const use = projectUse(session);
  expect(use.schema).toBe('project-naming-use/1');
  expect(use.selection).toEqual(selection());
  expect(use.application.status).toBe('applied');
  expect(use.application.policyId).toBe('naming-element-application/1.0.0');
  expect(use.application.effectiveElements).toEqual(fixture.positive.expectedElements);
  expect(use.engineCertificate.methodId).toBe(fixture.methodId);
  return use;
}
function withoutReviewToken(session: NamingSession) {
  const value = structuredClone(session);
  delete value.reviewToken;
  return value;
}
function reportTemplate(session: NamingSession, store: Store): string {
  // reportHTML verifies the report template only; this test does not launch
  // Electron or render a PDF file.
  const html = reportHTML(session, store.settings());
  expect(html).toMatch(/<!doctype html>/i);
  expect(html).toContain(candidate(session).fullName);
  return html;
}
function assertProjectReport(session: NamingSession, store: Store) {
  const html = reportTemplate(session, store);
  const clauses = html
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\b[^>]*>|<\/(?:p|div|li|tr|h[1-6]|section|header|footer)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .split(/[\n;；]/)
    .map(value => value.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const exactGroup = (value: string, expected: string[]) =>
    [...value.matchAll(/[木火土金水](?:[\s、,，/·]+[木火土金水])*/g)]
      .some(match => match[0].replace(/[\s、,，/·]/g, '') === expected.join(''));
  // Assert semantic labels and exact groups, not a whole Chinese sentence or a
  // prescribed layout. 土、金、水 must not accidentally satisfy 土、金.
  const applied = clauses.filter(value => /采用|应用|applied|effective/i.test(value)
    && exactGroup(value, fixture.positive.expectedElements));
  const base = clauses.filter(value => /基础|原始|原八字|系统喜用|旧|original|base/i.test(value)
    && exactGroup(value, fixture.positive.legacyElements));
  expect(applied.length, 'the report must identify the applied 土、金 group').toBeGreaterThan(0);
  expect(base.length, 'the report must separately retain the base 土、金、水 group').toBeGreaterThan(0);
  expect(applied.some(a => base.some(b => a !== b)), 'base and applied groups need distinct labelled report entries').toBe(true);
}
function enableAi(context: Context) {
  context.service.saveAiSettings({
    ...context.service.bootstrap().settings,
    useAi: true,
    apiBaseUrl: localEndpoint,
    model: 'm153-in-process-response-only',
    timeoutMs: 5000,
  }, fakeKey);
}
function stubAi() {
  const requests: AiRequest[] = [];
  // All fetch calls terminate here. The fake key and loopback URL are never
  // used for a real network request, including the negative acceptance case.
  const fetchMock = vi.fn(async (url: unknown, options?: RequestInit) => {
    expect(new URL(String(url)).origin).toBe('http://127.0.0.1:15301');
    requests.push(JSON.parse(String(options?.body)) as AiRequest);
    return new Response(JSON.stringify({
      choices: [{message: {content: JSON.stringify({
        candidates: [{
          givenName: fixture.positive.givenName,
          citationIds: [],
          themes: [],
          themeIds: [],
        }],
      })}}],
    }), {status: 200, headers: {'Content-Type': 'application/json'}});
  });
  vi.stubGlobal('fetch', fetchMock);
  return {requests, fetchMock};
}

describe('M153 portable project naming-use generation acceptance', {timeout: 60_000}, () => {
  it('keeps the unselected legacy score at 100 through real save, reopen, history and report template', async () => {
    let context = await open();
    const session = (await context.service.generate(positiveProfile(), legacyPreferences())).session;
    expect(candidate(session, 'local').evaluation.traditional).toBe(fixture.positive.legacyTraditional);
    expect(session.analysis.bazi.favorable).toEqual(fixture.positive.legacyElements);
    expect(session.originalFavorable).toEqual(fixture.positive.legacyElements);
    expect(session.preferences).not.toHaveProperty('namingElementMethod');
    expect(session.analysis).not.toHaveProperty('projectNamingUse');
    const saved = context.service.saveSession({...structuredClone(session), reviewNote: 'M153 legacy save/reopen control'});
    const persisted = current(context.store, saved.id);
    close(context.store);
    context = await open('', context.directory);
    const reopened = current(context.store, saved.id);
    expect(reopened).toEqual(persisted);
    expect(candidate(reopened).evaluation.traditional).toBe(fixture.positive.legacyTraditional);
    const history = context.service.listHistory(saved.id);
    expect(history).toHaveLength(1);
    expect(candidate(history[0].session).evaluation.traditional).toBe(fixture.positive.legacyTraditional);
    reportTemplate(reopened, context.store);
    reportTemplate(history[0].session, context.store);
    const restored = context.service.restoreHistory(saved.id, history[0].id, reopened.reviewRevision, reopened.reviewToken);
    expect(restored.reviewNote).toBe(session.reviewNote);
    expect(candidate(restored).evaluation.traditional).toBe(fixture.positive.legacyTraditional);
    expect(restored.analysis).not.toHaveProperty('projectNamingUse');
    reportTemplate(restored, context.store);
  });

  it('applies 土、金 locally with score 40 and preserves its certificate through persistence, history and backup restore', async () => {
    let context = await open();
    const base = context.service.analyze(positiveProfile());
    const session = (await context.service.generate(positiveProfile(), projectPreferences())).session;
    const initialUse = structuredClone(assertProject(session, 'local'));
    expect(session.analysis.bazi).toEqual(base.bazi);
    expect(session.analysis.qimen).toEqual(base.qimen);
    const saved = context.service.saveSession(structuredClone(session));
    const persisted = current(context.store, saved.id);
    close(context.store);
    context = await open('', context.directory);
    const reopened = current(context.store, saved.id);
    expect(reopened).toEqual(persisted);
    expect(assertProject(reopened)).toEqual(initialUse);
    assertProjectReport(reopened, context.store);

    const editedInput = structuredClone(reopened);
    editedInput.reviewNote = 'M153 real history revision';
    candidate(editedInput).reviewNote = 'M153 candidate review note';
    const edited = context.service.saveSession(editedInput);
    const history = context.service.listHistory(edited.id);
    expect(history).toHaveLength(1);
    expect(history[0].session.reviewNote).toBe(reopened.reviewNote);
    expect(assertProject(history[0].session)).toEqual(initialUse);
    const restored = context.service.restoreHistory(edited.id, history[0].id, edited.reviewRevision, edited.reviewToken);
    expect(restored.reviewNote).toBe(reopened.reviewNote);
    expect(candidate(restored).reviewNote).toBe(candidate(reopened).reviewNote);
    expect(assertProject(restored)).toEqual(initialUse);
    for (const revision of context.service.listHistory(restored.id)) {
      expect(assertProject(revision.session)).toEqual(initialUse);
      assertProjectReport(revision.session, context.store);
    }

    const archive = context.store.backupBytes();
    const destination = await open();
    destination.store.restore(archive);
    const imported = current(destination.store, restored.id);
    expect(assertProject(imported)).toEqual(initialUse);
    // A backup restore may rotate only this session's review token; no
    // certificate, score, revision, source snapshot or birth fact is ignored.
    expect(withoutReviewToken(imported)).toEqual(withoutReviewToken(restored));
    expect(imported.reviewToken).not.toBe(restored.reviewToken);
    assertProjectReport(imported, destination.store);
  });

  it('uses the same project certificate and score 40 for the real AI path with an in-process Response', async () => {
    const local = await open();
    const localSession = (await local.service.generate(positiveProfile(), projectPreferences())).session;
    const context = await open(fakeKey);
    const {requests, fetchMock} = stubAi();
    enableAi(context);
    const session = (await context.service.generate(positiveProfile(), projectPreferences())).session;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const aiCandidate = candidate(session, 'ai');
    expect(aiCandidate.evaluation.traditional).toBe(fixture.positive.expectedTraditional);
    const use = assertProject(session, 'ai');
    expect(use).toEqual(assertProject(localSession, 'local'));
    expect(use.engineCertificate).toEqual(projectUse(localSession).engineCertificate);
    const userMessage = requests[0].messages.find(message => message.role === 'user');
    expect(userMessage).toBeDefined();
    const input = JSON.parse(userMessage!.content) as {favorableElements: string[]};
    expect(input.favorableElements).toEqual(fixture.positive.expectedElements);
    // The mock contains only a name, citation IDs and empty theme lists.
    // Meaning and reasons must come from the actual local evaluation path.
    expect(aiCandidate.meaning).toBe(candidate(localSession).meaning);
    expect(aiCandidate.originalMeaning).toBe(candidate(localSession).originalMeaning);
    expect(aiCandidate.citations).toEqual([]);
    expect(assertProject(current(context.store, session.id), 'ai')).toEqual(use);
    assertProjectReport(session, context.store);
  });

  it('rejects the complete but conditional birth before AI or any profile/session write and retains the selected method', async () => {
    const context = await open(fakeKey);
    const {fetchMock} = stubAi();
    enableAi(context);
    const profile = negativeProfile();
    expect(profile.timeUnknown).toBe(false);
    expect(profile.birthDate).toBe('2022-02-24');
    expect(profile.birthTime.length).toBeGreaterThan(0);
    const preferences = projectPreferences();
    expect(preferences.namingElementMethod).toEqual(selection());
    const before = disk(context.store);
    let failure: unknown;
    try {
      await context.service.generate(profile, preferences);
    } catch (error) {
      failure = error;
    }
    // Never assert against or print a whole resolved session when a missing
    // gate incorrectly allows generation. Each side effect stays observable.
    expect.soft(failure instanceof Error, 'a conditional project result must reject generate with an Error').toBe(true);
    expect.soft(fetchMock.mock.calls.length, 'the project gate must run before fetch').toBe(0);
    expect.soft(disk(context.store).equals(before), 'failed generation must leave database bytes unchanged').toBe(true);
    expect.soft(context.store.rows<BirthProfile>('profiles').length).toBe(0);
    expect.soft(context.store.rows<NamingSession>('sessions').length).toBe(0);
    expect.soft(preferences.namingElementMethod).toEqual(selection());
    const validated = context.service.validatePreferences(preferences) as MethodPreferences;
    expect.soft(validated.namingElementMethod, 'validation must retain the selected method instead of silently using legacy').toEqual(selection());
  });
});