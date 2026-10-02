import { describe, expect, it } from 'vitest'; import { availabilityOpen, draw, eligible, fixtureDates, mondayAtSix, nextMondayAtSix, registrationClosesAt, registrationOpenForFixture, registrationOpensAt, validLineup } from './domain.js';
describe('season rules',()=>{it('has 24 Tuesday fixtures',()=>expect(fixtureDates()).toHaveLength(24));it('excludes Tim in 2027',()=>{expect(eligible('Tim Browning',new Date('2026-12-01T17:00:00Z'))).toBe(true);expect(eligible('Tim Browning',new Date('2027-01-05T17:00:00Z'))).toBe(false)});it('uses Vienna Friday boundaries',()=>{expect(availabilityOpen(new Date('2026-01-02T07:59:59Z'))).toBe(false);expect(availabilityOpen(new Date('2026-01-02T08:00:00Z'))).toBe(true);expect(availabilityOpen(new Date('2026-01-02T11:00:00Z'))).toBe(false)});it('draws selected then ordered reserves',()=>{const r=draw([1,2,3],()=>0);expect(r.selected).toHaveLength(3);expect(r.reserves).toEqual([])});it('validates lineups',()=>{expect(validLineup([1,2],[3],new Set([1,2,3]))).toBe(true);expect(validLineup([1,1],[],new Set([1]))).toBe(false)})});

describe('fixture registration windows', () => {
  it('opens the Monday test fixture on Friday October 2 at 07:00 Vienna time', () => {
    const fixture = new Date('2026-10-05T16:00:00Z');
    expect(registrationOpensAt(fixture).toISOString()).toBe('2026-10-02T05:00:00.000Z');
    expect(registrationClosesAt(fixture).toISOString()).toBe('2026-10-02T10:00:00.000Z');
    expect(registrationOpenForFixture(new Date('2026-10-02T04:59:59Z'), fixture)).toBe(false);
    expect(registrationOpenForFixture(new Date('2026-10-02T05:00:00Z'), fixture)).toBe(true);
    expect(registrationOpenForFixture(new Date('2026-10-02T09:59:59Z'), fixture)).toBe(true);
    expect(registrationOpenForFixture(new Date('2026-10-02T10:00:00Z'), fixture)).toBe(false);
  });

  it('keeps Tuesday fixtures at Friday 09:00–12:00 Vienna time', () => {
    const fixture = new Date('2026-10-13T16:00:00Z');
    expect(registrationOpensAt(fixture).toISOString()).toBe('2026-10-09T07:00:00.000Z');
    expect(registrationClosesAt(fixture).toISOString()).toBe('2026-10-09T10:00:00.000Z');
    expect(registrationOpenForFixture(new Date('2026-10-09T06:59:59Z'), fixture)).toBe(false);
    expect(registrationOpenForFixture(new Date('2026-10-09T07:00:00Z'), fixture)).toBe(true);
  });
});

describe('Monday fixtures', () => {
  it('starts the upcoming October fixture at 18:00 Vienna time', () => {
    expect(nextMondayAtSix(new Date('2026-10-02T12:00:00Z')).toISOString()).toBe('2026-10-05T16:00:00.000Z');
    expect(mondayAtSix(new Date('2026-10-05T17:00:00Z'))?.toISOString()).toBe('2026-10-05T16:00:00.000Z');
  });

  it('keeps 18:00 Vienna time across daylight saving changes', () => {
    expect(nextMondayAtSix(new Date('2026-10-19T16:00:00Z')).toISOString()).toBe('2026-10-26T17:00:00.000Z');
    expect(nextMondayAtSix(new Date('2027-03-22T17:00:00Z')).toISOString()).toBe('2027-03-29T16:00:00.000Z');
    expect(mondayAtSix(new Date('2027-03-29T17:00:00Z'))?.toISOString()).toBe('2027-03-29T16:00:00.000Z');
    expect(mondayAtSix(new Date('2026-10-13T16:00:00Z'))).toBeNull();
  });
});
