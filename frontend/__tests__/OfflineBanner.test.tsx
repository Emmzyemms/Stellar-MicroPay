/**
 * __tests__/OfflineBanner.test.tsx
 * OfflineBanner displays a translated notice when offline and clears on reconnection (#1444).
 */

import React from "react";
import { act, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import OfflineBanner from "@/components/OfflineBanner";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { I18nProvider } from "@/contexts/I18nContext";
import { LOCALE_STORAGE_KEY } from "@/lib/i18n";
import { renderHook } from "@testing-library/react";
import SwapForm from "@/components/SwapForm";

describe("OfflineBanner", () => {
  const originalOnLine = navigator.onLine;

  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: originalOnLine,
      writable: true,
    });
  });

  it("does not render when online", () => {
    render(
      <I18nProvider>
        <OfflineBanner />
      </I18nProvider>
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders the banner when initially offline", () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
      writable: true,
    });

    render(
      <I18nProvider>
        <OfflineBanner />
      </I18nProvider>
    );

    const banner = screen.getByRole("alert");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute("aria-live", "assertive");
    expect(banner).toHaveTextContent(
      "You're offline — balances may be stale and payments are disabled"
    );
  });

  it("appears on going offline and clears on reconnection", () => {
    render(
      <I18nProvider>
        <OfflineBanner />
      </I18nProvider>
    );

    // Initially online
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    // Go offline
    act(() => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        value: false,
        writable: true,
      });
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "You're offline — balances may be stale and payments are disabled"
    );

    // Reconnect online
    act(() => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        value: true,
        writable: true,
      });
      window.dispatchEvent(new Event("online"));
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("displays the translated notice in Spanish when offline", () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "es");
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
      writable: true,
    });

    render(
      <I18nProvider>
        <OfflineBanner />
      </I18nProvider>
    );

    const banner = screen.getByRole("alert");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(
      "Estás sin conexión — los saldos pueden no estar actualizados y los pagos están deshabilitados"
    );
  });

  describe("form submit actions while offline", () => {
    it("disables payment/trade submit actions with explanatory tooltip and text while offline", () => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        value: false,
        writable: true,
      });

      render(
        <I18nProvider>
          <SwapForm
            publicKey="GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37"
            onSwapComplete={jest.fn()}
            onError={jest.fn()}
            onSuccess={jest.fn()}
          />
        </I18nProvider>
      );

      const submitButton = screen.getByRole("button", { name: /swap/i });
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveAttribute(
        "title",
        "Payments and trades are disabled while offline"
      );
      expect(
        screen.getByText("Payments and trades are disabled while offline")
      ).toBeInTheDocument();
    });
  });

  describe("useOnlineStatus hook", () => {
    it("tracks navigator online and offline event transitions", () => {
      const { result } = renderHook(() => useOnlineStatus());
      expect(result.current).toBe(true);

      act(() => {
        window.dispatchEvent(new Event("offline"));
      });
      expect(result.current).toBe(false);

      act(() => {
        window.dispatchEvent(new Event("online"));
      });
      expect(result.current).toBe(true);
    });
  });
});

