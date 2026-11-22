'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button, buttonClasses } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';

interface SafeQuestion {
  id: string;
  question_type: string;
  prompt: string;
  source_text: string | null;
  target: string | null;
}
interface Correction {
  id: string;
  required_correction: string;
  original_text: string;
  is_resolved: boolean;
}
interface SubmitResult {
  isCorrect: boolean;
  score: number;
  needsReview: boolean;
  feedback: string;
  errors: { correction: string; category: string; blocking: boolean; explanation: string }[];
  optionalSuggestions: string[];
  corrections: Correction[];
}

async function postJson<T>(url: string, body: unknown): Promise<{ ok: boolean; data?: T; message?: string }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    return { ok: false, message: json?.error?.message ?? 'Something went wrong.' };
  }
  return { ok: true, data: json.data as T };
}

export function GrammarStagePlayer({
  stageId,
  stageTitle,
  stageObjective,
  passingScore,
  questions,
}: {
  stageId: string;
  stageTitle: string;
  stageObjective: string | null;
  passingScore: number;
  questions: SafeQuestion[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, SubmitResult>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [completion, setCompletion] = useState<{ done: boolean; message: string } | null>(null);

  const unresolvedCount = useMemo(
    () =>
      Object.values(results).reduce(
        (n, r) => n + r.corrections.filter((c) => !c.is_resolved).length,
        0,
      ),
    [results],
  );
  const allSubmitted = questions.length > 0 && questions.every((q) => results[q.id]);
  const canComplete = allSubmitted && unresolvedCount === 0 && !completion?.done;

  async function submit(q: SafeQuestion) {
    const answer = (answers[q.id] ?? '').trim();
    if (!answer) return;
    setBusy(q.id);
    const r = await postJson<SubmitResult>('/api/grammar/submit', {
      stageId,
      questionId: q.id,
      answer,
    });
    setBusy(null);
    if (!r.ok || !r.data) {
      setResults((p) => ({
        ...p,
        [q.id]: {
          isCorrect: false,
          score: 0,
          needsReview: false,
          feedback: r.message ?? 'Error.',
          errors: [],
          optionalSuggestions: [],
          corrections: [],
        },
      }));
      return;
    }
    setResults((p) => ({ ...p, [q.id]: r.data! }));
  }

  async function resolveCorrection(questionId: string, correctionId: string, value: string) {
    if (!value.trim()) return;
    setBusy(correctionId);
    const r = await postJson<{ resolved: boolean; feedback: string }>('/api/grammar/correct', {
      correctionId,
      learnerCorrection: value.trim(),
    });
    setBusy(null);
    if (!r.ok || !r.data) return;
    setResults((prev) => {
      const res = prev[questionId];
      if (!res) return prev;
      return {
        ...prev,
        [questionId]: {
          ...res,
          corrections: res.corrections.map((c) =>
            c.id === correctionId ? { ...c, is_resolved: r.data!.resolved } : c,
          ),
        },
      };
    });
  }

  async function completeStage() {
    setBusy('complete');
    const r = await postJson<{ completed: boolean; unlocked_next?: boolean; best_score?: number }>(
      '/api/stages/complete',
      { stageId },
    );
    setBusy(null);
    if (!r.ok || !r.data) {
      setCompletion({ done: false, message: r.message ?? 'Could not complete the stage.' });
      return;
    }
    if (r.data.completed) {
      setCompletion({
        done: true,
        message: r.data.unlocked_next
          ? 'Stage complete! The next stage is now unlocked.'
          : 'Stage complete!',
      });
    } else {
      setCompletion({
        done: false,
        message: `Not yet — reach ${passingScore}% and resolve all required corrections.`,
      });
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Grammar · Stage {stageTitle}
        </p>
        <h1 className="text-2xl font-bold">{stageTitle}</h1>
        {stageObjective ? <p className="text-muted-foreground">{stageObjective}</p> : null}
        <p className="text-sm text-muted-foreground">Passing score: {passingScore}%</p>
      </header>

      {questions.length === 0 ? (
        <Alert tone="info">
          No published questions for this stage yet. Content is added and reviewed before it appears
          here.
        </Alert>
      ) : null}

      <ol className="space-y-4">
        {questions.map((q, i) => {
          const res = results[q.id];
          return (
            <li key={q.id}>
              <Card>
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">
                      {i + 1}. {q.prompt}
                    </p>
                    {res ? (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          res.isCorrect
                            ? 'bg-success-soft text-success'
                            : res.needsReview
                              ? 'bg-accent-soft text-foreground'
                              : 'bg-danger-soft text-danger'
                        }`}
                      >
                        {res.isCorrect ? 'Correct' : res.needsReview ? 'Needs review' : 'Score ' + res.score + '%'}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      aria-label={`Answer for question ${i + 1}`}
                      value={answers[q.id] ?? ''}
                      onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                      placeholder="Type your answer in German"
                    />
                    <Button onClick={() => submit(q)} disabled={busy === q.id}>
                      {busy === q.id ? 'Checking…' : res ? 'Resubmit' : 'Check'}
                    </Button>
                  </div>

                  {res ? (
                    <Alert tone={res.isCorrect ? 'success' : res.needsReview ? 'info' : 'error'}>
                      {res.feedback}
                    </Alert>
                  ) : null}

                  {res?.optionalSuggestions.map((s, idx) => (
                    <p key={idx} className="text-sm text-muted-foreground">
                      Suggestion: {s}
                    </p>
                  ))}

                  {res?.corrections.filter((c) => !c.is_resolved).length ? (
                    <div className="space-y-2 rounded-[var(--radius)] border border-border bg-surface-muted p-3">
                      <p className="text-sm font-medium">Required correction</p>
                      {res.corrections
                        .filter((c) => !c.is_resolved)
                        .map((c) => (
                          <CorrectionRow
                            key={c.id}
                            busy={busy === c.id}
                            onResolve={(val) => resolveCorrection(q.id, c.id, val)}
                          />
                        ))}
                    </div>
                  ) : null}

                  {res?.corrections.length && res.corrections.every((c) => c.is_resolved) ? (
                    <p className="text-sm text-success">All corrections resolved.</p>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button onClick={completeStage} disabled={!canComplete || busy === 'complete'}>
          {busy === 'complete' ? 'Completing…' : 'Complete stage'}
        </Button>
        <Link href="/grammar" className={buttonClasses({ variant: 'secondary' })}>
          Back to stages
        </Link>
        {!canComplete && !completion?.done ? (
          <span className="text-sm text-muted-foreground">
            {!allSubmitted
              ? 'Answer every question to finish.'
              : unresolvedCount > 0
                ? `Resolve ${unresolvedCount} correction${unresolvedCount === 1 ? '' : 's'} to finish.`
                : ''}
          </span>
        ) : null}
      </div>

      {completion ? (
        <Alert tone={completion.done ? 'success' : 'error'}>{completion.message}</Alert>
      ) : null}
    </div>
  );
}

function CorrectionRow({ busy, onResolve }: { busy: boolean; onResolve: (v: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input
        aria-label="Your correction"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Write the corrected German sentence"
      />
      <Button variant="secondary" onClick={() => onResolve(val)} disabled={busy}>
        {busy ? 'Checking…' : 'Submit correction'}
      </Button>
    </div>
  );
}
