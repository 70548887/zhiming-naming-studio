# 发布证据：执行输入、稳定载荷与外部出版文档

本合同替代 r1 中“把构建产物、测试输入和验收后状态文档冻在一个 SHA 中”的未来版本流程。legacy 1.0.34 的固定 790 输入、既有 192/2343 口径及已审文档例外不变；未来 v1 记录仍按原规则验证。新流程显式使用 `naming-studio-release-verification/2`，不把旧测试记录改绑到新冻结。

## 原 v1 的真实限制

v1 只有在以下条件下可诚实使用：先准备生产构建输出，冻结含 dist/dist-electron/docs 的完整树，再执行测试、最终打包及安装验收；所有冻结内字节都保持一致。文档可以保留“验收待执行”，实际结果只写外部证据。若验收后还要更新 README/CURRENT-STATUS，此单 SHA 流程便不成立；不能预写通过，也不能重写 freeze 来接上旧测试。

## r2 的两个冻结和一个中间快照

| 产物 | 何时生成 | 内容与状态 |
| --- | --- | --- |
| 测试输入冻结 `naming-studio-test-input-freeze/1` | 代码/资料/工具稳定后，实际全套执行前 | `files` 覆盖 src/data/tests/scripts、配置、资产、其他静态文档和显式非生成打包输入。dist/dist-electron 排除；README.md 与 docs/CURRENT-STATUS.md 的真实执行前 SHA 单列 `documentation`。不写任何测试/安装通过数值。 |
| 执行证据快照 `naming-studio-execution-bundle/2` | 真实测试、构建、安装运行及 helper 验证完成后，状态文档更新前 | 五个执行 gate 的不可覆盖文件、共同测试输入身份、真实二进制及实际计数。build gate 另有 `generatedOutputs`，逐文件绑定 dist/dist-electron 与该次实际 ASAR。状态固定 `awaiting-publication`；此时不写发布成功 sidecar。 |
| 出版冻结 `naming-studio-publication-freeze/1` | 真实验收完成、必要的两份状态文档更新并审阅后 | 包含最终出版树，包括生成产物与最终文档；指回原测试输入、不可变执行快照及精确文档审阅。所有代码/data/tests/scripts/其他文档 SHA 必须与原输入相同，新增文件同样使原覆盖失效。 |

不需要为了创建测试输入冻结提前构建 dist。最终出版冻结有新 SHA 是阶段事实；`fullRegression.inputFreeze` 始终保留原测试冻结的路径和 SHA，从未替换成出版冻结。

## 指挥组真实执行顺序

1. 等本轮代码、资料、测试和工具全部稳定。README.md 与 docs/CURRENT-STATUS.md 作为源码/外部发布状态文档，由主组在 build.files 明确加入 `!README.md` 和 `!docs/CURRENT-STATUS.md`，稳定使用/功能/许可文档继续入包。将实际验证 helper 及传递参考文件列入 extra-inputs；固定旧版本/case 的 helper 必须先按本版实际范围适配、审阅。
2. 创建一次测试输入冻结。README 与 CURRENT-STATUS 此时保留真实已有事实和新版本待验状态，不预先填成功计数。
3. capture 执行完整 Vitest 与真实 npm package，再串行完成隔离安装、实际应用运行和 payload/SQL 验证。每个命令的前后输入文件及两份文档基线必须保持不变；实际 PID、退出码、原始日志、产物 SHA 自动采集。任一代码/data/tests/scripts 变化，都需新输入冻结和相应重跑。
4. assemble 读取实际文件，完成 typed 执行 gate 与 ASAR/SQL/快照等物理核对，创建 `awaiting-publication` 快照。此后不得改旧 gate、捕获记录、输入冻结、installer 或 ASAR。
5. 仅根据该执行快照的真实事实更新 README/CURRENT-STATUS。审阅实际差异后，由指挥组/审计组提供精确文档审阅记录；工具不会自动把拟议修改标为已审。
6. publication 读取上述快照及审阅记录，重新核对不可变输入、生成产物、安装文件与 SQL，调用 v2 校验后排他创建出版冻结和 sidecar 草稿。指挥组完成正式 sidecar 与 installer SHA 旁文件交付后，再运行最终只读 release 检查。

