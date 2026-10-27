export interface NumericInterval {lower:number;upper:number;}
const view=new DataView(new ArrayBuffer(8));
export function nextUp(value:number):number {
 if(Number.isNaN(value)||value===Infinity)return value;if(value===0)return Number.MIN_VALUE;
 view.setFloat64(0,value,false);let bits=view.getBigUint64(0,false);bits+=value>0?1n:-1n;view.setBigUint64(0,bits,false);return view.getFloat64(0,false);
}
export const nextDown=(value:number)=>-nextUp(-value);
export const point=(value:number):NumericInterval=>({lower:value,upper:value});
export function add(a:NumericInterval,b:NumericInterval):NumericInterval {if(a.lower===0&&a.upper===0)return{...b};if(b.lower===0&&b.upper===0)return{...a};return{lower:Math.max(0,nextDown(a.lower+b.lower)),upper:nextUp(a.upper+b.upper)};}
export function multiply(a:NumericInterval,b:NumericInterval):NumericInterval {if(a.upper===0||b.upper===0)return point(0);return{lower:Math.max(0,nextDown(a.lower*b.lower)),upper:nextUp(a.upper*b.upper)};}
export function divide(a:NumericInterval,b:NumericInterval):NumericInterval {if(!(b.lower>0))throw new Error('区间分母未被证明大于零');return{lower:Math.max(0,nextDown(a.lower/b.upper)),upper:nextUp(a.upper/b.lower)};}
export function sumIntervals(values:NumericInterval[]):NumericInterval{return values.reduce(add,point(0));}
export function difference(a:NumericInterval,b:NumericInterval):NumericInterval{return{lower:nextDown(a.lower-b.upper),upper:nextUp(a.upper-b.lower)};}
export type IntervalTruth='true'|'false'|'uncertain';
export function atLeast(value:NumericInterval,threshold:number):IntervalTruth {return value.lower>=threshold?'true':value.upper<threshold?'false':'uncertain';}
export function lessThan(value:NumericInterval,threshold:number):IntervalTruth{return value.upper<threshold?'true':value.lower>=threshold?'false':'uncertain';}
export function greaterThan(value:NumericInterval,threshold:number):IntervalTruth{return value.lower>threshold?'true':value.upper<=threshold?'false':'uncertain';}
