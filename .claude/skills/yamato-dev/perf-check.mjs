/**
 * サイト開発・パフォーマンス部の計測スクリプト(ラボ計測。実ユーザーの値ではない)。
 *
 * 使い方(リポジトリの外の作業フォルダで実行してよい。書き込みはしない):
 *   node .claude/skills/yamato-dev/perf-check.mjs <URL> [--cpu 4] [--width 390] [--height 844]
 *
 * 出すもの(1行のJSON):
 *   - lcp_ms / cls        … ラボのLCP・CLS(ページを開いてから3秒の観測)
 *   - long_tasks          … 50msを超えたメインスレッドのタスク数と合計
 *   - scroll.fps / p95_ms … 上から6,000pxまでスクロールしたときのフレーム間隔
 *   - animations          … 動いているアニメーション(CSS/WAAPI)の数と、各層の対象・面積(画面に対する%)
 *                           CLAUDE.md「デザインの約束」のレイヤー予算(背景4層まで・面積を絞る・ヘッダー付近に置かない)の点検用
 *
 * 注意:コンテナのヘッドレスChromiumにはGPUが無い。fpsは「前と比べて落ちたか」を見る比較用で、
 * CLAUDE.mdに書かれた実測(GPUが弱い実機)の代わりにはならない。最終確認はCEOの端末で行う。
 */
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';

const args = process.argv.slice(2);
const url = args.find((a) => /^https?:/.test(a));
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? Number(args[i + 1]) : d;
};
if (!url) {
  console.error('URLを指定してください');
  process.exit(1);
}
const cpu = opt('cpu', 4);
const width = opt('width', 390);
const height = opt('height', 844);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
const cdp = await page.context().newCDPSession(page);
if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });

await page.addInitScript(() => {
  window.__perf = { lcp: 0, cls: 0, long: [] };
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__perf.lcp = e.startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value;
  }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__perf.long.push(e.duration);
  }).observe({ type: 'longtask', buffered: true });
});

await page.goto(url, { waitUntil: 'load', timeout: 90_000 });
await page.waitForTimeout(3000);

const result = await page.evaluate(async () => {
  const vw = innerWidth;
  const vh = innerHeight;
  const anims = document
    .getAnimations()
    .filter((a) => a.playState === 'running')
    .map((a) => {
      const el = a.effect && a.effect.target;
      const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      const name = el ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.classList && el.classList.length ? '.' + [...el.classList].join('.') : ''}` : '?';
      const area = r ? Math.round(((Math.min(r.width, vw) * Math.min(r.height, vh)) / (vw * vh)) * 100) : null;
      const props = a.effect && a.effect.getKeyframes ? [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)))].filter((k) => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)) : [];
      const pseudo = a.effect && a.effect.pseudoElement ? a.effect.pseudoElement : '';
      // content:none の疑似要素は描画されない(Chromeは動いている扱いで返すことがある)
      const rendered = pseudo && el ? getComputedStyle(el, pseudo).content !== 'none' : true;
      // 疑似要素の面積は取れないので、親要素の面積(上限)を出す
      return { target: name, pseudo, rendered, area_pct: area, area_is_host: Boolean(pseudo), top_pct: r ? Math.round((r.top / vh) * 100) : null, props };
    });

  const frames = [];
  let last = performance.now();
  let stop = false;
  const tick = (t) => {
    frames.push(t - last);
    last = t;
    if (!stop) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  const H = document.documentElement.scrollHeight;
  for (let y = 0; y < Math.min(H, 6000); y += 40) {
    scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 16));
  }
  stop = true;
  const avg = frames.reduce((s, f) => s + f, 0) / Math.max(frames.length, 1);
  const sorted = [...frames].sort((a, b) => a - b);
  const p = window.__perf;
  return {
    lcp_ms: Math.round(p.lcp),
    cls: +p.cls.toFixed(3),
    long_tasks: { count: p.long.length, total_ms: Math.round(p.long.reduce((s, d) => s + d, 0)) },
    scroll: { frames: frames.length, fps: +(1000 / avg).toFixed(1), p95_ms: +(sorted[Math.floor(sorted.length * 0.95)] ?? 0).toFixed(1), over_50ms: frames.filter((f) => f > 50).length },
    animations: { running: anims.filter((a) => a.rendered).length, layers: anims },
  };
});

console.log(JSON.stringify({ url, cpu_throttle: cpu, viewport: `${width}x${height}`, measured_at: new Date().toISOString(), ...result }));
await browser.close();
