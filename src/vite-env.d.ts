interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_MAPTILER_KEY?: string;
  readonly VITE_GOOGLE_MAPS_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.css";
declare module "*.css?url" {
  const href: string;
  export default href;
}
