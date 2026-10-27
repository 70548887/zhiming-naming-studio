import {describe,it,expect,afterEach} from 'vitest';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,mkdtempSync,rmSync,statSync} from 'node:fs';
import {join,resolve,dirname,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';

const root=process.cwd(),builder=resolve('scripts/build-classics-data.mjs'),files=['data/raw/classics-ditian-2600158.wiki','data/raw/classics-qiongtong-2294674.wiki','data/raw/CC-BY-SA-4.0.txt','data/classics/ditian-2600158-index.json','data/classics/qiongtong-2294674-index.json','data/raw/classics-ditian-2600158-NOTICE.md','data/raw/classics-qiongtong-2294674-NOTICE.md','data/classics-catalog.json','data/classics-source-lock.json'],hash=(value:Uint8Array)=>createHash('sha256').update(value).digest('hex'),temporary:string[]=[];
afterEach(()=>{for(const file of temporary.splice(0)){if(dirname(file)!==resolve(tmpdir())||!basename(file).startsWith('classics-rebuild-'))throw new Error('Unsafe test cleanup path');rmSync(file,{recursive:true,force:true});}});
const fingerprint=(directory:string)=>files.map(file=>({file,sha256:hash(readFileSync(join(directory,file))),mtimeMs:statSync(join(directory,file)).mtimeMs}));
describe('offline reproducible classical-text publication',()=>{
 it('rebuilds all derived bytes in verify mode without writing source, indexes, attribution or lock',()=>{
  const before=fingerprint(root),result=JSON.parse(execFileSync(process.execPath,[builder,'--verify'],{cwd:root,encoding:'utf8',windowsHide:true}));expect(result.passed).toBe(true);expect(result.files).toHaveLength(6);expect(result.sections).toBe(123);expect(result.sourceCodepoints).toBe(180447);expect(result.writes).toBe(0);expect(result.networkRequests).toBe(0);expect(fingerprint(root)).toEqual(before);
 });
 it('rejects a changed derived index in verify mode while preserving the tampered fixture bytes',()=>{
  const directory=mkdtempSync(join(tmpdir(),'classics-rebuild-'));temporary.push(directory);for(const file of files){const target=join(directory,file);mkdirSync(dirname(target),{recursive:true});copyFileSync(join(root,file),target);}const target=join(directory,'data/classics/ditian-2600158-index.json');writeFileSync(target,Buffer.concat([readFileSync(target),Buffer.from(' ')]));const before=fingerprint(directory);
  expect(()=>execFileSync(process.execPath,[builder,'--verify'],{cwd:directory,encoding:'utf8',windowsHide:true,stdio:'pipe'})).toThrow();expect(fingerprint(directory)).toEqual(before);
 });
});
