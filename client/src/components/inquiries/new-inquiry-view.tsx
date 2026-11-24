'use client';

import { useRouter } from 'next/navigation';
import { useCreateInquiry, useStaff } from '@/hooks/use-inquiries';
import { useCurrentUser } from '../session/session-context';
import { PageHeader } from '../ui/primitives';
import { useToast } from '../ui/toast';
import { InquiryForm } from './inquiry-form';

export function NewInquiryView() {
  const me = useCurrentUser();
  const staff = useStaff();
  const createInquiry = useCreateInquiry();
  const router = useRouter();
  const toast = useToast();

  // If the staff list fails to load, the user can still assign to themselves or leave it unassigned.
  const staffOptions = staff.data ?? [{ id: me.id, name: me.name, role: me.role }];

  return (
    <>
      <PageHeader title="New inquiry" description="Record a customer request so it can be tracked to resolution." />
      <div className="form-layout">
        <InquiryForm
          staff={staffOptions}
          currentUserId={me.id}
          submitting={createInquiry.isPending}
          submitError={createInquiry.error}
          onSubmit={(data) =>
            createInquiry.mutate(data, {
              onSuccess: (inquiry) => {
                toast(`${inquiry.reference} created`);
                router.push(`/inquiries/${inquiry.id}`);
              },
            })
          }
        />
        <aside className="card card-body tips">
          <b>Before you save</b>
          <ul>
            <li>
              Fields marked <span className="req">*</span> are required.
            </li>
            <li>Contact must be a valid email or a phone number (7–15 digits).</li>
            <li>
              If an <b>open</b> inquiry already exists for the same contact and subject, you&apos;ll be pointed to it instead of
              creating a duplicate.
            </li>
            <li>
              New inquiries start as <b>New</b>.
            </li>
          </ul>
        </aside>
      </div>
    </>
  );
}
