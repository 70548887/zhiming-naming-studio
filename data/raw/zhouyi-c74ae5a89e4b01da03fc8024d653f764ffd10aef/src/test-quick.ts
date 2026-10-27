// 快速功能验证

import { coinMethod, dayanMethod, meihuaNumberMethod } from './core/divination.js'
import { analyzeHexagram, identifyHexagram, yaoToYinYang } from './core/analysis.js'
import { HEXAGRAMS, BINARY_TO_HEXAGRAM } from './data/hexagrams.js'
import { getDivinationTime } from './core/calendar.js'
import type { GuaName } from './types.js'

console.log('=== 周易占卜系统 功能验证 ===\n')

// 1. 验证数据库
console.log(`六十四卦数据库: ${HEXAGRAMS.length} 卦已加载`)
console.log(`Binary索引: ${Object.keys(BINARY_TO_HEXAGRAM).length} 条映射\n`)

// 2. 铜钱法测试
console.log('--- 铜钱法起卦 ---')
const coinResult = coinMethod()
console.log(`爻值: [${coinResult.yaoValues.join(', ')}]`)
const coinYinYangs = coinResult.yaoValues.map(yaoToYinYang)
const coinHex = identifyHexagram(coinYinYangs)
console.log(`本卦: ${coinHex.lower}下${coinHex.upper}上 (binary: ${coinHex.binary})`)
const foundHex = BINARY_TO_HEXAGRAM[coinHex.binary]
if (foundHex) {
  console.log(`卦名: ${foundHex.fullName} (第${foundHex.number}卦)`)
  console.log(`卦辞: ${foundHex.guaCi}`)
  console.log(`大象: ${foundHex.daXiang}`)
} else {
  console.log(`警告: binary ${coinHex.binary} 未在数据库中找到`)
}

// 3. 大衍筮法测试
console.log('\n--- 大衍筮法起卦 ---')
const dayanResult = dayanMethod()
console.log(`爻值: [${dayanResult.yaoValues.join(', ')}]`)
const dayanYinYangs = dayanResult.yaoValues.map(yaoToYinYang)
const dayanHex = identifyHexagram(dayanYinYangs)
const dayanFound = BINARY_TO_HEXAGRAM[dayanHex.binary]
if (dayanFound) {
  console.log(`卦名: ${dayanFound.fullName} (第${dayanFound.number}卦)`)
  console.log(`卦辞: ${dayanFound.guaCi}`)
}

// 4. 装卦分析测试（使用真实日干支）
console.log('\n--- 装卦分析 ---')
const timeInfo = getDivinationTime()
console.log(`占卜时间: ${timeInfo.display}`)
const coinWorldLine = foundHex?.worldLine ?? 6
const coinResponseLine = foundHex?.responseLine ?? 3
const analysis = analyzeHexagram(coinResult, timeInfo.dayGan, timeInfo.dayZhi, timeInfo.monthZhi, coinWorldLine, coinResponseLine, '事业', '测试事业运势', foundHex?.palace as GuaName | undefined)
console.log(`变爻: ${analysis.changingCount}个 ${analysis.changingLines.length > 0 ? '(第' + analysis.changingLines.join(',') + '爻)' : '(无)'}`)
console.log(`断卦规则: ${analysis.interpretationRule}`)
console.log(`应参考: ${analysis.relevantTexts.join(' ')}`)
console.log('\n装卦表:')
const posNames = ['初', '二', '三', '四', '五', '上']
for (let i = 5; i >= 0; i--) {
  const y = analysis.yaoInfos[i]
  const yy = y.yinyang === 1 ? '阳' : '阴'
  const chg = y.changing ? '动' : '  '
  console.log(`  ${posNames[i]}爻: ${y.tianGan}${y.diZhi} ${y.element} ${y.liuQin} ${y.liuShen} ${chg} ${y.isEmpty ? '空' : '  '}`)
}

// 5. 梅花易数测试
console.log('\n--- 梅花易数 数字起卦 (38, 15) ---')
const meihua = meihuaNumberMethod(38, 15)
console.log(`爻值: [${meihua.yaoValues.join(', ')}]`)
const mhYY = meihua.yaoValues.map(yaoToYinYang)
const mhHex = identifyHexagram(mhYY)
const mhFound = BINARY_TO_HEXAGRAM[mhHex.binary]
if (mhFound) {
  console.log(`卦名: ${mhFound.fullName} (第${mhFound.number}卦)`)
}

// 6. 变卦查找
if (analysis.changedBinary) {
  const changedHex = BINARY_TO_HEXAGRAM[analysis.changedBinary]
  if (changedHex) {
    console.log(`\n之卦: ${changedHex.fullName} (第${changedHex.number}卦)`)
    console.log(`之卦卦辞: ${changedHex.guaCi}`)
  }
}

console.log('\n=== 验证完成 ===')
