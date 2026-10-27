# M980 · M975 exact7 imagery 源码登记候选

源码基线 `25f5efb958bb57735f78c4be24c2953436ca39ea`，仅登记 M975 固定 `51d991fb965a9d4441ade64c7e58d2bb558871ef` 独立审阅、与本基线逐字节相同的 5 个 M754 foundation 与 2 个 M779 trusted-owner 文件。

原 source-review 为 14941 bytes／SHA `0d5570de064c6c26c5d3a484245c56d1c1e732be3b0f45d53906f63f21fc86cc`，manifest 为 4024 bytes／SHA `521afe71e6a371b69bf0dea65f7c85223a69f13d9ab050a95931fa13fc2a8fae`。reader 绑定逐文件 SHA／bytes／Git blob、原判断／verified／limits、5＋2 subgroup 及 manifest fixed 七文件集合。两 shared 接口为 type-only；pins 文件的三项 const 为真实运行时值，保持 main-service-bundle。

原 profile 的 52 个 role、15 份 review 与全部版本对象原样保留，追加七个单版本 role 与一份限定 review，成为 59／16。逆向移除本批增量后完整 profile 对象与原 25f 相等；旧 7／15／8 源组 helper 仅同步联合清单身份与计数，不扩展原审阅范围。原来源副本、package、inner／outer seals、空 registry 及缺失 outer receipt 不改。

这里区分**源码登记新增权限为零**与**既有模块运行语义**：显式 opt-in 投影出的元素可进入现有 shortlist／传统评分输入，不承诺旧评分永不改变。本次不授新权重、全局默认、正式覆盖增量、传统唯一五行或发行。正式覆盖继续为 257／522、formalAdded=0。

外围 `qimen-cultural-provider-sources-v1.ts` 与 `reviewed-naming-data-resources.ts` 两个 factory 调用已按原审阅记为 context；不宣称当前没有消费者，也不把它们加入本次七角色或审阅其传递行为、缓存、保存与 UI 接线。

修改前真实普通 source-prebuild 拒绝 `m754-element-imagery-generation.ts`；七文件匹配后，正常入口继续拒绝 `src/domain/naming-coverage.ts`，0 loaders、未 build。仍有其他 source、实际 package 211／原 180 投影及空 outer 准入缺口。group match 不等于 build pass。

```powershell
node --test scripts/verification/imagery-source-registration-980.test.mjs scripts/verification/consumer-source-registration-964.test.mjs scripts/verification/source-profile-138-extensions.test.mjs scripts/verification/qiongtong-source-registration-929.test.mjs scripts/verification/project-v132-registration-944.test.mjs
node --test scripts/verification/outer-source-admission-138.test.mjs
node --input-type=module -e 'import {verifyImagerySourceRegistration} from "./scripts/verification/imagery-source-registration-980.mjs"; console.log(JSON.stringify(verifyImagerySourceRegistration({root:process.cwd()}),null,2));'
```

本轮 49 项定向文件系统／兼容测试与另 18 项外层回归通过，包含七文件逐字节漂移、缺失／实际第八源码、原件替换、错 review ref／false hash、type/runtime 串位、借外部 factory、caller true 与链接替身拒绝。positive fixture 仅复制已声明源码及原 180 项 package 投影，不能代表当前整树或完整产品验收。未重跑 M754／M779 旧 45／32 业务、核心、全量类型检查或构建。root 独立工具审阅后另行整合。
