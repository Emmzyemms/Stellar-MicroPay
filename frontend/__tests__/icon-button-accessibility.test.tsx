/**
 * __tests__/icon-button-accessibility.test.tsx
 * Tests accessible names on icon-only interactive controls (#1464).
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import QRCodeModal from "@/components/QRCodeModal";
import TradeForm from "@/components/TradeForm";
import FloatingAssistantButton from "@/components/FloatingAssistantButton";

// Mock next/router
jest.mock("next/router", () => ({
  useRouter: () => ({ push: jest.fn(), pathname: "/", query: {} }),
}));

// Mock wallet
jest.mock("@/lib/wallet", () => ({
  signTransactionWithWallet: jest.fn(),
  useWallet: () => ({
    publicKey: "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3D5NZ2KMSUGSRNVO7ZFGIGSZ",
    connectWallet: jest.fn(),
    disconnectWallet: jest.fn(),
  }),
}));

describe("Icon-Only Buttons Accessibility (#1464)", () => {
  describe("QRCodeModal", () => {
    it("has a translated accessible name and aria-hidden icon on the close button", () => {
      const onClose = jest.fn();
      render(
        <QRCodeModal
          isOpen
          onClose={onClose}
          publicKey="GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3D5NZ2KMSUGSRNVO7ZFGIGSZ"
        />
      );

      const closeButton = screen.getByRole("button", { name: /close qr code dialog/i });
      expect(closeButton).toBeInTheDocument();

      const icon = closeButton.querySelector("svg");
      expect(icon).toHaveAttribute("aria-hidden", "true");

      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("TradeForm", () => {
    it("has a translated accessible name and aria-hidden icon on the asset swap button", () => {
      render(
        <TradeForm
          publicKey="GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3D5NZ2KMSUGSRNVO7ZFGIGSZ"
          onTradeComplete={jest.fn()}
          onError={jest.fn()}
          onSuccess={jest.fn()}
        />
      );

      const swapButton = screen.getByRole("button", { name: /switch assets/i });
      expect(swapButton).toBeInTheDocument();

      const icon = swapButton.querySelector("svg");
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("FloatingAssistantButton", () => {
    it("has a translated accessible name and aria-hidden icon on the assistant button", () => {
      const onClick = jest.fn();
      render(<FloatingAssistantButton onClick={onClick} />);

      const button = screen.getByRole("button", { name: /open ai payment assistant/i });
      expect(button).toBeInTheDocument();

      const icon = button.querySelector("svg");
      expect(icon).toHaveAttribute("aria-hidden", "true");

      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});
