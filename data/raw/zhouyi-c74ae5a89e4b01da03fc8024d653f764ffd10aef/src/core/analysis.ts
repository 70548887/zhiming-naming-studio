/**
 * 周易装卦与断卦分析引擎
 * 接收起卦结果，输出完整的装卦分析
 */

import type {
  YaoValue,
  YinYang,
  DivinationResult,
  YaoInfo,
  QuestionType,
  WuXing,
  LiuQin,
  LiuShen,
  TianGan,
  DiZhi,
  GuaName,
} from '../types.js'

// ===== 内联核心数据 =====

/** 三爻二进制与八卦对应 */
const TRIGRAM_BINARY: Record<string, GuaName> = {
  '111': '乾',
  '110': '兑',
  '101': '离',
  '100': '震',
  '011': '巽',
  '010': '坎',
  '001': '艮',
  '000': '坤',
}

/** 八卦五行属性 */
const TRIGRAM_ELEMENT: Record<GuaName, WuXing> = {
  乾: '金',
  兑: '金',
  离: '火',
  震: '木',
  巽: '木',
  坎: '水',
  艮: '土',
  坤: '土',
}

/** 纳甲表：每卦的天干地支对应 */
const NAJIA_TABLE: Record<GuaName, { gan: TianGan[]; zhi: DiZhi[] }> = {
  乾: {
    gan: ['甲', '甲', '甲', '壬', '壬', '壬'],
    zhi: ['子', '寅', '辰', '午', '申', '戌'],
  },
  坤: {
    gan: ['乙', '乙', '乙', '癸', '癸', '癸'],
    zhi: ['未', '巳', '卯', '丑', '亥', '酉'],
  },
  震: {
    gan: ['庚', '庚', '庚', '庚', '庚', '庚'],
    zhi: ['子', '寅', '辰', '午', '申', '戌'],
  },
  巽: {
    gan: ['辛', '辛', '辛', '辛', '辛', '辛'],
    zhi: ['丑', '亥', '酉', '未', '巳', '卯'],
  },
  坎: {
    gan: ['戊', '戊', '戊', '戊', '戊', '戊'],
    zhi: ['寅', '辰', '午', '申', '戌', '子'],
  },
  离: {
    gan: ['己', '己', '己', '己', '己', '己'],
    zhi: ['卯', '丑', '亥', '酉', '未', '巳'],
  },
  艮: {
    gan: ['丙', '丙', '丙', '丙', '丙', '丙'],
    zhi: ['辰', '午', '申', '戌', '子', '寅'],
  },
  兑: {
    gan: ['丁', '丁', '丁', '丁', '丁', '丁'],
    zhi: ['巳', '卯', '丑', '亥', '酉', '未'],
  },
}

/** 地支五行属性 */
const DIZHI_ELEMENT: Record<DiZhi, WuXing> = {
  子: '水',
  丑: '土',
  寅: '木',
  卯: '木',
  辰: '土',
  巳: '火',
  午: '火',
  未: '土',
  申: '金',
  酉: '金',
  戌: '土',
  亥: '水',
}

/** 五行相生关系 */
const WUXING_GENERATE: Record<WuXing, WuXing> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
}

/** 五行相克关系 */
const WUXING_OVERCOME: Record<WuXing, WuXing> = {
  木: '土',
  土: '水',
  水: '火',
  火: '金',
  金: '木',
}

/** 六神固定顺序 */
const LIUSHEN_ORDER: LiuShen[] = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武']

/** 六神起点（根据日干确定） */
const LIUSHEN_START: Record<TianGan, number> = {
  甲: 0,
  乙: 0,
  丙: 1,
  丁: 1,
  戊: 2,
  己: 3,
  庚: 4,
  辛: 4,
  壬: 5,
  癸: 5,
}

