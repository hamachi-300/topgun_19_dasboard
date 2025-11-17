/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TESA_API_BASE: string;
  readonly VITE_TESA_SOCKET_URL: string;
  readonly VITE_MAPBOX_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
