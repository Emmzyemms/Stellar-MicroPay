/**
 * __tests__/Modal.test.tsx
 * Behaviour contract for the shared dialog shell (Issue #1437): dismissal
 * (Escape, backdrop), ARIA wiring, body scroll locking including the nested
 * case, focus movement on open/close, and the Tab focus trap.
 */

import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "@/components/Modal";

function panel() {
  return screen.getByRole("dialog");
}

afterEach(() => {
  document.body.style.overflow = "";
});

describe("Modal", () => {
  it("renders nothing while closed", () => {
    render(
      <Modal
        isOpen={false}
        onClose={jest.fn()}
        overlayClassName="overlay"
        panelClassName="panel"
        ariaLabel="Closed dialog"
      >
        <button type="button">Inside</button>
      </Modal>
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Inside")).not.toBeInTheDocument();
  });

  it("exposes dialog semantics through aria-labelledby", () => {
    render(
      <Modal
        isOpen
        onClose={jest.fn()}
        overlayClassName="overlay"
        panelClassName="panel"
        labelledBy="title-id"
      >
        <h2 id="title-id">Send a payment</h2>
      </Modal>
    );

    expect(panel()).toHaveAttribute("aria-modal", "true");
    expect(panel()).toHaveAccessibleName("Send a payment");
  });

  it("falls back to aria-label when there is no visible heading", () => {
    render(
      <Modal
        isOpen
        onClose={jest.fn()}
        overlayClassName="overlay"
        panelClassName="panel"
        ariaLabel="Quick send"
      >
        <p>Body</p>
      </Modal>
    );

    expect(panel()).toHaveAttribute("aria-label", "Quick send");
  });

  it("applies overlay and panel classes, and puts the test hook on the backdrop", () => {
    const { container } = render(
      <Modal
        isOpen
        onClose={jest.fn()}
        overlayClassName="fixed inset-0 bg-black/60"
        panelClassName="card max-w-md"
        ariaLabel="Styled"
        backdropTestId="styled-modal"
      >
        <p>Body</p>
      </Modal>
    );

    const backdrop = screen.getByTestId("styled-modal");
    expect(backdrop).toHaveClass("fixed", "inset-0", "bg-black/60");
    expect(container.firstChild).toBe(backdrop);
    expect(panel()).toHaveClass("card", "max-w-md");
  });

  it("closes on Escape", async () => {
    const onClose = jest.fn();
    render(
      <Modal
        isOpen
        onClose={onClose}
        overlayClassName="overlay"
        panelClassName="panel"
        ariaLabel="Escapable"
      >
        <p>Body</p>
      </Modal>
    );

    await userEvent.setup().keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close on Escape when closeOnEscape is false", async () => {
    const onClose = jest.fn();
    render(
      <Modal
        isOpen
        onClose={onClose}
        overlayClassName="overlay"
        panelClassName="panel"
        ariaLabel="Inescapable"
        closeOnEscape={false}
      >
        <p>Body</p>
      </Modal>
    );

    await userEvent.setup().keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes when the backdrop is clicked but not the panel", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(
      <Modal
        isOpen
        onClose={onClose}
        overlayClassName="fixed inset-0"
        panelClassName="panel"
        ariaLabel="Backdrop"
      >
        <button type="button">Inside the panel</button>
      </Modal>
    );

    await user.click(screen.getByText("Inside the panel"));
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole("dialog").parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores backdrop clicks when closeOnBackdrop is false", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(
      <Modal
        isOpen
        onClose={onClose}
        overlayClassName="fixed inset-0"
        panelClassName="panel"
        ariaLabel="Locked open"
        closeOnBackdrop={false}
      >
        <p>Body</p>
      </Modal>
    );

    await user.click(panel().parentElement as HTMLElement);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("locks body scroll while open and restores the previous value on close", () => {
    document.body.style.overflow = "auto";

    const { rerender } = render(
      <Modal
        isOpen
        onClose={jest.fn()}
        overlayClassName="overlay"
        panelClassName="panel"
        ariaLabel="Scrollable page"
      >
        <p>Body</p>
      </Modal>
    );
    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <Modal
        isOpen={false}
        onClose={jest.fn()}
        overlayClassName="overlay"
        panelClassName="panel"
        ariaLabel="Scrollable page"
      >
        <p>Body</p>
      </Modal>
    );
    expect(document.body.style.overflow).toBe("auto");
  });

  it("keeps the outer dialog's scroll lock when a nested dialog closes", () => {
    function Nested({ showInner }: { showInner: boolean }) {
      return (
        <Modal
          isOpen
          onClose={jest.fn()}
          overlayClassName="outer"
          panelClassName="panel"
          ariaLabel="Outer dialog"
        >
          <p>Outer body</p>
          {showInner && (
            <Modal
              isOpen
              onClose={jest.fn()}
              overlayClassName="inner"
              panelClassName="panel"
              ariaLabel="Inner dialog"
            >
              <p>Inner body</p>
            </Modal>
          )}
        </Modal>
      );
    }

    const { rerender } = render(<Nested showInner />);
    expect(document.body.style.overflow).toBe("hidden");

    rerender(<Nested showInner={false} />);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("moves focus into the dialog and back to the invoker on close", async () => {
    function Harness() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setIsOpen(true)}>
            Open
          </button>
          <Modal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            overlayClassName="overlay"
            panelClassName="panel"
            ariaLabel="Harness"
          >
            <button type="button">First in dialog</button>
            <button type="button" onClick={() => setIsOpen(false)}>
              Close it
            </button>
          </Modal>
        </>
      );
    }

    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByText("Open");

    await user.click(opener);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByText("First in dialog"));

    await user.click(screen.getByText("Close it"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener);
  });

  it("does not steal focus from a field that auto-focuses itself", () => {
    render(
      <Modal
        isOpen
        onClose={jest.fn()}
        overlayClassName="overlay"
        panelClassName="panel"
        ariaLabel="Searchable"
      >
        <button type="button">Earlier button</button>
        <input aria-label="Search" autoFocus />
      </Modal>
    );

    expect(document.activeElement).toBe(screen.getByLabelText("Search"));
  });

  it("wraps Tab at the last element and Shift+Tab at the first", () => {
    render(
      <Modal
        isOpen
        onClose={jest.fn()}
        overlayClassName="overlay"
        panelClassName="panel"
        ariaLabel="Trapped"
      >
        <button type="button">First</button>
        <button type="button">Middle</button>
        <button type="button">Last</button>
      </Modal>
    );

    const first = screen.getByText("First");
    const last = screen.getByText("Last");

    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("pulls focus back into the panel when it has escaped", () => {
    render(
      <Modal
        isOpen
        onClose={jest.fn()}
        overlayClassName="overlay"
        panelClassName="panel"
        ariaLabel="Trapped"
      >
        <button type="button">Only</button>
      </Modal>
    );

    const only = screen.getByText("Only");
    only.focus();
    only.blur();
    fireEvent.keyDown(document.body, { key: "Tab" });

    expect(document.activeElement).toBe(only);
  });

  it("ignores Tab when the trap is disabled", () => {
    render(
      <Modal
        isOpen
        onClose={jest.fn()}
        overlayClassName="overlay"
        panelClassName="panel"
        ariaLabel="Free"
        trapFocus={false}
      >
        <button type="button">Only</button>
      </Modal>
    );

    const only = screen.getByText("Only");
    only.focus();
    fireEvent.keyDown(only, { key: "Tab" });

    expect(document.activeElement).toBe(only);
  });

  it("does not trap elements marked hidden", () => {
    render(
      <Modal
        isOpen
        onClose={jest.fn()}
        overlayClassName="overlay"
        panelClassName="panel"
        ariaLabel="Hidden tail"
      >
        <button type="button">Visible</button>
        <button type="button" disabled>
          Disabled
        </button>
        <button type="button" hidden>
          Hidden
        </button>
      </Modal>
    );

    const visible = screen.getByText("Visible");
    visible.focus();
    fireEvent.keyDown(visible, { key: "Tab", shiftKey: true });

    expect(document.activeElement).toBe(visible);
  });
});
