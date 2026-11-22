/**
 * Pure comparison helpers for deterministic grammar checks.
 * German special characters are preserved; only surface punctuation/case and
 * whitespace are normalised for lenient matching.
 */
export function normalizeForMatch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^["'„“”«»]+|["'„“”«».!?,;:]+$/g, '')
    .trim();
}

/** True if the answer matches the model answer or any accepted alternative. */
export function isAcceptedAnswer(
  answer: string,
  modelAnswer: string,
  acceptedAnswers: string[],
): boolean {
  const a = normalizeForMatch(answer);
  if (!a) return false;
  const candidates = [modelAnswer, ...acceptedAnswers].map(normalizeForMatch);
  return candidates.includes(a);
}

/** Jaccard token overlap in [0,1] over normalised whitespace tokens. */
export function tokenOverlap(a: string, b: string): number {
  const ta = new Set(normalizeForMatch(a).split(' ').filter(Boolean));
  const tb = new Set(normalizeForMatch(b).split(' ').filter(Boolean));
  if (ta.size === 0 && tb.size === 0) return 1;
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  const union = ta.size + tb.size - inter;
  return inter / union;
}
