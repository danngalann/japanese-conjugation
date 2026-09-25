# Kotoba · Japanese Verb Studio

A static React application for learning Japanese verb conjugation. Dictionary form is canonical: every prompt, answer, explanation and highlighted transformation comes from the same pure TypeScript rule engine.

## Run locally

Requires Node.js 24+ and npm.

```sh
npm ci
npm run dev
```

Use **Learn** to explore transformations and launch focused exercises, **Practice** to convert between any two of the nine supported forms, and **Review** to revisit rules and verbs answered incorrectly. Written Japanese and matching kana readings are accepted; romaji typed in the answer box is converted to kana when checking. Progress, weak rules and streaks stay in this browser's local storage. There is no server or account.

Supported forms: dictionary, ます, ません, ました, ませんでした, ない, なかった, て and た. All conversions pass through the dictionary verb. The starter set is a hand-picked set of common verbs; "Common" follows JMdict priority tags, **not** JLPT levels. "All modern verbs" includes additional supported entries. Selection avoids repeats within a set and increases the probability of weak verbs and rules on subsequent cycles.

## Development

```sh
npm test
npm run lint
npm run build
node scripts/build-dictionary.mjs
```

`src/conjugation/` is independent of React. Its declarative rules return the answer, reading, segments and explanation. The dictionary script filters a pinned, checksum-verified JMdict Simplified release using part-of-speech metadata; see [dictionary provenance and license](src/dictionary/NOTICE.md). The generated `src/dictionary/verbs.json` is checked in so ordinary development and deployment work offline. The source archive is not checked in.

Tests cover each rule family and exception, every generated verb across all nine forms, answer validation, UI flows, and an independent comparison with `kamiya-codec` for regular て/た/ない forms. The oracle does not recognize compound 行く expressions, which are checked with curated fixtures instead. The corpus intentionally excludes verb classes that need rules this version does not implement, including ある. No arbitrary deconjugation of an unknown word is attempted: reverse exercises are generated from known dictionary entries.

Run `npm run build` to produce a static site in `dist/` for any static host. Keep the JMdict-derived lexicon attribution and CC BY-SA 4.0 terms when redistributing it.
