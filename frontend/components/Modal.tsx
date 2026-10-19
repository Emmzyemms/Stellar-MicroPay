/**
 * components/Modal.tsx
 * Shared accessible dialog shell (#1437): full-screen overlay, Escape and
 * backdrop dismissal, focus trap, `role="dialog"` semantics and body scroll
 * locking in one place, so every modal in the app behaves the same way.
 *
 * Dismissal and focus behaviour are per-modal options rather than a single
 * forced policy: a payment tracker must not close on a stray backdrop click
 * while a transaction is still in flight, so it opts out until it settles.
 */

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Queryable focusable elements. Visibility is deliberately not sniffed here:
 * `offsetWidth` is always zero under jsdom, so filtering on it would silently
 * disable the trap in tests while leaving it apparently fine in the browser.
 */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function listFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true"
  );
}

/**
 * Body scroll lock is ref-counted rather than per-instance because child
 * effects run before their parent's: a dialog opened inside another dialog
 * would otherwise snapshot the outer lock's *pre-lock* value and hand
 * scrolling back to the page when it closes.
 */
let scrollLocks = 0;
let overflowBeforeLock = "";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Classes for the full-viewport backdrop. */
  overlayClassName: string;
  /** Classes for the dialog panel itself. */
  panelClassName: string;
  /** `id` of a heading rendered inside the panel. Preferred over `ariaLabel`. */
  labelledBy?: string;
  /** Label for assistive technology when the panel has no visible heading. */
  ariaLabel?: string;
  /** Close on Escape. Defaults to true. */
  closeOnEscape?: boolean;
  /** Close when the backdrop, but not the panel, is clicked. Defaults to true. */
  closeOnBackdrop?: boolean;
  /** Keep Tab and Shift+Tab inside the panel. Defaults to true. */
  trapFocus?: boolean;
  /** Freeze body scrolling while open. Defaults to true. */
  lockScroll?: boolean;
  /** Applied to the backdrop so existing test hooks keep pointing at it. */
  backdropTestId?: string;
  children: ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  overlayClassName,
  panelClassName,
  labelledBy,
  ariaLabel,
  closeOnEscape = true,
  closeOnBackdrop = true,
  trapFocus = true,
  lockScroll = true,
  backdropTestId,
  children,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  // Only the last dialog to close unlocks, and it restores the value the page
  // had before the first dialog locked, not an empty string.
  useEffect(() => {
    if (!isOpen || !lockScroll) return;

    if (scrollLocks === 0) overflowBeforeLock = document.body.style.overflow;
    scrollLocks += 1;
    document.body.style.overflow = "hidden";

    return () => {
      scrollLocks -= 1;
      if (scrollLocks === 0) document.body.style.overflow = overflowBeforeLock;
    };
  }, [isOpen, lockScroll]);

  // Move focus into the dialog on open. A panel that already received focus
  // from an `autoFocus` field is left alone, and focus returns to whatever
  // opened the dialog when it closes.
  useEffect(() => {
    if (!isOpen) return;

    const panel = panelRef.current;
    const invoker = document.activeElement as HTMLElement | null;

    if (panel && (!invoker || !panel.contains(invoker))) {
      const focusables = listFocusable(panel);
      (focusables[0] ?? panel).focus();
    }

    return () => {
      if (invoker && invoker.focus && document.contains(invoker)) {
        invoker.focus();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !trapFocus) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusables = listFocusable(panel);
      if (focusables.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;
      const outside = !activeElement || !panel.contains(activeElement);

      if (event.shiftKey) {
        if (activeElement === first || outside) {
          event.preventDefault();
          last.focus();
        }
      } else if (activeElement === last || outside) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, trapFocus]);

  if (!isOpen) return null;

  return (
    <div
      className={overlayClassName}
      data-testid={backdropTestId}
      onClick={
        closeOnBackdrop
          ? (event) => {
              if (event.target === event.currentTarget) onClose();
            }
          : undefined
      }
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={ariaLabel}
        tabIndex={-1}
        className={panelClassName}
      >
        {children}
      </div>
    </div>
  );
}