```powershell
node scripts/verification/release-capture.mjs freeze --root 'E:\八卦周易' --phase test --version '1.0.35' --output '.local/release-135/test-input-freeze.json' --extra-inputs '.local/release-135/helper-inputs.json'
node scripts/verification/release-capture.mjs run --root 'E:\八卦周易' --plan '.local/release-135/regression-plan.json' --output '.local/release-135/regression-capture'
node scripts/verification/release-capture.mjs run --root 'E:\八卦周易' --plan '.local/release-135/package-plan.json' --output '.local/release-135/package-capture'
# 隔离安装/运行/helper 的实际命令也用 run 采集；声明的新 outputs 必须不存在。
node scripts/verification/release-runtime-record.mjs --root 'E:\八卦周易' --config '.local/release-135/runtime-record-inputs.json' --output '.local/release-135/runtime-record.json'
# 此构造命令作为 runtimeRecord role 被 capture，连同原始 process/SQL/payload 引用供下步读取。
node scripts/verification/release-assemble.mjs --root 'E:\八卦周易' --config '.local/release-135/execution-inputs.json' --output '.local/release-135/executed'
# 以上真实通过后，才更新并审阅两份状态文档。
node scripts/verification/release-publication.mjs --root 'E:\八卦周易' --config '.local/release-135/publication-inputs.json' --prepare-review '.local/release-135/doc-review.template.json'
# 模板自动填实际计数与所有哈希，status 为 pending-review；审阅后另存实际已审记录并固定其 SHA。
node scripts/verification/release-publication.mjs --root 'E:\八卦周易' --config '.local/release-135/publication-inputs.json' --output '.local/release-135/publication'
# 正式交付记录落地后执行；该 flag 也必须有完整 v2 审阅证据才能生效。
node scripts/verification/release.mjs --root 'E:\八卦周易' --strict-local-evidence --allow-post-release-docs --report '.local/release-135/final-readonly.json'
```

示例中的版本、路径和引用应替换为本次真实值；流程工具不隐式执行构建或安装。所有输出仅新建于 .local 或 verification-output，不覆盖旧证据或正式 release。

## command plan 与执行输入

run 沿用 `naming-studio-command-plan/1`：version、role、真实 executable/args、冻结 toolFiles、新 outputs、实际 artifacts。v2 使用 `inputFreeze:{file,sha256}`；capture 中保留的 sourceFreeze/freezeAfter 是该**测试输入**的兼容字段，不是未来出版冻结。

fullRegression args 严格为 `[实际 vitest.mjs绝对路径, "run", "--reporter=default", "--reporter=json", "--outputFile=新的绝对路径/vitest.json"]`，不接受部分测试筛选。buildAndPackage args 为 `[实际 npm-cli.js绝对路径,"run","package"]`，artifacts 绑定当前 Setup.exe 与 built app.asar。项目内命令入口必须在原输入冻结中，外部 npm CLI 另采真实身份。completed/exit0 只是命令事实，不是 domain gate 自动通过。

`execution-inputs.json`：

```json
{
  "schema": "naming-studio-release-execution/2",
  "version": "1.0.35",
  "inputFreeze": {"file": "真实测试输入冻结绝对路径", "sha256": "真实SHA"},
  "installer": "真实Setup.exe", "builtAsar": "真实built app.asar", "installedAsar": "真实installed app.asar",
  "fullRegression": {"file": "真实vitest.json", "commandCapture": "产生它的command.json"},
  "buildAndPackage": {"commandCapture": "实际package command.json"},
  "package": {"file": "实际post-runtime完整payload.json", "commandCapture": "产生它的command.json"},
  "installedRuntime": {"file": "实际installed SQL.json", "commandCapture": "产生它的command.json"},
  "runtimeRecord": {"file": "实际Installed process.json", "commandCapture": "产生它的command.json"},
  "remaining": ["填写真实未完成范围，保留既有domain/AI/签名/跨机及build-only source pending"]
}
```

