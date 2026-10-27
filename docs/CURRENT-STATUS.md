# 当前交付与开发状态

## 当前后继进度：固定 841b 记录

后继源码核验记录更新至 `841bddd49096a09f2b75b96a7976e70c638266c9`；本补丁基于文档提交 `726047f`，不把文档 commit 当作产品最新版。后续精确状态看[任务板 TASKS](D:/Codex-NamingStudio-Evidence/m587-product-integration/work/.local/team-392/TASKS.json)与原件。

- `53c2a8c` 已合共享 review 的 19 行 transport 类型；M944 的精确依赖及十五文件登记工具已合至 `02ee6b5`，root 39 项 Node 夹具测试通过、0 skip。只接受该源组的限定登记，不授 source-build、outer 或整产品批准。
- M950 十个唯一新增文件已合至 `841bddd`；M956 对边界／受控反馈组合的审阅已封存为限定 PASS。root 129 项 pure／SSR 测试通过、0 skip，类型检查退出 0；这些文件已整合，App review／真实 adapter 接线、实际 Service／Store／CAS 审阅及最新读取／历史／导出全链仍未验收，不能把组件通过写成 native 保存通过。
- 真实来源／构建缺口继续保留：已有正常门禁记录仍在 `candidate2-naming-consumer-v1.ts` 拒绝；M957 固定 f8 的八文件源码独审已封限定 PASS，后继 841 的相同八文件已逐字核对；后续 M964 登记实现另立任务，当前尚未登记，不因源码审阅通过推导构建通过。当前全业务回归、正式 Electron 构建、新安装包、签名与跨机验收未完成。正式交付仍为 **1.0.37**，历史 223 文件／2625 项不转作当前回归。

依据：[登记整合](D:/Codex-NamingStudio-Evidence/m957-root-dispatch/registration-integration.json)、[39 项实际命令](D:/Codex-NamingStudio-Evidence/m957-root-dispatch/focused-registration-tests/command.json)、[M950 十文件整合](D:/Codex-NamingStudio-Evidence/m957-root-dispatch/review-components-integration.json)、[129 项及类型检查](D:/Codex-NamingStudio-Evidence/m957-root-dispatch/review-focused/result.json)、[M956 已封审阅](D:/Codex-NamingStudio-Evidence/m956-review-ui-audit/REVIEW.json)、[M957 八文件源码审阅](D:/Codex-NamingStudio-Evidence/m957-consumer-source-review/REVIEW.json)。

## 固定 f8 源码核验（历史快照）

本次源码核验基线为 `f8e272b1b0d077019ca2d267709378df17e405d9`。后续变更看[任务板 TASKS](D:/Codex-NamingStudio-Evidence/m587-product-integration/work/.local/team-392/TASKS.json)及对应固定收据；文档提交不代表产品最新版或准入批准。正式已交付版本仍为 **1.0.37**，其 223 文件／2625 项历史回归不计为本轮通过。

- **已合入 App：** `1127d04→b91fb83→f8e272b` 已接入显式 C2 生成控制器、面板及 App 只读保护。默认关闭，必须明确操作；缺少实际 native API 时显示不可用，不回退旧流程。root 在 f8 的 5 文件／111 项通过、0 失败／0 skip，类型检查及 Vite 通过，actualNativeApiPositive=false、fullProductClosed=false。这证明限定前端组合，不证明真实 native 生成／保存正例。M949 对 `e72d1e5` 的前端限定审阅及其原夹具失败／后续补测分别保留。
- **Store 后继与路由：** `d753ab2` 对原 POSTCOMMIT／LOCATOR 两项 P2 的源码修订先经 M935 限定复核，M939 又接受七个实际 native 终态阶段与一次特定非空 NSBK 恢复，原两缺陷只在该范围关闭；部分历史源 pin 的时序限制仍保留，shared GC、rollback、其他恢复负例及完整 Store 验收未闭合。生成 route `8809df9`、审阅 route `05264da` 分别获 M936／M952 限定通过，均不含实际初始化 Service 正例、真实 native 写入与 App 审阅全链路。这些独立分支结论不自动成为 f8 后端集成批准。
- **M950 已交付、待接线：** 边界／状态 `3d6e6da` 作者 96 项测试及类型检查通过；反馈组件 `0601cd4` 作者 43 项与另次 DOM 110 断言保留组件范围。五文件反馈组件另有静态限定复核，但当前 M956 组合独审尚未封存结论，真实 App／adapter／review API 接线未由这些收据完成；本基线未启用完整审阅编辑／历史交付链路。
- **性能与真实运行：** 已合 `d2d6874` 的普通盘符路径优化获 M941 限定接受，保留 P3 错误元数据差异；既有 ABBA 约 19.44→15.88 秒仅为局部读回改善，整体 15 秒目标未达。原 M930 的 230214 毫秒启动失败继续保留；后续 M936 启动观察修订 `91c30ad` 有 11833 毫秒启动／两份 bootstrap 响应记录，但不替代 catalog、生成、保存、审阅或 OS 重开验收。
- **源码与产品边界：** M944 的 `7b6783e`＋精确 db08 依赖已获工具限定独审，十五源组绑定不授全源码、outer、Store 或发行批准；候选真实 source-prebuild 前进后仍拒绝 `candidate2-naming-consumer-v1.ts`，0 loaders。它未合入本次 f8；M957 正核对下一实际八文件组，本轮不重复审阅。实际 package 211／原声明 180、空 outer registry、旧 seals 与缺失 admission receipt 继续单列。当前完整业务回归、正式 Electron 构建、新安装包、签名与跨机验收未完成；有限 DOM、Vite 与源登记工具通过不代表完整传统用神或姓名验局完成。

