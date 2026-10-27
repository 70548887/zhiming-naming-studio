import {afterEach,describe,expect,it} from 'vitest';
import {copyFileSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {loadOfficialNamePopularityData,loadOfficialNamePopularitySources} from '../src/main/official-name-popularity-data';
import {OFFICIAL_NAME_POPULARITY_SOURCE_ID} from '../src/shared/official-name-popularity';
import independent from './fixtures/official-name-popularity-2021-reviewed.json';

const dir=resolve('data'),files=['official-name-popularity.json','official-name-popularity-source-lock.json','official-name-popularity-NOTICE.md'],temporary:string[]=[];
const sha=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
function copy(){const target=mkdtempSync(join(tmpdir(),'official-popularity-data-'));temporary.push(target);for(const file of files)copyFileSync(join(dir,file),join(target,file));return target;}
afterEach(()=>{for(const directory of temporary.splice(0))rmSync(directory,{recursive:true,force:true});});

describe('fixed official historical given-name facts publication',()=>{
 it('matches all20 independently transcribed author-table integer counts and their exact original image anchors',()=>{
  const {catalog,sources}=loadOfficialNamePopularityData(dir);
  expect(catalog.tables).toEqual(independent.tables.map(({sourceImageSha256:_,...table})=>table));
  expect(catalog.report.tableImages.map(row=>row.sha256)).toEqual(independent.tables.map(table=>table.sourceImageSha256));
  expect(catalog.report.sourceHtmlSha256).toBe(independent.provenance.sourceHtmlSha256);
  expect(catalog.tables.map(table=>table.rows.reduce((sum,row)=>sum+row.reportedPeople,0))).toEqual([136033,138372]);
  expect(independent.provenance.reviewBeforeComparison).toBe(true);expect(sources).toEqual(loadOfficialNamePopularitySources(dir));expect(sources).toHaveLength(1);expect(sources[0].id).toBe(OFFICIAL_NAME_POPULARITY_SOURCE_ID);
 });
 it('separates birth/registration scope, visible release date and later HTML metadata without inventing precise denominators',()=>{
  const {catalog}=loadOfficialNamePopularityData(dir);
  expect(catalog.cohort).toMatchObject({birthYear:2021,registeredBy:'2021-12-31',nameUnit:'given-name-excluding-surname',registrationCoverageRate:null});
  expect(catalog.report).toMatchObject({statisticalYear:2021,visiblePublishedAt:'2022-01-24 09:16',htmlMetaPubDate:'2025-10-10 15:48:28',htmlGenerationDate:'2025-10-10 15:48:27'});
  expect(Object.values(catalog.cohort.denominators).map(row=>[row.published,row.exactPeopleKnown,row.roundingRulePublished,row.publishedResolutionPeople])).toEqual([['887.3万',false,false,1000],['468.1万',false,false,1000],['419.2万',false,false,1000]]);
  expect(catalog.scoringEffect).toBe('none');expect(catalog.limitations.join('')).toContain('不是当前全国全名重名率');
 });
 it('ships only self-structured facts and attribution, and retains original image URLs/hashes as references',()=>{
  const lock=JSON.parse(readFileSync(join(dir,files[1]),'utf8'));
  expect(lock.sources[0].files).toEqual(['data/official-name-popularity-NOTICE.md','data/official-name-popularity.json']);
  expect(lock.sources[0].files.some((file:string)=>/\.(?:html|jpe?g|png|pdf)$/iu.test(file))).toBe(false);
  expect(lock.sources[0].license).toContain('original report open license not stated');
  expect(loadOfficialNamePopularityData(dir).catalog.report.tableImages.every(image=>image.url.startsWith('https://gat.hunan.gov.cn/'))).toBe(true);
 });
 it.each(files)('rejects any byte change in the publication %s without repairing it',file=>{
  const target=copy(),path=join(target,file);writeFileSync(path,Buffer.concat([readFileSync(path),Buffer.from(' ')]));const before=files.map(name=>sha(readFileSync(join(target,name))));
  expect(()=>loadOfficialNamePopularityData(target)).toThrow();expect(files.map(name=>sha(readFileSync(join(target,name))))).toEqual(before);
 });
 it('rejects a counterfeit changed count even after its own lock hashes are recomputed',()=>{
  const target=copy(),data=JSON.parse(readFileSync(join(target,files[0]),'utf8'));data.tables[0].rows[0].reportedPeople++;
  writeFileSync(join(target,files[0]),JSON.stringify(data));const lock=JSON.parse(readFileSync(join(target,files[1]),'utf8'));lock.sources[0].fileHashes['data/'+files[0]]=sha(readFileSync(join(target,files[0])));lock.sources[0].sha256=sha(JSON.stringify(lock.sources[0].fileHashes));writeFileSync(join(target,files[1]),JSON.stringify(lock));
  expect(()=>loadOfficialNamePopularityData(target)).toThrow('来源锁摘要不一致');
 });
 it('does not allow a caller to mutate a loaded catalog or source list',()=>{
  const loaded=loadOfficialNamePopularityData(dir);expect(Object.isFrozen(loaded.catalog.tables[0].rows[0])).toBe(true);expect(()=>loaded.catalog.tables[0].rows[0].reportedPeople=0).toThrow();
  const copy=loadOfficialNamePopularitySources(dir);copy[0].name='伪来源';expect(loaded.sources[0].name).not.toBe('伪来源');
 });
});
