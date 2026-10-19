/**
 * mock-horizon/server.js
 * Configurable Express server that mimics the Stellar Horizon API endpoints
 * used by the backend and frontend during integration tests.
 *
 * Supports configurable latency, random error injection (504/429),
 * rate-limit headers, and specific transaction submission failure result codes
 * (e.g., tx_bad_seq, op_underfunded) via environment variables or runtime control endpoints.
 */

"use strict";

const express = require("express");

const DEFAULT_PORT = process.env.PORT || 8000;

function getEnvConfig() {
  return {
    latencyMs: parseInt(process.env.LATENCY_MS || process.env.MOCK_HORIZON_LATENCY_MS || "0", 10) || 0,
    errorRate: parseFloat(process.env.ERROR_RATE || process.env.MOCK_HORIZON_ERROR_RATE || "0") || 0,
    errorStatus: parseInt(process.env.ERROR_STATUS || process.env.MOCK_HORIZON_ERROR_STATUS || "504", 10) || 504,
    submitResultCode: process.env.SUBMISSION_RESULT_CODE || process.env.MOCK_HORIZON_SUBMIT_RESULT_CODE || null,
    rateLimitLimit: process.env.RATE_LIMIT_LIMIT ? parseInt(process.env.RATE_LIMIT_LIMIT, 10) : null,
    rateLimitRemaining: process.env.RATE_LIMIT_REMAINING ? parseInt(process.env.RATE_LIMIT_REMAINING, 10) : null,
    rateLimitReset: process.env.RATE_LIMIT_RESET ? parseInt(process.env.RATE_LIMIT_RESET, 10) : null,
  };
}

