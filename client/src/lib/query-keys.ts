import type { InquiryListParams } from './api';

/** Central list of React Query cache keys, so invalidation can target whole groups. */
export const queryKeys = {
  session: ['session'] as const,
  staff: ['staff'] as const,
  dashboard: ['dashboard'] as const,
  inquiryLists: ['inquiries', 'list'] as const,
  inquiryList: (params: InquiryListParams) => ['inquiries', 'list', params] as const,
  inquiry: (id: string | number) => ['inquiries', 'detail', String(id)] as const,
};
