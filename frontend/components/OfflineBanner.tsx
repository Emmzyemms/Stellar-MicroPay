/**
 * components/OfflineBanner.tsx
 * Global online/offline detection banner for PWA.
 * Displays when offline to inform users that balances may be stale and payments are disabled.
 */

import { useTranslation } from "@/contexts/I18nContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export { useOnlineStatus };

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const { t } = useTranslation();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="sticky top-0 z-50 flex w-full items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/20 px-4 py-2.5 text-center text-sm font-medium text-amber-200 backdrop-blur-md transition-all"
    >
      <svg
        className="h-4 w-4 shrink-0 text-amber-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-2.828-6.364m0 0a9 9 0 012.828-6.364m0 0L3 3m5.464 5.464a5 5 0 00-1.414 3.536m0 0a5 5 0 001.414 3.536"
        />
      </svg>
      <span>{t("app.offlineBanner")}</span>
    </div>
  );
}
