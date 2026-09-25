import { describe, expect, it } from 'vitest'
import { emptyProgress, pickVerb, recordAnswer } from './session'
import type { Verb } from '../conjugation'

const verbs: Verb[] = [
  { id: '1', expression: '書く', reading: 'かく', meaning: 'write', class: 'godan' },
  { id: '2', expression: '読む', reading: 'よむ', meaning: 'read', class: 'godan' },
]

describe('practice scheduling and progress', () => {
  it('does not repeat a verb before the eligible pool is exhausted', () => {
    expect(pickVerb(verbs, 'te', emptyProgress(), new Set(['1']), [], () => 0)?.id).toBe('2')
  })

  it('keeps recent verbs away after exhaustion when alternatives exist', () => {
    expect(pickVerb(verbs, 'te', emptyProgress(), new Set(['1', '2']), ['1'], () => 0)?.id).toBe('2')
  })

  it('tracks mistakes by verb and rule and resets the streak', () => {
    const first = recordAnswer(emptyProgress(), verbs[0], 'godan-te-ku', true)
    const second = recordAnswer(first, verbs[0], 'godan-te-ku', false)
    expect(second).toMatchObject({
      total: 2, streak: 0, bestStreak: 1,
      verbs: { '1': { attempts: 2, correct: 1 } },
      rules: { 'godan-te-ku': { attempts: 2, correct: 1 } },
    })
  })
})
