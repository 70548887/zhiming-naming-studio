#!/usr/bin/env node
// 周易占卜 - 命令行界面

import * as readline from 'readline'
import { coinMethod, dayanMethod, meihuaNumberMethod } from '../core/divination.js'
import { analyzeHexagram, identifyHexagram, yaoToYinYang } from '../core/analysis.js'
import { BINARY_TO_HEXAGRAM } from '../data/hexagrams.js'
import { getDivinationTime } from '../core/calendar.js'
import type { GuaName } from '../types.js'

// ===== ANSI 颜色 =====

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  white: '\x1b[37m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
  boldYellow: '\x1b[1;33m',
  boldCyan: '\x1b[1;36m',
  boldRed: '\x1b[1;31m',
  boldGreen: '\x1b[1;32m',
  boldMagenta: '\x1b[1;35m',
  boldWhite: '\x1b[1;37m',
}

// ===== 工具函数 =====

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ===== 启动画面 =====

function printBanner(): void {
  console.log('')
  console.log(
    `${c.boldYellow}   ███████╗${c.reset}  ${c.boldYellow}██╗  ██╗${c.reset}  ${c.boldYellow} ██████╗${c.reset}  ${c.boldYellow}██╗   ██╗${c.reset} ${c.boldYellow}██╗   ██╗${c.reset} ${c.boldYellow}██╗${c.reset}`
  )
  console.log(
    `${c.boldYellow}   ╚══███╔╝${c.reset}  ${c.boldYellow}██║  ██║${c.reset}  ${c.boldYellow}██╔═══██╗${c.reset} ${c.boldYellow}██║   ██║${c.reset} ${c.boldYellow}╚██╗ ██╔╝${c.reset} ${c.boldYellow}██║${c.reset}`
  )
  console.log(
    `${c.boldYellow}     ███╔╝${c.reset}   ${c.boldYellow}███████║${c.reset}  ${c.boldYellow}██║   ██║${c.reset} ${c.boldYellow}██║   ██║${c.reset}  ${c.boldYellow}╚████╔╝${c.reset}  ${c.boldYellow}██║${c.reset}`
  )
  console.log(
    `${c.boldYellow}    ███╔╝${c.reset}    ${c.boldYellow}██╔══██║${c.reset}  ${c.boldYellow}██║   ██║${c.reset} ${c.boldYellow}██║   ██║${c.reset}   ${c.boldYellow}╚██╔╝${c.reset}   ${c.boldYellow}██║${c.reset}`
  )
  console.log(
    `${c.boldYellow}   ███████╗${c.reset} ${c.boldYellow}██║  ██║${c.reset}  ${c.boldYellow}╚██████╔╝${c.reset} ${c.boldYellow}╚██████╔╝${c.reset}    ${c.boldYellow}██║${c.reset}    ${c.boldYellow}██║${c.reset}`
  )
  console.log(
    `${c.yellow}   ╚══════╝ ╚═╝  ╚═╝   ╚═════╝   ╚═════╝     ╚═╝    ╚═╝${c.reset}`
  )
  console.log('')
  console.log(
    `${c.dim}   ☰ 乾  ☱ 兑  ☲ 离  ☳ 震  ☴ 巽  ☵ 坎  ☶ 艮  ☷ 坤${c.reset}`
  )
  console.log('')
  console.log(
    `${c.boldWhite}              周 易 占 卜 系 统${c.reset}`
  )
  console.log(
    `${c.dim}          Yi Jing Divination System${c.reset}`
  )
  console.log('')
  console.log(
    `${c.cyan}   「易有太极，是生两仪，两仪生四象，四象生八卦。」${c.reset}`
  )
  console.log(
    `${c.dim}                             ——《系辞上传》${c.reset}`
  )
  console.log('')
  console.log(
    `${c.gray}   本系统基于传统易学规则，供参考学习之用。${c.reset}`
  )
  console.log(
    `${c.gray}   不诚不占，不义不占，不疑不占。${c.reset}`
  )
  console.log('')
  console.log(`${c.dim}${'─'.repeat(56)}${c.reset}`)
}

// ===== 卦象渲染 =====