/** 空亡表：旬干支对应空亡地支 */
const XUNKONG_TABLE: Record<string, DiZhi[]> = {
  甲子: ['戌', '亥'],
  甲戌: ['申', '酉'],
  甲申: ['午', '未'],
  甲午: ['辰', '巳'],
  甲辰: ['寅', '卯'],
  甲寅: ['子', '丑'],
}

/** 用神映射：根据问事类型确定用神 */
const YONGSHEN_MAP: Record<QuestionType, LiuQin | ''> = {
  事业: '官鬼',
  财运: '妻财',
  考试: '父母',
  婚姻: '妻财',
  健康: '官鬼',
  出行: '父母',
  诉讼: '官鬼',
  其他: '',
}

// ===== 核心函数 =====

/**
 * 爻值转阴阳
 * @param value 爻值(6|7|8|9)
 * @returns 阴阳值(0=阴, 1=阳)
 */
export function yaoToYinYang(value: YaoValue): YinYang {
  return value === 7 || value === 9 ? 1 : 0
}

/**
 * 判断是否变爻
 * @param value 爻值(6|7|8|9)
 * @returns 是否为变爻(6老阴, 9老阳)
 */
export function isChanging(value: YaoValue): boolean {
  return value === 6 || value === 9
}

/**
 * 从6个爻的阴阳值识别卦
 * @param yinyangs 6个爻的阴阳值，索引0=初爻，5=上爻
 * @returns 上卦、下卦和二进制表示
 */
export function identifyHexagram(yinyangs: YinYang[]): {
  upper: GuaName
  lower: GuaName
  binary: string
} {
  const binary = yinyangs.map(String).join('')
  const lowerBin = binary.slice(0, 3)
  const upperBin = binary.slice(3, 6)
  return {
    upper: TRIGRAM_BINARY[upperBin],
    lower: TRIGRAM_BINARY[lowerBin],
    binary,
  }
}

/**
 * 计算变卦（之卦）的阴阳值
 * @param yaoValues 6个爻值
 * @returns 变卦的6个爻的阴阳值
 */
export function getChangedYinYangs(yaoValues: readonly YaoValue[]): YinYang[] {
  return yaoValues.map((v) => {
    if (v === 9) return 0 as YinYang // 老阳变阴
    if (v === 6) return 1 as YinYang // 老阴变阳
    if (v === 7) return 1 as YinYang // 少阳不变
    return 0 as YinYang // 少阴不变(8)
  })
}

/**
 * 计算互卦的阴阳值
 * 下互卦取本卦2,3,4爻；上互卦取本卦3,4,5爻
 * @param yinyangs 本卦6个爻的阴阳值
 * @returns 互卦的6个爻的阴阳值
 */
export function getMutualYinYangs(yinyangs: YinYang[]): YinYang[] {
  return [
    yinyangs[1],
    yinyangs[2],
    yinyangs[3], // 下互卦：2,3,4爻
    yinyangs[2],
    yinyangs[3],
    yinyangs[4], // 上互卦：3,4,5爻
  ]
}

/**
 * 推导六亲：根据宫的五行和爻的地支五行进行生克推导
 * @param palaceElement 宫的五行（"我"）
 * @param yaoElement 爻所纳地支的五行
 * @returns 六亲
 */
export function getLiuQin(palaceElement: WuXing, yaoElement: WuXing): LiuQin {
  if (palaceElement === yaoElement) return '兄弟' // 同五行
  if (WUXING_GENERATE[palaceElement] === yaoElement) return '子孙' // 我生者
  if (WUXING_OVERCOME[palaceElement] === yaoElement) return '妻财' // 我克者
  if (WUXING_OVERCOME[yaoElement] === palaceElement) return '官鬼' // 克我者
  if (WUXING_GENERATE[yaoElement] === palaceElement) return '父母' // 生我者
  return '兄弟' // fallback
}

/**
 * 配置六神数组：根据日干确定六神起点，然后依次排列
 * @param dayGan 日干
 * @returns 6个六神的顺序（从初爻到上爻）
 */
