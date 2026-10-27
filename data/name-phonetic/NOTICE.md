# 新普通话 / 粤语词汇联想资料

本增量为项目独立的人工审阅词汇资料；普通话 profile `cmn-homophone-review/1.0.0`、粤语 profile `yue-homophone-review/1.2.0`。旧普通话九项和粤语 1.0/1.1 的源码、数据、锁与已保存结果保持历史身份，新 profile 不回填旧结果。

## 中文维基词典原词、读音与义项

- 作者：中文维基词典贡献者。提取：Kaikki / Wiktextract。
- 固定本地原件：`data/raw/zhwiktionary-Chinese.jsonl.gz`；压缩文件 SHA-256 `3c9fa2e012e6c257b7a0789b581cadc3f19fd8316118dc48235b1eb4ccbd2d10`。
- 许可：CC BY-SA 4.0。许可全文在 `CC-BY-SA-4.0.txt`；详情 <https://creativecommons.org/licenses/by-sa/4.0/>。
- 原站：<https://zh.wiktionary.org/>。每项保留具体词页 URL、实际 JSONL 行号、整行 SHA-256、原 JSON、所选 soundIndex / senseIndices、原始拼音、tags / raw_tags。
- 本项目改动：逐条选择实际词义与音值，普通话手工划分字位音节并转换数字调号；粤语仅取与 Rime 同词词音明确一致的读音，包括词典明示变调的原调/变调。没有从单字臆造词音，没有补写未见义项。
- 词典节录及其义音衍生资料按 CC BY-SA 4.0 提供；本项目不将其重标为专有数据。

## Rime Cantonese 原词词音与字音

- 作者：CanCLID 与 Rime Cantonese contributors。
- 固定提交：`259f0e48bba840c3a2e0d117539e96937f3d89bc`，源版本 `2026.08.10`。
- 原站：<https://github.com/rime/rime-cantonese/tree/259f0e48bba840c3a2e0d117539e96937f3d89bc>。
- 原词词音：`data/raw/yue-reading-words.dict.yaml`，SHA-256 `54d174ad2bb997e4a678b7b076b84e4dc5914481b32467cdea3b43e88b7d5474`。
- 原字音：`data/raw/yue-reading-chars.dict.yaml`，SHA-256 `9b053a594c80eae76545bcdd83239884a49b1ba48b89ca0ab9e8daac79f33013`；只用于专项输入字位证据，不从字音拼造词音或复姓词音。
- 许可：CC BY 4.0。许可全文在 `CC-BY-4.0.txt`；详情 <https://creativecommons.org/licenses/by/4.0/>。
- 保留原行、实际行号和整行 SHA-256。粤语规则取固定原词词音与词典 Jyutping 的明确交集。普通话规则的 Rime 引用仅证明同一原词存在，普通话发音依据独立标明的 Mandarin/Pinyin 记录。

## 语域与语义边界

词典 `tags` 与 `raw_tags` 全部逐义保留。明确的语域标签原样显示；只有语法、语义或地域标签时，语域仍记“未标”，并另存这些来源标签。项目分类不是词典语域。普通物品、食品、生理和医学名称不被称为辱词。多义、亲昵称呼及正面义项保留，不将原词意义用于断言孩子的属性。

仅提示固定有限词表的词汇联想，无人口频率、安全评分、禁用名或自动淘汰。未命中不表示安全；任一位置未确认则该语言暂停。严格/去调模式只比较当前逐字读音，不展开姓名多音，不推测连读音变。

## r2运行规则身份

本包单一物理规则JSON位于data/name-phonetic/name-phonetic-profile.json；engine、pins和Node source gate同目录部署，编译时也从这一个JSON导入。运行门禁先逐文件核固定来源锁，再对比已核JSON与引擎实际使用的私有冻结profile完整规范化对象。引擎只导出该对象的深副本供门禁核对，修改副本不影响后续匹配。只有实际对象相同，门禁才返回engineProfileMatched=true及其对象摘要；常量profileSha不能单独证明引擎规则身份。旧r1双副本漏洞与其审计证据另行保留，不能按README要求副本相同来替代代码校验。
