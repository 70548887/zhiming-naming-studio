# M150：1.3 进入实际可选命名用神

**裁定：新增一个偏好选择、一个主进程采用结果、一个生成消费入口。旧八字喜用原样保存；只有1.3完整唯一且实际主用已确定时，才把其主辅五行用于本地和AI命名。** 多解、无解、条件方案或待定直接阻止该次生成，不借旧1.1、旧 favorable 或人工字段补结果。

本合同先读取实际1.3 `61c917`源码；现已收到“根唯一而取用待定，顶层共同意见/待定聚合错误”的P2修订通知。**真正生成仅接另封的 `project-bazi-mainchain-145/1.3.1`，进入条件是该delta独审及facade验收通过；原1.3.0保持冻结，不以同ID换代码。** 下文“1.3”泛指此系列，精确入口以1.3.1为准。当前不是已实装声明，37不改。

## 1. 单一选择字段

```ts
NamingPreferences.namingElementMethod?: {
  methodId: 'project-bazi-mainchain-145/1.3.1';
  entryPolicy: 'month-branch-only' | 'month-stem-proposal';
}
```

只放 preferences，BirthProfile 顶层不再复制；profile.namingPreferences 沿用现有存档，session.preferences 是此次生成快照。缺省沿用原人工 preferredElements 优先、否则旧 bazi.favorable；默认不启用1.3。显式1.3与非空 preferredElements 同时出现即冲突。月干提案须明确选择，默认入口为月支。

共享解析器要求普通纯数据对象和精确字段/枚举，拒绝未知版本、null、额外权限字段、访问器。未设置/undefined 规范为缺省，不在旧对象里补 legacy marker；不得把请求中自带的四柱、favorable/effectiveElements、source、certificate、rootFactor、阈值或 disabledEdgeIds 当输入。新选择纳入 namingInputKey/draft ticket；已存项目方案的选择不能在普通审阅中增删改，必须重新生成。原旧方案的人工喜用审阅功能保持原行为。

## 2. facade 与生成应用门

01实现 `previewBaziRootFeedbackProfile(validatedProfile, options)`，采用独立 `bazi-root-feedback-facade/1.0.0` DTO；精确字段与认证门见 [FACADE-GATE.json](E:/八卦周易/.local/team-150/decision/FACADE-GATE.json)。root 不从 renderer 传回的 gate 或证书生成方案。

必须同时成立：一个实际记录时刻、四柱确定、非缺时/假设/多日期；scope完整；resolution唯一、consistent恰一、possible为空、相关pending为空；选中state的控制与生成真实闭合；主链消费者实际存在，status settled、decisionStatus resolved、numericReview separated、无相关missing/alternativeUses；primary非空且主辅与avoid无交集。**unique本身不够**：当前源码允许consume抛错后仍保留根一致状态；真实2022-02-05例也可根唯一而取用为中和条件方案。

通过后，按木火土金水固定序取 primary∪secondary 为 `applied`。主辅/avoid仍分层存证，avoid本轮不新增硬禁字；调候辅助冲突/待定另列，不能合进applied。辅助不确定若未影响主用，不因本策略只采用主链而冒称全部传统条件已解决。

blocked返回精确原因与完整预览，但不返回可用elements或application certificate。`generate(profile,pref)`在候选生成、AI调用、任何客户/方案提交前失败；沿现有错误通道返回稳定业务代码/可读原因（例如`NAMING_METHOD_UNRESOLVED`）。详细状态使用facade DTO，不能依赖Electron是否保留自定义Error属性。无需新通用错误框架，也不把该业务错误放进AI失败回退分支。显式保存客户草稿仍可独立操作，不能由一次失败生成偷偷保存。

## 3. 保存什么，如何真正消费

`analysis.bazi`、`analysis.qimen`、`renCommentary` 与 `originalFavorable===analysis.bazi.favorable` 保持原验证意义。新增：

