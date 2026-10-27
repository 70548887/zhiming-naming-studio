// Fixed publication metadata; project notice is maintained text, not dictionary-derived content.
export const V7_INPUT_HASHES = Object.freeze({
  "data/dataset-v6.json": "3245e1701046d43562520926d185e8363da8bf27c2523fc27a7de4e15eda0728",
  "data/knowledge-v6.sqlite": "1875aa49dcfaeca0f266a3be7578e4d4b2a9b2c9c1f59fd79699a3e26d5d6b8b",
  "data/naming-editorial-dictionary-v6-source-lock.json": "06331d11a1c757a0245891fae357c7952db597d07c3c770d4052277c0bfac8da",
  "data/naming-editorial-v4.json": "d24898eb63438d7b24262668eb3b36770f211fade015b28eeb361700a58ca6ce",
  "data/naming-editorial-v5.json": "bb8d3d255b42a6b67932988e13ceb2d7a7a1c6ef8fbbcc65312b9a50b5519da8",
  "data/naming-editorial-v6.json": "35de5f749f438e849543e5fde6e405b89ba01cba20597e82e7c4f518dd4363ab",
  "data/naming-editorial.json": "97c3162238c9493174544580a338fb0852d2784fbeac712fbd8e234f99945195",
  "data/raw/CC-BY-ND-3.0-TW.html": "04e6ef69a223b6e13c93c97a918ad5fd0dbb9fc34ae307f4449ed264e2d4108f",
  "data/raw/moe-README.md": "a93321d9381bc1cf34b4ad844f71607fa748c86c0b228ae37d46720d6a659cb2",
  "data/raw/moe-revised.json.gz": "cf29701f887bd3b58e9520df53d905e2697ff13a408d70a771b0458f3039fb2e",
  "data/raw/naming-citations-v7-errata-r2.json": "e61707d9e3ac04110cdcaa924dd53a32b8bcc0ae8a0d0b0cbf9016a83108b945",
  "data/raw/naming-citations-v7-review.json": "e5d3909b04812c418feffbbb34cdecd3224527130a4ddfa91b62432e7ef59cc3",
  "data/raw/naming-meanings-v7-errata-r1.json": "e0bafe66312b98df77a367402915da57a3d5fa2c43ce56ca6af85a41cb4c3c0a",
  "data/raw/naming-meanings-v7-review.json": "8bdf895484e9b88daaa822fdd873901ee3dba994f23961cc836692f340446b1c",
  "data/raw/poetry-LICENSE": "c195319aeaa3ffcbe16aa5d26eec19eae5a42f84337dd2b3dc3c9d5ccbbd6507",
  "data/raw/shijing.json": "3c7ca54d59424542ada99adfcc85420287fbbd5c8a511e9baf705cb2b04051e7",
  "data/raw/zhouyi-LICENSE": "0506d67239c89a3d3b14e253ed29e20e2e9259b41c4b32031eab5ac22ed2811f",
  "data/raw/zhouyi.tar.gz": "0a847c0b9b876f9926e4896399e31ee44f88292db107bc865d70e2d7308b15a0"
});
export const V7_SOURCE_METADATA = Object.freeze({
  "id": "naming-editorial-meanings-v7-fixed",
  "name": "项目命名7.0 · 默认读音限定义与逐名出处",
  "url": "local:data/naming-editorial-v7.json",
  "commit": "naming-editorial-7.0.0;dev03-137.r2",
  "license": "CC0-1.0 (project review/wishes only; original MOE CC-BY-ND-3.0-TW and original-text MIT retained)",
  "note": "562逐字决定及自动资格分列；默认读音、本字来源和全篇语境绑定；旧表与elements不改；命名义说明不默认授评分。 修订r2：琼莹采用同句美石义，琼英待审；新增完整名出处20条，不改原562字逐字资格。"
});
export const V7_NOTICE = "# 命名适用义与出处7.0（任务03阶段资料）\n\n本资料独立补充data/dataset-v6.json，原779字记录、全部elements、旧v3/4/5/6规则及历史不改。JSON资料元版本2026.10.20.2与SQLite实际摘要前12位1875aa49dcfa分别登记；调用者必须提供活动SQLite完整SHA与其真实activeVersion，不能填伪版本。\n\n本资料审阅562/562个原待审字符，其中465个有具体限定说明，304个仅可自动展示原审义与明示项目家庭期许，161个说明需人工确认，不自动拼祝愿或加分。所有自动语义信用均关闭，供主程序另行建立经审评分规则；不以形象或期许推定人格。新增20个完整姓名出处，包括14个连续取字和6个同句重组，全部保留全篇或全卦语境；原义与项目期许分别保存。11个高风险提议留待核/拒绝，不靠同字共现冒充出处。\n\n教育部《重编国语辞典修订本》固定g0v/moedict-data提交a6dc997417507eb510fc29822bc514de2c92728c，完整原件data/raw/moe-revised.json.gz。原词条与每项def逐字保留，版权为教育部所有，适用CC-BY-ND-3.0-TW；本资料只把未修改原义与独立项目元数据并列，未重新授权字典。完整许可data/raw/CC-BY-ND-3.0-TW.html及data/raw/moe-README.md一并依既有来源保留。\n\n《诗经》原件由chinese-poetry固定提交b8594f81a89752241442f2ce267d6f66f96704ee提供，《周易》古籍原文由koriyoshi2041/zhouyi固定提交c74ae5a89e4b01da03fc8024d653f764ffd10aef提供，原项目MIT许可随固定原件保留；不导入现代译文、不删不利原句。项目原创审阅说明、现代概括和家庭期许为CC0-1.0，只覆盖项目原创部分。\n\n这里的approved表示具体范围经审说明，不等于任何语境都能用；context-bound与其余需要家庭选择的条目默认人工确认。查阅reviewMeaning仅供显示和人工判断；自动lookupMeaning必须通过automaticMeaningAllowed及明确条件。完整姓名出处只授予登记的完整姓名，不把组合义批量回填到单字。\n\n修订137.r2：按正式独立来源审计DEV03-R1-SOURCE-001，将完整出处名琼莹的莹绑定瑩96948/0/1“美石。”并保留同句证据；琼英留待复词级证据合同完成，本批不授新增组合信用。原562逐字审阅及三批原件、旧v3/4/5/6、全部elements均不改。\n";
export const V7_PUBLICATION_PINS = Object.freeze({
  "version": "naming-editorial-7.0.0",
  "revision": "137.r2",
  "lockSha256": "2945297a7f4bca1489e12018cce2848909fc35716c999b7d309e9a79633f7476",
  "tableSha256": "392fa47441a0c410b0903c3e85853081225a1a5e9f540b5467e4ea4e2151cc48",
  "sourceSha256": "c8ab117059d68c26180c6de68b84032cd498fd8714cf5ee5b8df945c1205f676"
});

