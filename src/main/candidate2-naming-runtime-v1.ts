import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isBuiltin,createRequire} from 'node:module';
import {Script} from 'node:vm';
import path from 'node:path';
import type * as Candidate2Application from './project-application-v132-r2';
const OFFICIAL_CANDIDATE2_OUTPUT='906b191c88ce2e6f0335c674727c39bcae14edf2968d2c1c5cdffcb04079b47a';
/** Load precisely the independently audited bundle in its own module instance.
 * Evaluation stays in this realm so ordinary JSON prototypes agree, while no
 * require cache, injected API/callback or checkout import supplies authority. */
export function loadCandidate2NamingRuntime(bundlePath:string):typeof Candidate2Application {
 if(typeof bundlePath!=='string'||!path.isAbsolute(bundlePath))throw Error('CANDIDATE2_NAMING_RUNTIME_INVALID: absolute official artifact required');
 const bytes=readFileSync(bundlePath);if(createHash('sha256').update(bytes).digest('hex')!==OFFICIAL_CANDIDATE2_OUTPUT)throw Error('CANDIDATE2_NAMING_RUNTIME_INVALID: built artifact digest mismatch');
 const module={exports:{}};
 const builtinRequire=createRequire(bundlePath);
 const wrapper=new Script('(function(module,exports,require,__filename,__dirname){\n'+bytes.toString('utf8')+'\n})',{filename:bundlePath}).runInThisContext();
 wrapper(module,module.exports,(id:string)=>{if(!isBuiltin(id)||!id.startsWith('node:'))throw Error('CANDIDATE2_NAMING_RUNTIME_INVALID: non-fixed runtime import');return builtinRequire(id);},bundlePath,path.dirname(bundlePath));
 return Object.freeze(module.exports) as typeof Candidate2Application;
}
