# M944 · 实际十五文件独审绑定与登记候选

源码基线 `a8693b05566ebf16bd9bf0461cf00cdc51ad80f9`，先精确引入 M940 `db08f7d` 整组检查器依赖。M940 原 null／pending candidate 及其旧审阅原件保持字节不变；新绑定在独立的 `project-v132-registration-944.mjs` 中。

本次固定 M940 实际独审 REVIEW（17831 bytes，SHA `b4343a3b181f21de58f40852d2dc4e295db4c08db459a685cb5d7070e3016172`）与 MANIFEST（13642 bytes，SHA `d0c6d991330f6c13a8b91e7037723a2d413b121256c4388640c2c3a58e42f27c`）。逐文件核对 SHA／bytes／Git blob／分类／唯一 reviewId／judgment；MANIFEST 的 frozen 十五项和 REVIEW 的十五项精确对应。17 项必要依赖只是原审阅上下文，不获得登记权限。

活动源码兼容 profile 原 29 个 role 及原有版本对象完全保留，只新增本组 15 个 role、1 份限定 review，变为 44／14。十个发布对应仍是 execution9／resolution1；另五个 companion 明确为 type-only2、source-only-notice1、source-only-license2，后两类 compileScope 为 source-only，不伪装 runtime 执行。

实际门禁前进：本轮修改前正常 source-prebuild 拒绝 project-v132/consumers.ts；本轮十五文件精确识别后，正常入口继续拒绝 `src/domain/candidate2-naming-consumer-v1.ts`，0 loaders、未执行 build。只读字节匹配／源码审阅不能代替外层准入，production／sourceBuild 保持 false、activation off，旧 seals、空 registry、缺失外层 receipt 及 package 211／180 差异仍保留。

M940 原检查器的公开入口继续使用当前 root build-pins，原14项文件系统测试保留。新登记入口只使用完全同字节的固定 build-pins 上下文副本，不检查或登记组外 root pins 文件；该上下文角色不进入十五 role。两入口共享原固定映射校验，调用方不能指定替代 pins 或 review。

```powershell
node --test scripts/verification/project-v132-registration-944.test.mjs scripts/verification/source-profile-138-extensions.test.mjs scripts/verification/qiongtong-source-registration-929.test.mjs
node --test scripts/verification/project-v132-source-group-940.test.mjs
node --test scripts/verification/outer-source-admission-138.test.mjs
node --input-type=module -e 'import {verifyProjectV132SourceRegistration} from "./scripts/verification/project-v132-registration-944.mjs"; console.log(JSON.stringify(verifyProjectV132SourceRegistration({root:process.cwd()}),null,2));'
```

本轮三批分别 33／14／18 项通过，不拼成业务回归。新增覆盖逐十五源码／十资源单字节漂移、多第16项、原独审／manifest替换、nullref、falsehash、借用上下文依赖、伴随许可误标runtime、旧 null candidate 改写及调用方批准开关；均拒绝。既有核心24与旧业务未重跑。

原独审的数字范围仍为项目提案：11 个小组的首次10过／1审计失败及单独补测1过、5 个有理数 oracle 原样保留，均不称全日期或 IEEE 机器精度穷尽证明。完整传统结论 unknown，默认关闭、无 score 权限。候选须由 root 安排工具复审后统一整合，不扩大为其他未登记源组批准。
