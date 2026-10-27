# M740 单字命名数据候选

10 条默认读音单字直接义项：邦、沫、纪、纶、年、农、作、岁、叶、萧。`data/profile.json` 使用 M690 的 profile/source/manifest 边界与来源绑定结构；`data/rows.jsonl` 为同内容的 10 行可消费数据。`source` 保存 MOE 完整原条和原文，`project` 保存独立原创命名意象；所有所选义项均为原词头单字的名词实体义，没有拆借整词含义。

```powershell
Set-Location -LiteralPath 'D:/Codex-NamingStudio-Evidence/m740-character-meanings'
node build.mjs
node validate.mjs
node --test tests/data.test.mjs
```

构建只写入本目录。源文件由 `data/source-lock.json` 固定，以外部只读路径复用；未复制完整压缩辞典。输入包括当前产品 dataset/v4-v7、默认 M46060、M61020、M61610、M69020、meaning-context-v1-1 和旧 B01-B05 目标占用。`data/coverage.json` 直接依据当前文件重新计算基线及候选占用，整词语境、非默认读音和本批候选不会变成自动单字覆盖。

`data/pending-review.json` 列出每条的原义、项目取意、历史状态、未知项、限制及逐项审阅格。全部保留历史 manual/pending；叶到葉的固定字形证据不解除其来源身份待审。此候选保持 `candidateOnly=true`、`activation=off`、`productionApproved=false`、`formalCoverageAdded=0`，不作整名批准、不计自动语义分、不作运势、性格或心理测量。

独立语义审阅、真实 query 接线和真实 generation 接线：未执行，由 root 安排后续任务。具体许可、署名及原许可文件见 `data/NOTICE.md` 与来源锁。
