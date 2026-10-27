# M964 · M957 exact8 源码登记候选

源码基线 `841bddd49096a09f2b75b96a7976e70c638266c9`。本次只登记 M957 实际独审的 6 个 consumer foundation 与 2 个 current eligibility support 文件；不把直接外部命名引擎、资源、Service／Store、UI 或 e01／906 编译产物一并批准。

原 REVIEW 为 17920 bytes／SHA `5ebed106488ffb3b37568bd6b2564f0324fb3b239a1c64ff34578a9ed3dece83`，manifest 为 3658 bytes／SHA `9a149d12806b911b29d4efe0f0419df349f604591f42c3c825c5ea13e478347b`。新 reader 逐项绑定实际审阅的文件集合、SHA／bytes／Git blob、6＋2 subgroup、judgment、rationale 与 limits；manifest 的固定 f8、后继同字节 841 记录和原 review 摘要也必须一致。

profile 原 44 个角色、14 份 review 及所有旧版本对象原样保留，只追加 8 个各一版本角色与 1 份限定 review，成为 52／15；逆向移除本批增量后完整对象等于原 841 profile。共享 consumer／eligibility 契约含版本／选择等运行时常量，因此使用 main-service-bundle，而不是把整个文件误标 type-only。旧七文件和十五文件 helper 只同步联合清单的固定身份／计数，各自原审阅范围和原版本均不扩张。

真实 gate 修改前拒绝 `src/domain/candidate2-naming-consumer-v1.ts`；八文件匹配后，正常 `verifyReviewResources({stage:'source-prebuild'})` 继续拒绝 `src/domain/m754-element-imagery-generation.ts`，0 loaders。未运行 build，也未将驱动结束或 group match 记作构建通过。package 211／180、空 outer registry、原 inner／outer seals、缺失 outer receipt 继续保留。

```powershell
node --test scripts/verification/consumer-source-registration-964.test.mjs scripts/verification/source-profile-138-extensions.test.mjs scripts/verification/qiongtong-source-registration-929.test.mjs scripts/verification/project-v132-registration-944.test.mjs
node --test scripts/verification/outer-source-admission-138.test.mjs
node --input-type=module -e 'import {verifyConsumerSourceRegistration} from "./scripts/verification/consumer-source-registration-964.mjs"; console.log(JSON.stringify(verifyConsumerSourceRegistration({root:process.cwd()}),null,2));'
```

本轮定向文件系统／兼容测试 41 项通过，外层小回归另 18 项通过。覆盖逐八文件单字节漂移、缺失／实际第九源码、原 review／manifest 替换、错 review ref／false hash、借上下文角色、共享运行时契约误标 type-only、caller approval 与链接替身；均拒绝。positive fixture 仅复制已声明源码及原 180 项 package 投影，不代表当前整树／211 项包已完成准入。

M957 的 7 项静态检查不转作生成／回放业务测试，既有 e01 main consumer 12332 bytes 与当前 source 15408 bytes 继续分开，不重编或更改 e01／906 身份。默认关闭、传统结论 unknown，sourceBuild／production／StoreSave／wholeClosure 均不获批准；root 工具增量复核后另行整合。
