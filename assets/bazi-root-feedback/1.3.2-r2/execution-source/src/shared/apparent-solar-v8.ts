/**
 * NOAA/Meeus Julian-century equation of time, evaluated at the actual instant.
 * The returned solar epochs are wall-clock coordinates, never new UTC instants.
 * Source and limitations: data/solar-time-source-lock.json.
 */
export const APPARENT_SOLAR_VERSION = 'noaa-julian-century-apparent-solar/1.0.0';
export const APPARENT_SOLAR_SOURCE_ID = 'solar-time-noaa-julian-century';
export const SOLAR_BOUNDARY_WINDOW_SECONDS = 60;

export interface SolarClock {
  year: number; month: number; day: number;
  hour: number; minute: number; second: number;
}

export interface ApparentSolarInput {
  /** Physical instant, milliseconds since the Unix epoch. */
  instantEpoch: number;
  /** East is positive. Both -180 and +180 are accepted and preserve the dated side. */
  longitudeDegrees: number;
  /** IANA civil zone, used only to explain the correction from the recorded clock. */
  timezone: string;
}

export interface ApparentSolarResult {
  version: typeof APPARENT_SOLAR_VERSION;
  sourceId: typeof APPARENT_SOLAR_SOURCE_ID;
  instantEpoch: number;
  longitudeDegrees: number;
  timezone: string;
  julianDay: number;
  julianCentury: number;
  timezoneOffsetMinutes: number;
  equationOfTimeMinutes: number;
  /** Longitude correction relative to the actual civil offset, including DST once. */
  longitudeCorrectionMinutes: number;
  totalCorrectionMinutes: number;
  /** UTC + longitude*4 minutes; a dated mean-solar wall coordinate. */
  meanSolarEpoch: number;
  /** UTC + longitude*4 minutes + EOT; a dated apparent-solar wall coordinate. */
  apparentSolarEpoch: number;
  civilClock: SolarClock;
  meanSolarClock: SolarClock;
  apparentSolarClock: SolarClock;
  distanceToDayBoundarySeconds: number;
  distanceToHourBoundarySeconds: number;
  nearDayBoundary: boolean;
  nearHourBoundary: boolean;
  warnings: string[];
}

const MINUTE = 60000;
const DAY = 86400000;
const radians = (degrees: number): number => degrees * Math.PI / 180;
const degrees = (angle: number): number => angle * 180 / Math.PI;
const modulo = (value: number, divisor: number): number => ((value % divisor) + divisor) % divisor;

function clockFromCoordinate(epoch: number): SolarClock {
  // Date truncates fractional negative milliseconds toward zero; explicitly floor
  // first so pre-1970 clocks never round forward across a second boundary.
  const date = new Date(Math.floor(epoch));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), hour: date.getUTCHours(), minute: date.getUTCMinutes(), second: date.getUTCSeconds() };
}

function civilClockAtInstant(instantEpoch: number, timezone: string): SolarClock {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(Math.floor(instantEpoch)));
  const fields = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { year: Number(fields.year), month: Number(fields.month), day: Number(fields.day), hour: Number(fields.hour), minute: Number(fields.minute), second: Number(fields.second) };
}

/** The NOAA calcEquationOfTime relation. Positive EOT means apparent time leads mean time. */
export function noaaEquationOfTime(instantEpoch: number): { julianDay: number; julianCentury: number; equationOfTimeMinutes: number } {
  if (!Number.isFinite(instantEpoch) || !Number.isFinite(new Date(instantEpoch).valueOf())) throw new Error('真太阳时需要有效的实际 UTC 时刻。');
  const julianDay = instantEpoch / DAY + 2440587.5;
  const t = (julianDay - 2451545.0) / 36525.0;
  const meanLongitude = modulo(280.46646 + t * (36000.76983 + t * 0.0003032), 360);
  const meanAnomaly = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const eccentricity = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const obliquitySeconds = 21.448 - t * (46.8150 + t * (0.00059 - t * 0.001813));
  const meanObliquity = 23 + (26 + obliquitySeconds / 60) / 60;
  const correctedObliquity = meanObliquity + 0.00256 * Math.cos(radians(125.04 - 1934.136 * t));
  const y = Math.tan(radians(correctedObliquity) / 2) ** 2;
  const longitude = radians(meanLongitude), anomaly = radians(meanAnomaly);
  const equation = y * Math.sin(2 * longitude) - 2 * eccentricity * Math.sin(anomaly)
    + 4 * eccentricity * y * Math.sin(anomaly) * Math.cos(2 * longitude)
    - 0.5 * y * y * Math.sin(4 * longitude) - 1.25 * eccentricity * eccentricity * Math.sin(2 * anomaly);
  return { julianDay, julianCentury: t, equationOfTimeMinutes: 4 * degrees(equation) };
}

