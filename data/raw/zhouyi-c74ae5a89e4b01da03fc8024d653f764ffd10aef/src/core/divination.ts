// 周易起卦算法

import type { YaoValue, DivinationResult, DivinationMethod } from '../types.js'

/**
 * 铜钱法起卦
 * 模拟三枚铜钱投掷六次
 * 概率：6=1/8, 7=3/8, 8=3/8, 9=1/8
 */
export function coinMethod(): DivinationResult {
  const yaoValues: YaoValue[] = []
  for (let i = 0; i < 6; i++) {
    let sum = 0
    for (let j = 0; j < 3; j++) {
      // 0=字(阴)=2, 1=背(阳)=3
      sum += Math.random() < 0.5 ? 2 : 3
    }
    yaoValues.push(sum as YaoValue)
  }
  return {
    yaoValues,
    method: 'coin',
    datetime: new Date()
  }
}

/**
 * 大衍筮法起卦
 * 模拟49根蓍草的三变过程，重复六次得六爻
 * 概率：6=1/16, 7=5/16, 8=7/16, 9=3/16
 */
export function dayanMethod(): DivinationResult {
  const yaoValues: YaoValue[] = []
  for (let i = 0; i < 6; i++) {
    yaoValues.push(dayanOneYao())
  }
  return {
    yaoValues,
    method: 'dayan',
    datetime: new Date()
  }
}

function dayanOneYao(): YaoValue {
  let remaining = 49
  // 三变
  remaining = dayanOneChange(remaining)
  remaining = dayanOneChange(remaining)
  remaining = dayanOneChange(remaining)
  // remaining 只可能是 24,28,32,36
  return (remaining / 4) as YaoValue
}

function dayanOneChange(total: number): number {
  // 分二：随机分左右
  const left = Math.floor(Math.random() * (total - 1)) + 1
  let right = total - left

  // 挂一：从右堆取1根
  right -= 1
  const guayi = 1

  // 揲四：左右各除以4取余（余0按4算）
  let rLeft = left % 4
  if (rLeft === 0) rLeft = 4
  let rRight = right % 4
  if (rRight === 0) rRight = 4

  // 归奇
  const guiqi = guayi + rLeft + rRight

  return total - guiqi
}

/**
 * 梅花易数 - 时间起卦
 * 需要传入农历年月日和当前时辰
 */
export function meihuaTimeMethod(
  lunarYear: number,   // 公历年份（用于计算地支）
  lunarMonth: number,  // 农历月
  lunarDay: number,    // 农历日
  hour: number         // 当前小时(0-23)
): DivinationResult {
  // 计算年地支数：(year - 4) % 12 + 1
  const yearNum = ((lunarYear - 4) % 12) || 12

  // 时辰数
  const hourNum = getShichenNumber(hour)

  const sumYMD = yearNum + lunarMonth + lunarDay
  const sumAll = sumYMD + hourNum

  // 上卦 = sumYMD % 8（余0按8）
  const upperIdx = sumYMD % 8 || 8
  // 下卦 = sumAll % 8（余0按8）
  const lowerIdx = sumAll % 8 || 8
  // 动爻 = sumAll % 6（余0按6）
  const movingLine = sumAll % 6 || 6

  // 先天八卦数到卦名映射
  const xiantianMap: Record<number, string> = {
    1: '乾', 2: '兑', 3: '离', 4: '震',
    5: '巽', 6: '坎', 7: '艮', 8: '坤'
  }

  // 八卦binary（从初爻到上爻）
  const guaBinary: Record<string, string> = {
    '乾': '111', '兑': '110', '离': '101', '震': '100',
    '巽': '011', '坎': '010', '艮': '001', '坤': '000'
  }

  const upperName = xiantianMap[upperIdx]
  const lowerName = xiantianMap[lowerIdx]
  const upperBin = guaBinary[upperName]
  const lowerBin = guaBinary[lowerName]

  // 构造六爻值：只有动爻位是变爻（老阳9或老阴6），其余是少阳7或少阴8
  const yaoValues: YaoValue[] = []
  const fullBinary = lowerBin + upperBin  // 从初爻到上爻

  for (let i = 0; i < 6; i++) {
    const isYang = fullBinary[i] === '1'
    if (i + 1 === movingLine) {
      // 动爻位：老阳或老阴
      yaoValues.push(isYang ? 9 : 6)
    } else {
      // 非动爻位：少阳或少阴
      yaoValues.push(isYang ? 7 : 8)
    }
  }

  return {
    yaoValues,
    method: 'meihua_time',
    datetime: new Date()
  }
}

/**
 * 梅花易数 - 数字起卦
 */
export function meihuaNumberMethod(num1: number, num2: number): DivinationResult {
  const upperIdx = num1 % 8 || 8
  const lowerIdx = num2 % 8 || 8
  const movingLine = (num1 + num2) % 6 || 6

  // 同上面一样的逻辑构造yaoValues
  const xiantianMap: Record<number, string> = {
    1: '乾', 2: '兑', 3: '离', 4: '震',
    5: '巽', 6: '坎', 7: '艮', 8: '坤'
  }
  const guaBinary: Record<string, string> = {
    '乾': '111', '兑': '110', '离': '101', '震': '100',
    '巽': '011', '坎': '010', '艮': '001', '坤': '000'
  }

  const upperName = xiantianMap[upperIdx]
  const lowerName = xiantianMap[lowerIdx]
  const fullBinary = guaBinary[lowerName] + guaBinary[upperName]

  const yaoValues: YaoValue[] = []
  for (let i = 0; i < 6; i++) {
    const isYang = fullBinary[i] === '1'
    if (i + 1 === movingLine) {
      yaoValues.push(isYang ? 9 : 6)
    } else {
      yaoValues.push(isYang ? 7 : 8)
    }
  }

  return {
    yaoValues,
    method: 'meihua_number',
    datetime: new Date()
  }
}

/**
 * 手动输入铜钱结果
 * 每次输入3个布尔值（true=阳/背, false=阴/字）
 */
export function manualCoinInput(tosses: boolean[][]): DivinationResult {
  if (tosses.length !== 6) throw new Error('需要6次投掷结果')
  const yaoValues: YaoValue[] = tosses.map(toss => {
    if (toss.length !== 3) throw new Error('每次需要3枚硬币结果')
    const sum = toss.reduce((acc, isYang) => acc + (isYang ? 3 : 2), 0)
    return sum as YaoValue
  })
  return {
    yaoValues,
    method: 'coin',
    datetime: new Date()
  }
}

// 辅助函数：小时转时辰数
function getShichenNumber(hour: number): number {
  if (hour === 23 || hour === 0) return 1  // 子时
  return Math.floor((hour + 1) / 2) + 1
}