同一个真实安装脚本若同时生成三份 package/SQL/process 证明，可让三 gate 引用该 role:runtimeRecord 命令捕获，但三份 outputs 都须执行前声明且全新。底层真实 helper 的字段和语义要求没有减弱：完整 payload 数组、生产字段、source map、安装文件；完整 SQL 当前/历史/归档绑定与 PDF 字节；实际 installer/app PID、退出码、时间和隔离路径。capture、gate、bundle 的版本及输入身份必须一致。

## 原始 process/1 到最终 runtimeRecord

`release-runtime-record.mjs` 读取已发生的原始 `naming-studio-smoke-process/1` P、已成功的 Installed SQL S、post-runtime 完整 payload K、build capture 与原输入冻结；逐项核身份、实际二进制、SQL、环境事实和时间后，排他新建 `naming-studio-runtime-process/1` R。原件不改写。P 的 completed 状态和三个原始时间逐字保留在 R.observedProcessStatus/observedProcessTimes，R.completed=P.completedAt，构造时间单独存 assembledAt；R.status 表示这次材料绑定核验，不是给 P 改名。

输入 config 只含 `schema:"naming-studio-runtime-record-inputs/1"`、version，以及 inputFreeze、processEvidence、installedRuntime、packageEvidence、buildCapture 五个真实 `{file,sha256,bytes?}` 引用，不填通过状态或推定事实。P 必须明确记录 normalProcessesTerminated=false、normalCustomerDataUsed=false、electronRunAsNodePresent=false 和 Installed 环境。缺失事实不会从精简 environment 子集中推断。S.processEvidence 指 P，R 再指 P/S/K，因此没有 SQL↔process 循环。将构造命令本身以 capture 的 runtimeRecord role 执行，assembler 的 runtimeRecord.file 直接用 R，commandCapture 用该构造命令捕获。

## 两份状态文档的精确审阅

仅允许 README.md 与 docs/CURRENT-STATUS.md。其他 md、code、data、tests、scripts 都保持原冻结字节。缺少某份状态文档的执行前基线、文档新增/删除、包内缺失文件或 alias，都不是可批准的文档字节差异。

两份状态文档的 `not-packaged` 必须有双重证明：build.files 含该文件精确负规则且实际匹配结果为排除，实际 built/installed ASAR 的同一字节身份中也不存在该路径（大小写别名同样拒绝）。publication.documentationPackaging 自动记录两文件的 mode、exclusion、ASAR SHA 及 null packagedSha256，最终 verifier 独立重算并核对。缺文件本身不是排除证明；当前外部文档缺失也不通过。主组统一修改真实 package 规则，工具不会事后更改输入。

审阅行在此模式必须显式含 `packaging:"not-packaged"` 和 `packagedSha256:null`；before/after SHA、版本、真实计数、审阅时间和精确文件集合仍全部核对。旧 packaged 模式保留原三 SHA 行格式，并严格核对实际包内 SHA 等于执行前文档基线；不能以 not-packaged 标签豁免包内文件。

`--prepare-review` 自动从不可变 gate/bundle 和实际文档/ASAR 填 facts 与 files，避免手抄计数或哈希；它只生成 pending-review、空 reviewer 和空 reviewedAt 的模板，直接拿模板出版必失败。审阅者核实实际差异后另存一份记录，填写真实 reviewer、reviewedAt 和 reviewed 状态，再将该新文件的实际 SHA 放入 publication config。原模板保留。

审阅记录使用 `naming-studio-publication-doc-review/1`，由实际审阅产生，包含：version、`status:"reviewed"`、reviewer、reviewedAt、inputFreeze、executionBundle 的实际 file/SHA、事实对象及 exact files map。reviewedAt 必须在实际 runtime.completed 之后、publication.frozenAt 之前。facts 必须与该快照的 typed gate 完全一致：

