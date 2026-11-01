# クリエイティブ制作部 —— 雛形・規格・書き出しの手順

`SKILL.md` の手順から参照する。数値の根拠は `SKILL.md` 3章と `sources.md`。

---

## 0. 作業の準備(セッションごとに1回)

ブランドのフォントは、このコンテナに最初は入っていない。SVGをPNGに書き出す前に入れる(Google Fontsのリポジトリから。OFLライセンス)。

```bash
mkdir -p ~/.fonts && cd ~/.fonts
for f in zenkakugothicnew/ZenKakuGothicNew-Regular.ttf zenkakugothicnew/ZenKakuGothicNew-Medium.ttf \
         zenoldmincho/ZenOldMincho-Regular.ttf "schibstedgrotesk/SchibstedGrotesk%5Bwght%5D.ttf"; do
  curl -sSfLO "https://raw.githubusercontent.com/google/fonts/main/ofl/$f"
done
fc-cache -f && fc-list | grep -i -E "zen kaku|zen old|schibsted"   # 3種類が出ればよい
```

書き出しは公開リポジトリの `node_modules` にある `sharp` を使う(SVGの描画にlibrsvgを使い、メタデータは既定で消える)。
動画は `ffmpeg` / `ffprobe`。作業ファイルはスクラッチパッドで作り、完成品だけを非公開リポジトリに置く。

非公開リポジトリが無ければ、セッションに `aoi7160/yamato-outdoor-editorial` を追加して、公開リポジトリと同じ階層にcloneする。
追加できなければ止めて報告する(**公開リポジトリの中に作って代用しない**)。

---

## 1. 制作台帳(`content/creative/queue.md` の1行)

```markdown
| 受付日 | 依頼元 | 種類 | 対象 | 期限 | 3-1の判定 | 状態 | 納品先 |
|---|---|---|---|---|---|---|---|
| 2026-11-03 | 承認トレイ(記事公開・承認待ち) | 撮影指示書+サムネ案 | winter-gloves-hira | 11/8(CEOの次の登山) | 写真が要る:手袋の厚みの差は写真でしか伝わらない | 納品済み | 承認トレイ「納品:冬の比良の手袋 の撮影指示書」 |
| 2026-11-03 | 発注表(planning) | 図解 | winter-gloves-hira「3枚の重ね方」 | 11/10 | 図が要る:重なる順序 | 制作中 | — |
| 2026-11-03 | 校閲チェック | alt | salomon-hiking-shoes 本文3枚目 | 11/10 | 作業:alt案 | コンテンツ制作部に依頼 | 日報 11/3 |
| 2026-11-03 | 発注表(planning) | 図解 | 六甲の気温の比較 | — | 作らない:数値の比較なのでHTMLの表(コンテンツ制作部に依頼) | 閉じた | — |
```

状態は `受付` → `制作中` → `納品済み`(承認トレイに積んだ)→ `確定`(CEOが承認)/ `作り直し`(修正依頼)/ `閉じた`(作らない)。

---

## 2. 撮影指示書(`brief.md`)

### 2-1. 雛形

```markdown
# 撮影指示書:<記事タイトル>(<スラッグ>)

- 作成:YYYY-MM-DD クリエイティブ制作部 / 対象の記事:承認トレイ「<件名>」
- 撮れる場所:<山名。どの山でも撮れるカットは「どこでも」> / 撮れる時期:<季節・天候の条件>
- カット数:<N>(1回の登山で撮り切れる数。15カット以内)
- 共通の設定:スマホは横持ち・1x(0.5xの広角は道具が歪む)・HDRオン・露出 -0.3〜-0.7・**位置情報オフ**・1枚につき3回シャッター

## サムネイル(どれか1枚。推奨は◯)
| 案 | 主役 | 構図 | 光 | 失敗の例 |
|---|---|---|---|---|
| A 道具 | … | thumb-a.svg のとおり。主役の中心は上から25〜55%、安全域の内側 | … | … |
| B 人と風景 | 後ろ姿(顔なし)… | thumb-b.svg | … | … |
| C 実測 | はかりの数字 … | thumb-c.svg | … | … |

## 本文のカット(h2ごと)
| # | h2 | 何を撮るか | 画角・向き | 条件 | キャプション案(場所・天候・時刻) | alt案 |
|---|---|---|---|---|---|---|
| 1 | … | … | 横・1x・胸の高さ | … | 「比良・八雲ヶ原 / 曇り / 9:40」 | … |

## 実測のカット
| # | 何を量るか | 写し方 | 記事の【要実測】との対応 |
|---|---|---|---|
| M1 | 手袋1組の重量 | キッチンスケールの表示が読める距離(30cm)・真上から | 【要実測:手袋の重量(g)】 |

## 撮らないもの
- 他の登山者の顔・車のナンバー・登山口の個人の掲示物
- ロゴだけが大きく写るカット(広告に見える)
```

