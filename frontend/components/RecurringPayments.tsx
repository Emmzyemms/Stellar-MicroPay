/**
 * components/RecurringPayments.tsx
 * Client-side recurring payment schedules (#612). Schedules live in
 * localStorage; "Pay Now" hands the details to the dashboard's send form.
 */

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/contexts/I18nContext";
import { formatDate } from "@/utils/intlFormatters";

export interface RecurringPayment {
  id: string;
  destination: string;
  amount: string;
  memo: string;
  interval: "daily" | "weekly" | "monthly";
  nextRunAt: number;
  createdAt: number;
}

const STORAGE_KEY = "stellar-micropay:recurring-payments";

/** Translation keys for each schedule interval (shared by the picker and rows). */
const INTERVAL_KEYS: Record<RecurringPayment["interval"], string> = {
  daily: "recurringPayments.intervalDaily",
  weekly: "recurringPayments.intervalWeekly",
  monthly: "recurringPayments.intervalMonthly",
};

const INTERVAL_MS: Record<RecurringPayment["interval"], number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

function loadSchedules(): RecurringPayment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecurringPayment[]) : [];
  } catch {
    return [];
  }
}

function saveSchedules(schedules: RecurringPayment[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
}

function isDue(schedule: RecurringPayment): boolean {
  return Date.now() >= schedule.nextRunAt;
}

export default function RecurringPayments({
  onPayNow,
}: {
  onPayNow: (data: { destination: string; amount: string; memo: string }) => void;
}) {
  const { t } = useTranslation();
  const [schedules, setSchedules] = useState<RecurringPayment[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [interval, setInterval] = useState<RecurringPayment["interval"]>("monthly");
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setSchedules(loadSchedules());
  }, []);

  const persist = useCallback((next: RecurringPayment[]) => {
    setSchedules(next);
    saveSchedules(next);
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedDestination = destination.trim();
    const trimmedAmount = amount.trim();
    const parsedAmount = parseFloat(trimmedAmount);

    if (!trimmedDestination) {
      setFormError(t("recurringPayments.invalidRecipient"));
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError(t("recurringPayments.invalidAmount"));
      return;
    }

    const now = Date.now();
    const schedule: RecurringPayment = {
      id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
      destination: trimmedDestination,
      amount: trimmedAmount,
      memo: memo.trim(),
      interval,
      nextRunAt: now + INTERVAL_MS[interval],
      createdAt: now,
    };
    persist([schedule, ...schedules]);
    setDestination("");
    setAmount("");
    setMemo("");
    setInterval("monthly");
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleDelete = (id: string) => {
    persist(schedules.filter((schedule) => schedule.id !== id));
    setPendingDeleteId(null);
  };

  const handlePayNow = (schedule: RecurringPayment) => {
    onPayNow({
      destination: schedule.destination,
      amount: schedule.amount,
      memo: schedule.memo,
    });
  };

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold text-white">{t("recurringPayments.title")}</h2>
        <button
          type="button"
          onClick={() => {
            setIsFormOpen((open) => !open);
            setFormError(null);
          }}
          className="text-xs text-stellar-400 hover:text-stellar-300 transition-colors cursor-pointer"
        >
          {isFormOpen ? t("common.cancel") : <>+ {t("recurringPayments.new")}</>}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleCreate} className="space-y-3 mb-4">
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder={t("recurringPayments.recipientPlaceholder")}
            className="input-field font-mono text-sm"
            required
          />
          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t("recurringPayments.amountPlaceholder")}
              className="input-field text-sm flex-1"
              required
            />
            <select
              value={interval}
              onChange={(e) => setInterval(e.target.value as RecurringPayment["interval"])}
              className="input-field text-sm w-28"
              aria-label={t("recurringPayments.intervalLabel")}
            >
              <option value="daily">{t(INTERVAL_KEYS.daily)}</option>
              <option value="weekly">{t(INTERVAL_KEYS.weekly)}</option>
              <option value="monthly">{t(INTERVAL_KEYS.monthly)}</option>
            </select>
          </div>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder={t("recurringPayments.memoPlaceholder")}
            className="input-field text-sm"
            maxLength={28}
          />
          {formError && <p className="text-xs text-red-400">{formError}</p>}
          <button type="submit" className="btn-primary w-full text-sm">
            {t("recurringPayments.saveSchedule")}
          </button>
        </form>
      )}

      {schedules.length === 0 ? (
        <p className="text-sm text-slate-400">
          {t("recurringPayments.empty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {schedules.map((schedule) => {
            const due = isDue(schedule);
            return (
              <li
                key={schedule.id}
                className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-200">
                      {schedule.amount} XLM · {t(INTERVAL_KEYS[schedule.interval])}
                      {due && (
                        <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                          {t("recurringPayments.due")}
                        </span>
                      )}
                    </p>
                    <p className="truncate font-mono text-xs text-slate-500">{schedule.destination}</p>
                    <p className="text-xs text-slate-500">
                      {t("recurringPayments.nextRun")}: {formatDate(schedule.nextRunAt)}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePayNow(schedule)}
                      className="rounded-lg bg-stellar-500/20 px-2.5 py-1 text-xs font-semibold text-stellar-300 hover:bg-stellar-500/30 transition-colors cursor-pointer"
                    >
                      {t("recurringPayments.payNow")}
                    </button>
                    {pendingDeleteId === schedule.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDelete(schedule.id)}
                          className="rounded-lg bg-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/30 transition-colors cursor-pointer"
                        >
                          {t("common.confirm")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(null)}
                          className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          {t("common.cancel")}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(schedule.id)}
                        aria-label={t("recurringPayments.deleteSchedule")}
                        className="px-1.5 text-red-400 hover:text-red-300 cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
