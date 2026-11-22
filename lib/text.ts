/**
 * Shared text helpers.
 *
 * `countWords` is used by the Dictation module (word counter) and by the Email
 * module (suggested word range). It lives here so it has one tested definition.
 */
export function countWords(input: string): number {
  if (!input) return 0;
  const matches = input
    .trim()
    .replace(/\s+/g, ' ')
    .match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu);
  return matches ? matches.length : 0;
}

/**
 * Normalise a string for lenient comparison in later milestones:
 * lowercase and collapse whitespace. German special characters are preserved
 * here on purpose — umlaut/ß handling is scored separately, not erased.
 */
export function normalizeWhitespace(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}
