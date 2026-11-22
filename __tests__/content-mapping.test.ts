import { describe, it, expect } from 'vitest';
import {
  parseWordRange,
  normalizeRegister,
  mapImportStatus,
  countWhitespaceTokens,
} from '@/lib/content/mapping';
import { grammarExercise, emailTask } from '@/lib/content/schemas';

describe('parseWordRange', () => {
  it('parses an en-dash range', () => {
    expect(parseWordRange('30–50')).toEqual({ min: 30, max: 50 });
  });
  it('parses a hyphen range', () => {
    expect(parseWordRange('30-50')).toEqual({ min: 30, max: 50 });
  });
  it('parses a single number', () => {
    expect(parseWordRange('40 words')).toEqual({ min: 40, max: 40 });
  });
  it('orders min/max regardless of input order', () => {
    expect(parseWordRange('50 to 30')).toEqual({ min: 30, max: 50 });
  });
  it('returns null when there is no number', () => {
    expect(parseWordRange('a few')).toBeNull();
  });
});

describe('normalizeRegister', () => {
  it('maps clear labels', () => {
    expect(normalizeRegister('Formal').register).toBe('formal');
    expect(normalizeRegister('informal').register).toBe('informal');
  });
  it('maps ambiguous labels to null but keeps the raw label', () => {
    expect(normalizeRegister('Formal or informal')).toEqual({
      register: null,
      label: 'Formal or informal',
    });
    expect(normalizeRegister('Mixed').register).toBeNull();
  });
});

describe('mapImportStatus (never auto-publishes)', () => {
  it('maps outline/seed statuses to draft', () => {
    expect(mapImportStatus('outline_only')).toBe('draft');
    expect(mapImportStatus('task_seed')).toBe('draft');
    expect(mapImportStatus('passage_to_author')).toBe('draft');
  });
  it('maps review statuses to needs_review', () => {
    expect(mapImportStatus('needs_native_or_qualified_review')).toBe('needs_review');
    expect(mapImportStatus(undefined)).toBe('needs_review');
  });
  it('caps even an "approved"/"published" claim at needs_review', () => {
    expect(mapImportStatus('approved')).toBe('needs_review');
    expect(mapImportStatus('published')).toBe('needs_review');
  });
});

describe('countWhitespaceTokens', () => {
  it('counts whitespace-separated tokens', () => {
    expect(countWhitespaceTokens('Am Morgen stehe ich auf.')).toBe(5);
    expect(countWhitespaceTokens('   ')).toBe(0);
  });
});

describe('schemas validate real pack shapes', () => {
  it('accepts a valid grammar exercise', () => {
    const ok = grammarExercise.safeParse({
      id: 'G01-01',
      stage: 1,
      type: 'translate_en_de',
      prompt: 'I learn German every day.',
      model_answer: 'Ich lerne jeden Tag Deutsch.',
      accepted_answers: ['Jeden Tag lerne ich Deutsch.'],
      target: 'main_clause_verb_position',
      explanation: 'The conjugated verb is in position two.',
    });
    expect(ok.success).toBe(true);
  });

  it('rejects a grammar exercise missing the model answer', () => {
    const bad = grammarExercise.safeParse({
      id: 'G01-01',
      stage: 1,
      type: 'translate_en_de',
      prompt: 'x',
      target: 't',
      explanation: 'e',
    });
    expect(bad.success).toBe(false);
  });

  it('rejects an email task with an out-of-range stage', () => {
    const bad = emailTask.safeParse({
      id: 'E99',
      stage: 99,
      title: 't',
      register: 'Formal',
      scenario: 's',
      required_points: ['a'],
      suggested_word_count: '30–50',
      time_limit_minutes: 15,
      sample_answer: 'a',
      rubric: {},
    });
    expect(bad.success).toBe(false);
  });
});
