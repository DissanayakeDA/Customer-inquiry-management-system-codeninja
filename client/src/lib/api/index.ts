import { HttpClient } from './http-client';
import { AuthApi, DashboardApi, InquiryApi, StaffApi } from './resources';

const http = new HttpClient('/api');

export const api = {
  auth: new AuthApi(http),
  inquiries: new InquiryApi(http),
  staff: new StaffApi(http),
  dashboard: new DashboardApi(http),
} as const;

export { ApiError, errorMessage, isApiError } from './api-error';
export type { InquiryListParams } from './resources';
