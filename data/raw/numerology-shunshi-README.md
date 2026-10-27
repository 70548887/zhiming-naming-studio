# kangxi-mcp

<div align="center">

**English** ·
[![简体中文](https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-555?style=flat-square)](README.zh-CN.md)
[![日本語](https://img.shields.io/badge/-%E6%97%A5%E6%9C%AC%E8%AA%9E-555?style=flat-square)](README.ja.md)
[![한국어](https://img.shields.io/badge/-%ED%95%9C%EA%B5%AD%EC%96%B4-555?style=flat-square)](README.ko.md)

</div>

> 📖 **康熙字典 (Kangxi Dictionary, 1716)** ・ 🇯🇵 **康熙字典 (こうきじてん)** ・ 🇰🇷 **강희자전**
>
> An offline Chinese character dictionary — and MCP server — built on the Kangxi Dictionary plus a modern character table. Open-sourced by [Shunshi.AI](https://shunshi.ai) / 顺时.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Powered by Shunshi.AI](https://img.shields.io/badge/powered%20by-Shunshi.AI-purple)](https://shunshi.ai)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](#)

---

## Two published npm packages

| Package | What it is | Install |
|---|---|---|
| **[`shunshi-kangxi-core`](./packages/kangxi-core)** | Pure TypeScript dictionary engine. Zero runtime deps, no network. Use from any Node.js app. | `npm install shunshi-kangxi-core` |
| **[`shunshi-kangxi-mcp`](./packages/kangxi-mcp)** | [Model Context Protocol](https://modelcontextprotocol.io/) server wrapping the core. Drop-in tool for Claude Desktop / Cursor / Cline / Claude Code. | `npx -y shunshi-kangxi-mcp` |

Both are the engine behind the [Shunshi.AI 康熙字典](https://shunshi.ai/kangxi), and both are parity-tested against that production backend on every release.

---

## Why this exists

Ask any LLM for the stroke count of a Chinese character and you will get a confident, frequently wrong answer. The problem is worse than it looks, because **there are three different correct answers** and they routinely disagree:

| Character | 简体笔画 (modern) | 繁体笔画 | 康熙笔画 |
|---|---|---|---|
| 万 | 3 | 12 (萬) | **15** |
| 与 | 3 | 13 (與) | **14** |
| 丑 | 4 | 16 (醜) | **17** |
| 学 | 8 | 16 (學) | **16** |

**康熙笔画 is the one that matters** for Chinese name numerology (五格剖象), seal carving, and classical philology — and it is neither of the two counts you can get by counting strokes on screen. It follows the Kangxi radical conventions, where 氵 counts as 水 (4), 艹 as 艸 (6), 忄 as 心 (4).

This package ships all three counts, from a real table, offline:

- ✅ **20794 characters**, 6346 of them in the common base set
- ✅ **17034 entries of verbatim 《康熙字典》 source text**, with 部居/字部 headings
- ✅ **康熙笔画 · 简体笔画 · 繁体笔画 · 部首 · 五行 · 拼音 · 注音符號 · 字形结构 · 现代释义**
- ✅ **Traditional / simplified / variant input** all resolve to the right head entry — looking up 顧 gives you 顾's data, not a "see 顾" stub
- ✅ **Search by stroke count, element, radical or reading** — the query naming actually needs
- ✅ **Zero network, zero API key.** The data is in the package.

---

## Quick start

### Use the dictionary in your own app

```bash
npm install shunshi-kangxi-core
```

```typescript
import { charDetail, searchChars, totalKangxiStrokes } from 'shunshi-kangxi-core';

const d = charDetail('万');
console.log(d.简体, d.繁体);        // 万 萬
console.log(d.康熙笔画, d.简体笔画); // 15 3
console.log(d.五行, d.注音);        // 水 ㄨㄢˋ

// Traditional input resolves to the simplified head entry
charDetail('顧').简体;              // 顾
charDetail('顧').康熙笔画;           // 21

// 12-stroke 木 characters — the classic naming query
searchChars({ strokes: 12, wuxing: '木', limit: 10 });
// 棒 笔 草 策 茬 茶 趁 枨 茺 棰

// Total Kangxi strokes for a full name (what 五格 is built on)
totalKangxiStrokes('顾学盈');       // 46
```

→ Full API reference: [`packages/kangxi-core/README.md`](./packages/kangxi-core/README.md)

### Give Claude / Cursor / Cline the dictionary

Add this to your MCP config (e.g. `claude_desktop_config.json`):

```jsonc
{
  "mcpServers": {
    "shunshi-kangxi": {
      "command": "npx",
      "args": ["-y", "shunshi-kangxi-mcp"]
    }
  }
}
```

For **Claude Code**:

```bash
claude mcp add shunshi-kangxi -- npx -y shunshi-kangxi-mcp
```

Then just ask:

> 「梓」这个字康熙笔画多少？五行属什么？
>
> Find me 12-stroke characters with the 木 element that would work in a child's name.
>
> 「学」の康熙画数と『康熙字典』の原文を見せて。

---

## Tools exposed to the model

| Tool | What it does |
|---|---|
| `lookupChar` | Full entry for one character — all three stroke counts, radical, element, pinyin, Bopomofo, glyph structure, modern definition, and verbatim Kangxi source text. |
| `searchChars` | Search by Kangxi stroke count (exact or range), Five Elements, radical, and/or pinyin prefix. The naming workhorse. |
| `analyzeText` | Break a whole string down character by character, with the total Kangxi stroke count. |
| `dictStats` | Dataset size, so the model can tell the user what coverage to expect. |

---

## Data notes, stated plainly

- **五行 attribution is not universal.** Roughly 40% of the table has no element — mostly rare characters where the classical schools (by radical / by stroke count / by phonology) disagree. Those entries return `null` rather than a made-up element. A search filtered by 五行 will never match them.
- **One simplified form can map to several traditional forms.** 于/於, 余/餘, 了/瞭, 准/準 are genuinely different characters that simplification collapsed. This dictionary keeps them separate, because 姓名学 counts them separately. Folding them would silently produce wrong stroke counts.
- **Traditional→simplified folding is conditional, and there are exceptions.** A traditional form folds to its simplified head entry only when both sides agree on the Kangxi stroke count — 顧→顾, 學→学, 麗→丽 all fold. Around 100 pairs disagree and therefore do not fold, which is right for the genuinely-different pairs above but leaves a handful of true equivalents (萬 is one) resolving to their own mirror entry with a different stroke count. **Look characters up by their simplified form when you have one.**
- **康熙笔画 and 康熙原文 use different conventions.** 康熙笔画 is the count 姓名学 needs, taken from the traditional form — 万 reports 15, from 萬. The 康熙原文 field is the Kangxi entry for the glyph you asked about, so 万's entry says 「康熙筆画：3」, describing 万 as its own character. Both are correct; they are answering different questions.
- **康熙笔画 comes from the character table, not from re-counting the glyph.** That is the point — the Kangxi conventions cannot be recovered by counting pixels.
- **注音 returns `null` when a reading cannot be converted** (rare readings, non-standard pinyin). Showing nothing beats showing a wrong reading.

---

## Development

```bash
npm install
npm run build
npm test          # unit tests + cross-language parity vs the Python engine
npm run smoke -w shunshi-kangxi-mcp   # end-to-end over the real MCP stdio protocol
```

The parity suite runs 620 characters × 12 fields against fixtures generated by
Shunshi.AI's production Python dictionary service. Any divergence fails the build.

---

## Part of the Shunshi.AI open-source ecosystem

| Repo | What |
|---|---|
| [bazi-reader-mcp](https://github.com/shunshi-ai/bazi-reader-mcp) | 八字 / 四柱推命 / 사주팔자 chart engine + MCP server |
| **kangxi-mcp** | 康熙字典 dictionary engine + MCP server *(this repo)* |
| [naming-mcp](https://github.com/shunshi-ai/naming-mcp) | Chinese name scoring — 五格剖象 · 三才 · 81 数理 · 生肖 |
| [zeri-mcp](https://github.com/shunshi-ai/zeri-mcp) | 择日 / date selection — auspicious dates for weddings, moving, opening |
| [fate-bench](https://github.com/shunshi-ai/fate-bench) | Open datasets and benchmarks for Chinese metaphysics |

Built by **[Shunshi.AI](https://shunshi.ai)** — AI-powered Chinese metaphysics, in 中文 / English / 日本語 / 한국어.

## License

MIT © Shunshi.AI

The 《康熙字典》 (1716) source text is in the public domain. The modern character
table, element attributions and definitions were compiled by Shunshi.AI from
public reference sources and are released here under MIT.
