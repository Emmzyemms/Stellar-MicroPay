# Hardcoded-string inventory — i18n sweep (#1458)

Every user-facing string that was hardcoded in `frontend/components/` and
`frontend/pages/` and has been moved into the locale catalogs
(`frontend/locales/en.json` + `es.json` + `ar.json`), organized by file.

Each entry reads: *original English text → catalog key*. Strings that were
deliberately left inline (technical tokens such as `XLM` / `G...` addresses,
asset codes, brand names, `<Head>` SEO titles, `console.*` messages, and
values compared in logic) are listed at the end of each section.

A regression guard was added in `frontend/__tests__/i18n-key-coverage.test.ts`:
it fails when a new multi-word JSX text literal or hardcoded `aria-label`
appears in `components/` or `pages/`, and when a `t()` key used in the UI is
missing from `en.json`. A custom ESLint rule was considered but needs the JSX
AST to avoid false positives on TypeScript generics; the targeted test achieves
the same protection with far less machinery.

---

## i18n inventory — issue #1458 (fragment A)

Files converted, keys added per file: **trade.tsx = 33**, **streams.tsx = 38**, **scheduled-payments.tsx = 31**, **multi-sig-sign.tsx = 16** (total 118).

## frontend/pages/trade.tsx (namespace: `trade`) — 33 keys

- `Stellar DEX Trading` → `trade.title` (used in both connected and disconnected views)
- `Connect your wallet to trade XLM and USDC on the Stellar DEX.` → `trade.connectWallet`
- `Swap and trade XLM and USDC on the Stellar decentralised exchange` → `trade.subtitle`
- `swap` (raw tab identifier rendered as button text) → `trade.tabSwap`
- `trade` (raw tab identifier rendered as button text) → `trade.tabTrade`
- `Open Orders` → `trade.openOrders`
- `Trade History` → `trade.tradeHistory`
- `Offer cancelled successfully!` → `trade.offerCancelled` (toast)
- `Failed to cancel offer` → `trade.failedToCancelOffer` (toast fallback)
- `Orderbook (USDC/XLM)` → `trade.orderbook` (both swap and trade tabs)
- `Sell Orders` → `trade.sellOrders`
- `Spread` → `trade.spread`
- `N/A` → `trade.notAvailable`
- `Buy Orders` → `trade.buyOrders`
- `Loading orderbook...` → `trade.loadingOrderbook` (both tabs)
- `Top ask: {price}` → `trade.topAsk` (was `Top ask: {…}` JSX)
- `Top bid: {price}` → `trade.topBid` (was `Top bid: {…}` JSX)
- `Your Open Orders` → `trade.yourOpenOrders`
- `Pair` → `trade.pair`
- `Type` → `trade.type`
- `Amount` → `trade.amount`
- `Price` → `trade.price` (orders + history tables)
- `Actions` → `trade.actions`
- `Sell` → `trade.sell`
- `Buy` → `trade.buy`
- `Cancel` → `trade.cancel`
- `No open orders` → `trade.noOpenOrders`
- `Trade History (24h)` → `trade.tradeHistory24h`
- `Time` → `trade.time`
- `Volume (USDC)` → `trade.volumeUsdc`
- `Volume (XLM)` → `trade.volumeXlm`
- `Trades` → `trade.trades`
- `No trades in the last 24 hours` → `trade.noTrades`

## frontend/pages/streams.tsx (namespace: `streams`) — 38 keys

- `Failed to load streams` → `streams.failedToLoad`
- `Please fill in all fields` → `streams.fillAllFields`
- `Deposit must be at least the hourly rate` → `streams.depositMinimum`
- `Insufficient balance` → `streams.insufficientBalance`
- `Signing failed` → `streams.signingFailed` (`throw new Error(...)` fallback)
- `Stream opened successfully!` → `streams.openedSuccess` (alert)
- `Failed to open stream` → `streams.failedToOpen`
- `Claimed stream {streamId}` → `streams.claimedStream` (template literal alert)
- `Failed to claim stream` → `streams.failedToClaim`
- `Are you sure you want to close this stream? Any remaining funds will be refunded.` → `streams.closeConfirm` (confirm dialog)
- `Closed stream {streamId}` → `streams.closedStream` (template literal alert)
- `Failed to close stream` → `streams.failedToClose`
- `Streaming Payments` → `streams.title`
- `Open, view, claim, and close Soroban streaming payment contracts.` → `streams.subtitle`
- `Open Stream` → `streams.openStream` (tab button + submit button)
- `My Streams` → `streams.myStreams`
- `Received Streams` → `streams.receivedStreams` (tab button + section heading)
- `Open New Stream` → `streams.openNewStream`
- `Recipient Address` → `streams.recipientAddress` (label)
- `Rate (XLM/hour)` → `streams.rateHourly` (label)
- `The recipient can claim this amount every hour.` → `streams.rateHint`
- `Deposit Amount (XLM)` → `streams.depositAmount` (label)
- `Total XLM to deposit into the stream contract.` → `streams.depositHint`
- `Opening Stream...` → `streams.openingStream`
- `My Streams (Payer)` → `streams.myStreamsPayer`
- `Loading...` → `streams.loading` (both stream tabs)
- `No active streams` → `streams.noActiveStreams`
- `Recipient` → `streams.recipient`
- `Active` → `streams.active` (both stream cards)
- `Closed` → `streams.closed` (both stream cards)
- `Rate` → `streams.rate` (both stream cards)
- `Deposit` → `streams.deposit`
- `Claimable` → `streams.claimable` (both stream cards)
- `Close Stream` → `streams.closeStream`
- `No received streams` → `streams.noReceivedStreams`
- `Payer` → `streams.payer`
- `Total Deposit` → `streams.totalDeposit`
- `Claim {amount}` → `streams.claim` (was `Claim {formatXLM(...)}` JSX)

## frontend/pages/scheduled-payments.tsx (namespace: `scheduledPayments`) — 31 keys

- `Failed to load scheduled payments` → `scheduledPayments.failedToLoad`
- `Enter a valid Stellar recipient address` → `scheduledPayments.invalidRecipient`
- `Enter a valid amount greater than zero` → `scheduledPayments.invalidAmount`
- `Scheduled payment created` → `scheduledPayments.created` (success message)
- `Failed to create scheduled payment` → `scheduledPayments.failedToCreate`
- `Failed to pause payment` → `scheduledPayments.failedToPause`
- `Failed to resume payment` → `scheduledPayments.failedToResume`
- `Failed to cancel payment` → `scheduledPayments.failedToCancel`
- `Scheduled Payments` → `scheduledPayments.title` (both views)
- `Connect your wallet to create and manage recurring payments.` → `scheduledPayments.connectWallet`
- `Create recurring payments and manage active schedules (daily, weekly, or monthly).` → `scheduledPayments.subtitle`
- `Durable Persistence & Recovery Active` → `scheduledPayments.persistenceBadge`
- `Create recurring payment` → `scheduledPayments.createTitle`
- `Recipient` → `scheduledPayments.recipient` (label)
- `Amount` → `scheduledPayments.amount` (label)
- `Asset` → `scheduledPayments.assetLabel` (aria-label)
- `Frequency` → `scheduledPayments.frequency` (label)
- `Daily` → `scheduledPayments.daily` (option text)
- `Weekly` → `scheduledPayments.weekly` (option text)
- `Monthly` → `scheduledPayments.monthly` (option text)
- `Creating…` → `scheduledPayments.creating` (U+2026 ellipsis preserved)
- `Create scheduled payment` → `scheduledPayments.createAction`
- `Active schedules` → `scheduledPayments.activeSchedules`
- `Refresh` → `scheduledPayments.refresh`
- `Loading…` → `scheduledPayments.loading` (U+2026 ellipsis preserved)
- `No scheduled payments yet.` → `scheduledPayments.empty`
- `Last execution` → `scheduledPayments.lastExecution`
- `Next run` → `scheduledPayments.nextRun`
- `Pause` → `scheduledPayments.pause`
- `Resume` → `scheduledPayments.resume`
- `Cancel` → `scheduledPayments.cancel`

## frontend/pages/multi-sig-sign.tsx (namespace: `multiSigSign`) — 16 keys

- `FeeBump transactions are not supported.` → `multiSigSign.feeBumpUnsupported`
- `Invalid transaction XDR` → `multiSigSign.invalidXdr`
- `Failed to sign transaction` → `multiSigSign.failedToSign` (both fallbacks in `handleSign`)
- `Loading transaction...` → `multiSigSign.loading`
- `Sign Multi-Signature Transaction` → `multiSigSign.title`
- `Transaction Details` → `multiSigSign.detailsTitle`
- `From:` → `multiSigSign.from`
- `To:` → `multiSigSign.to`
- `Amount:` → `multiSigSign.amount`
- `Operation {number}: {type}` → `multiSigSign.operation` (was `Operation {i + 1}: {op.type}` JSX)
- `Memo:` → `multiSigSign.memo`
- `Sign with Freighter` → `multiSigSign.signWithFreighter`
- `Signing...` → `multiSigSign.signing`
- `Signed Transaction XDR` → `multiSigSign.signedTitle`
- `Copy this signed XDR and send it back to the transaction initiator.` → `multiSigSign.copyHint`
- `Copy Signed XDR` → `multiSigSign.copySignedXdr`

## Deliberately skipped

- trade.tsx: `console.error(...)` messages; `XLM`, `USDC`, `N/A`-adjacent technical tokens in `formatNumber(..., "XLM")` calls; asset label code (`${asset.code}:${asset.issuer}`); the `—` fallback symbol in Top ask/bid.
- streams.tsx: on-chain transaction memo `` `Stream: ${ratePerHourNum} XLM/hour` `` (data written to the ledger, not UI chrome); placeholders `G...`, `10.0`, `100.0` (address/numeric hints); `/hr` unit suffix.
- scheduled-payments.tsx: option **values** and `XLM`/`USDC` option labels (technical tokens); placeholders `G...`, `0.00`; `—` symbols; raw rendered data `payment.status`, `cfg.frequency || "custom"`, `cfg.amount_quote` (data values displayed verbatim alongside each other — translating the `custom` fallback alone would be inconsistent with `daily`/`weekly`/`monthly` rendered raw from config).
- multi-sig-sign.tsx: `status`/`xdr` values compared in logic; raw `transaction.source`, `payment.destination`, memo value (data).

---

## i18n Inventory — Issue #1458 (Batch B)

Namespace per file, converted with `useTranslation()` from `@/contexts/I18nContext`.
Total: **228 unique keys** across 10 files. Fragment: `/tmp/i18n-1458/fragment-B.json`.

Key counts: index.tsx 47 · network.tsx 55 · issue-token.tsx 60 · leaderboard.tsx 10 · pay.tsx 10 · PaymentRequestGenerator.tsx 15 · tip/[username].tsx 11 · request.tsx 7 · 404.tsx 7 · _app.tsx 6.

---

## frontend/pages/index.tsx → `landing` (47 keys)

