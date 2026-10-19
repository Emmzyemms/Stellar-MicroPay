/**
 * __tests__/RecurringPayments.test.tsx
 *
 * Unit tests for the client-side recurring-schedule manager (#1429): list
 * rendering, interval/amount validation on create, cancellation behind a
 * confirmation step, "Pay Now" hand-off to the send form, and the next-run
 * line the component renders through the shared Intl date formatter.
 *
 * Schedules live in localStorage, so the storage key is both the fixture
 * format and the assertion target — no network layer is involved here (the
 * server-backed half of scheduling is covered in ScheduledPayments.test.tsx).
 */

import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecurringPayments, {
  type RecurringPayment,
} from "@/components/RecurringPayments";
import { formatDate, getUserTimezone } from "@/utils/intlFormatters";

const STORAGE_KEY = "stellar-micropay:recurring-payments";
const NOW = Date.parse("2026-01-15T10:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

const RECIPIENT = `G${"A".repeat(55)}`;
const OTHER_RECIPIENT = `G${"B".repeat(55)}`;

function schedule(overrides: Partial<RecurringPayment> = {}): RecurringPayment {
  return {
    id: "1700000000000-abc123",
    destination: RECIPIENT,
    amount: "12.5",
    memo: "rent",
    interval: "monthly",
    nextRunAt: NOW + 30 * DAY_MS,
    createdAt: NOW - DAY_MS,
    ...overrides,
  };
}

function seed(schedules: RecurringPayment[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
}

function readStorage(): RecurringPayment[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as RecurringPayment[]) : [];
}

/**
 * The component renders the schedule's next run through the shared formatter,
 * which localizes to the viewer's locale and zone, so build the expectation the
 * same way instead of hard-coding one zone's wall clock.
 */
function expectedNextRun(timestamp: number) {
  return `Next run: ${formatDate(timestamp, {
    locale: "en-US",
    timezone: getUserTimezone(),
  })}`;
}

function renderList(onPayNow = jest.fn()) {
  render(<RecurringPayments onPayNow={onPayNow} />);
  return onPayNow;
}

beforeEach(() => {
  jest.spyOn(Date, "now").mockReturnValue(NOW);
});

afterEach(() => {
  jest.restoreAllMocks();
  window.localStorage.clear();
});

describe("RecurringPayments — schedule list", () => {
  it("shows the empty state when nothing is stored", () => {
    renderList();

    expect(
      screen.getByText("No recurring payments yet. Create a schedule to send XLM automatically.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("renders a stored schedule with amount, interval, recipient and next run", () => {
    seed([schedule({ interval: "weekly", nextRunAt: NOW + 7 * DAY_MS })]);
    renderList();

    const row = screen.getByRole("listitem");
    expect(within(row).getByText(/12\.5 XLM/)).toBeInTheDocument();
    expect(within(row).getByText("Weekly", { exact: false })).toBeInTheDocument();
    expect(within(row).getByText(RECIPIENT)).toBeInTheDocument();
    expect(within(row).getByText(expectedNextRun(NOW + 7 * DAY_MS))).toBeInTheDocument();
  });

  it("renders one row per schedule and keeps the newest first", () => {
    seed([
      schedule({ id: "newer", amount: "1" }),
      schedule({ id: "older", amount: "2", destination: OTHER_RECIPIENT }),
    ]);
    renderList();

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText(/1 XLM/)).toBeInTheDocument();
    expect(within(rows[1]).getByText(/2 XLM/)).toBeInTheDocument();
  });

  it("marks a schedule due once its next run has passed", () => {
    seed([
      schedule({ id: "due", nextRunAt: NOW - 1000 }),
      schedule({ id: "later", nextRunAt: NOW + DAY_MS, destination: OTHER_RECIPIENT }),
    ]);
    renderList();

    expect(screen.getAllByText("Due")).toHaveLength(1);
  });

  it("recovers from corrupt storage instead of throwing", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");
    renderList();

    expect(
      screen.getByText(/No recurring payments yet/)
    ).toBeInTheDocument();
  });

  it("renders the next run as a zone-aware instant, not a fixed string", () => {
    // 23:30 UTC is still Feb 14 west of Greenwich and already Feb 15 in
    // Kiritimati, which is the whole point of routing it through the formatter.
    const timestamp = Date.parse("2026-02-14T23:30:00.000Z");
    seed([schedule({ nextRunAt: timestamp })]);
    renderList();

    expect(screen.getByText(expectedNextRun(timestamp))).toBeInTheDocument();
    expect(formatDate(timestamp, { locale: "en-US", timezone: "Pacific/Kiritimati" })).not.toBe(
      formatDate(timestamp, { locale: "en-US", timezone: "Etc/GMT" })
    );
  });
});

describe("RecurringPayments — creating a schedule", () => {
  it("opens the form on demand and closes it again", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "+ New" }));
    expect(screen.getByRole("button", { name: "Save schedule" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("button", { name: "Save schedule" })).not.toBeInTheDocument();
  });

  it("saves a monthly schedule with a next run 30 days out", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "+ New" }));
    await user.type(screen.getByPlaceholderText("Recipient address (G…)"), RECIPIENT);
    await user.type(screen.getByPlaceholderText("Amount (XLM)"), "12.5");
    await user.type(screen.getByPlaceholderText("Memo (optional)"), "rent");
    await user.selectOptions(screen.getByLabelText("Interval"), "monthly");
    await user.click(screen.getByRole("button", { name: "Save schedule" }));

    const saved = readStorage();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      destination: RECIPIENT,
      amount: "12.5",
      memo: "rent",
      interval: "monthly",
      nextRunAt: NOW + 30 * DAY_MS,
      createdAt: NOW,
    });
    expect(screen.getByRole("listitem")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save schedule" })).not.toBeInTheDocument();
  });

  it.each([
    ["daily", 1],
    ["weekly", 7],
    ["monthly", 30],
  ])("maps the %s interval to a next run %i day(s) from now", async (interval, days) => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "+ New" }));
    await user.type(screen.getByPlaceholderText("Recipient address (G…)"), RECIPIENT);
    await user.type(screen.getByPlaceholderText("Amount (XLM)"), "1");
    await user.selectOptions(screen.getByLabelText("Interval"), interval);
    await user.click(screen.getByRole("button", { name: "Save schedule" }));

    expect(readStorage()[0].interval).toBe(interval);
    expect(readStorage()[0].nextRunAt).toBe(NOW + days * DAY_MS);
  });

  it("defaults a freshly opened form to monthly", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "+ New" }));
    expect(screen.getByLabelText("Interval")).toHaveValue("monthly");
  });

  it("trims the recipient and memo before storing them", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "+ New" }));
    await user.click(screen.getByPlaceholderText("Recipient address (G…)"));
    await user.paste(`  ${RECIPIENT}  `);
    await user.click(screen.getByPlaceholderText("Amount (XLM)"));
    // The number field normalises "3.0" to "3", so that is what gets stored.
    await user.paste("3.0");
    await user.click(screen.getByPlaceholderText("Memo (optional)"));
    await user.paste("   rent   ");
    await user.click(screen.getByRole("button", { name: "Save schedule" }));

    expect(readStorage()[0]).toMatchObject({
      destination: RECIPIENT,
      amount: "3",
      memo: "rent",
    });
  });

  it("rejects a recipient that is only whitespace and keeps the form open", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "+ New" }));
    await user.click(screen.getByPlaceholderText("Recipient address (G…)"));
    await user.paste("   ");
    await user.click(screen.getByPlaceholderText("Amount (XLM)"));
    await user.paste("5");
    await user.click(screen.getByRole("button", { name: "Save schedule" }));

    expect(screen.getByText("Enter a valid Stellar recipient address")).toBeInTheDocument();
    expect(readStorage()).toEqual([]);
    expect(screen.getByRole("button", { name: "Save schedule" })).toBeInTheDocument();
  });

  it("rejects an amount that is not greater than zero", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "+ New" }));
    await user.type(screen.getByPlaceholderText("Recipient address (G…)"), RECIPIENT);
    await user.type(screen.getByPlaceholderText("Amount (XLM)"), "0");
    await user.click(screen.getByRole("button", { name: "Save schedule" }));

    expect(screen.getByText("Enter a valid amount greater than zero")).toBeInTheDocument();
    expect(readStorage()).toEqual([]);
  });

  it("clears the validation message once a valid schedule is saved", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "+ New" }));
    await user.type(screen.getByPlaceholderText("Recipient address (G…)"), RECIPIENT);
    await user.type(screen.getByPlaceholderText("Amount (XLM)"), "0");
    await user.click(screen.getByRole("button", { name: "Save schedule" }));

    await user.clear(screen.getByPlaceholderText("Amount (XLM)"));
    await user.type(screen.getByPlaceholderText("Amount (XLM)"), "4");
    await user.click(screen.getByRole("button", { name: "Save schedule" }));

    expect(screen.queryByText("Enter a valid amount greater than zero")).not.toBeInTheDocument();
    expect(readStorage()).toHaveLength(1);
  });

  it("keeps an existing schedule when a new one is created", async () => {
    seed([schedule({ id: "existing", amount: "9" })]);
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "+ New" }));
    await user.type(screen.getByPlaceholderText("Recipient address (G…)"), OTHER_RECIPIENT);
    await user.type(screen.getByPlaceholderText("Amount (XLM)"), "2");
    await user.selectOptions(screen.getByLabelText("Interval"), "daily");
    await user.click(screen.getByRole("button", { name: "Save schedule" }));

    expect(readStorage()).toHaveLength(2);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});

