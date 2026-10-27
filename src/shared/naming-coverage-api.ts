import type {CoverageDto} from './naming-coverage';

/** Parameterless read. Only the owning service supplies its actual Store data. */
export interface NamingCoverageApi {
  getNamingCoverage(): Promise<CoverageDto>;
}

export function hasNamingCoverageApi(value: unknown): value is NamingCoverageApi {
  if (!value || typeof value !== 'object') return false;
  const field = Object.getOwnPropertyDescriptor(value, 'getNamingCoverage');
  return !!field && Object.hasOwn(field, 'value') && typeof field.value === 'function';
}