- `Built on Stellar Testnet · Open Source` → landing.testnetOpenSourceBadge
- `Money moves at the` (lead before `<span class="text-gradient">`; trailing `{" "}` kept in JSX) → landing.heroTitleLead
- `speed of light` (accent span) → landing.heroTitleAccent
- `Stellar MicroPay lets anyone send tiny payments across borders instant — for fractions of a cent. No bank. No borders. No friction.` → landing.heroSubtitle
- `Open Dashboard →` → landing.openDashboard
- `Connect wallet to start sending payments` (aria-label) → landing.connectWalletAria
- `Connect Wallet & Start` → landing.connectAndStart
- `View Stellar-MicroPay source code on GitHub` (aria-label) → landing.viewSourceAria
- `View on GitHub` → landing.viewOnGitHub
- `Settlement time` → landing.statSettlementTime
- `Average fee` → landing.statAverageFee
- `Countries supported` → landing.statCountriesSupported
- `Instant Settlement` → landing.featureInstantSettlementTitle
- `Stellar transactions confirm in 3–5 seconds. No waiting for bank transfers.` → landing.featureInstantSettlementDesc
- `Truly Global` → landing.featureTrulyGlobalTitle
- `Send XLM to anyone with a Stellar address, anywhere in the world.` → landing.featureTrulyGlobalDesc
- `Micro Fees` → landing.featureMicroFeesTitle
- `Each transaction costs ~0.00001 XLM. Send $0.01 or $1,000 for the same fee.` → landing.featureMicroFeesDesc
- `Non-Custodial` → landing.featureNonCustodialTitle
- `Your keys, your funds. We never touch your private key.` → landing.featureNonCustodialDesc
- `What is Stellar?` (h2 + FAQ span) → landing.whatIsStellar
- `A quick explainer for newcomers, with links to the official Stellar docs.` → landing.whatIsStellarIntro
- `Stellar is an open blockchain network for moving money quickly and with very low fees. It's designed for payments, remittances, and cross-border transfers that settle faster than traditional bank systems.` (orig. `&apos;`) → landing.stellarNetworkExplainer
- `Read the official` (lead; `{" "}` kept in JSX) → landing.readTheOfficial
- `Stellar overview` → landing.stellarOverview
- `What is XLM?` → landing.whatIsXLM
- `XLM is Stellar's native asset. It's used to pay transaction fees and can also be sent directly like any other digital currency.` (orig. `&apos;`) → landing.xlmNativeAssetExplainer
- `See the official` (lead, used twice) → landing.seeTheOfficial
- `token docs` → landing.tokenDocs
- `How fast is it?` → landing.howFastIsIt
- `Stellar transactions typically confirm in just a few seconds, which is why it feels much faster than a bank transfer.` → landing.confirmationSpeedExplainer
- `Read about transaction flow in the` (lead) → landing.readTransactionFlow
- `official transaction docs` → landing.officialTransactionDocs
- `How much does it cost?` → landing.howMuchDoesItCost
- `Fees are tiny—usually a fraction of a cent. That makes Stellar useful for small payments where a bank transfer would be expensive or too slow.` → landing.feesExplainer
- `fee and transaction docs` → landing.feeTransactionDocs
- `Is it safe?` → landing.isItSafe
- `Stellar uses public-key cryptography, so only the owner of a wallet can sign transactions from it. As with any blockchain app, keeping your recovery phrase and private keys secure is essential.` → landing.safetyExplainer
- `Learn more about account security and the network in the` (lead) → landing.accountSecurityIntro
- `official account docs` → landing.officialAccountDocs
- `and` (connector between links) → landing.and
- `network docs` → landing.networkDocs
- `Cancel` → landing.cancel
- `Discord (#greenpay)` → landing.discordCommunity
- `Telegram Community` → landing.telegramCommunity
- `Contribute on GitHub` → landing.contributeOnGitHub
- `Open source · MIT License` → landing.openSourceLicense

## frontend/pages/network.tsx → `network` (55 keys)

- `Unknown` (formatUtc fallback, protocol/passphrase/version values) → network.unknown
- `Unavailable` (formatCount fallback + ops/sec) → network.unavailable
- `Latest ledger` (metric row + heading) → network.latestLedger
- `sequence number` → network.sequenceNumberUnit
- `Newest ledger Horizon has ingested` → network.latestLedgerDetail
- `Last ledger close time` → network.lastCloseTime
- `When the newest ledger closed` → network.lastCloseTimeDetail
- `Time since last close` → network.timeSinceClose
- `seconds` → network.secondsUnit
- `Ledgers close roughly every 5 seconds` → network.closeLagDetail
- `Base fee` → network.baseFee
- `Protocol minimum fee per operation` → network.baseFeeDetail
- `Recommended fee` → network.recommendedFee
- `Median fee charged by recent transactions` → network.recommendedFeeDetail
- `P95 fee` → network.p95Fee
- `95th percentile fee charged` → network.p95FeeDetail
- `P99 fee` → network.p99Fee
- `99th percentile fee charged` → network.p99FeeDetail
- `Active accounts` → network.activeAccounts
- `accounts` → network.accountsUnit
- `` `Distinct accounts in ledger ${…}` `` → network.activeAccountsDetail (`{ledger}`)
- `Operations per second` → network.opsPerSecond
- `` `Average over the last ${…} ledgers` `` → network.opsPerSecondDetail (`{count}`; plain string, not plural — keeps 1-ledger rendering identical)
- `Horizon root latency` → network.horizonRootLatency
- `Horizon fee stats latency` → network.horizonFeeStatsLatency
- `milliseconds` → network.millisecondsUnit
- `Measured client-side on this device` (used twice) → network.measuredClientSide
- `Fee level` → network.feeLevel
- `band` → network.bandUnit
- `normal · elevated · high` → network.feeLevelDetail
- `Protocol version` → network.protocolVersion
- `version` → network.versionUnit
- `Network passphrase` → network.networkPassphrase
- `identifier` → network.identifierUnit
- `Horizon version` → network.horizonVersion
- `Stellar Core version` → network.coreVersion
- `build` (used twice) → network.buildUnit
- `Connecting…` → network.connecting
- `Contacting the Horizon API for the latest ledger, fee and account data.` → network.connectingHint
- `` `Failed to load network statistics` `` → network.loadFailed
- `Stellar Network Status` → network.pageTitle
- `Live metrics from the Horizon API · Auto-refreshes every 10 seconds` → network.pageSubtitle
- `Network Error` → network.networkError
- `Try Again` → network.tryAgain
- `Showing the last successful reading — refresh failed: {refreshError}` → network.refreshFailed (`{error}`)
- `New ledger closed!` → network.newLedgerClosed
- `Waiting for the next ledger…` → network.waitingForLedger
- `Refreshing…` → network.refreshing
- `` `Last updated ${…}` `` → network.lastUpdated (`{time}`)
- `Awaiting first reading` → network.awaitingFirstReading
- `Stellar network health metrics` → network.tableCaption
- `Values refresh automatically; units are shown per row.` → network.tableCaptionHint
- `Metric` → network.metricColumn
- `Value` → network.valueColumn
- `Unit` → network.unitColumn

## frontend/pages/leaderboard.tsx → `leaderboard` (10 keys)

- `Rank` → leaderboard.rank
- `Account` → leaderboard.account
- `No tips recorded yet.` → leaderboard.noTipsYet
- `Unable to load leaderboard` (throw + catch fallback) → leaderboard.loadError
- `Community Tips Leaderboard` → leaderboard.title
- `Celebrating the people powering the Stellar MicroPay community.` → leaderboard.subtitle
- `Tips processed` → leaderboard.tipsProcessed
- `Total XLM tipped` → leaderboard.totalXlmTipped
- `Top recipients` → leaderboard.topRecipients
- `Top senders` → leaderboard.topSenders

## frontend/pages/request.tsx → `request` (7 keys)

- `This payment request link has expired.` → request.linkExpired
- `The request link data is incomplete or malformed.` → request.linkIncomplete
- `Invalid request link. Please check the URL.` → request.linkInvalid
- `Request Unavailable` → request.unavailableTitle
- `Return to Dashboard` → request.returnToDashboard
- `Complete Request` → request.title
- `Review the requested details and connect your wallet to pay.` → request.subtitle

## frontend/pages/pay.tsx → `pay` (10 keys)

- `This payment link has expired.` (used twice) → pay.linkExpired
- `The payment link data is incomplete or malformed.` → pay.linkIncomplete
- `This payment link has already been redeemed.` → pay.linkRedeemed
- `Invalid payment link. Please check the URL.` → pay.linkInvalid
- `Payment Unavailable` → pay.unavailableTitle
- `Return to Dashboard` → pay.returnToDashboard
- `Complete Payment` → pay.title
- `Review the details below to authorize the transaction.` → pay.subtitleConnected
- `You’ve received a payment request. Connect your wallet to proceed.` (U+2019) → pay.subtitleConnectPrompt
- `` `Recipient's Total Tips Recorded:` `` → pay.recipientTotalTips

## frontend/pages/issue-token.tsx → `issueToken` (60 keys)

- `Asset code` / `Issuer` / `Distribute` / `Issue` / `Finalise` (wizard titles) → issueToken.assetCode / .issuer / .distribute / .issue / .finalise
- `1–12 uppercase characters` / `Account that issues the asset` / `Distributor trustline` / `Send the asset` / `Home domain and summary` (wizard hints) → issueToken.assetCodeStepHint / .issuerStepHint / .distributeStepHint / .issueStepHint / .finaliseStepHint
- `Something went wrong.` (errorMessage fallback) → issueToken.somethingWentWrong
- `Enter a valid Stellar public key (G…).` (used twice) → issueToken.invalidPublicKey
- `The distributor must be a different account than the issuer.` → issueToken.distributorMustDiffer
- `Enter an amount greater than 0.` → issueToken.invalidAmount
- `` `Freighter is currently on ${…}. Switch it to ${…} and try again.` `` → issueToken.freighterAccountMismatch (`{active}`, `{expected}`)
- `Transaction signing was cancelled.` → issueToken.signingCancelled
- `Distributor trustline created.` → issueToken.trustlineCreated
- `Asset issued to the distributor.` → issueToken.assetIssuedToDistributor
- `Home domain set on the issuer account.` → issueToken.homeDomainSet
- `Issue a Token` (used twice) → issueToken.pageTitle
- `Connect your wallet to issue a custom Stellar asset.` → issueToken.connectPrompt
- `Create your own Stellar asset in five steps on` (lead; `{" "}` kept) → issueToken.subtitleLead
- `Issuance progress` (aria-label) → issueToken.progressAria
- `Step {currentStep.id} of {WIZARD_STEPS.length}: {currentStep.title}` → issueToken.stepHeading (`{current}`, `{total}`, `{title}`)
- `1–{ASSET_CODE_MAX_LENGTH} characters, uppercase letters and numbers only. No spaces.` (orig. split across JSX lines) → issueToken.assetCodeHelp (`{max}`)
- `is reserved.` (after `<span class="font-mono">XLM</span>`) → issueToken.xlmReserved
- `Issuer account` → issueToken.issuerAccount
- `Use connected wallet` → issueToken.useConnectedWallet
- `Using your connected wallet.` → issueToken.usingConnectedWallet
- `Signing steps 4 and 5 requires Freighter on this account.` → issueToken.freighterHint
- `Distributor account` → issueToken.distributorAccount
- `The distributor must sign this trustline itself, so switch Freighter to the distributor account before signing. You can import a second account into Freighter for this.` (orig. 3 JSX lines) → issueToken.distributorSignHint
- `Waiting for signature…` (used 3×) → issueToken.waitingForSignature
- `Create trustline` → issueToken.createTrustline
- `` `Distributor already trusts ${assetCode || "this asset"}` `` → issueToken.distributorTrusts (`{asset}`) + issueToken.thisAsset
- `Trustline transaction:` → issueToken.trustlineTransaction
- `` `Amount of ${assetCode} to issue` `` → issueToken.amountToIssue (`{asset}`)
- `This payment moves ${assetCode || "the asset"} from` (lead) → issueToken.paymentMovesLead (`{asset}`) + issueToken.theAsset
- `to` (after issuer span) → issueToken.paymentMovesTo
- `` `Issue ${assetCode}` `` → issueToken.issueAsset (`{asset}`)
- `Issuance transaction:` → issueToken.issuanceTransaction
- `Home domain (optional)` → issueToken.homeDomainOptional
- `Set home domain` → issueToken.setHomeDomain
- `Home domain set:` → issueToken.homeDomainSetLabel
- `Publish this file at` (lead) → issueToken.publishTomlLead
- `so wallets and explorers can discover the asset.` → issueToken.publishTomlTail
- `Copied!` / `Copy stellar.toml` → issueToken.copied / .copyToml
- `Download stellar.toml` → issueToken.downloadToml
- `` `${assetCode} issued` `` → issueToken.assetIssued (`{asset}`)
- `Asset code` (summary label, second use) → issueToken.assetCode (reused)
- `Network` → issueToken.network
- `Issuer` (summary label, second use) → issueToken.issuer (reused)
- `Distributor` → issueToken.distributor
- `Amount issued` → issueToken.amountIssued
- `Home domain` → issueToken.homeDomain
- `` `View ${assetCode} on Stellar Expert ↗` `` → issueToken.viewOnStellarExpert (`{asset}`)
- `Back` → issueToken.back
- `Continue` → issueToken.continue
- `Back to dashboard` → issueToken.backToDashboard

