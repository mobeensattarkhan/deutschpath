/**
 * DeutschPath content import.
 *
 *   npm run import:content             # dry-run: validate + report, no DB writes
 *   npm run import:content -- --commit # upsert into Supabase (needs env vars)
 *   npm run import:content -- --pack=/path/to/content/source
 *
 * Commit mode requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 * The import is idempotent (upsert on stable external ids) and NEVER publishes:
 * all content lands as `needs_review` or `draft`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  grammarStageMapFile,
  dictationStageMapFile,
  emailStageMapFile,
  grammarExerciseFile,
  dictationPassageFile,
  emailTaskFile,
  vocabularyFile,
} from '../lib/content/schemas.ts';
import {
  parseWordRange,
  normalizeRegister,
  mapImportStatus,
  countWhitespaceTokens,
} from '../lib/content/mapping.ts';

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const packArg = args.find((a) => a.startsWith('--pack='));
const PACK = packArg ? packArg.split('=')[1]! : join(process.cwd(), 'content', 'source');

const warnings: string[] = [];
const warn = (s: string) => warnings.push(s);
function read(name: string): unknown {
  return JSON.parse(readFileSync(join(PACK, name), 'utf8'));
}

// --- Load + validate -------------------------------------------------------
const grammarMap = grammarStageMapFile.parse(read('grammar_30_stage_map.json'));
const dictationMap = dictationStageMapFile.parse(read('dictation_30_stage_map.json'));
const emailMap = emailStageMapFile.parse(read('email_30_stage_map.json'));
const grammarExercises = grammarExerciseFile.parse(read('grammar_exercise_seed.json'));
const dictationPassages = dictationPassageFile.parse(read('original_dictation_passages_01_12.json'));
const emailTasks = emailTaskFile.parse(read('email_tasks_30.json'));
const vocabulary = vocabularyFile.parse(read('a2_thematic_vocabulary_starter.json'));

// --- Map to DB rows --------------------------------------------------------
type StageRow = {
  module: 'grammar' | 'dictation' | 'email';
  stage_number: number;
  title: string;
  description: string;
  passing_score: number;
  time_limit_seconds: number | null;
  completion_config: Record<string, unknown>;
};

const stageRows: StageRow[] = [
  ...grammarMap.map((s) => ({
    module: 'grammar' as const,
    stage_number: s.stage,
    title: s.title,
    description: s.objective,
    passing_score: 80,
    time_limit_seconds: null,
    completion_config: { question_count_target: s.question_count_target ?? 10, phase: s.phase },
  })),
  ...dictationMap.map((s) => ({
    module: 'dictation' as const,
    stage_number: s.stage,
    title: s.theme,
    description: `Dictation: ${s.theme}`,
    passing_score: 80,
    time_limit_seconds: s.suggested_time_minutes * 60,
    completion_config: {
      target_words: s.target_words,
      scoring_weights: { word: 0.8, capitalisation: 0.1, special_chars: 0.05, punctuation: 0.05 },
    },
  })),
  ...emailMap.map((s) => ({
    module: 'email' as const,
    stage_number: s.stage,
    title: s.topic,
    description: `Email writing: ${s.topic}`,
    passing_score: 80,
    time_limit_seconds: (s.suggested_time_minutes ?? 15) * 60,
    completion_config: { required_points: s.required_points?.length ?? 0 },
  })),
];

const questionRows = grammarExercises.map((q) => ({
  external_id: q.id,
  stage_module: 'grammar' as const,
  stage_number: q.stage,
  question_type: q.type,
  prompt: q.prompt,
  model_answer: q.model_answer,
  accepted_answers: q.accepted_answers,
  target: q.target,
  grammar_tags: { target: q.target },
  explanation: q.explanation,
  source_note: q.source_note ?? 'Original DeutschPath practice content',
  content_status: mapImportStatus(q.review_status),
}));

const passageRows = dictationPassages.map((p) => {
  const recomputed = countWhitespaceTokens(p.transcript);
  if (recomputed !== p.actual_word_count) {
    warn(`dictation ${p.id}: actual_word_count ${p.actual_word_count} != recomputed ${recomputed}`);
  }
  const target = dictationMap.find((d) => d.stage === p.stage)?.target_words;
  if (target && recomputed < target * 0.8) {
    warn(`dictation ${p.id}: ${recomputed} words is well below stage target ${target} (author/extend before publish)`);
  }
  return {
    external_id: p.id,
    stage_module: 'dictation' as const,
    stage_number: p.stage,
    title: p.title,
    transcript: p.transcript,
    word_count: recomputed,
    topic: dictationMap.find((d) => d.stage === p.stage)?.theme ?? null,
    locale: p.locale,
    source_note: [p.source, p.notes].filter(Boolean).join(' | '),
    content_status: mapImportStatus(p.review_status),
  };
});

const emailRows = emailTasks.map((t) => {
  const reg = normalizeRegister(t.register);
  if (reg.register === null) warn(`email ${t.id}: ambiguous register "${t.register}" imported as NULL + label`);
  const range = parseWordRange(t.suggested_word_count);
  if (!range) warn(`email ${t.id}: could not parse word range "${t.suggested_word_count}"`);
  return {
    external_id: t.id,
    stage_module: 'email' as const,
    stage_number: t.stage,
    title: t.title,
    scenario: t.scenario,
    register: reg.register,
    register_label: reg.label,
    required_points: t.required_points,
    suggested_word_min: range?.min ?? null,
    suggested_word_max: range?.max ?? null,
    suggested_word_count_label: t.suggested_word_count,
    time_limit_seconds: t.time_limit_minutes * 60,
    rubric: t.rubric,
    sample_answer: t.sample_answer,
    source_note: t.source_note ?? 'Original DeutschPath practice content',
    content_status: mapImportStatus(t.content_status),
  };
});

const vocabRows = vocabulary.map((v) => ({
  german: v.german,
  english: v.english,
  topic: v.topic ?? null,
  part_of_speech: v.part_of_speech ?? null,
  form_or_note: v.form_or_note ?? null,
  source_note: v.source_note ?? null,
  content_status: 'needs_review' as const,
}));

// --- Report ----------------------------------------------------------------
function countBy<T>(rows: T[], key: (r: T) => string): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, r) => {
    const k = key(r);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

console.log(`\n=== DeutschPath content import (${COMMIT ? 'COMMIT' : 'DRY-RUN'}) ===`);
console.log(`source: ${PACK}\n`);
console.log('Stages to upsert:');
console.log(`  grammar: ${stageRows.filter((s) => s.module === 'grammar').length}`);
console.log(`  dictation: ${stageRows.filter((s) => s.module === 'dictation').length}`);
console.log(`  email: ${stageRows.filter((s) => s.module === 'email').length}`);
console.log('\nContent to upsert (status breakdown):');
console.log(`  grammar questions: ${questionRows.length} ${JSON.stringify(countBy(questionRows, (r) => r.content_status))}`);
console.log(`  dictation passages: ${passageRows.length} ${JSON.stringify(countBy(passageRows, (r) => r.content_status))}`);
console.log(`  email tasks: ${emailRows.length} ${JSON.stringify(countBy(emailRows, (r) => r.content_status))}`);
console.log(`  vocabulary: ${vocabRows.length} (needs_review)`);

const gramStagesWith = new Set(questionRows.map((q) => q.stage_number));
console.log('\nContent gaps (to author later, kept unpublished):');
console.log(`  grammar stages with 0 questions: ${[...Array(30)].map((_, i) => i + 1).filter((s) => !gramStagesWith.has(s)).join(', ')}`);
const passStages = new Set(passageRows.map((p) => p.stage_number));
console.log(`  dictation stages with 0 passages: ${[...Array(30)].map((_, i) => i + 1).filter((s) => !passStages.has(s)).join(', ')}`);

if (warnings.length) {
  console.log(`\nWarnings (${warnings.length}):`);
  warnings.forEach((w) => console.log(`  - ${w}`));
} else {
  console.log('\nNo warnings.');
}

const published =
  [...questionRows, ...passageRows, ...emailRows].filter((r) => r.content_status === 'published').length;
console.log(`\nIntegrity check — items that would be published by this import: ${published} (must be 0)`);
if (published !== 0) {
  console.error('ABORT: import would publish unreviewed content.');
  process.exit(1);
}

if (!COMMIT) {
  console.log('\nDry-run only. Re-run with --commit (and Supabase env vars) to write to the database.\n');
  process.exit(0);
}

// --- Commit ----------------------------------------------------------------
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('\nCOMMIT requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const { createClient } = await import('@supabase/supabase-js');
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

async function must<T>(label: string, p: Promise<{ error: unknown; data: T }>): Promise<T> {
  const { data, error } = await p;
  if (error) {
    console.error(`FAILED: ${label}`, error);
    process.exit(1);
  }
  return data;
}

// 1) Course
await must('upsert course', db.from('courses').upsert({ code: 'de-A2', title: 'German A2', level: 'A2', is_published: true }, { onConflict: 'code' }) as never);
const course = await must<{ id: string }[]>('load course', db.from('courses').select('id').eq('code', 'de-A2').limit(1) as never);
const courseId = course[0]!.id;

// 2) Modules
const moduleMeta = [
  { code: 'grammar', title: 'Grammar & Tenses', sort_order: 1 },
  { code: 'dictation', title: 'Dictation', sort_order: 2 },
  { code: 'email', title: 'Email Writing', sort_order: 3 },
];
await must('upsert modules', db.from('modules').upsert(moduleMeta.map((m) => ({ course_id: courseId, ...m, is_published: true })), { onConflict: 'course_id,code' }) as never);
const modules = await must<{ id: string; code: string }[]>('load modules', db.from('modules').select('id, code').eq('course_id', courseId) as never);
const moduleId: Record<string, string> = Object.fromEntries(modules.map((m) => [m.code, m.id]));

// 3) Stages
await must('upsert stages', db.from('stages').upsert(
  stageRows.map((s) => ({
    module_id: moduleId[s.module],
    stage_number: s.stage_number,
    title: s.title,
    description: s.description,
    passing_score: s.passing_score,
    time_limit_seconds: s.time_limit_seconds,
    completion_config: s.completion_config,
    is_published: true,
  })),
  { onConflict: 'module_id,stage_number' },
) as never);
const stages = await must<{ id: string; module_id: string; stage_number: number }[]>(
  'load stages',
  db.from('stages').select('id, module_id, stage_number').in('module_id', Object.values(moduleId)) as never,
);
const stageId = (module: string, n: number) =>
  stages.find((s) => s.module_id === moduleId[module] && s.stage_number === n)?.id;

// 4) Content (needs_review / draft)
await must('upsert questions', db.from('questions').upsert(
  questionRows.map((q) => ({
    external_id: q.external_id,
    stage_id: stageId('grammar', q.stage_number),
    question_type: q.question_type,
    prompt: q.prompt,
    model_answer: q.model_answer,
    accepted_answers: q.accepted_answers,
    target: q.target,
    grammar_tags: q.grammar_tags,
    explanation: q.explanation,
    source_note: q.source_note,
    content_status: q.content_status,
    is_published: false,
  })),
  { onConflict: 'external_id' },
) as never);

await must('upsert dictation', db.from('dictation_passages').upsert(
  passageRows.map((p) => ({
    external_id: p.external_id,
    stage_id: stageId('dictation', p.stage_number),
    title: p.title,
    transcript: p.transcript,
    word_count: p.word_count,
    topic: p.topic,
    locale: p.locale,
    source_note: p.source_note,
    content_status: p.content_status,
    is_published: false,
  })),
  { onConflict: 'external_id' },
) as never);

await must('upsert email tasks', db.from('email_tasks').upsert(
  emailRows.map((t) => ({
    external_id: t.external_id,
    stage_id: stageId('email', t.stage_number),
    title: t.title,
    scenario: t.scenario,
    register: t.register,
    register_label: t.register_label,
    required_points: t.required_points,
    suggested_word_min: t.suggested_word_min,
    suggested_word_max: t.suggested_word_max,
    suggested_word_count_label: t.suggested_word_count_label,
    time_limit_seconds: t.time_limit_seconds,
    rubric: t.rubric,
    sample_answer: t.sample_answer,
    source_note: t.source_note,
    content_status: t.content_status,
    is_published: false,
  })),
  { onConflict: 'external_id' },
) as never);

await must('upsert vocabulary', db.from('vocabulary').upsert(
  vocabRows.map((v) => ({ course_id: courseId, ...v })),
  { onConflict: 'course_id,german,english' },
) as never);

console.log('\n✓ Commit complete. All content imported as draft / needs_review (nothing published).\n');
