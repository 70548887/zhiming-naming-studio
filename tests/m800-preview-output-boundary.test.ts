import {afterAll,describe,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildRootFeedbackV132Preview,createLazyRootFeedbackV132PreviewBuild,rootFeedbackV132PreviewOutput} from '../scripts/build-root-feedback-v132-preview.mjs';
import {copyPreviewInputs} from './helpers/root-feedback-v132-preview-fixture';
import {previewSourceSnapshot} from './helpers/root-feedback-preview-byte-snapshot';

const parent=fs.realpathSync.native(os.tmpdir()),scratch=fs.realpathSync.native(fs.mkdtempSync(path.join(parent,'m800-output-boundary-')));
const expectedSha='d01d2b51e10b48c3de361ab27de451dcb91670b71197a559f6fb8182215193fb';
const sha=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
function fixture(name:string){const root=path.join(scratch,name);copyPreviewInputs(root);return fs.realpathSync.native(root);}
function assertNoWrites(){return{write:vi.spyOn(fs,'writeFileSync'),mkdir:vi.spyOn(fs,'mkdirSync'),rename:vi.spyOn(fs,'renameSync')};}
afterAll(()=>{
  if(path.relative(parent,scratch).startsWith('..')||!path.basename(scratch).startsWith('m800-output-boundary-'))throw Error('Unsafe test cleanup');
  fs.rmSync(scratch,{recursive:true,force:true});
});

