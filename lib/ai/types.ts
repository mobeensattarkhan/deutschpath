import { z } from 'zod';

/**
 * Structured evaluation result (brief §6.4). The SERVER validates every field
 * and computes completion eligibility itself — `stage_eligible` from a model is
 * never trusted.
 */
export const evaluationErrorSchema = z.object({
  span: z.string().default(''),
  correction: z.string().default(''),
  category: z.string().default('other'),
  blocking: z.boolean().default(true),
  explanation: z.string().default(''),
});

export const evaluationResultSchema = z.object({
  status: z.literal('evaluated'),
  is_correct: z.boolean(),
  score: z.number().min(0).max(100),
  errors: z.array(evaluationErrorSchema).default([]),
  accepted_alternatives: z.array(z.string()).default([]),
  optional_suggestions: z.array(z.string()).default([]),
  needs_review: z.boolean().default(false),
  feedback: z.string().default(''),
});

export type EvaluationError = z.infer<typeof evaluationErrorSchema>;
export type EvaluationResult = z.infer<typeof evaluationResultSchema>;

/** Context handed to a provider for a grammar evaluation. */
export interface GrammarEvalContext {
  instruction: string;
  prompt: string;
  expectedMeaning?: string | null;
  modelAnswer: string;
  acceptedAnswers: string[];
  targetGrammar: string;
  learnerAnswer: string;
}

export interface AIProvider {
  readonly name: string;
  evaluateGrammar(ctx: GrammarEvalContext): Promise<EvaluationResult>;
}

/** Metadata recorded with every evaluation for auditing. */
export interface ProviderMeta {
  provider: string;
  model: string;
  promptVersion: string;
}
