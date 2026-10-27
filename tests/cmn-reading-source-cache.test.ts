import {beforeAll,afterAll,expect,it} from 'vitest';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {loadVerifiedCmnReadingSource} from '../src/main/cmn-reading-source';
import {CMN_READING_INPUTS} from '../src/main/cmn-reading-pins';
const data=path.resolve('data'),parent=fs.realpathSync.native(os.tmpdir());let directory:string;
beforeAll(()=>{directory=fs.realpathSync.native(fs.mkdtempSync(path.join(parent,'cmn-verified-cache-')));for(const p of CMN_READING_INPUTS){const relative=p.file.slice(5),dst=path.join(directory,relative);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(path.join(data,relative),dst);fs.chmodSync(dst,0o600);}});
afterAll(()=>{if(directory){if(!directory.startsWith(parent+path.sep))throw Error('Unsafe cache-fixture cleanup');fs.rmSync(directory,{recursive:true,force:true});}});

it('reuses the same parsed index only after each caller directory has passed fixed-source validation',()=>{
  const first=loadVerifiedCmnReadingSource(data),same=loadVerifiedCmnReadingSource(data),otherVerifiedLocation=loadVerifiedCmnReadingSource(directory);
  expect(same).toBe(first);expect(otherVerifiedLocation).toBe(first);
  expect(same.query('行').options.map(o=>o.pinyin)).toEqual(['xíng','háng','xìng','hàng']);
});
it('rejects same-size tampering even when the exact mtime is restored after warming the cache',()=>{
  for(const relative of ['raw/kTraditionalVariant.txt','raw/moe-revised.json.gz']){
    const file=path.join(directory,relative),original=fs.readFileSync(file),fixedTime=new Date('2020-01-01T00:00:00.000Z');fs.utimesSync(file,fixedTime,fixedTime);
    const before=fs.statSync(file,{bigint:true}),trusted=loadVerifiedCmnReadingSource(directory),changed=Buffer.from(original);changed[changed.length-1]^=1;
    fs.writeFileSync(file,changed);fs.utimesSync(file,fixedTime,fixedTime);const altered=fs.statSync(file,{bigint:true});
    expect(altered.size).toBe(before.size);expect(altered.mtimeNs).toBe(before.mtimeNs);
    try{expect(()=>loadVerifiedCmnReadingSource(directory)).toThrow('fixed source changed');}
    finally{fs.writeFileSync(file,original);fs.utimesSync(file,fixedTime,fixedTime);}
    expect(loadVerifiedCmnReadingSource(directory)).toBe(trusted);
  }
});
it('does not serve a warm index when an original disappears or an unknown source lock replaces the pinned one',()=>{
  const trusted=loadVerifiedCmnReadingSource(directory),file=path.join(directory,'raw/kTraditionalVariant.txt'),held=file+'.held';fs.renameSync(file,held);
  try{expect(()=>loadVerifiedCmnReadingSource(directory)).toThrow();}finally{fs.renameSync(held,file);}
  const lock=path.join(directory,'source-lock.json'),original=fs.readFileSync(lock);fs.writeFileSync(lock,Buffer.from(original.toString('utf8').replace('a6dc997417507eb510fc29822bc514de2c92728c','b6dc997417507eb510fc29822bc514de2c92728c')));
  try{expect(()=>loadVerifiedCmnReadingSource(directory)).toThrow('fixed source changed');}finally{fs.writeFileSync(lock,original);}
  expect(loadVerifiedCmnReadingSource(directory)).toBe(trusted);
});
it('keeps shared cached indexes immutable across clients and retains unselectable source references',()=>{
  const a=loadVerifiedCmnReadingSource(data),query=a.query('沈'),source=a.source;query.options[0].pinyin='poison';source.rawSha256='poison';
  const b=loadVerifiedCmnReadingSource(directory);expect(b.query('沈').options.map(o=>o.pinyin)).toEqual(['shěn']);expect(b.query('沈').references[0].selectable).toBe(false);expect(b.source.rawSha256).not.toBe('poison');
});