原件：[f8 root 111 项及类型／Vite](D:/Codex-NamingStudio-Evidence/m953-root-ui-integration/result.json)、[M949 前端限定审阅](D:/Codex-NamingStudio-Evidence/m949-c2-generation-ui-audit/REVIEW.json)、[M935 固定 Store 修订](D:/Codex-NamingStudio-Evidence/m935-native-delta-review/receipt.json)、[M939 七 native 阶段](D:/Codex-NamingStudio-Evidence/m939-native-fault-evidence/receipt.json)、[生成 route](D:/Codex-NamingStudio-Evidence/m936-c2-route-audit/REVIEW.json)、[审阅 route](D:/Codex-NamingStudio-Evidence/m952-c2-review-route-audit/REVIEW.json)、[M950 状态边界](D:/Codex-NamingStudio-Evidence/m950-candidate2-review-boundary/M950-receipt.json)、[M950 反馈组件](D:/Codex-NamingStudio-Evidence/m950-candidate2-review-feedback/M950-DESIGN-receipt.json)、[路径优化范围](D:/Codex-NamingStudio-Evidence/m941-native-realpath-audit/receipt.json)、[后续启动记录](D:/Codex-NamingStudio-Evidence/m936-observer-fix/delivery/M936-RESULT.json)、[十五文件登记工具独审](D:/Codex-NamingStudio-Evidence/m944-registration-tool-audit/receipt.json)。

新 40 条说明 family 仍仅 main-runtime 显式 opt-in，默认覆盖增量 0；默认单字说明 521 字、另 60 字按需说明，材料并集 581 字。完整传统结论与实际持久化／服务／界面接线分别验收。下方 106 阶段及更早失败按原范围保留。

## M934 固定 106433f 的历史记录

本次源码核验基线为 `106433f748fe82c11f714e969be38898e5b7e769`（2026年10月26日）；后续精确变更看[任务板 TASKS 入口](D:/Codex-NamingStudio-Evidence/m587-product-integration/work/.local/team-392/TASKS.json)及对应原件。文档提交不作为产品“最新版”或构建批准。正式已交付安装包仍为 **1.0.37**，223 文件／2625 项完整回归属于该历史版本。

- **原记录目录与继续操作：** 原记录发现、只读原 snapshot／来源打开已整合；显式继续 `1f89a3a→106433f` 也已整合。限定独审为 6 个 native DOM 场景／142 项断言及 6 组 helper 检查；root 在本基线的 4 文件／60 项通过、0 skip，类型检查及 Vite 通过。API 夹具、真实路由和持久化验证分别记账，不用这 60 项证明完整真实后端闭环。旧 App 共享锁与 method guard 两项 P2 已有后续限定关闭记录，不再列为当前待修。
- **40 条说明 family：** `1dfc545+25c6d76` 已在 root `38df5dc` 整合，zero-adoption 原 P2 的限定独审 5 项关闭；root 两文件 27＋66＝93 项通过，另 1 项明确标为 Store 待接入而 skip。已具备 main-runtime 显式 opt-in 加载、资格、生成及回放；Store、Service、API 和 UI 接线尚未完成。默认关闭、覆盖增量 0，仍为默认说明 521 字，另 60 字按需说明、材料并集 581 字、余 198 字。
- **已接受的局部性能与输入边界：** 已合至 `fb417fc`，root 3 文件／113 项通过、类型检查退出 0。接受的 `f02b737` 固定样本 prepare 均值约 38.54→32.12 秒、commit 约 16.83→14.15 秒；整体 15 秒目标未达。M930 第二微优化 ABBA 无收益，产品改动已拒绝并恢复，`0c12f16` 仅测试交付待审，不作为新性能改善。
- **C2 存取与路由：** v2 mechanics 已整合 `2266bc4`；独立 Store 候选 `9657228` 有 137243 毫秒单例通过记录，但固定版本仍有 postcommit 状态和按 JSON 猜 locator 两项 P2。02 后继修订、NSBK／delete／新 phase 未完成整体验收，不将 WIP 当作关闭。路由 `8809df9` 仅独立候选 26 项边界测试及类型检查，无真实初始化 Service 正例，也未在本基线整合。
- **组件与真实重开：** `b479964` 是只读语义组件候选，作者 51 项 SSR、6 个 DOM 场景／144 断言及类型检查保留组件范围，实际 adapter／App 接线和独立验收另列。M926 两个 fresh Node 进程重开共 38979 毫秒，只支持其读回／历史范围；子进程未自报 runtime 指纹，不代表 OS 重启、崩溃恢复或 15 秒达标。
- **真实 Vite／App 失败：** M930 单次真实运行 230214 毫秒后启动失败，观测 HTTP、UI、Service／Store 业务均为 0；原 receipt 的 coverage 字段是目标计划，不是已执行覆盖。失败保持失败。M934 小步启动定位只观测到 about:blank 在 `Network.enable` 等待，尚未到 `loadURL`；不据此宣布产品已验收，后续对照仍待验证。
- **源码准入与发布：** 本基线尚未整合 `8318221` 七文件登记候选。可读 M933 独审报告已给出该候选的限定 PASS，但不授整产品准入；候选真实 gate 识别七文件后仍拒绝 `project-v132/consumers.ts`，0 loaders。外层空 registry、旧 seals、缺失 admission receipt 及 package 211／180 差异继续保留。旧 a168 的 198 与 ecf 的 210 身份 inventory 各属固定观察，不作本次 106433f 完整批准。当前组合全量业务回归、正式 Electron 构建、新安装包、签名和跨机验收均未执行。
- **证据磁盘：** 已有恢复记录显示 E 盘曾仅余 4096 bytes；348497920 bytes 归档保字节迁到 D，原路径保留为链接，后续记录观察 E 约恢复 4 GB。该记录不表示删除客户数据，也不把全部空间变化归因于这一归档；新证据存 D，本轮未搬动旧证据。

