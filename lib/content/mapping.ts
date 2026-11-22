/**
 * Pure helpers that map raw resource-pack values onto the database shape.
 * Kept pure + dependency-free so they are easy to unit test.
 */

export type ContentStatus = 'draft' | 'needs_review' | 'approved' | 'published';
export const CONTENT_STATUSES: ContentStatus[] = ['draft', 'needs_review', 'approved', 'published'];

export type Register = 'formal' | 'informal';

/** Count whitespace-separated tokens (the pack's dictation word-count rule). */
export function countWhitespaceTokens(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/**
 * Parse a word-count label like "30–50", "30-50" or "30 to 50" into {min,max}.
 * Returns null if it cannot be parsed. Handles en dash, em dash and hyphen.
 */
export function parseWordRange(label: string): { min: number; max: number } | null {
  const nums = label.match(/\d+/g);
  if (!nums || nums.length === 0) return null;
  if (nums.length === 1) {
    const n = Number(nums[0]);
    return { min: n, max: n };
  }
  const min = Number(nums[0]);
  const max = Number(nums[1]);
  if (Number.isNaN(min) || Number.isNaN(max)) return null;
  return { min: Math.min(min, max), max: Math.max(min, max) };
}

/**
 * Normalise a free-text register label onto the strict enum.
 * Ambiguous labels ("Formal or informal", "Mixed") map to `null` register,
 * keeping the original as `label` so the task can be presented either way.
 */
export function normalizeRegister(raw: string): { register: Register | null; label: string } {
  const v = raw.trim().toLowerCase();
  if (v === 'formal') return { register: 'formal', label: raw.trim() };
  if (v === 'informal') return { register: 'informal', label: raw.trim() };
  return { register: null, label: raw.trim() };
}

/**
 * Map a resource-pack review/status string onto our content-status workflow.
 *
 * IMPORTANT: import never yields `approved` or `published`. Even if source data
 * claims approval, we cap at `needs_review` so no unreviewed German content can
 * go live without an explicit human approval step.
 */
export function mapImportStatus(raw: string | undefined): ContentStatus {
  const v = (raw ?? '').trim().toLowerCase();
  const draftLike = ['outline_only', 'task_seed', 'passage_to_author', 'draft', 'outline'];
  if (draftLike.includes(v)) return 'draft';
  // everything else (needs_review variants, blank, or even "approved") → needs_review
  return 'needs_review';
}
