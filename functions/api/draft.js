/**
 * 下書き記事を取得するCloudflare Pages Functions。
 *
 * このサイトはCloudflare Pagesに静的サイトとして配信しているため、
 * リクエスト時にサーバーで描画するページ(SSR)を置けない。
 * そこで「下書きの取得」だけをこの関数に任せ、表示は /preview/ が
 * ブラウザ側で行う構成にしている。
 *
 * microCMSのAPIキーはこの関数の中だけで使い、ブラウザには一切渡さない。
 * 下書きを見られるのは draftKey を知っている人だけで、これはmicroCMSの
 * 画面プレビューと同じ考え方。
 */

/** microCMSのコンテンツIDに使える文字だけを通す(パスに余計なものを混ぜられないようにする) */
const CONTENT_ID = /^[A-Za-z0-9_-]{1,64}$/;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // 下書きなので、どこにもキャッシュさせない
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });

export async function onRequestGet({ request, env }) {
  const { searchParams } = new URL(request.url);
  const contentId = searchParams.get('contentId');
  const draftKey = searchParams.get('draftKey');

  if (!contentId || !draftKey) {
    return json({ error: 'contentId と draftKey の両方が必要です。' }, 400);
  }
  if (!CONTENT_ID.test(contentId)) {
    return json({ error: 'contentId の形式が正しくありません。' }, 400);
  }

  const serviceDomain = env.MICROCMS_SERVICE_DOMAIN;
  const apiKey = env.MICROCMS_API_KEY;

  if (!serviceDomain || !apiKey) {
    return json(
      {
        error:
          'サーバー側にmicroCMSの接続情報がありません。Cloudflare Pagesの環境変数(MICROCMS_SERVICE_DOMAIN / MICROCMS_API_KEY)を確認してください。',
      },
      500,
    );
  }

  const endpoint = `https://${serviceDomain}.microcms.io/api/v1/articles/${contentId}?draftKey=${encodeURIComponent(draftKey)}`;

  let res;
  try {
    res = await fetch(endpoint, { headers: { 'X-MICROCMS-API-KEY': apiKey } });
  } catch {
    return json({ error: 'microCMSへの接続に失敗しました。' }, 502);
  }

  if (!res.ok) {
    // 401/403はAPIキーの権限、404はcontentIdかdraftKeyの誤り。
    // microCMS側の本文をそのまま返すと情報が多すぎるので、原因だけを伝える。
    const hint =
      res.status === 401 || res.status === 403
        ? 'APIキーの権限を確認してください(「GET(下書き)」の許可が必要です)。'
        : res.status === 404
          ? '下書きが見つかりませんでした。draftKeyの有効期限が切れている可能性があります。'
          : 'microCMSからエラーが返りました。';
    return json({ error: hint, status: res.status }, res.status);
  }

  return json(await res.json());
}
