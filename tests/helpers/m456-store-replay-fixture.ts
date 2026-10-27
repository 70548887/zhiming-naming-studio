import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,basename,join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {Store} from '../../src/main/store';
import {StudioService} from '../../src/main/service';
import {normalizePreferences} from '../../src/shared/workflow';
import type {BirthProfile,NamingSession} from '../../src/shared/types';

export interface ReplayFixture {
  store:Store;service:StudioService;session:NamingSession;
  userDir:string;dataDir:string;temporaryParent:string;
}
const prefix='m456-store-replay-';
export const dataDir=resolve('data');
const wasm=createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm');

/** Same real init/generate pattern as history-row-binding and candidate-facts-
 * provenance. No loader/verifier mocks, alternate authority or fixture import.
 * The only writable customer directory is created directly below native TEMP.
 * Project data is passed to real Store/Service read-only. */
export async function openReplayFixture():Promise<ReplayFixture> {
  const temporaryParent=fs.realpathSync.native(tmpdir());
  const userDir=fs.realpathSync.native(fs.mkdtempSync(join(temporaryParent,prefix)));
  const store=new Store(userDir,dataDir,wasm);
  let service:StudioService|undefined;
  try {
    await store.init();
    service=new StudioService(store,{read:()=>'',write:()=>{}},false);
    const profile:BirthProfile={
      id:randomUUID(),customerName:'M456 私有读取边界',surname:'林',surnamePinyin:'lín',
      fatherName:'',motherName:'',gender:'中性',calendar:'solar',birthDate:'2026-10-17',
      leapMonth:false,birthTime:'09:30',timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',
      notes:'真实本地生成的隔离回归',renMethod:'none',timeBasis:'civil',
      monthAuthorityMethod:'no-fixed-day/1.0.0',seasonalMethod:'no-monthly/1.0.0',
    };
    // Exactly one ordinary candidate keeps repeated true reads small. No AI,
    // project-basis minting, artificial sleep or altered timeout is involved.
    const preferences=normalizePreferences({
      length:2,generationChar:'安',requiredChars:'宁',preferredElements:[],
      numerology:false,zodiacRules:false,
    });
    if(store.settings().useAi)throw new Error('M456 requires the unchanged local-only default');
    const session=(await service.generate(profile,preferences)).session;
    return {store,service,session,userDir,dataDir,temporaryParent};
  } catch(error) {
    try {await service?.closeCmnReadingWorker();} finally {store.db?.close();}
    console.error('M456_SETUP_FAILURE_TEMP_RETAINED',userDir);
    throw error;
  }
}

export function customerDisk(fixture:ReplayFixture):Buffer {
  return fs.readFileSync(join(fixture.userDir,'customers.sqlite'));
}
export function currentJson(fixture:ReplayFixture):string {
  const row=fixture.store.db.exec('SELECT json FROM sessions WHERE id=?',[fixture.session.id])[0]?.values[0]?.[0];
  if(typeof row!=='string')throw new Error('M456 generated native SQL row is missing');
  return row;
}
export async function closeReplayFixture(fixture:ReplayFixture,remove:boolean):Promise<void> {
  try {await fixture.service.closeCmnReadingWorker();} finally {fixture.store.db.close();}
  // A root-selected single positive can pass while the complete four-case
  // suite was intentionally not run. Retention does not assert test failure.
  if(!remove){console.error('M456_PARTIAL_OR_FAILED_SUITE_TEMP_RETAINED',fixture.userDir);return;}
  const absolute=resolve(fixture.userDir),stat=fs.lstatSync(absolute);
  if(dirname(absolute)!==fixture.temporaryParent||!basename(absolute).startsWith(prefix)
    ||stat.isSymbolicLink()||!stat.isDirectory()||fs.realpathSync.native(absolute)!==absolute)
    throw new Error('M456 refuses cleanup outside its exact owned TEMP directory');
  fs.rmSync(absolute,{recursive:true,force:false});
}
