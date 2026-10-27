import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {buildRootFeedbackV132Preview,createLazyRootFeedbackV132PreviewBuild,rootFeedbackV132PreviewOutput} from '../scripts/build-root-feedback-v132-preview.mjs';
import {copyPreviewInputs} from './helpers/root-feedback-v132-preview-fixture';
import {previewSourceSnapshot} from './helpers/root-feedback-preview-byte-snapshot';

const directory=fs.mkdtempSync(path.join(os.tmpdir(),'m780-preview-build-')),root=path.join(directory,'project');
const expectedSha='d01d2b51e10b48c3de361ab27de451dcb91670b71197a559f6fb8182215193fb';
beforeAll(()=>{copyPreviewInputs(root);});
afterAll(()=>fs.rmSync(directory,{recursive:true,force:true}));

describe('M780 official fixed preview build hook',()=>{
  it('builds the exact official CJS and receipt only inside dist-electron without changing sources or assets',async()=>{
    const sources=previewSourceSnapshot(root),file=rootFeedbackV132PreviewOutput(root);
    expect(file).toBe(path.join(root,'dist-electron/bazi-root-feedback/1.3.2-r2/root-feedback.cjs'));
    expect(fs.existsSync(file)).toBe(false);
    const receipt=await buildRootFeedbackV132Preview(root);
    expect(receipt.output).toEqual({file:'root-feedback.cjs',bytes:2233517,sha256:expectedSha});
    expect(createHash('sha256').update(fs.readFileSync(file)).digest('hex')).toBe(expectedSha);
    expect(JSON.parse(fs.readFileSync(file+'.receipt.json','utf8')).identity).toEqual(receipt.identity);
    expect(receipt.compiledExecutionSources).toHaveLength(133);
    expect(previewSourceSnapshot(root)).toEqual(sources);
    expect(fs.existsSync(path.join(root,'assets/bazi-root-feedback/1.3.2-r2/root-feedback.cjs'))).toBe(false);
  },30000);
  it('keeps dev hook construction lazy and rejects source drift even when an earlier valid output exists',async()=>{
    const file=rootFeedbackV132PreviewOutput(root),before=fs.readFileSync(file),source=path.join(root,'src/domain/engine.ts'),original=fs.readFileSync(source),hook=createLazyRootFeedbackV132PreviewBuild(root);
    expect(fs.readFileSync(file)).toEqual(before);
    try{fs.appendFileSync(source,'\n');await expect(hook()).rejects.toThrow('ROOT_FEEDBACK_V132_R2_SOURCE_MISMATCH');expect(fs.readFileSync(file)).toEqual(before);}finally{fs.writeFileSync(source,original);}
    const receipt=await hook();expect(receipt.output.sha256).toBe(expectedSha);
  },30000);
  it('wires the normal Electron script after sourcegate failure check and before other compiler output',()=>{
    const source=ts.createSourceFile('build-electron.mjs',fs.readFileSync(path.resolve('scripts/build-electron.mjs'),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
    const statements=[...source.statements];
    const gate=statements.findIndex(statement=>ts.isIfStatement(statement)&&statement.getText(source).includes("reviewResources.status!=='passed'"));
    const preview=statements.findIndex(statement=>statement.getText(source)==='await buildRootFeedbackV132Preview(process.cwd());');
    const firstCompiler=statements.findIndex(statement=>statement.getText(source).startsWith('await build({'));
    expect(gate).toBeGreaterThan(-1);expect(preview).toBeGreaterThan(gate);expect(firstCompiler).toBeGreaterThan(preview);
    const adapter=fs.readFileSync(path.resolve('src/main/bazi-root-feedback-v132-preview.ts'),'utf8');
    expect(adapter).not.toContain("from 'esbuild'");expect(adapter).not.toContain("import('./build-root-feedback");
  });
});