```json
{
  "version": "真实版本", "regressionFiles": "真实整数", "regressionTests": "真实整数",
  "sessions": "实际SQL整数", "revisions": "实际SQL整数", "archives": "实际SQL整数", "pdfs": "实际整数",
  "applicationExitCode": 0, "installerExitCode": 0
}
```

以上类型说明须换为真实 JSON 数字，不能把占位字符串传入。files map 必须恰好覆盖实际改变的状态文档，每项含 beforeSha256、afterSha256、packagedSha256。旧 SHA 等于原输入基线，新 SHA 等于最终外部文件；packaged 模式核实际包内基线，not-packaged 模式核精确排除和实际缺席并显式标记。不同版本、抄旧计数、错 hash、额外 md/code 豁免、待审状态和提前审阅都不通过。没有文档变化时，不需要也不接受无关审阅记录，但排除/实际缺席证明仍必需。

`publication-inputs.json`：

```json
{
  "schema": "naming-studio-publication-inputs/2",
  "executionBundle": {"file": "实际executed/execution-bundle.json", "sha256": "该文件真实SHA"},
  "documentationReview": {"file": "实际已审记录", "sha256": "已固定的真实SHA"}
}
```

无状态文档变化时省略 documentationReview。工具核内容与引用，不提供密码学签名式的人类审阅证明，指挥组仍需确认审阅确实发生。

## 出版记录与实际二进制

最终 sidecar 的 fullRegression.inputFreeze 与 verification.inputFreeze 保持原测试输入；verification.sourceFreeze 指新的出版冻结；verification.executionBundle 指不可变执行快照。build gate 保留原输入 SHA 与实际生成文件 map，出版时逐文件核当前输出及实际 ASAR。六 gate ref 带共同的输入/出版/二进制身份，包、安装 SQL、真实进程仍须绑定同一 installer 与 built/installed ASAR。

gate 实体继续复用原有 /1 数据字段；其中 sourceFreezeSha256 保留“执行输入身份”的兼容含义，并新增 inputFreezeSha256。顶层 /2 的 sourceFreeze 才表示出版冻结。公共 gate 校验只在内存中使用原测试输入的对应视图；原文件、路径、SHA 与捕获引用均不改写。完整出版覆盖、生成产物、文档差异由 /2 另行强制核对。

当前排除模式下，安装包仅保留稳定使用/功能/许可文档，两份外部状态文档在实际验收完成后更新；已测二进制保持不变。兼容 packaged 模式时，实际包内旧字节与外部新字节仍须精确已审，不能声称相同。任何实际二进制变更都必须另走真实构建/安装/验收链。

最终 public verifier 还会从绑定的原始 Vitest JSON 重算 success、逐文件和逐 assertion 计数，对比 gate/ref/bundle/facts；不会只相信 typed passed。执行时间允许同毫秒，测试与构建可合法重叠，但须满足原输入先于各执行、build 完成不晚于 installer.startedAt、installer.terminalAt/completedAt 不晚于 app.started、app terminal 不晚于 runtime completed，bundle 不早于全部实际捕获完成，审阅和出版不早于相应快照。缺少实际 installer 起止或 app start 时间不能推定通过。

ASAR 清单缓存按真实文件身份与纳秒时间/大小失效，同路径替换会清理底层缓存并重建；公开返回值为独立副本。每次 extract 只做廉价身份检查和目标读取，不重复全量 hash ASAR。capture 的声明输出在执行前按 Windows 规范路径去重，执行后按实际规范路径及物理文件身份再去重；别名不能计作多个证据，失败记录和已产生原文件保留。

未知 schema、缺少 gate、缺少输入/出版覆盖或审阅引用均为 not-verified；不为上线清空错误或 pending。既有九个 build-only full-source pending 和其他未完成目标不会因 typed 转接而消失。
