# 受控验证与Windows CI

本目录的脚本只使用受控源码、固定资料、已安装的锁定依赖及显式传入的验收文件。无需复制历史 `.local` 工具。正式接入由指挥组审核、合并和提交；本文件不是已经运行远程CI、真实提供商或原生文件选择器的验收记录。

## 本地入口

依赖安装统一使用 `npm ci --no-audit --fund=false`，保留 `package-lock.json`。验收入口核对锁文件版本、根依赖和当前应用版本，不自行更新依赖。

```powershell
node scripts/verify.mjs --profile source --output verification-output/source-001
node scripts/verify.mjs --profile maintenance-unit --output verification-output/unit-001
node scripts/verify.mjs --profile ci --dry-run
node scripts/verify.mjs --profile ci --output verification-output/ci-001
```

`source`执行当前状态身份检查、固定来源/包内原件检查、命名字典6.0、原典与康熙资料的离线只读重建。`maintenance-unit`运行 `scripts/verification`、`scripts/acceptance` 和 `scripts/benchmarks` 中受控的 `*.test.mjs`；具体测试数量由已合并子包决定。`ci`依次增加类型检查、完整测试、前端与Electron构建，不打包、不安装、不自动启动用户窗口。每个运行使用新的证据目录，已有目录不覆盖。

现有应用测试可能**生成**自己的隔离 `.local` 测试输出；这些是受控测试调用受控helper后产生的结果，不要求开发者历史 `.local` 内容预先存在。没有把个人客户数据或历史安装目录作为CI输入。

## 发布包检查

```powershell
node scripts/verify.mjs --profile release --output verification-output/release-001
node scripts/verify.mjs --profile release --strict-local-evidence --allow-post-release-docs --output verification-output/release-local-001
```

发布检查核对版本、安装包、SHA旁注、来源、显式打包内容、构建/安装ASAR身份。便携源码checkout没有被忽略的安装包和本地历史验收证据时返回 `not-verified`，退出非零；不会根据旧清单的passed字样宣称本次验收通过。

`--strict-local-evidence`要求本机历史证据实际存在、摘要相符，并验证完整回归、构建、来源冻结、安装载荷、实际SQL、实际安装进程六类证据的具体结构、终态、计数及文件绑定；仅有`ok:true`、空对象或未知状态不能通过。当前1.0.34按已审790输入冻结身份核对；未来版本必须采用明确的证据schema，不从未知JSON猜测成功。该检查核对既有记录，没有再次执行安装、UI、PDF或真实AI。

`--allow-post-release-docs`通过受控`post-release-docs.json`限定本次四份文件的发布时SHA、批准后SHA、1.0.34版本、192文件/2343项回归和状态事实；批准内容来自指挥组`0b85290`提交。路径相同、但内容SHA或版本不同，仍拒绝；不能凭文件名把伪造的CURRENT-STATUS放行。未来文档更新必须重新审阅固定内容与身份。

若根目录中存在正式 `release/NamingStudio-<version>-verification.json`，`check-status.mjs`核当前状态的“已交付”版本及最近已交付回归数字；源码checkout缺release目录时仅检查文档/包版本身份，明确发布证据未包含，不伪造验收。

## 来源和包内原件范围

来源脚本识别当前已采用的来源锁SHA和汇总约定，逐文件核对。正式1.0.34的五份Arc研究原件在源码库中存在，但未纳入实际安装ASAR：`qimen-markers-arc-constants.js`与`qimen-patterns-arc-{calculations,patterns,test,utils}.js`。它们用于来源再核和外部实现对照，是维护可重验性缺口，不是已证实的启动故障。真正启动需要的`qimen-patterns-arc-constants.js`已在正式包中。

本次暂存的package补丁只追加这五份原件，不更改已有来源身份、算法或正式历史包。另有构建专用原件的发行边界在来源报告中单列；未将“源码本地校验通过”扩大为“所有原始研究材料均已打包”。

## Windows CI

工作流位于 `.github/workflows/windows-ci.yml`：Windows 2022、明确Node版本、`npm ci`和统一入口；只给`contents:read`，checkout不持久化凭据，上传仅为`verification-output/ci`。Actions均固定完整提交SHA，获取依据保存在 `docs/CI-ACTION-PINS.json`，可从官方仓库的[checkout](https://github.com/actions/checkout/releases/tag/v7.0.1)、[setup-node](https://github.com/actions/setup-node/releases/tag/v7.1.0)、[upload-artifact](https://github.com/actions/upload-artifact/releases/tag/v7.0.2)复核。

所有CLI输出只允许新建到所选根目录内的`verification-output`或`.local`证据路径；输入和每个现存祖先均检查实际路径及junction/symlink，不跟随别名逃出根目录。输出使用排他创建，拒绝覆盖输入、既有发布记录和既有证据；Windows大小写不影响保护。Windows正常8.3短路径在检查非reparse后归一为实际路径。CLI直接调用与顶层入口使用同一门禁。

本地Git已由指挥组初始化，无远程配置；工作流通过Git进程环境关闭autocrlf，保留已有固定文件字节，不转换全库行尾。该workflow尚未在远程Runner执行。CI通过也不等于签名、第二台干净Windows、真实AI提供商或原生对话框验收通过。