## frontend/pages/404.tsx → `notFound` (7 keys)

- `` `Lost in the cosmos?` `` → notFound.title
- `` `The stellar path you're looking for seems to have drifted into deep space.` `` → notFound.message
- `` `Let's get you back to safety.` `` → notFound.messageBack
- `` `Go Home →` `` → notFound.goHome
- `` `← Go Back` `` → notFound.goBack
- `` `If you think this is an error, please ` `` (TRAILING SPACE preserved) → notFound.errorLead
- `` `report an issue on GitHub` `` → notFound.reportIssue

## frontend/pages/PaymentRequestGenerator.tsx → `paymentRequestGenerator` (15 keys)

- `Request Payment` → paymentRequestGenerator.title
- `Your Stellar Address` → paymentRequestGenerator.addressLabel
- `Amount (XLM)` → paymentRequestGenerator.amountLabel
- `Memo (Optional)` → paymentRequestGenerator.memoLabel
- `Link Expiry` → paymentRequestGenerator.expiryLabel
- `Never Expire` → paymentRequestGenerator.expiryNever
- `24 Hours` → paymentRequestGenerator.expiry24Hours
- `7 Days` → paymentRequestGenerator.expiry7Days
- `Create Request Link` → paymentRequestGenerator.createLink
- `Generated URL` → paymentRequestGenerator.generatedUrl
- `Hide QR` / `Show QR` → paymentRequestGenerator.hideQr / .showQr
- `Copied!` / `Copy` → paymentRequestGenerator.copied / .copy
- `Download QR` → paymentRequestGenerator.downloadQr

## frontend/pages/tip/[username].tsx → `tipPage` (11 keys)

- `We could not figure out which creator tip page you were trying to open.` → tipPage.missingUsernameMessage
- `` `Looking up @${routeUsername}...` `` → tipPage.lookingUp (`{username}`)
- `` `@${routeUsername} does not have a public tip page yet.` `` → tipPage.noPublicPage (`{username}`)
- `We could not load this tip page right now.` → tipPage.loadFailed
- `The tip page response was incomplete.` → tipPage.incompleteResponse
- `Something went wrong while loading this creator. Please try again.` → tipPage.genericError
- `Loading tip page...` → tipPage.loadingFallback
- `Creator not found` (title) → tipPage.notFoundTitle
- `Tip page unavailable` (title) → tipPage.errorTitle
- `Back to home` → tipPage.backToHome
- `Go back` → tipPage.goBack

## frontend/pages/_app.tsx → `app` (6 keys)

- `Install MicroPay` → app.installTitle
- `Add to your home screen for quick access and offline support` → app.installBody
- `Dismiss` (aria-label) → app.dismissAria
- `Install App` → app.installApp
- `Not Now` → app.notNow
- `You're offline — data may not be up to date.` (orig. `You&apos;re offline — …`) → app.offlineBanner

---

## Deliberately skipped strings

| String / location | Reason |
|---|---|
| `<Head><title>` and `<meta name/property description>` in network.tsx, issue-token.tsx, pay.tsx, request.tsx, 404.tsx, PaymentRequestGenerator.tsx, tip/[username].tsx | Matches already-converted `dashboard.tsx`/`settings.tsx` convention — document metadata left hardcoded |
| `aria-label="GitHub"` and `<title>GitHub</title>` on decorative GitHub svg (index.tsx) | Per issue instructions: skip |
| `XLM`, `USDC`, `Stellar`, `Horizon`, `Stellar Core`, `Freighter`, `Stellar Expert`, `stellar.toml`, `MicroPay`, `Stellar Testnet`, `MIT`, `GitHub`, `Discord (#greenpay)` inside sentences | Technical/brand tokens, not translatable prose |
| `G…` placeholder text, `ID: 123`, `COOL`, `example.com`, `1.0`, `G...` format examples in inputs | Technical format examples (consistent with `transactions.tsx` leaving its memo `placeholder` hardcoded) |
| Symbols: `→`, `←`, `↗` when standalone, `+`, `×`, `·` used as pure decoration, `—`/`–` inside already-keyed strings kept verbatim | Symbols, not prose (arrows that are part of a keyed label e.g. `Go Home →` were kept inside the key to preserve rendering) |
| `className` values, Tailwind classes | Code identifiers |
| `console.*` messages | Not user-facing |
| `data-testid` / testids | Test hooks |
| SVG `d`/`viewBox`/path data | Not user-facing |
| Logic-compared strings (e.g. comparisons against `"mainnet"`/`"testnet"` network ids, enum values) | Compared in code, never displayed |
| `formatNumber`/`formatTime` unit literals passed as code parameters where value is technical (`"XLM"` unit arg) | Currency code passed to formatter, not prose |
| `app` `role="alert"`/`role` attributes, event handlers | Attributes, not text |
| Already-existing namespaces (`common`, `navbar`, `settings`, `dashboard`, `sendPayment`, `walletHealth`, `transactions`, `contacts`, `pwaUpdate`) | Out of scope per issue |

## Notes

- Reused identical-English keys instead of duplicating: `landing.whatIsStellar`, `landing.seeTheOfficial`, `network.latestLedger`, `network.unavailable`, `network.measuredClientSide`, `network.buildUnit`, `network.unknown`, `issueToken.assetCode`, `issueToken.issuer`, `issueToken.waitingForSignature`.
- Added `landing.cancel` rather than reusing `common.cancel` to keep this fragment self-contained (no cross-namespace dependency).
- Helper functions gained a `t` parameter: `formatUtc(iso, t)`, `formatCount(v, t)`, `buildMetricRows(m, t)` (typed `Translate` from `@/lib/i18n`), `errorMessage(error, fallback)`.
- `t` added to hook dependency arrays where used inside effects/callbacks: network `loadMetrics` `[t]`, leaderboard `[t]`, request `[r, t]`, pay `[data, t]`, tip `[routeUsername, router.isReady, t]`.
- Sentences containing inline `<span>`/`<a>` were split into lead/tail keys because `t()` returns strings: `landing.heroTitleLead`+`heroTitleAccent`, `landing.readTheOfficial`+`stellarOverview`, `issueToken.assetCodeHelp`+`xlmReserved`, `paymentMovesLead`+`paymentMovesTo`, `publishTomlLead`+`publishTomlTail`, `subtitleLead`, `notFound.errorLead`+`reportIssue`.
- `frontend/locales/*.json` untouched; fragment is merged separately.

---

## i18n extraction inventory — Issue #1458 (file set C)

All converted keys live in new namespaces only (`paymentStatus`, `batchPayment`, `swap`, `tradeForm`, `turrets`). Existing `common.*` keys were reused for exact matches. Fragment with en/es/ar values: `/tmp/i18n-1458/fragment-C.json`.

## frontend/components/PaymentStatusModal.tsx → namespace `paymentStatus` (31 keys)

- "Payment Tracker" → `paymentStatus.tracker`
- "Complete" → `paymentStatus.complete`
- "Payment failed" → `paymentStatus.paymentFailed`
- "Processing payment" → `paymentStatus.processingPayment`
- "Your transaction has been confirmed on the Stellar network." → `paymentStatus.successDescription`
- "The transaction stopped before completion." → `paymentStatus.failureDescription`
- "Stay on this screen while we move through each network step." → `paymentStatus.processingDescription`
- "Close" → `common.close` (reused, not a new key)
- "Progress" → `paymentStatus.progress`
- "Building" (STEP_ORDER label) → `paymentStatus.steps.building`
- "Signing" (STEP_ORDER label) → `paymentStatus.steps.signing`
- "Submitting" (STEP_ORDER label) → `paymentStatus.steps.submitting`
- "Confirming" (STEP_ORDER label) → `paymentStatus.steps.confirming`
- "Completed" (step caption) → `paymentStatus.captions.completed`
- "In progress" (step caption) → `paymentStatus.captions.inProgress`
- "Failed" (step caption) → `paymentStatus.captions.failed`
- "Waiting" (step caption + elapsed fallback) → `paymentStatus.captions.waiting`
- "Transaction confirmed" → `paymentStatus.transactionConfirmed`
- "View on Stellar Expert" → `paymentStatus.viewOnStellarExpert`
- "Print receipt" → `paymentStatus.printReceipt`
- "Payment Receipt" (receipt sheet title) → `paymentStatus.receipt.title`
- "Date / time" (receipt dt) → `paymentStatus.receipt.dateTime`
- "From" (receipt dt) → `paymentStatus.receipt.from`
- "To" (receipt dt) → `paymentStatus.receipt.to`
- "Amount" (receipt dt) → `paymentStatus.receipt.amount`
- "Memo" (receipt dt) → `paymentStatus.receipt.memo`
- "Transaction hash" (receipt dt) → `paymentStatus.receipt.transactionHash`
- "Explorer" (receipt dt) → `paymentStatus.receipt.explorer`
- `` `Generated by Stellar MicroPay — printed ${date}.` `` → `paymentStatus.receipt.generatedBy` with `{date}` token
- `` `${remainingSeconds}s left` `` → `paymentStatus.timer.secondsLeft` with `{seconds}` token
- `` `~${remainingSeconds}s remaining` `` → `paymentStatus.timer.secondsRemaining` with `{seconds}` token

