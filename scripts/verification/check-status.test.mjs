import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {checkStatus} from './check-status.mjs';
function fixture(callback){const root=fs.mkdtempSync(path.join(os.tmpdir(),'studio-status-test-'));try{fs.mkdirSync(path.join(root,'docs'));fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({version:'1.0.35'}));fs.writeFileSync(path.join(root,'docs/CURRENT-STATUS.md'),'## 已交付：1.0.34\n[验收](../release/NamingStudio-1.0.34-verification.json)\n最近一次已交付版本的完整回归为 **192 个测试文件、2343 项通过**；不代表未发布修改。\n');return callback(root);}finally{fs.rmSync(root,{recursive:true,force:true});}}
test('clean source checkout validates current status without fabricating ignored release evidence',()=>fixture(root=>{const result=checkStatus(root);assert.equal(result.status,'passed');assert.equal(result.releaseEvidence,'not-present-in-source-checkout');assert.throws(()=>checkStatus(root,{requireReleaseEvidence:true}),/absent/);}));
test('actual published counts must match when a release record exists',()=>fixture(root=>{fs.mkdirSync(path.join(root,'release'));const manifest={version:'1.0.34',status:'local-verified-release',verification:{fullRegression:{files:192,tests:2343}}};const write=()=>fs.writeFileSync(path.join(root,'release/NamingStudio-1.0.34-verification.json'),JSON.stringify(manifest));write();assert.equal(checkStatus(root).releaseEvidence,'present-and-metadata-matched');manifest.verification.fullRegression.tests=2342;write();assert.throws(()=>checkStatus(root),/counts/);}));
test('old development references do not override a single explicit published heading',()=>fixture(root=>{fs.appendFileSync(path.join(root,'docs/CURRENT-STATUS.md'),'历史1.0.33/186文件2294项保持原口径。\n');assert.equal(checkStatus(root).publishedVersion,'1.0.34');fs.appendFileSync(path.join(root,'docs/CURRENT-STATUS.md'),'## 已交付：1.0.33\n');assert.throws(()=>checkStatus(root),/Multiple/);}));
