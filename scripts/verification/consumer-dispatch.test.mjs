// Consumer-only mocks: no SQLite, Store, application, command capture or native run.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {verifyEvidence,verifyDesktop176AssemblyEvidence} from './release-evidence.mjs';
import {DESKTOP176_SQL_SCHEMA,LEGACY_SQL_SCHEMA} from './desktop176-sql-consumer.mjs';

function component(schema,version='1.0.37'){
 const sql={schema,expectedVersion:version,ok:true,status:'passed',runtimeVerified:true,failures:[],summary:{ok:true,failureCount:0,actualSessionBindings:1,pdfCount:1},bindings:[{completeCurrentSqlJsonEqual:true}],historyBindings:[],archiveBindings:[{contentHashExact:true}],pdfs:[{}],database:{sessions:1,revisions:0,archives:1}};
 const ref={file:path.resolve('consumer-only-sql.json'),sha256:'a'.repeat(64)};
 return{root:path.resolve('consumer-only-project'),pkg:{name:'synthetic-consumer-component',version},record:{version,verification:{evidenceSchema:'naming-studio-release-verification/1',installedRuntime:ref}},strictLocal:true,sourceInventory:[],packagedInventory:[],loadRef:async()=>JSON.stringify(sql),compare:async()=>({sha256:'a'.repeat(64),bytes:1})};
}
const rejectedSchema=result=>result.pending.some(row=>row.check==='verification.installedRuntime.schema');

test('default unphased old37 base retains installed-sql schema acceptance',async()=>{
 const result=await verifyEvidence(component(LEGACY_SQL_SCHEMA));assert.equal(rejectedSchema(result),false);
});
test('default unphased base rejects a new SQL schema even with a public override field',async()=>{
 const args=component(DESKTOP176_SQL_SCHEMA);args.expectedSqlSchema=DESKTOP176_SQL_SCHEMA;
 assert.equal(rejectedSchema(await verifyEvidence(args)),true);
});
test('desktop176 assembly export rejects old versions before any mocked reads',async()=>{
 const args=component(LEGACY_SQL_SCHEMA);args.loadRef=async()=>{throw Error('should not read');};
 await assert.rejects(verifyDesktop176AssemblyEvidence(args),/exact1\.0\.38/);
});
test('desktop176 assembly export rejects old SQL instead of coercing its schema',async()=>{
 const result=await verifyDesktop176AssemblyEvidence(component(LEGACY_SQL_SCHEMA,'1.0.38'));
 assert.equal(rejectedSchema(result),true);assert.ok(result.errors.some(row=>row.check==='desktop176-final-strong-sql'));
});
test('desktop176 assembly export keeps incomplete new proof unverified',async()=>{
 const result=await verifyDesktop176AssemblyEvidence(component(DESKTOP176_SQL_SCHEMA,'1.0.38'));
 assert.ok(result.errors.some(row=>row.check==='desktop176-final-strong-sql'));
});
