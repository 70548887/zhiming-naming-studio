import {EventEmitter} from 'node:events';
import type {WebContents} from 'electron';
import {describe,it,expect,vi} from 'vitest';
import {withNamingV7Deadline,reloadNamingV7Page} from '../src/main/smoke-naming-v7-waits';

function contents(action:(events:EventEmitter)=>void=events=>{events.emit('did-finish-load');},destroyed=false){
 const events=new EventEmitter();
 const reload=vi.fn(()=>action(events));
 Object.assign(events,{reload,isDestroyed:()=>destroyed});
 return {events,reload,contents:events as unknown as WebContents};
}
const clean=(events:EventEmitter)=>expect(events.eventNames()).toEqual([]);

describe('Naming7 explicit smoke wait failure boundaries',()=>{
 it('returns the original resolved value',async()=>{const value={ok:true};expect(await withNamingV7Deadline('read',async()=>value,50)).toBe(value);});
 it('retains the original operation failure',async()=>{const error=new Error('actual renderer failure');await expect(withNamingV7Deadline('read',async()=>{throw error;},50)).rejects.toBe(error);});
 it('fails an unresolved operation with its stage instead of silently passing',async()=>{await expect(withNamingV7Deadline('capture-fonts-animations-frames:quoted',()=>new Promise(()=>{}),10)).rejects.toThrow('Naming7 smoke stage timed out after 10ms: capture-fonts-animations-frames:quoted');});
 it('does not invoke work with an invalid deadline',async()=>{const run=vi.fn(async()=>true);await expect(withNamingV7Deadline('read',run,0)).rejects.toThrow('positive timeout');expect(run).not.toHaveBeenCalled();});
 it('observes a synchronous reload completion and removes all temporary listeners',async()=>{const fixture=contents();await reloadNamingV7Page(fixture.contents,50);expect(fixture.reload).toHaveBeenCalledOnce();clean(fixture.events);});
 it('rejects the actual main-frame load error',async()=>{const fixture=contents(events=>events.emit('did-fail-load',{},-2,'ERR_FAILED','file:///app',true));await expect(reloadNamingV7Page(fixture.contents,50)).rejects.toThrow('reload failed (-2): ERR_FAILED');clean(fixture.events);});
 it('ignores a subframe load error while requiring the reload completion',async()=>{const fixture=contents(events=>{events.emit('did-fail-load',{},-2,'frame error','file:///frame',false);events.emit('did-finish-load');});await reloadNamingV7Page(fixture.contents,50);clean(fixture.events);});
 it('rejects destruction while the reload is pending',async()=>{const fixture=contents(events=>events.emit('destroyed'));await expect(reloadNamingV7Page(fixture.contents,50)).rejects.toThrow('destroyed before completion');clean(fixture.events);});
 it('rejects reload timeout and removes listeners without authorizing prevented unload',async()=>{const fixture=contents(events=>events.emit('will-prevent-unload',{preventDefault:()=>{throw new Error('Must not auto-discard unsaved input');}}));await expect(reloadNamingV7Page(fixture.contents,10)).rejects.toThrow('reload:did-finish-load');clean(fixture.events);});
 it('refuses to reload already destroyed contents',async()=>{const fixture=contents(undefined,true);await expect(reloadNamingV7Page(fixture.contents,50)).rejects.toThrow('already destroyed');expect(fixture.reload).not.toHaveBeenCalled();clean(fixture.events);});
 it('cleans listeners when the underlying reload throws',async()=>{const error=new Error('actual reload threw'),fixture=contents(()=>{throw error;});await expect(reloadNamingV7Page(fixture.contents,50)).rejects.toBe(error);clean(fixture.events);});
});
