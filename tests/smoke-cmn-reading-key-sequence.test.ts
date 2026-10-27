import{describe,it,expect}from'vitest';import{sendCmnSmokeKeyboardSequence}from'../src/main/smoke-cmn-reading-ui';
describe('native key sender API boundary',()=>{
 it('uses a single actual CR character and preserves caller modifier data',()=>{
  const input:('shift')[]=['shift'],before=[...input],events:unknown[]=[],result=sendCmnSmokeKeyboardSequence({sendInputEvent:event=>{events.push(event);}},'Return',input);
  expect(result.map(e=>e.type)).toEqual(['keyDown','char','keyUp']);expect(result[1].keyCode.length).toBe(1);expect(result[1].keyCode.charCodeAt(0)).toBe(13);expect(input).toEqual(before);expect(events).toEqual(result);
 });
 it('preserves a real sender exception and does not pretend a failed character dispatch reached keyUp',()=>{
  const error=Error('actual sender refused char event'),types:string[]=[];expect(()=>sendCmnSmokeKeyboardSequence({sendInputEvent:event=>{types.push(event.type);if(event.type==='char')throw error;}},'Enter')).toThrow(error);expect(types).toEqual(['keyDown','char']);
 });
});
