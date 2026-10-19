import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  Account,
  Asset,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  hash,
} from '@stellar/stellar-sdk';
import {
  DisconnectedDevice,
  LockedDeviceError,
  TransportError,
  TransportInterfaceNotAvailable,
  TransportOpenUserCancelled,
  TransportStatusError,
} from '@ledgerhq/errors';
import { WalletProvider, useWallet, type SignResult } from '../lib/useWallet';
import { I18nProvider } from '../contexts/I18nContext';
import { LOCALE_STORAGE_KEY } from '../lib/i18n';
import { classifyLedgerError, isRecoverableLedgerError } from '../lib/wallet';
import en from '../locales/en.json';
import es from '../locales/es.json';

const mockGetConnectedPublicKey = jest.fn();
const mockDisconnectWallet = jest.fn();

jest.mock('@/lib/wallet', () => ({
  ...jest.requireActual('@/lib/wallet'),
  getConnectedPublicKey: (...args: unknown[]) => mockGetConnectedPublicKey(...args),
  disconnectWallet: (...args: unknown[]) => mockDisconnectWallet(...args),
}));

jest.mock('@stellar/freighter-api', () => ({
  isConnected: jest.fn(),
  getPublicKey: jest.fn(),
  signTransaction: jest.fn(),
  requestAccess: jest.fn(),
  isAllowed: jest.fn(),
}));

// The Ledger transport is mocked at the USB layer so the real
// signTransactionWithLedger → classifyLedgerError → useWallet path runs.
const mockTransportCreate = jest.fn();
const mockTransportClose = jest.fn();
const mockLedgerGetPublicKey = jest.fn();
const mockLedgerSign = jest.fn();

jest.mock('@ledgerhq/hw-transport-webusb', () => ({
  __esModule: true,
  default: {
    create: (...args: unknown[]) => mockTransportCreate(...args),
    isSupported: () => Promise.resolve(true),
  },
}));

jest.mock('@ledgerhq/hw-app-str', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    getPublicKey: (...args: unknown[]) => mockLedgerGetPublicKey(...args),
    signTransaction: (...args: unknown[]) => mockLedgerSign(...args),
  })),
}));

const PUBLIC_KEY_A = 'GB5XVAABEQMY63WTHDQ5RXADGYF345VWMNPTN2GFUDZT57D57ZQTJ7PS';
const PUBLIC_KEY_B = 'GDGQVOKHW4VEJRU2TETD6DBRKEO5ERCNF353LW5WBFW3JJWQ2BRQ6KDD';

