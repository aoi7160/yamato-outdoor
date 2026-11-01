/**
 * 承認トレイの画面の処理(src/scripts/tray-utils.ts)のテスト。
 * TypeScriptのまま読めないので、devDependencies の typescript で変換してから読み込む。
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const src = readFileSync(new URL('../src/scripts/tray-utils.ts', import.meta.url), 'utf8').replace(/^import type .*$/m, '');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const file = join(mkdtempSync(join(tmpdir(), 'tray-')), 'tray-utils.mjs');
writeFileSync(file, js);
const { wordDiff, readPasted, applyFills, ageDays, ageLabel } = await import(file);

// 変更前/変更後:どちらも元の文に戻せる
const d = wordDiff('思い浮かべる人は多いと思う。', '思い浮かべるのは、厚底だ。');
assert.equal(d.filter((p) => p.t !== 'ins').map((p) => p.s).join(''), '思い浮かべる人は多いと思う。');
assert.equal(d.filter((p) => p.t !== 'del').map((p) => p.s).join(''), '思い浮かべるのは、厚底だ。');
assert.equal(wordDiff('a b c d', 'e f', 1), null, '長すぎるときは色を付けない');

// 差し込み欄:コードを丸ごと貼ってもURLだけ。かんたんリンク・別ドメインは断る
const H = ['moshimo.com', 'amazon.co.jp', 'amzn.to'];
assert.match(readPasted('<script>msmaflink({})</script>', { hosts: H }).error, /かんたんリンク/);
assert.equal(
  readPasted('<a href="https://af.moshimo.com/af/c/click?a_id=1&amp;p_id=170" rel="nofollow">X</a><img src="https://i.moshimo.com/af/i/impression?a_id=1" width="1" height="1">', { hosts: H }).url,
  'https://af.moshimo.com/af/c/click?a_id=1&p_id=170',
);
assert.match(readPasted('https://example.com/x', { hosts: H }).error, /使えません/);
assert.match(readPasted('こんにちは', { hosts: H }).error, /URL/);
assert.equal(readPasted('http://af.moshimo.com/x', { hosts: H }).url, 'https://af.moshimo.com/x');
assert.equal(readPasted('', { hosts: H }).url, '');

const box = (n) => `<div class="buy-box">\n  <p class="buy-box__name">${n}</p>\n  <ul class="buy-box__links">\n    <li><a href="{{amazon}}">Amazonで見る</a></li>\n    <li><a href="{{rakuten}}">楽天市場で見る</a></li>\n  </ul>\n</div>`;
const html = `<p class="pr-notice">PR</p>\n<p>本文</p>\n${box('A')}\n<p>続き</p>\n${box('B')}\n`;
const F = [{ key: 'amazon', label: 'Amazon', hosts: H }, { key: 'rakuten', label: '楽天', hosts: ['moshimo.com'] }];
let r = applyFills(html, F, { amazon: 'https://af.moshimo.com/a?x=1&y=2', rakuten: '' });
assert.equal(r.links, 2);
assert.equal(r.dropped.length, 1);
assert.ok(r.html.includes('href="https://af.moshimo.com/a?x=1&amp;y=2"'));
assert.ok(!r.html.includes('楽天市場で見る'));
r = applyFills(html, F, {});
assert.equal(r.links, 0);
assert.ok(!r.html.includes('buy-box'), '空になった箱は箱ごと外す');
assert.ok(r.html.includes('pr-notice'));
r = applyFills(html, [{ ...F[0], required: true }, F[1]], { rakuten: 'https://r.example/1' });
assert.equal(r.missing[0].key, 'amazon');
assert.deepEqual(applyFills('{{unknown}}', F, {}).leftover, ['{{unknown}}']);

// code モード:ASPのリンクコードを発行されたまま入れる(URLだけは断る・余計なタグは断る)
const C = { hosts: ['moshimo.com'], mode: 'code' };
const moshimo = '<a href="https://af.moshimo.com/af/c/click?a_id=1&amp;p_id=54" rel="nofollow" referrerpolicy="no-referrer-when-downgrade" attributionsrc>楽天市場で見る</a><img src="//i.moshimo.com/af/i/impression?a_id=1&amp;p_id=54" width="1" height="1" style="border:none;" loading="lazy">';
const pc = readPasted(`  ${moshimo}\n`, C);
assert.equal(pc.value, moshimo);
assert.equal(pc.warn, undefined);
assert.match(readPasted('https://af.moshimo.com/x', C).error, /URLだけでは/);
assert.match(readPasted('<a href="https://af.moshimo.com/x">x</a>', C).warn, /計測用の画像/);
assert.match(readPasted('<a href="https://af.moshimo.com/x"><span>x</span></a>', C).error, /<span>/);
assert.match(readPasted('<a href="https://af.moshimo.com/x" onclick="a()">x</a>', C).error, /イベント属性/);
const tmpl = '<ul class="buy-box__links">\n    <li>{{rakuten}}</li>\n    <li>{{amazon}}</li>\n  </ul>';
const rc = applyFills(`<div class="buy-box">\n  ${tmpl}\n</div>`, [{ key: 'rakuten', label: '楽天', mode: 'code' }, { key: 'amazon', label: 'Amazon', mode: 'code' }], { rakuten: moshimo });
assert.ok(rc.html.includes(`<li>${moshimo}</li>`), 'コードは改変せずに入れる');
assert.equal(rc.links, 1);

// 日数は日本時間の日付で数える
assert.equal(ageDays('2026-10-14T23:09:53Z', new Date('2026-11-01T14:00:00Z')), 17);
assert.equal(ageDays(undefined), null);
assert.equal(ageLabel(0), '今日');
assert.equal(ageLabel(3), '3日前');
console.log('tray-utils: OK');