### 2-2. 光と時間帯の目安(関西の日帰りの低山)

| 狙い | 時間帯・条件 | 理由 |
|---|---|---|
| ブランドのトーン(霧・ダークトーン) | 曇り・霧・朝の斜光 | サイトの背景と同じ空気になる。白飛びしない |
| 道具の質感 | 曇りの日中(柔らかい光)か、木陰 | 生地の織り・縫い目が見える |
| 避ける | 晴れた日の11〜14時の順光 | 影が真下に落ち、空が白く飛ぶ |
| 夜・早朝のヘッドランプ | 日の出前の青い時間(日の出の20〜40分前) | 空に色が残り、光の届き方が分かる |

### 2-3. 構図の線画(`thumb-a.svg` の雛形)

CEOには**写真の見本ではなく構図の線画**を渡す(生成画像の見本は、実物と違う期待を作る)。
1600×900に、安全域・主役の帯・記事ページで暗くなる下45%を描き、主役を線で置く。

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900" role="img" aria-label="サムネ案A 構図:手袋3組を稜線の岩の上に並べ、背景に霧の比良の稜線">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#070a12" stop-opacity="0"/>
      <stop offset="1" stop-color="#070a12" stop-opacity="0.85"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="#1a222b"/>
  <!-- 背景の稜線(等間隔の三角にしない) -->
  <path d="M0 470 C180 430 260 380 420 400 S700 330 860 360 1120 300 1300 340 1500 320 1600 350 V900 H0 Z" fill="#26313c"/>
  <!-- 主役の帯(上から25〜55%) -->
  <rect x="0" y="225" width="1600" height="270" fill="#4caf6e" fill-opacity="0.08"/>
  <text x="96" y="262" font-family="Zen Kaku Gothic New" font-size="28" fill="#4caf6e">主役の中心はこの帯(上から25〜55%)</text>
  <!-- 主役(ここを記事ごとに描き替える) -->
  <g fill="none" stroke="#e7e5df" stroke-width="4">
    <rect x="560" y="300" width="140" height="180" rx="40"/>
    <rect x="730" y="290" width="140" height="190" rx="40"/>
    <rect x="900" y="300" width="140" height="180" rx="40"/>
  </g>
  <text x="560" y="540" font-family="Zen Kaku Gothic New" font-size="32" fill="#e7e5df">手袋3組(薄い順に左から)・岩の上・目線の高さ</text>
  <!-- 記事ページで暗くなる帯(下45%) -->
  <rect x="0" y="495" width="1600" height="405" fill="url(#fade)"/>
  <text x="96" y="860" font-family="Zen Kaku Gothic New" font-size="28" fill="#9ea6b0">下45%は記事ページで暗くなる:主役を置かない</text>
  <!-- 安全域 -->
  <rect x="80" y="90" width="1440" height="720" fill="none" stroke="#cdd8e2" stroke-width="2" stroke-dasharray="12 10"/>
  <text x="1504" y="128" text-anchor="end" font-family="Zen Kaku Gothic New" font-size="28" fill="#cdd8e2">安全域 1440×720(X・Facebookで切れない)</text>
</svg>
```

---

## 3. 図解

### 3-1. SVGの雛形(4:3・1080×810)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 810" width="1080" height="810" role="img" aria-labelledby="t d">
  <title id="t">冬の稜線で手を冷やさない、手袋の3層の重ね方</title>
  <desc id="d">肌側からライナー・保温・シェルの3層。濡れたら替えるのは1層目だけ。</desc>
  <rect width="1080" height="810" fill="#0d1218"/>
  <!-- 見出し:結論を1文で(56px)と、何の図か(36px・補助色) -->
  <text x="64" y="112" font-family="Zen Kaku Gothic New" font-size="56" fill="#e7e5df">濡れたら替えるのは、1層目だけ</text>
  <text x="64" y="168" font-family="Zen Kaku Gothic New" font-size="36" fill="#9ea6b0">手袋の3層の重ね方(肌側から)</text>
  <g font-family="Zen Kaku Gothic New">
    <!-- 結論の場所だけ差し色(1図に1か所) -->
    <rect x="64" y="236" width="300" height="400" rx="6" fill="none" stroke="#4caf6e" stroke-width="3"/>
    <text x="96" y="304" font-family="Schibsted Grotesk" font-size="40" fill="#4caf6e">01</text>
    <text x="96" y="372" font-size="44" fill="#e7e5df">ライナー</text>
    <text x="96" y="436" font-size="36" fill="#9ea6b0">汗を外へ逃がす</text>
    <text x="96" y="488" font-size="36" fill="#9ea6b0">予備を1組</text>
    <rect x="390" y="236" width="300" height="400" rx="6" fill="none" stroke="rgba(231,229,223,.16)" stroke-width="2"/>
    <text x="422" y="304" font-family="Schibsted Grotesk" font-size="40" fill="#9ea6b0">02</text>
    <text x="422" y="372" font-size="44" fill="#e7e5df">保温</text>
    <text x="422" y="436" font-size="36" fill="#9ea6b0">フリース</text>
    <rect x="716" y="236" width="300" height="400" rx="6" fill="none" stroke="rgba(231,229,223,.16)" stroke-width="2"/>
    <text x="748" y="304" font-family="Schibsted Grotesk" font-size="40" fill="#9ea6b0">03</text>
    <text x="748" y="372" font-size="44" fill="#e7e5df">シェル</text>
    <text x="748" y="436" font-size="36" fill="#9ea6b0">風と雪を止める</text>
  </g>
  <!-- 出典(数字を使ったとき)と、出どころの表記 -->
  <text x="64" y="760" font-family="Zen Kaku Gothic New" font-size="24" fill="#6b747e">出典:<出典名>(YYYY年M月確認)</text>
  <text x="1016" y="760" text-anchor="end" font-family="Schibsted Grotesk" font-size="24" letter-spacing="2" fill="#6b747e">YAMATO OUTDOOR</text>
</svg>
```

