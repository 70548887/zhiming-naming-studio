# 开发进度：截至2026年10月26日（文件名沿用2026年10月25日）

## 当前后继入口：固定 841b 记录

后继共享 review 类型、十五文件登记工具和 M950 十文件已合至 `841bddd49096a09f2b75b96a7976e70c638266c9`。39 项 Node 夹具与 129 项 pure／SSR、类型检查各保留对应原件；M956 已封限定通过，App review／真实 native 全链仍未闭合。具体提交与收据见[当前状态](CURRENT-STATUS.md)。本次只补顶部文档，不运行业务、类型或构建。

## 固定 f8 进度入口（历史快照）

本次核验源码 `f8e272b1b0d077019ca2d267709378df17e405d9`。已合入显式 C2 生成 App／面板及只读保护，root 111 项前端组合、类型检查与 Vite 按 f8 原件保留；Store／route 限定审阅、M950 已交待接线及源构建剩余统一见[当前状态](CURRENT-STATUS.md)。本轮只同步两份文档，未重跑测试、类型检查或构建；正式交付仍为 1.0.37。

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

## M917 候选状态（历史口径）

最新未来候选为 `8e5cc51f10aac4bcbaa52259bfa04d90ecd1af3d`。M916-D02 bounded 审计已按该候选重新绑定；M916-D03 的 sourceIntegrity 为 passed，但 package/source closure 仍 incomplete，剩余 8 个 M754 sidecar 未闭包。D06 尚未提交或形成可接受收据。

全量回归、1.0.38 新构建、新安装包、签名、跨机验收和 release approval 均未执行。1.0.37 的 223 文件／2625 项完整回归与安装记录继续作为已交付历史保留，不作为候选验证。完整传统用神、成格救应和奇门姓名验局仍未完成。

依据：[M916-D02 复核](D:/Codex-NamingStudio-Evidence/m916-audit-root/m916-recheck/REVIEW.json)、[M916-D03 收据](D:/Codex-NamingStudio-Evidence/m916-source-lock-maintenance/evidence/after-source-locks-maintenance.json)、[M910 build-only 阻断](D:/Codex-NamingStudio-Evidence/m910-build-receipt/receipt.json)。

## M906 文档同步（历史口径）

当前主线为 `03d13b668d723f3a68bd40751ea78a515612430b`，未来集成候选为 `7e8f914f6f7ca2e871f6aba37157e4b7070ab5f2`。本轮只同步进度、发布和状态文档，不改运行源码、数据、冻结证据、客户库或2f签名源。

M894 UI来源绑定、M872只读资格服务线、M882/M900 compact性能候选审计及M888/M905条件准入审计均已按各自范围通过；M897未来真实HTTP为4/4。M891主线完整回归未完成，7项因未改动的10秒setup hook超时而skipped；M899 C2持久化尚未交付，当前仅保留[M873 C2接口冻结合同](D:/Codex-NamingStudio-Evidence/m873-core-session-contract/INTERFACE-FREEZE.json)作为未完成边界依据；M902确认非空文化CAS/NSBK与产品接线尚未实现。M901/M902浏览器与SQL证据只属于未来UI候选。

正式安装包仍为1.0.37；1.0.38尚未正式交付，仍需完整来源准入、构建与安装、签名及跨机验收。完整传统用神与奇门姓名验局仍未完成。本次没有新增完整回归、安装、签名、跨机或传统核心完成声明。

依据：[M894 UI审计](D:/Codex-NamingStudio-Evidence/m894-reviewed-app-recheck/REVIEW.json)、[M896资格审计](D:/Codex-NamingStudio-Evidence/m896-core-eligibility-audit/audit-evidence/REVIEW.json)、[M900性能审计](D:/Codex-NamingStudio-Evidence/m900-performance-audit/REVIEW.json)、[M905条件准入审计](D:/Codex-NamingStudio-Evidence/m905-character-meaning-audit/REVIEW.json)、[M897真实HTTP](D:/Codex-NamingStudio-Evidence/m897-future-http-integration/vitest-final.json)、[M891回归结果](D:/Codex-NamingStudio-Evidence/m891-main-default-genuine/vitest.json)、[M873 C2接口冻结合同](D:/Codex-NamingStudio-Evidence/m873-core-session-contract/INTERFACE-FREEZE.json)、[M902文化存储审计](D:/Codex-NamingStudio-Evidence/m902-cultural-storage-audit/REVIEW.json)。

## 较早08b阶段的保留记录

以下段落保留M795读取时点的08b状态，不覆盖上方M906最新结论。

