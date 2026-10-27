# 命名字典6.0：九字原词条与限定用途迁移

仅将才、冬、千、秋、沈、咸、旋、郁、致的默认字典身份改回固定MOE本字原条；默认拼音/声调、779字集合及Unicode variants不变。其他770字、全部既有引文/知识/六个原始来源、3.0/4.0/5.0数据及27+44姓名规则保留。独立knowledge-v6.sqlite和dataset-v6.json不覆盖旧包。九字正体采用本字；其独立字画字段不改。沈shěn仅据姓义，唯一移除不相关明朗标签，其余八字标签不改。旋xuàn仍是默认，完整保留xuán；沈chén仅保留原辞典同沉参照，不展开实体义，不得授予项目信用。

冬的坚韧、秋的收获为项目原创季节类比，并在显示字串中明标非字典原义；致远只按致的达到与远的距离义审定为现代自然搭配，不新增经典出处或泛审单字。其它九字项目语义信用默认关闭。咸原条艮兌括号符号与文字冲突按原样保留待核，不据此自动推卦。

教育部《重编国语辞典修订本》原件：g0v/moedict-data固定提交a6dc997417507eb510fc29822bc514de2c92728c，data/raw/moe-revised.json.gz。字典原始def/link/quote/heteronyms逐字保留，版权为教育部所有，依CC-BY-ND-3.0-TW；原件和许可见data/raw/moe-README.md及CC-BY-ND-3.0-TW.html。沈chén的用户显示前缀及原词条选定属于分开的项目元数据，原空def和link不改。项目原创审阅说明为CC0，不重新授权原字典。旧5.0的诗经/周易与MIT许可完整继承，不改原语境。

可离线确定性重建：node scripts/build-naming-editorial-v6.mjs。逐byte只读复核：node scripts/build-naming-editorial-v6.mjs --verify；无下载、无时间戳，verify不写文件。