Structural notes: `STEP_ORDER` now stores `labelKey`; `getStepCaption` renamed to `getStepCaptionKey` returning keys (translated at call site so the helper stays a pure module-level function); `formatElapsed` now returns `string | null` and the call site falls back to `t("paymentStatus.captions.waiting")`; `CountdownTimer` has its own `useTranslation()` call (it is a separate component function).

## frontend/components/BatchPaymentForm.tsx → namespace `batchPayment` (29 keys)

- "Invalid Stellar address." → `batchPayment.invalidAddress`
- "Amount must be greater than 0." → `batchPayment.amountMustBePositive`
- "Recipient address cannot be the same as your wallet." → `batchPayment.recipientIsOwnWallet`
- "Transaction signing was rejected." (fallback) → `batchPayment.signingRejected`
- "Batch payment failed." (catch fallback) → `batchPayment.paymentFailed`
- "Batch payment complete." → `batchPayment.completeMessage`
- "Batch completed with some failures. Retry individual failed payments below." → `batchPayment.partialFailureMessage`
- "Batch Send" → `batchPayment.title`
- "Send XLM to up to {MAX_RECIPIENTS} recipients sequentially." → `batchPayment.subtitle` with `{max}` token
- "Recipient address" (label) → `batchPayment.recipientAddress`
- "Amount (XLM)" (label) → `batchPayment.amountXlm`
- "Memo (optional)" (label) → `batchPayment.memoOptional`
- "Payment note" (placeholder) → `batchPayment.memoPlaceholder`
- "Status:" → `batchPayment.statusLabel`
- "Waiting" (idle status) → `batchPayment.statusWaiting`
- "Processing" (pending status) → `batchPayment.statusProcessing`
- "Sent ✓" (success status) → `batchPayment.statusSent`
- "Failed" (failed status) → `batchPayment.statusFailed`
- "Remove" (button) → `batchPayment.remove`
- "Add recipient" (button) → `batchPayment.addRecipient`
- "Total:" (total pill) → `batchPayment.total`
- "Recipient" (table header) → `batchPayment.recipientColumn`
- "Amount" (table header) → `batchPayment.amountColumn`
- "Asset" (table header) → `batchPayment.assetColumn`
- "Total" (table footer) → `batchPayment.totalColumn`
- "Total exceeds your available XLM balance after reserve." → `batchPayment.exceedsBalance`
- "Sending batch..." (button while processing) → `batchPayment.sending`
- "Confirm & Send" (button) → `batchPayment.confirmAndSend`
- "Retry failed payments" (button) → `batchPayment.retryFailed`

## frontend/components/SwapForm.tsx → namespace `swap` (18 keys)

- "No DEX path found for this swap" → `swap.noPathFound`
- "Failed to fetch swap quote" (catch fallback) → `swap.quoteFetchFailed`
- "Signing cancelled" (throw fallback) → `swap.signingCancelled`
- `` `Swap successful! Received ${...}` `` → `swap.successMessage` with `{received}` token
- "Swap failed" (catch fallback) → `swap.swapFailed`
- "Swap XLM ↔ USDC" (heading) → `swap.title`
- "Sell" (label) → `swap.sell`
- "Sell asset" (aria-label) → `swap.sellAssetLabel`
- "Flip assets" (aria-label) → `swap.flipAssets`
- "Estimated buy" (label) → `swap.estimatedBuy`
- "Buy asset" (aria-label) → `swap.buyAssetLabel`
- "Fetching path…" (readonly input value) → `swap.fetchingPath`
- "Slippage tolerance" (label) → `swap.slippageTolerance`
- "Exchange rate" → `swap.exchangeRate`
- `Min received ({pct} slip)` → `swap.minReceived` with `{percent}` token
- "Path hops" → `swap.pathHops`
- "Swapping…" (submit button) → `swap.swapping`
- `` `Swap ${sellAsset} → ${buyAsset}` `` → `swap.action` with `{from}`/`{to}` tokens

Note: `t` added to the `loadQuote` useCallback dependency array (exhaustive-deps).

## frontend/components/TradeForm.tsx → namespace `tradeForm` (18 keys)

- "Please fill in all required fields" → `tradeForm.fillRequiredFields`
- "Cannot trade the same asset" → `tradeForm.sameAssetError`
- "Market order executed successfully!" → `tradeForm.marketOrderSuccess`
- `` `Sell order placed successfully!` `` → `tradeForm.sellOrderSuccess`
- `` `Buy order placed successfully!` `` → `tradeForm.buyOrderSuccess`
- "Trade failed" (catch fallback) → `tradeForm.tradeFailed`
- "Market Order" (toggle button) → `tradeForm.marketOrderType`
- "Limit Order" (toggle button) → `tradeForm.limitOrderType`
- "You Pay" (label) → `tradeForm.youPay`
- "You Receive" (label) → `tradeForm.youReceive`
- "Price" (placeholder) → `tradeForm.pricePlaceholder`
- "Market Price" (read-only display) → `tradeForm.marketPrice`
- "Buy Order" (side button) → `tradeForm.buyOrderSide`
- "Sell Order" (side button) → `tradeForm.sellOrderSide`
- "Processing..." (submit button) → `tradeForm.processing`
- "Execute Market Order" (submit button) → `tradeForm.executeMarketOrder`
- `` `Place Buy Order` `` → `tradeForm.placeBuyOrder`
- `` `Place Sell Order` `` → `tradeForm.placeSellOrder`

## frontend/components/TurretsWizard.tsx → namespace `turrets` (26 keys)

- "Connect your wallet to deploy an automation." → `turrets.connectWalletFirst`
- "Deployment failed." (catch fallback) → `turrets.deploymentFailed`
- "Connect your wallet to configure automations." → `turrets.connectWalletToConfigure`
- "Setup progress" (aria-label) → `turrets.setupProgress`
- "Choose strategy" → `turrets.chooseStrategy`
- "Buy XLM on a schedule" (DCA description) → `turrets.dcaDescription`
- "Stop-Loss" (strategy button + list label) → `turrets.stopLoss`
- "Sell if price drops" (Stop-Loss description) → `turrets.stopLossDescription`
- "Continue" (×2) → `common.continue` (reused)
- "Configure parameters" → `turrets.configureParameters`
- "Interval (minutes)" (label) → `turrets.intervalMinutes`
- "Amount per run (USDC quote)" (label) → `turrets.amountPerRun`
- "Price threshold (USD)" (label) → `turrets.priceThreshold`
- "Amount to sell (XLM)" (label) → `turrets.amountToSell`
- "Back" (×2) → `common.back` (reused)
- "Fund the turret signer address" → `turrets.fundSignerTitle`
- "The turret submits scheduled transactions from this signer. Fund it with at least 3 XLM so it can cover reserves and fees." → `turrets.fundSignerBody`
- "Loading signer address…" → `turrets.loadingSigner`
- "Deploying…" → `turrets.deploying`
- "Deploy and activate" → `turrets.deployAndActivate`
- "Automation active" → `turrets.automationActive`
- "Create another" → `turrets.createAnother`
- "Active automations" → `turrets.activeAutomations`
- "Refreshing…" → `turrets.refreshing`
- "Refresh" → `turrets.refresh`
- "No automations yet." → `turrets.noAutomations`
- "Last execution:" → `turrets.lastExecution`
- "never" → `turrets.never`

## Deliberately skipped strings

- Technical tokens kept inline: "XLM", "USDC", "G..." placeholders, `{deployed.id}/{deployed.type}/{deployed.status}`, `{a.status}`, `{txHash}`, `{explorerHref}`, asset `<option>` labels ("XLM"/"USDC"), the `↔`/`≈`/`→`/`·`/`—`/`%`/`/` separators, `{formatPercent(...)}` slippage pills, elapsed-time formats like `12s` / `1m 05s` in `formatElapsed` (numeric/technical formatting, not prose).
- "DCA" (TurretsWizard strategy button and automation list): financial abbreviation, kept untranslated like asset codes.
- "Stellar MicroPay" receipt brand line (`receipt-brand`): brand name, left as literal.
- `console.error("Trade failed:", error)` in TradeForm: console-only, not user-facing.
- Strings already flowing through props/props-driven errors (`timing.error`, `error` prop, `signError`, `err.message`, `batchMessage` state contents): dynamic values, only their hardcoded fallbacks were converted.
- `{recipientCount} / {MAX_RECIPIENTS}` counter in BatchPaymentForm: numeric format with a `/` separator, not prose.
- `{Math.round(progress)}%`: numeric.

---

## Issue #1458 — i18n extraction inventory (subagent D)

Fragment: `/tmp/i18n-1458/fragment-D.json` (flat dotted key → {en, es, ar}).
The plural message `multiSig.readyToSubmit` is split into `.one` / `.other`
fragment entries so every fragment value stays a string; merging the dotted
paths yields the intended `{ multiSig: { readyToSubmit: { one, other } } }`.

Reused existing `common.*` keys (exact matches, NOT redefined):
- `common.copy` ← "Copy" (PaymentLinkGenerator)
- `common.copied` ← "Copied!" (PaymentLinkGenerator)
- `common.close` ← "Close" (QRCodeModal)

## frontend/components/PaymentLinkGenerator.tsx → namespace `paymentLink` (13 keys)

- Generate Payment Link → paymentLink.title
- Recipient Address → paymentLink.recipientAddress
- Amount (XLM) → paymentLink.amountLabel
- Memo (Optional) → paymentLink.memoLabel
- Link Expiry → paymentLink.expiryLabel
- Never Expire → paymentLink.expiryNever
- 24 Hours → paymentLink.expiry24Hours
- 7 Days → paymentLink.expiry7Days
- Create Link → paymentLink.createLink
- Generated URL → paymentLink.generatedUrl
- Hide QR → paymentLink.hideQr
- Show QR → paymentLink.showQr
- Scan to Pay → paymentLink.scanToPay
- Copied! / Copy → reused common.copied / common.copy

## frontend/components/WalletConnect.tsx → namespace `walletConnect` (21 keys)

- Could not retrieve public key. → walletConnect.noPublicKey (error state)
- Could not retrieve public key from Ledger device. → walletConnect.noLedgerPublicKey (error state)
- Freighter not detected → walletConnect.notDetected
- Freighter is a free browser extension that lets you sign Stellar transactions securely. → walletConnect.description
- Install Freighter from the → walletConnect.installStep1 (link text follows as a separate node)
- Create or import your Stellar wallet in the extension → walletConnect.step2
- Come back here and click the button below → walletConnect.step3
- Get Freighter for {store} → walletConnect.getFreighter (value: storeName)
- Checking... → walletConnect.checking
- I've installed it — try again → walletConnect.installedRetry
- Connect your wallet → walletConnect.title
- Choose your preferred wallet to connect to the Stellar network and start sending payments. → walletConnect.subtitle
- Connecting... → walletConnect.connecting
- Authenticating... → walletConnect.authenticating
- Connect Freighter Wallet → walletConnect.connectFreighter
- Connect Ledger Hardware Wallet → walletConnect.connectLedger
- Don't have Freighter? → walletConnect.dontHaveFreighter
- Install the extension → → walletConnect.installExtension (keeps the arrow; ar mirrors it to ←)
- Ledger requires Chrome, Edge, or another Chromium-based browser with WebHID support. → walletConnect.ledgerBrowserHint
- Using Ledger? Make sure your device is connected, unlocked, and the Stellar app is open. → walletConnect.ledgerUsageHint
- Connected to → walletConnect.connectedTo (network name in the following span is a technical token)

