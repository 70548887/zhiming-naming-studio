import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import ts from 'typescript';import {it,expect} from 'vitest';
it('all raw page/section React setters stay inside synchronous owner wrappers',()=>{
 const source=ts.createSourceFile('main.tsx',readFileSync(resolve('src/renderer/main.tsx'),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),raw:{name:string;owner:string|null;args:string[]}[]=[];
 const enclosingOwner=(node:ts.Node)=>{let parent:ts.Node|undefined=node;while(parent){if(ts.isVariableDeclaration(parent)&&parent.initializer&&(ts.isArrowFunction(parent.initializer)||ts.isFunctionExpression(parent.initializer)))return parent.name.getText(source);parent=parent.parent;}return null;};
 const walk=(node:ts.Node)=>{if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&['setPageState','setFormTabState'].includes(node.expression.text))raw.push({name:node.expression.text,owner:enclosingOwner(node),args:node.arguments.map(arg=>arg.getText(source))});ts.forEachChild(node,walk);};walk(source);
 expect(raw).toHaveLength(2);for(const call of raw){expect(call.owner).toBe(call.name==='setPageState'?'setPage':'setFormTab');expect(call.args).toEqual(['next']);}
});
