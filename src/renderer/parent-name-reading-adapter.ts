import type {ParentNameReadings,ParentNameReadingConfirmIntent,ParentNamePhoneticResult} from '../shared/parent-name-phonetics';
import type {ParentReadingIntent} from './family-reading-state';
import type {ParentReadingSummary} from './ParentNameReadingsPanel';
import type {ParentPhoneticNoticeRow} from './ParentNamePhoneticsNotice';

/** Drops UI-only derived givenName. Main authenticates dictionary options and tokens. */
export function parentReadingIntentForService(intent:ParentReadingIntent):ParentNameReadingConfirmIntent {
 if([...intent.fullName].slice(intent.surnameLength).join('')!==intent.givenName)throw Error('给名草稿与原姓名分界不一致，请重新确认。');
 return structuredClone({role:intent.role,fullName:intent.fullName,surnameLength:intent.surnameLength,readings:intent.readings});
}
/** Presentation only, never a second saved format or a confirmation validator. */
export function parentReadingsForPanel(value:ParentNameReadings,persistence:ParentReadingSummary['persistence']):ParentReadingSummary[] {
 return value.map(record=>({role:record.role,fullName:record.fullName,surnameLength:record.surnameLength,givenName:record.givenName,persistence,readings:record.readings.map(row=>({position:row.index,char:row.char,pinyin:row.token,origin:row.origin}))}));
}
export function parentPhoneticsForNotice(result:ParentNamePhoneticResult):ParentPhoneticNoticeRow[] {
 return result.comparisons.map(row=>({role:row.role,fullName:row.parentFullName,...(row.parentGivenName!==null?{givenName:row.parentGivenName}:{}),status:row.status==='no-match'?'not-matched':row.status,reason:row.reason,...(row.parentTokens?{parentReading:row.parentTokens.join(' ')}:{}),...(row.actualChildTokens?{candidateReading:row.actualChildTokens.join(' ')}:{}),...(row.comparison?{matchKind:row.comparison==='exact'?'same-tones' as const:'tone-difference' as const}:{})}));
}
