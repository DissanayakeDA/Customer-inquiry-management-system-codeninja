'use client';

import {
  INQUIRY_LIMITS,
  createInquirySchema,
  toFieldErrors,
  type CreateInquiryData,
  type DuplicateInquiryDetails,
  type FieldErrors,
  type StaffMember,
} from '@inquirydesk/shared';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { isApiError } from '@/lib/api';
import { Alert } from '../ui/alert';
import { Field } from '../ui/field';
import { Spinner } from '../ui/primitives';
import { DuplicateNotice } from './duplicate-notice';

interface FormValues {
  customerName: string;
  contact: string;
  subject: string;
  description: string;
  /** '' = unassigned; otherwise a staff id as a string (select values are strings). */
  assignedToId: string;
}

type FieldName = keyof FormValues;

/** Tab order, used to move focus to the first field that needs attention. */
const FIELD_ORDER: readonly FieldName[] = ['customerName', 'contact', 'subject', 'description', 'assignedToId'];

function validate(values: FormValues): { data?: CreateInquiryData; errors: FieldErrors } {
  const result = createInquirySchema.safeParse({
    ...values,
    assignedToId: values.assignedToId ? Number(values.assignedToId) : null,
  });
  return result.success ? { data: result.data, errors: {} } : { errors: toFieldErrors(result.error) };
}

export interface InquiryFormProps {
  staff: readonly StaffMember[];
  currentUserId: number;
  submitting: boolean;
  /** Error from the last save attempt (an ApiError), shown inline so the user's input is kept. */
  submitError: unknown;
  onSubmit: (data: CreateInquiryData) => void;
}

export function InquiryForm({ staff, currentUserId, submitting, submitError, onSubmit }: InquiryFormProps) {
  const [values, setValues] = useState<FormValues>({
    customerName: '',
    contact: '',
    subject: '',
    description: '',
    assignedToId: String(currentUserId),
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function focusFirstInvalid(fieldErrors: FieldErrors) {
    const first = FIELD_ORDER.find((name) => fieldErrors[name]);
    const element = first && formRef.current?.elements.namedItem(first);
    if (element instanceof HTMLElement) element.focus();
  }

  // The API validates independently; its field errors are displayed exactly like client-side ones.
  useEffect(() => {
    if (isApiError(submitError, 'VALIDATION_ERROR')) {
      setErrors(submitError.fieldErrors);
      focusFirstInvalid(submitError.fieldErrors);
    }
  }, [submitError]);

  function update(field: FieldName, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    // Re-check a field that is already showing an error, so the message disappears as soon as it is fixed.
    if (errors[field]) {
      const message = validate(next).errors[field];
      setErrors((current) => {
        const { [field]: _removed, ...rest } = current;
        return message ? { ...rest, [field]: message } : rest;
      });
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return; // guards against double-submit (the button is also disabled)
    setSubmitAttempted(true);
    const { data, errors: fieldErrors } = validate(values);
    setErrors(fieldErrors);
    if (!data) {
      focusFirstInvalid(fieldErrors);
      return;
    }
    onSubmit(data);
  }

  const errorCount = Object.keys(errors).length;
  const control = (field: FieldName) => ({
    name: field,
    value: values[field],
    onChange: (event: { target: { value: string } }) => update(field, event.target.value),
  });

  return (
    <form ref={formRef} className="card" onSubmit={handleSubmit} noValidate aria-label="New inquiry">
      <div className="card-body stack">
        {submitAttempted && errorCount > 0 ? (
          <Alert tone="error" title={`Please fix ${errorCount} field${errorCount > 1 ? 's' : ''} before saving.`}>
            The highlighted fields need your attention.
          </Alert>
        ) : (
          <SubmitErrorNotice error={submitError} />
        )}

        <fieldset className="form-section">
          <legend className="section-title">Customer</legend>
          <div className="form-grid">
            <Field id="customerName" label="Customer name" required error={errors.customerName}>
              {(a11y) => (
                <input {...a11y} {...control('customerName')} className="input" maxLength={INQUIRY_LIMITS.customerName.max} placeholder="e.g. Dilani Jayasuriya" autoComplete="off" />
              )}
            </Field>
            <Field id="contact" label="Email or phone" required error={errors.contact} hint="How we'll get back to the customer.">
              {(a11y) => (
                <input {...a11y} {...control('contact')} className="input" maxLength={INQUIRY_LIMITS.contact.max} placeholder="name@example.com or +94 77 123 4567" autoComplete="off" />
              )}
            </Field>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend className="section-title">Inquiry</legend>
          <div className="form-grid">
            <Field id="subject" label="Subject" required error={errors.subject} className="full">
              {(a11y) => (
                <input {...a11y} {...control('subject')} className="input" maxLength={INQUIRY_LIMITS.subject.max} placeholder="Short summary, e.g. Refund not received" />
              )}
            </Field>
            <Field
              id="description"
              label="Description"
              required
              error={errors.description}
              className="full"
              aside={
                <span className="hint" aria-live="polite">
                  {values.description.length} / {INQUIRY_LIMITS.description.max}
                </span>
              }
            >
              {(a11y) => (
                <textarea {...a11y} {...control('description')} className="textarea" maxLength={INQUIRY_LIMITS.description.max} placeholder="What does the customer need? Include order numbers or dates if relevant." />
              )}
            </Field>
            <Field id="assignedToId" label="Assign to" error={errors.assignedToId} hint="The person responsible for following up.">
              {(a11y) => (
                <select {...a11y} {...control('assignedToId')} className="select">
                  <option value="">Unassigned</option>
                  {staff.map((member) => (
                    <option key={member.id} value={String(member.id)}>
                      {member.name}
                      {member.id === currentUserId ? ' (me)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
        </fieldset>
      </div>

      <div className="form-actions">
        <Link className="btn" href="/inquiries">
          Cancel
        </Link>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Spinner /> Saving…
            </>
          ) : (
            'Save inquiry'
          )}
        </button>
      </div>
    </form>
  );
}

/** Failures other than field validation: duplicates, network problems, server errors. */
function SubmitErrorNotice({ error }: { error: unknown }) {
  if (!error || isApiError(error, 'VALIDATION_ERROR')) return null;

  if (isApiError(error, 'DUPLICATE_INQUIRY')) {
    return <DuplicateNotice title="This looks like a duplicate." details={error.details as unknown as DuplicateInquiryDetails} />;
  }

  return (
    <Alert tone="error" title="Couldn't save the inquiry.">
      {isApiError(error) ? error.message : 'Something went wrong.'} Your input has been kept, so you can try again.
    </Alert>
  );
}
