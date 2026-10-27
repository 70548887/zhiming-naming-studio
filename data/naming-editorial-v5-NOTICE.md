# 命名出处5.0与两字字典身份纠正

27个新增姓名的原义、逐字读音及固定全文语境经本项目逐条审阅；家庭期许为项目原创解释，不是古籍断语、人格测量或运势保证。原3.0的40条规则44名、4.0字义约束与旧字库保留原字节。

仅将志的默认原词条由誌纠正为志，将家的默认原词条由傢纠正为家；默认拼音/声调、779字集合及Unicode variants不变。家词条原有gū异读完整保留。原誌/傢条和旧字库仍留在固定原始辞典及旧包，不混并释义。其余777字、全部既有引文/知识/六个字库来源不改。新专用命名来源由服务层追加，不写入字库六来源。

诗经：chinese-poetry/chinese-poetry，固定提交b8594f81a89752241442f2ce267d6f66f96704ee；周易卦爻与大象：koriyoshi2041/zhouyi，固定提交c74ae5a89e4b01da03fc8024d653f764ffd10aef。古籍为公版，上游整理按MIT，保留data/raw/poetry-LICENSE与zhouyi-LICENSE。固定原字、分块均保留；不是影印校勘或完整十翼。

字典原文：教育部《重编国语辞典修订本》，g0v/moedict-data固定提交a6dc997417507eb510fc29822bc514de2c92728c，data/raw/moe-revised.json.gz。版权为教育部所有；原始释义及heteronyms不改写，依CC-BY-ND-3.0-TW保留，格式转换许可说明见data/raw/moe-README.md及CC-BY-ND-3.0-TW.html。此处项目原创选义说明为CC0，不重新授权字典原文。

可离线重建：node scripts/build-naming-editorial-v5.mjs；只读逐byte复核：node scripts/build-naming-editorial-v5.mjs --verify。无网络请求、无时间戳；--verify不写文件。
