/**
 * 売上データの取り込み元。2026年10月時点で調べた「無料APIで自動取得できるか」を併記する。
 * 状況は変わりやすいので、APIが出たら `api` を書き換え、取り込みを自動化する(Phase 2)。
 *
 *   api: 'none'        … 成果レポートを取るAPIがない → CSVを取り込む
 *   api: 'partial'     … APIはあるが、売上は取れない(商品情報などだけ)
 *   csv: true/false    … 管理画面からCSVを書き出せるか(false なら手入力)
 */
export type SourceKind = 'affiliate' | 'goods';

export type DataSource = {
  id: string;
  name: string;
  kind: SourceKind;
  api: 'none' | 'partial';
  csv: boolean;
  /** 調べた結果と、CSVの出し方の手がかり */
  note: string;
};

export const DATA_SOURCES: DataSource[] = [
  {
    id: 'a8',
    name: 'A8.net',
    kind: 'affiliate',
    api: 'none',
    csv: true,
    note: '「成果データ連携API」は広告(Google・Meta等)へ成果を送るためのもので、自分の成果を取り出す用途ではない。管理画面のレポートからCSVを書き出す。',
  },
  {
    id: 'moshimo',
    name: 'もしもアフィリエイト',
    kind: 'affiliate',
    api: 'none',
    csv: true,
    note: '成果を取るAPIは見つからなかった。成果一覧をCSVで書き出す(書き出せない場合は手入力)。',
  },
  {
    id: 'valuecommerce',
    name: 'バリューコマース',
    kind: 'affiliate',
    api: 'partial',
    csv: true,
    note: 'APIは商品検索用で、成果レポートは取れない。管理画面のレポートからCSVを書き出す。',
  },
  {
    id: 'accesstrade',
    name: 'アクセストレード',
    kind: 'affiliate',
    api: 'none',
    csv: true,
    note: '成果別レポートからCSVをダウンロードできる(成果発生日時・確定日・報酬・プログラム名など)。',
  },
  {
    id: 'amazon',
    name: 'Amazonアソシエイト',
    kind: 'affiliate',
    api: 'none',
    csv: true,
    note: 'PA-APIは商品情報用で、紹介料のレポートは取れない。レポート画面からCSVをダウンロードする。',
  },
  {
    id: 'rakuten',
    name: '楽天アフィリエイト',
    kind: 'affiliate',
    api: 'none',
    csv: true,
    note: '楽天ウェブサービスのAPIは商品検索用。成果は管理画面のレポートから。',
  },
  {
    id: 'suzuri',
    name: 'SUZURI',
    kind: 'goods',
    api: 'partial',
    csv: false,
    note: '公式APIは無料(アクセストークン)だが、商品・素材の取得や作成用で、売上(トリブン)を取る口は見つからなかった。販売中のアイテム数はAPIで自動取得できる(Phase 2)。売上は手入力。',
  },
];

export const sourceById = (id: string) => DATA_SOURCES.find((s) => s.id === id);