export function getLiuShenArray(dayGan: TianGan): LiuShen[] {
  const startIdx = LIUSHEN_START[dayGan]
  return Array.from({ length: 6 }, (_, i) => LIUSHEN_ORDER[(startIdx + i) % 6])
}

/**
 * 获取空亡地支
 * @param dayGan 日干
 * @param dayZhi 日支
 * @returns 该旬的空亡地支
 */
export function getEmptyBranches(dayGan: TianGan, dayZhi: DiZhi): DiZhi[] {
  // 根据日干支确定所在旬的旬首干支
  const TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

  const ganIdx = TIANGAN.indexOf(dayGan)
  const zhiIdx = DIZHI.indexOf(dayZhi)

  // 旬首地支 = (日支索引 - 日干序号) mod 12
  // 得到旬首后与甲组合得到旬的key
  const xunStartZhiIdx = (zhiIdx - ganIdx + 12) % 12
  const xunStartZhi = DIZHI[xunStartZhiIdx]
  const xunKey = '甲' + xunStartZhi

  return XUNKONG_TABLE[xunKey] || []
}

/**
 * 获取变爻解读规则说明
 * @param changingCount 变爻数量
 * @returns 规则说明文字
 */
export function getInterpretationRule(changingCount: number): string {
  const rules: Record<number, string> = {
    0: '无变爻（静卦），以本卦卦辞断。',
    1: '一爻变，以本卦变爻之爻辞断。',
    2: '两爻变，以本卦两变爻爻辞断，上爻为主。',
    3: '三爻变，以本卦卦辞和之卦卦辞断，本卦为主。',
    4: '四爻变，以之卦两不变爻爻辞断，下爻为主。',
    5: '五爻变，以之卦不变爻之爻辞断。',
    6: '六爻全变。乾坤看用九/用六，其他看之卦卦辞。',
  }
  return rules[changingCount] || ''
}

/**
 * 获取应参考的文本指引
 * @param changingCount 变爻数量
 * @param changingLines 变爻位置列表
 * @returns 应参考的卦辞/爻辞文本指引
 */
export function getRelevantTextGuide(
  changingCount: number,
  changingLines: number[]
): string[] {
  switch (changingCount) {
    case 0:
      return ['本卦卦辞']
    case 1:
      return [`本卦第${changingLines[0]}爻爻辞`]
    case 2:
      return changingLines
        .map((l) => `本卦第${l}爻爻辞`)
        .concat(['(以上爻为主)'])
    case 3:
      return ['本卦卦辞', '之卦卦辞', '(以本卦为主)']
    case 4: {
      const allLines = [1, 2, 3, 4, 5, 6]
      const unchanging = allLines.filter((l) => !changingLines.includes(l))
      return unchanging.map((l) => `之卦第${l}爻爻辞`).concat(['(以下爻为主)'])
    }
    case 5: {
      const allLines = [1, 2, 3, 4, 5, 6]
      const unchanging = allLines.filter((l) => !changingLines.includes(l))
      return [`之卦第${unchanging[0]}爻爻辞`]
    }
    case 6:
      return ['乾坤看用九/用六，其他卦看之卦卦辞']
    default:
      return []
  }
}

/**
 * 主分析函数：完整装卦
 * 将起卦结果转化为详细的装卦分析
 */
