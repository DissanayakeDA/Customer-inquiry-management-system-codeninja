'use client';

import type { CreateInquiryInput, InquiryDto, InquiryStatus, StaleVersionDetails } from '@inquirydesk/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api, isApiError, type InquiryListParams } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useInquiryList(params: InquiryListParams) {
  return useQuery({
    queryKey: queryKeys.inquiryList(params),
    queryFn: () => api.inquiries.list(params),
    // Keep showing the previous results while a new filter loads, instead of flashing a skeleton.
    placeholderData: keepPreviousData,
  });
}

export function useInquiry(id: string) {
  return useQuery({
    queryKey: queryKeys.inquiry(id),
    queryFn: () => api.inquiries.get(id),
  });
}

export function useDashboard() {
  return useQuery({ queryKey: queryKeys.dashboard, queryFn: () => api.dashboard.get() });
}

export function useStaff() {
  return useQuery({ queryKey: queryKeys.staff, queryFn: () => api.staff.list(), staleTime: 5 * 60_000 });
}

export function useCreateInquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInquiryInput) => api.inquiries.create(input),
    onSuccess: (inquiry) => storeLatest(queryClient, inquiry),
  });
}

export interface StatusChange {
  inquiry: InquiryDto;
  to: InquiryStatus;
}

export function useChangeInquiryStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    // Sends the version this screen is showing; the server rejects it (409) if that is out of date.
    mutationFn: ({ inquiry, to }: StatusChange) =>
      api.inquiries.changeStatus(inquiry.id, { status: to, version: inquiry.version }),
    onSuccess: (inquiry) => storeLatest(queryClient, inquiry),
    onError: (error, { inquiry }) => recoverFromFailedWrite(queryClient, error, inquiry.id),
  });
}

export interface AssigneeChange {
  inquiry: InquiryDto;
  assigneeId: number | null;
}

export function useAssignInquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inquiry, assigneeId }: AssigneeChange) =>
      api.inquiries.assign(inquiry.id, { assigneeId, version: inquiry.version }),
    onSuccess: (inquiry) => storeLatest(queryClient, inquiry),
    onError: (error, { inquiry }) => recoverFromFailedWrite(queryClient, error, inquiry.id),
  });
}

/** Put the server's copy in the cache and mark every overview that may include it as outdated. */
function storeLatest(queryClient: QueryClient, inquiry: InquiryDto): void {
  queryClient.setQueryData(queryKeys.inquiry(inquiry.id), inquiry);
  void queryClient.invalidateQueries({ queryKey: queryKeys.inquiryLists });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
}

/**
 * After a rejected write, make sure the screen shows the truth:
 *  - 409 stale: the error carries the current record, so show it immediately (no extra request);
 *  - 404 / 422: reload it (it may be gone, or its status changed in a way we did not know about).
 */
function recoverFromFailedWrite(queryClient: QueryClient, error: unknown, id: number): void {
  if (isApiError(error, 'STALE_VERSION')) {
    storeLatest(queryClient, (error.details as unknown as StaleVersionDetails).current);
  } else if (isApiError(error, 'NOT_FOUND') || isApiError(error, 'INVALID_TRANSITION')) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.inquiry(id) });
  }
}