describe("RecurringPayments — cancelling a schedule", () => {
  it("asks for confirmation before removing a schedule", async () => {
    seed([schedule()]);
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "Delete schedule" }));

    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(readStorage()).toHaveLength(1);
  });

  it("keeps the schedule when the confirmation is declined", async () => {
    seed([schedule()]);
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "Delete schedule" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("button", { name: "Delete schedule" })).toBeInTheDocument();
    expect(readStorage()).toHaveLength(1);
    expect(screen.getByRole("listitem")).toBeInTheDocument();
  });

  it("removes the schedule from the list and from storage on confirm", async () => {
    seed([
      schedule({ id: "gone" }),
      schedule({ id: "kept", amount: "3", destination: OTHER_RECIPIENT }),
    ]);
    const user = userEvent.setup();
    renderList();

    const [firstRow] = screen.getAllByRole("listitem");
    await user.click(within(firstRow).getByRole("button", { name: "Delete schedule" }));
    await user.click(within(firstRow).getByRole("button", { name: "Confirm" }));

    expect(readStorage().map((s) => s.id)).toEqual(["kept"]);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(
      within(screen.getByRole("listitem")).getByRole("button", { name: "Delete schedule" })
    ).toBeInTheDocument();
  });

  it("shows the empty state after the only schedule is cancelled", async () => {
    seed([schedule()]);
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "Delete schedule" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(screen.getByText(/No recurring payments yet/)).toBeInTheDocument();
  });

  it("keeps the confirmation prompt on the row that asked for it", async () => {
    seed([
      schedule({ id: "first", amount: "1", nextRunAt: NOW + DAY_MS }),
      schedule({ id: "second", amount: "2", nextRunAt: NOW + 2 * DAY_MS, destination: OTHER_RECIPIENT }),
    ]);
    const user = userEvent.setup();
    renderList();

    const [firstRow, secondRow] = screen.getAllByRole("listitem");
    await user.click(within(firstRow).getByRole("button", { name: "Delete schedule" }));
    expect(within(firstRow).getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(within(secondRow).getByRole("button", { name: "Delete schedule" })).toBeInTheDocument();

    // Opening the second prompt moves it; only one row is ever mid-confirmation.
    await user.click(within(secondRow).getByRole("button", { name: "Delete schedule" }));
    expect(within(firstRow).getByRole("button", { name: "Delete schedule" })).toBeInTheDocument();

    await user.click(within(secondRow).getByRole("button", { name: "Confirm" }));
    expect(readStorage().map((s) => s.id)).toEqual(["first"]);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("leaves the schedule in storage while a confirmation is pending", async () => {
    seed([schedule({ id: "pending" })]);
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "Delete schedule" }));

    expect(readStorage()).toHaveLength(1);
    expect(screen.getByRole("listitem")).toBeInTheDocument();
  });
});