本批依据：[原记录显式继续独审](D:/Codex-NamingStudio-Evidence/m931-cultural-continuation-audit/REVIEW.json)、[106433f root 60 项／类型／Vite](D:/Codex-NamingStudio-Evidence/m932-root-integration/result.json)、[40 条 family 独审关闭](E:/八卦周易/.local/team-926/semantic-runtime-audit/delta-25c6d76/receipt.json)、[root 93 项与 Store skip](E:/八卦周易/.local/team-928/integrated/semantic.json)、[root 113 项](E:/八卦周易/.local/team-928/secondary/result.json)、[接受的局部性能](E:/八卦周易/.local/team-928/perf-audit/review-result.json)、[M930 无收益交付](D:/Codex-NamingStudio-Evidence/m930-cultural-performance-stage2/evidence/delivery-receipt.json)、[Store 两项 P2](D:/Codex-NamingStudio-Evidence/m931-native-store-audit-decision/M931-AUDIT.json)、[路由候选](D:/Codex-NamingStudio-Evidence/m931-candidate2-service-wire/delivery-receipt.json)、[fresh Node 限定重开](D:/Codex-NamingStudio-Evidence/m930-reopen-audit/REVIEW.json)、[M930 原失败](D:/Codex-NamingStudio-Evidence/m930-cultural-catalog-real-router/delivery/M930-RESULT.json)、[M934 启动定位](D:/Codex-NamingStudio-Evidence/m934-electron-startup-triage/M934-static-diagnosis.json)、[七文件登记独审](D:/Codex-NamingStudio-Evidence/m933-source-registration-audit/REVIEW.json)、[迁移与磁盘观察](D:/Codex-NamingStudio-Evidence/m931-root-state/state-ledger.json)。

**基线后的独立记录：** 当前已可读后续 `1a9bad6` 的[收据](D:/Codex-NamingStudio-Evidence/m934-root-integration/result.json)：组件 57 项、验证工具 41 项、类型检查和 Vite 通过，semanticViewAppConnected=false、formalElectronBuild=false；[实际源码门禁](D:/Codex-NamingStudio-Evidence/m934-root-integration/source-prebuild.json)仍拒绝 consumers.ts。此记录不回填为 106433f 的 60 项，也不把名为 source-gate 的驱动退出 0 解释成门禁通过。后续精确整合状态看 TASKS 与对应提交。

## M924 固定 b677 的历史记录

本次源码核验基线为 `b6773530ef941d48b72a451f5d7ab5831abe074a`（2026年10月26日）；后续精确变更看[任务板 TASKS 入口](D:/Codex-NamingStudio-Evidence/m587-product-integration/work/.local/team-392/TASKS.json)。本页文档提交不是产品“最新版”或构建批准。正式已交付安装包仍为 **1.0.37**；223 文件／2625 项完整回归属于该历史版本。

- **文化工作流：** App 接线三项变更已整合，另合入 `71e8525` 控制器修订；root 在 `21c9a98` 的 71 项 App／DOM 夹具测试通过。Service／IPC／HTTP 与设计组合在 `ff78703` 已有 root 191 项测试、类型检查和 Vite 构建通过，原“接口未接／D06 未提交”不再描述本次基线。这些结果保留各自源码和夹具范围，不代表真实 Service 的完整 App 端到端或当前整产品独立审计通过。
- **恢复：** `5ca2f03` 同操作缓存范围有独审原 10 项及修正后的补充 2 项通过，首次组合 11 过／1 失败原件保留，不写成单次 12 项全绿；root 另有 10 项负例通过。115155／109579 毫秒只证明两次运行在 120 秒内完成正确性检查；较慢一次仅余 4.84 秒，prepare 约 39 秒、commit 约 17 秒，原 15 秒性能门仍未达到。
- **目录与现代指标：** 文化目录后端及接口已有 root 77 项测试和类型检查通过，App 目录界面仍在开发。现代指标 `f4bbff0` 与 `36b1e77` 有效性修订已整合，root 32 项测试、类型检查及 Vite 通过；旧相关套件 42 过／2 失败保留，未测量项不写成已有测量。
- **新核心生成：** `7824132` 仅到 `generated-unpersisted` 封装，尚未接入 Store。原 30 秒时限运行的 9 过／6 超时与新 120 秒时限运行的 17 项通过分开保留，不拼接成整链路成功；生成采用、保存、历史和报告仍待闭合。
- **说明资料：** M923 新独立语义 family decision 支持 40 条单字说明（37 条原文案、3 条收窄文案），旧 38／2 与川 hold 的原决定保留；family loader 正在实现，实际加载、生成和保存恢复尚未执行；默认单字说明仍为 521 字，另 60 字按需说明，材料并集 581 字、余 198 字。不能把 decision 当成实际加载后直接加 40。
- **已知缺陷：** App 共享写锁覆盖不足、可变 method guard 两项 P2 已由独审确认，Dev06 正在修复。实际 App→HTTP→Service／Store 端到端原自动运行 0 过／1 失败；后续 28 项离线判读不改写该运行结果，root 验收待定。两项缺陷保持待修，整体独审尚未完成。
- **构建与发布：** 最后实际 source-prebuild 在固定 `a168b151` 失败。M921 的 198 个未知／漂移身份 inventory 只观察该固定源码，不批准本次 b677 组合；`productionAdmission=false`。M754 八项声明已在后续限定闭包工作中补齐，不能继续沿用 M917“八项仍未闭包”，也不能据此宣称当前精确构建来源已获准入。当前组合全量回归、正式 Electron 构建、新安装包、签名和跨机验收均未执行；Vite 通过不替代这些项目。

