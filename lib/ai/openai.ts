import type { AIProvider, EvaluationResult, GrammarEvalContext } from '@/lib/ai/types';
import { evaluationResultSchema } from '@/lib/ai/types';

/**
 * OpenAI-backed evaluator using Structured Outputs (JSON schema). The model
 * identifier is configurable (OPENAI_EVAL_MODEL) — keep it in env, not code.
 *
 * On any error (network, timeout, invalid JSON) this throws; the caller treats
 * that as a temporary failure and does NOT consume the learner's attempt.
 */
const MASTER_INSTRUCTION =
  'You are an expert German tutor specialising in CEFR A2. Evaluate the ' +
  "learner's response according to the task's stated learning objective and A2 " +
  'expectations. Accept every grammatically correct response that preserves the ' +
  'intended meaning and fits the context. Do not require exact wording when ' +
  'alternatives are valid. Identify genuine errors only. Distinguish grammar, ' +
  'vocabulary, spelling, capitalisation, punctuation, register and style. ' +
  'Explain each genuine error in simple English and provide a corrected German ' +
  'version. Do not invent errors. Do not penalise learners for not using advanced ' +
  'grammar outside the task. If a response is ambiguous or you are uncertain, set ' +
  'needs_review true rather than confidently rejecting it. Return valid JSON only.';

const RESULT_JSON_SCHEMA = {
  name: 'grammar_evaluation',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      status: { type: 'string', enum: ['evaluated'] },
      is_correct: { type: 'boolean' },
      score: { type: 'number' },
      errors: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            span: { type: 'string' },
            correction: { type: 'string' },
            category: { type: 'string' },
            blocking: { type: 'boolean' },
            explanation: { type: 'string' },
          },
          required: ['span', 'correction', 'category', 'blocking', 'explanation'],
        },
      },
      accepted_alternatives: { type: 'array', items: { type: 'string' } },
      optional_suggestions: { type: 'array', items: { type: 'string' } },
      needs_review: { type: 'boolean' },
      feedback: { type: 'string' },
    },
    required: [
      'status',
      'is_correct',
      'score',
      'errors',
      'accepted_alternatives',
      'optional_suggestions',
      'needs_review',
      'feedback',
    ],
  },
} as const;

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async evaluateGrammar(ctx: GrammarEvalContext): Promise<EvaluationResult> {
    const userContent = JSON.stringify({
      instruction: ctx.instruction,
      prompt: ctx.prompt,
      expected_meaning: ctx.expectedMeaning ?? null,
      model_answer: ctx.modelAnswer,
      accepted_answers: ctx.acceptedAnswers,
      target_grammar: ctx.targetGrammar,
      learner_answer: ctx.learnerAnswer,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          messages: [
            { role: 'system', content: MASTER_INSTRUCTION },
            { role: 'user', content: userContent },
          ],
          response_format: { type: 'json_schema', json_schema: RESULT_JSON_SCHEMA },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`OpenAI request failed: ${res.status}`);
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('OpenAI returned no content');

      // Validate on the server — never trust raw model output.
      return evaluationResultSchema.parse(JSON.parse(content));
    } finally {
      clearTimeout(timeout);
    }
  }
}
