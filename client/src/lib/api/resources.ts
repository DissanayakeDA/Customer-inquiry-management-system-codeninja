import type {
  AssigneeFilterValue,
  CreateInquiryInput,
  DashboardResponse,
  InquiryDto,
  InquiryListResponse,
  InquiryStatus,
  LoginInput,
  SessionResponse,
  SessionUser,
  StaffListResponse,
  StaffMember,
} from '@inquirydesk/shared';
import type { HttpClient } from './http-client';

/** One small class per API resource; each depends only on the HttpClient abstraction. */

export class AuthApi {
  constructor(private readonly http: HttpClient) {}

  async signIn(input: LoginInput): Promise<SessionUser> {
    return (await this.http.post<SessionResponse>('/auth/login', input)).user;
  }

  signOut(): Promise<void> {
    return this.http.post<void>('/auth/logout');
  }

  async me(): Promise<SessionUser> {
    return (await this.http.get<SessionResponse>('/auth/me')).user;
  }
}

export type InquiryListParams = {
  status?: InquiryStatus;
  q?: string;
  assignee?: AssigneeFilterValue;
  page?: number;
  pageSize?: number;
};

export class InquiryApi {
  constructor(private readonly http: HttpClient) {}

  list(params: InquiryListParams): Promise<InquiryListResponse> {
    return this.http.get<InquiryListResponse>('/inquiries', params);
  }

  /** Takes the raw id from the URL: the server decides whether it is valid (400) or visible (404). */
  get(id: string | number): Promise<InquiryDto> {
    return this.http.get<InquiryDto>(`/inquiries/${encodeURIComponent(String(id))}`);
  }

  create(input: CreateInquiryInput): Promise<InquiryDto> {
    return this.http.post<InquiryDto>('/inquiries', input);
  }

  changeStatus(id: number, body: { status: InquiryStatus; version: number }): Promise<InquiryDto> {
    return this.http.patch<InquiryDto>(`/inquiries/${id}/status`, body);
  }

  assign(id: number, body: { assigneeId: number | null; version: number }): Promise<InquiryDto> {
    return this.http.patch<InquiryDto>(`/inquiries/${id}/assignee`, body);
  }
}

export class StaffApi {
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<StaffMember[]> {
    return (await this.http.get<StaffListResponse>('/users')).users;
  }
}

export class DashboardApi {
  constructor(private readonly http: HttpClient) {}

  get(): Promise<DashboardResponse> {
    return this.http.get<DashboardResponse>('/dashboard');
  }
}
