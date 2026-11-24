import type { Metadata } from 'next';
import { Suspense } from 'react';
import { InquiryListView } from '@/components/inquiries/inquiry-list-view';

export const metadata: Metadata = { title: 'Inquiries' };

export default function InquiriesPage() {
  // The list reads its filters from the URL, which requires a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <InquiryListView />
    </Suspense>
  );
}
