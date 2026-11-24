'use client';

import { DEFAULT_PAGE_SIZE, isInquiryStatus } from '@inquirydesk/shared';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useInquiryList } from '@/hooks/use-inquiries';
import { errorMessage, type InquiryListParams } from '@/lib/api';
import { useCurrentUser } from '../session/session-context';
import { Alert } from '../ui/alert';
import { IconInbox, IconSearch, IconWarningCircle } from '../ui/icons';
import { PageHeader, StateBlock } from '../ui/primitives';
import { InquiryFilters, type AssigneeFilter, type StatusFilter } from './inquiry-filters';
import { InquiryTable, InquiryTableSkeleton } from './inquiry-table';

interface ListFilters {
  status: StatusFilter;
  q: string;
  assignee: AssigneeFilter;
  page: number;
}

/** Filters live in the URL, so a filtered list can be bookmarked, shared, and restored with Back. */
function readFilters(params: URLSearchParams): ListFilters {
  const status = params.get('status');
  const assignee = params.get('assignee');
  const page = Number(params.get('page'));
  return {
    status: isInquiryStatus(status) ? status : 'all',
    q: params.get('q') ?? '',
    assignee: assignee === 'me' || assignee === 'none' ? assignee : 'all',
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

function toQueryString(filters: ListFilters): string {
  const params = new URLSearchParams();
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.q) params.set('q', filters.q);
  if (filters.assignee !== 'all') params.set('assignee', filters.assignee);
  if (filters.page > 1) params.set('page', String(filters.page));
  const query = params.toString();
  return query ? `?${query}` : '';
}

function toApiParams(filters: ListFilters): InquiryListParams {
  return {
    status: filters.status === 'all' ? undefined : filters.status,
    q: filters.q || undefined,
    assignee: filters.assignee === 'all' ? undefined : filters.assignee,
    page: filters.page,
    pageSize: DEFAULT_PAGE_SIZE,
  };
}

export function InquiryListView() {
  const me = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = useMemo(() => readFilters(new URLSearchParams(searchParams.toString())), [searchParams]);
  const list = useInquiryList(toApiParams(filters));

  // Search box state is local (instant typing); the URL (which drives the query) follows after a pause.
  const [searchText, setSearchText] = useState(filters.q);
  const debouncedSearch = useDebouncedValue(searchText.trim(), 300);
  const lastPushedSearch = useRef(filters.q);

  function applyFilters(patch: Partial<ListFilters>) {
    // Any filter change returns to page 1 unless a page is given explicitly.
    router.replace(`/inquiries${toQueryString({ ...filters, page: 1, ...patch })}`, { scroll: false });
  }

  useEffect(() => {
    if (debouncedSearch === filters.q) return;
    lastPushedSearch.current = debouncedSearch;
    applyFilters({ q: debouncedSearch });
    // Intentionally keyed on the debounced text only: other filter changes must not re-trigger this.
  }, [debouncedSearch]);

  // Keep the box in sync when the URL changes for other reasons (Back button, "Clear filters").
  useEffect(() => {
    if (filters.q !== lastPushedSearch.current) {
      lastPushedSearch.current = filters.q;
      setSearchText(filters.q);
    }
  }, [filters.q]);

  function clearFilters() {
    lastPushedSearch.current = '';
    setSearchText('');
    router.replace('/inquiries', { scroll: false });
  }

  return (
    <>
      <PageHeader
        title="Inquiries"
        description="Search and filter customer inquiries. Click a row to open it."
        action={
          <Link className="btn btn-primary" href="/inquiries/new">
            + New inquiry
          </Link>
        }
      />
      <div className="card">
        <InquiryFilters
          search={searchText}
          onSearchChange={setSearchText}
          status={filters.status}
          onStatusChange={(status) => applyFilters({ status })}
          assignee={filters.assignee}
          onAssigneeChange={(assignee) => applyFilters({ assignee })}
          counts={list.data?.counts}
        />
        <ListBody
          list={list}
          filters={filters}
          currentUserId={me.id}
          isAdmin={me.role === 'admin'}
          onClearFilters={clearFilters}
          onPageChange={(page) => applyFilters({ page })}
        />
      </div>
    </>
  );
}

interface ListBodyProps {
  list: ReturnType<typeof useInquiryList>;
  filters: ListFilters;
  currentUserId: number;
  isAdmin: boolean;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
}

function ListBody({ list, filters, currentUserId, isAdmin, onClearFilters, onPageChange }: ListBodyProps) {
  if (list.isPending) return <InquiryTableSkeleton />;

  if (!list.data) {
    return (
      <StateBlock
        icon={<IconWarningCircle width={22} height={22} />}
        title="Couldn't load inquiries"
        action={
          <button className="btn" type="button" onClick={() => void list.refetch()}>
            Try again
          </button>
        }
      >
        {errorMessage(list.error)}
      </StateBlock>
    );
  }

  const { items, total, counts, page, pageSize } = list.data;
  const narrowed = Boolean(filters.q) || filters.assignee !== 'all';

  if (counts.all === 0 && !narrowed) {
    return (
      <StateBlock
        icon={<IconInbox width={22} height={22} />}
        title="No inquiries yet"
        action={
          <Link className="btn btn-primary" href="/inquiries/new">
            + New inquiry
          </Link>
        }
      >
        {isAdmin
          ? 'When a customer reaches out by phone, email or chat, record it here so the team can track it to resolution.'
          : 'Inquiries you record, or that are assigned to you, will appear here.'}
      </StateBlock>
    );
  }

  if (items.length === 0 && total > 0) {
    // e.g. an old link to ?page=5 after inquiries were resolved and filtered out
    return (
      <StateBlock
        icon={<IconSearch width={22} height={22} />}
        title="This page is empty"
        action={
          <button className="btn" type="button" onClick={() => onPageChange(1)}>
            Go to the first page
          </button>
        }
      >
        There are {total} matching inquiries, but not this many pages.
      </StateBlock>
    );
  }

  if (items.length === 0) {
    return (
      <StateBlock
        icon={<IconSearch width={22} height={22} />}
        title="No matching inquiries"
        action={
          <button className="btn" type="button" onClick={onClearFilters}>
            Clear filters
          </button>
        }
      >
        Nothing matches your search or filters. Try a different term or clear the filters.
      </StateBlock>
    );
  }

  const first = (page - 1) * pageSize + 1;
  const last = first + items.length - 1;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      {list.isError && (
        <div className="card-body">
          <Alert tone="warn" title="Couldn't refresh the list.">
            Showing the last results we loaded. {errorMessage(list.error)}
          </Alert>
        </div>
      )}
      <InquiryTable items={items} currentUserId={currentUserId} dimmed={list.isPlaceholderData} />
      <div className="table-foot">
        <span>
          Showing {first}–{last} of {total}
        </span>
        <div className="pager">
          <span className="faint">Sorted by last updated</span>
          {lastPage > 1 && (
            <>
              <button className="btn btn-sm" type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
                Previous
              </button>
              <button className="btn btn-sm" type="button" disabled={page >= lastPage} onClick={() => onPageChange(page + 1)}>
                Next
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
