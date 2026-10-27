import {openSync,writeFileSync,closeSync,renameSync,unlinkSync,mkdirSync} from 'node:fs';
import {basename,dirname,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {retainWriterSecondaryFailures,type WriterSecondaryFailure} from './writer-finalization';

/** Main-only receipt returned only after the actual rename call has returned.
 * No renderer/client supplied receipt enters this function or the Store. */
export interface CustomerDatabaseCommitReceipt {
  readonly cleanupFailures:readonly WriterSecondaryFailure[];
}
export class CustomerDatabaseCleanupError extends AggregateError {
  readonly failures:readonly WriterSecondaryFailure[];
  constructor(failures:readonly WriterSecondaryFailure[]){
    super(failures.map(item=>item.error),'客户库原子替换后的临时文件清理失败。');
    this.name='CustomerDatabaseCleanupError';
    this.failures=Object.freeze(failures.map(item=>Object.freeze({...item})));
  }
}
const isAbsent=(error:unknown)=>!!error&&typeof error==='object'&&Object.getOwnPropertyDescriptor(error,'code')?.value==='ENOENT';

/** Only active customer SQLite replacement uses this specialized contract.
 * A successful rename is never reclassified by subsequent temp cleanup.
 * Unknown close state is not retried; owned temp unlink is still attempted. */
export function writeCustomerDatabaseAtomically(file:string,data:Uint8Array):CustomerDatabaseCommitReceipt {
  const target=resolve(file);
  if(basename(target)!=='customers.sqlite')throw new Error('客户库原子提交只接受 active customers.sqlite。');
  mkdirSync(dirname(target),{recursive:true});
  const temporary=target+'.'+process.pid+'.'+randomUUID()+'.tmp';
  let descriptor:number|undefined,owned=false,renamed=false,failed=false,primary:unknown;
  const cleanupFailures:WriterSecondaryFailure[]=[];
  try{descriptor=openSync(temporary,'wx');owned=true;writeFileSync(descriptor,data);}
  catch(error){failed=true;primary=error;}
  if(descriptor!==undefined){
    const closing=descriptor;descriptor=undefined;
    try{closeSync(closing);}catch(error){if(failed)cleanupFailures.push({phase:'atomic-temp-close',error});else{failed=true;primary=error;}}
  }
  if(!failed)try{renameSync(temporary,target);renamed=true;}catch(error){failed=true;primary=error;}
  if(owned)try{unlinkSync(temporary);}catch(error){if(!isAbsent(error))cleanupFailures.push({phase:'atomic-temp-unlink',error});}
  if(!renamed){retainWriterSecondaryFailures(primary,cleanupFailures);throw primary;}
  // Nothing after rename throws a cleanup failure before the Store receives
  // its local commit receipt and installs/finalizes the committed result.
  return Object.freeze({cleanupFailures:Object.freeze(cleanupFailures.map(item=>Object.freeze({...item})))});
}
