/** Name of the httpOnly cookie that carries the session token. */
export const SESSION_COOKIE_NAME = 'inquirydesk_session';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Largest value a PostgreSQL INTEGER column can hold. */
export const MAX_INT_ID = 2_147_483_647;

/** Human-friendly reference shown in the UI, e.g. INQ-1012. */
export function formatReference(id: number): string {
  return `INQ-${id}`;
}
