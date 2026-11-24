import type { Metadata } from 'next';
import { NewInquiryView } from '@/components/inquiries/new-inquiry-view';

export const metadata: Metadata = { title: 'New inquiry' };

export default function NewInquiryPage() {
  return <NewInquiryView />;
}
