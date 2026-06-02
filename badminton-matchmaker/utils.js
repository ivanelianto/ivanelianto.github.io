export function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function nowTimestamp() {
  return Date.now();
}

export function formatDateNice(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function formatTime12h(timestamp) {
  if (!timestamp) return '';
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(timestamp));
}

export function formatScheduleLabel(schedule) {
  if (!schedule) return '';

  const title = String(schedule.title ?? '').trim();
  if (title && title !== 'Badminton Session') return title;

  const datePart = formatDateNice(schedule.dateISO);
  const timePart = formatTime12h(schedule.createdAt);
  if (datePart && timePart) return `${datePart} - ${timePart}`;
  if (datePart) return datePart;
  return title;
}

export function formatDateLongID(iso) {
  if (!iso) return '';

  const [y, m, d] = iso.split('-').map((x) => Number(x));
  if (!y || !m || !d) return iso;

  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dt);
}

export function parseQueryJSON(str, fallback) {
  try {
    const value = JSON.parse(str);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

export function normalizeName(n) {
  return String(n ?? '').trim();
}

export function capitalizeEachWord(s) {
  const str = String(s ?? '').trim();
  if (!str) return '';
  return str
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      return part
        .split('-')
        .map((chunk) => (chunk ? chunk[0].toUpperCase() + chunk.slice(1).toLowerCase() : chunk))
        .join('-');
    })
    .join('');
}
