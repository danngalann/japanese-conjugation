import { toKana } from 'wanakana'
import { conjugate, conjugateReading } from '../conjugation'
import type { Form, Verb } from '../conjugation'

function normalize(value: string) {
  return value.normalize('NFKC').trim().replace(/\s+/g, '')
}

export function accepts(answer: string, verb: Verb, target: Form): boolean {
  const input = normalize(toKana(normalize(answer)))
  return input === normalize(conjugate(verb, target).result) ||
    input === normalize(conjugateReading(verb, target).result)
}
