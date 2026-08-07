/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SCHEDULE_PUBLISH_TOKEN?: string;
  readonly VITE_GITHUB_REPO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
