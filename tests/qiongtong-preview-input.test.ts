import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {QIONGTONG_CLAUSE_INPUT_LIMITS as limits,readQiongtongClausePreviewProfile as read} from '../src/main/qiongtong-preview-input';

// M607's explicit project input-resource limits only. These are raw structural
// copier tests, independent from profile field lengths and calendar validity.
// No comparison with an unavailable formal M571 boundary is claimed. Not run.
const nested=(value:unknown)=>({namingPreferences:value});
const byteLength=(text:string)=>Buffer.byteLength(text,'utf8');
function depthInput(leafDepth:number):unknown {
  let value:unknown=null;for(let depth=1;depth<leafDepth;depth++)value=[value];return nested(value);
}

describe('M607 detached Qiongtong preview input resource limits',()=>{
  it('exports exactly the frozen project limits and accepts no caller adjustment',()=>{
    expect(limits).toEqual({maxDepth:24,maxArrayLength:4096,maxNodes:25000,maxScalarBytes:200000});
    expect(Object.isFrozen(limits)).toBe(true);const before=Object.getOwnPropertyDescriptors(limits);
    expect(Reflect.set(limits,'maxNodes',Infinity)).toBe(false);
    expect(Reflect.defineProperty(limits,'maxScalarBytes',{value:Infinity})).toBe(false);
    expect(Reflect.deleteProperty(limits,'maxDepth')).toBe(false);
    expect(Object.getOwnPropertyDescriptors(limits)).toEqual(before);
  });
  it('rejects root null, primitives and arrays rather than returning a primitive BirthProfile',()=>{
    for(const input of [null,undefined,'text',0,1.25,true,false,NaN,Infinity,[],[{}],1n,Symbol('root')]){
      expect(()=>read(input)).toThrow();
    }
    expect(read(Object.assign(Object.create(null),{notes:'ordinary JSON record'}))).toEqual({notes:'ordinary JSON record'});
  });
  it('rejects an overwide flat nested object even when it contains no long string or large array',()=>{
    const wide=Object.fromEntries(Array.from({length:25000},(_,index)=>['k'+index,0]));
    expect(()=>read(nested(wide))).toThrow(/累计节点/);
  });
  it('charges aggregate nodes across branches and starts a fresh budget on every pass',()=>{
    const within=nested(Array.from({length:6},()=>Array(4096).fill(null)));
    const first=read(within),second=read(within);
    expect(first).toEqual(within);expect(second).toEqual(within);expect(second).not.toBe(first);
    expect(()=>read(nested(Array.from({length:7},()=>Array(4096).fill(null))))).toThrow(/累计节点/);
  });
  it('counts four-byte UTF8 scalars in aggregate, accepts the exact byte budget and rejects one additional byte',()=>{
    const multibyte='𠮷'.repeat(25000);
    const tail='a'.repeat(limits.maxScalarBytes-byteLength('namingPreferences')-byteLength(multibyte));
    const exact=nested([multibyte,tail]);
    expect(read(exact)).toEqual(exact);expect(read(exact)).toEqual(exact);
    expect(()=>read(nested([multibyte,tail+'a']))).toThrow(/字节/);
  });
  it('charges object keys and the JSON-compatible spelling of null, booleans and finite numbers',()=>{
    const scalars=[null,true,false,123,-1.25,0];
    const spellings=scalars.reduce<number>((bytes,value)=>bytes+byteLength(String(value)),0);
    const padding='x'.repeat(limits.maxScalarBytes-byteLength('namingPreferences')-byteLength('notes')-spellings);
    const exact={namingPreferences:scalars,notes:padding};
    expect(read(exact)).toEqual(exact);expect(()=>read({...exact,notes:padding+'x'})).toThrow(/字节/);
    const longKey='𠮷'.repeat(25000);
    expect(()=>read(nested({[longKey+'a']:true,[longKey+'b']:false}))).toThrow(/字节/);
  });
  it('expands and charges every repeated DAG occurrence instead of deduplicating shared references',()=>{
    const shared=Array(4096).fill(null),dag=nested(Array(7).fill(shared));
    // The unique JS graph is small; its seven copied occurrences exceed25000.
    expect(()=>read(dag)).toThrow(/累计节点/);
  });
  it('accepts depth24 and rejects a leaf at depth25',()=>{
    expect(read(depthInput(24))).toEqual(depthInput(24));expect(()=>read(depthInput(25))).toThrow(/深度/);
  });
  it('accepts array length4096 and rejects4097 before copying its elements',()=>{
    expect(read(nested(Array(4096).fill(null)))).toEqual(nested(Array(4096).fill(null)));
    expect(()=>read(nested(Array(4097).fill(null)))).toThrow(/数组长度/);
  });
  it('rejects root/nested accessors and root/nested/revoked proxies with zero getter or proxy traps',()=>{
    let accesses=0;const fail=()=>{accesses++;throw Error('Getter or proxy trap must not execute');};
    const rootGetter=Object.defineProperty({},'notes',{enumerable:true,get:fail});
    const nestedGetter=Object.defineProperty({},'leaf',{enumerable:true,get:fail});
    expect(()=>read(rootGetter)).toThrow();expect(()=>read(nested(nestedGetter))).toThrow();
    const handler:ProxyHandler<object>={get:fail,getPrototypeOf:fail,ownKeys:fail,getOwnPropertyDescriptor:fail,has:fail};
    const proxy=new Proxy({},handler),revoked=Proxy.revocable({},handler);revoked.revoke();
    expect(()=>read(proxy)).toThrow();expect(()=>read(nested(proxy))).toThrow();
    expect(()=>read(revoked.proxy)).toThrow();expect(()=>read(nested(revoked.proxy))).toThrow();expect(accesses).toBe(0);
  });
  it('rejects sparse arrays, cycles, nonfinite numbers and nested undefined',()=>{
    const cycle:Record<string,unknown>={};cycle.self=cycle;
    for(const value of [Array(2),cycle,NaN,Infinity,-Infinity,{leaf:undefined}])expect(()=>read(nested(value))).toThrow();
  });
  it('skips explicit undefined only in allowed optional root fields without mutating the original',()=>{
    const input={notes:'retained',fatherName:undefined,motherName:undefined,parentNameReadings:undefined,
      namingPreferences:undefined,monthAuthorityMethod:undefined,seasonalMethod:undefined,timeBasis:undefined,birthLongitude:undefined,renMethod:undefined};
    const before=Object.getOwnPropertyDescriptors(input),output=read(input);
    expect(output).toEqual({notes:'retained'});expect(Object.hasOwn(output,'parentNameReadings')).toBe(false);
    expect(Object.getOwnPropertyDescriptors(input)).toEqual(before);
    expect(()=>read({notes:undefined})).toThrow();expect(()=>read(nested({fatherName:undefined}))).toThrow();
  });
  it('returns detached containers for every DAG occurrence and leaves the complete input unchanged',()=>{
    const shared={text:'原始𠮷😀',values:[1,true,null]};
    const input={id:'detached-profile',notes:'unchanged',fatherName:'林安',motherName:'陈宁',parentNameReadings:[],
      namingPreferences:{branches:[shared,shared],other:{leaf:shared}}};
    const before=structuredClone(input),output=read(input) as unknown as typeof input;
    expect(output).toEqual(before);expect(input).toEqual(before);expect(output).not.toBe(input);
    expect(output.namingPreferences).not.toBe(input.namingPreferences);
    expect(output.namingPreferences.branches[0]).not.toBe(shared);
    expect(output.namingPreferences.branches[0]).not.toBe(output.namingPreferences.branches[1]);
    expect(output.namingPreferences.branches[0]).not.toBe(output.namingPreferences.other.leaf);
    output.namingPreferences.branches[0].text='changed';output.namingPreferences.branches[0].values.push(false);
    expect(input).toEqual(before);expect(output.namingPreferences.branches[1]).toEqual(shared);expect(output.namingPreferences.other.leaf).toEqual(shared);
  });
});

