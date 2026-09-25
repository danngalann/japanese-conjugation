/**
 * Rebuild the static verb list from the pinned JMdict Simplified English release.
 * Source: https://github.com/scriptin/jmdict-simplified/releases/tag/3.6.2%2B20260921173324
 * JMdict date: 2026-09-21. See src/dictionary/NOTICE.md for attribution and terms.
 *
 * Usage: node scripts/build-dictionary.mjs [--input data/jmdict-source.tgz]
 * Without --input, curl downloads the pinned archive into memory; no raw
 * dictionary or additional npm dependency is required.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const release = '3.6.2+20260921173324';
const filename = `jmdict-eng-${release}.json.tgz`;
const url = `https://github.com/scriptin/jmdict-simplified/releases/download/${encodeURIComponent(release)}/${filename}`;
const sha256 = '16ac5d1b214c14981384a2008c813a65783c6ca7772703b9f4b3cfc9e9d5700f';
const output = new URL('../src/dictionary/verbs.json', import.meta.url);

const args = process.argv.slice(2);
if (args.length !== 0 && (args.length !== 2 || args[0] !== '--input')) {
  throw new Error('Usage: node scripts/build-dictionary.mjs [--input path/to/jmdict-eng.tgz]');
}
const archive = args.length
  ? readFileSync(args[1])
  : execFileSync('curl', ['--fail', '--location', '--silent', '--show-error', '--retry', '2', url], {
      maxBuffer: 32 * 1024 * 1024,
    });
const digest = createHash('sha256').update(archive).digest('hex');
if (digest !== sha256) {
  throw new Error(`Unexpected source checksum ${digest}; expected ${sha256}`);
}

const tar = gunzipSync(archive);
const name = tar.toString('utf8', 0, 100).replace(/\0.*$/, '');
const size = Number.parseInt(tar.toString('ascii', 124, 136).replace(/\0.*$/, '').trim(), 8);
if (name !== 'jmdict-eng-3.6.2.json' || !Number.isSafeInteger(size) || size <= 0 || size > tar.length - 512) {
  throw new Error('Unexpected archive structure');
}
const dictionary = JSON.parse(tar.toString('utf8', 512, 512 + size));
if (dictionary.version !== '3.6.2' || dictionary.dictDate !== '2026-09-21' ||
    dictionary.languages.join(',') !== 'eng' || !Array.isArray(dictionary.words)) {
  throw new Error('Unexpected JMdict metadata');
}

// These POS tags have regular endings in the supported conjugation model.
// v5k-s is supported for 行く (いく) by the conjugator's special te/ta rules.
// v5aru, v5r-i, v5u-s, v1-s, vs-s and classical verbs require
// other exceptional conjugation, so their entries are not silently misclassified.
const endings = new Map([
  ['v1', ['ichidan', 'る']],
  ['v5u', ['godan', 'う']], ['v5k', ['godan', 'く']],
  ['v5k-s', ['godan', 'く']], ['v5g', ['godan', 'ぐ']], ['v5s', ['godan', 'す']],
  ['v5t', ['godan', 'つ']], ['v5n', ['godan', 'ぬ']],
  ['v5b', ['godan', 'ぶ']], ['v5m', ['godan', 'む']],
  ['v5r', ['godan', 'る']],
  ['vs', ['suru', 'する']], ['vs-i', ['suru', 'する']],
  ['vk', ['kuru', 'くる']],
]);
const unsupportedVerb = /^(?:v\d|vs|vk|vz)/;
const excludedMisc = new Set(['arch', 'obs', 'dated', 'hist']);
const excludedSpelling = new Set(['rK', 'sK', 'oK', 'iK', 'rk', 'sk', 'ok', 'ik']);
// Small hand-picked starter set; all members must still pass the JMdict filters.
const coreExpressions = new Set(`
  する 来る 行く 食べる 飲む 見る 聞く 話す 読む 書く 買う 売る 作る
  寝る 起きる 帰る 入る 出る 開ける 開く 閉める 閉まる 歩く 走る
  泳ぐ 遊ぶ 待つ 持つ 立つ 座る 使う 洗う 会う 言う 思う 知る
  分かる 覚える 忘れる 始める 始まる 終わる 働く 休む 習う
  教える 借りる 貸す 返す 送る 届く 取る 置く 落とす 拾う
  切る 着る 脱ぐ 履く 着く 乗る 降りる 止まる 止める 曲がる
  渡る 住む 生きる 死ぬ 生まれる 変わる 変える 泣く 笑う
  怒る 困る 楽しむ 助ける 手伝う 選ぶ 決める 決まる 考える
  探す 見つける 見える 見せる 呼ぶ 答える 質問する 勉強する
  掃除する 料理する 運動する 旅行する 電話する 結婚する
  約束する 予約する 練習する 説明する 紹介する 準備する
  心配する 安心する 散歩する 買い物する
`.trim().split(/\s+/));
const applies = (scope, text) => scope.includes('*') || scope.includes(text);
const eligible = (form) => form && !form.tags.some((tag) => excludedSpelling.has(tag));

const result = new Map();
const ambiguous = new Set();
for (const word of dictionary.words) {
  const kana = word.kana.filter((form) => eligible(form) && /^[ぁ-ゖー]+$/.test(form.text))
    .sort((a, b) => Number(b.common) - Number(a.common))[0];
  if (!kana) continue;
  const kanji = word.kanji.filter((form) => eligible(form) && applies(kana.appliesToKanji, form.text))
    .sort((a, b) => Number(b.common) - Number(a.common))[0];
  const spelling = kanji?.text ?? kana.text;
  const relevant = word.sense.filter((sense) =>
    applies(sense.appliesToKana, kana.text) &&
    applies(sense.appliesToKanji, kanji?.text ?? '*') &&
    !sense.misc.some((tag) => excludedMisc.has(tag)));
  const pos = new Set(relevant.flatMap((sense) => sense.partOfSpeech.filter((tag) => endings.has(tag) || unsupportedVerb.test(tag))));
  if (pos.size !== 1) continue;
  const tag = [...pos][0];
  const conjugation = endings.get(tag);
  if (!conjugation) continue;
  const [verbClass, suffix] = conjugation;
  if (tag === 'v5k-s' && !(kana.text.endsWith('いく') &&
      (spelling.endsWith('行く') || spelling.endsWith('いく')))) continue;
  const selectedSense = relevant.find((sense) =>
    sense.partOfSpeech.includes(tag) && sense.gloss.some((gloss) => gloss.lang === 'eng' && gloss.text.trim()));
  if (!selectedSense) continue;

  let expression = spelling;
  let reading = kana.text;
  if (tag === 'vs') {
    // JMdict's "vs" is a verbal noun, not an already-conjugable verb.
    expression += 'する';
    reading += 'する';
  } else if (tag === 'vs-i' && spelling !== 'する') {
    // The rare spelling 為る does not have the same visible suffix as する.
    if (kana.text !== 'する') continue;
    expression = 'する';
  } else if (tag === 'vk' && !spelling.endsWith('来る') && !spelling.endsWith('くる')) {
    // The conjugator cannot inflect arbitrary alternative spellings of 来る.
    continue;
  }
  // 来る is written with a single kanji for く; only its reading has the
  // literal suffix くる. Exclude the homograph 来る (きたる, regular godan).
  if (verbClass === 'godan' && expression === '来る') continue;
  if (verbClass === 'kuru' && (!reading.endsWith('くる') ||
      (!expression.endsWith('くる') && !expression.endsWith('来る')))) continue;
  if ((verbClass !== 'kuru' && !expression.endsWith(suffix)) ||
      !reading.endsWith(suffix) || !/^[ぁ-ゖー]+$/.test(reading)) continue;
  if (verbClass !== 'kuru' && (expression.endsWith('来る') || expression.endsWith('くる')) &&
      reading.endsWith('くる')) continue;
  if (verbClass !== 'suru' && expression.endsWith('する') && reading.endsWith('する')) continue;
  const meaning = selectedSense.gloss.find((gloss) => gloss.lang === 'eng' && gloss.text.trim()).text.trim();
  const key = `${expression}\0${reading}`;
  if (ambiguous.has(key)) continue;
  const previous = result.get(key);
  if (previous && previous.class !== verbClass) {
    result.delete(key);
    ambiguous.add(key);
    continue;
  }
  if (previous) continue;
  const common = Boolean(kana.common || kanji?.common);
  result.set(key, {
    id: word.id,
    expression,
    reading,
    meaning,
    class: verbClass,
    common,
    level: common && coreExpressions.has(expression) ? 'core' : common ? 'common' : 'all',
  });
}
const verbs = [...result.values()].sort((a, b) => Number(a.id) - Number(b.id) || a.expression.localeCompare(b.expression, 'ja'));
if (verbs.length < 3000 || !verbs.some((verb) => verb.expression === '食べる') ||
    !verbs.some((verb) => verb.expression === 'する') ||
    !verbs.some((verb) => verb.expression === '来る' && verb.class === 'kuru')) {
  throw new Error('Generated dictionary failed basic coverage checks');
}
writeFileSync(output, `${JSON.stringify(verbs, null, 2)}\n`);
console.log(`Wrote ${verbs.length} verbs (${verbs.filter((verb) => verb.common).length} marked common) to ${output.pathname}`);
