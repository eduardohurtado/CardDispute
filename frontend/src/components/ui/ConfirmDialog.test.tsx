import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

function renderDialog() {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog title="Delete everything?" confirmLabel="Delete" onConfirm={onConfirm} onCancel={onCancel}>
      <p>This cannot be undone.</p>
    </ConfirmDialog>,
  );
  return { onConfirm, onCancel };
}

describe('ConfirmDialog', () => {
  it('opens as a dialog named by its title and described by its content', () => {
    renderDialog();

    const dialog = screen.getByRole('dialog', { name: 'Delete everything?' });
    expect(dialog).toHaveAttribute('open');
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.');
  });

  it('focuses Cancel first', () => {
    renderDialog();

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('calls the handler of each button', async () => {
    const { onConfirm, onCancel } = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('cancels on Esc', () => {
    const { onCancel, onConfirm } = renderDialog();

    // Esc fires `cancel` on a modal dialog.
    act(() => {
      screen.getByRole('dialog').dispatchEvent(new Event('cancel', { cancelable: true }));
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cancels on a click on the backdrop', async () => {
    const { onCancel } = renderDialog();

    await userEvent.click(screen.getByRole('dialog'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
