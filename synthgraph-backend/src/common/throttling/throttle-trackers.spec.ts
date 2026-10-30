import { bearerTracker, ipTracker } from './throttle-trackers.js';

describe('throttle trackers', () => {
  it('counts a request against its IP', () => {
    expect(ipTracker({ ip: '10.0.0.1' })).toBe('ip:10.0.0.1');
    expect(ipTracker({})).toBe('ip:unknown');
  });

  it('gives each credential its own bucket even from one IP', () => {
    const a = bearerTracker({ ip: '10.0.0.1', headers: { authorization: 'Bearer sg_aaa' } });
    const b = bearerTracker({ ip: '10.0.0.1', headers: { authorization: 'Bearer sg_bbb' } });
    expect(a).not.toBe(b);
    expect(a).toMatch(/^key:[0-9a-f]{32}$/);
  });

  it('is stable for the same credential and never contains it', () => {
    const req = { ip: '10.0.0.1', headers: { authorization: 'Bearer sg_secret_value' } };
    expect(bearerTracker(req)).toBe(bearerTracker({ ...req, ip: '10.0.0.2' }));
    expect(bearerTracker(req)).not.toContain('sg_secret_value');
  });

  it('falls back to the IP without a usable bearer credential', () => {
    expect(bearerTracker({ ip: '10.0.0.1', headers: {} })).toBe('ip:10.0.0.1');
    expect(bearerTracker({ ip: '10.0.0.1', headers: { authorization: 'Basic abc' } })).toBe('ip:10.0.0.1');
    expect(bearerTracker({ ip: '10.0.0.1', headers: { authorization: 'Bearer ' } })).toBe('ip:10.0.0.1');
  });
});
