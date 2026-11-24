import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InquiryDetailView } from '@/components/inquiries/inquiry-detail-view';
import { SessionProvider } from '@/components/session/session-context';
import { ToastProvider } from '@/components/ui/toast';
import { ayesha, inquiryDto, jsonResponse, staff } from './fixtures';

type Handler = (init?: RequestInit) => Response;

/** Replaces fetch with canned API responses keyed by "METHOD /path". */
function mockApi(routes: Record<string, Handler>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url}`;
    const handler = routes[key];
    if (!handler) throw new Error(`Unexpected request: ${key}`);
    return handler(init);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderDetail(inquiryId: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <SessionProvider user={ayesha}>
          <InquiryDetailView inquiryId={inquiryId} />
        </SessionProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { user: userEvent.setup() };
}

describe('InquiryDetailView', () => {
  it('handles a change made in another tab: explains it, shows the latest state and does not apply the stale action', async () => {
    // This tab loaded version 1 (New). Meanwhile Kasun, in another tab, started and resolved it (version 3).
    const shownHere = inquiryDto({ status: 'new', version: 1 });
    const current = inquiryDto({
      status: 'resolved',
      version: 3,
      assignedTo: { id: 3, name: 'Kasun Silva' },
      updatedBy: { id: 3, name: 'Kasun Silva' },
    });
    const fetchMock = mockApi({
      'GET /api/inquiries/1012': () => jsonResponse(200, shownHere),
      'GET /api/users': () => jsonResponse(200, { users: staff }),
      'PATCH /api/inquiries/1012/status': () =>
        jsonResponse(409, {
          error: { code: 'STALE_VERSION', message: 'Changed by Kasun Silva', details: { current, expectedVersion: 1 } },
        }),
    });
    const { user } = renderDetail('1012');

    await user.click(await screen.findByRole('button', { name: 'Start working' }));

    // The request carried the version this tab was showing.
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ status: 'in_progress', version: 1 });

    const notice = await screen.findByRole('alert');
    expect(notice).toHaveTextContent('This inquiry was changed by someone else.');
    expect(notice).toHaveTextContent('Kasun Silva updated it');
    expect(notice).toHaveTextContent('Your change (moving it to In Progress) was not saved.');

    // The page now reflects the server's state, so the user acts on the truth, not the old screen.
    const statusPanel = screen.getByRole('region', { name: 'Status' });
    expect(within(statusPanel).getByRole('button', { name: 'Reopen' })).toBeInTheDocument();
    expect(within(statusPanel).queryByRole('button', { name: 'Start working' })).not.toBeInTheDocument();
    expect(within(statusPanel).getByText('v3')).toBeInTheDocument();
  });

  it('shows a clear not-found state when the inquiry is missing or not accessible', async () => {
    mockApi({
      'GET /api/inquiries/2001': () =>
        jsonResponse(404, { error: { code: 'NOT_FOUND', message: "This inquiry doesn't exist or you don't have access to it." } }),
    });
    renderDetail('2001');

    expect(await screen.findByRole('heading', { name: 'Inquiry not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to inquiries' })).toHaveAttribute('href', '/inquiries');
  });

  it('explains an invalid link instead of failing', async () => {
    mockApi({
      'GET /api/inquiries/abc': () =>
        jsonResponse(400, { error: { code: 'INVALID_ID', message: '"abc" is not a valid inquiry ID. IDs are positive whole numbers.' } }),
    });
    renderDetail('abc');

    expect(await screen.findByRole('heading', { name: 'Invalid inquiry link' })).toBeInTheDocument();
    expect(screen.getByText(/"abc" is not a valid inquiry ID/)).toBeInTheDocument();
  });
});
