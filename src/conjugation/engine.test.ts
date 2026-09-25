import { describe, expect, it } from 'vitest';
import {
  CONJUGATION_FORMS,
  CONJUGATION_RULES,
  FORMS,
  RULES,
  conjugate,
  conjugateReading,
  getRules,
  type ConjugationForm,
  type Verb,
} from './index';

const forms = CONJUGATION_FORMS;
type Outputs = Record<ConjugationForm, string>;

function verb(expression: string, reading: string, verbClass: Verb['class']): Verb {
  return { id: expression, expression, reading, meaning: 'fixture', class: verbClass };
}

function checkAllForms(input: Verb, written: Outputs, readings: Outputs = written): void {
  for (const form of forms) {
    const result = conjugate(input, form);
    expect(result.expression, `${input.expression} ${form} expression`).toBe(written[form]);
    expect(result.result).toBe(written[form]);
    expect(result.dictionaryForm).toBe(input.expression);
    expect(result.verbClass).toBe(input.class);
    expect(result.reading, `${input.expression} ${form} reading`).toBe(readings[form]);
    expect(conjugateReading(input, form)).toBe(readings[form]);
    expect(result.segments.stem + result.segments.added).toBe(result.expression);
    expect(result.readingSegments.stem + result.readingSegments.added).toBe(result.reading);
    expect(result.segments.stem + result.segments.removed).toBe(input.expression);
    expect(result.readingSegments.stem + result.readingSegments.removed).toBe(input.reading);
    expect(result.rule.class).toBe(input.class);
    expect(result.rule.form).toBe(form);
    expect(result.transformations).toEqual(
      form === 'dictionary'
        ? []
        : [{
            from: result.segments.removed,
            to: result.segments.added,
            explanation: result.rule.explanation,
          }],
    );
  }
}

