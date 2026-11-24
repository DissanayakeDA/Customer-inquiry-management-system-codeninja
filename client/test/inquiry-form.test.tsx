import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InquiryForm, type InquiryFormProps } from '@/components/inquiries/inquiry-form';
import { ApiError } from '@/lib/api';
import { staff } from './fixtures';

function renderForm(overrides: Partial<InquiryFormProps> = {}) {
  const props: InquiryFormProps = {
    staff,
    currentUserId: 2,
    submitting: false,
    submitError: null,
    onSubmit: vi.fn(),
    ...overrides,
  };
  const view = render(<InquiryForm {...props} />);
  return { ...view, props, user: userEvent.setup() };
}

describe('InquiryForm', () => {
  it('guides the user through missing information instead of submitting', async () => {
    const { props, user } = renderForm();

    await user.type(screen.getByLabelText(/Email or phone/), 'not a contact');
    await user.click(screen.getByRole('button', { name: 'Save inquiry' }));

    expect(props.onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Please fix 4 fields before saving.');

    const name = screen.getByLabelText(/Customer name/);
    expect(name).toBeInvalid();
    expect(name).toHaveAccessibleDescription('Customer name is required.');
    expect(name).toHaveFocus(); // focus moves to the first field that needs attention
    expect(screen.getByLabelText(/Email or phone/)).toHaveAccessibleDescription(
      expect.stringContaining('Enter a valid email (name@example.com) or phone number'),
    );
  });

  it('clears a field error as soon as the value becomes valid', async () => {
    const { user } = renderForm();
    await user.click(screen.getByRole('button', { name: 'Save inquiry' }));

    const contact = screen.getByLabelText(/Email or phone/);
    expect(contact).toBeInvalid();

    await user.type(contact, '+94 77 123 4567');

    expect(contact).toBeValid();
    expect(screen.getByRole('alert')).toHaveTextContent('Please fix 3 fields before saving.');
  });

  it('submits trimmed values and the chosen assignee', async () => {
    const { props, user } = renderForm();

    await user.type(screen.getByLabelText(/Customer name/), '  Dilani Jayasuriya ');
    await user.type(screen.getByLabelText(/Email or phone/), 'dilani@example.com');
    await user.type(screen.getByLabelText(/Subject/), 'Delivery delayed');
    await user.type(screen.getByLabelText(/Description/), 'Order #5521 has not arrived yet.');
    await user.selectOptions(screen.getByLabelText(/Assign to/), 'Kasun Silva');
    await user.click(screen.getByRole('button', { name: 'Save inquiry' }));

    expect(props.onSubmit).toHaveBeenCalledWith({
      customerName: 'Dilani Jayasuriya',
      contact: 'dilani@example.com',
      subject: 'Delivery delayed',
      description: 'Order #5521 has not arrived yet.',
      assignedToId: 3,
    });
  });

  it('disables saving while a save is in progress, so the inquiry cannot be submitted twice', () => {
    renderForm({ submitting: true });
    expect(screen.getByRole('button', { name: /Saving/ })).toBeDisabled();
  });

  it('shows field errors returned by the API in the same place as its own', () => {
    const serverError = new ApiError(400, 'VALIDATION_ERROR', 'Some information is missing or invalid.', {
      assignedToId: 'The selected staff member does not exist.',
    });
    renderForm({ submitError: serverError });

    expect(screen.getByLabelText(/Assign to/)).toHaveAccessibleDescription(
      expect.stringContaining('The selected staff member does not exist.'),
    );
  });

  it('points to the existing inquiry when the API reports a duplicate, keeping the input', async () => {
    const duplicate = new ApiError(409, 'DUPLICATE_INQUIRY', 'Duplicate', {}, {
      existing: { id: 1010, reference: 'INQ-1010', status: 'in_progress', accessible: true },
    });
    const { user, rerender, props } = renderForm();
    await user.type(screen.getByLabelText(/Customer name/), 'Sachini');

    rerender(<InquiryForm {...props} submitError={duplicate} />);

    expect(screen.getByRole('alert')).toHaveTextContent('This looks like a duplicate.');
    expect(screen.getByRole('link', { name: 'INQ-1010' })).toHaveAttribute('href', '/inquiries/1010');
    expect(screen.getByLabelText(/Customer name/)).toHaveValue('Sachini');
  });
});