本快照绑定主线 `08b7620148b182b3638483e5a24612cad0edf7bf`，运行修复为13b90d8，源码版本1.0.38；正式安装包仍为1.0.37。M795承接文档r2，只更新原三文档，不修改运行代码或历史发布原件；事实按已读收据范围记录。

## 较早主线的运行修复与限定验收（历史口径）

当前已验主线为 `08b7620148b182b3638483e5a24612cad0edf7bf`，运行修复为 `13b90d810c3a30dbe1a08cbc7ff59d499d077826`。M775原3项P2已关闭，原5组独立探针通过；08b仅调整合法SQL故障注入夹具并经M787审阅，未增加运行代码修改。M778收口复用原7文件／44项通过，另一次调用验证修订文件3项通过；它们不是同轮47项，也不是完整仓库回归。

M778保留初次8文件46通过／1失败记录；最终取原未改7文件44项通过，加上修订文件另轮3项通过，不拼成一次全绿47项。M787确认夹具在真实合法settings写入后注入异常，核对回滚、磁盘与内存、外键和SQL函数重新绑定及后续成功写入；08b只修改测试夹具，未放宽生产schema或超时。

- [M775-r2：原三项P2关闭、五组独立探针](D:/Codex-NamingStudio-Evidence/m775-compact-source-audit/r2/REVIEW.json)
- [M778当前主线选择性回归收口](D:/Codex-NamingStudio-Evidence/m778-storage-main-acceptance/selective-final.json)
- [M787合法SQL故障夹具独审](D:/Codex-NamingStudio-Evidence/m787-rollback-fixture-audit/REVIEW.json)

## M743此前主线增量（原验证范围）

M743此前已受审并进入主线，其验证不等于当前08b新回归。甲日字面条文接入现有查询界面，按需人工读取；M690手动扩展仍默认关闭，自动说明增量0；异步预览修复覆盖当前资料、API、请求代次、卸载及重新激活时的旧结果隔离。

M743验收收据分别记录：6文件／27项定向Vitest、19项Node检查、1项覆盖检查、类型检查退出0及有限浏览器验证。它们属于不同限定检查，不能相加称作完整套件通过。收据的 `releaseApproved` 为false，完整回归、生产构建、打包及安装版Electron未由该收据证明。

此前M733／M734的目录分页、按需读取、旧库迁移和恢复保护已有组合专项记录；13文件／84项及12步实际HTTP联调属于当时组合，不作为M743全量回归。此前超时和构建失败保留，不用后续定向通过覆盖失败。

- [M743验收收据](D:/Codex-NamingStudio-Evidence/m743-final-readers/.local/m743/acceptance.json)
- [M733／M734组合收据](D:/Codex-NamingStudio-Evidence/m733-session-integration/.local/m733/acceptance.json)

## 早期独立候选与集成边界（历史口径）

M742r2是独立1.3.2-r2核心的预览候选，候选提交 `85a7d50afb5edcda35dbe18a59ecab4dc5cc532a`。其候选记录49项定向检查和类型检查通过，M748-B完成限定独审；该早期候选和后续candidate.2仅属于futurem768；本页主线08b尚未接入该新核心的生产应用及保存链路。不能把预览候选当作已发布的完整取用核心。

原85a的Git载荷曾缺3个嵌套vendor发布文件，完整Git载荷需要补充提交 `875bb3ddb7f03b119e405e6cbb00495570c91c33`。next-integration分支已补齐；M769从该补充提交的固定Git归档实际重建通过，范围仅为发布载荷完整性，不代表整应用构建、安装或主线准入。不能将85a单独checkout写成已验证可构建；本页主线08b仍未集成该新核心。

- [M742r2候选结果](D:/Codex-NamingStudio-Evidence/m742-evidence/M742-R2-RESULT.json)
- [M748-B限定独审](D:/Codex-NamingStudio-Evidence/m748-core-r2-review/M748-CORE-R2-RESULT.json)
- [M769补充提交的Git归档重建审计](D:/Codex-NamingStudio-Evidence/m769-core-publication-audit/REVIEW.json)

后续M786的`project-naming-application/1.3.2-candidate.2`已通过输入边界限定复审：关闭原保存Proxy与调用方重新读取缺陷，验证拒绝和固定回放边界。该结论只属于candidate.2，不追认candidate.1，不代表UI／Service／Store集成、生产启用、整产品发布或完整传统解释。新核心仍仅futurem768，完整传统取用目标未完成。

- [M786 candidate.2输入边界独审](D:/Codex-NamingStudio-Evidence/m786-core-input-boundary-audit/M786-AUDIT-RESULT.json)

## 早期规模与性能（历史口径）

