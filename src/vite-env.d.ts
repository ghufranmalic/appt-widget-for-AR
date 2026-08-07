/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SCHEDULE_PUBLISH_TOKEN?: string;
  readonly VITE_GITHUB_REPO?: string;
  readonly VITE_SCHEDULE_URL?: string;
  readonly VITE_WIDGET_URL?: string;
  readonly VITE_BASE_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
