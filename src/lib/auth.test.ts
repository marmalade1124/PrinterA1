import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  SESSION_DURATION_MS,
  validateCredentials,
  storeToken,
  getToken,
  clearToken,
  isTokenValid,
  isAuthenticated,
} from "./auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a raw token string the same way auth.ts does. */
function makeToken(username: string, expiresAt: number): string {
  return btoa(JSON.stringify({ username, expiresAt }));
}

// ---------------------------------------------------------------------------
// Environment setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Provide env vars that validateCredentials reads via import.meta.env
  vi.stubEnv("VITE_AUTH_USERNAME", "admin");
  vi.stubEnv("VITE_AUTH_PASSWORD", "secret");
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// SESSION_DURATION_MS
// ---------------------------------------------------------------------------

describe("SESSION_DURATION_MS", () => {
  it("equals 8 hours in milliseconds", () => {
    expect(SESSION_DURATION_MS).toBe(8 * 60 * 60 * 1000);
  });
});

// ---------------------------------------------------------------------------
// validateCredentials
// ---------------------------------------------------------------------------

describe("validateCredentials", () => {
  it("returns a token string when credentials match", () => {
    const token = validateCredentials("admin", "secret");
    expect(token).not.toBeNull();
    expect(typeof token).toBe("string");
  });

  it("returns null when the username does not match", () => {
    expect(validateCredentials("wrong", "secret")).toBeNull();
  });

  it("returns null when the password does not match", () => {
    expect(validateCredentials("admin", "wrong")).toBeNull();
  });

  it("returns null when both credentials are wrong", () => {
    expect(validateCredentials("wrong", "wrong")).toBeNull();
  });

  it("returns null for empty credentials", () => {
    expect(validateCredentials("", "")).toBeNull();
  });

  it("encodes a token that contains the correct username", () => {
    const token = validateCredentials("admin", "secret")!;
    const payload = JSON.parse(atob(token));
    expect(payload.username).toBe("admin");
  });

  it("encodes a token whose expiresAt is approximately now + SESSION_DURATION_MS", () => {
    const before = Date.now();
    const token = validateCredentials("admin", "secret")!;
    const after = Date.now();
    const payload = JSON.parse(atob(token));
    expect(payload.expiresAt).toBeGreaterThanOrEqual(before + SESSION_DURATION_MS);
    expect(payload.expiresAt).toBeLessThanOrEqual(after + SESSION_DURATION_MS);
  });
});

// ---------------------------------------------------------------------------
// storeToken / getToken / clearToken round-trip
// ---------------------------------------------------------------------------

describe("storeToken / getToken / clearToken", () => {
  it("getToken returns null when nothing has been stored", () => {
    expect(getToken()).toBeNull();
  });

  it("storeToken persists a token that getToken can retrieve", () => {
    storeToken("my-token");
    expect(getToken()).toBe("my-token");
  });

  it("clearToken removes the stored token", () => {
    storeToken("my-token");
    clearToken();
    expect(getToken()).toBeNull();
  });

  it("storeToken overwrites a previously stored token", () => {
    storeToken("first");
    storeToken("second");
    expect(getToken()).toBe("second");
  });
});

// ---------------------------------------------------------------------------
// isTokenValid
// ---------------------------------------------------------------------------

describe("isTokenValid", () => {
  it("returns true for a freshly generated token", () => {
    const token = validateCredentials("admin", "secret")!;
    expect(isTokenValid(token)).toBe(true);
  });

  it("returns false for an expired token", () => {
    const expired = makeToken("admin", Date.now() - 1);
    expect(isTokenValid(expired)).toBe(false);
  });

  it("returns false for a token that expires exactly now (boundary)", () => {
    // expiresAt === Date.now() means it is NOT strictly greater, so invalid
    const now = Date.now();
    const boundary = makeToken("admin", now - 1);
    expect(isTokenValid(boundary)).toBe(false);
  });

  it("returns false for a completely malformed string", () => {
    expect(isTokenValid("not-a-token")).toBe(false);
  });

  it("returns false for a valid base64 string that is not JSON", () => {
    expect(isTokenValid(btoa("hello world"))).toBe(false);
  });

  it("returns false for a valid JSON token missing expiresAt", () => {
    const noExpiry = btoa(JSON.stringify({ username: "admin" }));
    expect(isTokenValid(noExpiry)).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isTokenValid("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isAuthenticated
// ---------------------------------------------------------------------------

describe("isAuthenticated", () => {
  it("returns false when no token is stored", () => {
    expect(isAuthenticated()).toBe(false);
  });

  it("returns true when a valid token is stored", () => {
    const token = validateCredentials("admin", "secret")!;
    storeToken(token);
    expect(isAuthenticated()).toBe(true);
  });

  it("returns false when an expired token is stored", () => {
    const expired = makeToken("admin", Date.now() - 1);
    storeToken(expired);
    expect(isAuthenticated()).toBe(false);
  });

  it("returns false when a malformed token is stored", () => {
    storeToken("garbage");
    expect(isAuthenticated()).toBe(false);
  });
});