function createMockHorizonApp(initialOverrides = {}) {
  const app = express();
  let config = { ...getEnvConfig(), ...initialOverrides };

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // CORS headers for frontend integration
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  // ── Runtime Control Endpoints ───────────────────────────────────────────────
  app.get("/_control", (req, res) => {
    res.json({ success: true, config });
  });

  app.post("/_control", (req, res) => {
    const updates = req.body || {};
    if (typeof updates.latencyMs === "number") config.latencyMs = Math.max(0, updates.latencyMs);
    if (typeof updates.errorRate === "number") config.errorRate = Math.min(1, Math.max(0, updates.errorRate));
    if (typeof updates.errorStatus === "number") config.errorStatus = updates.errorStatus;
    if ("submitResultCode" in updates) config.submitResultCode = updates.submitResultCode;
    if ("rateLimitLimit" in updates) config.rateLimitLimit = updates.rateLimitLimit;
    if ("rateLimitRemaining" in updates) config.rateLimitRemaining = updates.rateLimitRemaining;
    if ("rateLimitReset" in updates) config.rateLimitReset = updates.rateLimitReset;

    res.json({ success: true, message: "Mock Horizon configuration updated", config });
  });

  app.post("/_control/reset", (req, res) => {
    config = { ...getEnvConfig(), ...initialOverrides };
    res.json({ success: true, message: "Mock Horizon configuration reset to defaults", config });
  });

  // ── Latency, Rate Limit, and Error Injection Middleware ─────────────────────
  app.use(async (req, res, next) => {
    // Control and health routes bypass latency and error injection
    if (req.path.startsWith("/_control") || req.path === "/health") {
      return next();
    }

    // Attach rate-limit headers if configured
    if (config.rateLimitLimit !== null) {
      res.setHeader("X-RateLimit-Limit", config.rateLimitLimit);
    }
    if (config.rateLimitRemaining !== null) {
      res.setHeader("X-RateLimit-Remaining", config.rateLimitRemaining);
    }
    if (config.rateLimitReset !== null) {
      res.setHeader("X-RateLimit-Reset", config.rateLimitReset);
    }

    // Artificial latency
    if (config.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, config.latencyMs));
    }

    // Error-rate injection (e.g. 504 Gateway Timeout or 429 Too Many Requests)
    if (config.errorRate > 0 && Math.random() < config.errorRate) {
      if (config.errorStatus === 429) {
        return res.status(429).json({
          type: "https://stellar.org/horizon-errors/rate_limit_exceeded",
          title: "Rate Limit Exceeded",
          status: 429,
          detail: "The rate limit for the requested endpoint has been exceeded.",
        });
      }

      return res.status(config.errorStatus || 504).json({
        type: "https://stellar.org/horizon-errors/timeout",
        title: "Gateway Timeout",
        status: config.errorStatus || 504,
        detail: "The Horizon server timed out waiting for the response from stellar-core.",
      });
    }

    next();
  });

  // ── Horizon API Endpoints ───────────────────────────────────────────────────

  // Root / capability endpoint
  app.get("/", (req, res) => {
    res.json({
      _links: {
        account: { href: "{base_url}/accounts/{account_id}", templated: true },
        transactions: { href: "{base_url}/transactions{?cursor,limit,order}", templated: true },
      },
      horizon_version: "mock-2.1.0",
      core_version: "mock",
      network_passphrase: "Test SDF Network ; September 2015",
    });
  });

  // Account endpoint
  app.get("/accounts/:accountId", (req, res) => {
    const { accountId } = req.params;

    res.json({
      id: accountId,
      account_id: accountId,
      sequence: "1234567890",
      balances: [
        {
          balance: "100.0000000",
          asset_type: "native",
        },
      ],
      _links: {
        self: { href: `/accounts/${accountId}` },
        transactions: { href: `/accounts/${accountId}/transactions` },
        payments: { href: `/accounts/${accountId}/payments` },
      },
    });
  });

  // Payments endpoint
  app.get("/accounts/:accountId/payments", (req, res) => {
    const { accountId } = req.params;

    res.json({
      _links: {
        self: { href: `/accounts/${accountId}/payments` },
        next: { href: "" },
        prev: { href: "" },
      },
      _embedded: {
        records: [
          {
            id: "mock-payment-1",
            type: "payment",
            from: accountId,
            to: "GBMOCK000RECEIVER000000000000000000000000000000000000000",
            amount: "10.0000000",
            asset_type: "native",
            created_at: new Date().toISOString(),
          },
        ],
      },
    });
  });

  // Transactions endpoint
  app.get("/accounts/:accountId/transactions", (req, res) => {
    res.json({
      _links: { self: { href: "" }, next: { href: "" }, prev: { href: "" } },
      _embedded: { records: [] },
    });
  });

  // Fee stats endpoint
  app.get("/fee_stats", (req, res) => {
    res.json({
      last_ledger: "123456",
      last_ledger_base_fee: "100",
      ledger_capacity_usage: "0.04",
      min_accepted_fee: "100",
      mode_accepted_fee: "100",
      p10_accepted_fee: "100",
      p20_accepted_fee: "100",
      p30_accepted_fee: "100",
      p40_accepted_fee: "100",
      p50_accepted_fee: "100",
      p60_accepted_fee: "100",
      p70_accepted_fee: "100",
      p80_accepted_fee: "100",
      p90_accepted_fee: "100",
      p95_accepted_fee: "100",
      p99_accepted_fee: "100",
    });
  });

  // Ledgers endpoint
  app.get("/ledgers", (req, res) => {
    res.json({
      _embedded: {
        records: [
          {
            id: "ledger-1",
            sequence: 12345,
            closed_at: new Date().toISOString(),
            base_fee_in_stroops: 100,
          },
        ],
      },
    });
  });

  // Submit transaction
  app.post("/transactions", (req, res) => {
    const rawTx = req.body?.tx || "";

    // Specific transaction failure injection
    if (config.submitResultCode) {
      let resultCodes = {};

      if (config.submitResultCode === "tx_bad_seq") {
        resultCodes = { transaction: "tx_bad_seq" };
      } else if (config.submitResultCode === "op_underfunded") {
        resultCodes = {
          transaction: "tx_failed",
          operations: ["op_underfunded"],
        };
      } else {
        resultCodes = {
          transaction: config.submitResultCode,
          operations: [config.submitResultCode],
        };
      }

      return res.status(400).json({
        type: "https://stellar.org/horizon-errors/transaction_failed",
        title: "Transaction Failed",
        status: 400,
        detail: `The transaction failed when submitted to the stellar network: ${config.submitResultCode}`,
        extras: {
          envelope_xdr: rawTx,
          result_codes: resultCodes,
        },
      });
    }

    res.status(200).json({
      hash: "mocktxhash0000000000000000000000000000000000000000000000000000",
      ledger: 12345,
      result_xdr: "",
      envelope_xdr: rawTx,
    });
  });

  // Health check
  app.get("/health", (req, res) => res.json({ status: "ok" }));

  // Helper method on app for programmatic testing
  app.setConfig = (newConfig) => {
    Object.assign(config, newConfig);
  };
  app.getConfig = () => ({ ...config });
  app.resetConfig = () => {
    config = { ...getEnvConfig(), ...initialOverrides };
  };

  return app;
}

const defaultApp = createMockHorizonApp();

if (require.main === module) {
  defaultApp.listen(DEFAULT_PORT, () => {
    console.log(`Mock Horizon server listening on http://0.0.0.0:${DEFAULT_PORT}`);
  });
}

module.exports = {
  createMockHorizonApp,
  app: defaultApp,
};
