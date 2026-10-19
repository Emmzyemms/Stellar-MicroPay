/**
 * pages/multi-sig-sign.tsx
 * Page for co-signers to view and sign multi-signature transactions.
 */

import { useRouter } from "next/router";
import Head from "next/head";
import { useEffect, useState } from "react";
import { Transaction, TransactionBuilder } from "@stellar/stellar-sdk";
import { getNetworkPassphrase } from "@/lib/stellar";
import { signTransactionWithWallet } from "@/lib/wallet";
import { useTranslation } from "@/contexts/I18nContext";
import { formatAsset } from "@/utils/intlFormatters";

export default function MultiSigSignPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { xdr } = router.query;
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [signedXDR, setSignedXDR] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "signing" | "signed">("loading");

  useEffect(() => {
    if (!xdr || typeof xdr !== "string") return;

    try {
      const tx = TransactionBuilder.fromXDR(xdr, getNetworkPassphrase());
      if (tx instanceof Transaction) {
        setTransaction(tx);
      } else {
        setError(t("multiSigSign.feeBumpUnsupported"));
      }
      setStatus("ready");
    } catch (err) {
      setError(t("multiSigSign.invalidXdr"));
      setStatus("ready");
    }
  }, [xdr, t]);

  const handleSign = async () => {
    if (!transaction) return;
    setStatus("signing");
    setError(null);
    try {
      const { signedXDR, error: signError } = await signTransactionWithWallet(transaction.toXDR());
      if (signError || !signedXDR) {
        setError(signError || t("multiSigSign.failedToSign"));
        setStatus("ready");
        return;
      }
      setSignedXDR(signedXDR);
      setStatus("signed");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("multiSigSign.failedToSign"));
      setStatus("ready");
    }
  };

  if (status === "loading") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center">
          <p className="text-slate-400">{t("multiSigSign.loading")}</p>
        </div>
      </>
    );
  }

  if (error && !transaction) {
    return (
      <>
        <Head>
          <title>{t("pages.multiSigSign.title")}</title>
        </Head>
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="text-center">
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{t("pages.multiSigSign.title")}</title>
      </Head>
      <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="font-display text-2xl font-bold text-white mb-6">Sign Multi-Signature Transaction</h1>

      {transaction && (
        <div className="card mb-6">
          <h2 className="font-display text-lg font-semibold text-white mb-4">{t("multiSigSign.detailsTitle")}</h2>
          <div className="space-y-2">
            <p><span className="text-slate-400">{t("multiSigSign.from")}</span> {transaction.source}</p>
            {transaction.operations.map((op, i) => {
              if (op.type === "payment") {
                const payment = op as any;
                return (
                  <div key={i}>
                    <p><span className="text-slate-400">{t("multiSigSign.to")}</span> {payment.destination}</p>
                    <p>
                      <span className="text-slate-400">{t("multiSigSign.amount")}</span>{" "}
                      {formatAsset(
                        payment.amount,
                        payment.asset?.isNative() ? "XLM" : payment.asset?.code
                      )}
                    </p>
                  </div>
                );
              }
              return (
                <p key={i}>
                  {t("multiSigSign.operation", { number: i + 1, type: op.type })}
                </p>
              );
            })}
            {transaction.memo && transaction.memo.type !== "none" && (
              <p><span className="text-slate-400">{t("multiSigSign.memo")}</span> {transaction.memo.value?.toString()}</p>
            )}
          </div>
        </div>
      )}

      {status === "ready" && (
        <button onClick={handleSign} className="btn-primary w-full">
          {t("multiSigSign.signWithFreighter")}
        </button>
      )}

      {status === "signing" && (
        <p className="text-center text-slate-400">{t("multiSigSign.signing")}</p>
      )}

      {status === "signed" && signedXDR && (
        <div className="card">
          <h2 className="font-display text-lg font-semibold text-white mb-4">{t("multiSigSign.signedTitle")}</h2>
          <p className="text-slate-300 mb-4">
            {t("multiSigSign.copyHint")}
          </p>
          <textarea
            value={signedXDR}
            readOnly
            className="input h-32 font-mono text-xs"
          />
          <button
            onClick={() => navigator.clipboard.writeText(signedXDR)}
            className="btn-secondary w-full mt-4"
          >
            {t("multiSigSign.copySignedXdr")}
          </button>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm mt-4">{error}</p>
      )}
      </div>
    </>
  );
}
