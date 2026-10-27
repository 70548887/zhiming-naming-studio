/** Isolated Node driver for one pre-import Reflect.apply getter check.
 * Invoked only by the explicit M454 pure-test child gate. No Store or Worker. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {isAbsolute} from 'node:path';

const descriptor=Object.getOwnPropertyDescriptor,defineOwn=Object.defineProperty;
const deleteOwn=Reflect.deleteProperty,parse=JSON.parse,stringify=JSON.stringify;
const [entry,entryPin,tableFile,tablePin,selfPin]=process.argv.slice(2);
const digest=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const expectedPin=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
let result;
if(process.env.M454_DIAGNOSTIC_CHILD!=='1'){
  result={passed:false,phase:'gate',message:'M454 diagnostic child gate is closed'};
}else{
  try{
    const self=fileURLToPath(import.meta.url);
    if(!isAbsolute(entry)||!isAbsolute(tableFile)||![entryPin,tablePin,selfPin].every(expectedPin))throw new Error('M454 child requires absolute pinned inputs');
    const observed={entry:digest(entry),table:digest(tableFile),child:digest(self)};
    if(observed.entry!==entryPin||observed.table!==tablePin||observed.child!==selfPin)throw new Error('M454 child input SHA mismatch');
    const raw=parse(readFileSync(tableFile,'utf8')),expected=stringify(raw);
    const original=descriptor(Reflect,'apply');
    let getterCalls=0,imported=false,identityMatches=false,problem;
    try{
      defineOwn(Reflect,'apply',{configurable:true,get(){
        getterCalls++;throw new Error('M454 pre-import Reflect.apply getter must not run');
      }});
      try{
        const module=await import(pathToFileURL(entry).href);
        imported=true;
        const lookup=module.createNamingReviewLookup(raw);
        identityMatches=module.readNamingReviewLookupInputJson(lookup)===expected;
      }catch(error){
        problem={name:error instanceof Error?error.name:typeof error,message:error instanceof Error?error.message:String(error)};
      }
    }finally{
      if(original)defineOwn(Reflect,'apply',original);
      else if(!deleteOwn(Reflect,'apply'))throw new Error('M454 child could not restore Reflect.apply');
    }
    const restored=descriptor(Reflect,'apply');
    const descriptorRestored=!!original&&!!restored
      &&original.value===restored.value&&original.get===restored.get&&original.set===restored.set
      &&original.configurable===restored.configurable&&original.enumerable===restored.enumerable&&original.writable===restored.writable;
    result={passed:imported&&identityMatches&&getterCalls===0&&descriptorRestored&&!problem,phase:'pre-import',observed,imported,identityMatches,getterCalls,descriptorRestored,...(problem?{problem}:{})};
  }catch(error){
    result={passed:false,phase:'input-or-cleanup',problem:{name:error instanceof Error?error.name:typeof error,message:error instanceof Error?error.message:String(error)}};
  }
}
process.stdout.write(stringify(result)+'\n');
process.exitCode=result.passed?0:1;
