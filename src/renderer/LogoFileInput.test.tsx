import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LogoFileInput } from './LogoFileInput';

describe('brand image native file input', () => {
  it('provides a labelled, keyboard-reachable native file input with supported image formats', () => {
    const html = renderToStaticMarkup(<LogoFileInput onChange={() => {}}/>);
    const input = /<input\b[^>]*>/.exec(html)?.[0] ?? '';
    const id = /\bid="([^"]+)"/.exec(input)?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain(`for="${id}"`);
    expect(html).toContain('选择图片');
    expect(input).toContain('type="file"');
    expect(input).toContain('accept="image/png,image/jpeg,image/webp"');
    expect(input).toContain('class="logo-file-input"');
    expect(input).not.toMatch(/\b(?:disabled|hidden|aria-hidden)=|tabindex="-1"|style=/i);
  });

  it('gives separate upload controls distinct native label associations', () => {
    const html = renderToStaticMarkup(<><LogoFileInput onChange={() => {}}/><LogoFileInput onChange={() => {}}/></>);
    const inputs = [...html.matchAll(/<input\b[^>]*\bid="([^"]+)"[^>]*>/g)].map(match => match[1]);
    expect(inputs).toHaveLength(2);
    expect(new Set(inputs).size).toBe(2);
    for (const id of inputs) expect(html).toContain(`for="${id}"`);
  });
});
