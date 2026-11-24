import { MAX_INT_ID, toFieldErrors } from '@inquirydesk/shared';
import type { z } from 'zod';
import { InvalidIdError, ValidationError } from '../domain/errors';

/** Parses untrusted input with a shared schema, or throws a ValidationError with per-field messages. */
export function parseWith<Schema extends z.ZodType>(schema: Schema, input: unknown): z.output<Schema> {
  const result = schema.safeParse(input);
  if (!result.success) throw new ValidationError(toFieldErrors(result.error));
  return result.data;
}

/** Route ids must be positive integers that fit PostgreSQL's INTEGER; anything else is a 400, not a 500. */
export function parseInquiryId(raw: string): number {
  if (!/^\d{1,10}$/.test(raw)) throw new InvalidIdError(raw);
  const id = Number(raw);
  if (id < 1 || id > MAX_INT_ID) throw new InvalidIdError(raw);
  return id;
}
