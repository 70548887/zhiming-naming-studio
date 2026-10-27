import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { APPARENT_SOLAR_SOURCE_ID, APPARENT_SOLAR_VERSION, calculateApparentSolarInterval, calculateApparentSolarTime, noaaEquationOfTime } from '../src/shared/apparent-solar';

const reference = JSON.parse(readFileSync(resolve('data/raw/solar-time-independent-reference.json'), 'utf8'));
interface ReferenceRow { id: string; input: { utcInstant: string; eastLongitude: number; actualUtcOffsetSeconds: number; civilZone: string }; expected: { equationOfTimeMinutes: number; julianDay: number; apparentSolarWallCoordinateMs: number; civilWallIso: string; totalCorrectionFromCivilSeconds: number } }
const rows = reference.rows as ReferenceRow[];
const clock = (epoch: number) => { const d = new Date(Math.floor(epoch)); return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds() }; };
const fixture = (id: string): ReferenceRow => rows.find(row => row.id === id)!;
const forRow = (row: ReferenceRow) => calculateApparentSolarTime({ instantEpoch: Date.parse(row.input.utcInstant), longitudeDegrees: row.input.eastLongitude, timezone: row.input.civilZone.startsWith('fixed') ? `Etc/GMT${row.input.actualUtcOffsetSeconds > 0 ? '-' : '+'}${Math.abs(row.input.actualUtcOffsetSeconds / 3600)}` : row.input.civilZone });

