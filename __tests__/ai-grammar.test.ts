import { describe, it, expect } from 'vitest';
import { normalizeForMatch, isAcceptedAnswer, tokenOverlap } from '@/lib/ai/compare';
import { MockProvider } from '@/lib/ai/mock';
import type { GrammarEvalContext } from '@/lib/ai/types';

describe('compare helpers', () => {
  it('normalizes case, trailing punctuation and whitespace but keeps umlauts', () => {
    expect(normalizeForMatch('  Ich lerne  Deutsch. ')).toBe('ich lerne deutsch');
    expect(normalizeForMatch('Grüße!')).toBe('grüße');
  });

  it('accepts the model answer or a listed alternative', () => {
    expect(isAcceptedAnswer('Ich lerne jeden Tag Deutsch.', 'Ich lerne jeden Tag Deutsch.', [])).toBe(true);
    expect(isAcceptedAnswer('Jeden Tag lerne ich Deutsch', 'Ich lerne jeden Tag Deutsch.', ['Jeden Tag lerne ich Deutsch.'])).toBe(true);
    expect(isAcceptedAnswer('Ich spiele Fußball', 'Ich lerne Deutsch', [])).toBe(false);
  });

  it('computes token overlap', () => {
    expect(tokenOverlap('ich lerne deutsch', 'ich lerne deutsch')).toBe(1);
    expect(tokenOverlap('a b c d', 'e f g h')).toBe(0);
  });
});

const ctx = (answer: string): GrammarEvalContext => ({
  instruction: 'Translate into German.',
  prompt: 'I learn German every day.',
  modelAnswer: 'Ich lerne jeden Tag Deutsch.',
  acceptedAnswers: ['Jeden Tag lerne ich Deutsch.'],
  targetGrammar: 'main_clause_verb_position',
  learnerAnswer: answer,
});

describe('MockProvider', () => {
  const p = new MockProvider();

  it('marks an exact/accepted answer correct with full score', async () => {
    const r = await p.evaluateGrammar(ctx('Jeden Tag lerne ich Deutsch.'));
    expect(r.is_correct).toBe(true);
    expect(r.score).toBe(100);
    expect(r.errors).toHaveLength(0);
  });

  it('flags a close answer for review rather than failing it', async () => {
    const r = await p.evaluateGrammar(ctx('Ich lerne jeden Tag Deutch'));
    expect(r.needs_review).toBe(true);
    expect(r.is_correct).toBe(false);
  });

  it('returns a blocking error for a clearly wrong answer', async () => {
    const r = await p.evaluateGrammar(ctx('Ich spiele Fußball'));
    expect(r.is_correct).toBe(false);
    expect(r.errors[0]?.blocking).toBe(true);
  });
});
