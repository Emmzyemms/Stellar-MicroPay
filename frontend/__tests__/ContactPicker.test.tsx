/**
 * __tests__/ContactPicker.test.tsx
 * Tests for the address-book picker (Issue #1054): contact rows with name +
 * shortened address, search by name/address, select-fills-destination,
 * empty state with Contacts link, and the SendPaymentForm icon integration.
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactPickerModal from "@/components/ContactPickerModal";
import SendPaymentForm from "@/components/SendPaymentForm";

jest.mock("@/lib/stellar", () => ({
  buildPaymentTransaction: jest.fn(),
  buildSorobanTipTransaction: jest.fn(),
  CONTRACT_ID: null,
  explorerUrl: jest.fn((hash: string) => `https://expert.stellar.org/tx/${hash}`),
  fetchFeePercentiles: jest.fn().mockResolvedValue({
    slow: { stroops: 100, xlm: "0.0000100" },
    normal: { stroops: 200, xlm: "0.0000200" },
    fast: { stroops: 500, xlm: "0.0000500" },
  }),
  fetchNetworkFeeStats: jest.fn().mockResolvedValue({ baseFeeXlm: 0.00001 }),
  isValidStellarAddress: jest.fn(
    (addr: string) => addr.startsWith("G") && addr.length === 56
  ),
  memoTextByteLength: jest.fn(
    (memo: string) => encodeURIComponent(memo).replace(/%[0-9A-F]{2}/gi, "x").length
  ),
  server: { transactions: jest.fn() },
  shortenAddress: jest.fn(
    (addr: string, keep = 6) => `${addr.slice(0, keep)}…${addr.slice(-keep)}`
  ),
  STELLAR_BASE_FEE_XLM: 0.00001,
  STELLAR_MEMO_TEXT_MAX_BYTES: 28,
  STELLAR_MINIMUM_ACCOUNT_BALANCE_XLM: 1,
  submitTransaction: jest.fn(),
  truncateMemoText: jest.fn((memo: string) => memo),
}));

jest.mock("@/lib/wallet", () => ({
  signTransactionWithWallet: jest.fn(),
}));

jest.mock("@/utils/format", () => ({
  copyToClipboard: jest.fn(),
  formatXLM: jest.fn((amount: string) => `${parseFloat(amount).toFixed(7)} XLM`),
}));

const CONTACTS_KEY = "stellar-micropay-contacts";

const CONTACTS = [
  {
    id: "1",
    name: "Alice",
    address: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    createdAt: 1,
  },
  {
    id: "2",
    name: "Bob Marley",
    address: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBWFH2",
    createdAt: 2,
  },
];

function seedContacts(contacts: unknown) {
  window.localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

afterEach(() => {
  window.localStorage.clear();
});

describe("ContactPickerModal", () => {
  it("renders nothing when closed", () => {
    render(
      <ContactPickerModal isOpen={false} onSelect={jest.fn()} onClose={jest.fn()} />
    );
    expect(screen.queryByTestId("contact-picker-modal")).not.toBeInTheDocument();
  });

  it("shows each contact with name and shortened address", async () => {
    seedContacts(CONTACTS);
    const onSelect = jest.fn();
    render(<ContactPickerModal isOpen onSelect={onSelect} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByTestId("contact-picker-option")).toHaveLength(2);
    });
    expect(screen.getByText("Alice")).toBeInTheDocument();
    // Shortened address, not the full 56-char key
    expect(screen.queryByText(CONTACTS[0].address)).not.toBeInTheDocument();
    expect(screen.getAllByText(/GAAAAAAA…AAAAAWHF/).length).toBeGreaterThan(0);
  });

  it("searches by name (case-insensitive)", async () => {
    seedContacts(CONTACTS);
    const user = userEvent.setup();
    render(<ContactPickerModal isOpen onSelect={jest.fn()} onClose={jest.fn()} />);

    await user.type(screen.getByTestId("contact-picker-search"), "bob");
    await waitFor(() => {
      expect(screen.getAllByTestId("contact-picker-option")).toHaveLength(1);
    });
    expect(screen.getByText("Bob Marley")).toBeInTheDocument();
  });

  it("searches by (partial) address", async () => {
    seedContacts(CONTACTS);
    const user = userEvent.setup();
    render(<ContactPickerModal isOpen onSelect={jest.fn()} onClose={jest.fn()} />);

    await user.type(screen.getByTestId("contact-picker-search"), "BBBB");
    await waitFor(() => {
      expect(screen.getAllByTestId("contact-picker-option")).toHaveLength(1);
    });
    expect(screen.getByText("Bob Marley")).toBeInTheDocument();
  });

  it("selecting a contact calls onSelect with it", async () => {
    seedContacts(CONTACTS);
    const onSelect = jest.fn();
    const user = userEvent.setup();
    render(<ContactPickerModal isOpen onSelect={onSelect} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByTestId("contact-picker-option")).toHaveLength(2);
    });
    await user.click(screen.getByText("Alice"));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ name: "Alice" });
  });

  it("shows an empty state with a Contacts page link when nothing is saved", () => {
    render(<ContactPickerModal isOpen onSelect={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByTestId("contact-picker-empty")).toBeInTheDocument();
    const link = screen.getByTestId("contact-picker-empty-link");
    expect(link).toHaveAttribute("href", "/contacts");
  });

  it("shows a no-results state when the search matches nothing", async () => {
    seedContacts(CONTACTS);
    const user = userEvent.setup();
    render(<ContactPickerModal isOpen onSelect={jest.fn()} onClose={jest.fn()} />);

    await user.type(screen.getByTestId("contact-picker-search"), "zzzz");
    await waitFor(() => {
      expect(screen.getByTestId("contact-picker-no-results")).toBeInTheDocument();
    });
  });

  it("closes when the backdrop or close button is clicked", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<ContactPickerModal isOpen onSelect={jest.fn()} onClose={onClose} />);

    await user.click(screen.getByTestId("contact-picker-close"));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTestId("contact-picker-modal"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  describe("keyboard navigation (Issue #1465)", () => {
    it("navigates options with ArrowDown, ArrowUp, and wraps around", async () => {
      seedContacts(CONTACTS);
      const user = userEvent.setup();
      render(<ContactPickerModal isOpen onSelect={jest.fn()} onClose={jest.fn()} />);

      const searchInput = screen.getByTestId("contact-picker-search");
      expect(searchInput).toHaveAttribute("role", "combobox");
      expect(searchInput).toHaveAttribute("aria-controls", "contact-picker-listbox");
      expect(searchInput).not.toHaveAttribute("aria-activedescendant");

      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(2);
      expect(options[0]).toHaveAttribute("aria-selected", "false");
      expect(options[1]).toHaveAttribute("aria-selected", "false");

      // Press ArrowDown to highlight first contact
      await user.click(searchInput);
      await user.keyboard("{ArrowDown}");
      expect(searchInput).toHaveAttribute("aria-activedescendant", "contact-option-1");
      expect(options[0]).toHaveAttribute("aria-selected", "true");
      expect(options[1]).toHaveAttribute("aria-selected", "false");

      // Press ArrowDown to highlight second contact
      await user.keyboard("{ArrowDown}");
      expect(searchInput).toHaveAttribute("aria-activedescendant", "contact-option-2");
      expect(options[0]).toHaveAttribute("aria-selected", "false");
      expect(options[1]).toHaveAttribute("aria-selected", "true");

      // Press ArrowDown to wrap back to first contact
      await user.keyboard("{ArrowDown}");
      expect(searchInput).toHaveAttribute("aria-activedescendant", "contact-option-1");
      expect(options[0]).toHaveAttribute("aria-selected", "true");

      // Press ArrowUp to wrap to last contact
      await user.keyboard("{ArrowUp}");
      expect(searchInput).toHaveAttribute("aria-activedescendant", "contact-option-2");
      expect(options[1]).toHaveAttribute("aria-selected", "true");
    });

    it("jumps to first/last options with Home and End keys", async () => {
      seedContacts(CONTACTS);
      const user = userEvent.setup();
      render(<ContactPickerModal isOpen onSelect={jest.fn()} onClose={jest.fn()} />);

      const searchInput = screen.getByTestId("contact-picker-search");
      await user.click(searchInput);

      // End jumps to last option
      await user.keyboard("{End}");
      expect(searchInput).toHaveAttribute("aria-activedescendant", "contact-option-2");
      const options = screen.getAllByRole("option");
      expect(options[1]).toHaveAttribute("aria-selected", "true");

      // Home jumps to first option
      await user.keyboard("{Home}");
      expect(searchInput).toHaveAttribute("aria-activedescendant", "contact-option-1");
      expect(options[0]).toHaveAttribute("aria-selected", "true");
    });

    it("selects active option on Enter key", async () => {
      seedContacts(CONTACTS);
      const onSelect = jest.fn();
      const user = userEvent.setup();
      render(<ContactPickerModal isOpen onSelect={onSelect} onClose={jest.fn()} />);

      const searchInput = screen.getByTestId("contact-picker-search");
      await user.click(searchInput);
      await user.keyboard("{ArrowDown}"); // Active: Alice
      await user.keyboard("{Enter}");

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(CONTACTS[0]);
    });

    it("closes modal on Escape key", async () => {
      seedContacts(CONTACTS);
      const onClose = jest.fn();
      const user = userEvent.setup();
      render(<ContactPickerModal isOpen onSelect={jest.fn()} onClose={onClose} />);

      const searchInput = screen.getByTestId("contact-picker-search");
      await user.click(searchInput);
      await user.keyboard("{Escape}");

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("announces option count and selection in aria-live region", async () => {
      seedContacts(CONTACTS);
      const onSelect = jest.fn();
      const user = userEvent.setup();
      render(<ContactPickerModal isOpen onSelect={onSelect} onClose={jest.fn()} />);

      const announcement = screen.getByTestId("contact-picker-announcement");
      expect(announcement).toHaveAttribute("aria-live", "polite");
      expect(announcement).toHaveTextContent(/2 contacts available/i);

      // Filter down to Bob
      const searchInput = screen.getByTestId("contact-picker-search");
      await user.type(searchInput, "Bob");
      await waitFor(() => {
        expect(announcement).toHaveTextContent(/1 contact available/i);
      });

      // Press enter to select
      await user.keyboard("{Enter}");
      expect(announcement).toHaveTextContent(/Selected Bob Marley/i);
      expect(onSelect).toHaveBeenCalledWith(CONTACTS[1]);
    });

    it("syncs active option on mouse hover", async () => {
      seedContacts(CONTACTS);
      const user = userEvent.setup();
      render(<ContactPickerModal isOpen onSelect={jest.fn()} onClose={jest.fn()} />);

      const searchInput = screen.getByTestId("contact-picker-search");
      const options = screen.getAllByRole("option");

      await user.hover(options[1]);
      expect(searchInput).toHaveAttribute("aria-activedescendant", "contact-option-2");
      expect(options[1]).toHaveAttribute("aria-selected", "true");

      await user.hover(options[0]);
      expect(searchInput).toHaveAttribute("aria-activedescendant", "contact-option-1");
      expect(options[0]).toHaveAttribute("aria-selected", "true");
    });

    it("resets active descendant when typing in search", async () => {
      seedContacts(CONTACTS);
      const user = userEvent.setup();
      render(<ContactPickerModal isOpen onSelect={jest.fn()} onClose={jest.fn()} />);

      const searchInput = screen.getByTestId("contact-picker-search");
      await user.click(searchInput);
      await user.keyboard("{ArrowDown}");
      expect(searchInput).toHaveAttribute("aria-activedescendant", "contact-option-1");

      await user.keyboard("A");
      expect(searchInput).not.toHaveAttribute("aria-activedescendant");
    });
  });
});

describe("SendPaymentForm — address-book integration (Issue #1054)", () => {
  const defaultProps = {
    publicKey: "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3D5NZ2KMSUGSRNVO7ZFGIGSZ",
    xlmBalance: "100.0000000",
    usdcBalance: "50.0000000",
    onSuccess: jest.fn(),
  };

  it("opens the picker from the address-book icon and fills the destination on select", async () => {
    seedContacts(CONTACTS);
    const user = userEvent.setup();
    render(<SendPaymentForm {...defaultProps} />);

    await user.click(screen.getByTestId("open-contact-picker"));
    expect(screen.getByTestId("contact-picker-modal")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByTestId("contact-picker-option")).toHaveLength(2);
    });
    await user.click(screen.getByText("Alice"));

    // Modal closed and destination filled with the contact's address
    await waitFor(() => {
      expect(screen.queryByTestId("contact-picker-modal")).not.toBeInTheDocument();
    });
    const destinationInput = screen.getByPlaceholderText("G... or alice.xlm");
    expect(destinationInput).toHaveValue(CONTACTS[0].address);
  });
});
