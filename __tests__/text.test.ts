import { describe, it, expect } from 'vitest';
import { countWords, normalizeWhitespace } from '@/lib/text';

describe('countWords', () => {
  it('returns 0 for empty or whitespace', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
  });

  it('counts simple words', () => {
    expect(countWords('Ich lerne Deutsch')).toBe(3);
  });

  it('collapses multiple spaces and newlines', () => {
    expect(countWords('Ich   lerne\n\n Deutsch heute')).toBe(4);
  });

  it('counts German words with umlauts and ß as single words', () => {
    expect(countWords('Schöne Grüße aus Düsseldorf')).toBe(4);
  });

  it('treats hyphenated and apostrophed words as one', () => {
    expect(countWords("E-Mail geht's gut")).toBe(3);
  });

  it('ignores standalone punctuation', () => {
    expect(countWords('Hallo , wie geht es dir ?')).toBe(5);
  });
});

describe('normalizeWhitespace', () => {
  it('trims and collapses internal whitespace', () => {
    expect(normalizeWhitespace('  Ich   lerne \n Deutsch ')).toBe('Ich lerne Deutsch');
  });

  it('preserves German special characters', () => {
    expect(normalizeWhitespace('Grüße  über  Köln')).toBe('Grüße über Köln');
  });
});
