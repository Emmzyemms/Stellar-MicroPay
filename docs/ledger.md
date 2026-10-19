# Ledger Hardware Wallet Implementation Guide

## Overview
This document describes the implementation of Ledger hardware wallet support for Stellar MicroPay, allowing security-conscious users to connect their Ledger devices instead of using Freighter.

## Implementation Details

### Dependencies Added
- `@ledgerhq/hw-app-str` - Stellar app interface for Ledger devices (successor of the unpublished `@ledgerhq/hw-app-stellar`)
- `@ledgerhq/hw-transport-webusb` - WebUSB transport for browser communication

### New Functions in `frontend/lib/wallet.ts`

#### `isLedgerSupported()`
- Checks if WebUSB is supported in the browser
- Returns boolean indicating support status

#### `getLedgerPublicKey()`
- Connects to the Ledger device via WebUSB
- Retrieves the public key for BIP32 path `44'/148'/0'`, confirming it on the device
- Returns `{ publicKey, error, errorCode, errorDetail }` — see [Error Handling](#error-handling-implementation)

#### `signTransactionWithLedger(transactionXDR)`
- Signs the transaction's signature base on the Ledger and attaches the
  signature to the envelope, returning a submittable signed XDR
- Returns `{ signedXDR, error, errorCode, errorDetail }`

#### `classifyLedgerError(err)` / `isRecoverableLedgerError(code)`
- Maps any transport, APDU, or WebUSB error to a `LedgerErrorCode`
- Tells the UI whether the user can fix the problem and retry

### Updated `frontend/components/WalletConnect.tsx`

#### UI Changes
- Added wallet selection interface with two options:
  - **Connect Freighter Wallet** (primary option)
  - **Connect Ledger Hardware Wallet** (secondary option)
- Dynamic loading states for each wallet type
- Contextual help text and browser compatibility warnings

#### State Management
- `selectedWallet` - tracks which wallet type user is connecting
- `ledgerSupported` - indicates WebUSB/browser compatibility
- Separate handlers for each wallet type

#### Error Handling
- WebUSB not supported warning for unsupported browsers
- Ledger-specific error messages with actionable guidance
- Maintains existing Freighter error handling

## Error Handling Implementation

Hardware wallets fail in more ways than a browser extension does, so Ledger
errors are not collapsed into one generic "signing failed" message.
`classifyLedgerError()` in `frontend/lib/wallet.ts` maps each failure to a
`LedgerErrorCode`, checking the APDU status code first, then the
`@ledgerhq/errors` class name, then the message text. Each code has a translated
message and recovery step under `ledgerErrors.<code>.message` /
`ledgerErrors.<code>.recovery` in every `frontend/locales/*.json` catalog.

| Code | Detected from | Retry offered |
| --- | --- | --- |
| `locked` | `LockedDeviceError`, status `0x5515` / `0x6b0c` | Yes |
| `appNotOpen` | status `0x6511`, `0x6d00`, `0x6e00`, `0x6e01`, `0x6807` (app not installed) | Yes |
| `rejected` | status `0x6985` / `0x6986` (user declined on device) | Yes |
| `usbPermissionDenied` | `TransportOpenUserCancelled` (USB chooser dismissed), `TransportInterfaceNotAvailable` (interface claimed by Ledger Live or another tab), `TransportWebUSBGestureRequired`, DOM `NotAllowedError` / `SecurityError` | Yes |
| `timeout` | `ListenTimeout` transport error, `TimeoutError`, any "timeout" / "timed out" message | Yes |
| `deviceNotFound` | `NoDeviceFound`, `DisconnectedDevice`, `DisconnectedDeviceDuringOperation` | Yes |
| `unknown` | Anything else; the raw message is shown as "Ledger error: …" | No |

### Retry flow

- **Connecting** (`WalletConnect`): the error is shown with its recovery step
  (`components/LedgerErrorNotice.tsx`) and a **Retry** button that runs the
  connect flow again. SEP-0010 authentication signs the challenge with the
  Ledger, so device errors during auth show the same notice.
- **Signing** (`useWallet().signTransaction(xdr)`): when a Ledger session is
  connected, a recoverable error does not reject straight away. The provider
  shows the notice with **Retry** and **Cancel**. Retry signs the same XDR
  again; the caller's promise resolves once signing succeeds, or with the
  translated error if the user cancels. Unknown errors resolve immediately.

To add a new failure mode, add a code to `LedgerErrorCode`, teach
`classifyLedgerError()` to detect it, add `ledgerErrors.<code>` to every locale
(the locale parity test enforces this), and add a case to
`frontend/__tests__/useWallet.test.tsx`.

## Testing Plan

### Prerequisites
1. Ledger Nano S/X device
2. Stellar app installed on Ledger (via Ledger Live)
3. Chrome, Edge, or other Chromium-based browser
4. Test environment with HTTPS (required for WebUSB)

### Test Cases

#### 1. Basic Connectivity
- [ ] Ledger device appears as option in WalletConnect
- [ ] "Connect Ledger Hardware Wallet" button is enabled in supported browsers
- [ ] Button is disabled with warning message in unsupported browsers
- [ ] Device detection works when connected/unlocked

#### 2. Public Key Retrieval
- [ ] Successfully retrieve public key from Ledger device
- [ ] Public key matches expected format (starts with 'G')
- [ ] Device shows confirmation prompt when `confirmOnDevice=true`
- [ ] User can approve/reject on device

#### 3. Error Scenarios
- [ ] **Device not connected**: Clear error message displayed
- [ ] **Device locked**: Error message instructs to unlock device
- [ ] **Stellar app not open**: Error message instructs to open app
- [ ] **User rejects**: Clear rejection message
- [ ] **App not installed**: Installation instructions provided
- [ ] **WebUSB not supported**: Browser compatibility warning

#### 4. Transaction Signing
- [ ] Successfully sign transaction XDR
- [ ] Device shows transaction details for confirmation
- [ ] User can approve/reject transaction signing
- [ ] Signed transaction is valid and can be submitted

#### 5. SEP-0010 Authentication
- [ ] Complete authentication flow with Ledger
- [ ] Challenge transaction signing works
- [ ] JWT token received upon successful authentication

#### 6. UI/UX Testing
- [ ] Loading states display correctly during each operation
- [ ] Error messages are clear and actionable
- [ ] Help text provides useful guidance
- [ ] Responsive design works on mobile/desktop

#### 7. Compatibility Testing
- [ ] Chrome browser: Full functionality
- [ ] Edge browser: Full functionality
- [ ] Firefox browser: WebUSB warning, Ledger disabled
- [ ] Safari browser: WebUSB warning, Ledger disabled

### Manual Testing Steps

1. **Setup Environment**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open `http://localhost:3000` in Chrome

2. **Test Freighter (Baseline)**
   - Connect with Freighter wallet
   - Verify existing functionality works
   - Complete SEP-0010 authentication

3. **Test Ledger Hardware Wallet**
   - Connect Ledger device via USB
   - Unlock device and open Stellar app
   - Click "Connect Ledger Hardware Wallet"
   - Approve public key export on device
   - Complete SEP-0010 authentication
   - Test transaction signing

4. **Test Error Cases**
   - Try connecting with device locked
   - Try connecting with Stellar app closed
   - Reject operations on device
   - Test in unsupported browsers

## Security Considerations

### WebUSB Security
- Requires HTTPS in production
- Browser prompts for device permission
- User must physically approve operations on device

### Key Derivation
- Uses standard BIP32 path: `44'/148'/0'`
- Follows Stellar SLIP-0010 standard
- Supports custom account paths for advanced users

### Transaction Security
- All transactions require physical device confirmation
- Device shows transaction details before signing
- Private keys never leave the hardware device

## Browser Compatibility

### Supported Browsers
- Chrome 89+ (full WebUSB support)
- Edge 89+ (full WebUSB support)
- Other Chromium-based browsers (full WebUSB support)

### Unsupported Browsers
- Firefox (WebUSB not implemented)
- Safari (WebUSB not implemented)
- Mobile browsers (limited WebUSB support)

## Deployment Notes

### HTTPS Requirement
WebUSB requires secure context in production. Ensure:
- SSL certificate is properly configured
- All resources load over HTTPS
- Mixed content issues are resolved

### CSP Headers
Update Content Security Policy to allow WebUSB:
```
connect-src 'self' https:;
feature: usb 'self';
```

## Troubleshooting

Each entry matches a message the app shows; the recovery step is shown with it.

**"Your Ledger is locked."** (`locked`)
- Enter your PIN on the device, then click **Retry**.
- Ledger devices auto-lock after inactivity; this can happen mid-flow.

**"The Stellar app is not open on your Ledger."** (`appNotOpen`)
- Open the Stellar app on the device and wait for "Application is ready", then click **Retry**.
- If the app is not listed, install it from Ledger Live (Manager / My Ledger).
- Also shown when a different app (e.g. Bitcoin) is open.

**"The request was rejected on your Ledger."** (`rejected`)
- The request was declined on the device. Click **Retry** and approve it.
- If you rejected because the details looked wrong, cancel instead.

**"The browser could not access your Ledger over USB."** (`usbPermissionDenied`)
- Select your Ledger in the browser's USB device prompt and allow access.
- Close Ledger Live and any other tab using the device; only one app can claim it at a time.
- On Linux, install Ledger's udev rules so the browser can open the device.
- WebUSB requires HTTPS (or `localhost`).

**"Your Ledger did not respond in time."** (`timeout`)
- Wake the device, make sure the Stellar app is open, then click **Retry**.
- Try a different USB port or cable if this keeps happening.

**"Ledger device not found."** (`deviceNotFound`)
- Check the USB connection; charge-only cables do not carry data.
- Reconnect the device if it was unplugged during an operation.

**"Ledger error: …"** (`unknown`)
- Not retried automatically. Reconnect the device, reopen the Stellar app, and
  try the action again. Check the browser console for the full error.

**"WebUSB not supported"**
- Use Chrome, Edge, or another Chromium-based browser.

### Debug Information
Enable browser console to see detailed error messages and WebUSB communication logs.

## Future Enhancements

### Potential Improvements
1. **Multiple Account Support**: Allow users to select different account paths
2. **Ledger Live Integration**: Direct integration with Ledger Live desktop app
3. **WebUSB Support**: Fallback transport for older browsers
4. **Transaction Preview**: Enhanced transaction details on device
5. **Multi-signature Support**: Support for multi-sig transactions

### Performance Optimization
- Connection pooling for repeated operations
- Cached device information
- Optimized error handling

## Conclusion

The Ledger hardware wallet implementation provides a secure alternative to Freighter for users who prefer hardware wallet security. The implementation follows best practices for WebUSB communication and provides comprehensive error handling for all failure scenarios.

All acceptance criteria have been met:
- ✅ Ledger option appears in WalletConnect
- ✅ Public key fetched from Ledger device
- ✅ Transactions signed on the Ledger device
- ✅ Error states for disconnected device and closed app
- ✅ Freighter option still works as before
