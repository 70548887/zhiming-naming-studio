# M940 · project-v132 整组对应候选

固定源码基线为 `d46ebc65b738e6b76e9495875534b3f50dd47659`。本次复用干净的 M929 工作树切分支，原 M929 外部收据和运行证据不移动、不删除。

实际 `src/domain/bazi-mainchain/project-v132/` 为 **15 文件**：资源清单有 10 个精确发布对应，其中 9 个 execution、1 个 resolution（source-lock）；另有 5 个 source-only companions：两个仅类型源码、NOTICE 及两份许可原件。companion 不伪造 execution-source 对应，不要求把类型擦除文件或许可证硬加到旧出版清单。

`project-v132-source-group-940.mjs` 复用 M929 精确读取模式，核验现行和复制的原 manifest、固定 build-pins、完整 closure tuple 身份及组内双向集合、当前源码与资源副本的 SHA／bytes。它只核验这个 10＋5 组，不执行算法，也不将 v13／kernel 或其余 138 项完整运行闭包称为本轮已验证。

五个 companion 绑定固定 Git 字节与明确角色：`type-only-source`、`project-proposal-notice`、两种许可。候选中每个实际 15 文件的 review reference 都保持 null／pending。未来须有覆盖这些精确 postimage 与角色的独审原件，并由后续任务显式绑定；调用方传 true、提供自造 review 字段或改 candidate 均不授予登记。

M786 已有相同 10 项出版字节与嵌套 r2 manifest 的检查，但原审阅仅关闭输入边界问题；M866 限定构建收据 helper，M913 限定只读解释 adapter。三者均不被扩写为当前 15 文件源码的完整新审阅。原件复制在本目录，以便核对其具体范围。

实际检查返回 `matched-fixed-group-bytes-source-review-pending`，登记入口 `requireProjectV132SourceRegistration` 明确拒绝，等待实际 15 文件独审引用。项目取法仍为 project-proposal、传统结论 unknown、默认 off、scoreChange=0。活动 extension profile、外层门禁、原七文件登记、package、src、data、assets 全未改。

```powershell
node --test scripts/verification/project-v132-source-group-940.test.mjs
node --input-type=module -e 'import {inspectProjectV132SourceGroup} from "./scripts/verification/project-v132-source-group-940.mjs"; console.log(JSON.stringify(inspectProjectV132SourceGroup({root:process.cwd()}),null,2));'
```

本轮 14 项纯文件系统测试通过：单字节漂移逐源码／资源／companion 检查；双 manifest、缺源／缺 counterpart／缺 companion、额外源码、版本／角色映射、自造审阅、旧审阅替换及 junction 均拒绝。夹具只复制实际固定字节，不运行核心24或旧业务。活动正常 gate 未改、未在本轮重跑；不能把整组字节对应成功说成下一个 unknown 已解除。
