/**
 * hooks/useModalFocusTrap.ts
 *
 * Custom hook to enforce accessible modal dialog focus management and
 * keyboard navigation (WCAG 2.1 - 2.1.2 No Keyboard Trap, 2.4.3 Focus Order).
 *
 * Key behaviors:
 * 1. Saves triggering activeElement before modal opens.
 * 2. Focuses inside the modal on open (first interactive element or container).
 * 3. Traps Tab and Shift+Tab key navigation within the modal.
 * 4. Dismisses modal on Escape key press.
 * 5. Restores focus to the triggering element on close or unmount.
 */

import { useEffect, useRef } from "react";

export interface UseModalFocusTrapOptions {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Callback invoked when Escape key is pressed */
  onClose?: () => void;
  /** Whether Escape key should trigger onClose. Defaults to true. */
  closeOnEscape?: boolean;
  /** Whether focus should return to triggering element on close. Defaults to true. */
  returnFocusOnClose?: boolean;
  /** Whether to focus the first focusable element or the container itself. Defaults to 'first-focusable'. */
  initialFocus?: "first-focusable" | "container";
}

export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "input:not([disabled]):not([type=\"hidden\"])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "iframe",
  "object",
  "embed",
  "[contenteditable]",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(", ");

/**
 * Returns an array of visible and interactive focusable elements inside the container.
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  );

  return elements.filter((el) => {
    if (el.getAttribute("aria-hidden") === "true") return false;
    if (el.hasAttribute("disabled")) return false;
    if (typeof window !== "undefined") {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") {
        return false;
      }
    }
    return true;
  });
}

export function useModalFocusTrap<T extends HTMLElement = HTMLDivElement>(
  options: UseModalFocusTrapOptions,
  externalRef?: React.RefObject<T | null>
): React.RefObject<T | null> {
  const {
    isOpen,
    onClose,
    closeOnEscape = true,
    returnFocusOnClose = true,
    initialFocus = "first-focusable",
  } = options;

  const fallbackRef = useRef<T | null>(null);
  const containerRef = externalRef || fallbackRef;
  const triggerElementRef = useRef<HTMLElement | null>(null);

  // Track the most recent active element outside the modal container as the trigger
  useEffect(() => {
    const isInsideModal = (element: HTMLElement): boolean => {
      if (containerRef.current && containerRef.current.contains(element)) {
        return true;
      }
      return Boolean(
        element.closest('[role="dialog"]') ||
        element.closest('[aria-modal="true"]')
      );
    };

    const handleFocus = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || target === document.body) {
        return;
      }

      if (!isInsideModal(target)) {
        triggerElementRef.current = target;
      }
    };

    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body &&
      !isInsideModal(document.activeElement)
    ) {
      triggerElementRef.current = document.activeElement;
    }

    document.addEventListener("focus", handleFocus, true);
    return () => document.removeEventListener("focus", handleFocus, true);
  }, [containerRef]);

  // Manage initial focus when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      // If an element within the container already has focus (e.g. autoFocus), keep it
      if (
        container.contains(document.activeElement) &&
        document.activeElement !== container
      ) {
        return;
      }

      if (initialFocus === "container") {
        if (!container.hasAttribute("tabIndex")) {
          container.setAttribute("tabindex", "-1");
        }
        container.focus();
        return;
      }

      const focusable = getFocusableElements(container);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        if (!container.hasAttribute("tabIndex")) {
          container.setAttribute("tabindex", "-1");
        }
        container.focus();
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [isOpen, initialFocus, containerRef]);

  // Trap Tab and handle Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;

      if (event.key === "Escape" && closeOnEscape) {
        event.preventDefault();
        event.stopPropagation();
        onClose?.();
        return;
      }

      if (event.key === "Tab") {
        const focusable = getFocusableElements(container);

        if (focusable.length === 0) {
          event.preventDefault();
          container.focus();
          return;
        }

        const first = focusable[0];
        const last = focusable.at(-1) ?? first;

        if (event.shiftKey) {
          if (
            document.activeElement === first ||
            !container.contains(document.activeElement)
          ) {
            event.preventDefault();
            last.focus();
          }
        } else {
          if (
            document.activeElement === last ||
            !container.contains(document.activeElement)
          ) {
            event.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEscape, onClose, containerRef]);

  // Restore focus to trigger element on close / unmount
  useEffect(() => {
    if (!isOpen) return;

    return () => {
      if (returnFocusOnClose && triggerElementRef.current) {
        const trigger = triggerElementRef.current;
        triggerElementRef.current = null;
        setTimeout(() => {
          if (typeof document !== "undefined" && document.contains(trigger)) {
            trigger.focus();
          }
        }, 0);
      }
    };
  }, [isOpen, returnFocusOnClose]);

  return containerRef;
}
