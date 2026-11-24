'use client';

import { INQUIRY_STATUSES, STATUS_LABEL, type AssigneeFilterValue, type InquiryListResponse, type InquiryStatus } from '@inquirydesk/shared';
import { IconSearch } from '../ui/icons';

export type StatusFilter = InquiryStatus | 'all';
export type AssigneeFilter = AssigneeFilterValue | 'all';

const STATUS_OPTIONS: readonly StatusFilter[] = ['all', ...INQUIRY_STATUSES];

interface InquiryFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  assignee: AssigneeFilter;
  onAssigneeChange: (value: AssigneeFilter) => void;
  counts?: InquiryListResponse['counts'];
}

export function InquiryFilters(props: InquiryFiltersProps) {
  const { search, onSearchChange, status, onStatusChange, assignee, onAssigneeChange, counts } = props;

  return (
    <div className="toolbar" role="search">
      <div className="search">
        <IconSearch />
        <input
          className="input"
          type="search"
          aria-label="Search inquiries"
          placeholder="Search customer, contact, subject or INQ-…"
          maxLength={100}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="seg" role="group" aria-label="Filter by status">
        {STATUS_OPTIONS.map((option) => (
          <button key={option} type="button" className={status === option ? 'on' : undefined} aria-pressed={status === option} onClick={() => onStatusChange(option)}>
            {option === 'all' ? 'All' : STATUS_LABEL[option]}
            <span className="n">{counts ? counts[option] : '–'}</span>
          </button>
        ))}
      </div>

      <select className="select" aria-label="Filter by assignee" value={assignee} onChange={(event) => onAssigneeChange(event.target.value as AssigneeFilter)}>
        <option value="all">Any assignee</option>
        <option value="me">Assigned to me</option>
        <option value="none">Unassigned</option>
      </select>
    </div>
  );
}
