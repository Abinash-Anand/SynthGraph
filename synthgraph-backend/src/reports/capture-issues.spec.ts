import { describe, expect, it } from 'vitest';

import {
  captureIssues,
  integrationHealth,
  MAJORITY_SHARE,
} from './capture-issues.js';

const byIntegration = {
  resource_monitor: { total: 8, attached: 8, closed: 8 },
  tensorboard: { total: 2, attached: 2, closed: 1 },
};

describe('captureIssues', () => {
  it('is empty for a run with everything attached and closed', () => {
    expect(
      captureIssues(
        { resource_monitor: { attached: true, closed: true } },
        byIntegration,
        10,
      ),
    ).toEqual([]);
  });

  it('flags an integration that was attached but never closed', () => {
    const issues = captureIssues(
      { tensorboard: { attached: true, closed: false } },
      byIntegration,
      10,
    );
    expect(issues.find((i) => i.integration === 'tensorboard')).toEqual({
      kind: 'never_closed',
      integration: 'tensorboard',
    });
  });

  it('flags one that was reported but never attached', () => {
    const issues = captureIssues(
      { tensorboard: { attached: false, closed: false } },
      byIntegration,
      10,
    );
    expect(issues[0]).toEqual({
      kind: 'not_attached',
      integration: 'tensorboard',
    });
  });

  it('flags a missing integration only when most runs have it, and says how many', () => {
    const issues = captureIssues({}, byIntegration, 10);
    expect(issues).toEqual([
      {
        kind: 'not_reported',
        integration: 'resource_monitor',
        reportedBy: 8,
        totalRuns: 10,
      },
    ]);
  });

  it('treats a run that never reported capture at all as reporting nothing', () => {
    expect(captureIssues(null, byIntegration, 10)).toHaveLength(1);
    expect(captureIssues(undefined, {}, 0)).toEqual([]);
  });

  describe('the majority rule', () => {
    const at = (reportedBy: number, totalRuns: number) =>
      captureIssues(
        {},
        { x: { total: reportedBy, attached: reportedBy, closed: reportedBy } },
        totalRuns,
      );

    it('is a share of one half', () => {
      expect(MAJORITY_SHARE).toBe(0.5);
    });

    it('does not flag exactly half: that is not a majority', () => {
      expect(at(5, 10)).toEqual([]);
      expect(at(1, 2)).toEqual([]);
    });

    it('flags more than half', () => {
      expect(at(6, 10)).toHaveLength(1);
      expect(at(2, 3)).toHaveLength(1);
    });

    it('does not flag an integration only a minority report', () => {
      expect(at(4, 10)).toEqual([]);
    });

    it('flags nothing when there are no runs to compare against', () => {
      expect(at(0, 0)).toEqual([]);
    });
  });

  it('does not mistake an inherited property name for a reported integration', () => {
    const counts = { constructor: { total: 9, attached: 9, closed: 9 } };
    expect(captureIssues({}, counts, 10)).toHaveLength(1);
  });

  it('reports every problem a run has, reported ones first', () => {
    const issues = captureIssues(
      { tensorboard: { attached: true, closed: false } },
      byIntegration,
      10,
    );
    expect(issues.map((i) => i.kind)).toEqual([
      'never_closed',
      'not_reported',
    ]);
  });
});

describe('integrationHealth', () => {
  it('rates each integration', () => {
    const health = integrationHealth(byIntegration, 10);
    const tensorboard = health.find((h) => h.integration === 'tensorboard');
    const monitor = health.find((h) => h.integration === 'resource_monitor');
    expect(tensorboard).toEqual({
      integration: 'tensorboard',
      total: 2,
      attached: 2,
      closed: 1,
      dangling: 1,
      closeRate: 0.5,
      coverage: 0.2,
    });
    expect(monitor?.coverage).toBe(0.8);
    expect(monitor?.dangling).toBe(0);
  });

  it('handles an integration nobody reported, and no runs', () => {
    expect(
      integrationHealth({ x: { total: 0, attached: 0, closed: 0 } }, 0)[0],
    ).toMatchObject({ closeRate: 0, coverage: 0, dangling: 0 });
    expect(integrationHealth({}, 0)).toEqual([]);
  });

  it('never reports a negative number left open', () => {
    expect(
      integrationHealth({ x: { total: 3, attached: 1, closed: 3 } }, 3)[0]
        .dangling,
    ).toBe(0);
  });
});
