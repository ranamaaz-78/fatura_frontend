/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /** The public website, used for links that leave the Windows app (Apply page, invoice QR). */
  readonly VITE_PUBLIC_URL?: string;
  readonly VITE_SUPPORT_EMAIL?: string;
  readonly VITE_SUPPORT_WHATSAPP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  /** Present only inside the Windows app. */
  desktop?: {
    isDesktop: true;
    openExternal: (url: string) => void;
  };
}
