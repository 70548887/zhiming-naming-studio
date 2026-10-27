import type { BirthTimeAnalysis } from './types';

export const birthTimeBasisLabel = (analysis: BirthTimeAnalysis): string => analysis.basis === 'apparent-solar' ? '真太阳时' : '民用时间';
export const birthClockText = (value: string): string => value.replace('T', ' ');
export const birthTimeLongitudeText = (longitude: number | null): string => longitude === null ? '未使用经度' : longitude === 0 ? '0°（本初子午线）' : `${longitude > 0 ? '东经' : '西经'} ${Math.abs(longitude)}°`;
export const birthTimeMinutesText = (minutes: number): string => `${minutes > 0 ? '+' : ''}${Number(minutes.toFixed(4))} 分钟`;
export const birthTimeDayText = (analysis: BirthTimeAnalysis): string => analysis.dayStatus === 'uncertain' ? `日主待定；日期候选 ${analysis.dayCandidates.join('、')}` : `午夜换日；日期 ${analysis.dayCandidates.join('、')}`;
export const birthTimeClockSummary = (analysis: BirthTimeAnalysis): string => analysis.calculationDateTime ? birthClockText(analysis.calculationDateTime) : `${birthClockText(analysis.calculationInterval.start)} 至 ${birthClockText(analysis.calculationInterval.end)}（区间末秒包含）`;
export const birthTimeOriginalSummary = (analysis: BirthTimeAnalysis): string => `${analysis.civilDate} ${analysis.civilTime ?? '出生时刻未知'}`;
export const birthTimePolicyText = '八字与奇门的日、时干支按所选钟表；年、月及节气按原出生瞬间。生肖与农历保留原民用出生记录。';
