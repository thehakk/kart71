/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_URL?: string;
  /** AdSense yayıncı ID — orn. ca-pub-1234567890123456 */
  readonly VITE_ADSENSE_CLIENT?: string;
  /** Lobi / bekleme ekranı reklam birimi slot ID */
  readonly VITE_ADSENSE_SLOT_LOBBY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