## frontend/components/PaymentInsightsCard.tsx → namespace `paymentInsights` (11 keys)

- Calculating… → paymentInsights.calculating
- 0% vs last month → paymentInsights.zeroChange
- {formatPercent(...)} vs last month → paymentInsights.vsLastMonth (value: {value})
- Payment Insights → paymentInsights.title
- This Calendar Month → paymentInsights.thisMonth
- XLM Sent → paymentInsights.xlmSent
- Last month: {formatNumber(...)} XLM → paymentInsights.lastMonth (value: {value}; used for sent and received)
- XLM Received → paymentInsights.xlmReceived
- Unique Counterparties → paymentInsights.uniqueCounterparties
- accounts interacted → paymentInsights.accountsInteracted
- This calendar month → paymentInsights.thisCalendarMonth

## frontend/components/MultiSigFlow.tsx → namespace `multiSig` (22 messages / 23 fragment entries)

- Failed to build transaction → multiSig.buildFailed (error state)
- Failed to sign transaction → multiSig.signFailed (error state)
- Failed to submit transaction → multiSig.submitFailed (error state)
- Multi-Signature Transaction → multiSig.title
- Recipient Address → multiSig.recipientAddress
- Amount (XLM) → multiSig.amountLabel
- Memo (optional) → multiSig.memoLabel
- Payment description (placeholder) → multiSig.memoPlaceholder
- Signature Threshold → multiSig.thresholdLabel
- Building... → multiSig.building
- Build Transaction → multiSig.buildTransaction
- Share this URL with your co-signers: → multiSig.shareUrl
- Copy URL → multiSig.copyUrl
- Proceed to Collect Signatures → multiSig.proceedToCollect
- Signatures collected: {n} / {threshold} → multiSig.signaturesCollected ({collected}, {threshold})
- Signature {i} hint: {hint} → multiSig.signatureHint ({index}, {hint})
- Paste Signed XDR from Co-Signer → multiSig.pasteSignedXdr
- Add Signature → multiSig.addSignature
- Proceed to Submit → multiSig.proceedToSubmit
- Ready to submit with {count} signatures. → multiSig.readyToSubmit (plural: .one / .other, t(key, { count }))
- Submitting... → multiSig.submitting
- Submit Transaction → multiSig.submitTransaction

## frontend/components/ReceiptsList.tsx → namespace `receipts` (11 keys)

- Loading receipts (aria-label) → receipts.loading
- Try again → receipts.tryAgain
- No receipts minted yet. → receipts.empty
- Use “Mint receipt” on a payment you sent to record proof of payment on-chain. → receipts.emptyHint (keeps curly quotes from &ldquo;/&rdquo;)
- Minted receipts (aria-label) → receipts.listLabel
- Receipt #{index} → receipts.receiptNumber
- To → receipts.to
- Memo → receipts.memo
- Ledger → receipts.ledger
- Print receipt #{index} (aria-label) → receipts.printReceiptAria
- Print → receipts.print

## frontend/components/QRCodeModal.tsx → namespace `qrCode` (6 keys)

- Receive Payment QR Code → qrCode.title
- Your Stellar Address → qrCode.yourAddress
- Payment URI → qrCode.paymentUri
- Download PNG → qrCode.download
- Download QR code as PNG (aria-label) → qrCode.downloadAria
- Scan this QR code with Freighter mobile or any Stellar wallet to receive payments. → qrCode.instructions
- Close → reused common.close

## frontend/components/QuickSendModal.tsx → namespace `quickSend` (4 keys)

- Quick send payment (aria-label) → quickSend.dialogLabel
- Close quick send modal (aria-label) → quickSend.closeAria
- Press → quickSend.press (kbd element stays inline)
- to close → quickSend.toClose

## Deliberately skipped (with reason)

- Placeholders that are format/technical examples: "G...", "1.0", "ID: 123" (PaymentLinkGenerator), "0.0", "AAAA..." (MultiSigFlow), "G..." (MultiSig) — address/number/XDR examples, same treatment as already-converted SendPaymentForm placeholders.
- `storeName` values "Firefox Add-ons", "Chrome Web Store", "freighter.app" (WalletConnect) — brand/store names and a URL (brand terms stay untranslated).
- "Connected to" network value `process.env.NEXT_PUBLIC_STELLAR_NETWORK || "testnet"` — technical token.
- `${stroopsToXlm(...)} XLM` (ReceiptsList) — formatted amount + XLM ticker, not prose.
- `receipt.memo || "-"`, `title={receipt.to}`, formatted dates — data/symbols.
- Step-indicator digits (1/2/3) and `{i + 1}` (MultiSigFlow) — numerals, not prose.
- `console.error('Failed to copy!', err)` (PaymentLinkGenerator) — console output.
- Step keys in the MultiSigFlow indicator array `["build","share","collect","submit"]` — logic values, only used as map keys / comparisons.

Totals: 7 files changed, 88 messages, 89 fragment entries
(paymentLink 13, walletConnect 21, paymentInsights 11, multiSig 23 entries /
22 messages, receipts 11, qrCode 6, quickSend 4) + 3 reused common keys.

---

## i18n inventory — Issue #1458 (agent E)

Components in `frontend/components/` converted to `t("<namespace>.<key>")`.
All new keys live only in `fragment-E.json` (en/es/ar); `frontend/locales/*.json` untouched.
Reused existing `common.*` keys (exact matches only): `common.loading` (AnchorRamp), `common.cancel` (RecurringPayments), `common.back` (OnboardingTour).
`Toast.tsx` skipped — no hardcoded user-facing strings (props only), 0 keys.

## TipWidget.tsx — 31 keys (`tipWidget.*`)
- `Send me a tip with Stellar MicroPay! ⚡ {shareUrl}` → `tipWidget.shareText` (token `{url}`)
- `Public tip page` → `tipWidget.publicTipPage`
- `Tip @{creatorUsername}` → `tipWidget.tipTitle` (token `{username}`)
- `Send a fast XLM tip straight to this creator's Stellar wallet. Pick a preset or choose your own amount, then confirm in Freighter.` → `tipWidget.description`
- `Wallet` → `tipWidget.wallet`
- `Share this tip page on X` (aria) → `tipWidget.shareAria`
- `Share on X` → `tipWidget.shareOnX`
- `Choose a tip` → `tipWidget.chooseTip`
- `Fixed presets from the issue spec, plus any custom XLM amount you want.` → `tipWidget.presetsHint`
- `No account required to view` → `tipWidget.noAccountRequired`
- `{tip.label} tip` → `tipWidget.presetTip` (token `{label}`)
- `Custom amount` → `tipWidget.customAmount`
- `Enter at least 0.0000001 XLM to continue.` → `tipWidget.minAmount`
- `Selected tip` → `tipWidget.selectedTip`
- `Recipient:` → `tipWidget.recipient` (trailing `<span>@user</span>` kept in JSX)
- `Connected wallet` → `tipWidget.connectedWallet`
- `Checking balance...` → `tipWidget.checkingBalance`
- `Balance: {formatXLM(xlmBalance)}` → `tipWidget.balance` (token `{balance}`)
- `Connect only when you are ready to send` → `tipWidget.connectWhenReady`
- `Connect wallet to tip {formatXLM(parsedAmount)}` → `tipWidget.connectToTip` (token `{amount}`)
- `Enter an amount` → `tipWidget.enterAmount`
- `Tip sent to @{creatorUsername}` → `tipWidget.tipSentTo` (token `{username}`)
- `Your support is on the way, and the confetti is doing its job.` → `tipWidget.supportOnWay`
- `Connect your wallet to send {amount|"this tip"} to @{username}.` → `tipWidget.connectPrompt` + `tipWidget.thisTip`
- `You are tipping @{creatorUsername} at {shortenAddress(destination)}.` → `tipWidget.youAreTipping` (tokens `{username}` (with @), `{address}`)
- `Send a tip to @{creatorUsername}` → `tipWidget.sendTipTitle` (token `{username}`)
- `Send {formatXLM(parsedAmount)} tip` → `tipWidget.sendTipSubmit` (token `{amount}`)
- `Send tip` → `tipWidget.sendTip`
- `Tip sent to @{creatorUsername}!` → `tipWidget.sendTipSuccessTitle` (token `{username}`)
- `{formatXLM(parsedAmount)} is on the way.` → `tipWidget.sendTipSuccessMessage` (token `{amount}`)

## AIPaymentAssistant.tsx — 22 keys (`aiAssistant.*`)
- `AI assistant is currently unavailable. Please fill in the payment details manually.` → `aiAssistant.unavailable`
- `AI Payment Assistant` → `aiAssistant.title`
- `Close assistant` (aria) → `aiAssistant.closeAssistant`
- `Describe your payment in natural language and I'll help you fill out the form.` → `aiAssistant.description`
- `Payment description` → `aiAssistant.inputLabel`
- `e.g., Send 50 XLM to GABC123... for design work` (placeholder) → `aiAssistant.placeholder`
- `Press Cmd/Ctrl + Enter to parse, or Escape to close` → `aiAssistant.keyboardHint`
- `Parsing...` → `aiAssistant.parsing`
- `Parse Payment` → `aiAssistant.parsePayment`
- `Parsed Payment Details` → `aiAssistant.parsedDetails`
- `Need More Information` → `aiAssistant.needMoreInfo`
- `Amount:` → `aiAssistant.amountLabel`
- `Not specified` → `aiAssistant.notSpecified`
- `Recipient:` → `aiAssistant.recipientLabel`
- `Memo:` → `aiAssistant.memoLabel`
- `Fill Payment Form` → `aiAssistant.fillForm`
- `Try Again` → `aiAssistant.tryAgain`
- `Examples:` → `aiAssistant.examples`
- `"Send 50 XLM to GABC123... for design work"` → `aiAssistant.exampleSend`
- `"Pay 25 XLM to Alice for the consultation"` → `aiAssistant.examplePay`
- `"Transfer 100 XLM to my colleague"` → `aiAssistant.exampleTransfer`
- `Open AI Payment Assistant` (aria, inline FloatingAssistantButton in same file) → `aiAssistant.openAssistant`

