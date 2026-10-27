import {describe,expect,it} from 'vitest';
import {resolveRenDependencies,type RenDependencyInput} from '../src/domain/ren-dependencies';
import {resolveRenDependencies as currentExport} from '../src/domain/ditian-ren';

const atom=(id:string,observed?:RenDependencyInput['observed']):RenDependencyInput=>({id,...(observed?{observed}:{}),premises:[],inhibitors:[]});
function permutations<T>(values:T[]):T[][]{return values.length?values.flatMap((value,index)=>permutations(values.filter((_,other)=>other!==index)).map(rest=>[value,...rest])):[[]];}

describe('order-independent four-valued evidence closure',()=>{
  it('propagates independent refutation around a cycle in every input and reference order',()=>{
    for(const premises of [['b','false'],['false','b']])for(const input of permutations<RenDependencyInput>([{id:'a',premises,inhibitors:[]},{id:'b',premises:['a'],inhibitors:[]},atom('false','not-met')])){
      const result=resolveRenDependencies(input);
      expect(result.a).toEqual({state:'not-met',cycleDetected:true});expect(result.b).toEqual({state:'not-met',cycleDetected:true});expect(result.false).toEqual({state:'not-met',cycleDetected:false});
    }
  });
  it('does not bootstrap pure positive, negative or self cycles',()=>{
    for(const input of [[{id:'a',premises:['b'],inhibitors:[]},{id:'b',premises:['a'],inhibitors:[]}],[{id:'a',premises:[],inhibitors:['b']},{id:'b',premises:[],inhibitors:['a']}],[{id:'a',premises:['a'],inhibitors:[]}],[{id:'a',premises:[],inhibitors:['a']}]] as RenDependencyInput[][]){
      for(const order of permutations(input))for(const value of Object.values(resolveRenDependencies(order)))expect(value).toEqual({state:'unknown',cycleDetected:true});
    }
  });
  it('uses an independent seed without losing cycle provenance, and retains negative-cycle contradiction',()=>{
    const positive=resolveRenDependencies([{...atom('a','met'),premises:['b']},{id:'b',premises:['a'],inhibitors:[]},{id:'consumer',premises:['b'],inhibitors:[]}]);
    for(const value of Object.values(positive))expect(value).toEqual({state:'met',cycleDetected:true});
    const negative=resolveRenDependencies([{...atom('a','met'),inhibitors:['b']},{id:'b',premises:[],inhibitors:['a']}]);
    expect(negative.a).toEqual({state:'met',cycleDetected:true});expect(negative.b).toEqual({state:'not-met',cycleDetected:true});
    const self=resolveRenDependencies([{...atom('a','met'),inhibitors:['a']}]);expect(self.a).toEqual({state:'conflict',cycleDetected:true});
  });
  it('distinguishes independent observations, derived support, blockers and explicit conflicts',()=>{
    const result=resolveRenDependencies([atom('p','met'),atom('absent','not-met'),atom('unknown','unknown'),atom('both','conflict'),{id:'supported',premises:['p'],inhibitors:['absent']},{...atom('contradiction','met'),inhibitors:['p']},{id:'propagated-conflict',premises:['both','p'],inhibitors:['absent']},{id:'unknown-blocker',premises:['p'],inhibitors:['unknown']},{id:'unsupported-absence',premises:[],inhibitors:['unknown']}]);
    expect(result.supported.state).toBe('met');expect(result.contradiction.state).toBe('conflict');expect(result['propagated-conflict'].state).toBe('conflict');expect(result['unknown-blocker'].state).toBe('unknown');expect(result['unsupported-absence'].state).toBe('unknown');
    expect(resolveRenDependencies([atom('empty'),atom('unknown','unknown')])).toEqual({empty:{state:'unknown',cycleDetected:false},unknown:{state:'unknown',cycleDetected:false}});
  });
  it('never promotes merely satisfied necessary conditions, but propagates their independent refutation',()=>{
    const result=resolveRenDependencies([atom('true','met'),atom('false','not-met'),{id:'necessary-satisfied',mode:'necessary-only',premises:['true'],inhibitors:[]},{id:'necessary-failed',mode:'necessary-only',premises:['false'],inhibitors:[]},{id:'necessary-blocked',mode:'necessary-only',premises:['true'],inhibitors:['true']},{...atom('observed-with-false-necessity','met'),mode:'necessary-only',premises:['false']}]);
    expect(result['necessary-satisfied'].state).toBe('unknown');expect(result['necessary-failed'].state).toBe('not-met');expect(result['necessary-blocked'].state).toBe('not-met');expect(result['observed-with-false-necessity'].state).toBe('conflict');
  });
  it('supports a sufficient rule only when all its dependencies qualify, without treating rule failure as refutation',()=>{
    const result=resolveRenDependencies([atom('true','met'),atom('false','not-met'),{id:'sufficient-satisfied',mode:'sufficient-only',premises:['true'],inhibitors:['false']},{id:'sufficient-failed',mode:'sufficient-only',premises:['false'],inhibitors:[]},{...atom('independent-against','not-met'),mode:'sufficient-only',premises:['true']}]);
    expect(result['sufficient-satisfied'].state).toBe('met');expect(result['sufficient-failed'].state).toBe('unknown');expect(result['independent-against'].state).toBe('conflict');
  });
  it('retains both sides without inferring unrelated propositions from conflict',()=>{
    const result=resolveRenDependencies([atom('both','conflict'),atom('unrelated'),atom('missing'),{id:'only-negative-evidence',premises:['both','missing'],inhibitors:[]}]);
    expect(result.both.state).toBe('conflict');expect(result.unrelated.state).toBe('unknown');expect(result['only-negative-evidence'].state).toBe('not-met');
  });
  it('exports the new solver explicitly while preserving the legacy module boundary',()=>{expect(currentExport).toBe(resolveRenDependencies);});
});

