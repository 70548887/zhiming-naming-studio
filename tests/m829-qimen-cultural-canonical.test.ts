import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {ownCulturalJson,culturalCanonicalJson,culturalCanonicalDigest,culturalChartDigest} from '../src/domain/qimen-cultural-comparison-canonical';
import {CULTURAL_CANONICAL_ALGORITHM,LEGACY_CHART_DIGEST_ALGORITHM} from '../src/shared/qimen-cultural-comparison';
import chartFixture from './fixtures/name-imagery-known-chart.json';

const sha=(text:string)=>createHash('sha256').update(text,'utf8').digest('hex');
describe('M829 deterministic cultural JSON boundary, not source or capsule authentication',()=>{
 it('emits numeric-looking object keys in UTF16 lexical order without rebuilding an integer-indexed object',()=>{
  const input={'2':'two','10':'ten',a:{'2':2,'10':10}};
  const expected='{"10":"ten","2":"two","a":{"10":10,"2":2}}';
  expect(culturalCanonicalJson(input)).toBe(expected);expect(culturalCanonicalDigest(input)).toBe(sha(expected));
  expect(culturalCanonicalJson({a:{'10':10,'2':2},'10':'ten','2':'two'})).toBe(expected);
 });

 it('uses UTF16 code-unit key ordering and keeps distinct Unicode strings without normalization',()=>{
  const supplementary='\u{10000}',bmp='\uE000';
  const input={[bmp]:'bmp',[supplementary]:'supplementary','é':'composed','e\u0301':'decomposed'};
  const expected='{"é":"decomposed","é":"composed","𐀀":"supplementary","":"bmp"}';
  expect(culturalCanonicalJson(input)).toBe(expected);
  expect(culturalCanonicalDigest(input)).toBe(sha(expected));
  expect(culturalCanonicalDigest({value:'é'})).not.toBe(culturalCanonicalDigest({value:'e\u0301'}));
 });

 it('preserves array order and canonical ECMAScript numeric tokens',()=>{
  expect(culturalCanonicalJson([10,2,1e-7,1e21])).toBe('[10,2,1e-7,1e+21]');
  expect(culturalCanonicalDigest([10,2])).not.toBe(culturalCanonicalDigest([2,10]));
 });

 it('keeps the actual saved-chart legacy digest separate from the new canonical algorithm',()=>{
  const chart=structuredClone(chartFixture.chart),legacy=culturalChartDigest(chart,LEGACY_CHART_DIGEST_ALGORITHM);
  expect(legacy).toEqual({algorithm:LEGACY_CHART_DIGEST_ALGORITHM,digest:chartFixture.sourceChartSha});
  expect(legacy.digest).toBe(sha(JSON.stringify(chart)));
  const canonical=culturalChartDigest(chart,CULTURAL_CANONICAL_ALGORITHM);
  expect(canonical.digest).toBe(culturalCanonicalDigest(chart));expect(canonical.digest).not.toBe(legacy.digest);
  const reversed=Object.fromEntries(Object.entries(chart).reverse());
  expect(culturalChartDigest(reversed,CULTURAL_CANONICAL_ALGORITHM)).toEqual(canonical);
  expect(culturalChartDigest(reversed,LEGACY_CHART_DIGEST_ALGORITHM).digest).not.toBe(legacy.digest);
  expect(()=>culturalChartDigest(chart,'unknown-algorithm' as never)).toThrow('CULTURAL_DIGEST_UNSUPPORTED');
 });

 it('owns a deeply frozen detached JSON tree, preserving safe own __proto__ data and DAG occurrences',()=>{
  const shared={x:['水']},input={left:shared,right:shared};
  const copy=ownCulturalJson<typeof input>(input);
  expect(copy).toEqual(input);expect(copy).not.toBe(input);expect(copy.left).not.toBe(shared);expect(copy.left).not.toBe(copy.right);
  expect(Object.isFrozen(copy)).toBe(true);expect(Object.isFrozen(copy.left.x)).toBe(true);
  shared.x[0]='火';expect(copy.left.x).toEqual(['水']);
  const nullProto=Object.create(null);Object.defineProperty(nullProto,'__proto__',{value:{polluted:'inert'},enumerable:true});
  const owned=ownCulturalJson<Record<string,unknown>>(nullProto);
  expect(Object.getPrototypeOf(owned)).toBe(Object.prototype);expect(Object.hasOwn(owned,'__proto__')).toBe(true);
  expect(({} as Record<string,unknown>).polluted).toBeUndefined();
  expect(culturalCanonicalJson(nullProto)).toBe('{"__proto__":{"polluted":"inert"}}');
 });

 it.each([
  {name:'NaN',value:NaN},{name:'positive infinity',value:Infinity},{name:'negative infinity',value:-Infinity},
  {name:'negative zero',value:-0},{name:'undefined',value:undefined},{name:'function',value:()=>1},
  {name:'bigint',value:1n},{name:'symbol',value:Symbol('not-json')},{name:'Date',value:new Date('2026-10-25T00:00:00Z')},
 ])('rejects $name rather than coercing or omitting it',({value})=>{
  expect(()=>ownCulturalJson(value)).toThrow('CULTURAL_JSON_INVALID');
  expect(()=>culturalCanonicalDigest({nested:value})).toThrow('CULTURAL_JSON_INVALID');
 });

 it('rejects object accessors, hidden/symbol fields and serializers without invoking their code',()=>{
  let getters=0,serializers=0;const accessor={};Object.defineProperty(accessor,'x',{enumerable:true,get(){getters++;return 1;}});
  const hidden={};Object.defineProperty(hidden,'x',{value:1,enumerable:false});
  const symbol={[Symbol('x')]:1},serializer={toJSON(){serializers++;return{};}};
  for(const input of [accessor,hidden,symbol,serializer,{x:undefined}])expect(()=>culturalCanonicalJson(input)).toThrow('CULTURAL_JSON_INVALID');
  expect({getters,serializers}).toEqual({getters:0,serializers:0});
 });

 it('rejects sparse, accessor and extra-field arrays, cycles and excessive nesting',()=>{
  let getters=0;const sparse=[1,2];delete sparse[0];
  const accessor=[1];Object.defineProperty(accessor,'0',{enumerable:true,get(){getters++;return 1;}});
  const extra=Object.assign([1],{other:2}),cyclic:any={};cyclic.self=cyclic;
  let deep:unknown=1;for(let index=0;index<70;index++)deep={next:deep};
  for(const input of [sparse,accessor,extra,cyclic,deep])expect(()=>ownCulturalJson(input)).toThrow('CULTURAL_JSON_INVALID');
  expect(getters).toBe(0);
 });

 it('rejects nested and revoked proxies before every ordinary get or reflection trap',()=>{
  const traps={get:0,ownKeys:0,getOwnPropertyDescriptor:0,getPrototypeOf:0};
  const proxy=new Proxy({value:1},{
   get(target,key,receiver){traps.get++;return Reflect.get(target,key,receiver);},
   ownKeys(target){traps.ownKeys++;return Reflect.ownKeys(target);},
   getOwnPropertyDescriptor(target,key){traps.getOwnPropertyDescriptor++;return Reflect.getOwnPropertyDescriptor(target,key);},
   getPrototypeOf(target){traps.getPrototypeOf++;return Reflect.getPrototypeOf(target);},
  });
  expect(()=>ownCulturalJson({nested:proxy})).toThrow('CULTURAL_JSON_INVALID');
  expect(traps).toEqual({get:0,ownKeys:0,getOwnPropertyDescriptor:0,getPrototypeOf:0});
  const revoked=Proxy.revocable({},{});revoked.revoke();expect(()=>ownCulturalJson({nested:revoked.proxy})).toThrow('CULTURAL_JSON_INVALID');
 });
});
