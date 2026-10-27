import React, { useId } from 'react';
import { AlertCircle, FileDown, LoaderCircle } from 'lucide-react';
import type { NamingSession, StudioSettings } from '../shared/types';
import { getReportCandidates } from '../shared/workflow';
import { formatSessionCreatedAt, sessionBatchLabel } from '../shared/session-catalog';
import { parentNameReference } from '../domain/naming';
import { sessionFactStatus } from '../shared/candidate-facts';
import { sessionNamingRuleStatus } from '../shared/naming-rule-status';
import { birthTimeBasisLabel, birthTimeClockSummary, birthTimeLongitudeText, birthTimePolicyText } from '../shared/birth-time-presentation';
import { Modal } from './Modal';
import {SavedProjectNamingUseView} from './SavedProjectNamingUseView';
import './delivery.css';

export interface ExportConfirmationProps {
  session: NamingSession;
  /** The persisted brand, never an unsaved settings draft. */
  settings: StudioSettings;
  batchLabel?: string;
  reportDirty: boolean;
  reviewNote?: string;
  settingsDirty?: boolean;
  busy: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function ExportConfirmation({ session, settings, batchLabel = sessionBatchLabel(session), reportDirty, reviewNote = session.reviewNote, settingsDirty = false, busy, error, onClose, onConfirm }: ExportConfirmationProps) {
  const sectionId = useId();
  const candidates = getReportCandidates(session);
  const favoriteCount = session.candidates.filter(candidate => candidate.favorite).length;
  const pendingNumerology = candidates.filter(candidate => session.preferences.numerology && candidate.numerology?.status !== 'complete').length;
  const pendingYue = candidates.filter(candidate => session.preferences.yueReading && candidate.yueReading?.status !== 'confirmed').length;
  const termMatches=candidates.filter(candidate=>candidate.yueHomophones?.matches.length).length;
  const profile = session.profile;
  const parents = parentNameReference(profile, session.preferences);
  const factState = sessionFactStatus(session);
  const namingState = sessionNamingRuleStatus(session);
  const monthMethod = session.analysis.bazi.evidence?.monthAuthority;
  const seasonalMethod = session.analysis.bazi.evidence?.monthlySeasonal;
  const monthMethodText = !monthMethod?.methodId ? '本版未记录选表方法，不补入当前默认值' : monthMethod.methodId === 'no-fixed-day/1.0.0' ? '默认：不定日限，未启用固定分日定位' : '已启用：《三命通会》首段分日表（转录参考）';
  const seasonalMethodText = !seasonalMethod ? '本版未记录逐月资料方法，不补入当前默认值' : seasonalMethod.methodId === 'no-monthly/1.0.0' ? '默认：未启用逐月调候资料' : '已启用：《穷通宝鉴》固定电子版（初始取用参考）';
  const birthRecord = `${profile.calendar === 'lunar' ? `农历${profile.leapMonth ? '（闰月）' : ''}` : '公历'} ${profile.birthDate} · ${profile.timeUnknown ? '时刻未知' : profile.birthTime}`;
  const timeBasis = session.analysis.bazi.timeBasis;
  const trimmedReview = reviewNote.trim();
  const close = () => { if (!busy) onClose(); };

  return <Modal title="导出前确认" subtitle="核对本次交付的客户、名单和品牌信息" onClose={close}>
    <div className="export-confirmation" aria-busy={busy}>
      <dl className="export-identity">
        <div><dt>客户</dt><dd>{profile.customerName || '未填写客户称呼'}</dd></div>
        <div><dt>姓氏与性别</dt><dd>{profile.surname} · {profile.gender}</dd></div>
        <div><dt>出生记录</dt><dd>{birthRecord}<small>{profile.timezone} · {profile.birthPlace || '未填写出生地'}</small></dd></div>
        <div><dt>排盘时间取法</dt><dd>{timeBasis ? birthTimeBasisLabel(timeBasis) : '本版未记录换算快照，保留原方案依据'}{timeBasis && <><small>{birthTimeClockSummary(timeBasis)}{timeBasis.basis === 'apparent-solar' ? ` · ${birthTimeLongitudeText(timeBasis.longitude)}` : ''}</small><small>{birthTimePolicyText}</small>{timeBasis.dayStatus === 'uncertain' && <small>日主待定，本项证据暂停；日期候选 {timeBasis.dayCandidates.join('、')}。</small>}</>}</dd></div>
        <div><dt>当前方案</dt><dd><span title={session.id}>{batchLabel}</span><small>{formatSessionCreatedAt(session.createdAt)}（北京时间）</small></dd></div>
      </dl>

      <section className="export-confirm-section" aria-labelledby={`${sectionId}-family-methods`}>
        <h3 id={`${sectionId}-family-methods`}>家庭避字与传统参考方法</h3>
        <dl className="export-identity">
          <div><dt>爸爸姓名</dt><dd>{profile.fatherName || '未填写'}</dd></div>
          <div><dt>妈妈姓名</dt><dd>{profile.motherName || '未填写'}</dd></div>
          <div><dt>父母用字避讳</dt><dd>{session.preferences.avoidParentNames === false ? '未启用' : parents.excluded ? `已启用：避开 ${[...parents.excluded].join('、')}（常见中文姓氏不计入）` : '已启用，尚无可自动识别的避字'}{parents.warnings.length > 0 && <small>{parents.warnings.join('；')}</small>}</dd></div>
          <div><dt>月令参考</dt><dd>{monthMethodText}{monthMethod?.methodId && <small>{monthMethod.methodId} · {monthMethod.status === 'determined' ? '已定位所选表段' : monthMethod.status === 'uncertain' ? '区间待复核' : '未按分日定位'}</small>}</dd></div>
          <div><dt>逐月调候资料</dt><dd>{seasonalMethodText}{seasonalMethod && <small>{seasonalMethod.methodId} · {seasonalMethod.status === 'pending' ? '资料待核对，暂不应用' : seasonalMethod.status === 'not-selected' ? '未选择该资料取法' : '独立参考，需人工复核'}</small>}</dd></div>
        </dl>
        {session.analysis.renCommentary&&<p className="export-notice">已启用任注独立参考 · {session.analysis.renCommentary.profileId}；保留原书例证与未核制化条件，不代表完整格局裁决。</p>}
        {session.preferences.imageryReading&&<p className="export-notice">报告包含“项目文化比较”：用字标签与宝宝原保存盘的位置结构分别列示，保留待定项、方法和来源；不评分、不影响候选顺序。</p>}
        {session.preferences.yueHomophones&&session.preferences.yueHomophones!=='none'&&<p className="export-notice">粤语词汇联想复核：{session.preferences.yueHomophones==='strict'?'严格比较音节及声调':'同时复核忽略声调的匹配'}；本次名单中 {termMatches} 个名字有有限词表匹配。报告保留原词、义项、语境和匹配位置，不作姓名适用性或健康、人格判断。</p>}
        <p className="muted small">以上均取自本方案快照；启用参考不等于已完成调候、司权或合化裁决。</p>
      </section>

      <SavedProjectNamingUseView snapshot={session.analysis.projectNamingUse} sourceSnapshot={session.sourceSnapshot} compact/>
      <section className="export-confirm-section" aria-labelledby={`${sectionId}-fact-status`}>
        <h3 id={`${sectionId}-fact-status`}>{factState.label}</h3>
        <p className={factState.status === 'unverified' ? 'export-notice' : 'muted small'}>{factState.notice}</p>
        <h3>{namingState.label}</h3><p className={namingState.status === 'recorded' ? 'muted small' : 'export-notice'}>{namingState.notice}</p>
      </section>

      <section className="export-confirm-section" aria-labelledby={`${sectionId}-selection`}>
        <div className="export-section-heading"><h3 id={`${sectionId}-selection`}>本次导出名单</h3><span className="tag">{candidates.length} 个名字</span></div>
        <p>有收藏则只导出收藏；无收藏则导出本批全部候选。</p>
        <p className="muted small">本批共 {session.candidates.length} 个候选，已收藏 {favoriteCount} 个。PDF 保留本批生成顺序，不受页面筛选与排序影响。</p>
        <ol className="export-candidate-list" aria-label="PDF 中的名字及顺序">
          {candidates.map(candidate => <li key={candidate.id}><strong>{candidate.fullName}</strong><span>{candidate.pinyin}</span></li>)}
        </ol>
        {pendingNumerology > 0 && <p className="export-notice"><AlertCircle size={16}/><span>名单中有 {pendingNumerology} 个名字的数理字形尚未确认或当前结构不支持。可以继续导出，PDF 将保留对应状态与说明。</span></p>}
        {pendingYue > 0 && <p className="export-notice"><AlertCircle size={16}/><span>名单中有 {pendingYue} 个名字的粤语读音尚未全部确认。PDF 会保留待确认状态；{session.preferences.yueHomophones&&session.preferences.yueHomophones!=='none'?'未确认名字暂停词汇复核，其他结果按保存快照输出。':'本项未进行粤语谐音词检查。'}</span></p>}
      </section>

      <section className="export-confirm-section" aria-labelledby={`${sectionId}-review`}>
        <div className="export-section-heading"><h3 id={`${sectionId}-review`}>总体审阅</h3><span className="tag">{reportDirty ? '待保存' : trimmedReview ? '已保存' : '未填写'}</span></div>
        <p className={`export-review-copy ${trimmedReview ? '' : 'muted'}`}>{trimmedReview || '尚未填写总体审阅意见。'}</p>
        {reportDirty && <p className="muted small">确认后先保存当前总体审阅，再导出 PDF；保存失败时保留此窗口供重试。</p>}
      </section>

      <section className="export-confirm-section" aria-labelledby={`${sectionId}-brand`}>
        <h3 id={`${sectionId}-brand`}>报告品牌</h3>
        <div className="export-brand-summary">
          {settings.logoDataUrl && <img src={settings.logoDataUrl} alt="已保存的品牌 Logo"/>}
          <div><strong>{settings.studioName || '知名起名工作室'}</strong>{!settings.studioName && <small>使用默认工作室名称</small>}<p>{settings.contact || '未设置联系方式'}</p><small>{settings.logoDataUrl ? '使用已保存的 Logo' : '未设置 Logo'}</small></div>
        </div>
        {settingsDirty && <p className="export-notice"><AlertCircle size={16}/><span>设置中还有未保存的修改。本次使用上方已保存的品牌；如需应用新品牌，请返回设置保存后再导出。</span></p>}
      </section>

      {error && <p className="inline-error export-failure" role="alert">{error}</p>}
      <div className="export-confirm-actions">
        <button type="button" className="button secondary" disabled={busy} onClick={close}>返回审阅</button>
        <button type="button" className="button primary" disabled={busy || candidates.length === 0} onClick={() => { if (!busy && candidates.length) onConfirm(); }}>{busy ? <LoaderCircle className="spin" size={16}/> : <FileDown size={16}/>} {busy ? '正在保存并导出…' : '确认并导出 PDF'}</button>
      </div>
      {busy && <p className="muted small export-busy" role="status">正在准备报告，请完成文件保存窗口中的操作。</p>}
    </div>
  </Modal>;
}
