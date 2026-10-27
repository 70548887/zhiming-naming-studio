import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {validateEditorialCitations} from '../scripts/editorial-citation-validation.mjs';
import type {CharacterEntry,Citation} from '../src/shared/types';
const read=(file:string)=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url),'utf8'));
const editorial=read('data/naming-editorial.json'),dataset=read('data/dataset.json') as {characters:CharacterEntry[];citations:Citation[]};
describe('curated naming publication contract',()=>{
 it('publishes every reviewed name only with a complete matching quotation, excerpt and source reading',()=>{
  expect(validateEditorialCitations(editorial,dataset)).toMatchObject({rules:40,names:44,canonicalIdentitiesMatched:true,excerptsAndReadingsMatched:true});
 });
 it.each(['id','sourceId','title','chapter','text'])('rejects a changed canonical %s before publication',field=>{
  const bad=structuredClone(editorial);bad.citations[0].citation[field]+='forged';expect(()=>validateEditorialCitations(bad,dataset)).toThrow('canonical citation identity differs');
 });
 it('does not treat a same-reading word elsewhere in the chapter as part of the reviewed excerpt',()=>{
  const bad=structuredClone(editorial);bad.citations[0].excerpt='君子以';expect(()=>validateEditorialCitations(bad,dataset)).toThrow('name character absent');
 });
 it('rejects a reading switch and an unattested character rather than silently disabling a curated name',()=>{
  const bad=structuredClone(editorial);bad.citations[0].readings.明='mìng';expect(()=>validateEditorialCitations(bad,dataset)).toThrow('reading mismatch');
  const absent={...dataset,characters:dataset.characters.filter(c=>c.char!=='厚')};expect(()=>validateEditorialCitations(editorial,absent)).toThrow('missing character');
 });
 it('requires explicit explanation for recombined names and prevents duplicate editorial names',()=>{
  const bad=structuredClone(editorial);bad.citations.find((r:{names:string[]})=>r.names.includes('婉清')).context='眉目清秀';expect(()=>validateEditorialCitations(bad,dataset)).toThrow('recombination needs explicit context');
  const duplicate=structuredClone(editorial);duplicate.citations.push(duplicate.citations[0]);expect(()=>validateEditorialCitations(duplicate,dataset)).toThrow('duplicate reviewed name');
 });
});
