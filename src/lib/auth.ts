/**
 * Authentication helpers for PrintOS.
 *
 * Session tokens are base64-encoded JSON objects: { username, expiresAt }
 * This is sufficient for a single-user local app — it is not a cryptographic
 * security boundary.
 */

export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

const STORAGE_KEY = "print-os-session";

/**
 * Validates the submitted credentials against the env-var credential pair.
 * On match, creates a session token and returns it as a base64 string.
 * On mismatch, returns null.
 */
export function validateCredentials(
  username: string,
  password: string
): string | null {
  const expectedUsername = import.meta.env.VITE_AUTH_USERNAME;
  const expectedPassword = import.meta.env.VITE_AUTH_PASSWORD;

  if (username !== expectedUsername || password !== expectedPassword) {
    return null;
  }

  const payload = {
    username,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };

  return btoa(JSON.stringify(payload));
}

/**
 * Writes the session token to localStorage.
 */
export function storeToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

/**
 * Reads the session token from localStorage.
 * Returns null if not found.
 */
export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

/**
 * Removes the session token from localStorage.
 */
export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Decodes and validates a session token.
 * Returns false if the token is malformed or expired.
 * Returns true if the token is well-formed and not yet expired.
 */
export function isTokenValid(token: string): boolean {
  try {
    const decoded = JSON.parse(atob(token));
    if (typeof decoded?.expiresAt !== "number") {
      return false;
    }
    return decoded.expiresAt > Date.now();
  } catch {
    return false;
  }
}

/**
 * Returns true if there is a valid (non-expired) session token in localStorage.
 */
export function isAuthenticated(): boolean {
  const token = getToken();
  if (token === null) {
    return false;
  }
  return isTokenValid(token);
}
