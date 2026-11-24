import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './constants';
import { INQUIRY_STATUSES } from './status';

/**
 * Validation rules shared by the browser (instant feedback) and the API (the real gatekeeper).
 * The API never trusts the client: it parses every request body with these same schemas.
 */

export const INQUIRY_LIMITS = {
  customerName: { min: 2, max: 120 },
  contact: { max: 120 },
  subject: { min: 3, max: 150 },
  description: { min: 10, max: 2000 },
} as const;

// ---------------------------------------------------------------- contact rules

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Digits with optional leading +, spaces, dashes and parentheses, e.g. "+94 77 123-4567". */
const PHONE_PATTERN = /^\+?[\d\s()-]+$/;

export function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

export function isPhoneNumber(value: string): boolean {
  if (!PHONE_PATTERN.test(value)) return false;
  const digitCount = value.replace(/\D/g, '').length;
  return digitCount >= 7 && digitCount <= 15;
}

/** A contact is "a way to reach the customer": an email address or a phone number. */
export function isValidContact(value: string): boolean {
  return isEmail(value) || isPhoneNumber(value);
}

// ---------------------------------------------------------------- helpers

interface TextRule {
  label: string;
  required: string;
  min?: { value: number; message: string };
  max: number;
}

/** Trimmed, required text with min/max length. Whitespace-only input counts as missing. */
function requiredText(rule: TextRule) {
  let schema = z.string({ error: rule.required }).trim().min(1, rule.required);
  if (rule.min) schema = schema.min(rule.min.value, rule.min.message);
  return schema.max(rule.max, `${rule.label} must be ${rule.max} characters or fewer.`);
}

const positiveId = (message: string) => z.number({ error: message }).int(message).positive(message);

const objectBody = <T extends z.ZodRawShape>(shape: T) =>
  z.object(shape, { error: 'Request body must be a JSON object.' });

export type FieldErrors = Record<string, string>;

/** Flattens a ZodError into `{ field: firstMessage }`, the shape the forms and the API both use. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.map(String).join('.') : 'body';
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

// ---------------------------------------------------------------- auth

export const loginSchema = objectBody({
  email: z
    .string({ error: 'Email is required.' })
    .trim()
    .toLowerCase()
    .min(1, 'Email is required.')
    .max(254, 'Email is too long.')
    .regex(EMAIL_PATTERN, 'Enter a valid email address.'),
  password: z
    .string({ error: 'Password is required.' })
    .min(1, 'Password is required.')
    .max(200, 'Password is too long.'),
});

export type LoginInput = z.input<typeof loginSchema>;
export type LoginData = z.output<typeof loginSchema>;

// ---------------------------------------------------------------- inquiries

const CONTACT_REQUIRED = 'Add an email or phone number so we can reply.';

export const createInquirySchema = objectBody({
  customerName: requiredText({
    label: 'Customer name',
    required: 'Customer name is required.',
    min: { value: INQUIRY_LIMITS.customerName.min, message: 'Name must be at least 2 characters.' },
    max: INQUIRY_LIMITS.customerName.max,
  }),
  contact: z
    .string({ error: CONTACT_REQUIRED })
    .trim()
    .min(1, CONTACT_REQUIRED)
    .max(INQUIRY_LIMITS.contact.max, `Contact must be ${INQUIRY_LIMITS.contact.max} characters or fewer.`)
    .refine(isValidContact, 'Enter a valid email (name@example.com) or phone number (7–15 digits).'),
  subject: requiredText({
    label: 'Subject',
    required: 'Subject is required.',
    min: { value: INQUIRY_LIMITS.subject.min, message: 'Subject must be at least 3 characters.' },
    max: INQUIRY_LIMITS.subject.max,
  }),
  description: requiredText({
    label: 'Description',
    required: 'Describe what the customer needs.',
    min: { value: INQUIRY_LIMITS.description.min, message: 'Add a bit more detail (at least 10 characters).' },
    max: INQUIRY_LIMITS.description.max,
  }),
  /** Optional owner. Omitted or null means "unassigned". */
  assignedToId: positiveId('Choose a valid staff member.').nullable().optional(),
});

export type CreateInquiryInput = z.input<typeof createInquirySchema>;
export type CreateInquiryData = z.output<typeof createInquirySchema>;

const versionField = positiveId('version is required: send the version you last saw.');

export const changeStatusSchema = objectBody({
  status: z.enum(INQUIRY_STATUSES, { error: 'Status must be one of: new, in_progress, resolved.' }),
  version: versionField,
});

export type ChangeStatusInput = z.output<typeof changeStatusSchema>;

export const assignInquirySchema = objectBody({
  /** Staff member to assign, or null to unassign. Must be sent explicitly. */
  assigneeId: positiveId('assigneeId must be a staff member id or null.').nullable(),
  version: versionField,
});

export type AssignInquiryInput = z.output<typeof assignInquirySchema>;

export const ASSIGNEE_FILTERS = ['me', 'none'] as const;
export type AssigneeFilterValue = (typeof ASSIGNEE_FILTERS)[number];

export const listInquiriesQuerySchema = z.object({
  status: z.enum(INQUIRY_STATUSES, { error: 'Unknown status filter.' }).optional(),
  q: z
    .string({ error: 'Search must be a single value.' })
    .trim()
    .max(100, 'Search is limited to 100 characters.')
    .optional()
    .transform((value) => value || undefined),
  assignee: z.enum(ASSIGNEE_FILTERS, { error: 'Assignee filter must be "me" or "none".' }).optional(),
  page: z.coerce.number({ error: 'page must be a number.' }).int().min(1).max(10_000).default(1),
  pageSize: z.coerce
    .number({ error: 'pageSize must be a number.' })
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE, `pageSize can be at most ${MAX_PAGE_SIZE}.`)
    .default(DEFAULT_PAGE_SIZE),
});

export type ListInquiriesQuery = z.output<typeof listInquiriesQuerySchema>;
