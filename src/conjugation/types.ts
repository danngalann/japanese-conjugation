export const CONJUGATION_FORMS = [
  'dictionary',
  'masu',
  'masen',
  'mashita',
  'masendeshita',
  'nai',
  'nakatta',
  'te',
  'ta',
] as const;

export type ConjugationForm = (typeof CONJUGATION_FORMS)[number];
export type Form = ConjugationForm;

export const FORMS: readonly { id: Form; label: string }[] = [
  { id: 'dictionary', label: 'Dictionary' },
  { id: 'masu', label: 'Polite present' },
  { id: 'masen', label: 'Polite negative' },
  { id: 'mashita', label: 'Polite past' },
  { id: 'masendeshita', label: 'Polite past negative' },
  { id: 'nai', label: 'Plain negative' },
  { id: 'nakatta', label: 'Plain past negative' },
  { id: 'te', label: 'て form' },
  { id: 'ta', label: 'Plain past' },
];

export const VERB_CLASSES = ['godan', 'ichidan', 'suru', 'kuru'] as const;

export type VerbClass = (typeof VERB_CLASSES)[number];

export interface Verb {
  id: string;
  expression: string;
  reading: string;
  meaning: string;
  class: VerbClass;
  common?: boolean;
  level?: 'core' | 'common' | 'all';
}

export interface ConjugationRule {
  id: string;
  class: VerbClass;
  form: ConjugationForm;
  matchEnding: string;
  replaceWith: string;
  explanation: string;
  /** When omitted, the written suffix and replacement also apply to the reading. */
  readingMatchEnding?: string;
  readingReplaceWith?: string;
  /** The special 行く sound change applies to いく, not every verb ending in く. */
  condition?: 'iku-reading';
}

export interface ConjugationSegments {
  stem: string;
  removed: string;
  added: string;
}

export interface ConjugationTransformation {
  from: string;
  to: string;
  explanation: string;
}

export interface ConjugationResult {
  verb: Verb;
  form: ConjugationForm;
  verbClass: VerbClass;
  dictionaryForm: string;
  result: string;
  expression: string;
  reading: string;
  rule: ConjugationRule;
  segments: ConjugationSegments;
  readingSegments: ConjugationSegments;
  transformations: ConjugationTransformation[];
}
