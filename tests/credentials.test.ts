import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EndpointSecretStorage, normalizeCredentialEndpoint, type SecretProtector } from '../src/main/credentials';

const dirs:string[]=[];
const protector:SecretProtector={isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from(Buffer.from(s).toString('base64')),decryptString:b=>Buffer.from(b.toString(),'base64').toString()};
function fixture(){const dir=mkdtempSync(join(tmpdir(),'naming-secret-'));dirs.push(dir);const path=join(dir,'key.protected');return {path,secret:new EndpointSecretStorage(path,protector)};}
afterEach(()=>{for(const dir of dirs.splice(0))rmSync(dir,{recursive:true,force:true});});
describe('endpoint bound protected credentials',()=>{
  it('canonicalizes aliases but distinguishes another host, scheme, port or API path',()=>{
    expect(normalizeCredentialEndpoint('HTTPS://EXAMPLE.COM:443/v1/')).toBe('https://example.com/v1/chat/completions');
    const {path,secret}=fixture();secret.write('fixture-key','https://example.com/v1/');
    expect(secret.read('https://EXAMPLE.com:443/v1/chat/completions')).toBe('fixture-key');
    for(const url of ['https://another.example/v1','http://example.com/v1','https://example.com:8080/v1','https://example.com/v2'])expect(secret.read(url)).toBe('');
    expect(secret.read()).toBe('');expect(readFileSync(path,'utf8')).not.toContain('fixture-key');
    const record=JSON.parse(protector.decryptString(readFileSync(path)));expect(record).toEqual({version:1,endpoint:'https://example.com/v1/chat/completions',key:'fixture-key'});
  });
  it('never silently rebinds a legacy bare key and explains how to recover',()=>{
    const {path,secret}=fixture();writeFileSync(path,protector.encryptString('legacy-unbound-key'));
    expect(secret.read('https://example.com/v1')).toBe('');expect(secret.warning()).toContain('重新填写');
    secret.write('replacement-key','https://example.com/v1');expect(secret.warning()).toBe('');expect(secret.read('https://example.com/v1')).toBe('replacement-key');
  });
  it('rejects invalid scopes and unavailable OS encryption without overwriting a saved key',()=>{
    const {path,secret}=fixture();secret.write('old','https://example.com/v1');const before=readFileSync(path);
    for(const scope of ['file:///tmp/secret','https://example.com/v1?key=x','https://u:p@example.com/v1'])expect(()=>secret.write('new',scope)).toThrow();
    expect(()=>secret.write('new')).toThrow('必须绑定');expect(readFileSync(path).equals(before)).toBe(true);
    const unavailable=new EndpointSecretStorage(path,{...protector,isEncryptionAvailable:()=>false});expect(()=>unavailable.write('new','https://example.com/v1')).toThrow('保护不可用');expect(readFileSync(path).equals(before)).toBe(true);
    secret.write('','https://example.com/v1');expect(secret.read('https://example.com/v1')).toBe('');
  });
  it('handles corrupt protected files without exposing their contents',()=>{
    const {path,secret}=fixture();writeFileSync(path,'broken');expect(secret.read('https://example.com/v1')).toBe('');expect(secret.warning()).toContain('重新填写');
  });
});
