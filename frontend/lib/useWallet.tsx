import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  disconnectWallet as clearWalletConnection,
  getConnectedPublicKey,
  isRecoverableLedgerError,
  signTransactionWithWallet,
  type LedgerErrorCode,
  type WalletType,
} from "@/lib/wallet";
import Toast from "@/components/Toast";
import LedgerErrorNotice from "@/components/LedgerErrorNotice";
import { useTranslation } from "@/contexts/I18nContext";

export interface SignResult {
  signedXDR: string | null;
  error: string | null;
  errorCode?: LedgerErrorCode;
  errorDetail?: string;
}

/** A recoverable Ledger failure waiting for the user to retry or cancel. */
export interface LedgerSigningError {
  code: LedgerErrorCode;
  detail: string;
}

interface PendingLedgerSign {
  xdr: string;
  result: SignResult;
  resolve: (result: SignResult) => void;
}

interface WalletContextValue {
  publicKey: string | null;
  walletType: WalletType;
  isWalletReady: boolean;
  connectWallet: (nextPublicKey: string, walletType?: WalletType) => void;
  disconnectWallet: () => void;
  /**
   * Sign with the connected wallet. A recoverable Ledger failure (locked,
   * Stellar app closed, unplugged, …) does not resolve straight away: it is
   * surfaced as `ledgerError` with a retry affordance, and the promise settles
   * once the retry succeeds or the user cancels.
   */
  signTransaction: (xdr: string) => Promise<SignResult>;
  ledgerError: LedgerSigningError | null;
  retryLedgerSigning: () => Promise<void>;
  cancelLedgerSigning: () => void;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

// Freighter's extension API (@stellar/freighter-api) exposes no
// accountChanged/network-changed event to subscribe to, so an account
// switch made inside the extension is only observable by re-reading the
// connected public key and diffing it against what the app last saw.
const ACCOUNT_CHANGE_POLL_MS = 3000;

export function WalletProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<WalletType>("freighter");
  const [pendingLedgerSign, setPendingLedgerSign] = useState<PendingLedgerSign | null>(null);
  const [isRetryingLedger, setIsRetryingLedger] = useState(false);
  const walletTypeRef = useRef<WalletType>("freighter");
  const [isWalletReady, setIsWalletReady] = useState(false);
  const [accountChangeToast, setAccountChangeToast] = useState<string | null>(null);
  const publicKeyRef = useRef<string | null>(null);

  useEffect(() => {
    publicKeyRef.current = publicKey;
  }, [publicKey]);

  useEffect(() => {
    walletTypeRef.current = walletType;
  }, [walletType]);

  useEffect(() => {
    let isActive = true;

    getConnectedPublicKey()
      .then((connectedPublicKey) => {
        if (!isActive) return;
        setPublicKey(connectedPublicKey);
      })
      .finally(() => {
        if (isActive) {
          setIsWalletReady(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      // Only Freighter accounts can change underneath us; a Ledger session
      // must not be overwritten by whatever Freighter happens to expose.
      if (walletTypeRef.current !== "freighter") return;
      getConnectedPublicKey().then((connectedPublicKey) => {
        const previousPublicKey = publicKeyRef.current;
        if (
          previousPublicKey &&
          connectedPublicKey &&
          connectedPublicKey !== previousPublicKey
        ) {
          setPublicKey(connectedPublicKey);
          setAccountChangeToast("Freighter account changed — wallet updated");
        }
      });
    }, ACCOUNT_CHANGE_POLL_MS);

    return () => window.clearInterval(interval);
  }, []);

  // Recoverable Ledger errors park the caller's promise here until the user
  // retries or cancels; everything else is returned with a translated message.
  const settleSignResult = useCallback(
    (xdr: string, result: SignResult, resolve: (result: SignResult) => void) => {
      if (!result.errorCode) {
        resolve(result);
        return;
      }

      if (isRecoverableLedgerError(result.errorCode)) {
        setPendingLedgerSign({ xdr, result, resolve });
        return;
      }

      resolve({
        ...result,
        error: t(`ledgerErrors.${result.errorCode}.message`, { detail: result.errorDetail ?? "" }),
      });
    },
    [t]
  );

  const signTransaction = useCallback(
    (xdr: string) =>
      new Promise<SignResult>((resolve) => {
        signTransactionWithWallet(xdr, walletTypeRef.current).then((result) =>
          settleSignResult(xdr, result, resolve)
        );
      }),
    [settleSignResult]
  );

  const retryLedgerSigning = useCallback(async () => {
    if (!pendingLedgerSign) return;
    const { xdr, resolve } = pendingLedgerSign;

    setIsRetryingLedger(true);
    const result = await signTransactionWithWallet(xdr, "ledger");
    setIsRetryingLedger(false);
    setPendingLedgerSign(null);
    settleSignResult(xdr, result, resolve);
  }, [pendingLedgerSign, settleSignResult]);

  const cancelLedgerSigning = useCallback(() => {
    if (!pendingLedgerSign) return;
    const { result, resolve } = pendingLedgerSign;
    const code = result.errorCode as LedgerErrorCode;

    setPendingLedgerSign(null);
    resolve({ ...result, error: t(`ledgerErrors.${code}.message`, { detail: result.errorDetail ?? "" }) });
  }, [pendingLedgerSign, t]);

  const ledgerError = useMemo<LedgerSigningError | null>(
    () =>
      pendingLedgerSign?.result.errorCode
        ? { code: pendingLedgerSign.result.errorCode, detail: pendingLedgerSign.result.errorDetail ?? "" }
        : null,
    [pendingLedgerSign]
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      publicKey,
      walletType,
      isWalletReady,
      connectWallet: (nextPublicKey: string, nextWalletType: WalletType = "freighter") => {
        setPublicKey(nextPublicKey);
        setWalletType(nextWalletType);
      },
      disconnectWallet: () => {
        clearWalletConnection();
        setPublicKey(null);
        setWalletType("freighter");
      },
      signTransaction,
      ledgerError,
      retryLedgerSigning,
      cancelLedgerSigning,
    }),
    [
      publicKey,
      walletType,
      isWalletReady,
      signTransaction,
      ledgerError,
      retryLedgerSigning,
      cancelLedgerSigning,
    ]
  );

  return (
    <WalletContext.Provider value={value}>
      {children}
      {accountChangeToast && (
        <Toast
          message={accountChangeToast}
          type="info"
          onClose={() => setAccountChangeToast(null)}
        />
      )}
      {ledgerError && (
        <div className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-4 sm:w-96 z-50">
          <LedgerErrorNotice
            code={ledgerError.code}
            detail={ledgerError.detail}
            onRetry={retryLedgerSigning}
            onDismiss={cancelLedgerSigning}
            retrying={isRetryingLedger}
            className="bg-slate-900 shadow-xl"
          />
        </div>
      )}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);

  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider.");
  }

  return context;
}