describe('dependency input identity, resources and strict JSON boundary',()=>{
  it('handles Object prototype names as real independent IDs',()=>{
    const result=resolveRenDependencies([atom('__proto__','met'),atom('constructor','not-met'),{id:'toString',premises:['__proto__'],inhibitors:['constructor']}]);
    expect(Object.hasOwn(result,'__proto__')).toBe(true);expect(result.__proto__).toEqual({state:'met',cycleDetected:false});expect(result.constructor).toEqual({state:'not-met',cycleDetected:false});expect(result.toString).toEqual({state:'met',cycleDetected:false});expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  });
  it('evaluates a 4096-node deep chain and multiple cycles without recursive stack dependence',()=>{
    const chain:Array<RenDependencyInput>=Array.from({length:4096},(_,index)=>index?{id:String(index),premises:[String(index-1)],inhibitors:[]}:atom('0','not-met'));
    const result=resolveRenDependencies(chain.reverse());expect(result['4095']).toEqual({state:'not-met',cycleDetected:false});
    const multi=resolveRenDependencies([{id:'a',premises:['b','c'],inhibitors:[]},{id:'b',premises:['a'],inhibitors:[]},{id:'c',premises:['d'],inhibitors:[]},{id:'d',premises:[],inhibitors:['c']}]);
    expect(Object.values(multi).every(value=>value.state==='unknown'&&value.cycleDetected)).toBe(true);
  });
  it('rejects missing references, duplicate IDs/references, unsupported fields, modes and values',()=>{
    const invalid:unknown[]=[[atom('a'),atom('a')],[{id:'a',premises:['missing'],inhibitors:[]}],[{id:'a',premises:['a','a'],inhibitors:[]}],[{...atom('a'),formed:true}],[{...atom('a'),source:'forged'}],[{...atom('a'),mode:'automatic'}],[{...atom('a'),observed:'false'}],[{...atom('a'),observed:undefined}],[{...atom('a'),id:' '}],[{...atom('a'),premises:[1]}],null,{},[undefined],[{...atom('a'),premises:[]} ,null]];
    for(const value of invalid)expect(()=>resolveRenDependencies(value as RenDependencyInput[])).toThrow();
    expect(()=>resolveRenDependencies([atom('a'),atom('a')])).toThrow('重复');expect(()=>resolveRenDependencies([{id:'a',premises:['missing'],inhibitors:[]}])).toThrow('引用');
    expect(()=>resolveRenDependencies(Array.from({length:4097},(_,index)=>atom(String(index))))).toThrow('4096');
    const tooMany=Array.from({length:257},(_,index)=>({...atom(String(index)),premises:Array.from({length:256},(_,other)=>String(other))}));expect(()=>resolveRenDependencies(tooMany)).toThrow('65536');
  });
  it('rejects getters without executing, sparse arrays, hidden fields, symbols, cycles and custom prototypes',()=>{
    let reads=0;const getter=atom('a');Object.defineProperty(getter,'observed',{get(){reads++;return'met';},enumerable:true});expect(()=>resolveRenDependencies([getter])).toThrow();expect(reads).toBe(0);
    const hidden=atom('a');Object.defineProperty(hidden,'source',{value:'forged'});const symbol=atom('a');(symbol as any)[Symbol('x')]=1;const cyclic=atom('a');(cyclic as any).extra=cyclic;const sparse=new Array<RenDependencyInput>(1),custom=Object.assign(Object.create({}),atom('a'));
    for(const input of [[hidden],[symbol],[cyclic],sparse,[custom]])expect(()=>resolveRenDependencies(input)).toThrow();
  });
  it('bounds oversized sparse dependency arrays before canonical enumeration or getter access',()=>{
    let reads=0;const oversized=new Array<string>(1_000_000_000);
    Object.defineProperty(oversized,'0',{get(){reads++;return'a';},enumerable:true});
    expect(()=>resolveRenDependencies([{id:'a',premises:oversized,inhibitors:[]}])).toThrow('65536');expect(reads).toBe(0);
  });
});
