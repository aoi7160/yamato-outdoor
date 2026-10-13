# -*- coding: utf-8 -*-
"""リポジトリの活動(全ブランチ)を期間で集計する。報告書の「やったこと」の取りこぼしを防ぐ。

    python3 git_activity.py <開始 YYYY-MM-DD> <終了 YYYY-MM-DD> [--repo パス] [--json 出力.json]

やること:
  1. git fetch --all(取り込んでいないブランチがあると、その作業がまるごと抜ける)
  2. 全ブランチのコミットを取り、日付で絞る(git log の --since は使わない。--all と組み合わせると
     コミット日でなく辿り方で漏れることがある)
  3. コミットごとに「mainに入ったか」「どのブランチにあるか」「マージか」を付ける
  4. 日別の件数(main反映 / 未マージ)と、mainに入っていないブランチの一覧を出す

日付はコミットの日付(作者の日付)を日本時間で扱う。GitHubのPRのマージ日時はUTCなので、
報告書に書くときは日本時間に直す(references/lessons.md)。
"""
import json
import os
import subprocess
import sys
from collections import OrderedDict, defaultdict


def git(repo, *args):
    env = {**os.environ, "TZ": "Asia/Tokyo"}  # 日付は日本時間で切る
    return subprocess.run(["git", "-C", repo, *args], capture_output=True, text=True, check=True, env=env).stdout


def main(start, end, repo=".", out=None):
    try:
        git(repo, "fetch", "--all", "--quiet")
    except subprocess.CalledProcessError as e:
        print(f"注意: git fetch に失敗しました。手元にあるブランチだけで集計します({e.stderr.strip()})", file=sys.stderr)

    main_ref = "origin/main" if git(repo, "branch", "-r", "--list", "origin/main").strip() else "main"
    on_main = set(git(repo, "rev-list", main_ref).split())

    fmt = "%H%x1f%h%x1f%ad%x1f%P%x1f%s"
    rows = []
    for line in git(repo, "log", "--all", "--date=format-local:%Y-%m-%d", f"--pretty=format:{fmt}").splitlines():
        full, short, date, parents, subject = line.split("\x1f")
        if start <= date <= end:
            rows.append({"hash": short, "full": full, "date": date, "merge": len(parents.split()) > 1,
                         "on_main": full in on_main, "subject": subject})

    branches = [b.strip() for b in git(repo, "branch", "-r").splitlines() if "->" not in b]
    unmerged = []
    for b in branches:
        ahead = git(repo, "log", "--pretty=format:%h %ad %s", "--date=short", f"{main_ref}..{b}").strip()
        if ahead:
            lines = ahead.splitlines()
            in_period = [l for l in lines if start <= l.split()[1] <= end]
            if in_period:
                unmerged.append({"branch": b, "commits_in_period": len(in_period), "examples": in_period[:5]})

    by_day = OrderedDict()
    for r in sorted(rows, key=lambda r: r["date"]):
        d = r["date"][5:].replace("-", "/").lstrip("0").replace("/0", "/")
        by_day.setdefault(d, [0, 0])
        by_day[d][0 if r["on_main"] else 1] += 1

    result = {
        "period": [start, end],
        "total": len(rows),
        "merges": sum(r["merge"] for r in rows),
        "on_main": sum(r["on_main"] for r in rows),
        "not_on_main": sum(not r["on_main"] for r in rows),
        "by_day": [[d, a, b] for d, (a, b) in by_day.items()],
        "unmerged_branches": unmerged,
        "commits": rows,
    }
    print(f"期間 {start}〜{end}: {result['total']}件(うちマージ {result['merges']}件)/ main反映 {result['on_main']}件・未マージ {result['not_on_main']}件")
    for u in unmerged:
        print(f"  未マージ: {u['branch']}({u['commits_in_period']}件)")
    print("  日別: " + ", ".join(f"{d} {a + b}" for d, a, b in result["by_day"]))
    if out:
        with open(out, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"→ {out}(by_day はそのまま report_pdf.py の bars ブロックの data に使える)")
    return result


if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) < 2:
        raise SystemExit(__doc__)
    repo = args[args.index("--repo") + 1] if "--repo" in args else "."
    out = args[args.index("--json") + 1] if "--json" in args else None
    main(args[0], args[1], repo, out)
