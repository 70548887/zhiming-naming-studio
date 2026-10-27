import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {canonicalPlainJson} from './lookup-element-assessment.mjs';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const parse=b=>JSON.parse(b.toString('utf8').replace(/^\uFEFF/,''));
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
/** Node source gate. expectedLockSha256 must be pinned in trusted caller code/review output, never loaded from the adjacent editable lock. */
export function loadVerifiedElementPackage(stageDir,expectedLockSha256,projectRoot){
 if(typeof expectedLockSha256!=='string'||!/^[0-9a-f]{64}$/.test(expectedLockSha256))throw Error('Pinned expected lock SHA256 is required');
 const stage=fs.realpathSync(stageDir);const root=fs.realpathSync(projectRoot);
 const scoped=(base,relative)=>{if(typeof relative!=='string'||path.isAbsolute(relative))throw Error('Nonrelative locked path');const real=fs.realpathSync(path.resolve(base,relative));if(real!==base&&!real.startsWith(base+path.sep))throw Error('Locked path escapes verified directory');return real;};
 const lockBytes=fs.readFileSync(scoped(stage,'source-lock.json'));if(sha(lockBytes)!==expectedLockSha256)throw Error('Source lock differs from trusted pinned SHA');
 const lock=parse(lockBytes);canonicalPlainJson(lock);
 if(lock.profileId!=='project-dictionary-object-elements/1.0.0')throw Error('Unexpected object profile');
 if(sha(JSON.stringify(lock.projectFiles))!==lock.aggregateSha256)throw Error('Aggregate source lock mismatch');
 const verifiedProjectBytes=new Map();
 for(const [file,expected]of Object.entries(lock.projectFiles)){const bytes=fs.readFileSync(scoped(stage,file));if(sha(bytes)!==expected)throw Error('Locked project file differs: '+file);verifiedProjectBytes.set(file,bytes);}
 for(const source of lock.rawSources){if(sha(fs.readFileSync(scoped(root,source.path)))!==source.sha256)throw Error('Locked original source differs: '+source.path);}
 if(sha(fs.readFileSync(scoped(root,lock.baseline.path)))!==lock.baseline.sha256)throw Error('Baseline dictionary differs from reviewed snapshot');
 const overlayBytes=verifiedProjectBytes.get('element-overlay.json');
 if(!overlayBytes)throw Error('Locked overlay bytes are absent');
 const overlay=parse(overlayBytes);canonicalPlainJson(overlay);
 if(overlay.profileId!==lock.profileId||overlay.baseline.sha256!==lock.baseline.sha256)throw Error('Overlay identity mismatch');
 return freeze(overlay);
}
