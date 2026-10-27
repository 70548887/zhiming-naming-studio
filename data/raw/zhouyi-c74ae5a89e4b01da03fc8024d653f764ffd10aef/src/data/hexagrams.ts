// 周易六十四卦完整数据库 - 汇总文件

import { PALACE_QIAN } from './palace-qian.js'
import { PALACE_KUN } from './palace-kun.js'
import { PALACE_KAN } from './palace-kan.js'
import { PALACE_LI } from './palace-li.js'
import { PALACE_ZHEN } from './palace-zhen.js'
import { PALACE_XUN } from './palace-xun.js'
import { PALACE_GEN } from './palace-gen.js'
import { PALACE_DUI } from './palace-dui.js'

// 合并所有八宫数据
const ALL_HEXAGRAMS = [
  ...PALACE_QIAN,
  ...PALACE_KUN,
  ...PALACE_KAN,
  ...PALACE_LI,
  ...PALACE_ZHEN,
  ...PALACE_XUN,
  ...PALACE_GEN,
  ...PALACE_DUI,
]

// 按文王卦序排序
export const HEXAGRAMS = ALL_HEXAGRAMS.sort((a, b) => a.number - b.number)

// 通过binary查找卦
export const BINARY_TO_HEXAGRAM: Record<string, typeof ALL_HEXAGRAMS[0]> = {}
for (const hex of ALL_HEXAGRAMS) {
  BINARY_TO_HEXAGRAM[hex.binary] = hex
}

// 通过卦序查找
export const NUMBER_TO_HEXAGRAM: Record<number, typeof ALL_HEXAGRAMS[0]> = {}
for (const hex of ALL_HEXAGRAMS) {
  NUMBER_TO_HEXAGRAM[hex.number] = hex
}

// 通过卦名查找
export const NAME_TO_HEXAGRAM: Record<string, typeof ALL_HEXAGRAMS[0]> = {}
for (const hex of ALL_HEXAGRAMS) {
  NAME_TO_HEXAGRAM[hex.name] = hex
}

// 按宫分组
export const PALACE_HEXAGRAMS: Record<string, typeof ALL_HEXAGRAMS> = {
  '乾': PALACE_QIAN,
  '坤': PALACE_KUN,
  '坎': PALACE_KAN,
  '离': PALACE_LI,
  '震': PALACE_ZHEN,
  '巽': PALACE_XUN,
  '艮': PALACE_GEN,
  '兑': PALACE_DUI,
}