M750运行目录current-r2记录的目标为1000条，实际完成10条，下一索引10；首阶段5段运行累计120个候选、30条历史修订。current-r2是运行版本，元数据收据-r2指本次更正的 `m750-final-receipt-r2.json`，两者不混称。此结果只证明原运行已完成的10条及其收据所列检查，不是13b／08b新运行的规模验收。其余990条、1000条完整规模、物理容量极限、每100条备份、可选分层和15秒性能门均未由本阶段完成。

元数据更正已程序化处理三类汇总问题：分别标明worker与supervisor计时、纠正第三段数据库SHA抄录、将RSS区分为案例采样最大值与进程事件采样最大值；采样最大值不称连续峰值。原10例运行未重跑，原件保留；收集器5项测试单列为元数据工具验证，不与10个运行案例混计。M766-r2原调度将M763-r2记为独审进行中；本次未读取其新的正式独审结论，不把原状态当作新确认或已通过。

旧raw存储分支的58条完成记录、迁移诊断和此前42.2965秒的未通过性能记录均保留原版本范围，不并入M750完成数，不改写为当前统一版本通过。

- [M750当前元数据更正收据-r2](D:/Codex-NamingStudio-Evidence/m750-storage-scale/.evidence/m750-current-r2/m750-final-receipt-r2.json)
- [M750历史原汇总收据：含更正前问题，保留原件](D:/Codex-NamingStudio-Evidence/m750-storage-scale/.evidence/m750-current-r2/m750-final-receipt.json)

## 命名说明与字库口径

本地字库共779字。原217字与补充304字无交集，自动单字说明为521字；另60字按需说明与前两组无交集，材料并集581字。余198字由125字人工待核、58字待审及15字暂不推荐组成。40条条件词语与B04的20条未激活只读词语另列，均不加到自动单字说明数量。

**521是自动单字说明覆盖，不是排他生成池。** 生成仍按字库、所选偏好和实际约束筛选；说明资料不自动授予读音、整名、五行或评分资格。原217字中215字具有主题取义同读音门，冬、秋的历史展示不因此升级。

M752 历史结果为 3 条 general、6 条 conditional、1 条 pending，共 10 条准入决策，保留其原始范围。本批新 40 条语义 family 已整合 main-runtime 显式 opt-in 加载／生成，实际 Store／Service／UI 尚未接线，默认关闭，521／60／581 口径不变；各层加载、持久化和发布验收分别记录。

- [M752准入决策核验](D:/Codex-NamingStudio-Evidence/m752-meaning-admission-decision/verification.json)
- [M752资料清单](D:/Codex-NamingStudio-Evidence/m752-meaning-admission-decision/manifest.json)
- [现有说明覆盖实现](../src/main/naming-coverage-provider.ts)
- [命名生成实现](../src/domain/naming-v7.ts)

## 五行与物象资料的早期阶段（历史口径）

779字中257字有原项目意象标签、522字未标；257表示已有项目标签，不等于257字已获得完整传统五行依据。原56字物象候选默认未激活，不自动改写这些标签。

M754早期10字pending已推进为5条通用、5条精确主题的项目物象已审模块（M777／M783）；仅在futurem768候选，Service／Store、持久化和生产默认接线尚未完成，正式覆盖增量仍为0。

M777已审5条general与5条精确主题项目映射；M779／M783推进可信来源注册和模块生成，限定独审关闭原P2。即使模块能生成，当前收据仍明确ServiceStore、persistence、globalProductionDefaultOrAdoptedGeneration和fullProductRelease均为false；257／522生产统计保持原口径，不把新模块10条直接加到正式覆盖。

- [M777精确项目映射决策](D:/Codex-NamingStudio-Evidence/m777-element-admission-audit/admission-decision.json)
- [M783-r2来源注册与模块范围独审](D:/Codex-NamingStudio-Evidence/m783-admitted-element-runtime-audit/r2/receipt.json)

早期M754的10字pending和formalNew0仅保留为来源阶段记录：
- [M754早期覆盖状态](D:/Codex-NamingStudio-Evidence/m754-element-imagery/work/data/element-imagery-m754/coverage.json)
- [M754早期候选约定](D:/Codex-NamingStudio-Evidence/m754-element-imagery/work/data/element-imagery-m754/convention-candidates.json)
- [M754早期准入模板](D:/Codex-NamingStudio-Evidence/m754-element-imagery/work/data/element-imagery-m754/admission-template.json)

## 发布、原生交互与维护

