import {afterEach,describe,expect,it} from 'vitest';import fs from 'node:fs';import path from 'node:path';
import {hash,nativeCase,loadWriter,interleave} from './helpers/naming-v7-native-harness';import type {NativeCase} from './helpers/naming-v7-native-harness';
const cases:NativeCase[]=[];const make=(label:string)=>{const value=nativeCase(label);cases.push(value);return value;};afterEach(()=>{for(const value of cases.splice(0).reverse())value.cleanup();});
describe('naming-v7 actual Windows native artifact writer',()=>{
 it('rejects a successful pre-lock OUT or ancestor swap before opening any artifact byte',async()=>{
  for(const mode of ['out','ancestor'] as const){const value=make('pre-lock-swap-'+mode),result=await interleave(value,'before-locks',mode);expect(result.actorStderr).toBe('');expect(result.actor.actorError).toBeUndefined();expect(result.actor.gateSeen).toBe(true);expect(result.actor.mutationSucceeded).toBe(true);expect(result.error).toContain('Expected an ordinary directory');expect(result.externalFiles).toEqual([]);expect(fs.existsSync(result.destination)).toBe(false);expect(result.input).toBe('CONTROLLED_NATIVE_INPUT');}
 },30000);
 it('writes exact bytes by the production helper and rejects duplicate targets without changing the old artifact',()=>{
  const value=make('normal'),writer=loadWriter(),file=path.join(value.out,'artifact.json'),bytes=Buffer.from('NATIVE_NORMAL_ACTUAL_BYTES');writer.write(value.nodes,file,bytes);expect(fs.readFileSync(file)).toEqual(bytes);
  expect(()=>writer.write(value.nodes,file,Buffer.from('replacement'))).toThrow();expect(fs.readFileSync(file)).toEqual(bytes);expect(fs.readdirSync(value.out)).toEqual(['artifact.json']);
 },30000);
 it('blocks OUT and ancestor substitution at all three exact native write boundaries',async()=>{
  for(const point of ['before-open','before-write','before-rename'] as const)for(const mode of ['out','ancestor'] as const){const value=make(point+'-'+mode),result=await interleave(value,point,mode);expect(result.actorStderr).toBe('');expect(result.actor.actorError).toBeUndefined();expect(result.actor.gateSeen).toBe(true);expect(result.actor.mutationSucceeded).toBe(false);expect(result.actor.error).toBeGreaterThan(0);expect(result.error).toBe('');expect(fs.readFileSync(result.destination)).toEqual(result.bytes);expect(result.alternateEntries).toEqual(['out']);expect(result.input).toBe('CONTROLLED_NATIVE_INPUT');}
 },90000);
 it('keeps the exclusive temporary handle across write and rename so external temporary-leaf replacement fails',async()=>{
  for(const point of ['before-write','before-rename'] as const){const value=make(point+'-temp'),result=await interleave(value,point,'temp');expect(result.actor.actorError).toBeUndefined();expect(result.actor.gateSeen).toBe(true);expect(result.actor.mutationSucceeded).toBe(false);expect(result.actor.error).toBeGreaterThan(0);expect(result.error).toBe('');expect(fs.readFileSync(result.destination)).toEqual(result.bytes);expect(result.input).toBe('CONTROLLED_NATIVE_INPUT');expect(fs.readdirSync(value.out)).toEqual(['race-artifact.json']);}
 },30000);
 it('fails closed before any artifact when a competing writable directory handle already exists',async()=>{
  const value=make('held-writer'),result=await interleave(value,'before-locks','hold-write');expect(result.actor.actorError).toBeUndefined();expect(result.actor.gateSeen).toBe(true);expect(result.actor.mutationSucceeded).toBe(true);expect(result.error).toContain('Lock directory');expect(fs.readdirSync(value.out)).toEqual([]);expect(result.input).toBe('CONTROLLED_NATIVE_INPUT');
 },30000);
 it('transfers the actual fixed 11MB legacy SQLite over production stdin and preserves length and SHA in its own OUT',()=>{
  const value=make('real-11mb'),source=path.resolve('tests/fixtures/naming-session-1.0.34.sqlite'),bytes=fs.readFileSync(source),sourceHash=hash(bytes);expect(bytes.length).toBe(11005952);expect(sourceHash).toBe('4b59b59967c9774c8e2064aff2cab6a4e705856c907c0e69cf4e8c8b077bf3f7');const file=path.join(value.out,'controlled-backup.sqlite');loadWriter().write(value.nodes,file,bytes);const output=fs.readFileSync(file);expect(output.length).toBe(bytes.length);expect(hash(output)).toBe(sourceHash);expect(hash(fs.readFileSync(source))).toBe(sourceHash);
 },60000);
});