本批原件：[App 71 项](E:/八卦周易/.local/team-922/app-integration/tests.json)、[API／设计 191 项](E:/八卦周易/.local/team-920/integration/cultural/integrated-receipt.json)、[恢复 root 10 项](E:/八卦周易/.local/team-922/integrated-restore/tests.json)、[目录 77 项](E:/八卦周易/.local/team-922/catalog-integration/tests.json)、[现代指标 32 项](E:/八卦周易/.local/team-922/metrics-integration/tests.json)、[App 两项 P2](E:/八卦周易/.local/team-923/app-write-lease-audit/receipt.json)、[核心生成独审](E:/八卦周易/.local/team-923/core-factory-audit/delivery-receipt.json)、[M921 固定 a168 观察收据](D:/Codex-NamingStudio-Evidence/m921-source-prebuild/receipt.json)、[M754 后续闭包收据](D:/Codex-NamingStudio-Evidence/m917-package-closure/evidence/M917-D03-CLOSURE-RECEIPT.json)。另见[恢复独审与分次补测](E:/八卦周易/.local/team-922/restore-scope-audit/audit-report.md)、[恢复计时](E:/八卦周易/.local/team-922/restore-scope-audit/performance-evidence-summary.json)、[核心两轮时限运行原件](D:/Codex-NamingStudio-Evidence/m921-candidate2-generation/delivery-receipt.json)、[40 条新 family 决策](D:/Codex-NamingStudio-Evidence/m923-semantic-admission-decision/receipt.json)、[E2E 原失败](D:/Codex-NamingStudio-Evidence/m923-cultural-e2e/work/.local/m923/test-result.json)及[离线判读](D:/Codex-NamingStudio-Evidence/m923-cultural-e2e/work/.local/m923/single-run-independent-review.json)。

## M917 文档状态（历史口径）

最新未来候选为 `8e5cc51f10aac4bcbaa52259bfa04d90ecd1af3d`。M916-D02 bounded 审计已绑定该候选；sourceIntegrity 已通过，但严格 package/source closure 仍不完整，剩余 8 个 M754 sidecar 为 README、admission-template、convention-candidates、coverage、dictionary-facts、editorial-input、source-lock、source-pins。D06 尚未提交或形成可接受收据。

候选尚未执行全量回归、1.0.38 新构建、新安装包、签名、跨机验收或 release approval。正式安装包仍为已交付的 1.0.37；其 223 文件／2625 项完整回归及安装记录属于历史交付事实，不代表当前候选通过。

依据：[M916-D02 复核](D:/Codex-NamingStudio-Evidence/m916-audit-root/m916-recheck/REVIEW.json)、[M916-D03 sourceIntegrity](D:/Codex-NamingStudio-Evidence/m916-source-lock-maintenance/evidence/after-source-locks-maintenance.json)、[M910 build-only 收据](D:/Codex-NamingStudio-Evidence/m910-build-receipt/receipt.json)。

## M906 文档同步（历史口径）

当前主线为 `03d13b668d723f3a68bd40751ea78a515612430b`，未来集成候选为 `7e8f914f6f7ca2e871f6aba37157e4b7070ab5f2`。本轮只同步文档，不改运行源码、数据、冻结证据、客户库或2f签名源。

M894 UI来源绑定审计按限定范围通过；M872资格服务线保持只读，独立资格与真实HTTP检查均通过，未增加生成权限。M882/M900 compact性能候选审计通过，固定样本的投影重用与负例检查保持原240秒／15秒预算，未执行新的规模或性能门。M888/M905条件准入审计为17/17通过，60行矩阵每个上下文14条eligible、6条pending、0条general，未接入Service、Store、App、API或UI。

M897未来真实HTTP为4/4；M901/M902浏览器生成与SQL保存证据只覆盖未来UI候选。M891主线完整回归未完成：7项均skipped，两个既有M480 beforeAll在未改动的10000ms setup hook超时，未产生断言通过。M899 C2生成、当前/历史、CAS及备份恢复持久化尚未交付，当前仅保留[M873 C2接口冻结合同](D:/Codex-NamingStudio-Evidence/m873-core-session-contract/INTERFACE-FREEZE.json)作为未完成边界依据。M902文化存储审计确认非空文化CAS、修订幂等、source capsule Store接线及完整NSBK回环尚未实现；provider/offline模块不是已发布产品路径。

正式安装包仍为1.0.37；1.0.38尚未正式交付。当前没有新增完整回归、安装、签名、跨机或完整传统用神／奇门姓名验局完成声明。

依据：[M894 UI审计](D:/Codex-NamingStudio-Evidence/m894-reviewed-app-recheck/REVIEW.json)、[M896资格审计](D:/Codex-NamingStudio-Evidence/m896-core-eligibility-audit/audit-evidence/REVIEW.json)、[M900性能审计](D:/Codex-NamingStudio-Evidence/m900-performance-audit/REVIEW.json)、[M905条件准入审计](D:/Codex-NamingStudio-Evidence/m905-character-meaning-audit/REVIEW.json)、[M897真实HTTP](D:/Codex-NamingStudio-Evidence/m897-future-http-integration/vitest-final.json)、[M891回归结果](D:/Codex-NamingStudio-Evidence/m891-main-default-genuine/vitest.json)、[M873 C2接口冻结合同](D:/Codex-NamingStudio-Evidence/m873-core-session-contract/INTERFACE-FREEZE.json)、[M902文化存储审计](D:/Codex-NamingStudio-Evidence/m902-cultural-storage-audit/REVIEW.json)。

## 2026年10月25日早前快照（08b阶段，历史保留）

以下段落保留M795读取时点的08b状态，不覆盖上方M906最新结论。

正式安装包仍为 **1.0.37**，当前源码版本为 **1.0.38**。本页当前结论绑定主线提交 `08b7620148b182b3638483e5a24612cad0edf7bf`；完整分项与外部证据见[开发进度](DEVELOPMENT-PROGRESS-2026-10-25.md)。下方历史章节保留各版本当时的测试数量和失败范围，不作为新版本重新验收。

**当前运行与存储限定验收。** 当前已验主线为 `08b7620148b182b3638483e5a24612cad0edf7bf`，运行修复为 `13b90d810c3a30dbe1a08cbc7ff59d499d077826`。M775原3项P2已关闭，原5组独立探针通过；08b仅调整合法SQL故障注入夹具并经M787审阅，未增加运行代码修改。M778收口复用原7文件／44项通过，另一次调用验证修订文件3项通过；它们不是同轮47项，也不是完整仓库回归。 直接依据为[M775-r2独审](D:/Codex-NamingStudio-Evidence/m775-compact-source-audit/r2/REVIEW.json)、[M778选择性收口](D:/Codex-NamingStudio-Evidence/m778-storage-main-acceptance/selective-final.json)及[M787夹具审阅](D:/Codex-NamingStudio-Evidence/m787-rollback-fixture-audit/REVIEW.json)。M743此前6文件／27项Vitest、19项Node、1项覆盖检查与类型检查仍保留限定范围，不转作08b完整回归。

