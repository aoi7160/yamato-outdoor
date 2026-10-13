# -*- coding: utf-8 -*-
"""事業報告書・事業計画書のPDFを、JSONの構成ファイルから作る。

    python3 report_pdf.py <spec.json>

構成ファイルの書き方は templates/ と references/style-*.md を参照。
theme は external(投資家・金融機関向け)と internal(社内向け)の2つ。
画像のパスは構成ファイルからの相対パス。存在しない画像があれば止める(黙って抜かない)。
"""
import json
import math
import os
import re
import sys

from reportlab.graphics.shapes import Drawing, Line, Rect, String
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus import (Image, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer,
                                Table, TableStyle)

pdfmetrics.registerFont(UnicodeCIDFont("HeiseiKakuGo-W5"))
pdfmetrics.registerFont(UnicodeCIDFont("HeiseiMin-W3"))
G, M = "HeiseiKakuGo-W5", "HeiseiMin-W3"

INK = colors.HexColor("#111111")
INK2 = colors.HexColor("#4a4a4a")
MUTED = colors.HexColor("#8a8984")
GRID = colors.HexColor("#e4e4e0")
RULE = colors.HexColor("#9a9a9a")
GREEN = colors.HexColor("#1b4332")
GREEN2 = colors.HexColor("#2d6a4f")
LIGHT = colors.HexColor("#f4f6f4")
HEAD_GRAY = colors.HexColor("#eeeeec")
WARN_BG = colors.HexColor("#fdf6e3")
# 色覚多様性の検証済み(緑と黄土)。2系列までに使う。凡例と数値ラベルを必ず併記する
SERIES = [colors.HexColor("#23865a"), colors.HexColor("#c9822b")]

CONTENT_W = 170  # mm(左右20mmの余白)


def styles(theme):
    body_font = M if theme == "external" else M
    head = INK if theme == "external" else GREEN
    st = {
        "title": ParagraphStyle("title", fontName=M if theme == "external" else G, fontSize=17 if theme == "external" else 20,
                                leading=25, alignment=1 if theme == "external" else 0, spaceAfter=2),
        "period": ParagraphStyle("period", fontName=M, fontSize=10, leading=15, alignment=1 if theme == "external" else 0,
                                 textColor=INK2),
        "org": ParagraphStyle("org", fontName=M, fontSize=10.5, leading=15, alignment=2 if theme == "external" else 0,
                              spaceBefore=8, spaceAfter=12, textColor=INK if theme == "external" else INK2),
        "h1": ParagraphStyle("h1", fontName=G, fontSize=12.5 if theme == "external" else 15, leading=19, spaceBefore=15,
                             spaceAfter=7, textColor=head),
        "h2": ParagraphStyle("h2", fontName=G, fontSize=11, leading=16, spaceBefore=11, spaceAfter=5, textColor=GREEN2),
        "h3": ParagraphStyle("h3", fontName=G, fontSize=10, leading=15, spaceBefore=7, spaceAfter=3, leftIndent=8),
        "p": ParagraphStyle("p", fontName=body_font, fontSize=10, leading=17, firstLineIndent=10 if theme == "external" else 0,
                            spaceAfter=4),
        "ind": ParagraphStyle("ind", fontName=body_font, fontSize=10, leading=16.5, leftIndent=18, spaceAfter=3),
        "sq": ParagraphStyle("sq", fontName=G, fontSize=9.8, leading=15, leftIndent=18, spaceBefore=4, spaceAfter=2),
        "result": ParagraphStyle("result", fontName=body_font, fontSize=10, leading=16, leftIndent=36, spaceAfter=4),
        "bullet": ParagraphStyle("bullet", fontName=body_font, fontSize=10, leading=15, leftIndent=12, firstLineIndent=-10,
                                 spaceAfter=3),
        "hc": ParagraphStyle("hc", fontName=G, fontSize=8.8, leading=12.5,
                             textColor=INK if theme == "external" else colors.white),
        "c": ParagraphStyle("c", fontName=body_font, fontSize=8.8, leading=12.8),
        "cnum": ParagraphStyle("cnum", fontName=body_font, fontSize=8.8, leading=12.8, alignment=2),
        "cap": ParagraphStyle("cap", fontName=M, fontSize=8.5, leading=12, alignment=1, textColor=INK2),
        "note": ParagraphStyle("note", fontName=M, fontSize=8.5, leading=12.5, textColor=INK2, spaceBefore=2, spaceAfter=4),
        "box": ParagraphStyle("box", fontName=M, fontSize=9.6, leading=15),
        "kpiv": ParagraphStyle("kpiv", fontName=G, fontSize=18, leading=22, alignment=1, textColor=INK),
        "kpil": ParagraphStyle("kpil", fontName=M, fontSize=8.6, leading=12, alignment=1, textColor=INK2),
    }
    # 和文は単語の区切りがないので、CJKの折り返しにしないと「記事:」の直後で改行される
    for v in st.values():
        v.wordWrap = "CJK"
    # 見出しがページの最後に取り残されないよう、次の要素と同じページに置く
    for k in ("h1", "h2", "h3", "sq"):
        st[k].keepWithNext = 1
    return st