export function analyzeHexagram(
  result: DivinationResult,
  dayGan: TianGan,
  dayZhi: DiZhi,
  monthZhi: DiZhi,
  worldLine: number = 6,
  responseLine: number = 3,
  questionType?: QuestionType,
  question?: string,
  palace?: GuaName
): {
  originalBinary: string
  changedBinary: string | null
  mutualBinary: string
  upperTrigram: GuaName
  lowerTrigram: GuaName
  changingLines: number[]
  changingCount: number
  interpretationRule: string
  relevantTexts: string[]
  yaoInfos: YaoInfo[]
} {
  const { yaoValues } = result

  // 1. 本卦阴阳（索引0=初爻，5=上爻）
  const originalYinYangs = yaoValues.map(yaoToYinYang)
  const { upper, lower, binary: originalBinary } = identifyHexagram(originalYinYangs)

  // 2. 识别变爻
  const changingLines = yaoValues
    .map((v, i) => (isChanging(v) ? i + 1 : -1))
    .filter((i) => i > 0)
  const changingCount = changingLines.length

  // 3. 计算之卦
  let changedBinary: string | null = null
  if (changingCount > 0) {
    const changedYinYangs = getChangedYinYangs(yaoValues)
    changedBinary = changedYinYangs.map(String).join('')
  }

  // 4. 计算互卦
  const mutualYinYangs = getMutualYinYangs(originalYinYangs)
  const mutualBinary = mutualYinYangs.map(String).join('')

  // 5. 纳甲装卦：获取天干地支
  const lowerNajia = NAJIA_TABLE[lower]
  const upperNajia = NAJIA_TABLE[upper]

  // 6. 宫的五行属性（用于推导六亲）
  // 优先使用传入的宫名，否则退回到上卦（近似）
  const palaceElement = TRIGRAM_ELEMENT[palace ?? upper]

  // 7. 六神配置
  const liuShenArray = getLiuShenArray(dayGan)

  // 8. 空亡地支
  const emptyBranches = getEmptyBranches(dayGan, dayZhi)

  // 9. 组装爻信息
  // 内卦(下卦)的3爻使用下卦的纳甲0-2索引
  // 外卦(上卦)的3爻使用上卦的纳甲3-5索引
  const yaoInfos: YaoInfo[] = yaoValues.map((v, i) => {
    const position = i + 1
    const yinyang = yaoToYinYang(v)
    const changing = isChanging(v)

    let tianGan: TianGan
    let diZhi: DiZhi

    if (i < 3) {
      // 内卦：使用下卦纳甲的0-2
      tianGan = lowerNajia.gan[i] as TianGan
      diZhi = lowerNajia.zhi[i] as DiZhi
    } else {
      // 外卦：使用上卦纳甲的3-5对应的索引(即0-2)
      tianGan = upperNajia.gan[i - 3] as TianGan
      diZhi = upperNajia.zhi[i - 3] as DiZhi
    }

    const element = DIZHI_ELEMENT[diZhi] as WuXing
    const liuQin = getLiuQin(palaceElement, element)
    const liuShen = liuShenArray[i]
    const isEmpty = emptyBranches.includes(diZhi)

    return {
      position,
      yinyang,
      changing,
      tianGan,
      diZhi,
      element,
      liuQin,
      liuShen,
      isWorld: position === worldLine,
      isResponse: position === responseLine,
      isEmpty,
    }
  })

  // 10. 解读规则
  const interpretationRule = getInterpretationRule(changingCount)
  const relevantTexts = getRelevantTextGuide(changingCount, changingLines)

  return {
    originalBinary,
    changedBinary,
    mutualBinary,
    upperTrigram: upper,
    lowerTrigram: lower,
    changingLines,
    changingCount,
    interpretationRule,
    relevantTexts,
    yaoInfos,
  }
}

/**
 * 获取用神：根据问事类型从六亲中查找对应的爻
 * @param yaoInfos 爻信息数组
 * @param questionType 问事类型
 * @returns 用神爻位置(1-6)，如果用神不现返回null
 */
export function getUsefulGod(yaoInfos: readonly YaoInfo[], questionType?: QuestionType): number | null {
  if (!questionType) return null

  const targetLiuQin = YONGSHEN_MAP[questionType]
  if (!targetLiuQin) return null

  const usefulYao = yaoInfos.find((y) => y.liuQin === targetLiuQin)
  return usefulYao ? usefulYao.position : null
}