**未来候选与规模单列。** 新核心candidate.2已通过M786输入边界限定复审，但仅futurem768，主线08b仍未接入该核心；完整传统取用、应用和整产品验收未完成。M754早期10字pending已推进为5条通用、5条精确主题的项目物象已审模块（M777／M783）；仅在futurem768候选，Service／Store、持久化和生产默认接线尚未完成，正式覆盖增量仍为0。 M752原3条general／6条conditional／1条pending是原准入决策，不增加生产覆盖。M750运行版本current-r2仍为10/1000条、120候选、30历史，元数据更正不重跑原10例，collector5项不与10例混计；不借给当前08b规模验收。当前收据为[元数据更正收据-r2](D:/Codex-NamingStudio-Evidence/m750-storage-scale/.evidence/m750-current-r2/m750-final-receipt-r2.json)，其余规模、容量和15秒性能门未完成。

**当前发布阻塞。** 当前M774／M794仍在完成最终source组合。M790仅关闭外部证据输出和注册状态测试两项控制P2，不代表finalreceipt、来源准入或构建通过；M794对实际sidecar字段的解析由开发04修订。1.0.38尚未正式交付，最终CI／来源准入、构建安装、完整回归及规模验收继续待验。 依据[M790限定控制修复独审](D:/Codex-NamingStudio-Evidence/m790-source-controls-audit/REVIEW.json)与[M795调度](D:/Codex-NamingStudio-Evidence/m795-progress-docs/evidence-read/dispatch.json)；本轮未新运行来源门或构建。既有原生关闭人工通过保留其版本范围，当前新构建原生交互、真实外部AI、签名与后续跨机验收仍待完成。

## 已交付：1.0.37

最近一次已交付版本的完整回归为 **223 个测试文件、2625 项通过**。

已只读核对[1.0.37实际发布记录](../release/NamingStudio-1.0.37-verification.json)元数据：schema为naming-studio-local-delivery-verification/1，状态local-verified-release，published与publicationExecuted均为true，源码为`4e8c12b1159c82ccd1503350b0003c33aac6fc58`。executedGates.fullRegression记录223文件、2625总项、2625通过、失败0、未完成0，确认其为已交付版本。独立worktree缺少release目录不否定该已读原记录。

元数据核对不是新运行验收：本轮未重新验证安装程序、SQL、PDF或原生交互，不把历史6份PDF／202页及安装流程移算到1.0.38。早先原生关闭的实际人工通过继续保留；当前1.0.38源码尚未正式交付。

## 本机验收完成：1.0.35

1.0.35已实际构建、打包并在当前Windows安装运行。完整回归为 **198个测试文件、2384项通过，0失败、0跳过**。安装程序与安装后应用均退出0；移除开发工具PATH后运行通过，未使用正常客户数据库或结束用户进程。正式记录见[1.0.35验收记录](../release/NamingStudio-1.0.35-verification.json)，功能范围见[本版说明](RELEASE-1.0.35.md)。

本版新增304字通用单字取意、161字人工待核说明，并保留82字待审和15字暂不推荐的状态；另有20个独立核对的整名出处。通用取意、完整名字的原句选义、项目家庭期许分别说明，新增展示不额外增加语义、主题或行业分，旧方案不回填。详细口径见[命名释义7.0](NAMING-MEANING-V7.md)。

覆盖口径更正（2026-10-25）：真实加载器重算并经独立审查，基础217字与自动补充304字交集为0，默认自动展示并集为521字。当前开发候选另有60字按需单字解释（含旧40字），与前两组不重叠；581只表示自动或按需可展示材料的并集，不能称581字自动推荐。尚余198字，为125字人工待核、58字待审与15字暂不推荐。40条条件词语另列，新增B04的20条词语只读查询仍未激活，均不增加自动单字资格。原217字中主题取义的同读音门有215字，冬、秋的旧展示不因此升级为该门认可；按所选读音核对，不借默认读音寓意。以上新增资料不额外产生语义加分、整名结论或五行属性，旧交付产物保持所属版本记录。

实际安装库由独立只读核验器回读：31份方案、12条历史、31份档案和4个知识包归档，数据库校验前后字节不变。构建与安装ASAR一致，75个运行文件、3945个工作区载荷文件、234个嵌入源码、275个必需文件、30个来源锁及51项来源约定核对通过。仍有9项历史或构建用原件未随包，不将本结论称为完整上游原始资料载荷闭合。

开发版与安装版共6份真实PDF、136页全部渲染；3772个段落、列表、表格单元、标题与引用文本块与PDF提取文字匹配。全部52种不同像素页面通过联系表浏览，3页放大核对、3张安装截图直接检查；相同像素页面复用该观察。未声称逐字人工阅读全部页面或覆盖任意未来名字。分节和完整提醒区块保留部分留白。

首次开发版自动验收在600秒达到时限：已生成3份PDF，但截图及最终结果未完成，原因仍未定位。原程序、驱动和时限未修改的新隔离开发复核正常退出，随后实际安装版也通过；失败与诊断记录保留，不并入通过计数，不将独立诊断当正式验收。预览接口中文跨数据块解码导致合法保存被拒绝的确定缺陷已另行修复并加入正式仓库回归测试。

## 已有验收与维护基础

1.0.34已交付官方2021年历史姓名统计，共20条已登记新生儿给名记录；其192文件／2343项回归保留所属版本语境。榜外人数未知，不推断当前全国全名重名率，不影响原评分。

