/**
 * components/LedgerErrorNotice.tsx
 * Translated Ledger failure message with its recovery step and, for errors the
 * user can fix on the device (unlock, open the Stellar app, reconnect), a
 * retry button.
 */

import { isRecoverableLedgerError, type LedgerErrorCode } from "@/lib/wallet";
import { useTranslation } from "@/contexts/I18nContext";

interface LedgerErrorNoticeProps {
  code: LedgerErrorCode;
  /** Raw error text, interpolated into the `unknown` message. */
  detail?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  retrying?: boolean;
  className?: string;
}

export default function LedgerErrorNotice({
  code,
  detail = "",
  onRetry,
  onDismiss,
  retrying = false,
  className = "",
}: LedgerErrorNoticeProps) {
  const { t } = useTranslation();
  const canRetry = !!onRetry && isRecoverableLedgerError(code);

  return (
    <div
      role="alert"
      data-ledger-error={code}
      className={`p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-left ${className}`}
    >
      <p className="text-red-400 font-medium">
        {t(`ledgerErrors.${code}.message`, { detail })}
      </p>
      <p className="mt-1 text-slate-400">{t(`ledgerErrors.${code}.recovery`)}</p>

      {(canRetry || onDismiss) && (
        <div className="mt-3 flex gap-2">
          {canRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              {retrying ? t("common.loading") : t("common.retry")}
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              disabled={retrying}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              {t("common.cancel")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
