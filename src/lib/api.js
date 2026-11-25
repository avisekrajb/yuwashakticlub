const API_BASE = (process.env.REACT_APP_API_URL || "http://localhost:5000/api").replace(/\/+$/, "");
const SOCKET_URL = (process.env.REACT_APP_SOCKET_URL || API_BASE.replace(/\/api$/, "")).replace(/\/+$/, "");
const TOKEN_KEY = "syc_token";

let memoryToken = null;
try {
  memoryToken = localStorage.getItem(TOKEN_KEY) || null;
} catch (_e) {
  memoryToken = null;
}

export function setToken(token) {
  memoryToken = token || null;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (_e) {
    /* storage may be disabled */
  }
}

export function getToken() {
  return memoryToken;
}

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(path, { method = "GET", body, token, headers = {}, signal } = {}) {
  const authToken = token === undefined ? getToken() : token;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const finalHeaders = { ...headers };
  if (authToken) finalHeaders.Authorization = `Bearer ${authToken}`;
  if (body && !isForm) finalHeaders["Content-Type"] = "application/json";

  let response;
  try {
    response = await fetch(API_BASE + path, {
      method,
      headers: finalHeaders,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new ApiError(
      "Cannot reach the server. Check that the backend is running.",
      0,
      "NETWORK"
    );
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (_e) {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    const message = payload?.message || `Request failed (${response.status})`;
    const authFailure =
      response.status === 401 &&
      Boolean(authToken) &&
      !path.startsWith("/auth/login") &&
      !path.startsWith("/auth/register") &&
      !path.startsWith("/calls/");
    if (authFailure) {
      try {
        window.dispatchEvent(new CustomEvent("syc:unauthorized"));
      } catch (_e) {
        /* ignore */
      }
    }
    throw new ApiError(message, response.status, payload?.code, payload?.details);
  }

  return payload && Object.prototype.hasOwnProperty.call(payload, "data") ? payload.data : payload;
}

export const api = {
  base: API_BASE,
  socketUrl: SOCKET_URL,
  get: (path, options = {}) => request(path, { ...options, method: "GET" }),
  post: (path, body, options = {}) => request(path, { ...options, method: "POST", body }),
  put: (path, body, options = {}) => request(path, { ...options, method: "PUT", body }),
  patch: (path, body, options = {}) => request(path, { ...options, method: "PATCH", body }),
  delete: (path, options = {}) => request(path, { ...options, method: "DELETE" }),
  request,
};

export { API_BASE, SOCKET_URL };
