# 🧪 mock-horizon

A configurable [Express](https://expressjs.com/) server that imitates the [Stellar Horizon API](https://developers.stellar.org/docs/data/apis/horizon) endpoints used by the backend and frontend. It lets integration tests run without the live testnet, so they're fast, deterministic, work offline, and can simulate failure scenarios like network latency, gateway timeouts (504), rate limits (429), and transaction failure result codes (`tx_bad_seq`, `op_underfunded`).

It runs as the `mock-horizon` service in [`docker-compose.test.yml`](../docker-compose.test.yml).

---

## 🚀 Running it

### With the integration test stack (what CI does)

```bash
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-test
docker compose -f docker-compose.test.yml down --volumes --remove-orphans
```

`backend-test` waits for the mock's `/health` healthcheck, then runs `npm test` with `HORIZON_URL=http://mock-horizon:8000`.

### On its own

```bash
# Docker
docker compose -f docker-compose.test.yml up --build mock-horizon   # → http://localhost:8000

# Or plain Node (20.19.5, see ../.nvmrc)
cd mock-horizon && npm install && npm start                          # → http://localhost:8000
PORT=8123 npm start                                                  # any other port
```

Quick check:

```bash
curl http://localhost:8000/health                       # {"status":"ok"}
curl http://localhost:8000/accounts/GABC                 # any ID works
```

---

## ⚡ Failure Injection & Configuration

Mock Horizon can be configured at startup via **environment variables** or at runtime via the **`/_control`** HTTP endpoint for per-test toggling.

### Configuration Parameters

| Parameter | Environment Variable | Default | Description |
| --- | --- | --- | --- |
| `latencyMs` | `LATENCY_MS` | `0` | Artificial delay added to responses in milliseconds. Useful for testing timeouts and circuit breaker behavior. |
| `errorRate` | `ERROR_RATE` | `0` | Probability between `0.0` and `1.0` of injecting an error response. |
| `errorStatus` | `ERROR_STATUS` | `504` | HTTP status code to return when error injection triggers (`504` Gateway Timeout or `429` Rate Limit Exceeded). |
| `submitResultCode` | `SUBMISSION_RESULT_CODE` | `null` | When set, `POST /transactions` fails with HTTP 400 and returns a Horizon problem document with this result code (e.g. `tx_bad_seq`, `op_underfunded`). |
| `rateLimitLimit` | `RATE_LIMIT_LIMIT` | `null` | Value for `X-RateLimit-Limit` response header. |
| `rateLimitRemaining` | `RATE_LIMIT_REMAINING` | `null` | Value for `X-RateLimit-Remaining` response header. |
| `rateLimitReset` | `RATE_LIMIT_RESET` | `null` | Value for `X-RateLimit-Reset` response header (seconds). |

---

### Runtime Control Endpoint (`/_control`)

You can dynamically adjust failure injection on the fly without restarting the server:

#### 1. Inspect Current Configuration
```bash
curl http://localhost:8000/_control
```
Response:
```json
{
  "success": true,
  "config": {
    "latencyMs": 0,
    "errorRate": 0,
    "errorStatus": 504,
    "submitResultCode": null,
    "rateLimitLimit": null,
    "rateLimitRemaining": null,
    "rateLimitReset": null
  }
}
```

#### 2. Inject Artificial Latency
Add a 200ms delay to every Horizon call:
```bash
curl -X POST http://localhost:8000/_control \
  -H "Content-Type: application/json" \
  -d '{"latencyMs": 200}'
```

#### 3. Inject Gateway Timeout (504) or Rate Limiting (429)
Make 50% of Horizon requests fail with a 504 Gateway Timeout:
```bash
curl -X POST http://localhost:8000/_control \
  -H "Content-Type: application/json" \
  -d '{"errorRate": 0.5, "errorStatus": 504}'
```

Simulate Horizon 429 Too Many Requests:
```bash
curl -X POST http://localhost:8000/_control \
  -H "Content-Type: application/json" \
  -d '{"errorRate": 1.0, "errorStatus": 429}'
```

#### 4. Inject Transaction Submission Failures
Simulate `tx_bad_seq` sequence mismatch error:
```bash
curl -X POST http://localhost:8000/_control \
  -H "Content-Type: application/json" \
  -d '{"submitResultCode": "tx_bad_seq"}'
```
`POST /transactions` returns HTTP 400 with:
```json
{
  "type": "https://stellar.org/horizon-errors/transaction_failed",
  "title": "Transaction Failed",
  "status": 400,
  "extras": {
    "result_codes": {
      "transaction": "tx_bad_seq"
    }
  }
}
```

Simulate `op_underfunded` (insufficient balance):
```bash
curl -X POST http://localhost:8000/_control \
  -H "Content-Type: application/json" \
  -d '{"submitResultCode": "op_underfunded"}'
```
`POST /transactions` returns HTTP 400 with:
```json
{
  "type": "https://stellar.org/horizon-errors/transaction_failed",
  "title": "Transaction Failed",
  "status": 400,
  "extras": {
    "result_codes": {
      "transaction": "tx_failed",
      "operations": ["op_underfunded"]
    }
  }
}
```

#### 5. Reset to Default Configuration
```bash
curl -X POST http://localhost:8000/_control/reset
```

---

## 📡 Implemented endpoints

| Method | Path | Response |
| --- | --- | --- |
| `GET` | `/` | Root document: `horizon_version: "mock-2.1.0"`, `core_version: "mock"`, testnet `network_passphrase` |
| `GET` | `/health` | `{"status":"ok"}`. Healthcheck endpoint (bypasses latency and error injection). |
| `GET` | `/_control` | Get current mock configuration. |
| `POST` | `/_control` | Dynamically update mock configuration. |
| `POST` | `/_control/reset` | Reset mock configuration to defaults. |
| `GET` | `/accounts/:accountId` | Account record (see fixtures). |
| `GET` | `/accounts/:accountId/payments` | One-record page with a single native payment. |
| `GET` | `/accounts/:accountId/transactions` | Empty page (`records: []`). |
| `GET` | `/fee_stats` | Fee stats breakdown (min, p50, p90, max). |
| `GET` | `/ledgers` | Recent ledger record. |
| `POST` | `/transactions` | Submits transaction. Responds 200 with hash or 400 if `submitResultCode` configured. |

---

## 🗂 Fixtures

The mock has no state and no account list. **Every account ID is accepted** and gets standard testnet fixtures:

| Field | Value |
| --- | --- |
| `sequence` | `"1234567890"` |
| `balances` | `[{ "asset_type": "native", "balance": "100.0000000" }]` |
| Payment `id` | `"mock-payment-1"` |
| Payment | `10.0000000` XLM `from` the requested account `to` `GBMOCK000RECEIVER000000000000000000000000000000000000000` |
| Payment `created_at` | Current time |
| Submitted tx `hash` | `mocktxhash0000000000000000000000000000000000000000000000000000` |
| Submitted tx `ledger` | `12345` |
| Network passphrase | `Test SDF Network ; September 2015` (testnet) |
