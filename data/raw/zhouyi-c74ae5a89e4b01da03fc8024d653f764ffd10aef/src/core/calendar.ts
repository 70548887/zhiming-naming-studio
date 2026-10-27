/**
 * 干支历计算 - 根据公历日期推算日干支、月建、时辰
 */

import type { TianGan, DiZhi } from '../types.js'

const TIAN_GAN: readonly TianGan[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const DI_ZHI: readonly DiZhi[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

/** 计算儒略日编号 (Julian Day Number) */
function julianDayNumber(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  )
}

/**
 * 计算日干支
 * 基准: 1900年1月1日 (JDN 2415021) 为 甲戌日 (干=0甲, 支=10戌)
 */
export function getDayGanZhi(date: Date): { gan: TianGan; zhi: DiZhi } {
  const jdn = julianDayNumber(date.getFullYear(), date.getMonth() + 1, date.getDate())
  const baseJdn = 2415021 // 1900-01-01
  const offset = jdn - baseJdn
  const ganIndex = ((offset % 10) + 10) % 10 // 甲=0 on base date
  const zhiIndex = (((offset + 10) % 12) + 12) % 12 // 戌=10 on base date → offset+10
  return { gan: TIAN_GAN[ganIndex], zhi: DI_ZHI[zhiIndex] }
}

/**
 * 计算月建（地支）
 * 基于节气的近似算法：
 *   小寒(~1/6)→丑月, 立春(~2/4)→寅月, 惊蛰(~3/6)→卯月,
 *   清明(~4/5)→辰月, 立夏(~5/6)→巳月, 芒种(~6/6)→午月,
 *   小暑(~7/7)→未月, 立秋(~8/8)→申月, 白露(~9/8)→酉月,
 *   寒露(~10/8)→戌月, 立冬(~11/7)→亥月, 大雪(~12/7)→子月
 */
export function getMonthZhi(date: Date): DiZhi {
  const m = date.getMonth() + 1
  const d = date.getDate()

  // 每月节气的近似日期（节气入月分界点）
  const boundaries: ReadonlyArray<{ month: number; day: number; zhi: DiZhi }> = [
    { month: 1, day: 6, zhi: '丑' },
    { month: 2, day: 4, zhi: '寅' },
    { month: 3, day: 6, zhi: '卯' },
    { month: 4, day: 5, zhi: '辰' },
    { month: 5, day: 6, zhi: '巳' },
    { month: 6, day: 6, zhi: '午' },
    { month: 7, day: 7, zhi: '未' },
    { month: 8, day: 8, zhi: '申' },
    { month: 9, day: 8, zhi: '酉' },
    { month: 10, day: 8, zhi: '戌' },
    { month: 11, day: 7, zhi: '亥' },
    { month: 12, day: 7, zhi: '子' },
  ]

  // 从后往前找，找到当前日期所在的月建
  for (let i = boundaries.length - 1; i >= 0; i--) {
    const b = boundaries[i]
    if (m > b.month || (m === b.month && d >= b.day)) {
      return b.zhi
    }
  }
  // 1月6日之前属于上年的子月
  return '子'
}

/** 计算当前时辰 */
export function getShiChen(date: Date): { zhi: DiZhi; name: string } {
  const hour = date.getHours()
  const index = Math.floor(((hour + 1) % 24) / 2)
  const names = [
    '子时(23-01)', '丑时(01-03)', '寅时(03-05)', '卯时(05-07)',
    '辰时(07-09)', '巳时(09-11)', '午时(11-13)', '未时(13-15)',
    '申时(15-17)', '酉时(17-19)', '戌时(19-21)', '亥时(21-23)',
  ]
  return { zhi: DI_ZHI[index], name: names[index] }
}

/** 获取完整的占卜时间信息 */
export function getDivinationTime(date: Date = new Date()): {
  dayGan: TianGan
  dayZhi: DiZhi
  monthZhi: DiZhi
  shiChen: DiZhi
  shiChenName: string
  display: string
} {
  const { gan, zhi } = getDayGanZhi(date)
  const monthZhi = getMonthZhi(date)
  const shiChen = getShiChen(date)

  const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  const display = `${dateStr} ${shiChen.name} · ${gan}${zhi}日 ${monthZhi}月`

  return {
    dayGan: gan,
    dayZhi: zhi,
    monthZhi,
    shiChen: shiChen.zhi,
    shiChenName: shiChen.name,
    display,
  }
}
