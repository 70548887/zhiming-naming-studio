# 粤语字词读音参考来源与范围

本阶段采用 `yue-name-reading/1.0.0`，提供离线粤拼候选和逐项读音确认。现有 **779 个命名字均有至少一个候选**，这表示字典候选覆盖，不表示已确定孩子姓名的粤语读法、完成连读音变或完成谐音审查。功能默认关闭，不改变既有普通话读音与命名排序。

## 固定来源与许可

字词来源为粵語計算語言學基礎建設組（CanCLID）及 Rime Cantonese contributors 维护的 [rime/rime-cantonese](https://github.com/rime/rime-cantonese/tree/259f0e48bba840c3a2e0d117539e96937f3d89bc)，固定提交 `259f0e48bba840c3a2e0d117539e96937f3d89bc`，chars、words 文件内部版本均为 `2026.08.10`。来源 ID 为 `rime-cantonese-jyutping`。

同版 `README-cmn.md` 第 12 行明确：主体使用 **CC-BY-4.0**，只有 `jyut6ping3.maps` 使用 ODbL-1.0。本包只采用 chars、words，未采用 maps；也未采用 phrase 文件，该文件没有显式粤拼词音。原作者署名、固定来源、筛选/格式转换说明和完整 CC-BY 许可随包保存在 `data/raw/yue-reading-NOTICE.md`、`yue-reading-README-cmn.md`、`yue-reading-CC-BY-4.0.txt`。许可链接为 https://creativecommons.org/licenses/by/4.0/ 。项目程序的许可不撤销这些资料的 CC-BY 权利。

简繁候选来自现有 Unicode Unihan 17.0.0，固定提交 `4fd8eca90b30aa4c72543ccddb4c15d05becdf8d`，许可为 Unicode-3.0，完整许可为 `data/raw/unicode-LICENSE`。此源继续使用既有 **`unicode-17`** 身份、完整原件清单、原有汇总 SHA 和说明，不另造一份与基础包身份冲突的 Unicode 源。字形关系只用于查询候选，不据此改写法定姓名或自动确定读音。

## 子集与定位

`data/yue-reading-table.json` 含 **1,391 条字音、15 条完整复姓词音、1,209 个字形查询键**。字音候选按现有命名字及默认姓氏所需字形筛选；完整复姓词音只覆盖本次来源中已存在的词条，不代表覆盖所有姓氏。每条候选保留来源原字形、音节、固定版本、原文件名和一基行号，ID 使用 `rime-yue:char:<行号>` 或 `rime-yue:word:<行号>`。输入姓名的简体字形与词典原字形分别保存。

| 原件或派生表 | SHA-256 |
| --- | --- |
| `data/raw/yue-reading-chars.dict.yaml` | `9b053a594c80eae76545bcdd83239884a49b1ba48b89ca0ab9e8daac79f33013` |
| `data/raw/yue-reading-words.dict.yaml` | `54d174ad2bb997e4a678b7b076b84e4dc5914481b32467cdea3b43e88b7d5474` |
| `data/yue-reading-table.json` | `f285837167d7ae731a3e3dedc817cb13f32b6dab0bd04091b115c3415afcf028` |
| `data/yue-reading-source-lock.json` | `e5a593195a4fbc0fcce98b7f11e535aca7754f68f02d8d2ae45715d15a4acf25` |

Rime 来源汇总 SHA 为 `324e60c2f1f756b924423f999cb8e1a27db3ab25854bdb260c7de824d02ef414`，算法是按相对路径排序的 `fileHashes` 对象经 `JSON.stringify` 后取 SHA-256。`unicode-17` 保持基础包原汇总 `f28cbf0a1b546a3cb1b44d4cb324d8fc9c93e14ffa9887f408aaad52f34daa1d`，继续使用原文件次序的“basename、NUL、原件 SHA，换行连接”算法。两种汇总约定分别验证，不互换。

加载器验证固定锁摘要、许可与原件逐文件 SHA、子集每条记录的原始行、音节数量及 Unihan 映射。方案读音记录的 `sourceIds` 同时保存 `rime-cantonese-jyutping` 与 `unicode-17`；两者完整来源身份进入方案来源快照。开发中用于独立对照的 CC-BY-SA 维基词典材料没有混入本阶段 CC-BY 粤拼子集。

## 确认规则与未完成部分

所有单位初始均未确认，单一候选也不自动确认。单姓和给名逐字展示字音；复姓只展示已有完整词音，不从各字的多音候选拼成一个“已确认”姓氏。多音、缺项和家庭特别读法都需要用户明确选择。完整词条也不自动证明该词的姓氏义项或家庭实际读法。

家庭手填以 `origin: user` 保存，不附 `dictionaryId`，不产生“词典已收录”的证据。字典选择以 `origin: dictionary` 保存，必须与该单位的候选 ID 和音节完全一致。可以部分确认，也可以清除既有确认；只有姓氏和全部名字用字确认后才提供全名音节串。

手填须使用 ASCII 字母和 1–6 调号，一音节一项，以空白分隔；整串最多80字符，每音节最多16字符，音节数与该姓名单位的汉字码点数一致。仅大小写和空白可规范化，不推测缺失声调，不合并长短元音、n/l、ng/零声母。此输入检查只检查格式，不证明手录音节是某地区的标准读法。

本阶段尚无经审阅的粤语不雅谐音词规则，也未实现声调忽略比对、连读音变、地区读法推演或其他方言覆盖。字典中存在某个词不表示该词不雅；未确认或无候选时也不输出“谐音安全”。词典输入权重、词汇频次与真实人口重名率不同，本功能不提供后者。

## 版本兼容边界

旧版本的存储载荷可能保留新增字段，但旧界面的偏好验证会丢弃本阶段新增的粤语读音和文化意象对读开关。旧界面不是这两项新功能的兼容编辑器；新增结果的查看、修改和重新生成应使用对应新版本界面。既有普通话与未启用新功能的历史结果按其原版本保存。
