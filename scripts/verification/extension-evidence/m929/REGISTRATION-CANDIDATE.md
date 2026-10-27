# M929 · M925 七文件源码登记候选

源码基线 `38df5dc29879ddce613994af0cd731e63c96d779`。只登记 M925 原始 REVIEW／SOURCE-PINS 指明的 3 个 primary 与 4 个 UI/CSS postimage，不扩入 support 文件或其他源码组。

5 个原有 role 保留各自 `source-current/1`，只追加 `m925-reviewed-source/1`；bindings 与 JiaChapterView 新增 2 个只含已审版本的 role。sourceRoles 为 29、reviews 为 13；只有这 5 个旧路径允许双版本，其余版本计数保持严格。旧版本能继续被识别，但不会冒称命中 M925 新 postimage。

`qiongtong-source-registration-929.mjs` 固定两份原件 SHA／bytes、交叉引用、b677 审阅提交、精确七路径与分类，并从实际文件读取匹配版本。它已接入真实 `verifyManagedSourceExtensions`，不是另一个观察队列；所有结果仍是 source compatibility，activation 为 off，sourceBuild／production 均不获批准。

本轮真实结果：

- 修改前正常 source-prebuild 拒绝 main preview 的旧 pin。
- 修改后实际七文件均命中 M925 postimage；正常 source-prebuild 继续拒绝 `src/domain/bazi-mainchain/project-v132/consumers.ts`，0 个 loader 运行。
- 23 项 extension／单组测试通过；外层回归初次 16 过／2 失败是旧断言未反映更早的源码拒绝，原日志保留。只校正拒绝顺序断言后，18 项外层测试通过。它们不是业务或正式构建验收。
- 单字节漂移逐七文件验证，第八源码、第三版本、借用 Store scope、改写审阅及调用方 allowUnknown／approval 均被拒绝。

未改原 9 resources、3 companions、12 package appends、180 项 package projection、历史合同、空 registry 或 inner／outer 封条。实际 package 仍为 211 项；原本缺失的外层 admission receipt 仍缺失。其他未登记源码、打包声明及整产品封条继续分别阻断，未为它们批量 repin。

M925 原件中的两条旧测试维护记录保持原文。后续 `c593129d`／root `ebcea4f7` 已修夹具及文字断言，作者记录为原 2 过／2 失败、修后 4/4 及 scoped typecheck；这不扩大本次 source policy。本轮未重复 backend／UI 动态业务测试，也未执行正式构建、安装或外层重封。

```powershell
node --test scripts/verification/source-profile-138-extensions.test.mjs scripts/verification/qiongtong-source-registration-929.test.mjs
node --test scripts/verification/outer-source-admission-138.test.mjs
node --input-type=module -e 'import {verifyM925QiongtongRegistration} from "./scripts/verification/qiongtong-source-registration-929.mjs"; console.log(JSON.stringify(verifyM925QiongtongRegistration({root:process.cwd()}),null,2));'
```

正常 source-prebuild 预期仍失败；本候选待 root 与独立审阅后统一整合。原始审阅文件是字节一致的复制，不是本次新签发的准入批准。
