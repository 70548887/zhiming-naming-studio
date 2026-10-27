# M754 辞书直接物象候选包

本目录只增加候选资源，不修改 `data/dataset-v6.json`、旧 257 个元素标签、旧 `data/element-object` 包或界面。基线重算为 779 字：257 个已有项目标签、522 个空标签。本包选择 10 个空标签字：枫、卉、麓、菘、珉、川、石、枝、棉、蕤。

`dictionary-facts.json` 保存固定 MOE 原条、默认读音、义项索引、逐条哈希与 Unicode 简繁原行。`convention-candidates.json` 单独保存项目原创命名取意、项目直接物象映射和采用范围；这些字段不改写辞书原文，也不声称传统汉字唯一五行。`source-pins.json` 保存原始来源身份与许可边界：MOE 辞书正文 CC-BY-ND-3.0-TW，g0v/kcwu 格式编辑 CC0-1.0，Unicode 17.0.0 原件按 Unicode-3.0。

默认读音单一直接物象候选为枫、卉、麓、菘、珉；川、石、枝、棉、蕤 需要生成请求明确的主题条件。所有 10 字状态均为 `pending-independent-review`，正式新增覆盖保持 0。`admission-template.json` 只是审查模板，不能由候选包自批。

从仓库根目录重复构建和验证：

```text
node scripts/m754-element-imagery/build.mjs
node scripts/m754-element-imagery/build.mjs --verify
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run tests/m754-element-imagery.test.ts
```

主进程使用 `loadM754ElementImagery(root, reviewPin?)`。没有独立审查资源时，查询只返回 `pending-independent-review` 且 `effectiveElements=[]`；有独立审查资源时，仍须为川、石、枝、棉、蕤传入精确主题。`projectM754GenerationCharacters` 只对当次生成的原始 `CharacterEntry[]` 做深拷贝投影，之后 `generateM754ImageryLocalPreview` 调用现有 `generateLocalForRuleVersionWithContext`，不写正式字库或客户会话。

入库条件是：独立审查人和审查 ID 与作者分离；逐条 candidate SHA、字形、默认读音、原条 SHA、义项范围、主题和理由均复核；审查资源及其 SHA 固定进受信主进程；再由主线另行决定是否升级正式覆盖。当前未执行入库，formalNew 仍为 0。
