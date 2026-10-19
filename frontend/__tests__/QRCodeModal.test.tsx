import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import QRCodeModal from '../components/QRCodeModal';

describe('QRCodeModal snapshot tests', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    publicKey: 'GABCDE1234567890GABCDE1234567890GABCDE1234567890GABCDE12',
    amount: undefined,
  };

  it('renders with sample address (no amount)', () => {
    const { container } = render(<QRCodeModal {...defaultProps} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders with sample address and amount', () => {
    const { container } = render(
      <QRCodeModal {...defaultProps} amount="10.5" />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders with sample address and zero amount', () => {
    const { container } = render(
      <QRCodeModal {...defaultProps} amount="0" />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders closed state (isOpen=false)', () => {
    const { container } = render(
      <QRCodeModal {...defaultProps} isOpen={false} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders with a different sample address', () => {
    const { container } = render(
      <QRCodeModal
        {...defaultProps}
        publicKey='GDIFFERENTADDRESS123456789012345678901234567890123456'
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});

describe("QRCodeModal", () => {
  it("renders the QR canvas and downloads a PNG object URL", () => {
    const createObjectURL = jest.fn(() => "blob:qr");
    const revokeObjectURL = jest.fn();
    Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, configurable: true });
    HTMLCanvasElement.prototype.toBlob = (callback) =>
      callback(new Blob(["qr"], { type: "image/png" }));

    render(
      <QRCodeModal
        isOpen
        onClose={jest.fn()}
        publicKey="GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
      />
    );

    expect(document.querySelector("canvas")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /download qr/i }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:qr");
  });

  it("provides an accessible name for the close button and marks decorative icons aria-hidden", () => {
    const onClose = jest.fn();
    render(
      <QRCodeModal
        isOpen
        onClose={onClose}
        publicKey="GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
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

describe("QRCodeModal accessibility & keyboard behavior", () => {
  it("has role='dialog', aria-modal='true', and accessible name", () => {
    render(
      <QRCodeModal
        isOpen
        onClose={jest.fn()}
        publicKey="GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
      />
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "qr-code-modal-title");
    expect(screen.getByText("Receive Payment QR Code")).toHaveAttribute("id", "qr-code-modal-title");
  });

  it("moves focus into the modal when opened", async () => {
    jest.useFakeTimers();
    render(
      <QRCodeModal
        isOpen
        onClose={jest.fn()}
        publicKey="GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
      />
    );

    act(() => {
      jest.runAllTimers();
    });

    const closeButtons = screen.getAllByRole("button", { name: /close/i });
    expect(closeButtons[0]).toHaveFocus();
    jest.useRealTimers();
  });

  it("closes on Escape key press", async () => {
    const onClose = jest.fn();
    render(
      <QRCodeModal
        isOpen
        onClose={onClose}
        publicKey="GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("traps Tab key navigation inside the modal", async () => {
    jest.useFakeTimers();
    render(
      <QRCodeModal
        isOpen
        onClose={jest.fn()}
        publicKey="GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
      />
    );

    act(() => {
      jest.runAllTimers();
    });

    const buttons = screen.getAllByRole("button");
    const firstButton = buttons[0];
    const lastButton = buttons[buttons.length - 1];

    // Focus last button and press Tab -> should cycle to first
    lastButton.focus();
    expect(lastButton).toHaveFocus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(firstButton).toHaveFocus();

    // Focus first button and press Shift+Tab -> should cycle to last
    firstButton.focus();
    expect(firstButton).toHaveFocus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(lastButton).toHaveFocus();
    jest.useRealTimers();
  });

  it("restores focus to triggering element on close", async () => {
    function Wrapper() {
      const [isOpen, setIsOpen] = React.useState(false);
      return (
        <div>
          <button data-testid="open-modal-btn" onClick={() => setIsOpen(true)}>
            Open
          </button>
          <QRCodeModal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            publicKey="GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
          />
        </div>
      );
    }

    const { getByTestId, queryByRole, getByRole } = render(<Wrapper />);
    const trigger = getByTestId("open-modal-btn");
    trigger.focus();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    expect(getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(queryByRole("dialog")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });
});

