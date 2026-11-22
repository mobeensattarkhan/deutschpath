import type { AIProvider, EvaluationResult, GrammarEvalContext } from '@/lib/ai/types';
import { isAcceptedAnswer, tokenOverlap } from '@/lib/ai/compare';

/**
 * Deterministic offline evaluator. Used when no AI key is configured (local dev
 * and preview). It is honest about its limits: it only *confirms* answers that
 * exactly match the model/accepted answers, and flags everything else for
 * review instead of confidently failing valid alternatives.
 *
 * Real semantic grading (accepting valid alternatives) requires the OpenAI
 * provider. Never present mock results as authoritative German grading.
 */
export class MockProvider implements AIProvider {
  readonly name = 'mock';

  async evaluateGrammar(ctx: GrammarEvalContext): Promise<EvaluationResult> {
    if (isAcceptedAnswer(ctx.learnerAnswer, ctx.modelAnswer, ctx.acceptedAnswers)) {
      return {
        status: 'evaluated',
        is_correct: true,
        score: 100,
        errors: [],
        accepted_alternatives: ctx.acceptedAnswers,
        optional_suggestions: [],
        needs_review: false,
        feedback: 'Correct. Well done.',
      };
    }

    const overlap = tokenOverlap(ctx.learnerAnswer, ctx.modelAnswer);
    const score = Math.round(overlap * 100);

    if (overlap >= 0.6) {
      // Close but not an exact/known match — flag rather than fail (uncertain).
      return {
        status: 'evaluated',
        is_correct: false,
        score,
        errors: [],
        accepted_alternatives: [],
        optional_suggestions: [`A model answer is: ${ctx.modelAnswer}`],
        needs_review: true,
        feedback:
          'Your answer is close. Offline mode cannot confirm valid alternatives, ' +
          'so this is flagged for review. Compare with the model answer.',
      };
    }

    return {
      status: 'evaluated',
      is_correct: false,
      score,
      errors: [
        {
          span: ctx.learnerAnswer.slice(0, 120),
          correction: ctx.modelAnswer,
          category: ctx.targetGrammar || 'grammar',
          blocking: true,
          explanation: `Review the target grammar: ${ctx.targetGrammar || 'sentence structure'}.`,
        },
      ],
      accepted_alternatives: [],
      optional_suggestions: [],
      needs_review: false,
      feedback: 'This does not match the expected answer yet. Check the correction and try again.',
    };
  }
}
