import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Toast } from '../components/Toast';

describe('Toast Component', () => {
  it('renders with message', () => {
    render(<Toast message="Test message" />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders with different severity levels', () => {
    const { rerender } = render(<Toast message="Error message" severity="error" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    rerender(<Toast message="Warning message" severity="warning" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    rerender(<Toast message="Info message" severity="info" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    rerender(<Toast message="Success message" severity="success" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<Toast message="Test message" onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('auto-closes after specified duration', async () => {
    const onClose = vi.fn();

    render(<Toast message="Test message" duration={100} onClose={onClose} />);

    await waitFor(
      () => {
        expect(onClose).toHaveBeenCalledTimes(1);
      },
      { timeout: 200 }
    );
  });

  it('uses default duration when not specified', async () => {
    const onClose = vi.fn();

    render(<Toast message="Test message" onClose={onClose} />);

    // Should not close immediately
    expect(onClose).not.toHaveBeenCalled();
  });
});