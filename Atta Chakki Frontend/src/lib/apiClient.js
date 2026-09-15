/**
 * Thin fetch wrapper for the Atta Chakki backend.
 *
 * Purpose:
 *  - Replace the ~200 raw `fetch(...)` calls scattered across pages with 4 helpers
 *    that always return the same {ok, data, error} shape.
 *  - Auth (JWT), 401 logout, and HTML-instead-of-JSON retry are already handled by
 *    `utils/apiInterceptor.js` (monkey-patches window.fetch globally). This file
 *    does NOT duplicate any of that — it only removes per-call boilerplate.
 *  - Backend response envelope is {success, message?, data?, ...rest}. We unwrap it.
 *
 * Not migrated yet: existing pages keep raw fetch until Phase 2/3 touches them.
 */

import { API_BASE_URL } from '../config';

const DEFAULT_HEADERS = { 'Content-Type': 'application/json' };

function buildUrl(path, query) {
  const base = path.startsWith('http') ? path : `${API_BASE_URL}/${path.replace(/^\//, '')}`;
  if (!query || typeof query !== 'object') return base;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    usp.append(k, String(v));
  }
  const qs = usp.toString();
  return qs ? `${base}${base.includes('?') ? '&' : '?'}${qs}` : base;
}

/**
 * @typedef {{ ok: boolean, data: any, error: string | null, status: number }} ApiResult
 */

async function request(method, path, { body, query, headers, signal } = {}) {
  const url = buildUrl(path, query);
  const init = {
    method,
    headers: { ...DEFAULT_HEADERS, ...(headers || {}) },
    signal,
  };
  if (body !== undefined && method !== 'GET') {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  try {
    const res = await fetch(url, init);
    let json = null;
    try {
      json = await res.json();
    } catch {
      return { ok: false, data: null, error: 'Invalid server response', status: res.status };
    }

    // Backend envelope: {success: true/false, message?, ...}
    if (json && typeof json === 'object' && 'success' in json) {
      if (json.success) {
        // Prefer json.data when present; otherwise return the whole payload without the envelope key.
        const { success: _s, message: _m, ...rest } = json;
        const data = json.data !== undefined ? json.data : rest;
        return { ok: true, data, error: null, status: res.status };
      }
      return {
        ok: false,
        data: null,
        error: json.message || `Request failed (${res.status})`,
        status: res.status,
      };
    }

    // No envelope — return raw JSON as data if HTTP OK.
    if (res.ok) return { ok: true, data: json, error: null, status: res.status };
    return { ok: false, data: null, error: `Request failed (${res.status})`, status: res.status };
  } catch (err) {
    // Network error / aborted / offline
    if (err?.name === 'AbortError') {
      return { ok: false, data: null, error: 'Cancelled', status: 0 };
    }
    return {
      ok: false,
      data: null,
      error: err?.message || 'Network error',
      status: 0,
    };
  }
}

export const apiGet = (path, options) => request('GET', path, options);
export const apiPost = (path, body, options) => request('POST', path, { ...options, body });
export const apiPut = (path, body, options) => request('PUT', path, { ...options, body });
export const apiDelete = (path, options) => request('DELETE', path, options);

/**
 * Convenience: raise a toast on error automatically.
 * Usage: const r = await apiGetWithToast('/get_orders.php'); if (!r.ok) return;
 */
export async function apiWithToast(fn, toast) {
  const r = await fn();
  if (!r.ok && toast?.error) toast.error(r.error);
  return r;
}
