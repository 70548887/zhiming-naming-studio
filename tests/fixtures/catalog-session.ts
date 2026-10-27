import type { NamingSession } from '../../src/shared/types';
import { normalizePreferences } from '../../src/shared/workflow';

export function catalogSession(id = 'saved-00000001', createdAt = '2026-10-17T16:00:00Z', profileId = 'customer-1'): NamingSession {
  return {
    id, profileId, createdAt,
    profile: { id: profileId, customerName: '王家长', surname: '王', surnamePinyin: 'wáng', gender: '中性', calendar: 'solar', birthDate: '2026-10-17', leapMonth: false, birthTime: '09:30', timeUnknown: false, birthPlace: '杭州', timezone: 'Asia/Shanghai', notes: '', fatherName: '王志远', motherName: '陈清' },
    preferences: normalizePreferences(),
    analysis: {
      bazi: { solarDate: '', lunarDate: '', zodiac: '马', pillars: [], elements: { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }, favorable: ['水'], unfavorable: [], strength: '', reasons: [], seasonalAdvice: '', warnings: [], version: 'test', ruleDescription: '' },
      qimen: { available: false, dun: '', ju: 0, yuan: '', solarTerm: '', xun: '', chiefStar: '', chiefDoor: '', palaces: [], reasons: [], warnings: [], version: 'test' },
    },
    candidates: [
      { id: `${id}-1`, fullName: '王安', givenName: '安', pinyin: 'wáng ān', style: '清朗', characters: [], meaning: '平安', reason: '推荐理由', traditionalReason: '传统依据', reviewNote: '', favorite: false, citations: [], evaluation: { sound: 3, meaning: 3, simplicity: 3, traditional: 3, distinctiveness: 3 }, warnings: [], origin: 'local', originalMeaning: '平安' },
      { id: `${id}-2`, fullName: '王宁', givenName: '宁', pinyin: 'wáng níng', style: '清朗', characters: [], meaning: '安宁', reason: '推荐理由', traditionalReason: '传统依据', reviewNote: '', favorite: false, citations: [], evaluation: { sound: 3, meaning: 3, simplicity: 3, traditional: 3, distinctiveness: 3 }, warnings: [], origin: 'local', originalMeaning: '安宁' },
    ], reviewNote: '', originalFavorable: ['水'], dataVersion: 'test',
  };
}
