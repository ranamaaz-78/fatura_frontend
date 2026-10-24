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
    /** Older builds of the app do not pass it. */
    version?: string;
    /** The app updating itself (1.2.0 and later). */
    updates?: {
      status: () => Promise<DesktopUpdateStatus | null>;
      onStatus: (listener: (status: DesktopUpdateStatus) => void) => () => void;
      check: () => void;
      download: () => void;
      install: () => void;
    };
  };
}

/** What the Windows app's updater is doing (fatura_desktop/updater.cjs). */
type DesktopUpdateStatus = {
  state: 'unsupported' | 'idle' | 'checking' | 'none' | 'available' | 'downloading' | 'ready' | 'error';
  version?: string;
  notes?: string | null;
  percent?: number;
  transferred?: number;
  total?: number;
  message?: string;
};
