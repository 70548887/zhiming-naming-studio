import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {CharacterSourceNote} from '../src/renderer/CharacterSourceNote';

describe('source notes are distinct from current pronunciation instructions',()=>{
 it('retains an old reading assertion under a closed and explicitly qualified source disclosure',()=>{
  const warning='多音字：本方案采用 lè，请按姓名用法确认。';
  const html=renderToStaticMarkup(<CharacterSourceNote warning={warning}/>);
  expect(html).toContain('<details');expect(html).not.toMatch(/<details[^>]*\bopen(?:=|\s|>)/u);expect(html).toContain('字库原备注（保留原文，可能未随所选读音调整）');expect(html).toContain(warning);
 });
 it('escapes supplied source notes and never rewrites the saved original',()=>{
  const warning='<img src=x onerror=alert(1)>本方案采用 lè';
  const html=renderToStaticMarkup(<CharacterSourceNote warning={warning}/>);expect(html).toContain('&lt;img');expect(html).not.toContain('<img');expect(warning).toBe('<img src=x onerror=alert(1)>本方案采用 lè');
 });
 it('does not create an empty disclosure when a source has no note',()=>{expect(renderToStaticMarkup(<CharacterSourceNote warning=""/>)).toBe('');});
});
