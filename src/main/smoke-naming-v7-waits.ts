import type {WebContents} from 'electron';

/** Fail the smoke explicitly when a renderer wait stops making progress. */
export async function withNamingV7Deadline<T>(stage:string,run:()=>Promise<T>,timeoutMs=15000):Promise<T>{
 if(!stage||!Number.isSafeInteger(timeoutMs)||timeoutMs<=0)throw new Error('Naming7 smoke deadline requires a stage and positive timeout.');
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([Promise.resolve().then(run),new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>reject(new Error(`Naming7 smoke stage timed out after ${timeoutMs}ms: ${stage}`)),timeoutMs);})]);}
 finally{if(timer!==undefined)clearTimeout(timer);}
}

/** Observe reload completion and clean up every listener on success or failure. */
export async function reloadNamingV7Page(contents:WebContents,timeoutMs=15000):Promise<void>{
 if(contents.isDestroyed())throw new Error('Naming7 smoke reload: web contents already destroyed.');
 let finished:(()=>void)|undefined,failed:((...args:any[])=>void)|undefined,destroyed:(()=>void)|undefined;
 try{
  await withNamingV7Deadline('reload:did-finish-load',()=>new Promise<void>((resolve,reject)=>{
   finished=()=>resolve();
   failed=(_event:unknown,code:number,description:string,_url:string,isMainFrame:boolean)=>{if(isMainFrame)reject(new Error(`Naming7 smoke reload failed (${code}): ${description}`));};
   destroyed=()=>reject(new Error('Naming7 smoke reload: web contents destroyed before completion.'));
   contents.once('did-finish-load',finished);contents.on('did-fail-load',failed);contents.once('destroyed',destroyed);contents.reload();
  }),timeoutMs);
 }finally{
  if(finished)contents.removeListener('did-finish-load',finished);
  if(failed)contents.removeListener('did-fail-load',failed);
  if(destroyed)contents.removeListener('destroyed',destroyed);
 }
}
