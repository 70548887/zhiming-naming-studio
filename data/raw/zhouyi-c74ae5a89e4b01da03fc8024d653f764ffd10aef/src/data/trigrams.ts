// 周易八卦与辅助数据

import type {
  GuaName,
  Trigram,
  WuXing,
  TianGan,
  DiZhi,
  LiuQin,
  LiuShen,
} from '../types.js'

// ============================================================
// 八卦数据
// 二进制编码：从初爻到上爻排列（1=阳, 0=阴）
// ============================================================

export const TRIGRAMS: Record<GuaName, Trigram> = {
  '乾': { name: '乾', symbol: '☰', nature: '天', attribute: '健', element: '金', binary: '111', xiantianIndex: 1, family: '父', body: '首', animal: '马' },
  '兑': { name: '兑', symbol: '☱', nature: '泽', attribute: '悦', element: '金', binary: '110', xiantianIndex: 2, family: '少女', body: '口', animal: '羊' },
  '离': { name: '离', symbol: '☲', nature: '火', attribute: '丽', element: '火', binary: '101', xiantianIndex: 3, family: '中女', body: '目', animal: '雉' },
  '震': { name: '震', symbol: '☳', nature: '雷', attribute: '动', element: '木', binary: '100', xiantianIndex: 4, family: '长男', body: '足', animal: '龙' },
  '巽': { name: '巽', symbol: '☴', nature: '风', attribute: '入', element: '木', binary: '011', xiantianIndex: 5, family: '长女', body: '股', animal: '鸡' },
  '坎': { name: '坎', symbol: '☵', nature: '水', attribute: '陷', element: '水', binary: '010', xiantianIndex: 6, family: '中男', body: '耳', animal: '豕' },
  '艮': { name: '艮', symbol: '☶', nature: '山', attribute: '止', element: '土', binary: '001', xiantianIndex: 7, family: '少男', body: '手', animal: '狗' },
  '坤': { name: '坤', symbol: '☷', nature: '地', attribute: '顺', element: '土', binary: '000', xiantianIndex: 8, family: '母', body: '腹', animal: '牛' },
}

// ============================================================
// 二进制 -> 卦名 反查表
// ============================================================

export const BINARY_TO_TRIGRAM: Record<string, GuaName> = {
  '111': '乾', '110': '兑', '101': '离', '100': '震',
  '011': '巽', '010': '坎', '001': '艮', '000': '坤',
}

// ============================================================
// 纳甲表
// 索引 0=初爻, 5=上爻
// 内卦（初爻~三爻）取索引0-2，外卦（四爻~上爻）取索引3-5
// ============================================================

export const NAJIA_TABLE: Record<GuaName, { readonly gan: readonly TianGan[], readonly zhi: readonly DiZhi[] }> = {
  '乾': { gan: ['甲','甲','甲','壬','壬','壬'], zhi: ['子','寅','辰','午','申','戌'] },
  '坤': { gan: ['乙','乙','乙','癸','癸','癸'], zhi: ['未','巳','卯','丑','亥','酉'] },
  '震': { gan: ['庚','庚','庚','庚','庚','庚'], zhi: ['子','寅','辰','午','申','戌'] },
  '巽': { gan: ['辛','辛','辛','辛','辛','辛'], zhi: ['丑','亥','酉','未','巳','卯'] },
  '坎': { gan: ['戊','戊','戊','戊','戊','戊'], zhi: ['寅','辰','午','申','戌','子'] },
  '离': { gan: ['己','己','己','己','己','己'], zhi: ['卯','丑','亥','酉','未','巳'] },
  '艮': { gan: ['丙','丙','丙','丙','丙','丙'], zhi: ['辰','午','申','戌','子','寅'] },
  '兑': { gan: ['丁','丁','丁','丁','丁','丁'], zhi: ['巳','卯','丑','亥','酉','未'] },
}

// ============================================================
// 五行生克
// ============================================================

export const WUXING_ELEMENTS: readonly WuXing[] = ['木', '火', '土', '金', '水']

/** 五行相生：X 生 WUXING_GENERATE[X] */
export const WUXING_GENERATE: Record<WuXing, WuXing> = {
  '木': '火', '火': '土', '土': '金', '金': '水', '水': '木',
}

