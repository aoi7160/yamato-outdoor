/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly MICROCMS_SERVICE_DOMAIN: string;
  readonly MICROCMS_API_KEY: string;

  // 計測タグのID。未設定でよい(空ならそのタグは出力されない)。詳細は docs/analytics.md
  readonly GTM_ID?: string;
  readonly GA4_ID?: string;
  readonly CLARITY_ID?: string;
  readonly META_PIXEL_ID?: string;
  readonly X_PIXEL_ID?: string;
  readonly GSC_VERIFICATION?: string;
  readonly ANALYTICS_DISABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
