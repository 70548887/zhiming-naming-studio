# M921 单字释义 publication 候选

此包将固定 M910/M914 的 40 条来源材料、M916 语义审阅及 M917-DECISION 最终 r2 转换为 semantic-v72 的完整 publication 数据形状。它不修改当前运行时、数据集、旧证据或产品发布封口。

源审阅分类仍为 **38 general / 2 pending**。独立迁移状态为 **37 semantic-clear / 方、锋 source-pending / 川 migration-hold**。publication 中 37 条 `manual-only`、3 条 `pending` 只是候选消费状态，不把源分类改成 pending 3，也不赋予生成资格。

新版本将方收窄为“取区域的空间意象。”、锋收窄为“取器物尖端部分的意象。”、川收窄为“取河流的自然意象。”。旧项目释义、期许草案、原始完整词条、全部异读、精确义项和来源 SHA 原样保存在 inputs、lineage 与原始 source 中。三条新表述仍须新的独立决定，`decisionId=null`，不得借旧分类自动准入。

`project.projectWish=null`，整名语义为 null，评分和自动 coverage 均为 0，元素字段不改。候选自定义文化标签不映射到六个注册主题。pool、required、local、ai、save、restore 六阶段均拒绝生成授权。

```powershell
node candidates/m921-meaning-admission/convert.mjs
node candidates/m921-meaning-admission/seal.mjs
node candidates/m921-meaning-admission/verify.mjs
node --test candidates/m921-meaning-admission/tests.mjs
node node_modules/typescript/bin/tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution Bundler --skipLibCheck --esModuleInterop candidates/m921-meaning-admission/interface-check.ts
```

校验默认从此 worktree 读取 pins.mjs 的固定原始 dataset、SQLite、MOE gzip、Unicode 映射和许可文件；路径可更换为隔离副本，固定 hash 不能更换。manifest 只是完整性闭包，重算 hash 不能替代来源或独立准入。转换与验证脚本仅供本地开发审阅，未来产品 loader 不应执行 publication 中的脚本。

现有 loader 固定为 M752/M740 的 10 条旧分支，不能通过替换路径或常量加载本包。`integration-contract.json` 与 `registration-hunk.txt` 给出新 family 的精确依赖和待实施注册位置；结构兼容的 sourceId 不是继承 M752 权威。后续须独立决定、可信主进程私有 handle 注册、六阶段生成/保存回放验证及发行验收；当前 activation=off、admissionGranted=false，不改 CURRENT，不改变 coverage。

MOE 原文许可保留 CC-BY-ND-3.0-TW；JSON 格式转换注明 kcwu CC0；Unicode 原行注明 Unicode-3.0；独立的项目原创表述使用 CC0-1.0。新 manifest 精确记录本包脚本实际字节；M916 旧 verifier 的 4305/4306 字节差异继续原样记载，不将旧清单称为整体通过。