def para(text, style, st):
    # CIDフォントでは <b> が効かないので、ゴシックへの切り替えで太字の代わりにする
    # 「P&L」の & が文字参照として解釈されて「P&L;」になるのを防ぐ(&amp; などの参照はそのまま)
    text = re.sub(r"&(?![a-zA-Z]+;|#[0-9]+;)", "&amp;", str(text))
    text = text.replace("<b>", f'<font name="{G}">').replace("</b>", "</font>").replace("\n", "<br/>")
    return Paragraph(text, st[style])


def build_table(blk, st, theme):
    header = blk["header"]
    widths = blk.get("widths") or [CONTENT_W / len(header)] * len(header)
    if sum(widths) > CONTENT_W + 0.5:
        raise SystemExit(f"表の列幅の合計が本文幅({CONTENT_W}mm)を超えています: {sum(widths)}mm / {header}")
    num_cols = set(blk.get("numeric_cols", []))
    data = [[para(h, "hc", st) for h in header]]
    for row in blk["rows"]:
        if len(row) != len(header):
            raise SystemExit(f"表の列数が見出しと合いません: {row}")
        data.append([para(v, "cnum" if i in num_cols else "c", st) for i, v in enumerate(row)])
    t = Table(data, colWidths=[w * mm for w in widths], repeatRows=1,
              hAlign="RIGHT" if theme == "external" and sum(widths) < CONTENT_W - 5 else "CENTER")
    style = [
        ("GRID", (0, 0), (-1, -1), 0.5, RULE if theme == "external" else colors.HexColor("#cccccc")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]
    if theme == "external":
        style.append(("BACKGROUND", (0, 0), (-1, 0), HEAD_GRAY))
    else:
        style += [("BACKGROUND", (0, 0), (-1, 0), GREEN),
                  ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT])]
    for r in blk.get("total_rows", []):
        style.append(("BACKGROUND", (0, r), (-1, r), HEAD_GRAY if theme == "external" else LIGHT))
        style.append(("LINEABOVE", (0, r), (-1, r), 1.0, INK2))
    t.setStyle(TableStyle(style))
    return t


def image_flowable(path, width_mm=None, height_mm=None):
    from PIL import Image as PImage
    w, h = PImage.open(path).size
    if width_mm:
        return Image(path, width=width_mm * mm, height=width_mm * mm * h / w)
    return Image(path, width=height_mm * mm * w / h, height=height_mm * mm)


def resolve(base, p):
    full = p if os.path.isabs(p) else os.path.join(base, p)
    if not os.path.exists(full):
        raise SystemExit(f"画像が見つかりません: {full}")
    return full


def build_photos(blk, st, base):
    items = blk["items"]
    h = blk.get("height", 58)
    col = blk.get("col_width", min(56, CONTENT_W / len(items)))
    cols = blk.get("col_widths") or [col] * len(items)  # 縦横が混ざる写真(PCとスマホの画面)は列ごとに指定
    row = [image_flowable(resolve(base, p), height_mm=h) for p, _ in items]
    caps = [para(c, "cap", st) for _, c in items]
    t = Table([row, caps], colWidths=[c * mm for c in cols])
    t.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"), ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 2), ("RIGHTPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 1), (-1, 1), 3),
    ]))
    # 写真とキャプションが別のページに泣き別れないようにする
    return KeepTogether([t])


