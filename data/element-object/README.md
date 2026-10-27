固定辞书直接物象 profile：project-dictionary-object-elements/1.0.0

r2补充：r1加载器在hash后第二次读overlay解析，存在受控交错可换内容的P2；r1原件已冻结。r2缓存每一份已验project Buffer，overlay只解析同一已验Buffer，不再次读盘。source-lock同样在校验后的原Buffer解析；profile及其他project文件只在同次字节读取中验证，不另读解析。构建也以同一缓存Buffer解析和记哈希，包括baseline、MOE、变体原件、profile及人工选义输入。永久测试模拟首读合法返回后把磁盘枫木改金，返回对象只能保留已验木，下一次加载坏盘会拒绝。

仅有项目自编约定，不是传统姓名学汉字唯一五行。审阅固定 data/dataset-v6.json 的522个 elements=[] 字符；不修改字典、meaning/citation、旧elements、旧意象profile或评分。

构建：node .local/team-137/dev04/elements/build.mjs
专项：node .local/team-137/dev04/elements/verify.mjs
不联网，不安装，不运行全量套件。

复制到其他暂存目录后，构建和专项使用环境变量ELEMENT_SOURCE_ROOT明确原项目根；该变量只作为固定原件查找根，不从网络补资料。

接线：导入 element-overlay.json，调用纯函数 lookupElementAssessment(overlay, {char,pinyin,sourceEntrySha256})；sourceEntrySha256 必须来自固定MOE完整原条，而不是页面meaning摘要。默认仅返回conditionalAssessment，effectiveElements为空。另有sourceReadingSha256可选严格绑定。

明确开启 profileOptIn=true 后，仍必须传 confirmedEvidenceIds，代表使用者已确认该精确源义项与对象/材料。任何字符（包括7个单一直接物象义的字符）无义项确认时有效集合都为空。single-sense-evidence只是证据歧义程度，不是自动生效许可。仁心的心、桥梁的桥不会自动为木；青同一句的草木/山脉、印的木/金/石材料、甲的皮革/金属等都分别限定，不默认合并。相同原义中的不同对象材料同时选择会返回ambiguous-referent-selection。

原始MOE文字按固定原件完整保留于source-excerpts.json。每字保留默认读音全部原文义项、原始pinyin、原词条索引、逐义索引、原条及heteronym SHA。哈希约定为UTF-8 JSON.stringify(未改动的已解析原对象)，保留原件属性顺序；文件锁按原始字节SHA。简繁词条对应另存Unihan直接变体原行。

lookup顶层matchingSourceCandidates给UI列候选。主进程从本方案已保存字典快照建立expectedBinding={planScope,char,pinyin,sourceEntrySha256,sourceReadingSha256}，不能照抄客户端上下文。confirmElementAssessment(verifiedOverlay,expectedBinding,selection)只接受相同planScope、原字、读音与双SHA的选择，selection只含这些身份、profileId和confirmedEvidenceIds；没有有效集合字段可由客户端提交。无选择传null，返回空有效集。isCanonicalElementAssessment重新执行相同确认比较全部字段，拒绝客户端伪造结果、跨计划或跨义项嫁接。

选择应随当前计划prefs及该计划候选snapshot保存，禁止更新客户全局静默默认；本包不写客户资料。主进程集成时负责从真实plan取得expectedBinding，校验修订号/token、来源清单和用户选择，再重算有效集。该职责不由scope字符串代替。

白bái的“代表五行中金的颜色”仅为correspondenceEvidence，保持该颜色体系原句，默认及opt-in均不当直接金属实体标签；传统姓名取法仍pending。

review-notes.txt：逐字项目批注，不是辞书文字；evidence-selections.txt：人工明确挑选的精确义项与限定对象；build.mjs只按这些固定选择重建，不以首义、偏旁、笔画或关键词自动补标签。reasonCategory仅归类人工未采用理由，不产生元素。

集成目标建议：data/element-object-profile.json <- profile.json；data/element-object-overlay.json <- element-overlay.json；data/element-object-review-manifest.json <- review-manifest.json；data/element-object-source-lock.json <- source-lock.json。source-excerpts.json可作为独立来源证据包；原始MOE/Unihan及许可沿用现有原件。运行代码和类型以root wrapper约定接入，本目录不改共享树。Node主进程必须先调用loadVerifiedElementPackage(stageDir,pinnedLockSHA,projectRoot)，校验固定锁、产物、所有原件与基线后才将返回的冻结overlay用于纯查询；期望锁SHA必须固定在受信代码/审阅结果中，不能从可编辑邻接锁自取。

许可：MOE辞书正文版权为教育部，CC-BY-ND-3.0-TW；g0v/kcwu格式编辑权CC0；Unicode原件依现有unicode-LICENSE；新增项目约定与批注CC0-1.0。原文、项目规则、传统规则身份保持可区分。
