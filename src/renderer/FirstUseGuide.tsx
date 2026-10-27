import React, { useEffect, useState } from 'react';
import { BookOpen, Check, Database, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { Modal } from './Modal';
import './first-use-guide.css';

export const GUIDE_STORAGE_KEY = 'studio.onboarding.v1';
type GuideStorage = Pick<Storage, 'getItem' | 'setItem'>;
export function readGuidePreference(storage: GuideStorage): { dismissed: boolean; notice: string } {
  try {
    const raw = storage.getItem(GUIDE_STORAGE_KEY);
    if (raw === null) return { dismissed: false, notice: '' };
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 2 && (value as { version?: unknown }).version === 1 && (value as { dismissed?: unknown }).dismissed === true) return { dismissed: true, notice: '' };
    return { dismissed: false, notice: '本机引导状态无效，可以重新阅读或跳过；客户资料未改变。' };
  } catch { return { dismissed: false, notice: '本机引导状态读取失败，当前仍可正常使用应用。' }; }
}
export function dismissGuide(storage: GuideStorage): string {
  try { storage.setItem(GUIDE_STORAGE_KEY, JSON.stringify({ version: 1, dismissed: true }));return ''; }
  catch { return '引导偏好未能保存，重新打开时可能再次出现；客户资料未改变。'; }
}

export function FirstUseGuideDialog({ onClose, onDone, notice = '' }: { onClose: () => void; onDone: () => void; notice?: string }) {
  return <Modal title="欢迎来到知名起名工作室" subtitle="先了解几个关键选择，再从出生资料开始。" onClose={onClose}>
    <div className="first-use-guide">
      <p className="guide-lead">填写宝宝资料、生成候选、核对与审阅，最后交付报告。可以现在跳过，稍后从顶部“使用指南”重新查看。</p>
      <ol className="guide-topics">
        <li><Database size={20}/><div><h3>直接使用本地模式</h3><p>字库、典籍与排盘规则随应用提供。先填姓氏、出生日期、时刻与时区即可开始；不知道时刻时明确选择“暂不清楚”。</p></div></li>
        <li><Sparkles size={20}/><div><h3>AI 是可选的创意辅助</h3><p>无需配置接口也能起名。需要时再到工作室设置填写服务地址、模型与密钥；连网 AI 不替代本地历法、引用校验和人工判断。</p></div></li>
        <li><UsersRound size={20}/><div><h3>父母姓名选填，避字要复核</h3><p>填写完整父母姓名可辅助避开名字用字；常见姓氏不计入。特殊姓氏、异体字或自动拆分不明确时，请在长辈避讳中补充确认。</p></div></li>
        <li><BookOpen size={20}/><div><h3>传统扩展按需选择</h3><p>康熙数理、固定分日定位和逐月调候资料默认不启用。选择后独立显示所用字形、流派、原文与缺失条件，不把不同方法合成唯一喜用神。</p></div></li>
        <li><ShieldCheck size={20}/><div><h3>保存、核对，再交付</h3><p>人工五行先应用为偏好，再保存档案或重新生成。审阅读音、含义、避字和来源后收藏名字；导出前核对客户、名单、方法、品牌及意见状态。</p></div></li>
      </ol>
      <p className="guide-cultural-note">传统分析属于文化参考。名字最终是否适用，由家庭与起名师结合语言、登记和日常使用共同确认。</p>
      {notice && <p className="guide-notice" role="status">{notice}</p>}
      <div className="guide-actions"><button type="button" className="button secondary" onClick={onClose}>先跳过</button><button type="button" className="button primary" onClick={onDone}><Check size={16}/>了解了，开始使用</button></div>
      <p className="guide-device-note">仅在此设备保存“已读/已跳过”偏好，不写入客户资料或客户备份，不替换当前输入。</p>
    </div>
  </Modal>;
}

/** Local-only preference: opening, skipping and replaying never changes customer state. */
export function FirstUseGuide({ request = 0 }: { request?: number }) {
  const [open, setOpen] = useState(false), [notice, setNotice] = useState('');
  useEffect(() => {
    try { const saved = readGuidePreference(window.localStorage);setOpen(!saved.dismissed);setNotice(saved.notice); }
    catch { setOpen(true);setNotice('本机引导偏好不可用，可以跳过后直接使用。'); }
  }, []);
  useEffect(() => { if (request > 0) setOpen(true); }, [request]);
  const close = () => {
    let message = '';
    try { message = dismissGuide(window.localStorage); } catch { message = '引导偏好未能保存，重新打开时可能再次出现；客户资料未改变。'; }
    setNotice(message);setOpen(false);
  };
  return open ? <FirstUseGuideDialog onClose={close} onDone={close} notice={notice}/> : notice ? <p className="guide-storage-feedback" role="status">{notice}</p> : null;
}