/**
 * Convert one actual instant. Gregorian arithmetic and IANA offset are host-zone independent.
 * No additional DST subtraction is performed: UTC has already resolved the recorded civil time.
 */
export function calculateApparentSolarTime(input: ApparentSolarInput): ApparentSolarResult {
  const { instantEpoch, longitudeDegrees, timezone } = input;
  if (!Number.isFinite(longitudeDegrees) || longitudeDegrees < -180 || longitudeDegrees > 180) throw new Error('出生地经度应为 -180 至 180 的有限数字，东经为正、西经为负。');
  if (typeof timezone !== 'string' || !timezone.trim()) throw new Error('真太阳时需要有效的 IANA 时区。');
  const equation = noaaEquationOfTime(instantEpoch);
  let civilClock: SolarClock;
  try { civilClock = civilClockAtInstant(instantEpoch, timezone); }
  catch { throw new Error('真太阳时需要有效的 IANA 时区。'); }
  // Local 1900-01-01 may precede UTC 1900; local 2100-12-31 may extend into UTC 2101.
  if (civilClock.year < 1900 || civilClock.year > 2100) throw new Error('真太阳时当前核验范围为出生地民用年份 1900–2100。');
  const civilCoordinate = Date.UTC(civilClock.year, civilClock.month - 1, civilClock.day, civilClock.hour, civilClock.minute, civilClock.second);
  const timezoneOffsetMinutes = (civilCoordinate - Math.floor(instantEpoch / 1000) * 1000) / MINUTE;
  const longitudeCorrectionMinutes = longitudeDegrees * 4 - timezoneOffsetMinutes;
  const totalCorrectionMinutes = longitudeCorrectionMinutes + equation.equationOfTimeMinutes;
  const meanSolarEpoch = instantEpoch + longitudeDegrees * 4 * MINUTE;
  const apparentSolarEpoch = meanSolarEpoch + equation.equationOfTimeMinutes * MINUTE;
  const dayRemainder = modulo(apparentSolarEpoch, DAY);
  const hourRemainder = modulo(apparentSolarEpoch, 60 * MINUTE);
  const distanceToDayBoundarySeconds = Math.min(dayRemainder, DAY - dayRemainder) / 1000;
  const distanceToHourBoundarySeconds = Math.min(hourRemainder, 60 * MINUTE - hourRemainder) / 1000;
  const nearDayBoundary = distanceToDayBoundarySeconds <= SOLAR_BOUNDARY_WINDOW_SECONDS;
  const nearHourBoundary = distanceToHourBoundarySeconds <= SOLAR_BOUNDARY_WINDOW_SECONDS;
  const warnings = [
    '均时差采用 NOAA/Meeus 儒略世纪公式；秒仅为钟面显示精度，不代表观测精度或出生记录精度。',
    'NOAA 已停止维护该计算器；本应用保留固定公式出处，不声称 NOAA 认证、背书或精度保证。',
  ];
  if (nearDayBoundary || nearHourBoundary) warnings.push('校正钟面距换日或整点不超过60秒；此为保守复核提示窗口，并非公式误差界或时刻置信区间。');
  return { version: APPARENT_SOLAR_VERSION, sourceId: APPARENT_SOLAR_SOURCE_ID, instantEpoch, longitudeDegrees, timezone, ...equation, timezoneOffsetMinutes, longitudeCorrectionMinutes, totalCorrectionMinutes, meanSolarEpoch, apparentSolarEpoch, civilClock, meanSolarClock: clockFromCoordinate(meanSolarEpoch), apparentSolarClock: clockFromCoordinate(apparentSolarEpoch), distanceToDayBoundarySeconds, distanceToHourBoundarySeconds, nearDayBoundary, nearHourBoundary, warnings };
}

/** Preserve an unknown-time interval; evaluate EOT independently at both actual endpoints. */
export function calculateApparentSolarInterval(input: Omit<ApparentSolarInput, 'instantEpoch'> & { startEpoch: number; endEpoch: number }): { start: ApparentSolarResult; end: ApparentSolarResult } {
  if (!Number.isFinite(input.startEpoch) || !Number.isFinite(input.endEpoch) || input.startEpoch > input.endEpoch) throw new Error('真太阳时区间必须包含有序、有效的实际时刻端点。');
  return { start: calculateApparentSolarTime({ instantEpoch: input.startEpoch, longitudeDegrees: input.longitudeDegrees, timezone: input.timezone }), end: calculateApparentSolarTime({ instantEpoch: input.endEpoch, longitudeDegrees: input.longitudeDegrees, timezone: input.timezone }) };
}