正式安装包仍为1.0.37，源码版本为1.0.38。已实际只读核对E:/八卦周易/release/NamingStudio-1.0.37-verification.json：schema为naming-studio-local-delivery-verification/1，local-verified-release，published与publicationExecuted为true，源码4e8c12b；executedGates.fullRegression为223文件、2625总项／通过、失败0、未完成0。这确认已交付元数据，不冒认本轮重新测试；历史安装流程和6份PDF／202页保留原范围。本轮未重验安装包、SQL或PDF，也未改历史release原件。

- [1.0.37实际发布元数据](E:/八卦周易/release/NamingStudio-1.0.37-verification.json)

当前M774／M794仍在完成最终source组合。M790仅关闭外部证据输出和注册状态测试两项控制P2，不代表finalreceipt、来源准入或构建通过；M794对实际sidecar字段的解析由开发04修订。1.0.38尚未正式交付，最终CI／来源准入、构建安装、完整回归及规模验收继续待验。 [M790独审](D:/Codex-NamingStudio-Evidence/m790-source-controls-audit/REVIEW.json)记录实际source正常运行停在旧文档current-status门，缺注册时原source门仍拒绝；其权限字段finalReceiptIssued、productionRegistryInstalled、finalSourceBuildCombinationApproved均为false，不能借控制修复通过推定最终准入。当前M774／M794组合状态来自[M795调度](D:/Codex-NamingStudio-Evidence/m795-progress-docs/evidence-read/dispatch.json)，本轮未新跑来源门或构建。

现有08b checker对带sidecar路径的读取字段与真实记录不同，开发04负责修订M794解析；本轮只修改文档，并按现有合同检查规范标题、相对发布链接和固定回归句。独立源码worktree的source-only文档检查不称真实发布sidecar已由该旧checker完成字段匹配。

早先1.0.33原生关闭的“继续编辑”和“放弃修改后退出”有人工作业与同实例记录；2026年10月22日ffc5f7b诊断也有两次真实系统选择及自然退出记录。这些历史通过保留。当前新构建原生交互、原生文件选择器、真实外部AI、代码签名、远程CI和跨机验收仍未完成。跨机验收沿用户此前暂缓安排，不重新索取确认。

本地Git仓库、Windows CI配置和统一验证入口已经存在；本快照基线的Git remote为空，未执行远程CI。不能继续使用“项目没有Git／CI”的现时描述，也不能把工作流文件存在写成远程流水线已通过。

- [源码版本及构建配置](../package.json)
- [Windows CI配置](../.github/workflows/windows-ci.yml)
- [统一验证入口](../scripts/verify.mjs)
- [历史交付与原生关闭范围](CURRENT-STATUS.md)

## 仍需完成的产品目标

- 完整传统八字取用、成格与救应定义，以及同一取法从预览到应用、保存、历史回放和报告的闭合验收。
- 同一明确奇门取法的姓名落宫、真假空墓、四害作用及完整验名；已有意象实验不称传统验局通过。
- 其余198字说明、522字未标属性的有据处理，以及多音、方言、谐音、现代评价与整名组合的持续审阅。
- 当前组合1000条规模、容量与性能门，以及最新完整回归、正式构建、实际安装和外部验收。

## 本次文档核验范围

M958 仅更新当前状态与本进度入口，固定 f8，保留历史失败／限定范围；执行实际原件、文档链接／JSON 与 diff 检查，不运行 tsc、业务或 build。旧文档提交与收据保持各自原件。

M934 复用原本干净的文档工作目录，固定核验 106433f，仅同步 README、当前状态和本进度三文件；不改历史 release 正文、源码或 gate，不搬删旧证据。仅执行文档当前段断言、链接／JSON、历史保留与 diff-only 检查，未重跑业务、60／93／113 项、类型、Vite、Electron、安装或签名。后续 1a9bad 记录另列，未回写成基线结果。

M924 文档核验（历史口径）：只同步四份说明文档，固定源码核验基线为 b677，不修改 src、data、assets、package 或 gate。本轮执行当前段陈旧断言扫描、文档本地链接／JSON 解析、历史失败保留和 docs-only diff 检查；业务测试、类型检查、Vite、Electron、SQL、安装、签名和跨机均未执行。上列测试数字只引用各自既有运行，不合并成当前全量回归。

较早 M795 文档核验记录（历史口径）：

M795仅更新README、当前状态和本进度文档；依据为上述固定主线、只读任务板、实际收据及已读发布元数据。本轮执行文档事实与链接检查、现有source-only状态合同检查和git diff --check；业务测试、类型检查、构建、SQL、浏览器、原生交互及安装均未执行。外部D盘收据由证据目录保管，不因文档链接而成为安装载荷或独立重跑结果。
