/**
 * components/ContactPickerModal.tsx
 * Address-book picker modal for the SendPaymentForm destination field
 * (Issue #1054).
 *
 * Lists all saved contacts (name + shortened address), searchable by name or
 * address. Selecting a contact returns it via `onSelect` — the parent fills
 * the destination field and closes the modal. Shows an empty state with a
 * link to the Contacts page when nothing is saved yet.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { loadContacts, type Contact } from "@/lib/contacts";
import { shortenAddress } from "@/lib/stellar";
import { useTranslation } from "@/contexts/I18nContext";

interface ContactPickerModalProps {
  readonly isOpen: boolean;
  readonly onSelect: (contact: Contact) => void;
  readonly onClose: () => void;
}

export default function ContactPickerModal({
  isOpen,
  onSelect,
  onClose,
}: Readonly<ContactPickerModalProps>) {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [announcement, setAnnouncement] = useState("");

  // Load contacts each time the modal opens so newly saved contacts appear.
  useEffect(() => {
    if (isOpen) {
      setContacts(loadContacts());
      setQuery("");
      setActiveIndex(-1);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
    );
  }, [contacts, query]);

  // Reset active index when query changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  // Announce results count to screen readers
  useEffect(() => {
    if (!isOpen) {
      setAnnouncement("");
      return;
    }
    if (contacts.length === 0) {
      setAnnouncement(t("contactPicker.emptyState"));
    } else if (filtered.length === 0) {
      setAnnouncement(t("contactPicker.noResults", { query }));
    } else {
      const msg =
        filtered.length === 1
          ? t("contactPicker.resultsCountSingle", { count: 1 })
          : t("contactPicker.resultsCount", { count: filtered.length });
      setAnnouncement(msg);
    }
  }, [isOpen, contacts.length, filtered.length, query, t]);

  // Scroll active option into view when activeIndex changes
  useEffect(() => {
    if (activeIndex >= 0 && filtered[activeIndex]) {
      const optionId = `contact-option-${filtered[activeIndex].id}`;
      const el = document.getElementById(optionId);
      if (typeof el?.scrollIntoView === "function") {
        el.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex, filtered]);

  const handleSelect = (contact: Contact) => {
    setAnnouncement(t("contactPicker.selectedAnnouncement", { name: contact.name }));
    onSelect(contact);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      // Modal component handles Escape dismissal cleanly
      return;
    }

    if (filtered.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(filtered.length - 1);
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < filtered.length) {
        e.preventDefault();
        handleSelect(filtered[activeIndex]);
      } else if (activeIndex === -1 && filtered.length === 1) {
        e.preventDefault();
        handleSelect(filtered[0]);
      }
    }
  };

  if (!isOpen) return null;


  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      panelClassName="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
      ariaLabel={t("contactPicker.ariaLabel")}
      backdropTestId="contact-picker-modal"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-xl font-bold text-white">
          {t("contactPicker.title")}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("contactPicker.closeAria")}
          data-testid="contact-picker-close"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      <input
        id="contact-picker-search-input"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen && filtered.length > 0}
        aria-haspopup="listbox"
        aria-controls="contact-picker-listbox"
        aria-activedescendant={
          activeIndex >= 0 && filtered[activeIndex]
            ? `contact-option-${filtered[activeIndex].id}`
            : undefined
        }
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("contactPicker.searchPlaceholder")}
        aria-label={t("contactPicker.searchAria")}
        data-testid="contact-picker-search"
        className="input-field mb-4"
        autoFocus
      />

      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
        data-testid="contact-picker-announcement"
      >
        {announcement}
      </div>

      {contacts.length === 0 ? (
        <div className="py-10 text-center" data-testid="contact-picker-empty">
          <ContactsIcon className="mx-auto mb-3 h-12 w-12 text-slate-600" />
          <p className="text-slate-400">{t("contactPicker.emptyState")}</p>
          <Link
            href="/contacts"
            data-testid="contact-picker-empty-link"
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-stellar-400 hover:text-stellar-300 transition-colors"
          >
            {t("contactPicker.goToContacts")}
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center" data-testid="contact-picker-no-results">
          <p className="text-slate-400">
            {t("contactPicker.noResults", { query })}
          </p>
        </div>
      ) : (
        <ul
          id="contact-picker-listbox"
          role="listbox"
          aria-label={t("contactPicker.listAria")}
          className="max-h-72 space-y-1 overflow-y-auto"
          data-testid="contact-picker-list"
        >
          {filtered.map((contact, index) => {
            const isSelected = activeIndex === index;
            return (
              <li
                key={contact.id}
                id={`contact-option-${contact.id}`}
                role="option"
                aria-selected={isSelected}
                tabIndex={-1}
                onClick={() => handleSelect(contact)}
                onMouseEnter={() => setActiveIndex(index)}
                data-testid="contact-picker-option"
                className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  isSelected
                    ? "bg-white/10 ring-1 ring-stellar-500/40 text-white"
                    : "hover:bg-white/5 text-slate-200"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-white">
                    {contact.name}
                  </span>
                  <span className="block font-mono text-xs text-slate-500">
                    {shortenAddress(contact.address, 8)}
                  </span>
                </span>
                <ArrowRightIcon className="h-4 w-4 shrink-0 text-slate-600" />
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CloseIcon({ className }: Readonly<{ readonly className?: string }>) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ContactsIcon({ className }: Readonly<{ readonly className?: string }>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  );
}

function ArrowRightIcon({ className }: Readonly<{ readonly className?: string }>) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}