1.0.33原生关闭的“继续编辑”和“放弃修改后退出”已有人工操作及同实例机器记录：[补充验收](../release/NamingStudio-1.0.33-native-close-verification.json)。该结论不包含原生文件选择器，也不冒充新版全部关闭路径重新验收。

当前已有本地Git仓库、Windows CI配置和统一验证入口；本次基线的Git remote为空，本轮未执行远程CI，不能把本地配置称为远程CI已通过。维护检查的177项通过记录保留原验证范围。README与本状态页属于外部发布状态文档，明确不装入安装载荷；功能、使用与许可资料仍按包内清单提供。

开发依赖锁另有一项已知元数据不一致：1.0.35冻结锁的combined-stream版本写为1.0.12，但同项下载地址、完整性摘要与实际安装的5个原件均对应npm发布的1.0.8。已核安装包未含该依赖目录；1.0.36分支已仅校正锁版本字段，没有替换库代码。当前本机验收不等于干净npm ci重建或远程CI验证。

## 当前仍未完成的目标

- **八字取用：** 已有基础扶抑候选、任注限定条件和固定版本项目取法；完整传统用神、成格与救应判断仍未完成。M786 的 candidate.2 输入边界复审保留；本次 f8 已合入显式 C2 生成前端；Store 原两 P2 已有 d753／M939 限定关闭，真实 native Service／App 生成与审阅全链路、完整存取／来源／性能及发行验收仍未闭合。
- **奇门姓名：** 已有基础盘、有限结构检查和独立意象实验；同一明确取法的姓名／字形落宫、真假空墓、四害作用及完整验名仍待完成。
- **命名说明：** 779字中自动单字说明521字，另60字独立按需说明，材料并集581字，余198字。521不是排他生成池；40条条件词语和B04只读20条另列。逐字说明不等于整名已获认可。M752 的 3／6／1 与本批新 40 条均分开记录；main-runtime 显式 family 已整合，实际 Store／Service／UI 尚未接入；默认说明覆盖不增加。
- **五行与物象：** 257字有原项目意象标签、522字未标，不能据此称257字已完成传统五行证明。原 56 字物象候选不自动激活；新 10 条模块按各自方法显式使用。文化工作流的 Service／API／App 已在本次基线整合，旧 App 两项 P2 已限定关闭；当前整体审计、真实路由／存取和性能仍未闭合，不增加生产默认标签覆盖。
- **语言与现代指标：** 已交付粤拼、有限词表及官方历史给名统计；多音采用、方言与谐音覆盖和现代评价实证继续补齐，不推算当前全人口重名率。
- **规模与性能：** M750原运行完成10/1000条，120候选／30历史修订属于该运行首阶段，不能充作13b／08b新运行规模验收；1000条完整验收、容量极限、每100条备份和原15秒性能门未完成。
- **发布维护：** 本机历史安装与报告验收、本地Git及Windows CI配置已有；当前精确来源准入、最新完整回归、构建安装、当前新构建原生交互、真实外部AI、代码签名、远程CI与后续跨机验收未完成。

## 独立1.0.36与1.0.37集成进度（历史口径）

1.0.36 已整合词音、整词读音参考、人工意象确认、语境词义和现代实用性记录。真实开发桌面三案例完成43次IPC（42成功、1次预期旧令牌拒绝），3方案、23条历史及备份恢复核对通过；3份PDF共101页完成全文提取检查及19种代表页面视觉检查。最终构建的单选框尺寸、标题和面板宽度已通过实际浏览器复核。这些结果尚不代表安装版验收。

首次标准全量实际207文件、2472项：2450通过、6失败、16未执行；另有modern-ui测试因依赖仓库外夹具而收集失败。已分别修复三个真实旧方案保存/恢复回归、三个持久化默认时限问题、词义测试环境变量初始化和界面夹具路径。相关28项兼容、10项组合、16项词义及13项界面用例各有明确限定复验记录；未把它们拼成一条虚构全量通过记录。第二次标准全量在1.0.36分支707d487完成：207文件、2485项全部通过，零失败和零跳过，冻结输入前后保持一致。该包随后发现既有历史客户归属缺口，保留为测试候选，未安装或正式发布；修复已进入1.0.37。

1.0.37 已实际合入词义资料1.1、备选读音界面及Service/桌面/预览接口、词典索引复用和按方案读取历史的优化，以及legacy兼容、历史SQL与JSON客户归属校验、35来源锁维护、74项资源门禁、异步worker和退出时机修复。早期512ce1d冻结版完整回归218文件、2587项，实际2580通过、7失败、0未执行：4项测试写死旧词义来源，3项集成用例达到5秒时限。失败记录和原安装包均保留。

后续0b2affb冻结版实际完整回归为 **219文件、2603项全部通过，0失败、0跳过**，1087项冻结输入前后无漂移。该版已构建安装程序并通过4005个工作区文件、280份内嵌源码、335个必需文件、35份来源锁的只读载荷检查。实际开发桌面145流程完成43次IPC（42成功、1次预期旧令牌拒绝）、3份方案、23条历史、备份恢复与历史恢复见证；3份PDF共101页完成内容及限定代表页面检查。另有独立SQL核对实际current/history/backup完整记录及输出文件，源数据库字节不变。这些结果属于0b2affb候选，**尚未安装或正式交付**。

原生界面准备脚本随后修正了实际App重新载入、键盘输入序列和退出保护监听器的就绪时序。独立R4诊断构建ffc5f7b于2026年10月22日完成真实系统对话框的继续编辑与放弃关闭：同实例两次选择分别为0与1，取消后实际读音查询、未保存草稿及数据库均保留，最后worker关闭且进程自然退出0。其原件、真实来源故障恢复和282项运行文件经过限定核对；前一轮误选按钮的失败记录保留。精确触发器焦点恢复与无条件清理/完整Promise取消仍未由这次验收证明。

