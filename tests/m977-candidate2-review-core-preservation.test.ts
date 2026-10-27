import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';

// Executable source-preservation checks only. No native database or successful
// restore is simulated; actual transactional acceptance remains separate.
const base='d7c97014b4bbf979c04f853e3405a828904b3c91';
function parsed(text:string){return ts.createSourceFile('store.ts',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);}
function all(node:ts.Node){const result:ts.Node[]=[];const visit=(value:ts.Node)=>{result.push(value);ts.forEachChild(value,visit);};visit(node);return result;}
function method(source:ts.SourceFile,name:string){const node=all(source).find((value):value is ts.MethodDeclaration=>ts.isMethodDeclaration(value)&&value.name.getText(source)===name);if(!node?.body)throw Error('Expected real Store method missing: '+name);return node;}
const print=ts.createPrinter({removeComments:true});
const normalized=(node:ts.Node,source:ts.SourceFile)=>print.printNode(ts.EmitHint.Unspecified,node,source).replace(/\s+/gu,'');
const original=parsed(execFileSync('git',['show',base+':src/main/store.ts'],{encoding:'utf8',maxBuffer:2*1024*1024}));
const current=parsed(fs.readFileSync('src/main/store.ts','utf8'));

describe('M977 shared private review core retains the fixed review algorithm',{timeout:30000},()=>{
 it('moves the original apply/nochange/revision/history/transaction tail without a second algorithm',()=>{
  const oldReview=method(original,'reviewCandidate2Session');
  const next=all(oldReview).find((node):node is ts.VariableStatement=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(row=>row.name.getText(original)==='next'));
  if(!next||!ts.isBlock(next.parent))throw Error('Original native review tail not found');
  const statements=[...next.parent.statements],offset=statements.indexOf(next);
  const oldTail=statements.slice(offset).map(node=>normalized(node,original));
  const shared=method(current,'#applyCandidate2Review');
  const moved=[...shared.body!.statements].filter(node=>!(ts.isIfStatement(node)&&node.expression.getText(current)==='restore')).map(node=>normalized(node,current));
  expect(moved).toEqual(oldTail);
  expect(all(current).filter(ts.isCallExpression).filter(node=>node.expression.getText(current)==='applyCandidate2NativeReviewV1')).toHaveLength(1);
 });
 it('preserves the ordinary review wrapper preconditions, exact arity and private committed readback',()=>{
  const oldReview=method(original,'reviewCandidate2Session'),newReview=method(current,'reviewCandidate2Session');
  expect(newReview.parameters.map(parameter=>normalized(parameter,current))).toEqual(oldReview.parameters.map(parameter=>normalized(parameter,original)));
  const oldBody=[...oldReview.body!.statements],newBody=[...newReview.body!.statements];
  expect(normalized(newBody[0],current)).toBe(normalized(oldBody[0],original));
  expect(normalized(newBody.at(-1)!,current)).toBe(normalized(oldBody.at(-1)!,original));
  expect(newReview.getText(current)).toContain('this.#applyCandidate2Review(database,id,previous,json,patch)');
 });
 it('keeps legacy Service history methods unchanged instead of routing them through C2',()=>{
  const oldService=parsed(execFileSync('git',['show',base+':src/main/service.ts'],{encoding:'utf8',maxBuffer:2*1024*1024}));
  const newService=parsed(fs.readFileSync('src/main/service.ts','utf8'));
  for(const name of ['listHistory','restoreHistory','reviewCandidate2','generateCandidate2'])expect(normalized(method(newService,name),newService)).toBe(normalized(method(oldService,name),oldService));
 });
});
