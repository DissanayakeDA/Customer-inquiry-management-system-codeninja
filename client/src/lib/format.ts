import { isEmail } from '@inquirydesk/shared';

export function timeAgo(iso: string, now: number = Date.now()): string {
  const seconds = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** mailto:/tel: link for a customer contact, so staff can reply in one click. */
export function contactHref(contact: string): string {
  return isEmail(contact) ? `mailto:${contact}` : `tel:${contact.replace(/[^\d+]/g, '')}`;
}

/** Only allow same-site relative paths after sign-in, never `//evil.example` or absolute URLs. */
export function safeRedirectPath(value: string | null, fallback = '/dashboard'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (value.startsWith('/login')) return fallback;
  return value;
}