```ts
analysis.projectNamingUse?: {
  schema: 'project-naming-use/1';
  selection: NamingElementMethod;
  engineCertificate: RootFeedbackApplicationCertificate;
  application: {
    policyId: 'naming-element-application/1.0.0';
    status: 'applied';
    primary: Element[]; secondary: Element[]; avoid: Element[];
    effectiveElements: Element[];
  };
}
```

证书复用01的紧凑 typed canonical 投影，绑定原出生记录、确定四柱、时间基准与基础八字版本、方法/规则/来源pins、全部regime身份/一致性、唯一态根与控制数值证书、实际主用与辅助边界。完整engine digest与certificate digest都不能代替重算。不要保存 `detail:unknown` 的16份重复全图；需要展开时按固定保存版本只读重建。

新生成先由main形成一次 `NamingElementResolution {source:'legacy'|'manual'|'project', effectiveElements, applicationPolicyVersion?}`。它是内部可信参数，不是IPC请求字段。当前本地字池、candidate评价的traditional分与traditionalReason、AI字池/请求favorableElements、AI返回的本地评价全部使用这一结果。实际必须替换 `naming-v7.ts:215,263` 和 `ai.ts:46` 的分散fallback；只增加预览或证书而不改这些消费者不算完成。不要临时把项目结果写进 pref.preferredElements 或改 analysis.bazi.favorable 来复用旧签名。

实现窄的 `generate/evaluate...WithResolvedElements` 内部适配入口，保留原显式历史v6/v7 API的旧解释路径。新入口本身遇选中project却没有可信resolution也要拒绝。旧未选方法的新生成可以用同resolver得到原有manual/legacy集合；输出与现有基线相同。

AI只得到已采用选字集合与必要项目标签，不上传整份出生/证书，不得决定gate或解释授权。7.1新增40字仍按M148独立收尾，不能据1.3证书把单字义升级为整名适合。

## 4. 独立版本轴

- 基础八字/奇门：继续 `analysis.bazi.version`、原出生/时间/任注选择与既有saved-analysis-policy配对；不伪造新bazi版本、不改旧favorable。
- 可选用神：明确1.3 method＋entryPolicy＋`naming-element-application/1.0.0`；独立核来源、证书和应用门。
- 命名字义：`namingRules.version`＋归档知识包选择7.0或7.1固定出版；同包不能借current resolver回算旧历史。

首批可明确登记 **7.0 × 1.3.1 × application/1.0.0**，不用等待7.1的40字；7.0这里保留既有字义、出处及评分公式，新应用策略记录选字集合的来源。仅带完整新selection与认证证书的session走新resolved replay adapter。无method的旧7.0仍走冻结旧路径，绝不补证书。7.1准备好后另登记7.1×1.3.1兼容tuple；它不自动授权项目用神。首批不登记6＋project或旧1.3.0应用：遇自定义知识包回退6应报unsupported-tuple，不能忽略项目选择；6＋原manual/legacy不受影响。

增加窄的按保存tuple分发函数，先选**保存的**命名字义版本，再选保存的用神应用策略。不要令旧 `evaluateNameForRuleVersionWithContext(7.0)`默默处理带project的新记录，也不要把current naming版本作为历史真实性依据。

## 5. 防伪与不可变边界

