/**
 * Pure stage-completion eligibility logic (brief §5.1).
 *
 * The SERVER decides whether a stage is complete — never the browser or the
 * LLM. This module holds the decision as a pure, unit-tested function; the API
 * route gathers the inputs from the database and the atomic unlock happens in a
 * Postgres function (0004_stage_engine.sql).
 */

export type StageStatus =
  | 'locked'
  | 'available'
  | 'in_progress'
  | 'submitted'
  | 'corrections_required'
  | 'passed'
  | 'completed';

export interface EligibilityInput {
  isAuthenticated: boolean;
  stageStatus: StageStatus;
  /** Best score (0–100) across this learner's attempts for the stage, or null. */
  bestScore: number | null;
  /** Configured passing threshold for the stage (0–100). */
  passingScore: number;
  /** Count of genuine required corrections not yet resolved. */
  unresolvedCorrections: number;
  /** Whether at least one attempt has been submitted for the stage. */
  hasSubmittedAttempt: boolean;
}

export interface EligibilityResult {
  eligible: boolean;
  /** Human-readable reasons the stage is NOT yet completable (empty when eligible). */
  reasons: string[];
}

export function evaluateStageEligibility(input: EligibilityInput): EligibilityResult {
  const reasons: string[] = [];

  if (!input.isAuthenticated) reasons.push('You must be signed in.');
  if (input.stageStatus === 'locked') reasons.push('This stage is locked.');
  if (!input.hasSubmittedAttempt) reasons.push('Submit an attempt first.');
  if (input.unresolvedCorrections > 0) {
    reasons.push(
      `Resolve ${input.unresolvedCorrections} required correction` +
        `${input.unresolvedCorrections === 1 ? '' : 's'} before continuing.`,
    );
  }
  if (input.bestScore === null || input.bestScore < input.passingScore) {
    reasons.push(`Reach the passing score of ${input.passingScore}%.`);
  }

  return { eligible: reasons.length === 0, reasons };
}

/**
 * Whether a single attempt counts as "passed": score meets threshold AND there
 * are no blocking (required-correction) errors outstanding in that attempt.
 */
export function attemptPassed(params: {
  score: number;
  passingScore: number;
  blockingErrors: number;
}): boolean {
  return params.score >= params.passingScore && params.blockingErrors === 0;
}
