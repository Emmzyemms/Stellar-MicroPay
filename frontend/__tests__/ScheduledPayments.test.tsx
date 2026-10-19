/**
 * __tests__/ScheduledPayments.test.tsx
 *
 * Tests for the scheduled-payments screen (#1429). The screen is the
 * server-backed half of recurring payments, so every backend call is mocked at
 * the `lib/turrets.ts` boundary — the module the page actually talks to — and
 * the assertions check that the page shows the interval/next-run the server
 * reported and shows the server's own error text when a call fails.
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScheduledPaymentsPage from "@/pages/scheduled-payments";
import { useWallet } from "@/lib/useWallet";
import {
  cancelTurretsFunction,
  createScheduledDcaPayment,
  listTurretsFunctions,
  pauseTurretsFunction,
  resumeTurretsFunction,
  type TurretsDeployment,
} from "@/lib/turrets";
import { formatDate, getUserTimezone } from "@/utils/intlFormatters";

const WALLET = `G${"A".repeat(55)}`;
const RECIPIENT = `G${"B".repeat(55)}`;
const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const NEXT_RUN = "2026-02-14T06:30:00.000Z";
const LAST_RUN = "2026-01-15T18:45:00.000Z";

jest.mock("@/lib/useWallet", () => ({ useWallet: jest.fn() }));

jest.mock("@/lib/turrets", () => ({
  cancelTurretsFunction: jest.fn(),
  createScheduledDcaPayment: jest.fn(),
  listTurretsFunctions: jest.fn(),
  pauseTurretsFunction: jest.fn(),
  resumeTurretsFunction: jest.fn(),
}));

jest.mock("@/lib/stellar", () => ({
  USDC_ISSUER: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
  isValidStellarAddress: (address: string) => address.startsWith("G") && address.length === 56,
}));

jest.mock("@/utils/format", () => ({
  shortenAddress: (address: string, keep = 6) =>
    `${address.slice(0, keep)}…${address.slice(-keep)}`,
}));

jest.mock("@/components/WalletConnect", () =>
  jest.fn(() => <div data-testid="wallet-connect-stub">Connect wallet</div>)
);

function deployment(overrides: Partial<TurretsDeployment> = {}): TurretsDeployment {
  return {
    id: "deploy-1",
    ownerPublicKey: WALLET,
    type: "dca",
    status: "active",
    config: {
      recipient: RECIPIENT,
      paymentType: "scheduled_payment",
      amountQuote: "25",
      quoteAssetCode: "USDC",
      frequency: "monthly",
    },
    deploymentHash: "hash-1",
    createdAt: "2026-01-10T00:00:00.000Z",
    nextRunAt: NEXT_RUN,
    lastExecutedAt: LAST_RUN,
    lastCheckedAt: null,
    lastObservedPriceUsd: null,
    lastError: null,
    ...overrides,
  };
}

/** The page renders dates with the ambient viewer zone, so mirror that call. */
function displayed(timestamp: string | number) {
  return formatDate(timestamp, { locale: "en-US", timezone: getUserTimezone() });
}

function renderPage() {
  return render(<ScheduledPaymentsPage />);
}

beforeEach(() => {
  jest.clearAllMocks();
  (useWallet as jest.Mock).mockReturnValue({ publicKey: WALLET });
  (listTurretsFunctions as jest.Mock).mockResolvedValue([]);
  (createScheduledDcaPayment as jest.Mock).mockResolvedValue(deployment());
  (pauseTurretsFunction as jest.Mock).mockResolvedValue(deployment({ status: "paused" }));
  (resumeTurretsFunction as jest.Mock).mockResolvedValue(deployment({ status: "active" }));
  (cancelTurretsFunction as jest.Mock).mockResolvedValue({
    id: "deploy-1",
    status: "cancelled",
    cancelledAt: "2026-01-16T00:00:00.000Z",
  });
});

describe("ScheduledPaymentsPage — wallet gate", () => {
  it("asks for a wallet connection instead of listing schedules", async () => {
    (useWallet as jest.Mock).mockReturnValue({ publicKey: null });
    renderPage();

    expect(await screen.findByTestId("wallet-connect-stub")).toBeInTheDocument();
    expect(
      screen.getByText("Connect your wallet to create and manage recurring payments.")
    ).toBeInTheDocument();
    expect(listTurretsFunctions).not.toHaveBeenCalled();
  });
});

