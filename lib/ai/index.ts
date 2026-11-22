import 'server-only';
import { getServerEnv } from '@/lib/env.server';
import type { AIProvider, EvaluationResult, GrammarEvalContext, ProviderMeta } from '@/lib/ai/types';
import { MockProvider } from '@/lib/ai/mock';
import { OpenAIProvider } from '@/lib/ai/openai';
import { isAcceptedAnswer } from '@/lib/ai/compare';

export const PROMPT_VERSION = 'grammar-v1';

/**
 * Select the evaluation provider. Uses OpenAI when a key is configured;
 * otherwise falls back to the deterministic offline mock so the app still runs.
 */
function getProvider(): { provider: AIProvider; model: string } {
  const env = getServerEnv();
  if (env.OPENAI_API_KEY) {
    const model = env.OPENAI_EVAL_MODEL || 'gpt-4o-mini';
    return { provider: new OpenAIProvider(env.OPENAI_API_KEY, model), model };
  }
  return { provider: new MockProvider(), model: 'deterministic' };
}

/**
 * Evaluate a grammar answer. Deterministic acceptance runs first (cheap, exact/
 * known-alternative matches never need the model); otherwise the provider does
 * a semantic evaluation. Returns the validated result plus provider metadata.
 */
export async function evaluateGrammar(
  ctx: GrammarEvalContext,
): Promise<{ result: EvaluationResult; meta: ProviderMeta }> {
  if (isAcceptedAnswer(ctx.learnerAnswer, ctx.modelAnswer, ctx.acceptedAnswers)) {
    return {
      result: {
        status: 'evaluated',
        is_correct: true,
        score: 100,
        errors: [],
        accepted_alternatives: ctx.acceptedAnswers,
        optional_suggestions: [],
        needs_review: false,
        feedback: 'Correct. Well done.',
      },
      meta: { provider: 'deterministic', model: 'exact-match', promptVersion: PROMPT_VERSION },
    };
  }

  const { provider, model } = getProvider();
  const result = await provider.evaluateGrammar(ctx);
  return { result, meta: { provider: provider.name, model, promptVersion: PROMPT_VERSION } };
}