## AnchorRamp.tsx — 16 keys (`anchorRamp.*`)
- `Anchor info loaded. Choose deposit or withdraw below.` → `anchorRamp.infoLoaded`
- `Could not reach the anchor server.` → `anchorRamp.reachFailed`
- `Connect your wallet first.` → `anchorRamp.connectFirst`
- `Anchor deposit flow opened in a new tab. Complete KYC/payment there.` → `anchorRamp.depositOpened`
- `Enter a valid amount to withdraw.` → `anchorRamp.invalidAmount`
- `Sign in (SEP-0010) to get a JWT before withdrawing.` → `anchorRamp.signInRequired`
- `Withdraw submitted. Await the Stellar payment from the anchor, then check your balance.` → `anchorRamp.withdrawSubmitted`
- `Withdraw failed.` → `anchorRamp.withdrawFailed`
- `Anchor server URL` → `anchorRamp.serverUrlLabel`
- `Default: {DEFAULT_ANCHOR_URL} (public testnet anchor). Stored locally.` → `anchorRamp.defaultHint` (token `{url}`)
- `Asset` → `anchorRamp.assetLabel`
- `Amount (withdraw)` → `anchorRamp.amountLabel`
- `Fetch anchor info` → `anchorRamp.fetchInfo`
- `Deposit →` → `anchorRamp.deposit` (es keeps →, ar mirrored to ←)
- `Withdraw` → `anchorRamp.withdraw`
- `Anchor info (SEP-0006)` → `anchorRamp.infoSummary`
- Reused: `Loading…` → `common.loading` (existing key, not in fragment)

## RecurringPayments.tsx — 14 keys (`recurringPayments.*`)
- `Daily` → `recurringPayments.intervalDaily`
- `Weekly` → `recurringPayments.intervalWeekly`
- `Monthly` → `recurringPayments.intervalMonthly`
- `Recurring Payments` → `recurringPayments.title`
- `New` (from `+ New`; `+` kept in JSX) → `recurringPayments.new`
- `Recipient address (G…)` (placeholder) → `recurringPayments.recipientPlaceholder`
- `Amount (XLM)` (placeholder) → `recurringPayments.amountPlaceholder`
- `Interval` (aria) → `recurringPayments.intervalLabel`
- `Memo (optional)` (placeholder) → `recurringPayments.memoPlaceholder`
- `Save schedule` → `recurringPayments.saveSchedule`
- `No recurring payments yet. Create a schedule to send XLM automatically.` → `recurringPayments.empty`
- `Due` → `recurringPayments.due`
- `Pay Now` → `recurringPayments.payNow`
- `Delete schedule` (aria) → `recurringPayments.deleteSchedule`
- Reused: `Cancel` → `common.cancel` (existing key, not in fragment)

## ContactPickerModal.tsx — 8 keys (`contactPicker.*`)
- `Address book` (aria) → `contactPicker.ariaLabel`
- `Address Book` → `contactPicker.title`
- `Close address book` (aria) → `contactPicker.closeAria`
- `Search by name or address...` (placeholder) → `contactPicker.searchPlaceholder`
- `Search contacts` (aria) → `contactPicker.searchAria`
- `No contacts saved yet.` → `contactPicker.emptyState`
- `Go to Contacts` → `contactPicker.goToContacts`
- `No contacts match “{query}”.` → `contactPicker.noResults` (token `{query}`)

## LiveEventsFeed.tsx — 19 keys (`liveEvents.*`)
- `Open` → `liveEvents.typeOpen`
- `Claim` → `liveEvents.typeClaim`
- `Top up` → `liveEvents.typeTopUp`
- `Close` → `liveEvents.typeClose`
- `Tip` → `liveEvents.typeTip`
- `Receipt` → `liveEvents.typeReceipt`
- `Refund` → `liveEvents.typeRefund`
- `Connecting…` (status default) → `liveEvents.statusConnecting`
- `Live` → `liveEvents.statusLive`
- `Reconnecting…` → `liveEvents.statusReconnecting`
- `Streaming not supported in this browser` → `liveEvents.statusUnsupported`
- `Live Events` → `liveEvents.title`
- `Soroban contract activity streamed from the events API` → `liveEvents.subtitle`
- `Reconnect` → `liveEvents.reconnect`
- `Connecting to the event stream…` → `liveEvents.connecting`
- `This browser does not support server-sent events, so the live feed is unavailable.` → `liveEvents.unsupported`
- `Waiting for the first contract event…` → `liveEvents.waiting`
- `Ledger #{formatNumber(...)}` → `liveEvents.ledger` (token `{ledger}`)
- `Last event received {formatTime(lastUpdatedAt)}` → `liveEvents.lastEvent` (token `{time}`)

## CreatorTipsDashboard.tsx — 18 keys (`creatorTips.*`)
- `Unable to load tips. Make sure you have a registered username.` → `creatorTips.loadError`
- `Set Up Your Creator Profile` → `creatorTips.setupProfile`
- `Register a username to enable public tip pages and track tips received.` → `creatorTips.registerPrompt`
- `Register Username` → `creatorTips.registerUsername`
- `Total Tips Received` → `creatorTips.totalTips`
- `Total XLM Received` → `creatorTips.totalXlm`
- `Average Tip` → `creatorTips.averageTip`
- `Your Public Tip Page` → `creatorTips.yourTipPage`
- `Share this link with your fans to receive tips` → `creatorTips.shareLink`
- `Copy link` (title) → `creatorTips.copyLink`
- `Tips Received` → `creatorTips.tipsReceived`
- `Refresh` → `creatorTips.refresh`
- `No tips received yet` → `creatorTips.emptyTitle`
- `Share your tip page to start receiving tips!` → `creatorTips.emptyHint`
- `From: {shortenAddress(tip.senderPublicKey)}` → `creatorTips.from` (token `{address}`)
- `← Previous` → `creatorTips.previous` (ar mirrored to `التالي →`)
- `Page {page + 1} of {Math.ceil(...)}` → `creatorTips.pageOf` (tokens `{current}`, `{total}`)
- `Next →` → `creatorTips.next` (ar mirrored to `← التالي`)

## LeaderboardPrivacyToggle.tsx — 6 keys (`leaderboardPrivacy.*`)
- `Could not load your leaderboard preference.` → `leaderboardPrivacy.loadError`
- `Could not save your leaderboard preference. Please try again.` → `leaderboardPrivacy.saveError`
- `Leaderboard privacy` → `leaderboardPrivacy.title`
- `Hide your account from the public tip leaderboards and top tipper lists. Your tips still count toward creator totals.` → `leaderboardPrivacy.description`
- `Sign in with your wallet to change this setting.` → `leaderboardPrivacy.signInPrompt`
- `Hide me from leaderboards` (aria + label) → `leaderboardPrivacy.hideMe`

## AddUsdcTrustline.tsx — 8 keys (`trustline.*`)
- `Trustline check failed: ${res.status}` → `trustline.checkFailed` (token `{status}`)
- `Trustline check failed.` → `trustline.checkFailedFallback`
- `Freighter signing failed.` → `trustline.signFailed`
- `Add USDC failed.` → `trustline.addFailedFallback`
- `Enable USDC` → `trustline.enableTitle`
- `Your wallet doesn't trust USDC yet. Add the trustline to see your USDC balance here.` → `trustline.description`
- `Adding USDC…` → `trustline.adding`
- `Add USDC` → `trustline.add`

## ExternalPaymentBanner.tsx — 4 keys (`externalPayment.*`)
- `Payment request from external app` → `externalPayment.title`
- `Send a payment using the pre-filled form below.` → `externalPayment.defaultMessage`
- `Origin:` → `externalPayment.origin` (trailing `<span>{originDomain}</span>` kept in JSX)
- `Dismiss` (aria) → `externalPayment.dismiss`

## FloatingAssistantButton.tsx — 2 keys (`floatingAssistant.*`)
- `Open AI payment assistant` (aria) → `floatingAssistant.openAssistant`
- `AI Payment Assistant (⌘K)` (title) → `floatingAssistant.title`

## ErrorBoundary.tsx — 3 keys (`errorBoundary.*`)
- `Something went wrong` → `errorBoundary.title` (rendered via new `DefaultErrorFallback` function component; class default export unchanged)
- `An unexpected error occurred. You can try again, or reload the page if the problem persists.` → `errorBoundary.description`
- `Try again` → `errorBoundary.tryAgain`

## FeeHistorySparkline.tsx — 3 keys (`feeSparkline.*`)
- `Failed to fetch fee history` → `feeSparkline.fetchFailed`
- `Failed to load fee history` → `feeSparkline.loadFailed`
- `No fee data available` → `feeSparkline.noData`

## OnboardingTour.tsx — 10 keys (`onboarding.*`)
- `Your Balance` → `onboarding.steps.balance.title`
- `Here you can see your XLM balance and wallet address. This is your main account overview.` → `onboarding.steps.balance.description`
- `Send Payments` → `onboarding.steps.sendForm.title`
- `Use this form to send XLM payments to other Stellar addresses. Enter the recipient and amount.` → `onboarding.steps.sendForm.description`
- `View Transactions` → `onboarding.steps.transactions.title`
- `Click here to see all your past transactions and payment history.` → `onboarding.steps.transactions.description`
- `Skip tour` → `onboarding.skipTour`
- `{currentStep + 1} of {tourSteps.length}` → `onboarding.stepProgress` (tokens `{current}`, `{total}`)
- `Finish` → `onboarding.finish`
- `Next` → `onboarding.next`
- Reused: `Back` → `common.back` (existing key, not in fragment)

## Toast.tsx — skipped (0 keys)
No hardcoded user-facing strings; `message` and `action.label` are props. Adding `useTranslation` would create an unused import.

## Totals
- 14 files changed, 164 new keys (tipWidget 31, aiAssistant 22, anchorRamp 16, recurringPayments 14, contactPicker 8, liveEvents 19, creatorTips 18, leaderboardPrivacy 6, trustline 8, externalPayment 4, floatingAssistant 2, errorBoundary 3, feeSparkline 3, onboarding 10).
- 3 existing `common.*` keys reused on exact match; no existing namespaces extended.
- `frontend/locales/*.json` untouched; all translations in `fragment-E.json`.

## Deliberately left as literals
- Numeric/technical placeholders and tokens: `0.5000000`, `10.00`, `0 XLM`, XLM/USDC asset options, G… addresses.
- `throw new Error("Failed to parse payment intent")` (AIPaymentAssistant) and `throw new Error("Failed to load tips")` (CreatorTipsDashboard) — messages never rendered in the UI.
- `HTTP ${status}` error strings (LeaderboardPrivacyToggle) — technical.
- LiveEventsFeed backend notices, `—`, and `→` arrows in `describeParticipants`; unknown event-type fallback `type.replace(/_/g, " ")`.
- Symbols kept in JSX: `+ New` → `+ {t("recurringPayments.new")}`, bullets `•` in AI examples.

---

## i18n extraction inventory — issue #1458 (batch F)

Scope: the 7 files that already used `useTranslation()` (or gained it): SendPaymentForm,
dashboard, settings, transactions, Navbar, TransactionList, WalletHealthPanel.
Namespaces extended: `sendPayment`, `dashboard`, `settings`, `transactions`, `navbar`,
`walletHealth`; new namespace `transactionList`.
All keys below are NEW (English not present in `frontend/locales/en.json`).
English values are character-identical to the original literals (…, →, ←, ×, —, ▲/▼, curly quotes preserved).

**New key totals: 248** — sendPayment 40 · dashboard 55 · settings 22 · transactions 45 · navbar 15 · transactionList 46 · walletHealth 25

