import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Modal } from './Modal';

describe('accessible modal markup', () => {
  it('connects the dialog name and optional description to visible text', () => {
    const html = renderToStaticMarkup(<Modal title="名字详解" subtitle="每一份寓意，都值得细读" onClose={() => {}}><p>候选内容</p></Modal>);
    const titleId = html.match(/aria-labelledby="([^"]+)"/)?.[1];
    const descriptionId = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(titleId).toBeTruthy();
    expect(descriptionId).toBeTruthy();
    expect(html).toContain(`<h2 id="${titleId}">名字详解</h2>`);
    expect(html).toContain(`<p id="${descriptionId}">每一份寓意，都值得细读</p>`);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('type="button" class="icon-button" aria-label="关闭"');
  });

  it('gives simultaneous dialogs distinct labels without dangling descriptions', () => {
    const html = renderToStaticMarkup(<>
      <Modal title="历史版本" onClose={() => {}} wide><p>历史内容</p></Modal>
      <Modal title="恢复版本" onClose={() => {}}><p>恢复内容</p></Modal>
    </>);
    const labels = Array.from(html.matchAll(/aria-labelledby="([^"]+)"/g), match => match[1]);
    expect(labels).toHaveLength(2);
    expect(new Set(labels).size).toBe(2);
    for (const id of labels) expect(html).toContain(`<h2 id="${id}">`);
    expect(html).not.toContain('aria-describedby=');
  });
});
