import { formatReference } from '@inquirydesk/shared';
import type { Metadata } from 'next';
import { InquiryDetailView } from '@/components/inquiries/inquiry-detail-view';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: /^\d+$/.test(id) ? formatReference(Number(id)) : 'Inquiry' };
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value; // malformed escape such as "%E0": pass it through and let the API reject it
  }
}

export default async function InquiryPage({ params }: Props) {
  const { id } = await params;
  // The raw id goes to the API unchanged: the server decides whether it is invalid (400) or not visible (404).
  // `key` resets local state (notices, pending actions) when navigating between inquiries.
  return <InquiryDetailView key={id} inquiryId={safeDecode(id)} />;
}
