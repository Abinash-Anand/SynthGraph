import { ServerTimings } from './server-timings.js';

describe('ServerTimings', () => {
  it('records each measured part and renders a Server-Timing header', async () => {
    const timings = new ServerTimings();

    const result = await timings.measure('runs', async () => 'done');
    await timings.measure('generations', async () => undefined);

    expect(result).toBe('done');
    expect(timings.header()).toMatch(
      /^runs;dur=\d+\.\d, generations;dur=\d+\.\d$/,
    );
  });

  it('records a part even when it throws, and rethrows', async () => {
    const timings = new ServerTimings();

    await expect(
      timings.measure('failing', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(timings.header()).toMatch(/^failing;dur=\d+\.\d$/);
  });

  it('keeps only token-safe characters in a name', () => {
    const timings = new ServerTimings();

    timings.record('runs, detail;x="y"', 12.345);

    expect(timings.header()).toBe('runs__detail_x__y_;dur=12.3');
  });

  it('is empty when nothing was measured', () => {
    expect(new ServerTimings().header()).toBe('');
  });
});
