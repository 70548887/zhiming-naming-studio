// 周易占卜系统 - 核心类型定义

/** 阴阳 */
export type YinYang = 0 | 1  // 0=阴, 1=阳

/** 爻值（占卜结果） */
export type YaoValue = 6 | 7 | 8 | 9  // 6=老阴, 7=少阳, 8=少阴, 9=老阳

/** 五行 */
export type WuXing = '木' | '火' | '土' | '金' | '水'

/** 六亲 */
export type LiuQin = '父母' | '兄弟' | '子孙' | '妻财' | '官鬼'

/** 六神 */
export type LiuShen = '青龙' | '朱雀' | '勾陈' | '螣蛇' | '白虎' | '玄武'

/** 天干 */
export type TianGan = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸'

/** 地支 */
export type DiZhi = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥'

/** 八卦名 */
export type GuaName = '乾' | '兑' | '离' | '震' | '巽' | '坎' | '艮' | '坤'

/** 问事类型 */
export type QuestionType = '事业' | '财运' | '婚姻' | '健康' | '考试' | '出行' | '诉讼' | '其他'

/** 起卦方式 */
export type DivinationMethod = 'coin' | 'dayan' | 'meihua_time' | 'meihua_number'

/** 八卦（经卦/三画卦） */
export interface Trigram {
  readonly name: GuaName
  readonly symbol: string       // Unicode符号 ☰☱☲☳☴☵☶☷
  readonly nature: string       // 自然象征
  readonly attribute: string    // 卦德
  readonly element: WuXing      // 五行
  readonly binary: string       // 二进制（从初爻到上爻）
  readonly xiantianIndex: number // 先天八卦数 1-8
  readonly family: string       // 人伦
  readonly body: string         // 身体部位
  readonly animal: string       // 动物象征
}

/** 爻辞 */
export interface YaoText {
  readonly position: string     // 初六/初九/六二/九二 等
  readonly text: string         // 爻辞原文
  readonly translation: string  // 白话翻译
}

/** 六十四卦 */
export interface Hexagram {
  readonly number: number       // 文王卦序 1-64
  readonly name: string         // 卦名
  readonly fullName: string     // 全名（如"乾为天"、"水雷屯"）
  readonly upperTrigram: GuaName // 上卦名
  readonly lowerTrigram: GuaName // 下卦名
  readonly binary: string       // 六爻二进制（从初爻到上爻）
  readonly unicode: string      // 卦象Unicode字符
  readonly guaCi: string        // 卦辞原文
  readonly guaCiTranslation: string // 卦辞白话翻译
  readonly daXiang: string      // 大象传
  readonly yaoTexts: readonly YaoText[] // 六爻爻辞
  readonly yongText?: string    // 用九/用六（仅乾坤有）
  readonly keywords: readonly string[] // 核心关键词
  readonly palace: GuaName      // 所属宫
  readonly palaceOrder: number  // 宫内序号 1-8
  readonly worldLine: number    // 世爻位置 1-6
  readonly responseLine: number // 应爻位置 1-6
}

/** 单爻信息（装卦后） */
export interface YaoInfo {
  readonly position: number     // 爻位 1-6
  readonly yinyang: YinYang     // 阴阳
  readonly changing: boolean    // 是否变爻
  readonly tianGan: TianGan     // 天干
  readonly diZhi: DiZhi         // 地支
  readonly element: WuXing      // 五行
  readonly liuQin: LiuQin       // 六亲
  readonly liuShen: LiuShen     // 六神
  readonly isWorld: boolean     // 是否世爻
  readonly isResponse: boolean  // 是否应爻
  readonly isEmpty: boolean     // 是否空亡
}

/** 装卦结果（完整卦象分析） */
export interface HexagramAnalysis {
  readonly originalHexagram: Hexagram       // 本卦
  readonly changedHexagram: Hexagram | null  // 之卦（无变爻时为null）
  readonly mutualHexagram: Hexagram         // 互卦
  readonly yaoInfos: readonly YaoInfo[]     // 六爻详细信息
  readonly changingLines: readonly number[] // 变爻位置列表
  readonly changingCount: number            // 变爻数量
  readonly interpretationRule: string       // 解读规则说明
  readonly relevantTexts: readonly string[] // 应参考的卦辞/爻辞
  readonly question?: string               // 所问之事
  readonly questionType?: QuestionType      // 问事类型
  readonly method: DivinationMethod         // 起卦方式
  readonly datetime: Date                   // 占卜时间
  readonly dayGanZhi: { gan: TianGan, zhi: DiZhi } // 日干支
  readonly monthZhi: DiZhi                  // 月建
}

/** 起卦结果（六爻原始值） */
export interface DivinationResult {
  readonly yaoValues: readonly YaoValue[]   // 六爻值（索引0=初爻，5=上爻）
  readonly method: DivinationMethod
  readonly datetime: Date
}
