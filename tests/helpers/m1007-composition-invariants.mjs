import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

// Static composition proof only: read git/current source, parse/print ASTs and
// evaluate the tiny argument-normalization predicate with primitive strings.
// No application, Store, database, route, Electron or PDF is invoked.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base='c86600dcb9f51e02aeffa48ec74922fe983d6121',report='146aeb8feb5f638e9afa15e0cea0ff91c92eab03';
const output=path.join(root,'.local/m1007/composition-invariants.json');
const git=(...args)=>{const result=spawnSync('git',args,{cwd:root,encoding:'utf8'});if(result.status!==0)throw Error(result.stderr);return result.stdout;};
const fromGit=(ref,file)=>git('show',`${ref}:${file}`),sha=value=>createHash('sha256').update(value).digest('hex');
const printer=ts.createPrinter({removeComments:true,newLine:ts.NewLineKind.LineFeed});
const parse=(file,text)=>{const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);if(source.parseDiagnostics.length)throw Error('Source parse diagnostics '+file);return source;};
const normalized=node=>printer.printNode(ts.EmitHint.Unspecified,node,node.getSourceFile()).replace(/\r\n/g,'\n');
const all=root=>{const result=[];const visit=node=>{result.push(node);ts.forEachChild(node,visit);};visit(root);return result;};
const name=node=>node.name&&(ts.isIdentifier(node.name)||ts.isPrivateIdentifier(node.name)||ts.isStringLiteral(node.name))?node.name.text:null;
const sources=new Map(),checks=[];
function load(file){if(!sources.has(file)){const oldText=fromGit(base,file),currentText=fs.readFileSync(path.join(root,file),'utf8');sources.set(file,{file,oldText,currentText,old:parse(file,oldText),current:parse(file,currentText)});}return sources.get(file);}
function check(label,ok,detail){checks.push({label,passed:!!ok,...(detail?{detail}:{})});if(!ok)throw Error(label);}
function classMembers(file,className){const {old,current}=load(file),find=source=>all(source).find(node=>ts.isClassDeclaration(node)&&node.name?.text===className),oldClass=find(old),currentClass=find(current);check(file+' class exists',oldClass&&currentClass);const now=new Map(currentClass.members.map(member=>[name(member)??'<constructor>',member]));for(const member of oldClass.members){const key=name(member)??'<constructor>';check(file+' existing class member '+key,now.has(key)&&normalized(member)===normalized(now.get(key)));}return{oldCount:oldClass.members.length,currentCount:currentClass.members.length};}
function registers(source){return new Map(all(source).filter(node=>ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='register'&&ts.isStringLiteral(node.arguments[0])).map(node=>[node.arguments[0].text,node]));}
function properties(source,variable){const declaration=all(source).find(node=>ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text===variable&&node.initializer&&ts.isObjectLiteralExpression(node.initializer));return new Map(declaration.initializer.properties.map(node=>[name(node),node]));}
function stringMethodItems(source,variable){const result=[];for(const node of all(source)){if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text===variable&&node.initializer&&ts.isArrayLiteralExpression(node.initializer))for(const value of node.initializer.elements)if(ts.isStringLiteral(value))result.push(value.text);if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&ts.isIdentifier(node.expression.expression)&&node.expression.expression.text===variable&&node.expression.name.text==='push')for(const value of node.arguments)if(ts.isStringLiteral(value))result.push(value.text);}return result;}
const reportMethods=new Set(['previewCandidate2Report','exportCandidate2Report']);
try{
 const counts={store:classMembers('src/main/store.ts','Store'),service:classMembers('src/main/service.ts','StudioService')};
 for(const file of ['src/main/candidate2-history-restore-input.ts','src/main/candidate2-history-restore-projection.ts','src/shared/candidate2-history-restore-api.ts']){const entry=load(file);check('history exact bytes '+file,entry.oldText===entry.currentText);}
 const main=load('src/main/main.ts'),oldRegisters=registers(main.old),newRegisters=registers(main.current);
 for(const[key,value]of oldRegisters)check('old main register '+key,newRegisters.has(key)&&normalized(value)===normalized(newRegisters.get(key)));
 for(const method of reportMethods)check('new report register '+method,newRegisters.has(method));
 const preload=load('src/main/preload.ts'),oldProps=properties(preload.old,'api'),newProps=properties(preload.current,'api');
 for(const[key,value]of oldProps)check('old preload method '+key,newProps.has(key)&&normalized(value)===normalized(newProps.get(key)));
 for(const method of reportMethods)check('new preload method '+method,newProps.has(method));
 const browser=load('src/shared/browser-api.ts'),plugin=load('scripts/dev-plugin.ts');
 for(const entry of [browser,plugin]){const variable=entry===browser?'methods':'allowed',before=stringMethodItems(entry.old,variable),after=stringMethodItems(entry.current,variable);for(const method of before)check(entry.file+' retained method '+method,after.filter(value=>value===method).length===before.filter(value=>value===method).length);check(entry.file+' report preview supported',after.includes('previewCandidate2Report'));check(entry.file+' desktop report export boundary',entry===browser?after.includes('exportCandidate2Report'):!after.includes('exportCandidate2Report'));}
 const normalizer=all(browser.current).find(node=>ts.isIfStatement(node)&&ts.isWhileStatement(node.thenStatement));check('browser trailing-slot predicate exists',normalizer);const expression=normalized(normalizer.expression);
 for(const method of ['generateCandidate2','reviewCandidate2','restoreCandidate2History','previewCandidate2Report','exportCandidate2Report'])check('browser exact arity slots retained '+method,runInNewContext(expression,{method})===false);
 check('browser legacy normalization retained',runInNewContext(expression,{method:'searchKnowledge'})===true);
 const reportSource=parse('report-main.ts',fromGit(report,'src/main/main.ts')),reportPdf=all(reportSource).find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='exportPDF'),currentPdf=all(main.current).find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='exportPDF');check('PDF helper exact final146 report AST',normalized(reportPdf)===normalized(currentPdf));
 const currentPrepare=all(load('src/main/store.ts').current).find(node=>ts.isMethodDeclaration(node)&&name(node)==='prepareCandidate2Report');const expectedStore=parse('report-store.ts',fromGit(report,'src/main/store.ts')),expectedPrepare=all(expectedStore).find(node=>ts.isMethodDeclaration(node)&&name(node)==='prepareCandidate2Report');check('readonly report Store method exact146 AST',normalized(currentPrepare)===normalized(expectedPrepare));
 const currentPreview=all(load('src/main/service.ts').current).find(node=>ts.isMethodDeclaration(node)&&name(node)==='previewCandidate2Report'),expectedService=parse('report-service.ts',fromGit(report,'src/main/service.ts')),expectedPreview=all(expectedService).find(node=>ts.isMethodDeclaration(node)&&name(node)==='previewCandidate2Report');check('readonly report Service method exact146 AST',normalized(currentPreview)===normalized(expectedPreview));
 for(const file of ['src/main/candidate2-report-export.ts','src/main/candidate2-report-source.ts','src/main/candidate2-report.ts','src/main/report.ts','src/renderer/Candidate2ReportExport.tsx','src/shared/candidate2-report-api.ts'])check('report exact final146 postimage '+file,fs.readFileSync(path.join(root,file),'utf8')===fromGit(report,file));
 check('renderer main exact current c866 bytes',fs.readFileSync(path.join(root,'src/renderer/main.tsx'),'utf8')===fromGit(base,'src/renderer/main.tsx'));
 const variables=source=>new Map(all(source).filter(node=>ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)).map(node=>[node.name.text,node]));for(const file of ['src/main/service.ts']){const entry=load(file),before=variables(entry.old),after=variables(entry.current);for(const key of ['nativeCandidate2HistoryRestore','invokeNativeCandidate2HistoryRestore'])check('history captured native binding '+key,normalized(before.get(key))===normalized(after.get(key)));}
 const result={schema:'m1007-static-composition-invariants/1',base,reportSource:report,passed:true,checks,counts,sourcePins:[...sources.values()].map(entry=>({file:entry.file,baselineSha256:sha(entry.oldText),currentSha256:sha(entry.currentText)})),scope:{staticAstAndFileReadOnly:true,noApplicationCodeInvoked:true,noNativeStorePdfServerSqlOrHttp:true,normalizationPredicateOnlyEvaluatedWithPrimitiveMethodStrings:true}};fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');process.stdout.write(JSON.stringify({passed:true,checks:checks.length,result:output})+'\n');
}catch(error){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify({schema:'m1007-static-composition-invariants/1',base,reportSource:report,passed:false,checks,error:String(error.stack||error),scope:{staticOnly:true,actualApplicationCalls:0}},null,2)+'\n');throw error;}