describe('M800 physical preview output boundary',()=>{
  it('rejects the original bazi-root-feedback junction into assets before any write and retains every protected member/byte',async()=>{
    const root=fixture('original-assets-junction'),before=previewSourceSnapshot(root),dist=path.join(root,'dist-electron'),link=path.join(dist,'bazi-root-feedback');
    fs.mkdirSync(dist);fs.symlinkSync(path.join(root,'assets/bazi-root-feedback'),link,'junction');
    const spies=assertNoWrites();
    try{
      await expect(buildRootFeedbackV132Preview(root)).rejects.toThrow('unsafe output path: linked or non-directory output segment');
      expect(spies.write).not.toHaveBeenCalled();expect(spies.mkdir).not.toHaveBeenCalled();expect(spies.rename).not.toHaveBeenCalled();
    }finally{vi.restoreAllMocks();}
    expect(previewSourceSnapshot(root)).toEqual(before);
    expect(fs.existsSync(path.join(root,'assets/bazi-root-feedback/1.3.2-r2/root-feedback.cjs'))).toBe(false);
    expect(fs.existsSync(path.join(root,'assets/bazi-root-feedback/1.3.2-r2/root-feedback.cjs.receipt.json'))).toBe(false);
    console.log(JSON.stringify({scenario:'original-junction-to-assets',rejected:true,outputWrites:0,protectedFiles:before.length,protectedMembershipAndBytesUnchanged:true,snapshotSha256:sha(JSON.stringify(before))}));
    fs.unlinkSync(link);
  });

  it.each(['dist-root','publication-directory'] as const)('rejects a %s junction to an external directory',async kind=>{
    const root=fixture('external-'+kind),external=path.join(scratch,'external-target-'+kind),before=previewSourceSnapshot(root);
    fs.mkdirSync(external);fs.writeFileSync(path.join(external,'sentinel'),'external-original');
    const link=kind==='dist-root'?path.join(root,'dist-electron'):path.join(root,'dist-electron/bazi-root-feedback/1.3.2-r2');
    fs.mkdirSync(path.dirname(link),{recursive:true});fs.symlinkSync(external,link,'junction');
    await expect(buildRootFeedbackV132Preview(root)).rejects.toThrow('unsafe output path');
    expect(fs.readdirSync(external)).toEqual(['sentinel']);expect(fs.readFileSync(path.join(external,'sentinel'),'utf8')).toBe('external-original');
    expect(previewSourceSnapshot(root)).toEqual(before);fs.unlinkSync(link);
  });

  it.each(['','.tmp','.receipt.json','.receipt.json.tmp'])('rejects existing linked output leaf %s',async suffix=>{
    const root=fixture('linked-leaf-'+(suffix||'bundle')),file=rootFeedbackV132PreviewOutput(root),before=previewSourceSnapshot(root),target=path.join(root,'assets/bazi-root-feedback/1.3.2-r2/resource-manifest.json');
    fs.mkdirSync(path.dirname(file),{recursive:true});fs.symlinkSync(target,file+suffix,'file');
    await expect(buildRootFeedbackV132Preview(root)).rejects.toThrow('unsafe output path: linked or non-regular output file');
    expect(previewSourceSnapshot(root)).toEqual(before);fs.unlinkSync(file+suffix);
  });

  it('rejects a hard-linked temporary slot instead of truncating the protected resource',async()=>{
    const root=fixture('hard-linked-temp'),file=rootFeedbackV132PreviewOutput(root),before=previewSourceSnapshot(root),target=path.join(root,'assets/bazi-root-feedback/1.3.2-r2/resource-manifest.json');
    fs.mkdirSync(path.dirname(file),{recursive:true});fs.linkSync(target,file+'.tmp');
    await expect(buildRootFeedbackV132Preview(root)).rejects.toThrow('unsafe output path: linked or non-regular output file');
    expect(previewSourceSnapshot(root)).toEqual(before);fs.unlinkSync(file+'.tmp');
  });

  it('anchors a normal cold build to the physical project root and preserves exact official bytes',async()=>{
    const root=fixture('normal-cold'),alias=path.join(scratch,'normal-project-alias'),before=previewSourceSnapshot(root);
    fs.symlinkSync(root,alias,'junction');
    const file=rootFeedbackV132PreviewOutput(alias);expect(file).toBe(path.join(root,'dist-electron/bazi-root-feedback/1.3.2-r2/root-feedback.cjs'));
    const receipt=await buildRootFeedbackV132Preview(alias);
    expect(receipt.output).toEqual({file:'root-feedback.cjs',bytes:2233517,sha256:expectedSha});expect(sha(fs.readFileSync(file))).toBe(expectedSha);
    expect(previewSourceSnapshot(root)).toEqual(before);
    console.log(JSON.stringify({scenario:'physical-root-cold-build',output:receipt.output,fullClosureSha256:receipt.identity.fullClosureSha256,protectedMembershipAndBytesUnchanged:true}));
    fs.unlinkSync(alias);
  },30000);

  it('shares alias failures, retries after removing the junction, and shares receipt-publication failure recovery',async()=>{
    const root=fixture('shared-retry'),file=rootFeedbackV132PreviewOutput(root),dist=path.join(root,'dist-electron'),link=path.join(dist,'bazi-root-feedback'),before=previewSourceSnapshot(root),hook=createLazyRootFeedbackV132PreviewBuild(root);
    fs.mkdirSync(dist);fs.symlinkSync(path.join(root,'assets/bazi-root-feedback'),link,'junction');
    const rejected=await Promise.allSettled([hook(),hook()]);
    expect(rejected.every(row=>row.status==='rejected')).toBe(true);
    if(rejected[0].status!=='rejected'||rejected[1].status!=='rejected')throw Error('Alias must be rejected');
    expect(rejected[0].reason).toBe(rejected[1].reason);expect(rejected[0].reason.message).toContain('unsafe output path');
    expect(previewSourceSnapshot(root)).toEqual(before);fs.unlinkSync(link);
    const originalWrite=fs.writeFileSync,originalRename=fs.renameSync;let writes=0,injected=0;
    vi.spyOn(fs,'writeFileSync').mockImplementation(((target:fs.PathOrFileDescriptor,...args:unknown[])=>{if(String(target)===file+'.tmp')writes++;return(originalWrite as Function)(target,...args);}) as typeof fs.writeFileSync);
    vi.spyOn(fs,'renameSync').mockImplementation((from,to)=>{if(String(to)===file+'.receipt.json'&&injected++===0)throw Object.assign(new Error('M800 injected receipt rename EACCES'),{code:'EACCES'});return originalRename(from,to);});
    try{
      const failures=await Promise.allSettled([hook(),hook()]);expect(failures.every(row=>row.status==='rejected')).toBe(true);expect(writes).toBe(1);
      if(failures[0].status!=='rejected'||failures[1].status!=='rejected')throw Error('Injected failure must reject');expect(failures[0].reason).toBe(failures[1].reason);
      const recovered=await Promise.all([hook(),hook()]);expect(writes).toBe(2);expect(recovered.every(row=>row.output.sha256===expectedSha)).toBe(true);
      await Promise.all([hook(),hook()]);expect(writes).toBe(2);expect(sha(fs.readFileSync(file))).toBe(expectedSha);
      expect(fs.existsSync(file+'.tmp')).toBe(false);expect(fs.existsSync(file+'.receipt.json.tmp')).toBe(false);
      console.log(JSON.stringify({scenario:'shared-alias-and-publication-failure-retry',aliasRejections:2,receiptFailureRejections:2,retrySuccesses:2,bundleWrites:2,warmRebuilt:false,protectedMembershipAndBytesUnchanged:true}));
    }finally{vi.restoreAllMocks();}
    expect(previewSourceSnapshot(root)).toEqual(before);
  },30000);
});