function TestConsumer() {
  const { publicKey, isWalletReady } = useWallet();
  return (
    <div>
      <span data-testid="public-key">{publicKey ?? 'none'}</span>
      <span data-testid="ready">{isWalletReady ? 'ready' : 'loading'}</span>
    </div>
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  mockGetConnectedPublicKey.mockReset();
  mockDisconnectWallet.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('WalletProvider account-change polling', () => {
  it('updates publicKey and shows a toast when Freighter switches to a different account', async () => {
    mockGetConnectedPublicKey.mockResolvedValue(PUBLIC_KEY_A);

    render(
      <WalletProvider>
        <TestConsumer />
      </WalletProvider>
    );

    await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('ready'));
    expect(screen.getByTestId('public-key').textContent).toBe(PUBLIC_KEY_A);

    mockGetConnectedPublicKey.mockResolvedValue(PUBLIC_KEY_B);

    await act(async () => {
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId('public-key').textContent).toBe(PUBLIC_KEY_B);
    expect(screen.getByText('Freighter account changed — wallet updated')).toBeInTheDocument();
  });

  it('does not show a toast or change publicKey when the account stays the same', async () => {
    mockGetConnectedPublicKey.mockResolvedValue(PUBLIC_KEY_A);

    render(
      <WalletProvider>
        <TestConsumer />
      </WalletProvider>
    );

    await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('ready'));

    await act(async () => {
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId('public-key').textContent).toBe(PUBLIC_KEY_A);
    expect(screen.queryByText('Freighter account changed — wallet updated')).not.toBeInTheDocument();
  });

  it('does not treat a disconnect (null) as an account change requiring a toast', async () => {
    mockGetConnectedPublicKey.mockResolvedValue(PUBLIC_KEY_A);

    render(
      <WalletProvider>
        <TestConsumer />
      </WalletProvider>
    );

    await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('ready'));

    mockGetConnectedPublicKey.mockResolvedValue(null);

    await act(async () => {
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId('public-key').textContent).toBe(PUBLIC_KEY_A);
    expect(screen.queryByText('Freighter account changed — wallet updated')).not.toBeInTheDocument();
  });
});

// ─── Ledger failure modes ────────────────────────────────────────────────────

const ledgerKeypair = Keypair.random();

function buildTestXDR(): string {
  const source = new Account(ledgerKeypair.publicKey(), '1');
  return new TransactionBuilder(source, { fee: '100', networkPassphrase: Networks.TESTNET })
    .addOperation(
      Operation.payment({
        destination: PUBLIC_KEY_B,
        asset: Asset.native(),
        amount: '1',
      })
    )
    .setTimeout(30)
    .build()
    .toXDR();
}

function mockHealthyLedger() {
  mockTransportCreate.mockResolvedValue({ close: mockTransportClose });
  mockLedgerGetPublicKey.mockResolvedValue({ rawPublicKey: ledgerKeypair.rawPublicKey() });
  mockLedgerSign.mockImplementation((_path: string, signatureBase: Buffer) =>
    Promise.resolve({ signature: Buffer.from(ledgerKeypair.sign(hash(signatureBase))) })
  );
}

let signPromise: Promise<SignResult> | null = null;

function LedgerConsumer() {
  const { connectWallet, signTransaction, ledgerError, isWalletReady } = useWallet();
  return (
    <div>
      <span data-testid="ready">{isWalletReady ? 'ready' : 'loading'}</span>
      <button onClick={() => connectWallet(ledgerKeypair.publicKey(), 'ledger')}>connect</button>
      <button onClick={() => { signPromise = signTransaction(buildTestXDR()); }}>sign</button>
      <span data-testid="ledger-error">{ledgerError?.code ?? 'none'}</span>
    </div>
  );
}

async function renderConnectedLedger(wrapper?: React.ComponentType<{ children: React.ReactNode }>) {
  mockGetConnectedPublicKey.mockResolvedValue(null);
  const Wrapper = wrapper ?? React.Fragment;
  render(
    <Wrapper>
      <WalletProvider>
        <LedgerConsumer />
      </WalletProvider>
    </Wrapper>
  );
  await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('ready'));
  fireEvent.click(screen.getByText('connect'));
}

async function startSigning() {
  await act(async () => {
    fireEvent.click(screen.getByText('sign'));
  });
}

const TRANSPORT_ERRORS: Array<[string, () => Error, keyof typeof en.ledgerErrors]> = [
  ['device locked (LockedDeviceError)', () => new LockedDeviceError(), 'locked'],
  ['device locked (0x5515 status)', () => new TransportStatusError(0x5515), 'locked'],
  ['Stellar app not open (0x6e00)', () => new TransportStatusError(0x6e00), 'appNotOpen'],
  ['Stellar app not open (0x6511)', () => new TransportStatusError(0x6511), 'appNotOpen'],
  ['rejected on device (0x6985)', () => new TransportStatusError(0x6985), 'rejected'],
  ['USB chooser cancelled', () => new TransportOpenUserCancelled('No device selected.'), 'usbPermissionDenied'],
  ['USB interface claimed elsewhere', () => new TransportInterfaceNotAvailable('Unable to claim interface.'), 'usbPermissionDenied'],
  ['WebUSB permission denied', () => Object.assign(new Error('Access denied.'), { name: 'NotAllowedError' }), 'usbPermissionDenied'],
  ['listen timeout', () => new TransportError('No Ledger device found (timeout)', 'ListenTimeout'), 'timeout'],
  ['no device found', () => new TransportError('No device found', 'NoDeviceFound'), 'deviceNotFound'],
  ['device unplugged', () => new DisconnectedDevice(), 'deviceNotFound'],
];

describe('classifyLedgerError', () => {
  it.each(TRANSPORT_ERRORS)('maps %s to its own error code', (_label, makeError, code) => {
    expect(classifyLedgerError(makeError())).toBe(code);
  });

  it('falls back to "unknown" for unrecognised errors, which are not retryable', () => {
    const code = classifyLedgerError(new Error('something exploded'));
    expect(code).toBe('unknown');
    expect(isRecoverableLedgerError(code)).toBe(false);
  });

  it('gives every error code a message and recovery step in each shipped locale', () => {
    for (const catalog of [en, es]) {
      for (const code of ['deviceNotFound', 'locked', 'appNotOpen', 'rejected', 'usbPermissionDenied', 'timeout', 'unknown'] as const) {
        expect(catalog.ledgerErrors[code].message).toBeTruthy();
        expect(catalog.ledgerErrors[code].recovery).toBeTruthy();
      }
    }
  });
});

describe('WalletProvider Ledger signing errors', () => {
  beforeEach(() => {
    signPromise = null;
    mockTransportCreate.mockReset();
    mockTransportClose.mockReset();
    mockLedgerGetPublicKey.mockReset();
    mockLedgerSign.mockReset();
    try {
      window.localStorage.clear();
    } catch {
      // ignore
    }
  });

  it.each(TRANSPORT_ERRORS)(
    'shows a specific translated message and recovery step for: %s',
    async (_label, makeError, code) => {
      await renderConnectedLedger();
      mockTransportCreate.mockRejectedValueOnce(makeError());

      await startSigning();

      await waitFor(() => expect(screen.getByTestId('ledger-error').textContent).toBe(code));
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(en.ledgerErrors[code].message);
      expect(alert).toHaveTextContent(en.ledgerErrors[code].recovery);
      expect(screen.getByRole('button', { name: en.common.retry })).toBeInTheDocument();
    }
  );

  it('retries after the user unlocks the device and resolves with a signed envelope', async () => {
    await renderConnectedLedger();
    mockTransportCreate.mockRejectedValueOnce(new LockedDeviceError());

    await startSigning();
    await waitFor(() => expect(screen.getByTestId('ledger-error').textContent).toBe('locked'));

    mockHealthyLedger();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: en.common.retry }));
    });

    const result = await signPromise!;
    expect(result.error).toBeNull();
    const signed = TransactionBuilder.fromXDR(result.signedXDR!, Networks.TESTNET);
    expect(signed.signatures).toHaveLength(1);
    expect(screen.getByTestId('ledger-error').textContent).toBe('none');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps offering retry while the error persists, then recovers once the Stellar app is opened', async () => {
    await renderConnectedLedger();
    mockTransportCreate.mockRejectedValueOnce(new LockedDeviceError());

    await startSigning();
    await waitFor(() => expect(screen.getByTestId('ledger-error').textContent).toBe('locked'));

    // Unlocked, but the Stellar app is still closed.
    mockTransportCreate.mockResolvedValueOnce({ close: mockTransportClose });
    mockLedgerGetPublicKey.mockRejectedValueOnce(new TransportStatusError(0x6e00));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: en.common.retry }));
    });
    await waitFor(() => expect(screen.getByTestId('ledger-error').textContent).toBe('appNotOpen'));
    expect(screen.getByRole('alert')).toHaveTextContent(en.ledgerErrors.appNotOpen.recovery);

    mockHealthyLedger();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: en.common.retry }));
    });

    const result = await signPromise!;
    expect(result.signedXDR).toBeTruthy();
    expect(mockTransportClose).toHaveBeenCalled();
  });

  it('resolves with the translated error when the user cancels instead of retrying', async () => {
    await renderConnectedLedger();
    mockTransportCreate.mockRejectedValueOnce(new TransportStatusError(0x6985));

    await startSigning();
    await waitFor(() => expect(screen.getByTestId('ledger-error').textContent).toBe('rejected'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: en.common.cancel }));
    });

    const result = await signPromise!;
    expect(result).toMatchObject({
      signedXDR: null,
      errorCode: 'rejected',
      error: en.ledgerErrors.rejected.message,
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('returns unknown errors immediately without a retry prompt', async () => {
    await renderConnectedLedger();
    mockTransportCreate.mockRejectedValueOnce(new Error('something exploded'));

    await startSigning();

    const result = await signPromise!;
    expect(result.errorCode).toBe('unknown');
    expect(result.error).toBe('Ledger error: something exploded');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders the message in the active locale', async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'es');
    await renderConnectedLedger(I18nProvider);
    mockTransportCreate.mockRejectedValueOnce(new TransportStatusError(0x6e00));

    await startSigning();

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(es.ledgerErrors.appNotOpen.message)
    );
    expect(screen.getByRole('alert')).toHaveTextContent(es.ledgerErrors.appNotOpen.recovery);
    expect(screen.getByRole('button', { name: es.common.retry })).toBeInTheDocument();
  });

  it('does not let Freighter account polling overwrite a connected Ledger account', async () => {
    mockGetConnectedPublicKey.mockResolvedValue(null);

    function KeyConsumer() {
      const { publicKey, connectWallet, isWalletReady } = useWallet();
      return (
        <div>
          <span data-testid="ready">{isWalletReady ? 'ready' : 'loading'}</span>
          <button onClick={() => connectWallet(ledgerKeypair.publicKey(), 'ledger')}>connect</button>
          <span data-testid="public-key">{publicKey ?? 'none'}</span>
        </div>
      );
    }

    render(
      <WalletProvider>
        <KeyConsumer />
      </WalletProvider>
    );
    await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('ready'));
    fireEvent.click(screen.getByText('connect'));

    mockGetConnectedPublicKey.mockResolvedValue(PUBLIC_KEY_A);
    await act(async () => {
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId('public-key').textContent).toBe(ledgerKeypair.publicKey());
    expect(screen.queryByText('Freighter account changed — wallet updated')).not.toBeInTheDocument();
  });
});
