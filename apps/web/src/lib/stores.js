import { get, writable } from 'svelte/store';
import { browser } from '$app/environment';
import { API_URL } from './api';

export const auth = writable({
  token: browser ? localStorage.getItem('token') : null,
  user: browser ? JSON.parse(localStorage.getItem('user') || 'null') : null,
});

export function setAuth(token, user) {
  if (browser) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }
  auth.set({ token, user });
}

export function clearAuth() {
  if (browser) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
  auth.set({ token: null, user: null });
}

export const currency = writable({
  selected: browser ? localStorage.getItem('currency') || 'USD' : 'USD',
  exchangeRate: 1,
  loading: false
});

export function setCurrency(currencyCode) {
  if (browser) {
    localStorage.setItem('currency', currencyCode);
  }
  currency.update(c => ({ ...c, selected: currencyCode }));
}

export async function fetchExchangeRate() {
  currency.update(c => ({ ...c, loading: true }));
  try {
    const res = await fetch(`${API_URL}/api/exchange-rate`);
    const data = await res.json();
    if (data.rate) {
      currency.update(c => ({ ...c, exchangeRate: data.rate, loading: false }));
    }
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    currency.update(c => ({ ...c, loading: false }));
  }
}

export function formatCurrency(amount) {
  const { selected, exchangeRate } = get(currency);
  // Backend stores amounts in USD (base currency)
  // If MXN is selected, convert USD to MXN by multiplying by exchange rate
  // If USD is selected, keep as-is
  const convertedAmount = selected === 'MXN' ? amount * exchangeRate : amount;
  return new Intl.NumberFormat('es', {
    style: 'currency',
    currency: selected
  }).format(convertedAmount || 0);
}

export async function api(path, options = {}) {
  const { token } = get(auth);
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    clearAuth();
    if (browser && !location.pathname.startsWith('/login')) location.href = '/login';
    throw new Error('Sesión expirada');
  }
  const ct = res.headers.get('content-type') || '';
  const body = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(body?.error || `Error ${res.status}`);
  return body;
}