Keys reused from the existing catalog (not added to the fragment): `common.back`,
`common.copied`, `common.retry`, `common.close`, `dashboard.copied`,
`dashboard.copyAddress`, `dashboard.failedToLoad`, `dashboard.retry`,
`dashboard.selectedPeriod`, `dashboard.totalSent`, `dashboard.totalReceived`,
`sendPayment.amount` (`Amount ({asset})`), `sendPayment.memoCounter`,
`settings.network.mainnet|testnet|custom` (also reused by Navbar `networkLabel` and
transactions `networkLabel` + print-sheet "Network"), `transactions.showingLoaded`,
`navbar.home|dashboard|trade|transactions|network|settings`, `walletHealth.healthy`,
`walletHealth.warnings|trustlines|signers` (pluralized one/other).

---

## frontend/components/SendPaymentForm.tsx → `sendPayment.*` (40 new)

- `MEMO_ID must be a uint64 integer` → memoIdInvalid
- `` `MEMO_${type} must be hexadecimal` `` → memoHexInvalid ({type})
- `` `MEMO_${type} requires ${len} hex characters (32 bytes)` `` → memoHashLength ({type},{length})
- `uint64 integer, e.g. 12345` → memoIdPlaceholder
- `64-character hex (32 bytes)` → memoHexPlaceholder
- `No conversion path found. Try a different amount or asset pair.` → noRouteFound
- `Failed to fetch conversion routes.` → fetchRoutesFailed
- `SNS name not found` → snsNotFound (×2 sites)
- `Invalid federation address format` → federationInvalidFormat
- `Federation address not found` → federationNotFound (×2 sites)
- `Pick from address book` (title + aria-label) → pickFromAddressBook
- `G... or alice.xlm` → destinationPlaceholderSns (NEW key — existing destinationPlaceholder is `G... or @username`, not an exact match)
- `Recent destinations` (listbox aria-label + header) → recentDestinations
- `Clear history` → clearHistory
- `Resolving {domain}…` → resolvingDomain ({domain})
- `Resolved: {address}` → resolvedAddress ({address})
- `Use address` → useAddress
- `Contact suggestions` (aria-label) → contactSuggestions
- `Send Max: balance - 1 XLM base reserve - subentry reserves - current network fee` (title) → sendMaxTooltip
- `` `Send Max: ${formatXLM(maxSend)}` `` → sendMax ({amount})
- `Transaction Speed` → transactionSpeed
- `` `Est. Fee: {stroops} stroops ({xlm} XLM)` `` → estimatedFee ({stroops},{xlm}; "stroops"/"XLM" kept untranslated)
- `Convert & Send (via Stellar DEX)` → convertAndSend (`&amp;` is JSX escaping of the same `&`)
- `Recipient receives` → recipientReceives
- `Finding best route...` → findingRoute (3-dot ellipsis kept as in original)
- `Estimated received` → estimatedReceived
- `Exchange rate` → exchangeRate
- `Route` → route
- `Slippage tolerance` → slippageTolerance
- `Split payment among multiple recipients` → splitPaymentToggle
- `` `Recipients (${n}/10)` `` → recipientsCount ({count}; "/10" stays in the string)
- `` `{p}% allocated` `` → percentAllocated ({percent})
- `+ Add recipient` → addRecipient
- `Total percentage must equal 100% (currently {p}%)` → totalPercentError ({percent})
- `Memo type` / `Memo value` (aria-labels) → memoTypeLabel / memoValueLabel
- `Unsigned 64-bit integer (uint64)` → memoIdHint
- `` `{used}/{max} hex characters` `` → memoHexCounter ({used},{max})
- `` `Memo (${type})` `` → memoWithType ({type})
- `Confirm & Sign` → confirmAndSign

## frontend/pages/dashboard.tsx → `dashboard.*` (55 new)