- **SVGの `<text>` は折り返さない。** 1行に入る字数は「枠の内側の幅 ÷ 文字の大きさ」(幅236px・36pxなら6字まで)。
  入らなければ言葉を短くするか、`<text>` を2行に分ける。書き出したPNGを必ず目で見て、はみ出しを確かめる
  (この雛形の試作で「フリース・ウール」(8字)が枠からはみ出した)
- 山のシルエットを描くときは曲線(`C` `S`)で描き、**等間隔の三角形を並べない**(CLAUDE.md)
- 図の種類ごとの組み方:
  | 種類 | 組み方 |
  |---|---|
  | 重なり(レイヤリング) | 左から肌側→外側。結論の層だけ差し色 |
  | 高低差とコースタイム | 横軸=距離、縦軸=標高。標高は国土地理院の地理院地図などの出典を左下に。コースタイムは実測か公式の値(確認日)、無ければ【要実測】 |
  | 選び方の分かれ道 | 質問は2段まで(最大4つの答え)。3段を超えたら表にする |
  | 測り方(背面長など) | 人の輪郭は線だけ。測る2点と矢印だけ差し色 |

### 3-2. PNGへの書き出しと検査

```bash
node -e "
const sharp = require('/home/user/yamato-outdoor/node_modules/sharp');
const [src, out] = process.argv.slice(1);
sharp(src, { density: 72 * 1600 / 1080 }).resize({ width: 1600 })
  .png({ palette: true, quality: 90, compressionLevel: 9 })
  .toFile(out).then((i) => console.log(i.width + 'x' + i.height, Math.round(i.size / 1024) + 'KB'));
" fig-layers.svg fig-layers.png
# 幅360pxでの見え方(スマホ)を確かめる
node -e "require('/home/user/yamato-outdoor/node_modules/sharp')(process.argv[1]).resize({width:360}).toFile(process.argv[2])" fig-layers.png check-360.png
```

`check-360.png` をReadで開き、5秒で結論の1文が言えるか・文字が読めるかを見る。PNGは300KB以下(雛形は約36KB)。

### 3-3. 本文に貼るHTML(コンテンツ制作部に渡す)

microCMSのメディアにPNGをアップロードするのはCEO(L2)。URLは入稿のときに差し替わるので、仮のURLで渡す。

```html
<figure>
  <img src="(microCMSにアップロードしたURL)" alt="手袋を肌側からライナー・保温・シェルの3層に重ねた図。濡れたら替えるのは汗を吸う1層目だけ" width="1600" height="1200">
  <figcaption>手袋の3層の重ね方</figcaption>
</figure>
<p class="source">※ 出典: <出典名>(YYYY年M月確認)</p>
```

`width` / `height` は書き出したPNGの実寸(CLSの対策)。`<p class="source">` は数字を使った図だけ。

---

## 4. シネマグラフ(Motion Lab)

### 4-1. Veoに渡すプロンプト(CEOがGeminiの画面で、元のカバー写真と一緒に入れる)

```
この写真をもとに、10秒のシネマグラフを作ってください。
動かすのは山頂の周りの雲と霧だけで、左から右へゆっくり流れる。
山の稜線・木・岩・空の明るさ・色は一切変えない。カメラは完全に固定(パン・ズーム・手ぶれなし)。
最初と最後で雲の位置が近くなるように。人物・動物・鳥・文字は入れない。音声なし。
```

### 4-2. 仕上げ(音声を消す・継ぎ目をクロスフェード・軽量化)

