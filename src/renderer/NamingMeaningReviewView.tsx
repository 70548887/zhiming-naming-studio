import {legacyNamingMeaningDisplayState as displayState,recordedCharacterExplanation71} from '../shared/naming-meaning-review-display';
import type {NamingCharacterReview71Result} from '../domain/naming-review-v7.mjs';
import React, { useId } from 'react';
import type { Applicability, AutomaticMeaning, MeaningReview } from '../domain/naming-review-v7.mjs';
import './naming-meaning-review.css';
import {formatNamingReviewWarning} from '../shared/naming-review-warning';

export type NamingMeaningReviewRecord = MeaningReview & {
  automaticSemanticCreditAllowed: false;
  displayOnlyReview: true;
};

/** Values are recorded lookup outputs supplied by the trusted caller, never inferred in this view. */
export interface NamingMeaningReviewRow {
  char: string;
  kind?:'legacy-v7-review'|'character-level-project-explanation';
  characterExplanation?:NamingCharacterReview71Result;
  applicability: Applicability;
  review?: NamingMeaningReviewRecord;
  automaticMeaning?: AutomaticMeaning;
}

export interface NamingMeaningReviewViewProps {
  givenName: string;
  ruleVersion?:'naming-editorial-7.0.0'|'naming-editorial-7.1.0';
  rows?: readonly NamingMeaningReviewRow[];
  recordState?: 'recorded' | 'unrecorded' | 'not-applicable';
}

type DisplayState = 'automatic' | 'manual' | 'pending' | 'not-recommended' | 'outside' | 'not-applicable' | 'unrecorded';
const labels: Record<DisplayState, string> = {
  automatic: '可自动展示', manual: '需人工确认', pending: '待审',
  'not-recommended': '暂不推荐', outside: '本次补充审阅未覆盖',
  'not-applicable': '当前选择不适用', unrecorded: '未记录本版审阅',
};
const messages: Partial<Record<DisplayState, string>> = {
  manual: '限定用途尚需结合完整名字人工核对，未纳入自动释义与逐字家庭期许。',
  pending: '尚有字义、读音或语境问题待核实，未纳入本版自动释义。',
  'not-recommended': '按本次所选读音与原义，暂不作为本版自动命名释义；这不是对汉字本身的吉凶判断。',
  outside: '本次只补充此前待审字。本字的既有释义以方案原记录为准。',
  'not-applicable': '当前所选读音、字义或资料范围不满足本版审阅条件，保留方案原记录。',
  unrecorded: '本条没有可展示的本版审阅记录，保留方案原解释。',
};

/** Presentation consistency checks only; source verification and eligibility stay in main/domain. */

function DictionarySource({ review }: { review: NamingMeaningReviewRecord }) {
  if (!review.binding) return <p className="naming-review-source-empty">本条尚未绑定可采用的独立词典义项，详见审阅理由。</p>;
  const binding = review.binding;
  return <details className="naming-review-source"><summary>词典原义与审阅依据</summary>
    <dl><dt>所选字头与读音</dt><dd>{binding.dictionaryWord} · {binding.pinyin} · {binding.tone} 声</dd>
      <dt>词典原义（保留原文）</dt><dd><blockquote>{binding.dictionarySense}</blockquote></dd>
      <dt>来源</dt><dd>《重编国语辞典修订本》 · {binding.sourceId}</dd>
      <dt>项目审阅理由</dt><dd>{review.reason}</dd></dl>
    <p className="naming-review-license">词典原文：CC BY-ND 3.0 TW；项目审阅说明与家庭期许：CC0 1.0。</p>
  </details>;
}

