import type { NamingSession } from './types';

export interface SessionFilters {
  query: string;
  customerId: string;
  surname: string;
  dateFrom: string;
  dateTo: string;
  favorite: 'all' | 'has' | 'none';
  sort: 'newest' | 'oldest';
}

export const DEFAULT_SESSION_FILTERS: Readonly<SessionFilters> = {
  query: '', customerId: '', surname: '', dateFrom: '', dateTo: '', favorite: 'all', sort: 'newest',
};

const shanghaiDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

function dateParts(createdAt: string): Record<string, string> | null {
  const date = new Date(createdAt);
  if (!Number.isFinite(date.getTime())) return null;
  return Object.fromEntries(shanghaiDate.formatToParts(date).map(part => [part.type, part.value]));
}

/** Dates in the catalogue always mean the local creation date in Shanghai, not the host timezone. */
export function sessionCreationDay(createdAt: string): string | null {
  const parts = dateParts(createdAt);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : null;
}

export function formatSessionCreatedAt(createdAt: string): string {
  const parts = dateParts(createdAt);
  return parts ? `${parts.year}年${parts.month}月${parts.day}日 ${parts.hour}:${parts.minute}:${parts.second}` : '创建时间未记录';
}

/** The saved ID is stable across filtering, sorting, review edits, backup and restore. */
export function sessionBatchLabel(session: Pick<NamingSession, 'id'>): string {
  return `批次 ${session.id.slice(-8)}`;
}

export function sessionReportFilename(session: Pick<NamingSession, 'id' | 'profile'>): string {
  return `${session.profile.surname}姓-${sessionBatchLabel(session)}-命名方案.pdf`
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_');
}

export function sessionCustomerId(session: NamingSession): string {
  return session.profileId || session.profile.id;
}

export function sessionFavoriteCount(session: NamingSession): number {
  return session.candidates.filter(candidate => candidate.favorite).length;
}

function normalized(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('zh-CN');
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function validateSessionFilters(filters: Pick<SessionFilters, 'dateFrom' | 'dateTo'>): string | undefined {
  if (filters.dateFrom && !validDate(filters.dateFrom)) return '开始日期无效，请输入完整的年月日。';
  if (filters.dateTo && !validDate(filters.dateTo)) return '结束日期无效，请输入完整的年月日。';
  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) return '开始日期不能晚于结束日期。';
  return undefined;
}

/** Returns a new display array. Invalid date filters must be shown to the user before applying. */
export function filterSessions(sessions: readonly NamingSession[], filters: SessionFilters): NamingSession[] {
  const error = validateSessionFilters(filters);
  if (error) throw new RangeError(error);
  const query = normalized(filters.query);
  const surname = normalized(filters.surname);
  return sessions.filter(session => {
    if (filters.customerId && sessionCustomerId(session) !== filters.customerId) return false;
    if (surname && normalized(session.profile.surname) !== surname) return false;
    const favorites = sessionFavoriteCount(session);
    if (filters.favorite === 'has' && !favorites) return false;
    if (filters.favorite === 'none' && favorites) return false;
    if (filters.dateFrom || filters.dateTo) {
      const day = sessionCreationDay(session.createdAt);
      if (!day || (filters.dateFrom && day < filters.dateFrom) || (filters.dateTo && day > filters.dateTo)) return false;
    }
    if (query) {
      const text = [session.profile.customerName, session.profile.surname, session.profile.fatherName || '',
        session.profile.motherName || '', ...session.candidates.map(candidate => candidate.fullName)].join('\n');
      if (!normalized(text).includes(query)) return false;
    }
    return true;
  }).sort((a, b) => {
    const aTime = Date.parse(a.createdAt), bTime = Date.parse(b.createdAt);
    const aValid = Number.isFinite(aTime), bValid = Number.isFinite(bTime);
    if (aValid !== bValid) return aValid ? -1 : 1;
    const order = aValid ? (filters.sort === 'oldest' ? aTime - bTime : bTime - aTime) : 0;
    return order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  });
}

/** Customer choices come from stored snapshots even when a live customer record no longer exists. */
export function sessionCustomerOptions(sessions: readonly NamingSession[]): { id: string; label: string }[] {
  const customers = new Map<string, string>();
  for (const session of filterSessions(sessions, { ...DEFAULT_SESSION_FILTERS })) {
    const id = sessionCustomerId(session);
    if (!customers.has(id)) customers.set(id, session.profile.customerName.trim() || `${session.profile.surname}姓宝宝`);
  }
  const counts = new Map<string, number>();
  for (const label of customers.values()) counts.set(label, (counts.get(label) || 0) + 1);
  return [...customers].map(([id, label]) => ({ id, label: (counts.get(label) || 0) > 1 ? `${label} · ${id.slice(-6)}` : label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN') || a.id.localeCompare(b.id));
}
