import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {loadFixedMoeRows,moeTitleLookup} from '../scripts/fixed-moe-index.mjs';
import {loadNamingEditorialV5Data} from '../src/main/naming-editorial-v5-data';
import {loadNamingEditorialV6Data} from '../src/main/naming-editorial-v6-data';

const data=resolve('data');
const json=(name:string)=>JSON.parse(readFileSync(join(data,name),'utf8'));

describe('M475 actual source loaders',()=>{
 it('keeps V5 and V6 output and source gates while sharing only fixed MOE data',()=>{
  const gzip=readFileSync(join(data,'raw/moe-revised.json.gz'));
  const fixed=loadFixedMoeRows(gzip),lookup=moeTitleLookup(fixed);
  for(const load of [loadNamingEditorialV5Data,loadNamingEditorialV6Data]){
   const first=load(data),second=load(data);
   const version=load===loadNamingEditorialV5Data?'v5':'v6';
   expect(first.table).toEqual(json(`naming-editorial-${version}.json`));
   expect(second).toEqual(first);
   expect(first.sources).toHaveLength(1);
   expect(Object.isFrozen(first.table)).toBe(true);
   expect(moeTitleLookup(loadFixedMoeRows(gzip))).toBe(lookup);
  }
 },30_000);
});