- `Loading multi-sig…` → loadingMultiSig (moved into new `MultiSigLoading` component — hooks can't be called inside the `dynamic()` loading arrow)
- `Loading AI Payment Assistant…` → loadingAiAssistant (new `AiAssistantLoading` component, same reason)
- `` `You received ${…}` `` → receivedPayment ({amount})
- `Could not load your payment stats.` → statsLoadFailed
- `Failed to export CSV. Please try again.` → csvExportFailed
- `Friendbot is only available on testnet.` → friendbotTestnetOnly
- `Funding sent, but account is still syncing. Please refresh shortly.` → fundingSyncing
- `Success! 10,000 XLM has been credited to your wallet.` → fundSuccess
- `Wallet funded with 10,000 XLM.` → walletFunded
- `Friendbot funding failed. Please try again.` → friendbotFailed
- `Address copied!` → addressCopied
- `Push notifications are not supported in this browser.` → pushNotSupported
- `Notification permission was not granted.` → permissionNotGranted
- `Payment notifications disabled` → notificationsDisabled
- `This browser does not support notifications.` → browserNoNotifications
- `Notifications are blocked. Please enable them in your browser settings.` → notificationsBlockedHelp
- `Payment notifications enabled` → notificationsEnabled
- `You will now receive notifications for incoming payments.` → notificationsEnabledBody
- `Could not enable notifications. Please try again.` → enableNotificationsFailed
- `You received 10.00 XLM` (bubble + test notification body) → testReceivedMessage
- `Dashboard | Stellar-MicroPay` (meta title) → metaTitle
- `Payment stats` (widget label) → widgetPaymentStats
- `Monthly spending chart` (widget label) → widgetMonthlySpending
- `Selected Period: {label}` → reused key dashboard.selectedPeriod
- `Close month details` (aria-label) → closeMonthDetails
- `30-day volume chart` (widget label) → widgetThirtyDayVolume
- `Top recipients and export` (widget label) → widgetAnalytics
- `Export Payment History` → exportTitle
- `Download your full transaction history as a CSV file.` → exportDescription
- `Exporting…` → exporting
- `Export CSV` → exportCsv
- `Notes are local to this browser and will be included in the export.` → exportNotes
- `Click to collapse` / `Click to show full address` (address title) → clickToCollapse / clickToExpand
- `Collapse` / `Show full` (button ternary) → collapse / showFull
- `Offline snapshot from {time}` → offlineSnapshot ({time})
- `Refreshing...` / `Refresh` → refreshing / refresh
- `Refreshing in {seconds}s` → refreshingIn ({seconds})
- reserve-warning paragraph (`You hold <strong>…</strong>. Your account must keep at least … reserved (… subentries × 0.5 XLM + 2 XLM base). Top up before submitting transactions to avoid <code>tx_insufficient_balance</code>.`) → reserveDetails ({balance},{minimum},{subentries}) — <strong>/<code> emphasis dropped; English wording and `tx_insufficient_balance` token identical
- `Stellar base reserves docs →` → baseReservesDocs
- `` `{b.code} Balance` `` → assetBalance ({asset})
- `Drag to reorder` (title) → dragToReorder
- `` `Drag to reorder ${label}` `` (aria-label) → dragToReorderWidget ({widget})
- `30-Day Volume (XLM)` → thirtyDayVolumeTitle
- `Sent` / `Received` (chart Bar names) → sent / received
- `Top Recipients` → topRecipients
- `No sent payments yet.` → noSentPayments
- `Balance sparkline chart` (aria-label) → sparklineLabel
- `` `Balance trend: ${"upward"|"downward"}` `` → balanceTrendLabel ({direction}) + trendUpward (`upward`) / trendDownward (`downward`)
- `▲ Upward trend` / `▼ Downward trend` → upwardTrend / downwardTrend

## frontend/pages/settings.tsx → `settings.*` (22 new)

- `Failed to create price alert` (throw + fallback) → priceAlert.createFailed
- `Price alert created successfully` → priceAlert.created
- `Are you sure? This will delete your contacts and settings.` (window.confirm) → clearDataConfirm
- `Settings - Stellar MicroPay` (meta title) → metaTitle
- `Display Currency` → fiat.title
- `Fiat equivalent for your XLM balance` → fiat.label
- `Saved locally and shown next to your balance as “X XLM ≈ $Y.YY”.` → fiat.hint (curly quotes + ≈ kept)
- `Automation` → automation.title
- `On/Off Ramp` → ramp.title (kept untranslated in es/ar — product/section name)
- `Price Alerts` → priceAlert.title
- `Asset` / `Direction` (labels) → priceAlert.assetLabel / priceAlert.directionLabel
- `Above` / `Below` (options + alert list rendering) → priceAlert.above / priceAlert.below
- `Target Price (USD)` → priceAlert.targetPriceLabel
- `Creating...` / `Create Alert` → priceAlert.creating / priceAlert.create
- `Your Alerts` → priceAlert.yourAlerts
- `Triggered` / `Active` → priceAlert.triggered / priceAlert.active
- `Delete` → priceAlert.delete
- `Your browser does not support notifications. Alerts will be shown as a banner on the dashboard.` → priceAlert.noNotificationSupport

## frontend/pages/transactions.tsx → `transactions.*` (45 new)

- DIRECTION_FILTERS `All` / `Sent` / `Received` → directionAll / directionSent / directionReceived (array converted to labelKey; also reused for receipt subtitle)
- `Mainnet`/`Testnet` networkLabel → reused `settings.network.mainnet|testnet`
- `Payment Receipt` → receiptTitle
- receipt rows: `Date` → receiptRowDate · `Amount` → receiptRowAmount · `Sender` → receiptRowSender · `Recipient` → receiptRowRecipient · `Memo` → receiptRowMemo · `Transaction Hash` → receiptRowHash · `Network` → receiptRowNetwork (also reused for print-sheet "Network")
- `` `On-chain Receipt #${i}` `` → onChainReceiptTitle ({index})
- `Minted` (subtitle + row) → receiptRowMinted
- receipt rows: `Receipt` → receiptRowReceipt · `Payer` → receiptRowPayer · `Payee` → receiptRowPayee · `Ledger` → receiptRowLedger
- `` `Receipt #${i} minted on-chain.` `` → receiptMinted ({index})
- `Transaction History` (h1 ×2) → title
- `Connect your wallet to view your payments` → connectPrompt
- `Transaction History | Stellar-MicroPay` (meta title) → metaTitle
- `Account:` → accountLabel
- `No transactions to export` (×2) → noToExport
- `Export full history as CSV` / `… as JSON` → exportCsvTitle / exportJsonTitle
- `Exporting…` (×2) → exporting
- `Download CSV` / `Download JSON` → downloadCsv / downloadJson
- `← Dashboard` → backToDashboard
- `` `Preparing full account history export… ${n} records processed.` `` → exportProgress ({count})
- `` `Showing your transaction history. Click "Load more" to view older transactions.` `` → historyHint (straight quotes kept)
- `Full history →` → fullHistory
- `Transactions view` (aria-label) → viewSwitcherLabel
- view switcher `History` / `Receipts` → viewHistory / viewReceipts
- `Dismiss receipt error` (aria-label) → dismissError
- `View receipts →` → viewReceiptsLink
- `Filters` → filters
- `` `${n} active` `` → activeCount ({count})
- `Transaction direction` (aria-label) → directionLabel
- `Minimum Amount` → minimumAmount
- `Search Memo` → searchMemo
- `Filter by memo text…` (placeholder) → memoSearchPlaceholder
- `Reset filters` → resetFilters
- `Generated by Stellar MicroPay using browser print-to-PDF.` → generatedBy

## frontend/components/Navbar.tsx → `navbar.*` (15 new)

- navLinks: `Scheduled` → scheduled · `Leaderboard` → leaderboard (Home/Dashboard/Trade/Transactions/Network/Settings reuse existing navbar.* keys; array converted to labelKey)
- `Custom`/`Mainnet`/`Testnet` networkLabel → reused `settings.network.*`
- `` `Network: ${Level}` `` (fee badge title) → networkFeeTitle ({level}, level capitalized in code as before)
- `` `Network fee status: ${level}` `` (aria-label) → networkFeeStatus ({level})
- `Open AI payment assistant (Cmd+K / Ctrl+K)` (title) → openAssistantTitle
- `Open AI payment assistant. Keyboard shortcut: Command K on Mac, Control K on Windows and Linux.` (aria-label) → openAssistantLabel
- `Ask AI` → askAi
- `Switch to light mode` / `Switch to dark mode` (aria-label ternary) → switchToLightMode / switchToDarkMode
- `Press Ctrl+K / Cmd+K to quick-send` (kbd title) → quickSendTitle
- `Copy wallet address` (aria-label + title) → copyAddress
- `Show disconnect confirmation` (aria-label) → showDisconnectConfirm
- `Close navigation menu` / `Open navigation menu` (aria-label ternary) → closeMenu / openMenu
- `Site navigation` (aria-label) → siteNavigation

## frontend/components/TransactionList.tsx → `transactionList.*` (46 new) — NEW namespace + NEW useTranslation import/hook

- `` `Repeating payment to ${addr}` `` → repeatingPayment ({address})
- `Could not load transaction history.` → loadFailed
- `Try again` → tryAgain
- `No transactions yet` → emptyTitle
- `Send your first payment to get started` → emptyHint
- `Recent Payments` → recentPayments
- `Export the currently filtered transactions as CSV` (title) → exportCsvTitle
- `Export CSV` → exportCsv
- `Refresh` → refresh
- `Search by address, memo, or amount (e.g. >10 XLM)...` (placeholder) → searchPlaceholder
- `Search transactions` (aria-label) → searchLabel
- `Clear search` (aria-label + button) → clearSearch (×2)
- `Offline history snapshot from {time}` → offlineSnapshot ({time})
- `Keyboard navigation: ↑ ↓ to navigate, Enter to copy address` → keyboardNav (↑ ↓ kept)
- `No matching transactions found` → noMatches
- `Try adjusting your search query or filters` → noMatchesHint
- row aria-label parts `Sent`/`Received`/`to`/`from` → sent / received / to / from
- `Sent to` / `Received from` → sentTo / receivedFrom
- `` `Copy ${"recipient"|"sender"} address` `` → copyRecipientAddress / copySenderAddress
- `Private note (local only)…` (placeholder) → notePlaceholder
- `Save` → save
- `Edit note` / `Add note (stored locally)` (title ternary) → editNote / addNote
- `Add note` (aria-label ternary) → addNoteLabel
- `Repeat payment with same destination, amount, and memo` (title) → repeatTitle
- `` `Repeat payment to ${addr}` `` (aria-label) → repeatPaymentTo ({address})
- `Repeat` → repeat
- `Print receipt` (title) → printReceipt
- `` `Print receipt for transaction ${hash}` `` → printReceiptFor ({hash})
- `` `Receipt #${i}` `` → receiptNumber ({index})
- `Mint an on-chain receipt for this payment (signs with your wallet)` (title) → mintReceiptTitle
- `` `Mint receipt for payment to ${addr}` `` → mintReceiptFor ({address})
- `Minting…` / `Mint receipt` → minting / mintReceipt
- `View on Stellar Expert` (title) → viewOnStellarExpert
- `View transaction on Stellar Expert` (aria-label) → viewTxOnStellarExpert
- `Loading more transactions` (aria-label) → loadingMore
- `Loading...` → loading
- `Load more results` / `Load more` → loadMoreResults / loadMore
- `📝 Notes are stored locally and only visible to you.` → notesDisclaimer (emoji kept)

## frontend/components/WalletHealthPanel.tsx → `walletHealth.*` (25 new)

- `Wallet Health` (h2 ×2) → title
- `Failed to load wallet health data.` → loadFailed
- `Total Balance` → totalBalanceLabel
- `Spendable Balance` → spendableBalanceLabel
- `` `${x} locked in reserves` `` → lockedInReserves ({amount})
- `Trustlines` → trustlinesLabel (the count still uses existing pluralized walletHealth.trustlines)
- `` `${x} reserved` `` → reservedAmount ({amount})
- `No extra reserves` → noExtraReserves
- `` `-${n} XLM reserve` `` → xlmReserve ({amount}; keeps the leading `-`)
- `Multi-sig Signers` → signersLabel
- `Master key (this wallet)` → masterKey
- `` `Weight: ${w}` `` → weightLabel ({weight})
- `Home Domain` → homeDomainLabel
- `Not set` → notSet
- `Refresh` → refresh
- `` `Info about ${label}` `` (aria-label) → infoAbout ({label})
- warnings: `Low spendable balance — your account is close to the minimum reserve.` → warningLowSpendable · `` `High number of trustlines (${n}) — each locks 0.5 XLM in reserve.` `` → warningManyTrustlines ({count}) · `` `High number of signers (${n}) — review if all are still needed.` `` → warningManySigners ({count}) · `Master key weight is 0 — your account may require all signers for transactions.` → warningMasterWeightZero (em-dashes kept)
- TOOLTIP_DESCRIPTIONS values now hold i18n keys rendered with `t()`: tooltipTotalBalance, tooltipSpendableBalance, tooltipTrustlines, tooltipSigners, tooltipHomeDomain (5 long descriptions, full English text preserved)

---

## Deliberately skipped (left as literals)

- **memoTemplates** in SendPaymentForm: `Rent`, `Salary`, `Invoice`, `Gift`, `Coffee ☕` — values are stored/compared as on-chain memo payload data, not presentation text.
- **Numeric/technical placeholders**: `0.0000000`, `0.00`, `0.1234567`, `G...`, `https://horizon.example.com`, `#`, `XLM`, `USDC` — format examples and asset codes.
- **Fee speed identifiers**: `slow` / `normal` / `fast` — internal identifiers rendered via CSS `capitalize`, never raw user sentences.
- **`stroops` / `XLM` tokens** — technical units kept untranslated inside estimatedFee and similar strings.
- **dashboard `throw new Error("Unable to load payment stats right now.")` / `"Payment stats response was invalid."`** — errors caught locally; messages never displayed to users.
- **settings `setTourResetMessage("Tour reset — …")`** — value is never rendered anywhere.
- **dashboard `BalanceHistoryChart` block** — dead code, component is never referenced (verified by search).
- **`<meta name="description" …>`** on dashboard/transactions — SEO copy, outside the issue's JSX-text scope.
- **Brand strings**: `Stellar Pay`, `Stellar MicroPay`, `Stellar<span>MicroPay</span>`, `Stellar Expert`, `Friendbot`, `Stellar DEX` — proper nouns, kept as-is in all locales.
- **`sep...`/`SEP-0001`, `stellar.toml`, `uint64`, `hex`, `CSV`, `JSON`, `Ctrl+K / Cmd+K`** — technical identifiers inside translated sentences, left untranslated.

## Notes

- `useCallback` deps updated where `t` became a dependency: transactions handlePrintReceipt /
  handlePrintOnChainReceipt / handleMintReceipt (`[networkLabel, t]`, `[publicKey, t]`),
  TransactionList fetchPayments, WalletHealthPanel loadHealthData.
- Pre-existing (untouched, out of scope): settings.tsx references useRouter, TurretsWizard,
  AnchorRamp, FiatCurrency, getFiatCurrencyPreference, setFiatCurrencyPreference,
  SUPPORTED_FIAT_CURRENCIES without imports; dashboard.tsx references PaymentInsightsCard and
  AddUsdcTrustline without imports. These were broken before this change.
- Original English literals were recovered by reverse-applying this session's edit history and
  diffing against the edited files; every en value in fragment-F.json is character-identical to
  the pre-edit source.

---

## frontend/pages/contacts.tsx (namespace: `contacts`) — 49 keys

Completed in the same sweep after the initial pass missed the file:

- `Contacts` → `contacts.title`
- `Connect your wallet to manage contacts` → `contacts.connectPrompt`
- `Save and manage Stellar addresses` → `contacts.subtitle`
- `Contacts won't be saved in private/incognito mode` → `contacts.storageUnavailable`
- `Add Contact` / `Edit Contact` → `contacts.addContact` / `contacts.editContact`
- `Save Contact` / `Update Contact` → `contacts.saveContact` / `contacts.updateContact`
- `Contact name` / `Stellar address` → `contacts.nameLabel` / `contacts.addressLabel`
- `e.g., Alice, Daily Coffee` / `G... (56 character public key)` / `user*domain.com` → `contacts.namePlaceholder` / `contacts.addressPlaceholder` / `contacts.federationPlaceholder`
- `Invalid Stellar address` → `contacts.invalidAddress` (inline + toast)
- `Federation Lookup` / `Federation address` / `Resolve Stellar Federation addresses to public keys` → `contacts.federationTitle` / `contacts.federationLabel` / `contacts.federationHint`
- `Resolved address:` / `Use` / `Looking up...` / `Resolve Address` → `contacts.resolvedAddress` / `contacts.use` / `contacts.lookingUp` / `contacts.resolveAddress`
- `All` / `Favourites` (filter tabs) → `contacts.filterAll` / `contacts.filterFavourites`
- `Saved Contacts` → `contacts.savedTitle`
- `Export contacts as JSON` / `Export contacts` → `contacts.exportTitle` / `contacts.export`
- `Import contacts from JSON` / `Import contacts` → `contacts.importTitle` / `contacts.import`
- `No contacts yet — add one below ↓` → `contacts.empty`
- `Add to Favourites` / `Remove from Favourites` → `contacts.addFavourite` / `contacts.removeFavourite`
- `Copy address` / `Send XLM to this contact` / `Send` / `Edit contact` / `Delete contact` → `contacts.copyAddress` / `contacts.sendToContact` / `contacts.send` / `contacts.edit` / `contacts.delete`
- `Back to dashboard` → `contacts.backToDashboard`
- Toasts: `Please enter both name and address` → `contacts.errorBothRequired`; `Contact saved` / `Contact updated` / `Contact deleted` → `contacts.saved` / `contacts.updated` / `contacts.deleted`; `Enter a federation address (user*domain.com)` → `contacts.federationRequired`; `Federation lookup successful` / `Federation lookup failed` → `contacts.federationSuccess` / `contacts.federationFailed`; `Address copied to form` / `Address copied` → `contacts.addressCopiedToForm` / `contacts.addressCopied`; `Import failed: malformed JSON file` → `contacts.importFailed`
- `Cancel` button reuses the existing `common.cancel` key.

### Deliberately skipped

- `stellar-micropay-contacts.json` (download filename), `application/json` (MIME type), SVG icons.