// Explicit7.1 publication; every V7_* historical value above remains unchanged.
export const V71_RULE_VERSION=Object.freeze("naming-editorial-7.1.0");
export const V71_PROFILE_VERSION=Object.freeze("naming-character-meanings-v7.1/1");
export const V71_SOURCE_ID=Object.freeze("naming-character-meanings-v7.1-fixed");
export const V71_FILES=Object.freeze({
  "subset": "data/raw/naming-character-meanings-v7.1-subset.json",
  "profile": "data/naming-character-meanings-v7.1-profile.json",
  "admission": "data/naming-character-meanings-v7.1-admission.json",
  "lock": "data/naming-character-meanings-v7.1-source-lock.json",
  "manifest": "data/naming-character-meanings-v7.1-manifest.json",
  "notice": "data/naming-character-meanings-v7.1-NOTICE.md"
});
export const V71_INPUT_HASHES=Object.freeze({
  "data/dataset-v6.json": "3245e1701046d43562520926d185e8363da8bf27c2523fc27a7de4e15eda0728",
  "data/knowledge-v6.sqlite": "1875aa49dcfaeca0f266a3be7578e4d4b2a9b2c9c1f59fd79699a3e26d5d6b8b",
  "data/naming-editorial-dictionary-v6-source-lock.json": "06331d11a1c757a0245891fae357c7952db597d07c3c770d4052277c0bfac8da",
  "data/naming-editorial-meanings-v7-source-lock.json": "2945297a7f4bca1489e12018cce2848909fc35716c999b7d309e9a79633f7476",
  "data/naming-editorial-v4.json": "d24898eb63438d7b24262668eb3b36770f211fade015b28eeb361700a58ca6ce",
  "data/naming-editorial-v5.json": "bb8d3d255b42a6b67932988e13ceb2d7a7a1c6ef8fbbcc65312b9a50b5519da8",
  "data/naming-editorial-v6.json": "35de5f749f438e849543e5fde6e405b89ba01cba20597e82e7c4f518dd4363ab",
  "data/naming-editorial-v7-NOTICE.md": "c7dc728945bf2ceed14feb23e1635a6e6fd3ce8e5a135489554ec075e963a1b3",
  "data/naming-editorial-v7.json": "392fa47441a0c410b0903c3e85853081225a1a5e9f540b5467e4ea4e2151cc48",
  "data/naming-editorial.json": "97c3162238c9493174544580a338fb0852d2784fbeac712fbd8e234f99945195",
  "data/raw/CC-BY-ND-3.0-TW.html": "04e6ef69a223b6e13c93c97a918ad5fd0dbb9fc34ae307f4449ed264e2d4108f",
  "data/raw/kSimplifiedVariant.txt": "a7f0c9dbbca85cffd90517fa6ea9be97d2e6f811328a59b6b303d58a418ac9be",
  "data/raw/kTraditionalVariant.txt": "4eca6285d45070548e6e6c06e4b48c3ca6866d4380e8cb980c512f5d1fc71895",
  "data/raw/moe-README.md": "a93321d9381bc1cf34b4ad844f71607fa748c86c0b228ae37d46720d6a659cb2",
  "data/raw/moe-revised.json.gz": "cf29701f887bd3b58e9520df53d905e2697ff13a408d70a771b0458f3039fb2e",
  "data/raw/naming-character-meanings-v7.1-subset.json": "59be39f7d9cbed1db5220721c015445546a19aa9967e59d4db0f820f3bcee8c1",
  "data/raw/naming-citations-v7-errata-r2.json": "e61707d9e3ac04110cdcaa924dd53a32b8bcc0ae8a0d0b0cbf9016a83108b945",
  "data/raw/naming-citations-v7-review.json": "e5d3909b04812c418feffbbb34cdecd3224527130a4ddfa91b62432e7ef59cc3",
  "data/raw/naming-meanings-v7-errata-r1.json": "e0bafe66312b98df77a367402915da57a3d5fa2c43ce56ca6af85a41cb4c3c0a",
  "data/raw/naming-meanings-v7-review.json": "8bdf895484e9b88daaa822fdd873901ee3dba994f23961cc836692f340446b1c",
  "data/raw/poetry-LICENSE": "c195319aeaa3ffcbe16aa5d26eec19eae5a42f84337dd2b3dc3c9d5ccbbd6507",
  "data/raw/shijing.json": "3c7ca54d59424542ada99adfcc85420287fbbd5c8a511e9baf705cb2b04051e7",
  "data/raw/unicode-LICENSE": "fe5c62b543e287981db198f2acfa0ca732d12591a1024536dc8fd85dacd77104",
  "data/raw/zhouyi-LICENSE": "0506d67239c89a3d3b14e253ed29e20e2e9259b41c4b32031eab5ac22ed2811f",
  "data/raw/zhouyi.tar.gz": "0a847c0b9b876f9926e4896399e31ee44f88292db107bc865d70e2d7308b15a0",
  "data/source-lock.json": "b1d206cdcfa2da184009442ba705d2231d8f0a43c2f5a9885a122a3e5d353bba"
});
export const V71_PUBLICATION_PINS=Object.freeze({
  "ruleVersion": "naming-editorial-7.1.0",
  "profileVersion": "naming-character-meanings-v7.1/1",
  "sourceId": "naming-character-meanings-v7.1-fixed",
  "subset": {
    "file": "data/raw/naming-character-meanings-v7.1-subset.json",
    "sha256": "59be39f7d9cbed1db5220721c015445546a19aa9967e59d4db0f820f3bcee8c1"
  },
  "profile": {
    "file": "data/naming-character-meanings-v7.1-profile.json",
    "sha256": "6e619be92c16dc018715fc77425f150b6a2c9af2e01be63b309035c81dd6a85b"
  },
  "admission": {
    "file": "data/naming-character-meanings-v7.1-admission.json",
    "sha256": "425909be7aa94e251a37d45a77c759d0b3dfd323beef0af6882f3e0596b4d313"
  },
  "lock": {
    "file": "data/naming-character-meanings-v7.1-source-lock.json",
    "sha256": "d8e1c6c278090d290b5792e31dc5187df5ad290b97e7ccdbce58dcbd285d793a"
  },
  "manifest": {
    "file": "data/naming-character-meanings-v7.1-manifest.json",
    "sha256": "51277c6deca9d7177d41518b76740077938030e847ad72464f343c6e98b880fb"
  },
  "sourceAggregateSha256": "01adfb9e007c441469c28b101e51bf43f72afc49fe3ad2a68614babce9fa0fe1",
  "exactCaseIds": [
    "single-meaning-next:中:6025:0:0",
    "single-meaning-next:仪:14591:0:0",
    "single-meaning-next:元:14888:0:8",
    "single-meaning-next:冰:17833:0:0",
    "single-meaning-next:南:23414:0:0",
    "single-meaning-next:境:34131:0:1",
    "single-meaning-next:墨:34262:0:0",
    "single-meaning-next:奕:38570:0:1",
    "single-meaning-next:峻:46828:0:1",
    "single-meaning-next:庆:56503:0:2",
    "single-meaning-next:彩:51603:0:1",
    "single-meaning-next:彰:51723:0:0",
    "single-meaning-next:情:55118:0:0",
    "single-meaning-next:惠:55334:0:4",
    "single-meaning-next:普:71655:0:0",
    "single-meaning-next:朋:73620:0:0",
    "single-meaning-next:朔:73727:0:0",
    "single-meaning-next:木:74035:0:0",
    "single-meaning-next:格:76502:0:4",
    "single-meaning-next:楚:77603:0:2",
    "single-meaning-next:欢:79612:0:1",
    "single-meaning-next:理:96624:0:7",
    "single-meaning-next:碧:105031:0:1",
    "single-meaning-next:程:107277:0:2",
    "single-meaning-next:空:107834:0:2",
    "single-meaning-next:纾:111486:0:1",
    "single-meaning-next:绪:113522:0:2",
    "single-meaning-next:绿:113006:0:1",
    "single-meaning-next:翠:115840:0:6",
    "single-meaning-next:肃:117686:0:1",
    "single-meaning-next:萍:123879:0:0",
    "single-meaning-next:豪:134656:0:6",
    "single-meaning-next:贵:135430:0:2",
    "single-meaning-next:遥:142679:0:0",
    "single-meaning-next:霆:152712:0:1",
    "single-meaning-next:青:153099:0:6",
    "single-meaning-next:静:153292:0:4",
    "single-meaning-next:高:158594:0:0",
    "single-meaning-next:黎:161706:0:1",
    "single-meaning-next:黛:161987:0:3"
  ],
  "reviewedSelection": {
    "firstManifestSha256": "fe8ea3fc0c39d8423a41cd9789dfbf2a3a4e3bfb7c5b3b2a222a9b47579ff8fb",
    "secondManifestSha256": "aca8762eac8f39fa98288c0db2451bdd8ce8387532bfe9f5474d81092910d078",
    "sixCorrectionManifestSha256": "b7b5d183d49ed4df3d57b52955025c6188cefc13e75df65400e1184bdcb42934",
    "scopeFixManifestSha256": "125e3d8ebf14acdfc8f16a0fca10d64f89a0aae4354a712b7a87fd8f53250763",
    "requiredOutputScopeAuditSha256": "956bd1475a1fe19115447ca42c9ffb99f39b22f9f3fe738d474e38520c7ef41c",
    "decisionIndexSha256": "58a6d9d57f672a9da46ea5f6f55f9c6f54caab613677105942702b386a8aed3c",
    "firstCases": [
      "single-meaning-next:静:153292:0:4",
      "single-meaning-next:碧:105031:0:1",
      "single-meaning-next:理:96624:0:7",
      "single-meaning-next:奕:38570:0:1",
      "single-meaning-next:墨:34262:0:0",
      "single-meaning-next:青:153099:0:6",
      "single-meaning-next:冰:17833:0:0",
      "single-meaning-next:朋:73620:0:0",
      "single-meaning-next:遥:142679:0:0",
      "single-meaning-next:峻:46828:0:1",
      "single-meaning-next:肃:117686:0:1",
      "single-meaning-next:仪:14591:0:0",
      "single-meaning-next:庆:56503:0:2",
      "single-meaning-next:惠:55334:0:4",
      "single-meaning-next:元:14888:0:8",
      "single-meaning-next:彰:51723:0:0",
      "single-meaning-next:欢:79612:0:1",
      "single-meaning-next:豪:134656:0:6",
      "single-meaning-next:纾:111486:0:1",
      "single-meaning-next:贵:135430:0:2"
    ],
    "secondUnchangedCases": [
      "single-meaning-next:木:74035:0:0",
      "single-meaning-next:南:23414:0:0",
      "single-meaning-next:绿:113006:0:1",
      "single-meaning-next:萍:123879:0:0",
      "single-meaning-next:情:55118:0:0",
      "single-meaning-next:黛:161987:0:3",
      "single-meaning-next:格:76502:0:4",
      "single-meaning-next:楚:77603:0:2",
      "single-meaning-next:空:107834:0:2",
      "single-meaning-next:普:71655:0:0",
      "single-meaning-next:高:158594:0:0",
      "single-meaning-next:程:107277:0:2",
      "single-meaning-next:境:34131:0:1",
      "single-meaning-next:翠:115840:0:6"
    ],
    "correctedCases": [
      "single-meaning-next:绪:113522:0:2",
      "single-meaning-next:朔:73727:0:0",
      "single-meaning-next:霆:152712:0:1",
      "single-meaning-next:中:6025:0:0",
      "single-meaning-next:黎:161706:0:1",
      "single-meaning-next:彩:51603:0:1"
    ]
  },
  "reviewStatus": "candidate-not-runtime-accepted"
});
export const V71_EXACT_CASE_IDS=Object.freeze([
  "single-meaning-next:中:6025:0:0",
  "single-meaning-next:仪:14591:0:0",
  "single-meaning-next:元:14888:0:8",
  "single-meaning-next:冰:17833:0:0",
  "single-meaning-next:南:23414:0:0",
  "single-meaning-next:境:34131:0:1",
  "single-meaning-next:墨:34262:0:0",
  "single-meaning-next:奕:38570:0:1",
  "single-meaning-next:峻:46828:0:1",
  "single-meaning-next:庆:56503:0:2",
  "single-meaning-next:彩:51603:0:1",
  "single-meaning-next:彰:51723:0:0",
  "single-meaning-next:情:55118:0:0",
  "single-meaning-next:惠:55334:0:4",
  "single-meaning-next:普:71655:0:0",
  "single-meaning-next:朋:73620:0:0",
  "single-meaning-next:朔:73727:0:0",
  "single-meaning-next:木:74035:0:0",
  "single-meaning-next:格:76502:0:4",
  "single-meaning-next:楚:77603:0:2",
  "single-meaning-next:欢:79612:0:1",
  "single-meaning-next:理:96624:0:7",
  "single-meaning-next:碧:105031:0:1",
  "single-meaning-next:程:107277:0:2",
  "single-meaning-next:空:107834:0:2",
  "single-meaning-next:纾:111486:0:1",
  "single-meaning-next:绪:113522:0:2",
  "single-meaning-next:绿:113006:0:1",
  "single-meaning-next:翠:115840:0:6",
  "single-meaning-next:肃:117686:0:1",
  "single-meaning-next:萍:123879:0:0",
  "single-meaning-next:豪:134656:0:6",
  "single-meaning-next:贵:135430:0:2",
  "single-meaning-next:遥:142679:0:0",
  "single-meaning-next:霆:152712:0:1",
  "single-meaning-next:青:153099:0:6",
  "single-meaning-next:静:153292:0:4",
  "single-meaning-next:高:158594:0:0",
  "single-meaning-next:黎:161706:0:1",
  "single-meaning-next:黛:161987:0:3"
]);
export const V71_NOTICE=Object.freeze("# 逐字项目说明7.1固定候选出版\n\n精确40条独立字义项目说明，身份naming-editorial-7.1.0／naming-character-meanings-v7.1/1／naming-character-meanings-v7.1-fixed。现字库779和旧7.0数据、算法、304范围及历史原件不改。此候选尚未注册产品；只有7.1加载/生成/保存/重开/历史/备份/UI/PDF实际验收完成后，才可报告相应读音与范围条件下344逐字说明覆盖。\n\nMOE重编国语辞典文本按固定a6dc997417507eb510fc29822bc514de2c92728c原件逐字保留，CC-BY-ND-3.0-TW；原定义、type、例句和引文没有改写或重新授权。Unicode字形原行按固定Unicode17原件及原许可保留，不概括任意异体同义。项目取意、家庭期许、理由与limits独立标作CC0-1.0项目创作，不冒称原典、人格测定或运势事实。\n\n新增许可只有per-character-project-explanation-only。单字请求必须完整准入，外层按候选位置装配；混名不是partial整名批准，wholeNameAssessment=not-assessed、wholeNameMeaning=null、automaticNameRecommendation=false、automaticSemanticCreditAllowed=false、scoreDelta=0。旧研究提案any-name不构成权限，profile没有这类运行许可。\n\n六修沿审定语境，霆保所引古籍的闪电用字背景，黎保通梨／黧黑色语境；不换成更常见义。词典原义、项目逐字说明、项目期许与独立既有组合依据分别展示。\n");