describe('NOAA Julian-century apparent solar wall coordinates', () => {
  it.each(rows)('matches independently executed official NOAA / reviewed zone fixture $id', row => {
    const actual = forRow(row);
    expect(actual.version).toBe(APPARENT_SOLAR_VERSION);
    expect(actual.sourceId).toBe(APPARENT_SOLAR_SOURCE_ID);
    expect(actual.julianDay).toBeCloseTo(row.expected.julianDay, 8);
    expect(actual.equationOfTimeMinutes).toBeCloseTo(row.expected.equationOfTimeMinutes, 8);
    expect(actual.apparentSolarEpoch).toBeCloseTo(row.expected.apparentSolarWallCoordinateMs, 1);
    expect(actual.apparentSolarClock).toEqual(clock(row.expected.apparentSolarWallCoordinateMs));
    expect(actual.civilClock).toEqual(clock(Date.parse(row.expected.civilWallIso + 'Z')));
    expect(actual.timezoneOffsetMinutes * 60).toBe(row.input.actualUtcOffsetSeconds);
    expect(actual.totalCorrectionMinutes * 60).toBeCloseTo(row.expected.totalCorrectionFromCivilSeconds, 7);
  });

  it.each(reference.crossModel.rows as Array<{ id: string; utcInstant: string; equationOfTimeMinutes: number }>)('agrees with independent pvlib/NREL SPA reference $id within the declared cross-model tolerance', row => {
    const actual = noaaEquationOfTime(Date.parse(row.utcInstant)).equationOfTimeMinutes;
    expect(Math.abs(actual - row.equationOfTimeMinutes)).toBeLessThan(reference.crossModel.toleranceMinutes);
  });

  it('has the J2000 anchor and full Gregorian leap-day arithmetic rather than the spreadsheet JD shortcut', () => {
    expect(noaaEquationOfTime(Date.UTC(2000, 0, 1, 12)).julianDay).toBe(2451545);
    for (const year of [1900, 2100]) expect(noaaEquationOfTime(Date.UTC(year, 2, 1)).julianDay - noaaEquationOfTime(Date.UTC(year, 1, 28)).julianDay).toBe(1);
    expect(noaaEquationOfTime(Date.UTC(2000, 2, 1)).julianDay - noaaEquationOfTime(Date.UTC(2000, 1, 28)).julianDay).toBe(2);
  });

  it('preserves both longitude endpoints and dated sides of the international meridian', () => {
    const east = forRow(fixture('matching-endpoint-east')), west = forRow(fixture('matching-endpoint-west'));
    expect(east.apparentSolarEpoch - west.apparentSolarEpoch).toBe(86400000);
    expect([east.apparentSolarClock.hour, east.apparentSolarClock.minute, east.apparentSolarClock.second]).toEqual([west.apparentSolarClock.hour, west.apparentSolarClock.minute, west.apparentSolarClock.second]);
    expect(Date.UTC(east.apparentSolarClock.year, east.apparentSolarClock.month - 1, east.apparentSolarClock.day) - Date.UTC(west.apparentSolarClock.year, west.apparentSolarClock.month - 1, west.apparentSolarClock.day)).toBe(86400000);
    expect(east.meanSolarEpoch - east.instantEpoch).toBe(43200000);
    expect(west.meanSolarEpoch - west.instantEpoch).toBe(-43200000);
  });

  it('does not subtract DST twice and does not change the solar instant when only the explanatory zone changes', () => {
    const epoch = Date.parse('2025-07-01T16:00:00Z');
    const ny = calculateApparentSolarTime({ instantEpoch: epoch, longitudeDegrees: -74.006, timezone: 'America/New_York' });
    const utc = calculateApparentSolarTime({ instantEpoch: epoch, longitudeDegrees: -74.006, timezone: 'UTC' });
    expect(ny.timezoneOffsetMinutes).toBe(-240);
    expect(ny.longitudeCorrectionMinutes).toBeCloseTo(-56.024, 10);
    expect(ny.apparentSolarEpoch).toBe(utc.apparentSolarEpoch);
    expect(ny.totalCorrectionMinutes - utc.totalCorrectionMinutes).toBe(240);
    const before = forRow(fixture('new-york-spring-before')), after = forRow(fixture('new-york-spring-after'));
    expect(after.timezoneOffsetMinutes - before.timezoneOffsetMinutes).toBe(60);
    expect(after.apparentSolarEpoch - before.apparentSolarEpoch).toBeGreaterThan(999);
    expect(after.apparentSolarEpoch - before.apparentSolarEpoch).toBeLessThan(1001);
  });

  it('uses second-level historical zone offsets without losing fractional epoch input', () => {
    const row = fixture('paris-1900-nonminute'), original = forRow(row);
    const fraction = calculateApparentSolarTime({ instantEpoch: Date.parse(row.input.utcInstant) + 625.5, longitudeDegrees: row.input.eastLongitude, timezone: row.input.civilZone });
    expect(fraction.timezoneOffsetMinutes).toBe(9.35);
    expect(fraction.apparentSolarEpoch - original.apparentSolarEpoch).toBeGreaterThan(625);
    expect(fraction.apparentSolarEpoch - original.apparentSolarEpoch).toBeLessThan(626);
    expect(fraction.apparentSolarClock).toEqual(clock(fraction.apparentSolarEpoch));
    const justBeforeSecond = calculateApparentSolarTime({ instantEpoch: Date.parse(row.input.utcInstant) + 999.5, longitudeDegrees: row.input.eastLongitude, timezone: row.input.civilZone });
    expect(justBeforeSecond.timezoneOffsetMinutes).toBe(9.35);
    expect(justBeforeSecond.civilClock).toEqual({ year: 1900, month: 1, day: 1, hour: 0, minute: 0, second: 0 });
  });

  it('keeps unknown-time endpoints with independently evaluated EOT across a DST day', () => {
    const interval = calculateApparentSolarInterval({ startEpoch: Date.parse('2025-03-09T05:00:00Z'), endEpoch: Date.parse('2025-03-10T03:59:59Z'), longitudeDegrees: -74.006, timezone: 'America/New_York' });
    expect(interval.start.civilClock).toEqual({ year: 2025, month: 3, day: 9, hour: 0, minute: 0, second: 0 });
    expect(interval.end.civilClock).toEqual({ year: 2025, month: 3, day: 9, hour: 23, minute: 59, second: 59 });
    expect(interval.start.equationOfTimeMinutes).not.toBe(interval.end.equationOfTimeMinutes);
    expect(interval.start.timezoneOffsetMinutes).toBe(-300);
    expect(interval.end.timezoneOffsetMinutes).toBe(-240);
    expect(interval.end.instantEpoch - interval.start.instantEpoch).toBe(23 * 3600000 - 1000);
  });

  it('floors displayed seconds and never rounds fractional apparent time across midnight or an hour', () => {
    // Independent official-source EOT fixture supplies the cancellation; application output is not an expected value.
    const row = fixture('greenwich-positive-eot-crossing');
    const epoch = Date.parse(row.input.utcInstant), dayEnd = Date.UTC(2025, 10, 4);
    for (const offsetMilliseconds of [-900, -100, 100, 900]) {
      const target = dayEnd + offsetMilliseconds;
      const longitude = ((target - epoch) / 60000 - row.expected.equationOfTimeMinutes) / 4;
      const result = calculateApparentSolarTime({ instantEpoch: epoch, longitudeDegrees: longitude, timezone: 'UTC' });
      expect(result.apparentSolarEpoch).toBeCloseTo(target, 1);
      expect(result.apparentSolarClock).toEqual(offsetMilliseconds < 0 ? { year: 2025, month: 11, day: 3, hour: 23, minute: 59, second: 59 } : { year: 2025, month: 11, day: 4, hour: 0, minute: 0, second: 0 });
      expect(result.nearDayBoundary).toBe(true);
    }
    const zeroLongitude = forRow(fixture('j2000-greenwich'));
    expect(zeroLongitude.meanSolarClock).toEqual({ year: 2000, month: 1, day: 1, hour: 12, minute: 0, second: 0 });
    expect(zeroLongitude.apparentSolarClock).toEqual({ year: 2000, month: 1, day: 1, hour: 11, minute: 56, second: 41 });
    const historical = fixture('paris-1900-nonminute'), historicalEpoch = Date.parse(historical.input.utcInstant);
    for (const offsetMilliseconds of [-900, -100, 100, 900]) {
      const target = Date.UTC(1900, 0, 1) + offsetMilliseconds;
      const longitude = ((target - historicalEpoch) / 60000 - historical.expected.equationOfTimeMinutes) / 4;
      const result = calculateApparentSolarTime({ instantEpoch: historicalEpoch, longitudeDegrees: longitude, timezone: 'Europe/Paris' });
      expect(result.apparentSolarClock).toEqual(offsetMilliseconds < 0 ? { year: 1899, month: 12, day: 31, hour: 23, minute: 59, second: 59 } : { year: 1900, month: 1, day: 1, hour: 0, minute: 0, second: 0 });
    }
  });

  it('uses a 60-second review window without claiming an observational error bound or replacing a result', () => {
    const row = fixture('j2000-greenwich'), epoch = Date.parse(row.input.utcInstant);
    for (const seconds of [59.9, 60.1]) {
      const longitude = (seconds / 60 - row.expected.equationOfTimeMinutes) / 4;
      const result = calculateApparentSolarTime({ instantEpoch: epoch, longitudeDegrees: longitude, timezone: 'UTC' });
      expect(result.nearHourBoundary).toBe(seconds < 60);
      expect(result.distanceToHourBoundarySeconds).toBeCloseTo(seconds, 4);
      expect(Number.isFinite(result.apparentSolarEpoch)).toBe(true);
      expect(result.warnings.join(' ')).toContain('秒仅为钟面显示精度');
      if (seconds < 60) expect(result.warnings.join(' ')).toContain('并非公式误差界');
    }
  });

  it('validates the recorded civil year while retaining corrected coordinates in adjacent years', () => {
    const first = calculateApparentSolarTime({ instantEpoch: Date.UTC(1900, 0, 1), longitudeDegrees: -180, timezone: 'UTC' });
    const last = calculateApparentSolarTime({ instantEpoch: Date.UTC(2100, 11, 31, 23, 59, 59), longitudeDegrees: 180, timezone: 'UTC' });
    expect(first.apparentSolarClock.year).toBe(1899);
    expect(last.apparentSolarClock.year).toBe(2101);
    expect(() => calculateApparentSolarTime({ instantEpoch: Date.UTC(1899, 11, 31), longitudeDegrees: 0, timezone: 'UTC' })).toThrow('1900–2100');
    expect(() => calculateApparentSolarTime({ instantEpoch: Date.UTC(2101, 0, 1), longitudeDegrees: 0, timezone: 'UTC' })).toThrow('1900–2100');
  });

  it.each([NaN, Infinity, -Infinity, -180.01, 180.01])('rejects invalid longitude %s', longitudeDegrees => {
    expect(() => calculateApparentSolarTime({ instantEpoch: Date.UTC(2025, 0, 1), longitudeDegrees, timezone: 'UTC' })).toThrow('经度');
  });
  it.each([NaN, Infinity, -Infinity, 9e20])('rejects invalid actual instant %s', instantEpoch => {
    expect(() => calculateApparentSolarTime({ instantEpoch, longitudeDegrees: 0, timezone: 'UTC' })).toThrow('实际 UTC');
  });
  it.each(['', 'Unknown/Invalid'])('rejects invalid timezone %s', timezone => {
    expect(() => calculateApparentSolarTime({ instantEpoch: Date.UTC(2025, 0, 1), longitudeDegrees: 0, timezone })).toThrow('IANA');
  });
  it('rejects unknown-time intervals in reverse order rather than replacing them with a representative instant', () => {
    expect(() => calculateApparentSolarInterval({ startEpoch: 1, endEpoch: 0, longitudeDegrees: 0, timezone: 'UTC' })).toThrow('有序');
  });
});
