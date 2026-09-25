import { describe, expect, it } from 'vitest'
import { conjugate as oracle, conjugateAuxiliaries } from 'kamiya-codec'
import { verbs } from '../dictionary/verbs'
import { conjugate } from './engine'

describe('independent conjugation oracle', () => {
  it('agrees on supported forms for regular dictionary verbs', () => {
    const regular = verbs.filter((verb) => verb.class === 'godan' || verb.class === 'ichidan')
    const mismatches: string[] = []
    for (const verb of regular) {
      const ichidan = verb.class === 'ichidan'
      for (const [form, oracleForm] of [['te', 'Te'], ['ta', 'Ta'], ['nai', 'Negative']] as const) {
        // The oracle only recognizes standalone 行く, not longer expressions ending in it.
        if (form !== 'nai' && verb.expression !== '行く' && verb.reading.endsWith('いく') &&
          (verb.expression.endsWith('行く') || verb.expression.endsWith('いく'))) continue
        const expected = oracle(verb.expression, oracleForm, ichidan)
        if (!expected.includes(conjugate(verb, form).result)) mismatches.push(`${verb.expression} / ${form}: ${conjugate(verb, form).result} vs ${expected}`)
      }
      for (const [form, auxiliaries, oracleForm] of [
        ['masu', ['Masu'], 'Dictionary'],
        ['masen', ['Masu'], 'Negative'],
        ['mashita', ['Masu'], 'Ta'],
        ['masendeshita', ['Masu'], 'Negative'],
        ['nakatta', ['Nai'], 'Ta'],
      ] as const) {
        const expected = conjugateAuxiliaries(verb.expression, [...auxiliaries], oracleForm, ichidan)
        if (!expected.includes(conjugate(verb, form).result)) mismatches.push(`${verb.expression} / ${form}: ${conjugate(verb, form).result} vs ${expected}`)
      }
    }
    expect(mismatches.length, mismatches.slice(0, 30).join('\n')).toBe(0)
  })
})
