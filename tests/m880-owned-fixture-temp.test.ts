import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {basename,dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {afterEach,expect,it,vi} from 'vitest';
import {createOwnedCorpus} from './helpers/m458-owned-corpus';

const source=fileURLToPath(new URL('./fixtures/m458-owned-corpus',import.meta.url));
afterEach(()=>vi.unstubAllEnvs());

it('accepts the ordinary implicit OS temporary directory, including its actual Windows short-name spelling',()=>{
  vi.stubEnv('RUNNER_TEMP',undefined);
  const provided=tmpdir(),actual=fs.realpathSync.native(provided);
  const original=fs.readFileSync(join(source,'sentinel.txt'));
  const corpus=createOwnedCorpus(source);
  try{
    expect(dirname(corpus.root)).toBe(actual);
    expect(fs.readFileSync(join(corpus.dataDir,'sentinel.txt'))).toEqual(original);
    expect(fs.readFileSync(join(source,'sentinel.txt'))).toEqual(original);
    // Explicit paths are not granted the implicit OS-path canonicalization.
    if(resolve(provided).toLowerCase()!==actual.toLowerCase())expect(()=>createOwnedCorpus(source,provided)).toThrow('actual');
    console.log('M880_OS_TEMP',JSON.stringify({provided,actual,shortNameObserved:resolve(provided).toLowerCase()!==actual.toLowerCase(),root:corpus.root}));
  }finally{corpus.close();}
  expect(fs.existsSync(corpus.root)).toBe(false);
});

it('rejects a junction in the implicit temporary directory ancestors before allocating or copying',()=>{
  vi.stubEnv('RUNNER_TEMP',undefined);
  const original=fs.readFileSync(join(source,'sentinel.txt'));
  const parent=fs.realpathSync.native(tmpdir());
  const sandbox=fs.mkdtempSync(join(parent,'m880-temp-link-'));
  const outside=join(sandbox,'outside'),linked=join(sandbox,'linked');
  fs.mkdirSync(outside);fs.mkdirSync(join(outside,'child'));
  fs.writeFileSync(join(outside,'retained.txt'),'outside unchanged');
  fs.symlinkSync(outside,linked,'junction');
  try{
    const supplied=join(linked,'child');
    vi.stubEnv('TEMP',supplied);vi.stubEnv('TMP',supplied);vi.stubEnv('TMPDIR',supplied);
    expect(tmpdir()).toBe(supplied);
    expect(()=>createOwnedCorpus(source)).toThrow('link');
    expect(fs.readdirSync(join(outside,'child'))).toEqual([]);
    expect(fs.readFileSync(join(outside,'retained.txt'),'utf8')).toBe('outside unchanged');
    expect(fs.readFileSync(join(source,'sentinel.txt'))).toEqual(original);
  }finally{
    fs.unlinkSync(linked);
    const actual=fs.realpathSync.native(sandbox);
    if(dirname(actual)!==parent||actual!==resolve(sandbox)||!basename(actual).startsWith('m880-temp-link-'))throw new Error('Unsafe M880 test cleanup');
    fs.rmSync(actual,{recursive:true,force:false});
  }
});
