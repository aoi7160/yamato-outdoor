# -*- coding: utf-8 -*-
"""PDFの全ページを1枚の画像に並べる。レイアウト(空白ページ・泣き別れ・はみ出し)を目で確認するため。

    python3 preview.py <file.pdf> [出力.png]

出力をReadツールで開いて確認する。ページ数が多いときは4ページずつ別画像にする。
"""
import sys

import pypdfium2 as pdfium
from PIL import Image


def main(pdf, out=None):
    out = out or pdf.rsplit(".", 1)[0] + "_preview.png"
    doc = pdfium.PdfDocument(pdf)
    pages = [doc[i].render(scale=0.9).to_pil() for i in range(len(doc))]
    w, h = pages[0].size
    paths = []
    for g in range(0, len(pages), 4):
        grp = pages[g:g + 4]
        canvas = Image.new("RGB", (w * len(grp), h), "white")
        for i, im in enumerate(grp):
            canvas.paste(im, (i * w, 0))
        p = out if len(pages) <= 4 else out.replace(".png", f"_{g // 4 + 1}.png")
        canvas.save(p)
        paths.append(p)
    print(f"{len(pages)}ページ → " + ", ".join(paths))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    main(*sys.argv[1:3])
