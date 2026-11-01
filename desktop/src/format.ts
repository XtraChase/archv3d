// Small formatting helpers shared by the views.

const COUNTRY = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;

export function countryName(code: string | null) {
  if (!code) return '';
  try {
    return COUNTRY?.of(code) ?? code;
  } catch {
    return code;
  }
}

export function place(city: string | null, region: string | null, country: string | null) {
  const parts = [city, country === 'US' ? region : null, country === 'US' ? null : countryName(country)].filter(Boolean);
  return parts.join(', ') || 'Unknown place';
}

export function ago(ts: number | null | undefined) {
  if (!ts) return '';
  const seconds = Math.round((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(ts).toLocaleDateString();
}

export function dateTime(ts: number) {
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function duration(fromIso: string | null) {
  if (!fromIso) return '';
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(fromIso)) / 60000));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

export const number = (value: number | null | undefined) => (value ?? 0).toLocaleString();

export function money(value: number, currency = 'USD') {
  return value.toLocaleString(undefined, { style: 'currency', currency, maximumFractionDigits: 2 });
}

export const list = (value: string | null) => (value ? value.split(',').filter(Boolean) : []);
