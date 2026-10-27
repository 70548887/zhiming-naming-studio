import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,isAbsolute,join,resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
// Share the actual owner's ESM instance with Store/Service; never recompile a
// second WeakMap/AsyncLocalStorage owner when loading the transport source.
import * as writerFinalization from '../../src/main/writer-finalization';
import * as noticeTypes from '../../src/shared/customer-write-notice';

export function mainNoticeSource(){
 const selected=process.env.M364_MAIN_SOURCE,expected=process.env.M364_MAIN_SOURCE_SHA256;
 if((selected===undefined)!==(expected===undefined))throw new Error('Main fixture requires both an absolute source path and its independent SHA256.');
 const file=selected??resolve('src/main/main.ts');if(!isAbsolute(file))throw new Error('Main source fixture must be absolute.');
 const bytes=readFileSync(file);if(expected!==undefined&&(!/^[a-f0-9]{64}$/.test(expected)||createHash('sha256').update(bytes).digest('hex')!==expected))throw new Error('Main source fixture bytes differ.');
 return{file,source:ts.createSourceFile(file,bytes.toString('utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS)};
}

/** Load only the two actual adjacent transport modules, with fixed dependency
 * names and host Promise. No main startup, Store construction or native IPC. */
export function noticeTransportForMain(file:string){
 const evaluate=(moduleFile:string,dependencies:Record<string,unknown>)=>{
  const source=ts.createSourceFile(moduleFile,readFileSync(moduleFile,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  for(const node of source.statements)if(ts.isImportDeclaration(node)){
   if(!ts.isStringLiteral(node.moduleSpecifier)||!Object.hasOwn(dependencies,node.moduleSpecifier.text))throw new Error('Unexpected notice transport dependency.');
  }
  const module={exports:{}};
  const require=(name:string)=>{if(!Object.hasOwn(dependencies,name))throw new Error('Unexpected notice transport require: '+name);return dependencies[name];};
  const code=ts.transpileModule(source.getFullText(),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  runInNewContext(code,{module,exports:module.exports,require,Promise,Object,Array,Reflect,Symbol,Number,Error,JSON},{filename:moduleFile});
  return module.exports as Record<string,unknown>;
 };
 const base=dirname(file),invocation=evaluate(join(base,'customer-write-notice-invocation.ts'),{});
 const transport=evaluate(join(base,'customer-write-notice-transport.ts'),{'./writer-finalization':writerFinalization,'../shared/customer-write-notice':noticeTypes,'./customer-write-notice-invocation':invocation});
 if(typeof transport.invokeWithCustomerWriteNotice!=='function')throw new Error('Actual notice invocation export missing.');
 return transport.invokeWithCustomerWriteNotice;
}
