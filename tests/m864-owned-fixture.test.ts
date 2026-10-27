import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import {createOwnedCorpus} from './helpers/m458-owned-corpus';
import {ownedRoot,dataDir,sourceFile,bytes,replaceOwned,ownedFile} from './helpers/m458-store-fixture';

const source=fileURLToPath(new URL('./fixtures/m458-owned-corpus',import.meta.url));
const sourceBytes=fs.readFileSync(join(source,'sentinel.txt'));
beforeAll(()=>{vi.stubEnv('M458_TEST_DATA_DIR',source);vi.stubEnv('M458_TEST_OWNED_ROOT',undefined);});
afterAll(()=>vi.unstubAllEnvs());

describe('M864 private portable mutable corpus',()=>{
  it('prepares the actual helper from a read-only source and copies before mutation',()=>{
    const root=ownedRoot(),copy=sourceFile('sentinel.txt'),other=createOwnedCorpus(source);
    try{
      expect(dirname(root)).toBe(fs.realpathSync.native(process.env.RUNNER_TEMP??tmpdir()));
      expect(fs.realpathSync.native(root)).toBe(root);expect(dataDir()).toBe(join(root,'data'));
      expect(root).not.toBe(other.root);expect(bytes(copy)).toEqual(sourceBytes);
      replaceOwned(copy,Buffer.from('worker A private change'));
      expect(bytes(copy)).not.toEqual(sourceBytes);
      expect(fs.readFileSync(join(other.dataDir,'sentinel.txt'))).toEqual(sourceBytes);
      expect(fs.readFileSync(join(source,'sentinel.txt'))).toEqual(sourceBytes);
      expect(()=>ownedFile(join(root,'..','escaped.txt'))).toThrow('escapes');
      console.log('M864_FILE_OWNER',JSON.stringify({file:'owned-fixture',root,worker:process.env.VITEST_POOL_ID,pid:process.pid}));
    }finally{replaceOwned(copy,sourceBytes);other.close();}
    expect(fs.existsSync(other.root)).toBe(false);
  });

  it('rejects relative inputs and a temporary parent inside its source instead of creating a writable copy',()=>{
    expect(()=>createOwnedCorpus('relative-source')).toThrow('absolute');
    expect(()=>createOwnedCorpus(source,'relative-parent')).toThrow('absolute');
    expect(()=>createOwnedCorpus(source,source)).toThrow('inside its source');
  });

  it('rejects outward source links and refuses writes or recursive cleanup through an injected link',()=>{
    const parent=fs.realpathSync.native(process.env.RUNNER_TEMP??tmpdir());
    const sandbox=fs.mkdtempSync(join(parent,'m864-link-case-')),outside=join(sandbox,'outside'),linkedSource=join(sandbox,'source');
    fs.mkdirSync(outside);fs.mkdirSync(linkedSource);fs.writeFileSync(join(outside,'retained.txt'),'outside unchanged');
    const sourceLink=join(linkedSource,'external');fs.symlinkSync(outside,sourceLink,'junction');
    let corpus:ReturnType<typeof createOwnedCorpus>|undefined;
    try{
      expect(()=>createOwnedCorpus(linkedSource,parent)).toThrow('link');
      corpus=createOwnedCorpus(source,parent);const target=join(corpus.root,'external');
      fs.symlinkSync(outside,target,'junction');
      expect(()=>corpus!.file(join(target,'retained.txt'))).toThrow('outside');
      expect(()=>corpus!.close()).toThrow('link');
      expect(fs.readFileSync(join(outside,'retained.txt'),'utf8')).toBe('outside unchanged');
      fs.unlinkSync(target);
      const dangling=join(corpus.root,'dangling');
      fs.symlinkSync(join(outside,'uncreated'),dangling,'junction');
      expect(fs.existsSync(dangling)).toBe(false);
      expect(()=>corpus!.file(dangling)).toThrow('link');
      fs.unlinkSync(dangling);corpus.close();corpus=undefined;
    }finally{
      fs.unlinkSync(sourceLink);
      if(corpus)corpus.close();
      const actual=fs.realpathSync.native(sandbox);if(dirname(actual)!==parent||actual!==resolve(sandbox))throw Error('Unsafe M864 link test cleanup');
      fs.rmSync(actual,{recursive:true,force:false});
    }
  });
});
