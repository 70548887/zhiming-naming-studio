import type { NamingSession } from './types';
import { resolveSessionNamingRulesVersion, NAMING_RULE_V5_VERSION, NAMING_RULE_V6_VERSION, NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION } from './naming-rules';

/** Reports the saved scheme's rule boundary; never assigns today's rules to a historical scheme. */
export function sessionNamingRuleStatus(session: Pick<NamingSession, 'dataVersion'|'sourceSnapshot'|'namingRules'>): {status:'recorded'|'legacy'|'invalid';label:string;notice:string} {
  try {
    const version=resolveSessionNamingRulesVersion(session);
    if(version===NAMING_RULE_V71_VERSION)return{status:'recorded',label:'逐字项目说明与整名采用义分别保存',notice:'本版沿用7.0选名、出处与排序；新增40条说明仅按已审字音与实际字位提供独立项目取意。词典原义、项目说明和家庭期许分列，不表示完整姓名已获批准，不增加语义、行业或其他排序分。规则 '+version+'；历史方案按各自保存版本保留。'};
    if(version===NAMING_RULE_V7_VERSION) return {status:'recorded',label:'逐字释义与整名出处分别核对',notice:'本版新增304字逐字说明仅供展示，不额外增加语义、主题或行业评分；需要人工确认、待审及暂不推荐的用途不会自动转为家庭期许。完整名字的出处另按原文、摘录和义项独立核对。词典原义、项目取意与家庭期许分别保留，规则 '+version+'；本项不表示每个字义或名字均已通过人工审定。'};
    if(version===NAMING_RULE_V6_VERSION) return {status:'recorded',label:'命名释义已绑定适用读音',notice:'项目释义、组合寓意与语义加分仅用于登记的读音、字典词条及已审用途；词条以本方案生成时保存的字库为准。其他读音保留对应字典释义或参照并提示待审。逐名出处仍须匹配原文、摘录和义项。规则 '+version+'；本项不表示每个字义或名字均已通过人工审定。'};
    if(version===NAMING_RULE_V5_VERSION) return {status:'recorded',label:'命名释义已绑定适用读音',notice:'项目释义、组合寓意与语义加分仅用于登记的读音和字典词条；逐名出处还须匹配所审原文、摘录与义项。其他读音保留对应字典释义并提示待审。规则 '+version+'；本项不表示每个字义或名字均已通过人工审定。'};
    if(version) return {status:'recorded',label:'命名释义已绑定适用读音',notice:'项目释义、组合寓意与语义加分仅用于规则已登记的读音；其他读音保留对应字典释义并提示待审。规则 '+version+'；本项不表示每个字义或名字均已通过人工审定。'};
    return {status:'legacy',label:'历史方案保留原解释与评分',notice:'本方案未记录独立命名规则版本，未按新规则重算。多音字的命名义请结合所选读音复核；重新生成方案才采用当前规则。'};
  } catch {
    return {status:'invalid',label:'命名释义规则记录不一致',notice:'规则版本、方案数据或来源登记不一致，请重新读取原方案后核对。当前页面不补造版本或重算解释。'};
  }
}
