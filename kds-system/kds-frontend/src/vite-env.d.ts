/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SCREEN_ID: string;
  readonly VITE_API_KEY: string;
  readonly VITE_SOCKET_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
