import type { ConjugationForm, ConjugationRule, VerbClass } from './types';
import { VERB_CLASSES } from './types';

const godanRows = [
  { ending: 'う', i: 'い', a: 'わ', te: 'って', ta: 'った' },
  { ending: 'く', i: 'き', a: 'か', te: 'いて', ta: 'いた' },
  { ending: 'ぐ', i: 'ぎ', a: 'が', te: 'いで', ta: 'いだ' },
  { ending: 'す', i: 'し', a: 'さ', te: 'して', ta: 'した' },
  { ending: 'つ', i: 'ち', a: 'た', te: 'って', ta: 'った' },
  { ending: 'ぬ', i: 'に', a: 'な', te: 'んで', ta: 'んだ' },
  { ending: 'ぶ', i: 'び', a: 'ば', te: 'んで', ta: 'んだ' },
  { ending: 'む', i: 'み', a: 'ま', te: 'んで', ta: 'んだ' },
  { ending: 'る', i: 'り', a: 'ら', te: 'って', ta: 'った' },
] as const;

const politeEndings = {
  masu: 'ます',
  masen: 'ません',
  mashita: 'ました',
  masendeshita: 'ませんでした',
} as const;

const negativeEndings = { nai: 'ない', nakatta: 'なかった' } as const;

const dictionaryRules: ConjugationRule[] = VERB_CLASSES.map((verbClass) => ({
  id: `${verbClass}-dictionary`,
  class: verbClass,
  form: 'dictionary',
  matchEnding: '',
  replaceWith: '',
  explanation: 'The dictionary form stays unchanged.',
}));

const godanRules: ConjugationRule[] = godanRows.flatMap(({ ending, i, a, te, ta }) => [
  ...Object.entries(politeEndings).map(([form, suffix]): ConjugationRule => ({
    id: `godan-${ending}-${form}`,
    class: 'godan',
    form: form as ConjugationForm,
    matchEnding: ending,
    replaceWith: i + suffix,
    explanation: `Change ${ending} to its い-row (${i}) and add ${suffix}.`,
  })),
  ...Object.entries(negativeEndings).map(([form, suffix]): ConjugationRule => ({
    id: `godan-${ending}-${form}`,
    class: 'godan',
    form: form as ConjugationForm,
    matchEnding: ending,
    replaceWith: a + suffix,
    explanation: `Change ${ending} to its あ-row (${a}) and add ${suffix}.`,
  })),
  ...(['te', 'ta'] as const).map((form): ConjugationRule => ({
    id: `godan-${ending}-${form}`,
    class: 'godan',
    form,
    matchEnding: ending,
    replaceWith: form === 'te' ? te : ta,
    explanation: `The ${ending} ending changes to ${form === 'te' ? te : ta} in the ${form} form.`,
  })),
]);

const ikuRules: ConjugationRule[] = (['te', 'ta'] as const).map((form) => ({
  id: `godan-iku-${form}`,
  class: 'godan',
  form,
  matchEnding: 'く',
  replaceWith: form === 'te' ? 'って' : 'った',
  condition: 'iku-reading',
  explanation: `いく is an exception: く becomes ${form === 'te' ? 'って' : 'った'}, not ${form === 'te' ? 'いて' : 'いた'}.`,
}));

const ichidanRules: ConjugationRule[] = [
  ...Object.entries(politeEndings),
  ...Object.entries(negativeEndings),
  ['te', 'て'],
  ['ta', 'た'],
].map(([form, suffix]) => ({
  id: `ichidan-${form}`,
  class: 'ichidan',
  form: form as ConjugationForm,
  matchEnding: 'る',
  replaceWith: suffix,
  explanation: `Remove る and add ${suffix}.`,
}));

const suruEndings = {
  masu: 'します',
  masen: 'しません',
  mashita: 'しました',
  masendeshita: 'しませんでした',
  nai: 'しない',
  nakatta: 'しなかった',
  te: 'して',
  ta: 'した',
} as const;

const suruRules: ConjugationRule[] = Object.entries(suruEndings).map(([form, suffix]) => ({
  id: `suru-${form}`,
  class: 'suru',
  form: form as ConjugationForm,
  matchEnding: 'する',
  replaceWith: suffix,
  explanation: `Replace する with ${suffix}, including in compound する verbs.`,
}));

const kuruEndings = {
  masu: ['来ます', 'きます'],
  masen: ['来ません', 'きません'],
  mashita: ['来ました', 'きました'],
  masendeshita: ['来ませんでした', 'きませんでした'],
  nai: ['来ない', 'こない'],
  nakatta: ['来なかった', 'こなかった'],
  te: ['来て', 'きて'],
  ta: ['来た', 'きた'],
} as const;

const kuruRules: ConjugationRule[] = Object.entries(kuruEndings).flatMap(
  ([form, [written, reading]]) => [
    {
      id: `kuru-written-${form}`,
      class: 'kuru' as const,
      form: form as ConjugationForm,
      matchEnding: '来る',
      replaceWith: written,
      readingMatchEnding: 'くる',
      readingReplaceWith: reading,
      explanation: `Replace 来る with ${written}; its reading changes from くる to ${reading}.`,
    },
    {
      id: `kuru-kana-${form}`,
      class: 'kuru' as const,
      form: form as ConjugationForm,
      matchEnding: 'くる',
      replaceWith: reading,
      explanation: `Replace くる with ${reading}, including in compound くる verbs.`,
    },
  ],
);

/** The complete, ordered rule list used by the engine and by Learn views. */
export const CONJUGATION_RULES: readonly ConjugationRule[] = Object.freeze([
  ...dictionaryRules,
  ...ikuRules,
  ...godanRules,
  ...ichidanRules,
  ...suruRules,
  ...kuruRules,
].map((rule) => Object.freeze(rule)));
export const RULES = CONJUGATION_RULES;

export interface RuleFilter {
  class?: VerbClass;
  form?: ConjugationForm;
}

export function getRules(filter: RuleFilter = {}): ConjugationRule[] {
  return CONJUGATION_RULES.filter(
    (rule) =>
      (filter.class === undefined || rule.class === filter.class) &&
      (filter.form === undefined || rule.form === filter.form),
  );
}