相应9文件已移入最终候选4e8c12b，旧refresh夹具的组合兼容修订已完成。该版1095项输入的新冻结完整回归为 **223文件、2625项通过，0失败、0跳过**，捕获前后冻结一致；其结果独立于0b2affb。新安装包构建完成，应用ASAR与实测R4的ASAR逐字节相同；4005项工作区载荷、335个必需文件、35份来源锁/56项约定、74项资源及三个实际加载器均已完成限定只读核对。

本次开发桌面145与实际安装版145均已自然退出0，安装版移除了开发工具PATH。两套独立数据库分别回读3份档案、3份方案、23条历史和1个知识包归档，完整current/history/backup、历史目标与审阅令牌、报告文件均匹配，回读前后数据库字节不变。安装ASAR与构建ASAR相同，75项安装运行文件及完整声明载荷核对通过；4005项工作区比较包含3999项字节一致与6项明确元数据归一处理。开发与安装共6份PDF、202页的7540个可见文本节点、6038个内容单元全部匹配；110种唯一页完成缩略总览、10个PDF代表页直接复核，另检查两种运行模式的截图。已知3处逻辑位置、两种模式共6页存在标题留在页尾而正文接下页的轻微分页问题，内容无缺失；不声称202页逐字人工检查。早期验收工具的外部计划路径和Windows分隔符误比较均在应用启动前停止，失败原件保留。最终交付采用明确的M159分项证据模式；既有固定输出目录的统一聚合检查器本次未执行，未宣称其通过。诊断OS路径的同源证据不替代两次独立运行，9项未随包的历史/构建原件缺口继续保留。

词义1.1新增20条有精确义项的整词语境，与原20条组成40条；历史1.0仍按原证据读取。整词语境独立于逐字展示，不增加已交付7.0的521字默认逐字文本范围。新增六项资料已进入安装声明，实际74/74项原件、打包覆盖及三个原有MJS加载器门禁通过。构建前调用该检查，安装启动不依赖开发版package元数据。

备选读音保持原文、原字形、不同读音和参见/未知状态，不改变保存名字读音或评分。新的真实Node worker及Electron ASAR组件已验证首次解析移出主线程，原件每请求仍核SHA；后续R4诊断已覆盖实际main、IPC、worker、读音界面及两次真实系统退出选择，范围见上段。取消退出导致worker提前永久关闭的问题已改为真正退出时清理。早期同步API或组件的结果各保留自己的验证范围。

标准预览启动已接入自动构建worker；其初版组合测试30通过、1失败，原因是启动夹具误用正式构建目录。隔离修复已合入，完整仓库并发5文件23项真实复验通过，正式构建产物字节保持不变；原30通过1失败的记录保留。

一般取用主链的跨日缺时遗漏和从儿代数排除两项P2在明确项目范围内复审通过。默认月支入口保持；月干提案显式启用，默认月支身旺从儿正例和经典充分性仍未证明。早期1.1预览的68项组合与5次真实HTTP/11组界面结果保留所属范围，不能作为新的1.3.1生成采用证据。

后续功能分支已接通1.3.1独立固定资源、采用门、实际本地与AI候选消费、完整证书、生成时来源与保存后固定版本回放。条件未满足时在AI调用和客户/方案写入前拒绝。实际集成的3文件24项通过且14986项源码、数据和运行输入前后SHA一致；另有独立11项完整性与1项旧方案人工审阅兼容检查通过。后续修正了审阅态人工五行与生成时偏好的区分、序列化之前的访问器拒绝顺序和合法审阅草稿的读取；对应真实Service的草稿保存及两个零getter用例3项通过，14996项输入无漂移。上述记录分属各自源码版本，不拼为一条虚构全量结果。

正式1.3.1预览接口已连通Service、Electron IPC、preload和浏览器本地HTTP；7次实际HTTP请求验证正例、完整blocked理由、非法选项、超参数及来源拒绝，库字节不变。取法选择、应用门、保存快照卡片已通过38处有限接线进入实际App，整合后的类型检查通过。后续真实React/HTTP/Service完成12项断言、17次API：项目正例生成40分、条件不足时禁生成、入口/出生资料切换后旧门失效，审阅水草稿保存后重开仍保留生成时土金、证书与40分；84份源文件前后无变化，独立浏览器和服务正常关闭。浏览器报告的通过不转借PDF。

随后单独修正PDF采用说明：项目方案照读保存的实际元素，后续人工草稿分列，不再错用原扶抑候选或审阅水草稿。4项仓库回归与全应用类型检查通过；6份真实旧方案的完整HTML逐字节相同。3份实际Electron PDF共90页完成文本与字符页面边界检查，生成与人工草稿的第2页分别完成代表性视觉复核，未声称90页逐页人工目检。该PDF修订与旧浏览器84源清单分开记录。完整传统用神与出生盘候选姓名验名目标仍未完成，这些功能尚未进入已交付安装版。

弹窗焦点另作后续修订：正常可信鼠标和键盘打开详情后可返回同一原按钮；当收藏筛选使原按钮真正移除时，关闭后返回同内容区标题。实际开发StrictMode首轮12项为11通过、1项确认缺陷：原生折叠标题`summary`未被纳入可聚焦列表，Tab提前循环导致审阅框不可达。保留该失败后，仅补入原生summary资格，继续沿用tabIndex与可见性过滤；新的隔离实际App只补测4条受影响键盘路径，全部通过，185次HTTP均成功、零生成/预览/保存，数据库字节不变。两轮记录分开，不拼成一次全绿结果；可访问性树检查不等同真实屏幕阅读器验收。

## 1.0.38早期分支记录（历史口径）

以下保留早期分支的验证范围和失败；当前覆盖、正在执行任务和发布阻塞以本页开头为准。

