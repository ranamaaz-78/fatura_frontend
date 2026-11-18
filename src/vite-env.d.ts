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
    /** "Remember me" on the sign-in screen (1.2.15 and later): email and password kept on this computer, encrypted by Windows. */
    credentials?: {
      get: () => Promise<{ available: boolean; email: string; password: string } | null>;
      save: (email: string, password: string) => Promise<boolean>;
      /** Signing out by hand: the password is forgotten, the email stays. */
      clearPassword: () => Promise<boolean>;
      forget: () => Promise<boolean>;
    };
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
