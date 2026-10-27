import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import {runInNewContext} from 'node:vm';
import {isDeepStrictEqual} from 'node:util';
import ts from 'typescript';
import {assertReviewRevision} from '../src/shared/review-version';

// Only the actual private row-recheck body runs in this local data harness.
// Its dependencies supply arrays, not authenticated SQL or save authority.
// No Store construction, transaction, replay or successful restore is claimed.
const sessionId='c2s_'+'a'.repeat(32),token='11111111-1111-4111-8111-111111111111';
const source=ts.createSourceFile('store.ts',fs.readFileSync('src/main/store.ts','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const nodes:ts.Node[]=[];const visit=(node:ts.Node)=>{nodes.push(node);ts.forEachChild(node,visit);};visit(source);
const guard=nodes.find((node):node is ts.MethodDeclaration=>ts.isMethodDeclaration(node)&&node.name.getText(source)==='#recheckCandidate2HistorySelection');
if(!guard)throw Error('Actual Store row-recheck guard missing');
const program=ts.transpileModule(`class RowGuard {
 db; registration; rows; queries=[]; writerValid=true;
 constructor(db,registration,rows){this.db=db;this.registration=registration;this.rows=rows;}
 #assertCandidate2Writer(){if(!this.writerValid)throw Error('WRITER_REJECTED');}
 #candidate2Database(db){if(db!==this.db)throw Error('DATABASE_REJECTED');return this.registration;}
 #candidate2Sql(db,sql,args){this.queries.push({sql,args});return [{values:sql.includes('FROM session_records')?this.rows.current:this.rows.selected}];}
 ${guard.getText(source)}
 run(database,id,selection){return this.#recheckCandidate2HistorySelection(database,id,selection);}
}
globalThis.RowGuard=RowGuard;`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const context:{RowGuard?:new(db:object,registration:object,rows:{current:unknown[][];selected:unknown[][]})=>{db:object;registration:object;rows:{current:unknown[][];selected:unknown[][]};queries:Array<{sql:string;args:unknown[]}>;writerValid:boolean;run(db:object,id:string,selection:unknown):void}}={};
runInNewContext(program,Object.assign(context,{isDeepStrictEqual,assertReviewRevision}),{timeout:1000});
if(!context.RowGuard)throw Error('Local row guard class missing');
function setup(){
 const db={},registration={},json=JSON.stringify({reviewRevision:4,reviewToken:token});
 const current=[sessionId,'owner','current-root',json],selected=[42,sessionId,'owner','2026-10-27T00:00:00Z','history-root',json];
 const rows={current:[structuredClone(current)],selected:[structuredClone(selected)]};
 const harness=new context.RowGuard!(db,registration,rows);
 const selection={registration,current,selected,revisionId:'42',expectedRevision:4,expectedToken:token};
 return{db,registration,rows,harness,selection};
}

describe('M977 actual private historical-row recheck with data-only dependencies',{timeout:30000},()=>{
 it('binds the canonical raw reference to both SQL predicates and both exact row values',()=>{
  const value=setup();expect(value.harness.run(value.db,sessionId,value.selection)).toBeUndefined();
  expect(value.harness.queries[1].args).toEqual(['42','42',sessionId]);
  expect(value.harness.queries[1].sql).toContain('id=? AND CAST(id AS TEXT)=? AND session_id=?');
 });
 it.each(['deleted','replacement','wrong-session','wrong-customer','same-json-different-id'] as const)('rejects a %s selected row even with unchanged current CAS',kind=>{
  const value=setup();
  if(kind==='deleted')value.rows.selected=[];
  else if(kind==='replacement')value.rows.selected[0][5]=JSON.stringify({reviewRevision:1,reviewToken:token});
  else if(kind==='wrong-session')value.rows.selected[0][1]='c2s_'+'b'.repeat(32);
  else if(kind==='wrong-customer')value.rows.selected[0][2]='another-owner';
  else value.rows.selected[0][0]=43;
  expect(()=>value.harness.run(value.db,sessionId,value.selection)).toThrow('CANDIDATE2_HISTORY_SELECTION_CHANGED');
 });
 it('keeps equal historical JSON in another row distinct by its exact selected id',()=>{
  const value=setup();expect(value.selection.current[3]).toBe(value.selection.selected[5]);
  value.rows.selected[0][0]=43;expect(()=>value.harness.run(value.db,sessionId,value.selection)).toThrow();
  value.rows.selected[0][0]=42;expect(()=>value.harness.run(value.db,sessionId,value.selection)).not.toThrow();
 });
 it.each(['deleted','root','json','duplicate'] as const)('rejects a %s current row before saving',kind=>{
  const value=setup();if(kind==='deleted')value.rows.current=[];
  else if(kind==='root')value.rows.current[0][2]='changed-root';
  else if(kind==='json')value.rows.current[0][3]='changed-json';
  else value.rows.current.push(structuredClone(value.rows.current[0]));
  expect(()=>value.harness.run(value.db,sessionId,value.selection)).toThrow('CANDIDATE2_HISTORY_SELECTION_CHANGED');
 });
 it('rejects stale explicit CAS after both row comparisons',()=>{
  const value=setup();value.selection.expectedRevision=3;
  expect(()=>value.harness.run(value.db,sessionId,value.selection)).toThrow('方案已被其他窗口更新');
 });
 it('rejects a retired registration even when all row bytes still match',()=>{
  const value=setup();value.harness.registration={};
  expect(()=>value.harness.run(value.db,sessionId,value.selection)).toThrow('native database changed');
 });
 it('checks the original writer gate before any row dependency is consulted',()=>{
  const value=setup();value.harness.writerValid=false;
  expect(()=>value.harness.run(value.db,sessionId,value.selection)).toThrow('WRITER_REJECTED');expect(value.harness.queries).toHaveLength(0);
 });
});