父母姓名与家庭给名读音确认已在后续分支集成为5954d07。实际界面经13次API验证确认、保存、生成、刷新，以及修改live父名后保留旧方案来源和提示；本轮来源覆盖、历史/CAS、备份与保存提醒另有明确限定记录。方法JSON已补入后续打包声明，此功能尚未进入1.0.37已交付包。40个新增单字解释的7.1数据、固定版本消费与项目五行已经按78项有界变更接入1.0.38工作区；原137资源合同保持不变，新138源前置检查137项文件和三个实际加载器通过，全应用类型检查及生产构建通过。首轮8文件48项为47通过、1项测试前置条件缺失，补齐生成时冻结偏好后仅复验该用例通过，另5项未选中；不拼成一条虚构的48项同次全绿记录。新版本仍需完整回归、完整界面证据与安装验收。这段40字按需候选保留为早期记录；当前已核算默认自动521字、另60字按需解释，不能把当时材料并集561字当作自动展示范围。这些候选未进入1.0.37安装包。旧独立候选46份PDF／1354页及共同消费10＋2项记录保留其原有范围。

1.0.38的M170实际界面已验证八类行为，包括新71方案、旧70不变、冻结依据、保存后刷新和报告展示。采集器存在不同阶段请求编号重用覆盖：752条请求元数据中仅保留566条原始请求/响应、共1132个正文文件，最初186条原始捕获缺口保留；关键预览、生成、保存和当前SQL仍有完整实际证据。该结果只按有限范围通过，不能写成全量原始捕获通过；采集器修复与四条独立只读补充正在推进，不重复生成或保存来改写旧记录。

早期raw存储分支曾生成1000例唯一输入计划，实际完成58例后在第6批安全落盘暂停。数据库121544704字节、59档案/59方案/173历史，含一个尚未完成案例，不能计作59完成；新源码须从新的运行重新计数。压缩和去重候选已有逐字节回读、历史关联、外键、大小边界与小库迁移记录，尚未进入当前功能分支。M156旧诊断只完成222条迁移前缀，未提交迁移事务。较新的M160诊断在49.070秒完成临时库迁移事务提交，共59条当前方案与173条历史、合计232条；后续替换库的语义核验尚未完成，即在既有60秒父驱动时限终止，未原子安装替换库，原库字节保持不变，两次均未记为通过。其后M164候选减少重复解码并完成限定小样本验证；M174正按最新1.0.38依赖重新编译与验证，历史小样本不能冒充当前版本已完成迁移。60秒内完整迁移、真实1000例和最终集成验收均未完成。

协作模型按用户最新要求为：决策组GPT-6，其余指挥、开发01～05、设计、审计均GPT-6.1 Sol，推理级别ultra。五个开发组继续实现，审计独立复核；后续跨机验收沿用户此前暂缓安排，不重复索取确认。


## 更早组合的保留记录

以下M733／M734及M724段落保留当时的验证与阻塞，已由本页开头的M743快照更新；其中“正在”“尚未开始”“最新”等词只描述原记录时点。历史测试数量未改写。

## M733 / M734 旧组合记录（历史口径）

代码基线 e7b4e7f0b60234409ede8a4cc305baa7cb5079c5。启动返回方案摘要页与存储状态，不再通过 bootstrap 返回全部完整方案；目录筛选和计数覆盖全目录，详情进入既有 verified reader。compact 摘要不读取分析叶子，游标绑定查询和客户库代次，过期后从首页重查。旧库具有主动迁移入口，迁移前备份保留；恢复转换后的最终容量、根对象与外键检查在覆盖文件之前执行。

13 个测试文件、84/84 通过，完整 TypeScript 检查退出 0；隔离真实 HTTP 联调 12 步通过。真实浏览器完成目录读取、按需打开和候选备注编辑，未保存状态保持可响应。修复存储测试夹具后，原 6 个失败由 21 个有效负例覆盖；未删除拒绝断言或放宽原超时。

前端生产构建成功；Electron 构建仍被固定来源扩展门阻断：qiongtong-clause-reference-preview.ts 的现有字节未登记（本批未修改该文件）。M738 负责精确补审与准入，禁止跳过门禁。本批不是安装包交付；完整回归、规模/容量极限、15 秒性能、签名和跨机验收仍未完成。完整术数核心及命名数据覆盖仍在继续开发。

本次组合收据：D:/Codex-NamingStudio-Evidence/m733-session-integration/.local/m733/acceptance.json。此前并行回归 83/84（1 个预算用例超时）和构建失败均保留；串行组合通过没有提高超时。

原记录日期：2026年10月25日。最新组合代码为提交e7b4e7f0b60234409ede8a4cc305baa7cb5079c5；下方 M724 等记录保留各自当时的验证范围。

M724 文档审计只执行了Git提交、文档和外部证据路径核对：未执行完整回归、构建、安装、SQL、PDF、签名或跨机验收。M724新增状态见下方增量记录。

当前统一开发分支已接入庚巳参考、三条《穷通宝鉴》字面条件预览与B04词语查询界面。B04已完成4条真实App查询、来源与项目解释分栏、未知词性及未激活状态展示；原字库列表与统计保持，整窗客户库字节未变。四条新增甲日条件正接入原查询界面，尚未计入已集成能力。

发布阻塞仍包括最终来源准入、最新组合完整回归与安装验收，以及原15秒性能门。最近一次无分析器原预算测试为42.2965秒，未通过；新的JSON遍历优化只完成限定源码审查，尚未运行该性能验收。当前版本紧凑存储接线已完成正常流程专项；独立审查发现恢复设置、失败回滚连接和完整校验链三项缺陷，正在修复，尚未合入。旧存储分支35例只作兼容性证据，当前统一版本的1000例规模验收尚未开始。

## M724 旧增量记录（历史口径）

- **M700 已集成：** 主线包含 Jia-Hai UI panel/state/CSS 和 panel test。外部 manifest 记录33/33 focused tests与focused typecheck 0；Browser/native screenshot、SQL、Worker、full project typecheck/build/install、签名和跨机验收均未执行。
- **M708 仍未集成：** 外部 M708-CORE-1.2-RESULT 仍为 candidate-ready-for-independent-audit，记录33项边界测试和类型检查通过，但 full regression、API/UI/Store integration、production build/install、root merge未执行，外部契约路径缺失；主线没有result sidecar。
