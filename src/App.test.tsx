// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { conjugate } from './conjugation'
import { verbs } from './dictionary/verbs'
import App from './App'

describe('practice interface', () => {
  beforeEach(() => { localStorage.clear(); vi.spyOn(Math, 'random').mockReturnValue(0) })
  afterEach(() => { cleanup(); vi.restoreAllMocks() })

  it('reverses a polite form to dictionary form and explains the change', () => {
    const verb = verbs.find((entry) => entry.level === 'core')!
    render(<App />)
    fireEvent.change(screen.getByLabelText('FROM'), { target: { value: 'masu' } })
    fireEvent.change(screen.getByLabelText('TO'), { target: { value: 'dictionary' } })
    expect(screen.getByText(conjugate(verb, 'masu').result)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('YOUR ANSWER'), { target: { value: verb.reading } })
    fireEvent.click(screen.getByRole('button', { name: /Check/ }))
    expect(screen.getByText('✓ Nicely done!')).toBeTruthy()
    expect(screen.getByText(/Reverse the change to return to dictionary form/)).toBeTruthy()
    expect(screen.getByText('1', { selector: '.heading-count strong' })).toBeTruthy()
  })

  it('opens a focused drill from the rule explorer', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }))
    fireEvent.click(screen.getAllByRole('button', { name: /Practice this rule/ })[0])
    expect(screen.getByText('CONJUGATION PRACTICE')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Rule focus:/ })).toBeTruthy()
  })

  it('tracks a wrong answer by rule and offers a review drill', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('YOUR ANSWER'), { target: { value: 'ちがう' } })
    fireEvent.click(screen.getByRole('button', { name: /Check/ }))
    expect(screen.getByText('↗ Keep the pattern in mind')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(screen.getAllByText('1', { selector: '.stats-grid strong' })).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Practice →' }))
    expect(screen.getByRole('button', { name: /Rule focus:/ })).toBeTruthy()
    expect(JSON.parse(localStorage.getItem('japanese-conjugation-progress-v1')!).total).toBe(1)
  })
})
