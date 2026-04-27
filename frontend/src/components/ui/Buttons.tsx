import type { ReactNode, MouseEventHandler } from 'react';

export type AccentColor = 'navy' | 'tomato' | 'ochre' | 'forest' | 'plum';

const PRIMARY_BG: Record<AccentColor, string> = {
  navy: 'bg-navy',
  tomato: 'bg-tomato',
  ochre: 'bg-ochre',
  forest: 'bg-forest',
  plum: 'bg-plum',
};

const PILL_BG: Record<AccentColor, string> = {
  navy: 'bg-navy-soft text-navy',
  tomato: 'bg-tomato-soft text-tomato',
  ochre: 'bg-ochre-soft text-ochre',
  forest: 'bg-forest-soft text-forest',
  plum: 'bg-plum-soft text-plum',
};

interface ButtonBaseProps {
  children?: ReactNode;
  icon?: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  className?: string;
  title?: string;
  'aria-label'?: string;
}

interface PrimaryButtonProps extends ButtonBaseProps {
  size?: 'sm' | 'md' | 'lg';
  color?: AccentColor;
}

export function PrimaryButton({
  children, icon, size = 'md', color = 'navy', onClick, type = 'button',
  disabled, className = '', ...rest
}: PrimaryButtonProps) {
  const sizeClasses = size === 'lg'
    ? 'px-[26px] py-[14px] text-base'
    : size === 'sm'
      ? 'px-3 py-2 text-sm'
      : 'px-5 py-[11px] text-[14.5px]';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${PRIMARY_BG[color]} text-white font-semibold ${sizeClasses} rounded-md inline-flex items-center gap-2 shadow-cta cursor-pointer whitespace-nowrap transition-[filter] duration-150 hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 ${className}`}
      {...rest}
    >
      {icon && <span className="inline-flex">{icon}</span>}
      {children}
    </button>
  );
}

export function GhostButton({
  children, icon, onClick, type = 'button', disabled, className = '', ...rest
}: ButtonBaseProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`bg-transparent text-ink-strong font-semibold px-5 py-[11px] rounded-md border-[1.5px] border-ink-strong text-[14.5px] inline-flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors duration-150 hover:bg-paper-tinted disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...rest}
    >
      {icon && <span className="inline-flex">{icon}</span>}
      {children}
    </button>
  );
}

interface NavLinkProps extends ButtonBaseProps {
  active?: boolean;
}

export function NavLink({
  children, icon, active = false, onClick, className = '', ...rest
}: NavLinkProps) {
  const stateClasses = active
    ? 'bg-paper-tinted text-ink-strong'
    : 'bg-transparent text-ink-default';
  return (
    <button
      onClick={onClick}
      className={`${stateClasses} px-3.5 py-2 rounded-md text-sm font-medium inline-flex items-center gap-[7px] cursor-pointer whitespace-nowrap transition-colors duration-150 hover:bg-paper-tinted ${className}`}
      {...rest}
    >
      {icon && <span className="inline-flex">{icon}</span>}
      {children}
    </button>
  );
}

interface PillProps {
  children: ReactNode;
  color?: AccentColor;
  className?: string;
}

export function Pill({ children, color = 'ochre', className = '' }: PillProps) {
  return (
    <span className={`${PILL_BG[color]} px-3 py-[5px] rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${className}`}>
      {children}
    </span>
  );
}
