# Windows CI 与完整外层 source admission

单 Windows pipeline、固定 Node 和 Actions、原测试预算、失败即停规则继续保留。当前正常入口为 loadRaw138SourceProfile → requireManagedOuterAdmission，以及 resealSourceProfile → sealManagedOuterAdmission。verifySources=false 也要求完整外层 admission。历史 M480 JSON 只提供旧审阅 provenance，历史 inner-only inspection 明确返回 productionApproved=false。

生产 registry 固定为规范 module checkout 内的 scripts/verification/source-profile-138-approvals.json。生产 seal 仅接受 --root、--output；不能通过 CLI 选择任意 receipt、registry 或测试 scope。当前 registry admissions 为空，正常入口失败关闭。

正式独审必须同时绑定 outer 和 inner SHA／字节、完整19roles／34readers／12non-sourceReader字段、10额外源码pins、实际全部subject文件及CI代码层。每一个declared source delta均与实际文件SHA逐件比较。CI层包含随06r3交付的真实publication fixtures，项目源代码、原data、rootDecision和源码pins全部参与subject hash。

只有三个精确路径属于detached admission inputs：固定registry、固定独立receipt、outer manifest自身。Inner target、比较基线、loader、sealer和adapter本身均是subject。Registry／receipt的最终内容不参加subject hash，所以独审后登记不会形成自引用环。原有四份历史回执仍是subject。

受管文档路径由ADMISSION_PATHS定义。Receipt schema为naming-outer-source-review/1，必须含scope=production、synthetic=false、decision=APPROVED-EXACT-OUTER-SOURCE、targetId、outer、inner、approvedBindings、reviewer、taskId和limitations。Registry schema为naming-outer-source-admission-registry/1，scope=production，仅允许一个精确admissions项，项含targetId、outer、inner、receipt、reviewer和taskId。所有ref必须包含安全相对路径、正字节长度和完整SHA。缺失、子集、重复、未知字段和未受管路径均拒绝。

独审批准后，root登记固定registry及原始receipt；随后才运行：

    node scripts/verification/source-profile-reseal-138.mjs seal --root [规范checkout绝对路径] --output [checkout外的新绝对目录]

这个命令只交付受管admission文档，不重写CI／产品源码或profile hash。正常source/resource gate仍必须另行执行，seal成功不代表runtime、15秒benchmark或release通过。

本轮仅执行了受到入口变更影响的41个纯文件／schema／negative tests，以及新整合r3的8个helper tests，均通过。41个测试包括明确test-fixture scope的完整往返；fixture永不产生production批准。最初15pass／1断言错误消息模式失败记录仍保留。原25个source-lock tests与137资源证据复用；未盲重335预检。

生产admission、完整source gate、Solar benchmark、网络、SQL、Worker、Browser、build与installer：未执行。M393运行源码0e23虽有M518 source review，其publication baseline迁移receipt仍待独批；本任务没有修改该pin。R3原件和旧M489／M529／M519均保留。
