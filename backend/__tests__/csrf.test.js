/**
 * __tests__/csrf.test.js
 * Tests for the double-submit cookie CSRF protection, token lifecycle, rotation, and expiry.
 */

"use strict";

const request = require("supertest");
const app = require("../src/server");
const {
  parseCookies,
  tokensMatch,
  generateCsrfToken,
  isTokenExpired,
  isRouteExempt,
  CSRF_COOKIE,
  CSRF_HEADER,
  CSRF_TOKEN_TTL_MS,
  EXEMPT_PREFIXES,
} = require("../src/middleware/csrf");

describe("CSRF protection & token lifecycle (#1415)", () => {
  describe("helpers", () => {
    it("parses a Cookie header into a map", () => {
      expect(parseCookies("a=1; b=two; c")).toEqual({ a: "1", b: "two" });
      expect(parseCookies(undefined)).toEqual({});
    });

    it("compares tokens in constant time and rejects mismatches", () => {
      expect(tokensMatch("token", "token")).toBe(true);
      expect(tokensMatch("token", "other")).toBe(false);
      expect(tokensMatch("short", "longertoken")).toBe(false);
      expect(tokensMatch(null, "token")).toBe(false);
    });

    it("generates unpredictable hex tokens", () => {
      const a = generateCsrfToken();
      const b = generateCsrfToken();
      expect(a).toMatch(/^[0-9a-f]{64}$/);
      expect(a).not.toEqual(b);
    });

    it("detects expired tokens vs fresh tokens", () => {
      const now = Date.now();
      const freshToken = generateCsrfToken(now);
      const expiredToken = generateCsrfToken(now - (CSRF_TOKEN_TTL_MS + 60_000));

      expect(isTokenExpired(freshToken)).toBe(false);
      expect(isTokenExpired(expiredToken)).toBe(true);
    });

    it("identifies exempt route prefixes correctly", () => {
      expect(isRouteExempt("/api/auth/csrf")).toBe(true);
      expect(isRouteExempt("/api/auth/verify")).toBe(true);
      expect(isRouteExempt("/federation")).toBe(true);
      expect(isRouteExempt("/api/accounts/register")).toBe(false);
      expect(isRouteExempt("/api/payments/submit")).toBe(false);
      expect(isRouteExempt(null)).toBe(false);
    });
  });

  describe("Token issuance & rotation", () => {
    it("issues a readable csrfToken cookie via GET /api/auth/csrf", async () => {
      const res = await request(app).get("/api/auth/csrf").expect(200);

      expect(typeof res.body.csrfToken).toBe("string");
      expect(res.body.csrfToken).toMatch(/^[0-9a-f]{64}$/);

      const cookie = res.headers["set-cookie"].find((c) =>
        c.startsWith(`${CSRF_COOKIE}=`),
      );
      expect(cookie).toBeDefined();
      expect(cookie).toContain(res.body.csrfToken);
      // Must be readable by the frontend to echo it back.
      expect(cookie).not.toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Strict/i);
    });

    it("rotates token via POST /api/auth/csrf/rotate and supersedes old token", async () => {
      // 1. Get initial token
      const res1 = await request(app).get("/api/auth/csrf").expect(200);
      const oldToken = res1.body.csrfToken;

      // 2. Rotate token
      const res2 = await request(app).post("/api/auth/csrf/rotate").expect(200);
      const newToken = res2.body.csrfToken;

      expect(newToken).toMatch(/^[0-9a-f]{64}$/);
      expect(newToken).not.toEqual(oldToken);

      // 3. Request with old token against new cookie is rejected
      const failRes = await request(app)
        .post("/api/accounts/register")
        .set("Cookie", `${CSRF_COOKIE}=${newToken}`)
        .set(CSRF_HEADER, oldToken)
        .send({ username: "csrf_old", publicKey: "G".repeat(56) });

      expect(failRes.status).toBe(403);
      expect(failRes.body.error).toMatch(/invalid or missing CSRF token/i);

      // 4. Request with new token against new cookie succeeds
      const okRes = await request(app)
        .post("/api/accounts/register")
        .set("Cookie", `${CSRF_COOKIE}=${newToken}`)
        .set(CSRF_HEADER, newToken)
        .send({ username: "csrf_new", publicKey: "G".repeat(56) });

      expect(okRes.status).not.toBe(403);
    });
  });

  describe("Expired token rejection", () => {
    it("rejects state-changing requests when CSRF token has expired", async () => {
      // Create a token issued 25 hours ago
      const expiredTimestamp = Date.now() - (CSRF_TOKEN_TTL_MS + 3600_000);
      const expiredToken = generateCsrfToken(expiredTimestamp);

      const res = await request(app)
        .post("/api/accounts/register")
        .set("Cookie", `${CSRF_COOKIE}=${expiredToken}`)
        .set(CSRF_HEADER, expiredToken)
        .send({ username: "csrf_exp", publicKey: "G".repeat(56) });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/CSRF token has expired/i);
    });
  });

  describe("Exempt routes & safe methods", () => {
    it("exempts /api/auth routes even when cookies are present without CSRF header", async () => {
      const res = await request(app)
        .post("/api/auth/csrf/rotate")
        .set("Cookie", `${CSRF_COOKIE}=somecookievalue`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.csrfToken).toBeDefined();
    });

    it("allows stateless requests that carry no cookies (pure bearer clients)", async () => {
      const res = await request(app)
        .post("/api/accounts/register")
        .send({ username: "csrf_nostat", publicKey: "G".repeat(56) });
      expect(res.status).not.toBe(403);
    });

    it("blocks a cookie-bearing request with no CSRF header", async () => {
      const res = await request(app)
        .post("/api/accounts/register")
        .set("Cookie", `${CSRF_COOKIE}=abc123`)
        .send({ username: "csrf_nohdr", publicKey: "G".repeat(56) });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/CSRF/i);
    });

    it("blocks a cookie-bearing request with a mismatched header", async () => {
      const res = await request(app)
        .post("/api/accounts/register")
        .set("Cookie", `${CSRF_COOKIE}=abc123`)
        .set(CSRF_HEADER, "wrong-token")
        .send({ username: "csrf_bad", publicKey: "G".repeat(56) });

      expect(res.status).toBe(403);
    });

    it("allows a cookie-bearing request with a matching header", async () => {
      const token = generateCsrfToken();
      const res = await request(app)
        .post("/api/accounts/register")
        .set("Cookie", `${CSRF_COOKIE}=${token}`)
        .set(CSRF_HEADER, token)
        .send({ username: "csrf_ok", publicKey: "G".repeat(56) });

      expect(res.status).not.toBe(403);
    });

    it("never blocks safe methods (GET, HEAD, OPTIONS)", async () => {
      const res = await request(app)
        .get("/api/accounts/resolve/nobody")
        .set("Cookie", `${CSRF_COOKIE}=abc123`);
      expect(res.status).not.toBe(403);
    });
  });

  describe("CORS & Preflight", () => {
    it("includes X-CSRF-Token in CORS allowedHeaders during preflight OPTIONS", async () => {
      const res = await request(app)
        .options("/api/accounts/register")
        .set("Origin", "http://localhost:3000")
        .set("Access-Control-Request-Method", "POST")
        .set("Access-Control-Request-Headers", "X-CSRF-Token, Content-Type");

      expect(res.status).toBe(204);
      const allowedHeaders = res.headers["access-control-allow-headers"];
      expect(allowedHeaders).toBeDefined();
      expect(allowedHeaders.toLowerCase()).toContain("x-csrf-token");
    });
  });
});
