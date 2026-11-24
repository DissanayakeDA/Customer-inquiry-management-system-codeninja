import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StatusPanel } from '@/components/inquiries/status-panel';
import { inquiryDto } from './fixtures';

describe('StatusPanel', () => {
  it('offers only the next step allowed by the lifecycle: a New inquiry cannot jump to Resolved', () => {
    render(<StatusPanel inquiry={inquiryDto({ status: 'new' })} pendingStatus={null} disabled={false} onChangeStatus={vi.fn()} />);

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Start working']);
  });

  it('offers Reopen for a resolved inquiry', () => {
    render(<StatusPanel inquiry={inquiryDto({ status: 'resolved' })} pendingStatus={null} disabled={false} onChangeStatus={vi.fn()} />);

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Reopen']);
  });

  it('requests the target status when an action is clicked', async () => {
    const onChangeStatus = vi.fn();
    render(<StatusPanel inquiry={inquiryDto({ status: 'in_progress' })} pendingStatus={null} disabled={false} onChangeStatus={onChangeStatus} />);

    await userEvent.click(screen.getByRole('button', { name: 'Mark resolved' }));

    expect(onChangeStatus).toHaveBeenCalledWith('resolved');
  });

  it('shows progress and blocks further clicks while saving', () => {
    render(<StatusPanel inquiry={inquiryDto({ status: 'new' })} pendingStatus="in_progress" disabled onChangeStatus={vi.fn()} />);

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Saving…');
    expect(button).toBeDisabled();
  });
});