describe("RecurringPayments — pay now hand-off", () => {
  it("hands the schedule details to the send form", async () => {
    seed([schedule({ amount: "7.25", memo: "invoice 12" })]);
    const user = userEvent.setup();
    const onPayNow = renderList();

    await user.click(screen.getByRole("button", { name: "Pay Now" }));

    expect(onPayNow).toHaveBeenCalledTimes(1);
    expect(onPayNow).toHaveBeenCalledWith({
      destination: RECIPIENT,
      amount: "7.25",
      memo: "invoice 12",
    });
  });

  it("passes an empty memo through for a schedule without one", async () => {
    seed([schedule({ memo: "" })]);
    const user = userEvent.setup();
    const onPayNow = renderList();

    await user.click(screen.getByRole("button", { name: "Pay Now" }));

    expect(onPayNow).toHaveBeenCalledWith(expect.objectContaining({ memo: "" }));
  });
});

describe("RecurringPayments — persistence", () => {
  it("reloads the saved schedules on mount", async () => {
    const user = userEvent.setup();
    const first = render(<RecurringPayments onPayNow={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "+ New" }));
    await user.type(screen.getByPlaceholderText("Recipient address (G…)"), RECIPIENT);
    await user.type(screen.getByPlaceholderText("Amount (XLM)"), "6");
    await user.click(screen.getByRole("button", { name: "Save schedule" }));

    first.unmount();
    render(<RecurringPayments onPayNow={jest.fn()} />);

    expect(screen.getByRole("listitem")).toBeInTheDocument();
    expect(screen.getByText(expectedNextRun(NOW + 30 * DAY_MS))).toBeInTheDocument();
  });
});