1. Service生成只接profile和pref选择，先原 validateProfile/validatePreferences；method资源与证书由main计算。reserved计算字段、任意来源/证书参数或额外生成实参拒绝。
2. `expectedProjectNamingUse(savedProfile, savedBaseAnalysisVersion, selection)` 先用已有显式历史base版本计算器取得确定出生事实，再用固定保存方法资源重新跑完整1.3，再投影、再执行同一gate/application策略；保存值必须逐字段相等。01 facade的当前出生预览与内部“已验证固定base事实→1.3.1”入口分清，历史核验不能只调用会选择current calendar的facade。缓存键绑定所有计算输入、base版本、方法/entryPolicy/application版本与资源身份，不以profileId或客户端hash为键。
3. `analysis.projectNamingUse`当前未知sibling没有运行时门，必须显式校验。任何selection、project字段或保留来源足迹出现都进入新校验，不能只删其中一个降级。旧无project的资料不得附加project字段（包括own-undefined/null）或专用来源。
4. Service.saveSession必须在用original覆盖incoming之前，按own-presence与内容拒绝方法、项目证书、出生绑定、analysis/base favorable、来源的伪改。覆盖还原后成功不算拒绝。项目会话也拒绝普通审阅更改人工集；备注/收藏/已有可编辑解释继续允许。
5. Store.writeSession与history身份再次冻结project生成输入、analysis、originalFavorable、selection及来源；普通rows/listRevisions未全部经过assertSession，故共同 `verifySessionFacts` 必须调用项目核验，备份/恢复对每个当前与历史行执行。历史不拿profiles表当前生日替换session.profile，不先覆盖revision证书掩盖不一致。
6. 项目SourceRecord由01固定loader提供，进入sourceSnapshot及保留ID集合；逐字段核记录与pins，不能只核sha格式或“清单里有id”。主用应用证书不代替候选字音义、整名出处、7.1逐字准入或家庭输入校验。
7. 新project候选的 `evaluation.traditional` 应可由保存tuple、已认证effective集合及归档字记录重新核定；普通审阅的文字可编辑，不据此改证书。生成验收必须证明真实字池/评价/AI消费了新集合，而不仅是多写了日志。

## 6. 文件归属与最小闭环

**01**：新facade及 `src/shared/bazi-root-feedback-facade.ts`、固定loader/gate/compact certificate投影；领域1.3不为接线改算法。按root接缝交新文件，公共types不整份覆盖。

**root集中合并**：`src/shared/types.ts`（一个pref选择/一个Analysis可选字段）、`workflow.ts`（规范/草稿key）、一个窄shared `project-naming-use.ts`；main窄 `naming-element-resolution.ts`；`service.ts`（一次resolve/生成/审阅拒绝）；`expected-analysis.ts`、`candidate-facts.ts`、`store.ts`、`session-sources.ts`与项目provenance；main/preload/browser/dev路由只传原输入，不开放certificate写口。复用既有公共generate，不另造算法框架。

**04命名接线**：与root协调`domain/naming.ts`和v7内部resolved消费接缝、`ai.ts`、7.1/7.0 saved-version resolver及M148收尾；不修改1.3gate，不把新method塞进7.1许可。**02家庭输入**：保已有家庭字段/避讳/草稿签名契约，不接收或修改项目证书。**设计/报告**：方法选择、明确blocked提示、采用来源与base候选分列；项目会话人工变更引导重新生成；`report.ts:42`与renderer current fallback显示改读已认证application。不是新增只读预览完成。

## 7. 放行反例与正例

必须拒绝：unique但consumer=null/抛错；unique但中和仅alternatives；数值跨界；multi即使同commonOpinion；缺时基盘＋一个完整小时假设；跨日只挑一盘；project＋人工集；无解却旧favorable非空；空primary或主辅与avoid相交；客户端改effective同时重算hash；另一生日/时区/经度证书嫁接；删method/证书/来源降级；普通审阅改entryPolicy；缺冻结版本资源；6＋project不支持tuple。每例核零AI、零新候选和零事务提交，不能只查错误文字。

正例至少一份真实BirthProfile通过gate，main确认project集合与base旧favorable不同，走 **Service.generate→local和mock-AI实际调用→Store保存→重开→审阅历史→备份恢复→UI/PDF**；核候选traditional评价和采用说明使用同集合，base analysis/originalFavorable不变。另有unique但条件用神的真实反例。旧7.0无method、新7.0＋1.3、7.1＋旧方法、7.1＋1.3分别校验tuple；并发草稿改method使晚到结果失效，旧历史无新字段。

以上为待实施验收，未在本决策中执行。算法已通过的32定义不替代facade、生成、历史与传输测试；1.3仍是明确假设下的项目取法，不声明完整传统用神或奇门验名完成。
