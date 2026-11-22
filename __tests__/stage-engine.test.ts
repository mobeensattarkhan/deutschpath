import { describe, it, expect } from 'vitest';
import { evaluateStageEligibility, attemptPassed } from '@/lib/stage-engine/eligibility';

const base = {
  isAuthenticated: true,
  stageStatus: 'available' as const,
  bestScore: 90,
  passingScore: 80,
  unresolvedCorrections: 0,
  hasSubmittedAttempt: true,
};

describe('evaluateStageEligibility', () => {
  it('is eligible when all conditions are met', () => {
    expect(evaluateStageEligibility(base)).toEqual({ eligible: true, reasons: [] });
  });

  it('blocks when the stage is locked', () => {
    const r = evaluateStageEligibility({ ...base, stageStatus: 'locked' });
    expect(r.eligible).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/locked/i);
  });

  it('blocks when there are unresolved corrections (the mistake gate)', () => {
    const r = evaluateStageEligibility({ ...base, unresolvedCorrections: 2 });
    expect(r.eligible).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/2 required correction/i);
  });

  it('blocks when the best score is below the threshold', () => {
    const r = evaluateStageEligibility({ ...base, bestScore: 70 });
    expect(r.eligible).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/80%/);
  });

  it('blocks when nothing has been submitted', () => {
    const r = evaluateStageEligibility({ ...base, hasSubmittedAttempt: false, bestScore: null });
    expect(r.eligible).toBe(false);
  });
});

describe('attemptPassed', () => {
  it('passes only when score meets threshold and no blocking errors', () => {
    expect(attemptPassed({ score: 85, passingScore: 80, blockingErrors: 0 })).toBe(true);
    expect(attemptPassed({ score: 85, passingScore: 80, blockingErrors: 1 })).toBe(false);
    expect(attemptPassed({ score: 75, passingScore: 80, blockingErrors: 0 })).toBe(false);
  });
});
