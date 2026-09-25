import { describe, expect, it } from 'vitest'
import { accepts } from './validator'
import type { Verb } from '../conjugation'

const verb: Verb = { id: 'reading', expression: '読む', reading: 'よむ', meaning: 'to read', class: 'godan' }

describe('answer validation', () => {
  it('accepts written form, kana reading and romaji converted to kana', () => {
    expect(accepts('読んで', verb, 'te')).toBe(true)
    expect(accepts('よんで', verb, 'te')).toBe(true)
    expect(accepts('yonde', verb, 'te')).toBe(true)
  })

  it('does not accept an unrelated conjugation or a different word', () => {
    expect(accepts('読みます', verb, 'te')).toBe(false)
    expect(accepts('とんで', verb, 'te')).toBe(false)
  })
})