describe('conjugation engine', () => {
  it.each([
    ['買う', 'かう', '買います', '買いません', '買いました', '買いませんでした', '買わない', '買わなかった', '買って', '買った'],
    ['書く', 'かく', '書きます', '書きません', '書きました', '書きませんでした', '書かない', '書かなかった', '書いて', '書いた'],
    ['泳ぐ', 'およぐ', '泳ぎます', '泳ぎません', '泳ぎました', '泳ぎませんでした', '泳がない', '泳がなかった', '泳いで', '泳いだ'],
    ['話す', 'はなす', '話します', '話しません', '話しました', '話しませんでした', '話さない', '話さなかった', '話して', '話した'],
    ['待つ', 'まつ', '待ちます', '待ちません', '待ちました', '待ちませんでした', '待たない', '待たなかった', '待って', '待った'],
    ['死ぬ', 'しぬ', '死にます', '死にません', '死にました', '死にませんでした', '死なない', '死ななかった', '死んで', '死んだ'],
    ['遊ぶ', 'あそぶ', '遊びます', '遊びません', '遊びました', '遊びませんでした', '遊ばない', '遊ばなかった', '遊んで', '遊んだ'],
    ['読む', 'よむ', '読みます', '読みません', '読みました', '読みませんでした', '読まない', '読まなかった', '読んで', '読んだ'],
    ['帰る', 'かえる', '帰ります', '帰りません', '帰りました', '帰りませんでした', '帰らない', '帰らなかった', '帰って', '帰った'],
  ])('handles all forms of godan %s', (expression, reading, ...outputs) => {
    const written = Object.fromEntries(forms.map((form, i) => [form, i === 0 ? expression : outputs[i - 1]])) as Outputs;
    const suffix = expression.slice(-1);
    const writtenStem = expression.slice(0, -1);
    const readings = Object.fromEntries(
      forms.map((form) => [form, reading.slice(0, -1) + written[form].slice(writtenStem.length)]),
    ) as Outputs;
    expect(suffix).toBe(reading.slice(-1));
    checkAllForms(verb(expression, reading, 'godan'), written, readings);
  });

  it('uses metadata, not the る ending, for ichidan versus godan', () => {
    checkAllForms(
      verb('食べる', 'たべる', 'ichidan'),
      {
        dictionary: '食べる', masu: '食べます', masen: '食べません',
        mashita: '食べました', masendeshita: '食べませんでした',
        nai: '食べない', nakatta: '食べなかった', te: '食べて', ta: '食べた',
      },
      {
        dictionary: 'たべる', masu: 'たべます', masen: 'たべません',
        mashita: 'たべました', masendeshita: 'たべませんでした',
        nai: 'たべない', nakatta: 'たべなかった', te: 'たべて', ta: 'たべた',
      },
    );
    expect(conjugate(verb('帰る', 'かえる', 'godan'), 'nai').expression).toBe('帰らない');
  });

  it('conjugates する and its compounds in kana and kanji', () => {
    const endings: Outputs = {
      dictionary: 'する', masu: 'します', masen: 'しません',
      mashita: 'しました', masendeshita: 'しませんでした',
      nai: 'しない', nakatta: 'しなかった', te: 'して', ta: 'した',
    };
    for (const [expression, reading, writtenStem, readingStem] of [
      ['する', 'する', '', ''],
      ['勉強する', 'べんきょうする', '勉強', 'べんきょう'],
    ]) {
      checkAllForms(
        verb(expression, reading, 'suru'),
        Object.fromEntries(forms.map((form) => [form, writtenStem + endings[form]])) as Outputs,
        Object.fromEntries(forms.map((form) => [form, readingStem + endings[form]])) as Outputs,
      );
    }
  });

  it('conjugates 来る and くる with script-specific readings, including compounds', () => {
    const written: Outputs = {
      dictionary: '来る', masu: '来ます', masen: '来ません',
      mashita: '来ました', masendeshita: '来ませんでした',
      nai: '来ない', nakatta: '来なかった', te: '来て', ta: '来た',
    };
    const kana: Outputs = {
      dictionary: 'くる', masu: 'きます', masen: 'きません',
      mashita: 'きました', masendeshita: 'きませんでした',
      nai: 'こない', nakatta: 'こなかった', te: 'きて', ta: 'きた',
    };
    checkAllForms(verb('来る', 'くる', 'kuru'), written, kana);
    checkAllForms(verb('くる', 'くる', 'kuru'), kana);
    checkAllForms(
      verb('持って来る', 'もってくる', 'kuru'),
      Object.fromEntries(forms.map((form) => [form, '持って' + written[form]])) as Outputs,
      Object.fromEntries(forms.map((form) => [form, 'もって' + kana[form]])) as Outputs,
    );
    checkAllForms(
      verb('持ってくる', 'もってくる', 'kuru'),
      Object.fromEntries(forms.map((form) => [form, '持って' + kana[form]])) as Outputs,
      Object.fromEntries(forms.map((form) => [form, 'もって' + kana[form]])) as Outputs,
    );
    expect(conjugate(verb('来る', 'くる', 'kuru'), 'te').segments).toEqual({
      stem: '', removed: '来る', added: '来て',
    });
  });

  it('uses the special いく sound change only when appropriate', () => {
    for (const [expression, reading, expected, kana] of [
      ['行く', 'いく', '行って', 'いって'],
      ['いく', 'いく', 'いって', 'いって'],
      ['持って行く', 'もっていく', '持って行って', 'もっていって'],
    ]) {
      const input = verb(expression, reading, 'godan');
      expect(conjugate(input, 'te')).toMatchObject({
        expression: expected, reading: kana, rule: { id: 'godan-iku-te' },
      });
      expect(conjugate(input, 'ta').expression).toBe(expected.slice(0, -1) + 'た');
      expect(conjugate(input, 'nai').reading).toBe(reading.slice(0, -1) + 'かない');
    }
    expect(conjugate(verb('書く', 'かく', 'godan'), 'te').rule.id).toBe('godan-く-te');
    expect(conjugate(verb('行く', 'ゆく', 'godan'), 'te').expression).toBe('行いて');
  });

  it('exposes filterable rule definitions with an explanation and unique IDs', () => {
    expect(RULES).toBe(CONJUGATION_RULES);
    expect(FORMS.map(({ id }) => id)).toEqual(forms);
    expect(FORMS.every(({ label }) => label.length > 0)).toBe(true);
    expect(new Set(CONJUGATION_RULES.map((rule) => rule.id)).size).toBe(CONJUGATION_RULES.length);
    expect(CONJUGATION_RULES.every((rule) => rule.explanation && 'matchEnding' in rule && 'replaceWith' in rule)).toBe(true);
    expect(getRules({ class: 'kuru', form: 'te' }).map((rule) => rule.id)).toEqual([
      'kuru-written-te', 'kuru-kana-te',
    ]);
    expect(getRules({ form: 'dictionary' })).toHaveLength(4);
    expect(getRules({ class: 'godan', form: 'te' })).toHaveLength(10);
  });

  it('rejects malformed verbs and unsupported forms instead of returning misleading output', () => {
    expect(() => conjugate(verb('食べる', 'たべる', 'godan'), 'te')).not.toThrow();
    expect(() => conjugate(verb('食べる', 'たべる', 'ichidan'), 'te')).not.toThrow();
    expect(() => conjugate(verb('見る', 'みる', 'suru'), 'te')).toThrow();
    expect(() => conjugate(verb('読む', 'よむ', 'ichidan'), 'te')).toThrow();
    expect(() => conjugate(verb('来る', 'くる', 'godan'), 'te')).toThrow();
    expect(() => conjugate(verb('来る', 'くる', 'kuru'), 'bogus' as ConjugationForm)).toThrow();
    expect(() => conjugate({ ...verb('読む', 'よむ', 'godan'), id: '' }, 'te')).toThrow();
    expect(() => conjugate({ ...verb('読む', 'よむ', 'godan'), reading: 'よぶ' }, 'te')).toThrow();
  });
});
