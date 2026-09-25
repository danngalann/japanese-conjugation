import { CONJUGATION_RULES } from './rules';
import type {
  ConjugationForm,
  ConjugationResult,
  ConjugationRule,
  ConjugationSegments,
  Verb,
} from './types';
import { CONJUGATION_FORMS, VERB_CLASSES } from './types';

const godanEndings = new Set(['う', 'く', 'ぐ', 'す', 'つ', 'ぬ', 'ぶ', 'む', 'る']);

function validateVerb(verb: Verb): void {
  if (!verb || typeof verb !== 'object') {
    throw new TypeError('Verb must be an object.');
  }
  for (const field of ['id', 'expression', 'reading', 'meaning'] as const) {
    if (typeof verb[field] !== 'string' || !verb[field].trim()) {
      throw new TypeError(`Verb ${field} must be a non-empty string.`);
    }
  }
  if (!VERB_CLASSES.includes(verb.class)) {
    throw new RangeError(`Unknown verb class: ${String(verb.class)}.`);
  }
  if (
    verb.class !== 'kuru' &&
    (verb.expression.endsWith('来る') || verb.expression.endsWith('くる')) &&
    verb.reading.endsWith('くる')
  ) {
    throw new RangeError('来る / くる requires the kuru class.');
  }
  if (verb.class !== 'suru' && verb.expression.endsWith('する') && verb.reading.endsWith('する')) {
    throw new RangeError('する requires the suru class.');
  }
  if (verb.class === 'godan') {
    const ending = verb.expression.slice(-1);
    if (!godanEndings.has(ending) || !verb.reading.endsWith(ending)) {
      throw new RangeError('Godan expression and reading must share a valid final kana.');
    }
  } else {
    const expressionEnding = verb.class === 'ichidan' ? 'る' : verb.class === 'suru' ? 'する' : null;
    const readingEnding = verb.class === 'kuru' ? 'くる' : expressionEnding;
    if (
      (expressionEnding
        ? !verb.expression.endsWith(expressionEnding)
        : !verb.expression.endsWith('来る') && !verb.expression.endsWith('くる')) ||
      !verb.reading.endsWith(readingEnding!)
    ) {
      throw new RangeError(`Expression or reading does not end in a ${verb.class} verb ending.`);
    }
  }
}

function matches(rule: ConjugationRule, verb: Verb): boolean {
  if (
    !verb.expression.endsWith(rule.matchEnding) ||
    !verb.reading.endsWith(rule.readingMatchEnding ?? rule.matchEnding)
  ) {
    return false;
  }
  if (rule.condition === 'iku-reading') {
    return (
      verb.reading.endsWith('いく') &&
      (verb.expression.endsWith('行く') || verb.expression.endsWith('いく'))
    );
  }
  return true;
}

function applyRule(source: string, ending: string, replacement: string): ConjugationSegments {
  return {
    stem: source.slice(0, source.length - ending.length),
    removed: ending,
    added: replacement,
  };
}

export function conjugate(verb: Verb, form: ConjugationForm): ConjugationResult {
  validateVerb(verb);
  if (!CONJUGATION_FORMS.includes(form)) {
    throw new RangeError(`Unknown conjugation form: ${String(form)}.`);
  }
  const rule = CONJUGATION_RULES.find(
    (candidate) => candidate.class === verb.class && candidate.form === form && matches(candidate, verb),
  );
  if (!rule) {
    throw new RangeError(`No ${form} rule matches ${verb.expression} (${verb.reading}).`);
  }
  const segments = applyRule(verb.expression, rule.matchEnding, rule.replaceWith);
  const readingSegments = applyRule(
    verb.reading,
    rule.readingMatchEnding ?? rule.matchEnding,
    rule.readingReplaceWith ?? rule.replaceWith,
  );
  const result = segments.stem + segments.added;
  return {
    verb,
    form,
    verbClass: verb.class,
    dictionaryForm: verb.expression,
    result,
    expression: result,
    reading: readingSegments.stem + readingSegments.added,
    rule,
    segments,
    readingSegments,
    transformations:
      form === 'dictionary'
        ? []
        : [{ from: segments.removed, to: segments.added, explanation: rule.explanation }],
  };
}

export function conjugateReading(verb: Verb, form: ConjugationForm): string {
  return conjugate(verb, form).reading;
}
