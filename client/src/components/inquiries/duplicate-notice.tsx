import { STATUS_LABEL, type DuplicateInquiryDetails } from '@inquirydesk/shared';
import Link from 'next/link';
import { Alert } from '../ui/alert';

/** Explains a DUPLICATE_INQUIRY rejection and links to the existing inquiry when the user may open it. */
export function DuplicateNotice({ title, details }: { title: string; details: DuplicateInquiryDetails }) {
  const existing = details.existing;

  return (
    <Alert tone="warn" title={title}>
      {!existing && 'An open inquiry with the same contact and subject already exists. Nothing was saved.'}
      {existing?.accessible && (
        <>
          An open inquiry with the same contact and subject already exists:{' '}
          <Link href={`/inquiries/${existing.id}`}>{existing.reference}</Link> ({STATUS_LABEL[existing.status]}). Nothing was saved.
        </>
      )}
      {existing && !existing.accessible && (
        <>
          A colleague is already handling an open inquiry with the same contact and subject ({existing.reference},{' '}
          {STATUS_LABEL[existing.status]}). Nothing was saved. Ask an administrator to assign it to you if you need to work on it.
        </>
      )}
    </Alert>
  );
}
