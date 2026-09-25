import { useEffect, useMemo, useRef, useState } from 'react'
import { conjugate, conjugateReading, FORMS } from './conjugation'
import type { Form, Verb } from './conjugation'
import { verbs } from './dictionary/verbs'
import { loadProgress, pickVerb, recordAnswer, saveProgress } from './practice/session'
import { accepts } from './practice/validator'
import type { Progress } from './practice/session'
import './App.css'

type Page = 'learn' | 'drill' | 'review'
type Scope = 'core' | 'common' | 'all'
type ClassFilter = 'all' | Verb['class']

const classNames: Record<Verb['class'], string> = {
  godan: '五段 · Godan', ichidan: '一段 · Ichidan',
  suru: 'する · Irregular', kuru: '来る · Irregular',
}
const formLabel = (form: Form) => FORMS.find((item) => item.id === form)?.label ?? form

function normalize(value: string) {
  return value.normalize('NFKC').trim().replace(/\s+/g, '')
}

function Transformation({ verb, form }: { verb: Verb; form: Form }) {
  const data = conjugate(verb, form)
  const change = data.transformations[0]
  const stem = data.segments.find((segment) => segment.role === 'stem')?.text ?? ''
  return (
    <div className="transformation" aria-label={`${verb.expression} becomes ${data.result}`}>
      <div className="transformation-line"><span className="stem">{stem}</span><span className="removed">{change.from}</span></div>
      <span className="step-arrow" aria-hidden="true">↓ <small>{change.from} → {change.to}</small></span>
      <div className="transformation-line"><span className="stem">{stem}</span><span className="added">{change.to}</span></div>
      <span className="step-arrow" aria-hidden="true">↓</span>
      <div className="transformation-line result-word">{data.result}</div>
    </div>
  )
}

