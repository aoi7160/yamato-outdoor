/**
 * GET /api/connectors … 各連携の「設定済みか」だけを返す(数字は取りにいかない)。
 */
import { CONNECTORS, missingEnv } from '../../../server/connectors.js';

export function onRequestGet({ env }) {
  const list = Object.keys(CONNECTORS).map((id) => {
    const missing = missingEnv(id, env);
    return { id, configured: missing.length === 0, missing };
  });
  return Response.json({ ok: true, connectors: list });
}
