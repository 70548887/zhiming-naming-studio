import {afterEach,describe,expect,it} from 'vitest';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {loadMonthlySeasonalData} from '../src/main/monthly-seasonal-data';
import {monthlySeasonalKnowledge,MONTHLY_SEASONAL_KNOWLEDGE_CATEGORY} from '../src/main/monthly-seasonal-knowledge';

const resources:{store:Store;directory:string}[]=[];
afterEach(()=>{for(const {store,directory} of resources.splice(0)){store.db.close();rmSync(directory,{recursive:true,force:true});}});
describe('independent fixed classic knowledge search', { timeout: 15_000 },()=>{
 it('creates 120 uniquely identified source-backed entries while retaining pending cases and clean display quotes',()=>{
  const {table}=loadMonthlySeasonalData(resolve('data')),entries=monthlySeasonalKnowledge(table.entries);
  expect(entries).toHaveLength(120);expect(new Set(entries.map(e=>e.id)).size).toBe(120);expect(entries.every(e=>e.sourceId===table.sourceId&&e.category===MONTHLY_SEASONAL_KNOWLEDGE_CATEGORY)).toBe(true);
  const pending=entries.find(e=>e.id.endsWith('乙丑'))!;expect(pending.text).toContain('待复核');expect(pending.text).toContain('未提出独立初始取用');
  const known=entries.find(e=>e.id.endsWith('甲寅'))!;expect(known.text).toContain('正月甲木');expect(known.text).not.toContain("'''正月甲木'''");expect(known.text).toContain('codepoint[');
 });
 it('publishes the fixed category and searched original entries without modifying the imported dataset',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'seasonal-knowledge-')),store=await new Store(directory,resolve('data'),resolve('node_modules/sql.js/dist/sql-wasm.wasm')).init();resources.push({store,directory});
  const service=new StudioService(store,{read:()=>'',write:()=>{}},false),before=structuredClone(store.dataset);
  const boot=service.bootstrap();expect(boot.stats.knowledge).toBe(store.dataset.knowledge.length+120);expect(boot.stats.knowledgeCategories).toContain(MONTHLY_SEASONAL_KNOWLEDGE_CATEGORY);
  expect(service.searchKnowledge('',MONTHLY_SEASONAL_KNOWLEDGE_CATEGORY)).toHaveLength(120);
  const entries=service.searchKnowledge('正月甲木',MONTHLY_SEASONAL_KNOWLEDGE_CATEGORY);expect(entries.some(e=>e.title.includes('甲日干 · 寅月'))).toBe(true);
  expect(service.searchKnowledge('unmatched-seasonal-query',MONTHLY_SEASONAL_KNOWLEDGE_CATEGORY)).toEqual([]);expect(store.dataset).toEqual(before);
 });
});
