'use client';

import type { InquiryDto, SessionUser, StaffMember } from '@inquirydesk/shared';

interface AssignmentPanelProps {
  inquiry: InquiryDto;
  staff: readonly StaffMember[];
  me: SessionUser;
  disabled: boolean;
  onAssign: (assigneeId: number | null) => void;
}

export function AssignmentPanel({ inquiry, staff, me, disabled, onAssign }: AssignmentPanelProps) {
  const assigneeId = inquiry.assignedTo?.id ?? null;
  // Make sure the current assignee is selectable even if the staff list has not loaded.
  const options = inquiry.assignedTo && !staff.some((member) => member.id === assigneeId)
    ? [...staff, { ...inquiry.assignedTo, role: 'agent' as const }]
    : staff;
  const losesAccessOnHandOver = me.role !== 'admin' && inquiry.createdBy.id !== me.id;

  return (
    <section className="card" aria-labelledby="assignment-heading">
      <div className="card-head">
        <h3 id="assignment-heading">Assignment</h3>
      </div>
      <div className="card-body stack stack-tight">
        <label className="sr-only" htmlFor="assignee">
          Assigned to
        </label>
        <select
          id="assignee"
          className="select"
          value={assigneeId ?? ''}
          disabled={disabled}
          onChange={(event) => onAssign(event.target.value ? Number(event.target.value) : null)}
        >
          <option value="">Unassigned</option>
          {options.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
              {member.id === me.id ? ' (me)' : ''}
            </option>
          ))}
        </select>
        {assigneeId !== me.id && (
          <button className="btn btn-sm" type="button" disabled={disabled} onClick={() => onAssign(me.id)}>
            Assign to me
          </button>
        )}
        {losesAccessOnHandOver && assigneeId === me.id && (
          <p className="help-text">If you hand this over to someone else, it will leave your list.</p>
        )}
      </div>
    </section>
  );
}
