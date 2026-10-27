import { describe, expect, it } from 'vitest';
import { classicDisplay } from '../src/shared/classic-display';

describe('display-only classic wiki formatting', () => {
  it('removes matching wiki headings and bold/italic markers while retaining every original character', () => {
    const raw = "=== 甲木 ===\n'''正月甲木'''，''初春''尚寒；丙為先，癸為佐。\n==== 下段 ====\n原字巳已不互改。";
    expect(classicDisplay(raw)).toBe('甲木\n正月甲木，初春尚寒；丙為先，癸為佐。\n下段\n原字巳已不互改。');
    expect(raw).toContain("'''正月甲木'''");
  });

  it('leaves templates, PUA placeholders, HTML and unsupported or unmatched markup as literal text', () => {
    const raw = "{{PUA|old=\\uE000}} <script>alert(1)</script>\n=== 不成对 ==\n'''未闭合\n''成对''\na = b\n单引号'与撇号don't";
    expect(classicDisplay(raw)).toBe("{{PUA|old=\\uE000}} <script>alert(1)</script>\n=== 不成对 ==\n'''未闭合\n成对\na = b\n单引号'与撇号don't");
  });
});
