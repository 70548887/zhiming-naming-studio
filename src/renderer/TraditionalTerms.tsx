import React, { useId, useRef } from 'react';
import './traditional-terms.css';

const explanations = {
  '日主': { title: '日主与十神', text: '日主是日柱天干。十神是其他天干相对日主的五行、阴阳关系名称，用于描述所选规则中的关系，不是性格或吉凶结论。' },
  '藏干': { title: '藏干与司权', text: '藏干是所选表记载的地支内天干。表的排列次序不直接表示权重、透出或当日司权；司权须另看所选方法与时间区间。' },
  '透干': { title: '透干', text: '通常指某天干出现在四柱明干；本应用逐条标明核查范围、是否计入日干自身，以及缺失柱如何处理，不能把藏干自动当成已透。' },
  '通根': { title: '通根', text: '通常讨论天干在地支藏干中的根气联系。是否有根、有多强与能否作为取用依据属于不同判断；这里只能按已记录柱位核对，不能代替完整旺弱分析。' },
  '月令': { title: '月令', text: '本应用按十二节交接的实际瞬间划分月支。固定分日表属于另行选择的参考，不等同于民用月份，也不由月支本气直接断定唯一司令。' },
  '扶抑': { title: '扶抑与季节意象', text: '扶抑初筛观察日主相对组成，当前数值为明确标注的项目启发式。粗粒度季节意象、逐月原文参考分别保留，不合成为唯一喜用神。' },
  '调候': { title: '调候', text: '传统上讨论寒暖燥湿等取用。这里的逐月模块只读所选版本的初始取用与已整理条件；原句主辅顺序须连同条件阅读，不代表已完成全章调候裁决。' },
  '合化': { title: '合与合化', text: '五合、六合、三合、三会先核对组合出现；是否化气另需该流派的得令、透引、争合等条件。组合齐全不等于合化成立，冲也不直接等于凶。' },
  '三奇': { title: '三奇', text: '本盘所称三奇为乙、丙、丁。原有三奇入墓模块与后来独立十干墓库表属于分别记录的口径，不能把同名术语当成同一张位置表。' },
  '六仪': { title: '六仪', text: '本盘六仪为戊、己、庚、辛、壬、癸。甲的遁藏关系不表示天盘已经直接显示甲，独立十干核查不会任意用遁仪替换它。' },
  '旬空': { title: '旬空', text: '按本次时柱所在干支旬取两支，再依所选固定地支宫位表标记。它是时柱辅助关系，不等于名字、宫位或生活事件必然落空。' },
  '入墓': { title: '入墓', text: '这是所选传统位置表中的名称，不是现实遭遇的断言。原三奇表乙取坤二，独立十干表乙取戌、乾六；应连同规则版本分别阅读，不混作姓名验局。' },
} as const;
export type TraditionalTerm = keyof typeof explanations;

export function TraditionalTerms({ terms, title = '术语说明', context }: { terms: TraditionalTerm[]; title?: string; context?: string }) {
  const id = useId(), details = useRef<HTMLDetailsElement>(null), summary = useRef<HTMLElement>(null);
  const close = () => { if (details.current) details.current.open = false;summary.current?.focus(); };
  return <details className="traditional-terms" ref={details} aria-labelledby={id} onKeyDown={event => {
    if (event.key === 'Escape' && !event.nativeEvent.isComposing && details.current?.open) { event.preventDefault();event.stopPropagation();close(); }
  }}><summary id={id} ref={summary}>{title}</summary><div className="traditional-terms-body">
    {context && <p className="traditional-terms-context">{context}</p>}
    <dl>{[...new Set(terms)].map(term => <div key={term}><dt>{explanations[term].title}</dt><dd>{explanations[term].text}</dd></div>)}</dl>
    <p className="traditional-terms-boundary">这些短释用于理解所选文化规则。具体结论须看本次保存的来源、规则版本与未核条件；同名术语在不同流派或表中可能不同。</p>
    <button type="button" className="text-button" onClick={close}>收起术语说明</button>
  </div></details>;
}
