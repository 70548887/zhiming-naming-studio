import fs from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {afterAll,beforeAll,expect,it,vi} from 'vitest';
import {ownedRoot,sourceFile,bytes,replaceOwned} from './helpers/m458-store-fixture';

const source=fileURLToPath(new URL('./fixtures/m458-owned-corpus',import.meta.url));
beforeAll(()=>{vi.stubEnv('M458_TEST_DATA_DIR',source);vi.stubEnv('M458_TEST_OWNED_ROOT',undefined);});
afterAll(()=>vi.unstubAllEnvs());
it('keeps the second standard Vitest file on its own actual mutable copy',()=>{
  const root=ownedRoot(),file=sourceFile('sentinel.txt'),original=fs.readFileSync(join(source,'sentinel.txt'));
  expect(bytes(file)).toEqual(original);
  try{
    replaceOwned(file,Buffer.from('worker B private change'));
    expect(bytes(file).toString()).toBe('worker B private change');
    expect(fs.readFileSync(join(source,'sentinel.txt'))).toEqual(original);
    console.log('M864_FILE_OWNER',JSON.stringify({file:'owned-fixture-peer',root,worker:process.env.VITEST_POOL_ID,pid:process.pid}));
  }finally{replaceOwned(file,original);}
});
