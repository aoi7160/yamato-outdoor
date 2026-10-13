/**
 * Cloudflare Pages で配信したときの /api/* の入口。中身は server/api.js(Workersと共通)。
 */
import { handleApi } from '../../server/api.js';

export const onRequest = ({ request, env, waitUntil }) => handleApi(request, env, waitUntil);
