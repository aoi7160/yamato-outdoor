# -*- coding: utf-8 -*-
"""月次P&Lを台帳のCSV(NotionのDBから書き出したもの)から計算する。

    python3 pl.py <台帳のフォルダ> <対象月 YYYY-MM> [--json 出力.json]

フォルダには次の3つのCSVを置く(列の意味は references/pl-definition.md)。
  revenue.csv   date,confirmed_date,channel,source,status,amount,note
  expenses.csv  date,item,category,amount,business_ratio,allocation,receipt,note
  time.csv      date,category,hours,note

計算のルール(references/pl-definition.md と同じ):
  - 1行 = 1件の成果。状態が進んだら同じ行の status を書き換える(発生 → 確定 → 入金 / 否認)
  - 売上は status が「確定」「入金」のものを、確定日(confirmed_date)の月に計上する
  - 「発生」のまま(未確定)は参考として発生日の月に別集計する。「否認」は入れない
  - 費用は amount × business_ratio。allocation が monthly12 のものは支払月から12ヶ月に均等に配る
  - 営業利益 = 売上(確定) − 費用。時間あたり利益 = 営業利益 ÷ 作業時間
  - 自分の人件費は費用に入れない(個人事業。時間あたり利益で評価する)
"""
import csv
import json
import os
import sys
from collections import defaultdict

REVENUE_STATUSES = ("発生", "確定", "入金", "否認")
ALLOCATIONS = ("once", "monthly12")
TIME_CATEGORIES = ("記事", "取材", "アプリ", "SNS", "営業", "計画と報告", "その他")


def ym(date):
    return date[:7]


def months_from(start, n):
    y, m = map(int, start.split("-"))
    out = []
    for _ in range(n):
        out.append(f"{y:04d}-{m:02d}")
        m += 1
        if m > 12:
            y, m = y + 1, 1
    return out


def read(path):
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8-sig") as f:
        return [{k.strip(): (v or "").strip() for k, v in row.items()} for row in csv.DictReader(f)]


def to_num(v, field, row):
    try:
        return float(str(v).replace(",", "").replace("¥", "").replace("円", "") or 0)
    except ValueError:
        raise SystemExit(f"{field} が数字ではありません: {row}")


def compute(folder, month):
    rev = read(os.path.join(folder, "revenue.csv"))
    exp = read(os.path.join(folder, "expenses.csv"))
    tim = read(os.path.join(folder, "time.csv"))
    problems = []

    confirmed = defaultdict(float)  # P&Lに入れる(確定・入金)
    pending = defaultdict(float)    # 参考:発生のまま
    paid = defaultdict(float)       # 参考:入金済み(確定のうち)
    for r in rev:
        st = r["status"]
        if st not in REVENUE_STATUSES:
            problems.append(f"売上の status が不正: {r}")
            continue
        amount = to_num(r["amount"], "amount", r)
        if st in ("確定", "入金"):
            if not r.get("confirmed_date"):
                problems.append(f"確定日が空です(発生日で計上しました): {r}")
            if ym(r.get("confirmed_date") or r["date"]) == month:
                confirmed[r["channel"]] += amount
                if st == "入金":
                    paid[r["channel"]] += amount
        elif st == "発生" and ym(r["date"]) == month:
            pending[r["channel"]] += amount

    expenses = defaultdict(float)
    missing_receipts = []
    for e in exp:
        amount = to_num(e["amount"], "amount", e) * to_num(e.get("business_ratio") or 1, "business_ratio", e)
        alloc = e.get("allocation") or "once"
        if alloc not in ALLOCATIONS:
            problems.append(f"費用の allocation が不正: {e}")
            continue
        if alloc == "once":
            if ym(e["date"]) == month:
                expenses[e["category"]] += amount
                if e.get("receipt", "") not in ("有", "あり", "yes", "y", "1", "true"):
                    missing_receipts.append(e["item"])
        else:
            if month in months_from(ym(e["date"]), 12):
                expenses[e["category"]] += amount / 12
                if ym(e["date"]) == month and e.get("receipt", "") not in ("有", "あり", "yes", "y", "1", "true"):
                    missing_receipts.append(e["item"])

    hours = defaultdict(float)
    for t in tim:
        if ym(t["date"]) != month:
            continue
        if t["category"] not in TIME_CATEGORIES:
            problems.append(f"作業時間の区分が不正(「その他」に入れました): {t}")
            t["category"] = "その他"
        hours[t["category"]] += to_num(t["hours"], "hours", t)

    sales = sum(confirmed.values())
    cost = sum(expenses.values())
    total_hours = sum(hours.values())
    profit = sales - cost
    result = {
        "month": month,
        "revenue_confirmed": dict(confirmed),
        "revenue_pending": dict(pending),
        "revenue_paid": dict(paid),
        "sales": round(sales),
        "expenses": {k: round(v) for k, v in expenses.items()},
        "cost": round(cost),
        "operating_profit": round(profit),
        "margin_pct": round(profit / sales * 100, 1) if sales else None,
        "hours": dict(hours),
        "total_hours": round(total_hours, 1),
        "profit_per_hour": round(profit / total_hours) if total_hours else None,
        "missing_receipts": missing_receipts,
        "problems": problems,
    }
    return result


def print_md(r):
    yen = lambda v: f"¥{v:,.0f}"
    print(f"## 月次P&L {r['month']}\n")
    print("| 科目 | 金額 |\n|---|---:|")
    for k, v in sorted(r["revenue_confirmed"].items(), key=lambda x: -x[1]):
        print(f"| 売上:{k} | {yen(v)} |")
    print(f"| **売上合計(確定)** | **{yen(r['sales'])}** |")
    for k, v in sorted(r["expenses"].items(), key=lambda x: -x[1]):
        print(f"| 費用:{k} | {yen(v)} |")
    print(f"| **費用合計** | **{yen(r['cost'])}** |")
    print(f"| **営業利益** | **{yen(r['operating_profit'])}** |")
    print(f"\n- 営業利益率: {r['margin_pct'] if r['margin_pct'] is not None else '—'}%")
    print(f"- 作業時間: {r['total_hours']}時間({', '.join(f'{k} {v:g}h' for k, v in r['hours'].items())})")
    print(f"- 時間あたり利益: {yen(r['profit_per_hour']) if r['profit_per_hour'] is not None else '—'}/時間")
    if r["revenue_pending"]:
        print(f"- 参考:未確定(発生のまま)の売上 {yen(sum(r['revenue_pending'].values()))}(否認されることがあるのでP&Lには入れない)")
    if r["revenue_paid"]:
        print(f"- 参考:確定のうち入金済み {yen(sum(r['revenue_paid'].values()))}")
    if r["missing_receipts"]:
        print(f"- 領収書が未回収: {', '.join(r['missing_receipts'])}")
    for p in r["problems"]:
        print(f"- 要確認: {p}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    res = compute(sys.argv[1], sys.argv[2])
    if "--json" in sys.argv:
        with open(sys.argv[sys.argv.index("--json") + 1], "w", encoding="utf-8") as f:
            json.dump(res, f, ensure_ascii=False, indent=2)
    print_md(res)
