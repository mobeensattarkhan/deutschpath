import { z } from 'zod';

/**
 * Zod schemas + TypeScript types for the DeutschPath A2 resource-pack content.
 *
 * These validate the RAW shapes found in the resource pack JSON before import.
 * They are intentionally lenient where the pack is (e.g. `register` is a free
 * label that the import layer normalises) and strict where correctness matters
 * (ids, stage numbers, non-empty German text).
 *
 * Self-contained: imports only `zod`, so it can be used both by the Next.js app
 * and by the standalone import script.
 */

const stageNumber = z.number().int().min(1).max(30);
const nonEmpty = z.string().trim().min(1);

// --- Curriculum stage maps -------------------------------------------------
export const grammarStageMapItem = z.object({
  stage: stageNumber,
  title: nonEmpty,
  objective: nonEmpty,
  phase: z.string().optional(),
  question_count_target: z.number().int().positive().optional(),
  content_status: z.string().optional(),
});

export const dictationStageMapItem = z.object({
  stage: stageNumber,
  theme: nonEmpty,
  target_words: z.number().int().positive(),
  suggested_time_minutes: z.number().int().positive(),
  audio_locale: z.string().optional(),
  playback_modes: z.array(z.string()).optional(),
  content_status: z.string().optional(),
});

export const emailStageMapItem = z.object({
  stage: stageNumber,
  topic: nonEmpty,
  register: z.string().optional(),
  required_points: z.array(z.string()).optional(),
  suggested_word_count: z.string().optional(),
  suggested_time_minutes: z.number().int().positive().optional(),
  content_status: z.string().optional(),
});

// --- Content items ---------------------------------------------------------
export const grammarExercise = z.object({
  id: nonEmpty,
  stage: stageNumber,
  type: nonEmpty,
  prompt: nonEmpty,
  model_answer: nonEmpty,
  accepted_answers: z.array(z.string()).default([]),
  target: nonEmpty,
  explanation: nonEmpty,
  source_note: z.string().optional(),
  review_status: z.string().optional(),
});

export const dictationPassage = z.object({
  id: nonEmpty,
  stage: stageNumber,
  title: nonEmpty,
  transcript: nonEmpty,
  actual_word_count: z.number().int().positive(),
  target_words_from_stage_config: z.number().int().positive().optional(),
  locale: z.string().default('de-DE'),
  voice: z.string().optional(),
  source: z.string().optional(),
  review_status: z.string().optional(),
  notes: z.string().optional(),
});

export const emailRubric = z.record(z.string(), z.unknown());

export const emailTask = z.object({
  id: nonEmpty,
  stage: stageNumber,
  title: nonEmpty,
  register: nonEmpty, // raw label: "Formal" | "Informal" | "Formal or informal" | "Mixed"
  scenario: nonEmpty,
  required_points: z.array(z.string()).min(1),
  suggested_word_count: nonEmpty, // raw label e.g. "30–50"
  time_limit_minutes: z.number().int().positive(),
  sample_answer: nonEmpty,
  rubric: emailRubric,
  content_status: z.string().optional(),
  source_note: z.string().optional(),
});

export const vocabularyItem = z.object({
  german: nonEmpty,
  english: nonEmpty,
  topic: z.string().optional(),
  part_of_speech: z.string().optional(),
  form_or_note: z.string().optional(),
  source_note: z.string().optional(),
});

// Array schemas for whole files.
export const grammarStageMapFile = z.array(grammarStageMapItem);
export const dictationStageMapFile = z.array(dictationStageMapItem);
export const emailStageMapFile = z.array(emailStageMapItem);
export const grammarExerciseFile = z.array(grammarExercise);
export const dictationPassageFile = z.array(dictationPassage);
export const emailTaskFile = z.array(emailTask);
export const vocabularyFile = z.array(vocabularyItem);

export type GrammarStageMapItem = z.infer<typeof grammarStageMapItem>;
export type DictationStageMapItem = z.infer<typeof dictationStageMapItem>;
export type EmailStageMapItem = z.infer<typeof emailStageMapItem>;
export type GrammarExercise = z.infer<typeof grammarExercise>;
export type DictationPassage = z.infer<typeof dictationPassage>;
export type EmailTask = z.infer<typeof emailTask>;
export type VocabularyItem = z.infer<typeof vocabularyItem>;
