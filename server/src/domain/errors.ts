import {
  STATUS_LABEL,
  type ApiErrorCode,
  type DuplicateInquiryDetails,
  type FieldErrors,
  type InquiryStatus,
  type InvalidTransitionDetails,
  type StaleVersionDetails,
} from '@inquirydesk/shared';
import { toInquiryDto, type Inquiry } from './inquiry';

/**
 * Base class for every expected failure. Each subclass carries a stable machine-readable `code`
 * and a message that is safe to show to staff. The HTTP layer maps codes to status codes, so the
 * domain does not depend on HTTP.
 */
export abstract class AppError extends Error {
  abstract readonly code: ApiErrorCode;
  readonly details?: Record<string, unknown>;

  protected constructor(message: string, details?: object) {
    super(message);
    this.name = new.target.name;
    this.details = details as Record<string, unknown> | undefined;
  }
}

export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';

  constructor(
    readonly fieldErrors: FieldErrors,
    message = 'Some information is missing or invalid.',
  ) {
    super(message);
  }
}

export class InvalidIdError extends AppError {
  readonly code = 'INVALID_ID';

  constructor(rawId: string) {
    super(`"${rawId.slice(0, 40)}" is not a valid inquiry ID. IDs are positive whole numbers.`);
  }
}

export class UnauthenticatedError extends AppError {
  readonly code = 'UNAUTHENTICATED';

  constructor() {
    super('You are not signed in, or your session has expired. Please sign in again.');
  }
}

export class InvalidCredentialsError extends AppError {
  readonly code = 'INVALID_CREDENTIALS';

  constructor() {
    // Deliberately generic: do not reveal whether the email exists.
    super('Invalid email or password.');
  }
}

/**
 * Returned both when an inquiry does not exist and when the user may not see it,
 * so the API never confirms that a record they cannot access exists.
 */
export class InquiryNotFoundError extends AppError {
  readonly code = 'NOT_FOUND';

  constructor() {
    super("This inquiry doesn't exist or you don't have access to it.");
  }
}

export class DuplicateInquiryError extends AppError {
  readonly code = 'DUPLICATE_INQUIRY';

  constructor(existing: DuplicateInquiryDetails['existing']) {
    const where = existing ? ` (${existing.reference}, ${STATUS_LABEL[existing.status]})` : '';
    super(
      `An open inquiry for this contact and subject already exists${where}. Nothing was saved.`,
      { existing } satisfies DuplicateInquiryDetails,
    );
  }
}

/** The client tried to update a version of the inquiry that is no longer current. */
export class StaleVersionError extends AppError {
  readonly code = 'STALE_VERSION';

  constructor(
    readonly current: Inquiry,
    expectedVersion: number,
  ) {
    super(
      `This inquiry was changed by ${current.updatedBy.name} after you loaded it. Your change was not saved.`,
      { current: toInquiryDto(current), expectedVersion } satisfies StaleVersionDetails,
    );
  }
}

export class InvalidTransitionError extends AppError {
  readonly code = 'INVALID_TRANSITION';

  constructor(from: InquiryStatus, to: InquiryStatus, allowed: InquiryStatus[]) {
    const options = allowed.map((status) => STATUS_LABEL[status]).join(' or ') || 'nothing';
    super(
      `An inquiry can't move from ${STATUS_LABEL[from]} to ${STATUS_LABEL[to]}. From ${STATUS_LABEL[from]} it can move to ${options}.`,
      { from, to, allowed } satisfies InvalidTransitionDetails,
    );
  }
}
