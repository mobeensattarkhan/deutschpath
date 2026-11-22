/**
 * Static product constants for Milestone 1.
 *
 * Curriculum CONTENT (lessons, questions, passages, tasks) is stored in the
 * database, not here. These are only stable product-level labels used by the
 * shell and dashboard before content endpoints exist.
 */
export const BRAND = {
  name: 'DeutschPath',
  tagline: 'Learn German step by step. Practise every day. Master A2.',
  level: 'A2',
} as const;

export type ModuleKey = 'grammar' | 'dictation' | 'email';

export interface ModuleMeta {
  key: ModuleKey;
  /** English label shown in the UI. */
  title: string;
  /** German name of the activity, shown as a subtitle. */
  germanName: string;
  description: string;
  totalStages: number;
  /** App route for the module overview (built in later milestones). */
  href: string;
}

export const MODULES: ModuleMeta[] = [
  {
    key: 'grammar',
    title: 'Grammar & Tenses',
    germanName: 'Grammatik',
    description:
      'Learn A2 sentence structure and tenses, then build and correct real German sentences.',
    totalStages: 30,
    href: '/grammar',
  },
  {
    key: 'dictation',
    title: 'Dictation',
    germanName: 'Diktat',
    description:
      'Listen to German audio and type what you hear. Passages grow longer as you progress.',
    totalStages: 30,
    href: '/diktat',
  },
  {
    key: 'email',
    title: 'Email Writing',
    germanName: 'Schreiben',
    description:
      'Practise everyday A2 emails with clear scenarios and guided feedback on your writing.',
    totalStages: 30,
    href: '/schreiben',
  },
];