```bash
IN=veo-raw.mp4; OUT=cover-mist.mp4; F=1   # F=継ぎ目のクロスフェードの秒数
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN" | cut -d. -f1)
ffmpeg -y -i "$IN" -filter_complex \
 "[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,fps=24,split[a][b];\
  [a]trim=start=$F,setpts=PTS-STARTPTS[m];[b]trim=0:$F,setpts=PTS-STARTPTS[h];\
  [m][h]xfade=transition=fade:duration=$F:offset=$((D-2*F))[v]" \
 -map "[v]" -an -c:v libx264 -profile:v high -preset slow -crf 28 -pix_fmt yuv420p -movflags +faststart "$OUT"
```

尺は `D-F` 秒になる(10秒の素材なら9秒)。最初のフレームと最後のフレームが同じ絵になるので、ループで跳ばない。
700KBを超えたら `-crf` を1ずつ上げる(上げすぎると霧の階調が縞になる。30を超えたら尺を短くする方を選ぶ)。

### 4-3. 検査(数値を承認トレイの根拠に書く)

```bash
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate,pix_fmt -of compact "$OUT"
ffmpeg -v error -y -i "$OUT" -frames:v 1 first.png
ffmpeg -v error -y -sseof -0.05 -i "$OUT" -frames:v 1 -update 1 last.png
ffmpeg -i first.png -i last.png -lavfi ssim -f null - 2>&1 | grep -o "All:[0-9.]*"      # 継ぎ目:0.90以上
# ポスターは1フレーム目から作ると、切り替えで跳ばない(元写真をそのまま使うならSSIMを測る)
node -e "require('/home/user/yamato-outdoor/node_modules/sharp')('first.png').webp({quality:78}).toFile('poster.webp').then(i=>console.log(Math.round(i.size/1024)+'KB'))"
```

測定の実例(2026-11-01):現行の `01-mist.mp4` は継ぎ目のSSIM 0.79・ポスターと1フレーム目 0.74。
同じ動画を4-2の手順(F=1)で作り直すと、継ぎ目 0.97・9秒・約326KBになった。

組み込み(`public/media/hero/` への配置・`poster` の差し替え・fpsの計測)はサイト開発部に、動画とポスターと検査の数値を渡す。

---

## 5. 届いた写真の書き出し(サムネイル・本文)

```bash
# サムネ:1600×900に切り出す。position は主役の位置に合わせる(north = 上寄せ)。EXIF(位置情報)は消える
node -e "
const sharp = require('/home/user/yamato-outdoor/node_modules/sharp');
const [src, out, pos] = process.argv.slice(1);
sharp(src).rotate().resize(1600, 900, { fit: 'cover', position: pos || 'attention' })
  .jpeg({ quality: 82, mozjpeg: true }).toFile(out).then((i) => console.log(i.width + 'x' + i.height, Math.round(i.size / 1024) + 'KB'));
" IMG_1234.jpg thumb.jpg north
# 本文の写真:長辺1600px。縦写真はそのまま縦で
node -e "require('/home/user/yamato-outdoor/node_modules/sharp')(process.argv[1]).rotate().resize({width:1600,height:1600,fit:'inside'}).jpeg({quality:82,mozjpeg:true}).toFile(process.argv[2]).then(i=>console.log(i.width+'x'+i.height,Math.round(i.size/1024)+'KB'))" IMG_1235.jpg body-01.jpg
# 位置情報が消えたかを確かめる(何も出なければよい)
node -e "require('/home/user/yamato-outdoor/node_modules/sharp')(process.argv[1]).metadata().then(m=>console.log(m.exif?'EXIFあり':''))" thumb.jpg
```

- 明るさ以外の加工(彩度・色かぶりの補正・レタッチ)はしない(`docs/tone-and-manner.md` 7章)
- 切り出したら、2-3の線画を重ねて安全域と主役の帯に収まっているかを確かめる

---

## 6. `meta.md`(1納品に1つ)

```markdown
# <スラッグ> の制作物

| ファイル | 種類 | 出どころ | 道具 | 使う場所 | alt / キャプション |
|---|---|---|---|---|---|
| thumb.jpg | サムネイル | CEOが撮影(2026-11-08 比良・八雲ヶ原) | sharpで切り出し・EXIF削除 | microCMS `thumbnail` | (alt は記事タイトルが自動で入る)/ 比良・八雲ヶ原 / 曇り / 9:40 |
| fig-layers.png | 図解 | クリエイティブ制作部が作成(SVG) | sharp | 本文「3枚の重ね方」 | 手袋を肌側から…の図 |
| cover-mist.mp4 | 動画 | CEOの写真からVeoで生成 | Veo + ffmpeg | トップのカバー | — |

- 権利の確認:<不要(自分で撮影・作成)/ 法務部に依頼済み(日付・理由)>
```
