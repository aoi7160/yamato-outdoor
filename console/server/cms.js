/**
 * 承認された記事を、microCMSに「下書き」として入稿する。
 *
 * 公開はしない(公開はmicroCMSの画面でCEOが押す。最後の1クリックを人に残す)。
 * 入稿先は articles の contentHtml(テキストエリア。docs/microcms-schema.md)。コンテンツIDはスラッグにする
 * (PUT /api/v1/articles/<slug>?status=draft。同じ記事をもう一度入稿すると上書きになる)。
 *
 *   MICROCMS_WRITE_KEY     書き込み用のAPIキー(articles に PUT の権限)。読み取り用(MICROCMS_API_KEY)とは分ける
 *   MICROCMS_FAQ_FIELD_ID  任意。faq(繰り返しフィールド)の中のカスタムフィールドのID。無ければFAQは入れない
 */

const SLUG = /^[a-z0-9][a-z0-9-]{1,80}$/;

export const cmsBase = (env) => (env.MICROCMS_SERVICE_DOMAIN ? `https://${env.MICROCMS_SERVICE_DOMAIN}.microcms.io` : '');
/** microCMSの管理画面で、その記事の編集画面 */
export const cmsEditUrl = (env, contentId) => (cmsBase(env) && contentId ? `${cmsBase(env)}/apis/articles/${encodeURIComponent(contentId)}` : '');

async function categoryId(env, slug) {
  if (!slug) return null;
  const q = new URLSearchParams({ filters: `slug[equals]${slug}`, fields: 'id', limit: '1' });
  const res = await fetch(`https://${env.MICROCMS_SERVICE_DOMAIN}.microcms.io/api/v1/categories?${q}`, {
    // カテゴリは読み取り用のキーで引く(書き込み用のキーに categories の権限を付けなくて済むように)
    headers: { 'X-MICROCMS-API-KEY': env.MICROCMS_API_KEY || env.MICROCMS_WRITE_KEY },
  });
  if (!res.ok) return null;
  return (await res.json()).contents?.[0]?.id ?? null;
}

/**
 * @param {{ title: string, slug: string, description?: string, category?: string, tags?: string[], html: string, faq?: { question: string, answer: string }[] }} a
 * @returns {Promise<{ contentId: string, editUrl: string, dropped: string[] }>}
 */
export async function putDraft(env, a) {
  if (!env.MICROCMS_SERVICE_DOMAIN || !env.MICROCMS_WRITE_KEY)
    throw Object.assign(new Error('MICROCMS_WRITE_KEY が未設定のため、microCMSに入稿できません(SETUP.md 手順12)'), { status: 503 });
  const slug = String(a?.slug ?? '');
  if (!SLUG.test(slug)) throw Object.assign(new Error('記事のスラッグが正しくありません(英小文字・数字・ハイフン)'), { status: 400 });
  if (!a.title || !a.html) throw Object.assign(new Error('記事のタイトルか本文がありません'), { status: 400 });

  const dropped = [];
  const body = { title: String(a.title), slug, description: String(a.description ?? ''), contentHtml: String(a.html) };
  const cat = await categoryId(env, a.category);
  if (cat) body.category = cat;
  else if (a.category) dropped.push(`カテゴリ(${a.category} がmicroCMSに見つからない)`);
  const tags = Array.isArray(a.tags) ? a.tags.map(String).filter(Boolean) : [];
  if (tags.length) body.tags = tags.join(', ');
  const faq = Array.isArray(a.faq) ? a.faq.filter((x) => x?.question && x?.answer) : [];
  if (faq.length && env.MICROCMS_FAQ_FIELD_ID)
    body.faq = faq.map((x) => ({ fieldId: env.MICROCMS_FAQ_FIELD_ID, question: String(x.question), answer: String(x.answer) }));
  else if (faq.length) dropped.push('FAQ(MICROCMS_FAQ_FIELD_ID が未設定)');

  const put = (b) =>
    fetch(`https://${env.MICROCMS_SERVICE_DOMAIN}.microcms.io/api/v1/articles/${slug}?status=draft`, {
      method: 'PUT',
      headers: { 'X-MICROCMS-API-KEY': env.MICROCMS_WRITE_KEY, 'content-type': 'application/json' },
      body: JSON.stringify(b),
    });
  let res = await put(body);
  // タグ・FAQの形がmicroCMS側の作りと合わないことがある。その2つを外してもう一度だけ試し、外したことを報告する
  if (res.status === 400 && (body.tags || body.faq)) {
    if (body.tags) dropped.push('タグ(フィールドの形が合わない)');
    if (body.faq) dropped.push('FAQ(フィールドの形が合わない)');
    delete body.tags;
    delete body.faq;
    res = await put(body);
  }
  if (!res.ok) {
    const msg = (await res.text()).slice(0, 160);
    throw Object.assign(new Error(`microCMSへの入稿に失敗しました(${res.status} ${msg})`), { status: 502 });
  }
  return { contentId: slug, editUrl: cmsEditUrl(env, slug), dropped };
}
