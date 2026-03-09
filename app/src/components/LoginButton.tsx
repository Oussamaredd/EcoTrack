import type { ReactNode } from 'react';

import { cn } from '../lib/utils';

type LoginButtonProps = {
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
  isLoading?: boolean;
  onClick?: () => void | Promise<void>;
};

export default function LoginButton({
  className,
  children,
  disabled = false,
  isLoading = false,
  onClick,
}: LoginButtonProps) {
  const handleClick = () => {
    if (disabled) {
      return;
    }

    void onClick?.();
  };

  return (
    <button
      type="button"
      disabled={disabled}
      aria-busy={isLoading}
      onClick={handleClick}
      className={cn(
        'inline-flex h-11 items-center justify-center gap-3 rounded-[var(--radius-pill)] border border-[var(--border)] bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-6 text-sm font-semibold text-[var(--text)] shadow-[0_10px_28px_rgba(47,109,248,0.35)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(47,109,248,0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none disabled:hover:translate-y-0',
        className,
      )}
    >
      {isLoading ? <span className="auth-inline-spinner" aria-hidden="true" /> : null}
      <span aria-hidden="true" className="text-lg font-extrabold leading-none text-white">
        G
      </span>
      <span>{children ?? 'Google'}</span>
    </button>
  );
}
