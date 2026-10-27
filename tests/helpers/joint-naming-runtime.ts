import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';

const require=createRequire(import.meta.url);
/** Normal checkout layout: this helper lives in tests/helpers and data stays in repository data/. */
const repositoryRoot=path.resolve(import.meta.dirname,'../..');
export const jointDataDirectory=path.join(repositoryRoot,'data');
export const jointSqlWasmPath=require.resolve('sql.js/dist/sql-wasm.wasm');
const prefix='naming-joint-review-';
export function createJointRunDirectory():string {return fs.mkdtempSync(path.join(tmpdir(),prefix));}
export function removeJointRunDirectory(directory:string):void {
 if(!directory)return;
 const actual=fs.realpathSync(directory),parent=fs.realpathSync(tmpdir());
 if(path.dirname(actual)!==parent||!path.basename(actual).startsWith(prefix))throw Error('Joint fixture cleanup must stay inside its own generated system temporary directory.');
 fs.rmSync(actual,{recursive:true,force:true});
}
export function publishedNaming134Fixture():{bytes:Buffer;path:string;sha256:string} {
 const file=path.join(repositoryRoot,'tests/fixtures/naming-session-1.0.34.sqlite'),bytes=fs.readFileSync(file);
 const sha256=createHash('sha256').update(bytes).digest('hex');
 if(sha256!=='4b59b59967c9774c8e2064aff2cab6a4e705856c907c0e69cf4e8c8b077bf3f7')throw Error('Published1.0.34 fixture bytes differ from the real released isolated database.');
 return {bytes,path:file,sha256};
}

/** Per-case completion budgets, not global timeout changes or performance promises.
 * Original measured case times were16–119s. Use roughly2x observed plus15s,
 * rounded to15s. J07 also includes the separately measured61s old134 read/backup.
 * Full root runs may overlap another worker; these limits avoid a synthetic5s failure.
 */
export const JOINT_COMPLETION_BUDGET_MS={
 J01:135000,J02:105000,J03:120000,J04:90000,J05:240000,
 J06:165000,J07:300000,J08:90000,J09:105000,J10:105000,
 M01:255000,M02:60000,M03:270000,M04:135000,M05:165000,
} as const;
