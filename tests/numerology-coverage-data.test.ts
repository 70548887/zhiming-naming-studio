import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import type { NumerologyStrokeData } from '../src/domain/numerology';

const filename = resolve('data/numerology-strokes.json');
const lockFilename = resolve('data/numerology-source-lock.json');
const current = JSON.parse(readFileSync(filename, 'utf8')) as NumerologyStrokeData;
const lock = JSON.parse(readFileSync(lockFilename, 'utf8'));
const old = JSON.parse(readFileSync(resolve('data/numerology-history/kangxi-20261018-v1/numerology-strokes.json'), 'utf8')) as NumerologyStrokeData;
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

describe('Kangxi v2 coverage from unchanged fixed originals', () => {
  it('adds onlythreefixedCSVrecords while preservingall2252oldcandidatefieldsandsourceidentity', () => {
    expect(current.version).toBe('kangxi-radical-candidates-2026.10.19-v2');
    expect(old.version).toBe('kangxi-radical-candidates-2026.10.18-v1');
    expect(old.records).toHaveLength(2252); expect(current.records).toHaveLength(2255); expect(current.sources).toEqual(old.sources);
    const records = new Map(current.records.map(record => [record.id, record]));
    for (const record of old.records) expect(records.get(record.id), record.id).toEqual(record);
    const oldIds = new Set(old.records.map(record => record.id));
    expect(current.records.filter(record => !oldIds.has(record.id)).map(record => record.id)).toEqual(['kr-5347-5347-4', 'kr-539a-539a-9', 'kr-81ea-81ea-6']);
    expect(current.records.every(record => !('selectedRecordId' in record))).toBe(true);
  });

  it('attributes厚9自6升4totheCSVlinesandneverusesanunlabelledelectroniccount', () => {
    const csv = readFileSync(resolve('data/raw/numerology-breezy-kangxi-strokecount.csv'), 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
    const original = JSON.parse(gunzipSync(readFileSync(resolve('data/raw/numerology-shunshi-kangxi-text.json.gz'))).toString('utf8'));
    const examples = [
      { char: '升', count: 4, line: 1350, row: 'U+5347,21319,升,4' },
      { char: '厚', count: 9, line: 1432, row: 'U+539A,21402,厚,9' },
      { char: '自', count: 6, line: 13182, row: 'U+81EA,33258,自,6' },
    ];
    for (const example of examples) {
      expect(csv[example.line - 1]).toBe(example.row);
      const head = original[example.char].split('\n', 1)[0]; expect(head).toContain(example.char); expect(head).not.toMatch(/康熙筆[画畫]\s*[：:]\s*\d+/);
      const rows = current.records.filter(record => record.character === example.char); expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ glyph: example.char, count: example.count, sourceId: 'breezy-kangxi-radicals' });
      expect(rows[0].sourceLocator).toContain(`csv:L${example.line}`); expect(rows[0].note).toContain('非普通手写笔画');
      expect(rows[0].note).toContain(head);
    }
  });

  it('bindsall779currentnameswhilekeepingallrawsourcehashesandconflictingglyphchoicesunchanged', () => {
    const dataset = JSON.parse(readFileSync(resolve('data/dataset.json'), 'utf8'));
    expect(dataset.characters).toHaveLength(779); expect(lock.build).toMatchObject({ datasetVersion: dataset.version, inputNamingCharacters: 779, coveredNamingCharacters: 779, missingNamingCharacters: [], records: 2255, inputCharacters: 1452, sourceRows: 63696, originalEntries: 17034 });
    for (const character of dataset.characters) expect(current.records.some(record => record.character === character.char), character.char).toBe(true);
    const frozenLock = JSON.parse(readFileSync(resolve('data/numerology-history/kangxi-20261018-v1/numerology-source-lock.json'), 'utf8'));
    expect(lock.artifacts).toEqual(frozenLock.artifacts);
    for (const [file, original] of Object.entries(lock.artifacts) as Array<[string, { sha256: string }]>) expect(sha(readFileSync(resolve('data/raw', file))), file).toBe(original.sha256);
    expect(new Set(current.records.filter(record => record.character === '王' && record.glyph === '王').map(record => record.count))).toEqual(new Set([4, 5]));
    expect(current.records.filter(record => record.character === '强').map(record => `${record.glyph}/${record.count}`)).toEqual(['強/11', '强/12']);
  });

  it('reparsescachedsourcesofflineandprovesoutputandlockbyteswithoutrewritingthem', () => {
    const before = readFileSync(filename), beforeLock = readFileSync(lockFilename);
    const output = execFileSync(process.execPath, ['scripts/build-numerology-data.mjs', '--verify', '--offline'], { cwd: resolve('.'), encoding: 'utf8', timeout: 20000, windowsHide: true });
    expect(JSON.parse(output)).toMatchObject({ mode: 'verified', networkPolicy: 'offline-raw-cache-only', coveredNamingCharacters: 779, namingCharacters: 779, missing: [] });
    expect(readFileSync(filename).equals(before)).toBe(true); expect(readFileSync(lockFilename).equals(beforeLock)).toBe(true);
  });

  it('rejectsamissingcachedsourceinofflinemodebeforecreatingoutputsorusingnetworkfallback', () => {
    const directory = mkdtempSync(join(tmpdir(), 'kangxi-offline-123-'));
    try {
      mkdirSync(join(directory, 'scripts')); mkdirSync(join(directory, 'data/raw'), { recursive: true });
      copyFileSync(resolve('scripts/build-numerology-data.mjs'), join(directory, 'scripts/build-numerology-data.mjs'));
      writeFileSync(join(directory, 'data/numerology-source-lock.json'), JSON.stringify({ version: current.version, artifacts: {} }));
      let errorText = '';
      try { execFileSync(process.execPath, ['scripts/build-numerology-data.mjs', '--offline'], { cwd: directory, encoding: 'utf8', timeout: 5000, windowsHide: true, stdio: 'pipe' }); }
      catch (error) { errorText = String((error as { stderr?: string }).stderr ?? error); }
      expect(errorText).toContain('Missing raw source in offline mode: numerology-breezy-kangxi-strokecount.csv');
      expect(existsSync(join(directory, 'data/numerology-strokes.json'))).toBe(false);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});