function descendants(node:ts.Node):ts.Node[]{
  const nodes:ts.Node[]=[];const visit=(current:ts.Node)=>{nodes.push(current);ts.forEachChild(current,visit);};visit(node);return nodes;
}
describe('M607 raw-copy and independently budgeted second-copy source contract',()=>{
  it('uses the new helper first in profileForPreview and returns a second helper copy before the Core walker',()=>{
    const file=new URL('../src/main/qiongtong-clause-reference-preview.ts',import.meta.url);
    const source=ts.createSourceFile('qiongtong-clause-reference-preview.ts',readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
    const fn=descendants(source).find((node):node is ts.FunctionDeclaration=>ts.isFunctionDeclaration(node)&&node.name?.text==='profileForPreview');
    if(!fn?.body)throw Error('Actual profileForPreview missing');
    const first=fn.body.statements[0],last=fn.body.statements.at(-1);
    if(!first||!ts.isVariableStatement(first)||first.declarationList.declarations.length!==1)throw Error('First profile operation must detach raw input');
    const declaration=first.declarationList.declarations[0];
    if(!declaration.initializer||!ts.isCallExpression(declaration.initializer))throw Error('Initial reader call missing');
    expect(declaration.initializer.expression.getText(source)).toBe('readQiongtongClausePreviewProfile');
    expect(declaration.initializer.arguments.map(node=>node.getText(source))).toEqual(['input']);
    if(!last||!ts.isReturnStatement(last)||!last.expression||!ts.isCallExpression(last.expression))throw Error('Independent second reader pass missing');
    expect(last.expression.expression.getText(source)).toBe('readQiongtongClausePreviewProfile');
    expect(last.expression.arguments.map(node=>node.getText(source))).toEqual([declaration.name.getText(source)]);
    const imports=source.statements.filter(ts.isImportDeclaration);
    expect(imports.some(node=>ts.isStringLiteral(node.moduleSpecifier)&&node.moduleSpecifier.text==='./qiongtong-preview-input')).toBe(true);
    expect(imports.some(node=>ts.isStringLiteral(node.moduleSpecifier)&&node.moduleSpecifier.text==='./geng-si-reference-preview')).toBe(false);
    for(const node of imports){
      if(node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings)){
        expect(node.importClause.namedBindings.elements.map(item=>(item.propertyName??item.name).text)).not.toContain('readGengSiPreviewProfile');
      }
    }
    const readerSource=ts.createSourceFile('qiongtong-preview-input.ts',readFileSync(new URL('../src/main/qiongtong-preview-input.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
    const reader=readerSource.statements.find((node):node is ts.FunctionDeclaration=>ts.isFunctionDeclaration(node)&&node.name?.text==='readQiongtongClausePreviewProfile');
    expect(reader?.parameters).toHaveLength(1);
  });
});
