import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {inflateRawSync} from 'node:zlib';
import initSqlJs from 'sql.js';
import {bindCompactCustomerDatabase} from '../.local/m925/compact-diagnostic-helper.mjs';
const root=path.resolve(process.argv[2]??''),ids=process.argv.slice(3);
if(ids.length!==4)throw Error('Four runs required');
const SQL=await initSqlJs({locateFile:()=>createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm')});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const encode=value=>JSON.stringify(value,(_key,item)=>item instanceof Uint8Array?{bytes:item.length,sha256:hash(item)}:item);
const values=[];
for(const id of ids){const db=new SQL.Database(fs.readFileSync(path.join(root,'runs',id,'customer','customers.sqlite')));bindCompactCustomerDatabase(db);try{
 const tables={};
 for(const [type,name]of db.exec("SELECT type,name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name")[0].values){
  if(!/^[a-z_]+$/.test(name))throw Error('Unexpected restored identifier');
  const result=db.exec('SELECT * FROM '+name)[0]??{columns:[],values:[]};
  const rows=result.values.map(row=>encode(row)).sort();tables[name]={type,columns:result.columns,count:rows.length,sha256:hash(JSON.stringify(rows)),rows:result.values};
 }
 // Store.prepareCustomerRestore deliberately rotates ONLY the current session
 // and cultural-head tokens. Verify the exact resulting manifest/hash changes;
 // never discard a table or normalize immutable history/source payload bytes.
 const placeholder='00000000-0000-4000-8000-000000000000',tokens=[],roots=new Map(),sessionJson=new Map(),manifests=new Map();
 const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
 for(const cells of tables.sessions.rows){
  const json=cells[2],session=JSON.parse(json),token=session.reviewToken;
  if(!uuid(token)||json.split(token).length!==2)throw Error('Expected exactly one current reviewToken');tokens.push(token);
  const record=tables.session_records.rows.find(row=>row[0]===cells[1]);
  if(!record||hash(json)!==record[2])throw Error('Current session physical root binding differs');
  const normalized=json.replace(token,placeholder);sessionJson.set(cells[1],normalized);roots.set(record[2],hash(normalized));
  const physical=tables.snapshot_roots.rows.find(row=>row[0]===record[2]);if(!physical)throw Error('Current session root missing');
  const manifest=inflateRawSync(physical[5],{maxOutputLength:physical[2]}).toString('utf8');
  if(Buffer.byteLength(manifest)!==physical[2]||hash(manifest)!==physical[3]||manifest.split(token).length!==2)throw Error('Actual manifest token/hash binding differs');
  manifests.set(record[2],manifest.replace(token,placeholder));
 }
 for(const cells of tables.cultural_comparisons.rows){if(!uuid(cells[4]))throw Error('Expected current cultural head token');tokens.push(cells[4]);}
 for(const [name,table]of Object.entries(tables)){
  const normalized=table.rows.map(source=>{const row=[...source];
   if(name==='sessions')row[2]=sessionJson.get(row[1]);
   if(name==='cultural_comparisons')row[4]=placeholder;
   if(name==='session_records'&&roots.has(row[2]))row[2]=roots.get(row[2]);
   if(name==='root_leaf_refs'&&roots.has(row[0]))row[0]=roots.get(row[0]);
   if(name==='snapshot_roots'&&roots.has(row[0])){const text=manifests.get(row[0]);row[0]=roots.get(row[0]);row[3]=hash(text);row[5]={normalizedManifestSha256:hash(text),rawBytes:Buffer.byteLength(text)};}
   return encode(row);
  }).sort();table.normalizedSha256=hash(JSON.stringify(normalized));
 }
 values.push({id,tables,tokens});
}finally{db.close();}}
const differences=[];
for(const [name,original]of Object.entries(values[0].tables)){
 const snapshots=values.map(row=>({id:row.id,...row.tables[name]}));
 if(new Set(snapshots.map(row=>row.sha256)).size>1)differences.push({table:name,columns:original.columns,runs:snapshots.map(({rows,...item})=>item),differingColumns:original.columns.filter((_column,index)=>new Set(snapshots.map(row=>encode(row.rows.map(cells=>cells[index])))).size>1)});
}
const normalizedTables=Object.keys(values[0].tables).map(name=>({table:name,sha256:values[0].tables[name].normalizedSha256,equal:values.every(row=>row.tables[name].normalizedSha256===values[0].tables[name].normalizedSha256)}));
const allTokens=values.flatMap(row=>row.tokens),uniqueRotatedTokens=new Set(allTokens).size===allTokens.length;
const passed=normalizedTables.every(row=>row.equal)&&uniqueRotatedTokens;
const output=path.join(root,'restored-content-differences.json');fs.writeFileSync(output+'.tmp',JSON.stringify({schema:'m925-restored-content-diagnostic/1',runs:ids,passed,physicalOutputBytesEqual:false,scope:'Exact rows/bytes across every table/view; only current tokens and their validated root/manifest/hash references normalized. Immutable revisions, source chunks and receipts compared exactly.',uniqueRotatedTokens,normalizedTables,differences},null,2)+'\n');fs.renameSync(output+'.tmp',output);
console.log(JSON.stringify({passed,uniqueRotatedTokens,physicalOutputBytesEqual:false,differences:differences.map(({runs,...row})=>row)}));
if(!passed)throw Error('Output differs beyond validated current permission token rotation');
