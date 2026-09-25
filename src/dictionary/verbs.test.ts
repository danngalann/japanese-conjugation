import { describe, expect, it } from 'vitest';
import { CONJUGATION_FORMS, conjugate } from '../conjugation';
import { verbs } from './verbs';

describe('generated JMdict verb lexicon', () => {
  it('contains distinct entries for common starter and exceptional verbs', () => {
    expect(verbs.length).toBeGreaterThan(20_000);
    expect(new Set(verbs.map((verb) => verb.id)).size).toBe(verbs.length);
    expect(verbs.filter((verb) => verb.level === 'core').length).toBeGreaterThan(50);
    expect(verbs.find((verb) => verb.expression === '行く')).toMatchObject({
      reading: 'いく', class: 'godan',
    });
    expect(verbs.find((verb) => verb.expression === '来る')).toMatchObject({
      reading: 'くる', class: 'kuru',
    });
    expect(verbs.find((verb) => verb.expression === '勉強する')).toMatchObject({
      reading: 'べんきょうする', class: 'suru',
    });
  });

  it('supports every generated verb in every available conjugation form', () => {
    for (const verb of verbs) {
      for (const form of CONJUGATION_FORMS) {
        expect(() => conjugate(verb, form), `${verb.id}: ${verb.expression} / ${form}`).not.toThrow();
      }
    }
  });
});