function CharacterExplanation71({row,char,index}:{row:NamingMeaningReviewRow;char:string;index:number}){
 const note=recordedCharacterExplanation71(row,char);
 return <li className={`naming-review-character naming-review-project71 ${note?'naming-review-character71-ready':'naming-review-not-applicable'}`} data-review-state={note?'character-explanation71':'not-applicable'}>
  <header><strong className="naming-review-char">{char}</strong><span className="naming-review-position">名字第 {index+1} 字</span><span className="naming-review-status">{note?(note.caseId.startsWith('single-meaning-m393:')?'新增逐字参考 · 姓名用途待审':'已审逐字项目说明'):'本位未采用新说明'}</span></header>
  {note?<>
   {note.caseId.startsWith('single-meaning-m393:')&&<p className="naming-review-status-note">源词类：{String(note.originalSourceBinding.definition.type)}；仅展示所选词义，姓名用途仍待语境确认，不改整体寓意或评分。</p>}
   <div className="naming-review-automatic"><h4>逐字项目取意 · 7.1</h4><p>{note.projectMeaning}</p><div className="naming-review-wish"><h4>逐字家庭期许（项目创作）</h4><p>{note.projectWish}</p></div></div>
   <p className="naming-review-status-note">这只是本字已审读音下的独立参考，未评估完整姓名是否适合，不增加任何排序分。</p>
   <details className="naming-review-source"><summary>词典原义与采用范围</summary><dl><dt>所选字头与读音</dt><dd>{note.originalSourceBinding.word} · {note.selectedPinyin} · {note.tone} 声</dd><dt>词典原义（保留原文）</dt><dd><blockquote>{note.dictionaryOriginal}</blockquote></dd><dt>资料身份</dt><dd>《重编国语辞典修订本》 · {note.originalSourceBinding.sourceId}</dd></dl><ul>{note.limits.map((limit,i)=><li key={i}>{limit}</li>)}</ul><p className="naming-review-license">词典原文：CC BY-ND 3.0 TW；项目逐字说明与家庭期许：CC0 1.0。</p></details>
  </>:<p className="naming-review-status-note">保存的本位字音、来源或资料条件未满足7.1说明要求，保留方案原记录，不借用同字其他义项。</p>}
 </li>;
}

/** Read-only display. No local approval button, table lookup, score calculation or historical backfill. */
export function NamingMeaningReviewView({ givenName, rows, recordState, ruleVersion }: NamingMeaningReviewViewProps) {
  const headingId = useId();
  const state = recordState ?? (rows ? 'recorded' : 'unrecorded');
  const chars = [...givenName];
  return <section className="naming-meaning-review detail-section" aria-labelledby={headingId}>
    <h3 id={headingId}>逐字命名释义 · 补充审阅</h3>
    {state === 'unrecorded' ? <p className="naming-review-empty">此方案未记录本版补充审阅，原解释与历史记录保持原样。</p>
      : state === 'not-applicable' ? <p className="naming-review-empty">当前资料范围不适用本版补充审阅，原解释与历史记录保持原样。</p>
      : chars.length === 0 ? <p className="naming-review-empty">尚无可展示的名字。</p>
      : <>
        <p className="naming-review-intro">以下为单字通用取意的独立参考，不代表本名出处采用义；本名选义以完整名字解释和原句为准。所列读音、词典原义与可用范围保留，家庭期许属于项目创作。</p>
        <ol className="naming-review-characters">{chars.map((char, index) => {
          const row = rows?.[index];
          if(ruleVersion==='naming-editorial-7.1.0'&&row?.kind==='character-level-project-explanation')return <CharacterExplanation71 key={`${index}:${char}`} row={row} char={char} index={index}/>;
          const display = displayState(row, char);
          const showReview = ['automatic', 'manual', 'pending', 'not-recommended'].includes(display);
          const review = showReview ? row!.review! : undefined;
          const automatic = display === 'automatic' ? row!.automaticMeaning! : undefined;
          return <li className={`naming-review-character naming-review-${display}`} key={`${index}:${char}`} data-review-state={display}>
            <header><strong className="naming-review-char">{char}</strong><span className="naming-review-position">名字第 {index + 1} 字</span><span className="naming-review-status">{labels[display]}</span></header>
            {messages[display] && <p className="naming-review-status-note">{messages[display]}</p>}
            {automatic && <div className="naming-review-automatic"><h4>单字通用取意（独立参考）</h4><p>{automatic.meaning}</p>
              <div className="naming-review-wish"><h4>逐字家庭期许（项目创作）</h4><p>{automatic.projectWish}</p></div>
            </div>}
            {review && <>
              {display === 'manual' && review.namingMeaning && <div className="naming-review-limited"><h4>限定用途说明（供人工核对）</h4><p>{review.namingMeaning}</p></div>}
              <dl className="naming-review-scope"><dt>审阅范围</dt><dd>{review.scope}</dd><dt>采用条件</dt><dd>{review.applicability.reason}</dd></dl>
              {display !== 'automatic' && <p className="naming-review-reason">审阅理由：{review.reason}</p>}
              {review.warnings.length > 0 && <ul className="naming-review-warnings" aria-label={`“${char}”的审阅提醒`}>{review.warnings.map((warning, warningIndex) => <li key={warningIndex}>{formatNamingReviewWarning(warning)}</li>)}</ul>}
              <DictionarySource review={review} />
            </>}
          </li>;
        })}</ol>
        <p className="naming-review-footnote">本版新增逐字说明仅用于展示，不额外增加语义、主题或行业评分；“需人工确认”也不等同于整名已获认可。</p>
      </>}
  </section>;
}