describe("ScheduledPaymentsPage — schedule list", () => {
  it("loads schedules for the connected account", async () => {
    (listTurretsFunctions as jest.Mock).mockResolvedValue([deployment()]);
    renderPage();

    await waitFor(() => expect(listTurretsFunctions).toHaveBeenCalledWith(WALLET));
    expect(await screen.findByText(`${RECIPIENT.slice(0, 8)}…${RECIPIENT.slice(-8)}`)).toBeInTheDocument();
  });

  it("shows the loading state before the response arrives", async () => {
    (listTurretsFunctions as jest.Mock).mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders the amount, asset, frequency and status the server reported", async () => {
    (listTurretsFunctions as jest.Mock).mockResolvedValue([deployment()]);
    renderPage();

    expect(await screen.findByText("25 USDC · monthly")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("renders last execution and next run through the shared date formatter", async () => {
    (listTurretsFunctions as jest.Mock).mockResolvedValue([deployment()]);
    renderPage();

    expect(await screen.findByText("Last execution")).toBeInTheDocument();
    expect(screen.getByText(displayed(NEXT_RUN))).toBeInTheDocument();
    expect(screen.getByText(displayed(LAST_RUN))).toBeInTheDocument();
  });

  it("renders a scheduled instant as a localized wall clock, not a raw string", () => {
    // 06:30 UTC is the previous evening in Los Angeles and still the same
    // morning in Kiritimati; the row must show one viewer-local value.
    expect(displayed(NEXT_RUN)).toBe(
      formatDate(NEXT_RUN, { locale: "en-US", timezone: getUserTimezone() })
    );
    expect(formatDate(NEXT_RUN, { locale: "en-US", timezone: "America/Los_Angeles" })).toContain(
      "Feb 13, 2026"
    );
    expect(formatDate(NEXT_RUN, { locale: "en-US", timezone: "Pacific/Kiritimati" })).toContain(
      "Feb 14, 2026"
    );
  });

  it("shows an em dash when a schedule has no execution history yet", async () => {
    (listTurretsFunctions as jest.Mock).mockResolvedValue([
      deployment({ nextRunAt: null, lastExecutedAt: null }),
    ]);
    renderPage();

    expect(await screen.findByText("Next run")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("keeps automation that is not a scheduled payment out of the list", async () => {
    (listTurretsFunctions as jest.Mock).mockResolvedValue([
      deployment({ id: "plain-dca", config: { amountQuote: "111" } }),
      deployment({
        id: "stop-loss",
        type: "stop_loss",
        config: { recipient: RECIPIENT, amountQuote: "222" },
      }),
      deployment({
        id: "scheduled",
        config: {
          recipient: RECIPIENT,
          paymentType: "scheduled_payment",
          amountQuote: "25",
          quoteAssetCode: "USDC",
          frequency: "monthly",
        },
      }),
    ]);
    renderPage();

    expect(await screen.findByText("25 USDC · monthly")).toBeInTheDocument();
    expect(screen.queryByText(/111/)).not.toBeInTheDocument();
    expect(screen.queryByText(/222/)).not.toBeInTheDocument();
    expect(screen.getAllByText("active")).toHaveLength(1);
    expect(listTurretsFunctions).toHaveBeenCalledTimes(1);
  });

  it("shows the empty state when the account has no schedules", async () => {
    renderPage();

    expect(await screen.findByText("No scheduled payments yet.")).toBeInTheDocument();
  });

  it("surfaces the server's own message when loading fails", async () => {
    (listTurretsFunctions as jest.Mock).mockRejectedValue(
      new Error("Turrets is unreachable right now")
    );
    renderPage();

    expect(
      await screen.findByText("Turrets is unreachable right now")
    ).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    expect(screen.getByText("No scheduled payments yet.")).toBeInTheDocument();
  });

  it("falls back to a translated message when the failure has no message", async () => {
    (listTurretsFunctions as jest.Mock).mockRejectedValue("boom");
    renderPage();

    expect(await screen.findByText("Failed to load scheduled payments")).toBeInTheDocument();
  });

  it("reloads the schedules from the refresh button", async () => {
    (listTurretsFunctions as jest.Mock).mockResolvedValue([deployment()]);
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText("Refresh")).toBeInTheDocument());
    await user.click(screen.getByText("Refresh"));

    await waitFor(() => expect(listTurretsFunctions).toHaveBeenCalledTimes(2));
  });
});

describe("ScheduledPaymentsPage — creating a schedule", () => {
  async function openForm(user: ReturnType<typeof userEvent.setup>) {
    await waitFor(() => expect(screen.getByLabelText("Recipient")).toBeInTheDocument());
    await user.type(screen.getByLabelText("Recipient"), RECIPIENT);
  }

  it("rejects a recipient that is not a Stellar address without calling the API", async () => {
    const user = userEvent.setup();
    renderPage();
    await openForm(user);
    await user.clear(screen.getByLabelText("Recipient"));
    await user.type(screen.getByLabelText("Recipient"), "alice.stellar");
    await user.type(screen.getByLabelText("Amount"), "5");
    await user.click(screen.getByRole("button", { name: "Create scheduled payment" }));

    expect(await screen.findByText("Enter a valid Stellar recipient address")).toBeInTheDocument();
    expect(createScheduledDcaPayment).not.toHaveBeenCalled();
  });

  it.each([["0"], ["abc"]])("rejects the amount %s", async (amount) => {
    const user = userEvent.setup();
    renderPage();
    await openForm(user);
    await user.clear(screen.getByLabelText("Amount"));
    await user.type(screen.getByLabelText("Amount"), amount);
    await user.click(screen.getByRole("button", { name: "Create scheduled payment" }));

    expect(await screen.findByText("Enter a valid amount greater than zero")).toBeInTheDocument();
    expect(createScheduledDcaPayment).not.toHaveBeenCalled();
  });

  it("rejects a negative amount from the page's own guard", async () => {
    // A number input with `min="0"` blocks range-underflow values from ever
    // reaching the submit handler, so the guard is exercised directly.
    renderPage();
    await waitFor(() => expect(screen.getByLabelText("Recipient")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Recipient"), { target: { value: RECIPIENT } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "-2" } });
    fireEvent.submit(screen.getByRole("button", { name: "Create scheduled payment" }).closest("form")!);

    expect(screen.getByText("Enter a valid amount greater than zero")).toBeInTheDocument();
    expect(createScheduledDcaPayment).not.toHaveBeenCalled();
  });

  it("creates an XLM schedule with no issuer and reloads the list", async () => {
    (listTurretsFunctions as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([deployment()]);
    const user = userEvent.setup();
    renderPage();
    await openForm(user);
    await user.type(screen.getByLabelText("Amount"), "12.75");
    await user.selectOptions(screen.getByLabelText("Frequency"), "weekly");
    await user.click(screen.getByRole("button", { name: "Create scheduled payment" }));

    await waitFor(() =>
      expect(createScheduledDcaPayment).toHaveBeenCalledWith({
        ownerPublicKey: WALLET,
        recipient: RECIPIENT,
        amount: 12.75,
        asset: "XLM",
        assetIssuer: null,
        frequency: "weekly",
      })
    );
    expect(await screen.findByText("Scheduled payment created")).toBeInTheDocument();
    expect(screen.getByLabelText("Recipient")).toHaveValue("");
    expect(screen.getByLabelText("Amount")).toHaveValue(null);
    await waitFor(() => expect(listTurretsFunctions).toHaveBeenCalledTimes(2));
  });

  it("creates a USDC schedule with the USDC issuer", async () => {
    const user = userEvent.setup();
    renderPage();
    await openForm(user);
    await user.type(screen.getByLabelText("Amount"), "10");
    await user.selectOptions(screen.getByLabelText("Asset"), "USDC");
    await user.click(screen.getByRole("button", { name: "Create scheduled payment" }));

    await waitFor(() =>
      expect(createScheduledDcaPayment).toHaveBeenCalledWith(
        expect.objectContaining({ asset: "USDC", assetIssuer: USDC_ISSUER })
      )
    );
  });

  it("shows the server error and stays submitted-free when creation fails", async () => {
    (createScheduledDcaPayment as jest.Mock).mockRejectedValue(
      new Error("Quorum missing on the turret signer")
    );
    const user = userEvent.setup();
    renderPage();
    await openForm(user);
    await user.type(screen.getByLabelText("Amount"), "5");
    await user.click(screen.getByRole("button", { name: "Create scheduled payment" }));

    expect(
      await screen.findByText("Quorum missing on the turret signer")
    ).toBeInTheDocument();
    expect(screen.queryByText("Scheduled payment created")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create scheduled payment" })).toBeEnabled();
  });

  it("disables the submit button while the create request is in flight", async () => {
    let release: (value: TurretsDeployment) => void = () => {};
    (createScheduledDcaPayment as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    const user = userEvent.setup();
    renderPage();
    await openForm(user);
    await user.type(screen.getByLabelText("Amount"), "5");
    await user.click(screen.getByRole("button", { name: "Create scheduled payment" }));

    expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled();

    release(deployment());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Create scheduled payment" })).toBeEnabled()
    );
  });

  it("keeps a previous error out of a successful create", async () => {
    (createScheduledDcaPayment as jest.Mock).mockRejectedValueOnce(new Error("first attempt failed"));
    const user = userEvent.setup();
    renderPage();
    await openForm(user);
    await user.type(screen.getByLabelText("Amount"), "5");
    await user.click(screen.getByRole("button", { name: "Create scheduled payment" }));
    expect(await screen.findByText("first attempt failed")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create scheduled payment" }));

    expect(await screen.findByText("Scheduled payment created")).toBeInTheDocument();
    expect(screen.queryByText("first attempt failed")).not.toBeInTheDocument();
  });
});

describe("ScheduledPaymentsPage — pausing, resuming and cancelling", () => {
  it("pauses an active schedule and reloads", async () => {
    (listTurretsFunctions as jest.Mock).mockResolvedValue([deployment()]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Pause" }));

    await waitFor(() => expect(pauseTurretsFunction).toHaveBeenCalledWith("deploy-1"));
    await waitFor(() => expect(listTurretsFunctions).toHaveBeenCalledTimes(2));
  });

  it("offers resume instead of pause for a paused schedule", async () => {
    (listTurretsFunctions as jest.Mock).mockResolvedValue([deployment({ status: "paused" })]);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole("button", { name: "Resume" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Resume" }));
    await waitFor(() => expect(resumeTurretsFunction).toHaveBeenCalledWith("deploy-1"));
  });

  it("cancels a schedule and reloads the list", async () => {
    (listTurretsFunctions as jest.Mock).mockResolvedValue([deployment()]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(cancelTurretsFunction).toHaveBeenCalledWith("deploy-1"));
    await waitFor(() => expect(listTurretsFunctions).toHaveBeenCalledTimes(2));
  });

  it("surfaces the cancellation failure returned by the backend", async () => {
    (listTurretsFunctions as jest.Mock).mockResolvedValue([deployment()]);
    (cancelTurretsFunction as jest.Mock).mockRejectedValue(
      new Error("Function already settled")
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(await screen.findByText("Function already settled")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  });

  it("only marks the schedule being acted on as busy", async () => {
    (listTurretsFunctions as jest.Mock).mockResolvedValue([
      deployment({ id: "a" }),
      deployment({ id: "b", config: { recipient: RECIPIENT, frequency: "daily" } }),
    ]);
    let release: (value: TurretsDeployment) => void = () => {};
    (pauseTurretsFunction as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    const user = userEvent.setup();
    renderPage();

    const pauseButtons = await screen.findAllByRole("button", { name: "Pause" });
    expect(pauseButtons).toHaveLength(2);
    await user.click(pauseButtons[0]);

    expect(pauseButtons[0]).toBeDisabled();
    expect(pauseButtons[1]).toBeEnabled();

    release(deployment());
    await waitFor(() => expect(pauseButtons[0]).toBeEnabled());
  });

  it("falls back to a translated message when an action fails without one", async () => {
    (pauseTurretsFunction as jest.Mock).mockRejectedValue("nope");
    (listTurretsFunctions as jest.Mock).mockResolvedValue([deployment()]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Pause" }));

    expect(await screen.findByText("Failed to pause payment")).toBeInTheDocument();
  });
});
