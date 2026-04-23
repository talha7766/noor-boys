import CryptoJS from "crypto-js";
import Constants from "expo-constants";

// const APP_KEY = Constants.expoConfig?.extra?.APP_KEY;
const APP_KEY = process.env.EXPO_PUBLIC_APP_KEY;
const PLATFORM = Constants.platform?.ios ? "ios" : "android";
const SIGNING_SECRET = process.env.EXPO_PUBLIC_SIGNING_SECRET;

/**
 * Create HMAC SHA256 signature (hex)
 */

async function signRequest(
  method: string,
  urlPath: string,
  body: any,
  timestamp: string
) {
  const payload = `${method}${urlPath}${timestamp}${body || "{}"}`;

  const hash = CryptoJS.HmacSHA256(payload, SIGNING_SECRET!).toString(
    CryptoJS.enc.Hex
  );
  return hash;
}
/**
 * Generate HMAC SHA256 signature and required headers for API requests
 */
export async function getSignedHeaders(
  method: string,
  url: string,
  body?: any,
  token?: string
): Promise<Record<string, string>> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const urlPath = new URL(url).pathname;
  const payload = `${method}${urlPath}${timestamp}${body || "{}"}`;
  const signature = CryptoJS.HmacSHA256(payload, SIGNING_SECRET!).toString(
    CryptoJS.enc.Hex
  );

  const headers: Record<string, string> = {
    "X-App-Key": APP_KEY!,
    "X-Platform": PLATFORM,
    "X-Timestamp": timestamp,
    "X-Signature": signature,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Only set JSON header if body exists
  if (body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}
export async function apiFetch(
  url: string,
  options: RequestInit = {},
  token?: string
) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const method = (options.method || "GET").toUpperCase();
  // IMPORTANT: backend expects PATH only, not full URL
  const urlPath = new URL(url).pathname;
  const body = options.body;

  const signature = await signRequest(method, urlPath, body, timestamp);

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    "X-App-Key": APP_KEY!,
    "X-Platform": PLATFORM,
    "X-Timestamp": timestamp,
    "X-Signature": signature,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Only set JSON header if body exists
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  /**
   * 401 HANDLING STRATEGY
   * - Backend only returns 401 for:
   *   • Invalid token
   *   • Platform mismatch
   *   • Signature failure
   * - NOT for expiry (by design)
   */
  if (res.status === 401) {
    throw new Error("Session invalid");
  }

  return res;
}
