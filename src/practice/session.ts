import { conjugate } from '../conjugation'
import type { Form, Verb } from '../conjugation'

export interface Score {
  attempts: number
  correct: number
}

export interface Progress {
  version: 1
  total: number
  streak: number
  bestStreak: number
  verbs: Record<string, Score>
  rules: Record<string, Score>
}

export const emptyProgress = (): Progress => ({
  version: 1,
  total: 0,
  streak: 0,
  bestStreak: 0,
  verbs: {},
  rules: {},
})

const storageKey = 'japanese-conjugation-progress-v1'

function validScores(value: object): boolean {
  return Object.values(value).every((score) =>
    typeof score === 'object' && score !== null &&
    Number.isSafeInteger(score.attempts) && score.attempts > 0 &&
    Number.isSafeInteger(score.correct) && score.correct >= 0 && score.correct <= score.attempts)
}

export function loadProgress(): Progress {
  try {
    const stored = localStorage.getItem(storageKey)
    if (!stored) return emptyProgress()
    const value: unknown = JSON.parse(stored)
    if (
      typeof value !== 'object' || value === null ||
      !('version' in value) || value.version !== 1 ||
      !('total' in value) || typeof value.total !== 'number' || !Number.isSafeInteger(value.total) || value.total < 0 ||
      !('streak' in value) || typeof value.streak !== 'number' || !Number.isSafeInteger(value.streak) || value.streak < 0 ||
      !('bestStreak' in value) || typeof value.bestStreak !== 'number' ||
      !Number.isSafeInteger(value.bestStreak) || value.bestStreak < value.streak ||
      !('verbs' in value) || typeof value.verbs !== 'object' || value.verbs === null || !validScores(value.verbs) ||
      !('rules' in value) || typeof value.rules !== 'object' || value.rules === null || !validScores(value.rules)
    ) throw new Error('Invalid saved practice progress')
    return value as Progress
  } catch (error) {
    console.warn('Could not load saved practice progress; starting fresh.', error)
    return emptyProgress()
  }
}

export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress))
  } catch (error) {
    console.warn('Could not save practice progress.', error)
  }
}

export function recordAnswer(progress: Progress, verb: Verb, ruleId: string, correct: boolean): Progress {
  const verbs = { ...progress.verbs }
  const rules = { ...progress.rules }
  const verbScore = verbs[verb.id] ?? { attempts: 0, correct: 0 }
  const ruleScore = rules[ruleId] ?? { attempts: 0, correct: 0 }
  verbs[verb.id] = { attempts: verbScore.attempts + 1, correct: verbScore.correct + Number(correct) }
  rules[ruleId] = { attempts: ruleScore.attempts + 1, correct: ruleScore.correct + Number(correct) }
  const streak = correct ? progress.streak + 1 : 0
  return {
    ...progress, verbs, rules, total: progress.total + 1,
    streak, bestStreak: Math.max(streak, progress.bestStreak),
  }
}

function weight(score: Score | undefined): number {
  if (!score) return 1
  return 0.35 + 2.5 * (1 - score.correct / score.attempts)
}

export function pickVerb(
  pool: Verb[],
  form: Form,
  progress: Progress,
  seen: Set<string>,
  recent: string[],
  random: () => number = Math.random,
): Verb | undefined {
  const unseen = pool.filter((verb) => !seen.has(verb.id))
  const candidates = unseen.length ? unseen : pool.filter((verb) => !recent.includes(verb.id))
  const available = candidates.length ? candidates : pool
  if (!available.length) return undefined
  const weights = available.map((verb) => {
    const { rule } = conjugate(verb, form)
    return weight(progress.verbs[verb.id]) * weight(progress.rules[rule.id])
  })
  let ticket = random() * weights.reduce((sum, value) => sum + value, 0)
  for (let i = 0; i < available.length; i++) {
    ticket -= weights[i]
    if (ticket < 0) return available[i]
  }
  return available[available.length - 1]
}