def build_kpis(blk, st):
    items = blk["items"]
    w = CONTENT_W / len(items)
    cells = [[[para(v, "kpiv", st), para(l, "kpil", st)] for v, l in items]]
    t = Table(cells, colWidths=[w * mm] * len(items), rowHeights=[20 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
        ("LINEBEFORE", (1, 0), (-1, -1), 2, colors.white),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return t


def build_bars(blk):
    """縦棒(1〜2系列の積み上げ)。data: [[ラベル, 系列1, 系列2?], ...]"""
    data = blk["data"]
    series = blk.get("series", ["値"])
    W, H = CONTENT_W * mm, blk.get("height", 70) * mm
    d = Drawing(W, H)
    left, bottom, top = 26, 22, 30
    pw, ph = W - left - 6, H - bottom - top
    totals = [sum(r[1:]) for r in data]
    step = blk.get("tick", None)
    maxv = max(totals) if totals else 1
    if not step:
        raw = maxv / 5 or 1
        mag = 10 ** math.floor(math.log10(raw))
        step = next(m * mag for m in (1, 2, 2.5, 5, 10) if m * mag >= raw)
    top_v = step * math.ceil(maxv / step) if maxv else step
    v = 0
    while v <= top_v + 1e-9:
        y = bottom + ph * v / top_v
        d.add(Line(left, y, left + pw, y, strokeColor=GRID if v else INK2, strokeWidth=0.5 if v else 0.8))
        lab = f"{v:,.0f}" if float(v).is_integer() else f"{v:,.1f}"
        d.add(String(left - 5, y - 3, lab, fontName=M, fontSize=7, fillColor=MUTED, textAnchor="end"))
        v += step
    n = len(data)
    slot = pw / max(1, n)
    bw = min(22, slot * 0.55)
    unit = blk.get("unit", "")
    for i, row in enumerate(data):
        x = left + slot * i + (slot - bw) / 2
        y = bottom
        for k, val in enumerate(row[1:]):
            if not val:
                continue
            h = ph * val / top_v
            gap = 1.2 if y > bottom else 0  # 積み上げの間に2px相当の隙間
            d.add(Rect(x, y + gap, bw, h - gap, fillColor=SERIES[k % 2], strokeColor=None))
            y += h
        d.add(String(x + bw / 2, y + 3, f"{totals[i]:,.0f}{unit}", fontName=G, fontSize=7.5, fillColor=INK,
                     textAnchor="middle"))
        d.add(String(x + bw / 2, bottom - 11, str(row[0]), fontName=M, fontSize=7.5, fillColor=INK2,
                     textAnchor="middle"))
    d.add(String(0, H - 11, blk.get("title", ""), fontName=G, fontSize=9.5, fillColor=INK))
    if len(series) > 1:
        lx = 0
        for k, lab in enumerate(series):
            d.add(Rect(lx, H - 25, 8, 8, fillColor=SERIES[k % 2], strokeColor=None))
            d.add(String(lx + 11, H - 24, lab, fontName=M, fontSize=8, fillColor=INK2))
            lx += 11 + pdfmetrics.stringWidth(lab, M, 8) + 18
    return d


def build_hbars(blk):
    """横棒(1系列)。data: [[ラベル, 値], ...]。多い順に並べてから渡す"""
    data = blk["data"]
    W = CONTENT_W * mm
    rowh = 17
    H = rowh * len(data) + 26
    d = Drawing(W, H)
    d.add(String(0, H - 11, blk.get("title", ""), fontName=G, fontSize=9.5, fillColor=INK))
    labw = blk.get("label_width", 110)
    pw = W - labw - 50
    maxv = max(v for _, v in data) or 1
    unit = blk.get("unit", "")
    for i, (k, v) in enumerate(data):
        y = H - 30 - i * rowh
        d.add(String(labw - 6, y + 2, str(k), fontName=M, fontSize=8.5, fillColor=INK2, textAnchor="end"))
        w = pw * v / maxv
        d.add(Rect(labw, y, w, 10, fillColor=SERIES[0], strokeColor=None))
        d.add(String(labw + w + 5, y + 2, f"{v:,.0f}{unit}", fontName=G, fontSize=8, fillColor=INK))
    return d


def build_box(blk, st):
    inner = [para(f"<b>{blk['title']}</b>", "box", st)] + [para("・" + x, "box", st) for x in blk["items"]]
    t = Table([[inner]], colWidths=[CONTENT_W * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), WARN_BG),
        ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#d9c89a")),
        ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9),
    ]))
    return t