function renderYao(yinyang: number, changing: boolean, position: number): string {
  const posNames = ['初', '二', '三', '四', '五', '上']
  const posName = posNames[position - 1]
  if (yinyang === 1) {
    return changing
      ? `  ${c.boldRed}${posName}  ━━━━━━━━━  ○  (老阳，变)${c.reset}`
      : `  ${posName}  ${c.boldWhite}━━━━━━━━━${c.reset}     ${c.dim}(少阳)${c.reset}`
  }
  return changing
    ? `  ${c.boldRed}${posName}  ━━━  ━━━  ×  (老阴，变)${c.reset}`
    : `  ${posName}  ${c.white}━━━  ━━━${c.reset}     ${c.dim}(少阴)${c.reset}`
}

function renderHexagram(yaoValues: readonly number[]): string {
  const lines: string[] = []
  for (let i = 5; i >= 0; i--) {
    const v = yaoValues[i]
    const yinyang = v === 7 || v === 9 ? 1 : 0
    const changing = v === 6 || v === 9
    lines.push(renderYao(yinyang, changing, i + 1))
  }
  return lines.join('\n')
}

// ===== 主流程 =====

async function main(): Promise<void> {
  printBanner()

  // 1. 输入问题
  console.log('')
  console.log(`  ${c.boldCyan}请静心思考您所问之事...${c.reset}`)
  const question = await ask(`  ${c.boldWhite}您的问题: ${c.reset}`)
  if (!question.trim()) {
    console.log(`  ${c.red}需要明确您所问之事。${c.reset}`)
    rl.close()
    return
  }

  // 2. 选择问事类型
  console.log('')
  console.log(`  ${c.boldCyan}请选择问事类型:${c.reset}`)
  const types = ['事业', '财运', '婚姻', '健康', '考试', '出行', '诉讼', '其他']
  types.forEach((t, i) => console.log(`    ${c.yellow}${i + 1}.${c.reset} ${t}`))
  const typeChoice = await ask(`  ${c.boldWhite}请输入编号 (1-8): ${c.reset}`)
  const questionType = types[parseInt(typeChoice) - 1] || '其他'

  // 3. 选择起卦方式
  console.log('')
  console.log(`  ${c.boldCyan}请选择起卦方式:${c.reset}`)
  console.log(`    ${c.yellow}1.${c.reset} 大衍筮法 ${c.dim}（推荐，传统正统方法）${c.reset}`)
  console.log(`    ${c.yellow}2.${c.reset} 铜钱法 ${c.dim}（简便快捷）${c.reset}`)
  console.log(`    ${c.yellow}3.${c.reset} 梅花易数 ${c.dim}（数字起卦）${c.reset}`)
  const methodChoice = await ask(`  ${c.boldWhite}请输入编号 (1-3): ${c.reset}`)

  let result
  console.log('')

  switch (methodChoice) {
    case '1':
      console.log(`  ${c.dim}大衍之数五十，其用四十有九...${c.reset}`)
      await sleep(500)
      console.log(`  ${c.dim}分二以象两，挂一以象三...${c.reset}`)
      await sleep(500)
      console.log(`  ${c.dim}揲之以四以象四时...${c.reset}`)
      await sleep(500)
      console.log(`  ${c.cyan}正在进行十八变...${c.reset}`)
      await sleep(800)
      result = dayanMethod()
      break
    case '3': {
      const num1str = await ask(`  ${c.boldWhite}请输入第一个数字: ${c.reset}`)
      const num2str = await ask(`  ${c.boldWhite}请输入第二个数字: ${c.reset}`)
      const n1 = parseInt(num1str, 10) || 1
      const n2 = parseInt(num2str, 10) || 1
      result = meihuaNumberMethod(n1, n2)
      break
    }
    default:
      console.log(`  ${c.dim}三枚铜钱，投掷六次...${c.reset}`)
      for (let i = 1; i <= 6; i++) {
        await sleep(300)
        process.stdout.write(`  ${c.cyan}第${i}次投掷...${c.reset}`)
        await sleep(200)
      }
      console.log('')
      result = coinMethod()
      break
  }

  console.log('')
  console.log(`  ${c.boldGreen}起卦完成。${c.reset}`)
  console.log('')
  console.log(`${c.yellow}${'═'.repeat(56)}${c.reset}`)

  // 4. 分析 — 使用当前真实日干支
  const timeInfo = getDivinationTime()
  console.log('')
  console.log(`  ${c.dim}占卜时间: ${timeInfo.display}${c.reset}`)

  // 先识别卦象以获取世应爻位
  const preYinYangs = result.yaoValues.map(yaoToYinYang)
  const preHexInfo = identifyHexagram(preYinYangs)
  const preHex = BINARY_TO_HEXAGRAM[preHexInfo.binary]
  const worldLine = preHex?.worldLine ?? 6
  const responseLine = preHex?.responseLine ?? 3

  const analysis = analyzeHexagram(
    result, timeInfo.dayGan, timeInfo.dayZhi, timeInfo.monthZhi,
    worldLine, responseLine, questionType as import('../types.js').QuestionType, question,
    preHex?.palace as GuaName | undefined
  )
  const originalHex = BINARY_TO_HEXAGRAM[analysis.originalBinary]
  const changedHex = analysis.changedBinary ? BINARY_TO_HEXAGRAM[analysis.changedBinary] : null
  const mutualHex = BINARY_TO_HEXAGRAM[analysis.mutualBinary]

  // 5. 第一层：卦象
  console.log('')
  console.log(`  ${c.boldMagenta}【第一层：卦象】${c.reset}`)
  console.log('')

  if (originalHex) {
    console.log(`  ${c.boldWhite}本卦: ${originalHex.fullName}${c.reset} ${c.dim}(第${originalHex.number}卦)${c.reset}  ${originalHex.unicode}`)
  } else {
    console.log(`  ${c.boldWhite}本卦: ${analysis.lowerTrigram}下${analysis.upperTrigram}上${c.reset}`)
  }
  console.log('')
  console.log(renderHexagram(result.yaoValues))

  if (changedHex) {
    console.log('')
    console.log(`  ${c.boldWhite}之卦: ${changedHex.fullName}${c.reset} ${c.dim}(第${changedHex.number}卦)${c.reset}  ${changedHex.unicode}`)
  }

  if (mutualHex) {
    console.log(`  ${c.dim}互卦: ${mutualHex.fullName} (第${mutualHex.number}卦)  ${mutualHex.unicode}${c.reset}`)
  }

  console.log('')
  const changingDesc =
    analysis.changingCount > 0
      ? `${c.boldRed}${analysis.changingCount}个${c.reset} (第${analysis.changingLines.join(',')}爻)`
      : `${c.dim}无变爻${c.reset}`
  console.log(`  变爻: ${changingDesc}`)

  // 6. 第二层：装卦解析
  console.log('')
  console.log(`${c.dim}${'─'.repeat(56)}${c.reset}`)
  console.log('')
  console.log(`  ${c.boldMagenta}【第二层：装卦解析】${c.reset}`)
  console.log('')
  console.log(`  ${c.cyan}断卦规则:${c.reset} ${analysis.interpretationRule}`)
  console.log(`  ${c.cyan}应参考:${c.reset} ${analysis.relevantTexts.join('  ')}`)

  console.log('')
  console.log(`  ${c.boldWhite}装卦信息:${c.reset}`)
  console.log(`  ${c.dim}┌──────┬────┬────┬────┬────┬────┬────┐${c.reset}`)
  console.log(`  ${c.dim}│${c.reset} ${c.boldWhite}爻位${c.reset} ${c.dim}│${c.reset}${c.boldWhite}干支${c.reset}${c.dim}│${c.reset} ${c.boldWhite}五行${c.reset} ${c.dim}│${c.reset}${c.boldWhite}六亲${c.reset}${c.dim}│${c.reset}${c.boldWhite}六神${c.reset}${c.dim}│${c.reset}${c.boldWhite}世应${c.reset}${c.dim}│${c.reset}${c.boldWhite}空亡${c.reset}${c.dim}│${c.reset}`)
  console.log(`  ${c.dim}├──────┼────┼────┼────┼────┼────┼────┤${c.reset}`)
  const posNames = ['初', '二', '三', '四', '五', '上']
  for (let i = 5; i >= 0; i--) {
    const yao = analysis.yaoInfos[i]
    const worldResp = yao.isWorld ? `${c.boldYellow}世${c.reset}` : yao.isResponse ? `${c.boldCyan}应${c.reset}` : '  '
    const empty = yao.isEmpty ? `${c.boldRed}空${c.reset}` : '  '
    const changing = yao.changing ? ` ${c.boldRed}动${c.reset}` : ''
    console.log(
      `  ${c.dim}│${c.reset} ${posNames[i]}爻 ${c.dim}│${c.reset}${yao.tianGan}${yao.diZhi}${c.dim}│${c.reset} ${yao.element} ${c.dim}│${c.reset}${yao.liuQin}${c.dim}│${c.reset}${yao.liuShen}${c.dim}│${c.reset} ${worldResp} ${c.dim}│${c.reset} ${empty} ${c.dim}│${c.reset}${changing}`
    )
  }
  console.log(`  ${c.dim}└──────┴────┴────┴────┴────┴────┴────┘${c.reset}`)

  // 7. 第三层：卦理启示
  console.log('')
  console.log(`${c.dim}${'─'.repeat(56)}${c.reset}`)
  console.log('')
  console.log(`  ${c.boldMagenta}【第三层：卦理启示】${c.reset}`)
  console.log('')

  if (originalHex) {
    console.log(`  ${c.boldYellow}▎ ${originalHex.fullName}${c.reset}`)
    console.log(`  ${c.cyan}卦辞:${c.reset} ${originalHex.guaCi}`)
    console.log(`  ${c.dim}${originalHex.guaCiTranslation}${c.reset}`)
    console.log(`  ${c.cyan}大象:${c.reset} ${originalHex.daXiang}`)
    console.log('')

    // 根据变爻规则显示相关爻辞
    if (analysis.changingCount === 0) {
      console.log(`  ${c.dim}无变爻，以卦辞断。${c.reset}`)
    } else if (analysis.changingCount >= 1 && analysis.changingCount <= 2) {
      // 看本卦变爻爻辞
      for (const line of analysis.changingLines) {
        const yaoText = originalHex.yaoTexts[line - 1]
        if (yaoText) {
          console.log(`  ${c.boldYellow}▎ ${yaoText.position}${c.reset}`)
          console.log(`  ${c.cyan}爻辞:${c.reset} ${yaoText.text}`)
          console.log(`  ${c.dim}${yaoText.translation}${c.reset}`)
          console.log('')
        }
      }
    } else if (analysis.changingCount === 3) {
      console.log(`  ${c.dim}三爻变，本卦卦辞与之卦卦辞参看，以本卦卦辞为主。${c.reset}`)
    } else if (analysis.changingCount >= 4 && analysis.changingCount <= 5) {
      // 看之卦不变爻的爻辞
      if (changedHex) {
        const allLines = [1, 2, 3, 4, 5, 6]
        const unchanging = allLines.filter((l) => !analysis.changingLines.includes(l))
        for (const line of unchanging) {
          const yaoText = changedHex.yaoTexts[line - 1]
          if (yaoText) {
            console.log(`  ${c.boldYellow}▎ 之卦 ${yaoText.position}${c.reset}`)
            console.log(`  ${c.cyan}爻辞:${c.reset} ${yaoText.text}`)
            console.log(`  ${c.dim}${yaoText.translation}${c.reset}`)
            console.log('')
          }
        }
      }
    } else if (analysis.changingCount === 6) {
      if (originalHex.yongText) {
        console.log(`  ${c.cyan}用辞:${c.reset} ${originalHex.yongText}`)
      }
      console.log(`  ${c.dim}六爻皆变，以之卦卦辞断。${c.reset}`)
    }
  }

  if (changedHex) {
    console.log(`  ${c.boldYellow}▎ 之卦 · ${changedHex.fullName}${c.reset}`)
    console.log(`  ${c.cyan}卦辞:${c.reset} ${changedHex.guaCi}`)
    console.log(`  ${c.dim}${changedHex.guaCiTranslation}${c.reset}`)
    console.log('')
  }

  // 免责声明
  console.log(`${c.dim}${'─'.repeat(56)}${c.reset}`)
  console.log('')
  console.log(`  ${c.dim}※ 本分析基于传统易学规则，供参考学习之用，${c.reset}`)
  console.log(`  ${c.dim}  不构成任何具体行动建议。重要决定请依据自身理性判断。${c.reset}`)
  console.log('')

  rl.close()
}

main().catch(console.error)