function App() {
  const [page, setPage] = useState<Page>('drill')
  const [source, setSource] = useState<Form>('dictionary')
  const [target, setTarget] = useState<Form>('te')
  const [scope, setScope] = useState<Scope>('core')
  const [verbClass, setVerbClass] = useState<ClassFilter>('all')
  const [ruleId, setRuleId] = useState('')
  const [weakOnly, setWeakOnly] = useState(false)
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [answer, setAnswer] = useState('')
  const [checked, setChecked] = useState<boolean | null>(null)
  const [hint, setHint] = useState(false)
  const seen = useRef(new Set<string>())
  const recent = useRef<string[]>([])
  const input = useRef<HTMLInputElement>(null)

  const pool = useMemo(() => verbs.filter((verb) =>
    (scope === 'all' || verb.level === 'core' || (scope === 'common' && verb.level === 'common')) &&
    (verbClass === 'all' || verb.class === verbClass) &&
    (!ruleId || conjugate(verb, target).rule.id === ruleId) &&
    (!weakOnly || (progress.verbs[verb.id]?.attempts ?? 0) > (progress.verbs[verb.id]?.correct ?? 0) ||
      (progress.rules[conjugate(verb, target).rule.id]?.attempts ?? 0) >
      (progress.rules[conjugate(verb, target).rule.id]?.correct ?? 0))
  ), [scope, verbClass, ruleId, target, weakOnly, progress])
  const [question, setQuestion] = useState<Verb | undefined>(() => {
    const selected = pickVerb(verbs.filter((verb) => verb.level === 'core'), 'te', progress, seen.current, recent.current)
    if (selected) { seen.current.add(selected.id); recent.current.push(selected.id) }
    return selected
  })

  useEffect(() => { saveProgress(progress) }, [progress])
  useEffect(() => {
    if (checked === null && page === 'drill') input.current?.focus()
  }, [checked, question, page])

  function next(poolOverride = pool, formOverride = target, stats = progress, reset = false) {
    if (reset) { seen.current.clear(); recent.current = [] }
    const selected = pickVerb(poolOverride, formOverride, stats, seen.current, recent.current)
    if (selected) {
      if (seen.current.size >= poolOverride.length) seen.current.clear()
      seen.current.add(selected.id)
      recent.current = [...recent.current.slice(-5), selected.id]
    }
    setQuestion(selected)
    setAnswer('')
    setChecked(null)
    setHint(false)
  }

  function settings(change: Partial<{ scope: Scope; verbClass: ClassFilter; source: Form; target: Form; ruleId: string; weakOnly: boolean }>) {
    const nextScope = change.scope ?? scope
    const nextClass = change.verbClass ?? verbClass
    const nextTarget = change.target ?? target
    const nextRule = change.ruleId ?? (change.target ? '' : ruleId)
    const nextWeak = change.weakOnly ?? weakOnly
    const available = verbs.filter((verb) =>
      (nextScope === 'all' || verb.level === 'core' || (nextScope === 'common' && verb.level === 'common')) &&
      (nextClass === 'all' || verb.class === nextClass) &&
      (!nextRule || conjugate(verb, nextTarget).rule.id === nextRule) &&
      (!nextWeak || (progress.verbs[verb.id]?.attempts ?? 0) > (progress.verbs[verb.id]?.correct ?? 0) ||
        (progress.rules[conjugate(verb, nextTarget).rule.id]?.attempts ?? 0) >
        (progress.rules[conjugate(verb, nextTarget).rule.id]?.correct ?? 0)))
    )
    setScope(nextScope); setVerbClass(nextClass); setSource(change.source ?? source)
    setTarget(nextTarget); setRuleId(nextRule); setWeakOnly(nextWeak)
    next(available, nextTarget, progress, true)
  }

  function check() {
    if (!question || checked !== null || !normalize(answer)) return
    const correct = accepts(answer, question, target)
    setChecked(correct)
    const updated = recordAnswer(progress, question, conjugate(question, target).rule.id, correct)
    setProgress(updated)
  }

  const display = question ? conjugate(question, source).result : ''
  const solution = question ? conjugate(question, target) : undefined
  const rules = useMemo(() => {
    const found = new Map<string, Verb>()
    for (const verb of verbs) {
      const id = conjugate(verb, target).rule.id
      if (!found.has(id)) found.set(id, verb)
    }
    return [...found].map(([id, verb]) => ({ id, verb, data: conjugate(verb, target) }))
  }, [target])
  const weakRules = Object.entries(progress.rules)
    .filter(([, score]) => score.attempts > score.correct)
    .sort((a, b) => (b[1].attempts - b[1].correct) - (a[1].attempts - a[1].correct))

  return (
    <div className="shell">
      <header className="topbar">
        <button className="brand" onClick={() => setPage('drill')} aria-label="Kotoba home">
          <span className="brand-mark">言</span><span>Kotoba<span className="brand-dot">.</span><small>VERB STUDIO</small></span>
        </button>
        <nav aria-label="Main navigation">
          {(['learn', 'drill', 'review'] as const).map((item) =>
            <button key={item} className={page === item ? 'nav-active' : ''} onClick={() => {
              if (item === 'learn' && target === 'dictionary') settings({ target: 'te' })
              setPage(item)
            }}>
              {item === 'learn' ? 'Learn' : item === 'drill' ? 'Practice' : 'Review'}
            </button>)}
        </nav>
        <span className="header-stat"><span aria-hidden="true">✦</span> {progress.streak} streak</span>
      </header>

      <main>
        {page === 'drill' && <>
          <div className="page-heading"><div><span className="eyebrow">PRACTICE / THE DAILY DRILL</span>
            <h1>Make it <em>click.</em></h1><p>One verb at a time. Find the pattern, then make it yours.</p></div>
            <div className="heading-count"><strong>{progress.total}</strong><span>answers given</span></div>
          </div>
          <div className="workspace">
            <aside className="settings-panel">
              <div className="panel-title"><span className="tiny-icon">⌘</span> Your session</div>
              <label htmlFor="source">FROM</label>
              <select id="source" value={source} onChange={(event) => settings({ source: event.target.value as Form })}>
                {FORMS.map((form) => <option key={form.id} value={form.id}>{form.label}</option>)}
              </select>
              <label htmlFor="target">TO</label>
              <select id="target" value={target} onChange={(event) => settings({ target: event.target.value as Form })}>
                {FORMS.filter((form) => form.id !== source).map((form) => <option key={form.id} value={form.id}>{form.label}</option>)}
              </select>
              <div className="divider" />
              <label htmlFor="vocabulary">VOCABULARY</label>
              <select id="vocabulary" value={scope} onChange={(event) => settings({ scope: event.target.value as Scope })}>
                <option value="core">Core verbs</option><option value="common">Common verbs</option><option value="all">All modern verbs</option>
              </select>
              <label htmlFor="class">VERB CLASS</label>
              <select id="class" value={verbClass} onChange={(event) => settings({ verbClass: event.target.value as ClassFilter })}>
                <option value="all">All classes</option><option value="godan">五段 · Godan</option>
                <option value="ichidan">一段 · Ichidan</option><option value="suru">する · Irregular</option><option value="kuru">来る · Irregular</option>
              </select>
              {ruleId && <button className="rule-filter" onClick={() => settings({ ruleId: '' })}>Rule focus: {ruleId} <span>×</span></button>}
              <div className="sidebar-footer"><span className="accent-spark">✳</span> All answers come from the same rule engine that powers the lessons.</div>
            </aside>
            <section className="exercise" aria-live="polite">
              {question && solution && source !== target ? <>
                <div className="exercise-top"><span className="exercise-number">CONJUGATION PRACTICE</span><span className="class-pill">{classNames[question.class]}</span></div>
                <div className="prompt"><span className="prompt-caption">CONVERT THIS VERB</span>
                  <div className="japanese-word">{display}</div>
                  <div className="reading">{conjugateReading(question, source).result} · {question.meaning}</div>
                  <div className="direction"><span>{formLabel(source)}</span><span className="direction-arrow">→</span><strong>{formLabel(target)}</strong></div>
                </div>
                {checked === null ? <form className="answer-area" onSubmit={(event) => { event.preventDefault(); check() }}>
                  <label htmlFor="answer">YOUR ANSWER</label>
                  <div className="input-row"><input id="answer" ref={input} autoComplete="off" autoCorrect="off" spellCheck={false}
                    placeholder="Type the conjugated verb…" value={answer} onChange={(event) => setAnswer(event.target.value)} />
                    <button className="primary-button" type="submit" disabled={!normalize(answer)}>Check <span>↵</span></button></div>
                  <div className="answer-help"><span>Kanji, kana, or romaji input accepted</span><button type="button" onClick={() => setHint(true)}>Need a hint?</button></div>
                  {hint && <div className="hint">Look at the ending: {solution.transformations[0].from} → {solution.transformations[0].to}</div>}
                </form> : <div className="feedback">
                  <div className={checked ? 'feedback-heading correct' : 'feedback-heading incorrect'}>{checked ? '✓ Nicely done!' : '↗ Keep the pattern in mind'}</div>
                  {!checked && <p className="your-answer">You wrote: {answer}</p>}
                  {source !== 'dictionary' && <div className="bridge">{display} <span>→</span> {question.expression} <span>→</span> {solution.result}</div>}
                  <Transformation verb={question} form={target} />
                  <p className="explanation">{solution.transformations[0].explanation}</p>
                  <button className="primary-button next-button" onClick={() => next()}>Next verb <span>→</span></button>
                </div>}
                <div className="exercise-bottom"><span><span className="dot" /> {pool.length.toLocaleString()} verbs in this set</span><span>{progress.streak} in a row <span className="accent-spark">✳</span></span></div>
              </> : <div className="empty-state"><span>✳</span><h2>{source === target ? 'Choose different forms' : 'No verbs in this set yet'}</h2>
                <p>{source === target ? 'Your starting form and target form should differ.' : 'Try a broader vocabulary set, another class, or a different rule.'}</p></div>}
            </section>
          </div>
        </>}

        {page === 'learn' && <><div className="page-heading"><div><span className="eyebrow">LEARN / THE RULE BOOK</span>
          <h1>See the <em>shift.</em></h1><p>Every answer is a transformation. Explore the rules, then practice one in isolation.</p></div></div>
          <div className="learn-toolbar"><label htmlFor="learn-form">EXPLORE FORM</label>
            <select id="learn-form" value={target} onChange={(event) => settings({ target: event.target.value as Form })}>
              {FORMS.filter((form) => form.id !== 'dictionary').map((form) => <option key={form.id} value={form.id}>{form.label}</option>)}</select>
            <span>{rules.length} transformations</span></div>
          <div className="rule-grid">{rules.map(({ id, verb, data }) => <article className="rule-card" key={id}>
            <div className="rule-card-top"><span>{classNames[verb.class]}</span><span className="rule-glyph">✳</span></div>
            <h2><span className="removed">{data.transformations[0].from}</span> <span className="muted-arrow">→</span> <span className="added">{data.transformations[0].to}</span></h2>
            <p>{data.transformations[0].explanation}</p>
            <div className="rule-example">{verb.expression} <span>→</span> {data.result}</div>
            <button onClick={() => { settings({ ruleId: id, scope: 'all', source: 'dictionary' }); setPage('drill') }}>Practice this rule <span>↗</span></button>
          </article>)}</div>
        </>}

        {page === 'review' && <><div className="page-heading"><div><span className="eyebrow">REVIEW / YOUR PROGRESS</span>
          <h1>Grow from <em>mistakes.</em></h1><p>Your progress stays in this browser. No account, no pressure.</p></div></div>
          <div className="stats-grid"><div><span>ANSWERS</span><strong>{progress.total}</strong></div>
            <div><span>BEST STREAK</span><strong>{progress.bestStreak}</strong></div>
            <div><span>RULES TO REVISIT</span><strong>{weakRules.length}</strong></div></div>
          <section className="review-panel"><div className="review-heading"><h2>Rules to revisit</h2><p>Patterns with missed answers appear here.</p></div>
            {weakRules.length ? weakRules.map(([id, score]) => <div className="weak-row" key={id}>
              <div><strong>{id}</strong><span>{score.correct} correct · {score.attempts - score.correct} to revisit</span></div>
              <button onClick={() => { settings({ ruleId: id, scope: 'all', source: 'dictionary', target: FORMS.find((form) =>
                verbs.some((verb) => conjugate(verb, form.id).rule.id === id))?.id ?? 'te' }); setPage('drill') }}>Practice →</button>
            </div>) : <div className="review-empty"><span>✳</span><h3>A fresh start</h3><p>Practice a few verbs and your weak spots will show up here.</p>
              <button className="primary-button" onClick={() => setPage('drill')}>Start practicing →</button></div>}
          </section>
          <button className="weak-start" disabled={!weakRules.length} onClick={() => { settings({ weakOnly: true, ruleId: '', scope: 'all' }); setPage('drill') }}>Drill my weak verbs and rules →</button>
        </>}
      </main>
      <footer><span>言 KOTOBA · VERB STUDIO</span><span>Built for the moment it finally clicks.</span><span>Dictionary form, always at the center.</span></footer>
    </div>
  )
}

export default App