def glue_headings(flowables):
    """見出し(連続していてもまとめて)を、その次の要素と同じページに置く。
    keepWithNext は写真の表(KeepTogether)と組み合わせると効かないことがあるため、明示的に束ねる"""
    out, pending = [], []
    for f in flowables:
        is_heading = isinstance(f, Paragraph) and f.style.name in ("h1", "h2", "h3", "sq")
        if is_heading:
            pending.append(f)
            continue
        if pending:
            # KeepTogether の入れ子は、空きがあっても改ページされることがあるので中身を平らにする
            inner = list(f._content) if isinstance(f, KeepTogether) else [f]
            out.append(KeepTogether(pending + inner))
            pending = []
        else:
            out.append(f)
    return out + pending


def build(spec_path):
    with open(spec_path, encoding="utf-8") as f:
        spec = json.load(f)
    base = os.path.dirname(os.path.abspath(spec_path))
    theme = spec.get("theme", "internal")
    if theme not in ("internal", "external"):
        raise SystemExit("theme は internal か external")
    st = styles(theme)
    out = spec["output"] if os.path.isabs(spec["output"]) else os.path.join(base, spec["output"])
    footer_text = spec.get("footer", "")

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont(M, 8.5)
        canvas.setFillColor(INK2 if theme == "external" else MUTED)
        if theme == "external":
            canvas.drawCentredString(A4[0] / 2, 10 * mm, f"- {doc.page} -")
        else:
            canvas.drawString(20 * mm, 10 * mm, footer_text)
            canvas.drawRightString(A4[0] - 20 * mm, 10 * mm, f"{doc.page}")
        canvas.restoreState()

    doc = SimpleDocTemplate(out, pagesize=A4, topMargin=19 * mm, bottomMargin=18 * mm, leftMargin=20 * mm,
                            rightMargin=20 * mm, title=spec["title"], author=spec.get("org", ""))
    s = [para(spec["title"], "title", st)]
    if spec.get("period"):
        s.append(para(spec["period"], "period", st))
    if spec.get("org"):
        s.append(para(spec["org"], "org", st))

    for blk in spec["blocks"]:
        t = blk["type"]
        if t in ("h1", "h2", "h3", "p", "ind", "sq", "result", "note"):
            s.append(para(blk["text"], t, st))
        elif t == "bullets":
            s += [para("・" + x, "bullet", st) for x in blk["items"]]
        elif t == "table":
            s.append(build_table(blk, st, theme))
            if blk.get("note"):
                s.append(para(blk["note"], "note", st))
        elif t == "photos":
            s.append(build_photos(blk, st, base))
        elif t == "image":
            img = image_flowable(resolve(base, blk["path"]), width_mm=blk.get("width"), height_mm=blk.get("height"))
            parts = [img] + ([para(blk["caption"], "cap", st)] if blk.get("caption") else [])
            s.append(KeepTogether(parts))
        elif t == "kpis":
            s.append(build_kpis(blk, st))
            s.append(Spacer(1, 6))
        elif t == "bars":
            s.append(build_bars(blk))
        elif t == "hbars":
            s.append(build_hbars(blk))
        elif t == "box":
            s.append(build_box(blk, st))
        elif t == "spacer":
            s.append(Spacer(1, blk.get("height", 6)))
        elif t == "pagebreak":
            s.append(PageBreak())
        else:
            raise SystemExit(f"知らないブロックの種類です: {t}")

    doc.build(glue_headings(s), onFirstPage=footer, onLaterPages=footer)
    import pypdfium2 as pdfium  # ページ数の確認用(レイアウトは必ず画像にして目で見る)
    n = len(pdfium.PdfDocument(out))
    print(f"OK: {out}({n}ページ)")
    return out


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    build(sys.argv[1])
