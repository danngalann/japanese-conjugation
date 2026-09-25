# Verb dictionary provenance

`verbs.json` is generated from the English JMdict Simplified release
[`3.6.2+20260921173324`](https://github.com/scriptin/jmdict-simplified/releases/tag/3.6.2%2B20260921173324),
whose underlying JMdict dictionary is dated **2026-09-21**. Source archive:
`jmdict-eng-3.6.2+20260921173324.json.tgz`, SHA-256
`16ac5d1b214c14981384a2008c813a65783c6ca7772703b9f4b3cfc9e9d5700f`.
The JSON conversion is by [scriptin/jmdict-simplified](https://github.com/scriptin/jmdict-simplified);
the original dictionary is from the [Electronic Dictionary Research and Development Group
(EDRDG)](https://www.edrdg.org/jmdict/j_jmdict.html), maintained by Jim Breen
and contributors. JMdict is distributed under the
[Creative Commons Attribution-ShareAlike 4.0 International License](https://www.edrdg.org/edrdg/licence.html).
The [upstream converter's license](https://github.com/scriptin/jmdict-simplified/blob/master/LICENSE.txt)
is also CC BY-SA 4.0.
Attribution and license terms apply when redistributing this derived lexicon.

Rebuild with `node scripts/build-dictionary.mjs` (requires Node.js and `curl`).
For offline rebuilding, pass `--input path/to/jmdict-eng-3.6.2+20260921173324.json.tgz`.
The script checks the source SHA-256 and version/date and emits stable, sorted
JSON. Raw JMdict data is downloaded into memory, not stored in the repository.

Each record selects one preferred compatible writing and kana reading per JMdict
entry, one English gloss, and a verb class from its applicable sense's POS tag.
`vs` verbal nouns are made into conjugable `〜する` expressions. The `common`
flag follows upstream JMdict priority markers. `level` is `core` for a small
hand-picked starter list, `common` for other priority-marked entries, or
`all`; it is not a JLPT rating. This is **not** the entire JMdict: ambiguous POS, archaic
or obsolete senses, uncommon spellings, non-verb entries, incompatible reading
restrictions, and exceptional conjugation types (`v5aru`, `v5r-i`,
`v5u-s`, `v1-s`, `vs-s`, classical verbs) are deliberately excluded.
行く (いく) is included because its special te/ta rules are supported;
ある needs further exceptional conjugation and is not included.
