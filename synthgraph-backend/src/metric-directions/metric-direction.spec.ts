import { BadRequestException } from '@nestjs/common';

import {
  aggregateMetricDirections,
  healthVerdict,
  MAX_DECLARATIONS_PER_REQUEST,
  MAX_METRIC_KEY_LENGTH,
  parseMetricDirections,
  type MetricDirection,
} from './metric-direction.js';

describe('parseMetricDirections', () => {
  it('accepts the three directions for exact metric keys', () => {
    expect(
      parseMetricDirections({
        'eval/episode_reward': 'maximize',
        collision_rate: 'minimize',
        episode_length: 'neutral',
      }),
    ).toEqual({
      'eval/episode_reward': 'maximize',
      collision_rate: 'minimize',
      episode_length: 'neutral',
    });
  });

  it.each([
    ['not an object', 'maximize'],
    ['an array', ['maximize']],
    ['null', null],
    ['empty', {}],
  ])('rejects a body that is %s', (_label, body) => {
    expect(() => parseMetricDirections(body)).toThrow(BadRequestException);
  });

  it.each(['higher', 'lower', 'max', 'MAXIMIZE', '', 1, null, true, undefined])(
    'rejects %p as a direction and names the metric',
    (direction) => {
      expect(() => parseMetricDirections({ loss: direction })).toThrow(
        /direction for "loss" must be one of maximize, minimize, neutral/,
      );
    },
  );

  it('rejects a key that is too long', () => {
    expect(() =>
      parseMetricDirections({ ['k'.repeat(MAX_METRIC_KEY_LENGTH + 1)]: 'maximize' }),
    ).toThrow(/1 to 200 characters/);
    expect(
      parseMetricDirections({ ['k'.repeat(MAX_METRIC_KEY_LENGTH)]: 'maximize' }),
    ).toBeDefined();
  });

  it('rejects too many declarations in one request', () => {
    const tooMany = Object.fromEntries(
      Array.from({ length: MAX_DECLARATIONS_PER_REQUEST + 1 }, (_, i) => [`m${i}`, 'neutral']),
    );
    expect(() => parseMetricDirections(tooMany)).toThrow(/at most 100/);
  });

  it('treats a key containing wildcard characters as an exact key, never a pattern', () => {
    // Names and prefixes do not decide direction: "eval/*" is just a strange key.
    expect(parseMetricDirections({ 'eval/*': 'maximize' })).toEqual({
      'eval/*': 'maximize',
    });
  });
});

describe('healthVerdict', () => {
  it.each<[MetricDirection, 'increasing' | 'decreasing', string]>([
    ['maximize', 'increasing', 'improving'],
    ['maximize', 'decreasing', 'worsening'],
    ['minimize', 'decreasing', 'improving'],
    ['minimize', 'increasing', 'worsening'],
  ])('a %s metric that is %s is %s', (direction, trend, expected) => {
    expect(healthVerdict(trend, direction)).toBe(expected);
  });

  it('has no verdict without a declared direction, whatever the trend', () => {
    for (const trend of ['increasing', 'decreasing', 'flat', 'insufficient_data'] as const) {
      expect(healthVerdict(trend, null)).toBe('neutral');
    }
  });

  it('has no verdict for a neutral metric', () => {
    expect(healthVerdict('increasing', 'neutral')).toBe('neutral');
    expect(healthVerdict('decreasing', 'neutral')).toBe('neutral');
  });

  it('has no verdict without real movement', () => {
    expect(healthVerdict('flat', 'maximize')).toBe('neutral');
    expect(healthVerdict('insufficient_data', 'minimize')).toBe('neutral');
  });
});

describe('aggregateMetricDirections', () => {
  const declared = new Map<string, Record<string, MetricDirection>>([
    ['exp-a', { loss: 'minimize', reward: 'maximize' }],
    ['exp-b', { loss: 'minimize', reward: 'minimize' }],
    ['exp-c', {}],
  ]);

  it('states a direction when every experiment reporting the metric declares the same one', () => {
    const result = aggregateMetricDirections(
      [
        { experimentId: 'exp-a', metricKeys: ['loss'] },
        { experimentId: 'exp-b', metricKeys: ['loss'] },
      ],
      declared,
    );
    expect(result).toEqual({ loss: { direction: 'minimize', mixed: false } });
  });

  it('is mixed, with no direction, when experiments declare different ones', () => {
    const result = aggregateMetricDirections(
      [
        { experimentId: 'exp-a', metricKeys: ['reward'] },
        { experimentId: 'exp-b', metricKeys: ['reward'] },
      ],
      declared,
    );
    expect(result).toEqual({ reward: { direction: null, mixed: true } });
  });

  it('is mixed when only some of the experiments reporting the metric declared it', () => {
    const result = aggregateMetricDirections(
      [
        { experimentId: 'exp-a', metricKeys: ['loss'] },
        { experimentId: 'exp-c', metricKeys: ['loss'] },
      ],
      declared,
    );
    expect(result).toEqual({ loss: { direction: null, mixed: true } });
  });

  it('leaves a metric nobody declared out, so it stays unknown', () => {
    const result = aggregateMetricDirections(
      [
        { experimentId: 'exp-a', metricKeys: ['loss', 'episode_length'] },
        { experimentId: 'exp-c', metricKeys: ['episode_length'] },
      ],
      declared,
    );
    expect(Object.keys(result)).toEqual(['loss']);
  });

  it('ignores a declaration for a metric an experiment does not report', () => {
    // exp-a declared "reward" but only reports "loss" in scope.
    const result = aggregateMetricDirections(
      [{ experimentId: 'exp-a', metricKeys: ['loss'] }],
      declared,
    );
    expect(result).toEqual({ loss: { direction: 'minimize', mixed: false } });
  });

  it('is empty when nothing is reported', () => {
    expect(aggregateMetricDirections([], declared)).toEqual({});
  });
});
