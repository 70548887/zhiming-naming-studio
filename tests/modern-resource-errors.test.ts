import {describe,it,expect} from 'vitest';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyModernMethodResource,modernRecordBytes,originalReviewBytes,MODERN_SESSION_RECORD_BUDGET} from '../src/main/modern-practical-evidence';
import {MODERN_INTEGRATION_RELEASE} from '../src/shared/modern-practical-evidence';
describe('modern resource error boundary without any Store creation',()=>{
 it('fixed method resource is necessary but its missing-path error does not expose the local file tree',()=>{
  const root=resolve('.local/team-137/dev02/modern-evidence-integration/verification');mkdirSync(root,{recursive:true});const directory=mkdtempSync(join(root,'resource-only-'));
  expect(()=>verifyModernMethodResource(directory)).toThrow('资料缺失');
  try{verifyModernMethodResource(directory);}catch(error){expect(String(error)).not.toContain(directory);expect(String(error)).not.toContain('ENOENT');}
  const original=readFileSync(fileURLToPath(new URL('../data/modern-method-references.json',import.meta.url)));writeFileSync(join(directory,'modern-method-references.json'),original);expect(()=>verifyModernMethodResource(directory)).not.toThrow();
  writeFileSync(join(directory,'modern-method-references.json'),Buffer.concat([original,Buffer.from(' ')]));expect(()=>verifyModernMethodResource(directory)).toThrow('固定版本不一致');
 });
 it('staged integration is explicitly draft and is not production approval',()=>{expect(MODERN_INTEGRATION_RELEASE).toEqual({draft:true,productionApproved:false});});
 it('independent bounded report bytes never reduce the preexisting review payload budget',()=>{
  const input={id:'fixture',candidates:[{id:'a',meaning:'合法原字段',modernPracticalEvidence:{version:'fixture-unknown',text:'x'.repeat(1000)}}],reviewNote:'y'.repeat(500)} as any;
  const before=JSON.stringify(input),without=structuredClone(input);delete without.candidates[0].modernPracticalEvidence;
  expect(originalReviewBytes(input)).toBe(JSON.stringify(without).length);expect(modernRecordBytes(input)).toBe(JSON.stringify(input.candidates[0].modernPracticalEvidence).length);expect(JSON.stringify(input)).toBe(before);
  expect(MODERN_SESSION_RECORD_BUDGET+2000000).toBeLessThan(4000000);
 });
});