/** 五行相克：X 克 WUXING_OVERCOME[X] */
export const WUXING_OVERCOME: Record<WuXing, WuXing> = {
  '木': '土', '土': '水', '水': '火', '火': '金', '金': '木',
}

/** 地支对应五行 */
export const DIZHI_ELEMENT: Record<DiZhi, WuXing> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木',
  '辰': '土', '巳': '火', '午': '火', '未': '土',
  '申': '金', '酉': '金', '戌': '土', '亥': '水',
}

/** 天干对应五行 */
export const TIANGAN_ELEMENT: Record<TianGan, WuXing> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火',
  '戊': '土', '己': '土', '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
}

// ============================================================
// 六神配置
// ============================================================

export const LIUSHEN_ORDER: readonly LiuShen[] = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武']

/** 日干 -> 初爻起配的六神索引（在 LIUSHEN_ORDER 中的起始位置） */
export const LIUSHEN_START: Record<TianGan, number> = {
  '甲': 0, '乙': 0,  // 青龙
  '丙': 1, '丁': 1,  // 朱雀
  '戊': 2,            // 勾陈
  '己': 3,            // 螣蛇
  '庚': 4, '辛': 4,  // 白虎
  '壬': 5, '癸': 5,  // 玄武
}

// ============================================================
// 六亲推导
// 生我者=父母, 我生者=子孙, 克我者=官鬼, 我克者=妻财, 同我者=兄弟
// ============================================================

/**
 * 根据"我"的五行和爻的五行，推导六亲
 * @param myElement - 本宫卦的五行（"我"）
 * @param yaoElement - 该爻纳支对应的五行
 */
export function getLiuQin(myElement: WuXing, yaoElement: WuXing): LiuQin {
  // 同我者为兄弟
  if (myElement === yaoElement) return '兄弟'
  // 我生者为子孙
  if (WUXING_GENERATE[myElement] === yaoElement) return '子孙'
  // 我克者为妻财
  if (WUXING_OVERCOME[myElement] === yaoElement) return '妻财'
  // 生我者为父母
  if (WUXING_GENERATE[yaoElement] === myElement) return '父母'
  // 克我者为官鬼
  if (WUXING_OVERCOME[yaoElement] === myElement) return '官鬼'
  // 不应到达此处，五行关系必为以上五种之一
  return '兄弟'
}

// ============================================================
// 旬空（空亡）表
// 以甲日旬首为键，值为该旬空亡的两个地支
// ============================================================

export const XUNKONG_TABLE: Record<string, readonly DiZhi[]> = {
  '甲子': ['戌','亥'],
  '甲戌': ['申','酉'],
  '甲申': ['午','未'],
  '甲午': ['辰','巳'],
  '甲辰': ['寅','卯'],
  '甲寅': ['子','丑'],
}

// ============================================================
// 六十甲子顺序（用于查找旬首）
// ============================================================

const TIANGAN_LIST: readonly TianGan[] = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const DIZHI_LIST: readonly DiZhi[] = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

/** 根据日干支查找所属旬首，返回旬空的两个地支 */
export function getXunKong(dayGan: TianGan, dayZhi: DiZhi): readonly DiZhi[] {
  const ganIndex = TIANGAN_LIST.indexOf(dayGan)
  const zhiIndex = DIZHI_LIST.indexOf(dayZhi)
  // 旬首的天干索引为0（甲），计算甲在当前旬中的地支位置
  // 从当前日干支回推到甲X
  const offset = ganIndex // 甲距离当前天干的偏移
  const xunZhiIndex = ((zhiIndex - offset) % 12 + 12) % 12
  const xunKey = `甲${DIZHI_LIST[xunZhiIndex]}`
  return XUNKONG_TABLE[xunKey] ?? []
}

// ============================================================
// 问事类型 -> 用神（六亲）
// ============================================================

export const YONGSHEN_MAP: Record<string, string> = {
  '事业': '官鬼',
  '财运': '妻财',
  '考试': '父母',
  '婚姻_男': '妻财',
  '婚姻_女': '官鬼',
  '健康': '官鬼',
  '子女': '子孙',
  '出行': '世爻',
  '诉讼': '官鬼',
  '其他': '',
}
