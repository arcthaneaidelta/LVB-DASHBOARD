import React, { useEffect } from 'react';
import { X, Lock, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import type { ToastItem } from '../../services/store';

export const LVBMonogram: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  tone?: 'olive' | 'charcoal' | 'porcelain';
}> = ({ size = 'md', tone = 'olive' }) => {
  const dims =
    size === 'sm'
      ? 'w-8 h-8 text-[11px]'
      : size === 'lg'
        ? 'w-14 h-14 text-xl'
        : 'w-9 h-9 text-xs';

  const colors =
    tone === 'porcelain'
      ? 'bg-porcelain text-charcoal border-hairline'
      : tone === 'charcoal'
        ? 'bg-charcoal text-porcelain border-charcoal-soft'
        : 'bg-olive text-porcelain border-olive-dark';

  return (
    <div
      className={`${dims} ${colors} rounded-full flex items-center justify-center font-editorial tracking-widest select-none shrink-0 border`}
      aria-hidden="true"
    >
      LVB
    </div>
  );
};

export type BadgeTone =
  | 'sage'
  | 'green'
  | 'amber'
  | 'terracotta'
  | 'red'
  | 'slate'
  | 'gray'
  | 'navy'
  | 'olive'
  | 'champagne'
  | 'clay';

const BADGE_CLASSES: Record<BadgeTone, string> = {
  sage: 'bg-status-greenBg text-status-green border-status-green/20',
  green: 'bg-status-greenBg text-status-green border-status-green/20',
  amber: 'bg-status-amberBg text-status-amber border-status-amber/25',
  terracotta: 'bg-status-redBg text-status-red border-status-red/20',
  red: 'bg-status-redBg text-status-red border-status-red/20',
  slate: 'bg-status-grayBg text-status-gray border-hairline',
  gray: 'bg-status-grayBg text-status-gray border-hairline',
  navy: 'bg-charcoal text-porcelain border-charcoal',
  olive: 'bg-olive text-porcelain border-olive',
  champagne: 'bg-clay-light text-clay-dark border-clay/30',
  clay: 'bg-clay-light text-clay-dark border-clay/30',
};

export const Badge: React.FC<{
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}> = ({ children, tone = 'gray', className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11.5px] font-medium border whitespace-nowrap ${BADGE_CLASSES[tone]} ${className}`}
  >
    {children}
  </span>
);

export type ButtonVariant = 'primary' | 'champagne' | 'clay' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-olive text-white hover:bg-olive-dark active:scale-[0.99] border border-olive',
  champagne:
    'bg-clay text-white hover:bg-clay-dark active:scale-[0.99] border border-clay',
  clay:
    'bg-clay text-white hover:bg-clay-dark active:scale-[0.99] border border-clay',
  secondary:
    'bg-white text-charcoal hover:bg-mist/70 active:scale-[0.99] border border-hairline',
  ghost:
    'bg-transparent text-charcoal hover:bg-mist/80 active:scale-[0.99] border border-transparent',
  danger:
    'bg-status-red text-white hover:bg-[#88322a] active:scale-[0.99] border border-status-red',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-6 text-sm gap-2',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  ...rest
}) => (
  <button
    disabled={disabled}
    className={`inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 whitespace-nowrap select-none disabled:opacity-45 disabled:cursor-not-allowed ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
    {...rest}
  />
);

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className = '', onClick }) => {
  const interactive = onClick
    ? 'cursor-pointer hover:border-sage hover:shadow-atelier transition-all duration-150'
    : '';
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-hairline rounded-atelier ${interactive} ${className}`}
    >
      {children}
    </div>
  );
};

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  phase?: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, phase, actions }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between pb-5 mb-6 border-b border-hairline">
    <div className="min-w-0">
      {phase && (
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-sage-dark mb-1">
          {phase}
        </div>
      )}
      <h1 className="font-editorial text-[26px] sm:text-[32px] leading-tight text-charcoal tracking-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm text-softgray mt-1 max-w-2xl">{subtitle}</p>
      )}
    </div>
    {actions && (
      <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>
    )}
  </div>
);

export const KpiCard: React.FC<{
  label: string;
  value: string | number;
  subtext?: string;
  tone?: 'default' | 'sage' | 'amber' | 'terracotta';
  icon?: React.ReactNode;
  onClick?: () => void;
}> = ({ label, value, subtext, tone = 'default', icon, onClick }) => {
  const dotColor =
    tone === 'sage'
      ? 'bg-status-green'
      : tone === 'amber'
        ? 'bg-status-amber'
        : tone === 'terracotta'
          ? 'bg-status-red'
          : 'bg-sage';

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-hairline rounded-atelier p-4 sm:p-5 transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:border-olive/50 hover:bg-porcelain/40' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.11em] text-softgray">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          {label}
        </span>
        {icon && (
          <span className="text-sage shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2.5 text-2xl sm:text-[26px] font-semibold text-charcoal tabular-nums tracking-tight">
        {value}
      </div>
      {subtext && <p className="mt-1 text-xs text-softgray">{subtext}</p>}
    </div>
  );
};

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-white border border-hairline rounded-atelier">
    <div className="w-12 h-12 rounded-full bg-mist text-olive flex items-center justify-center mb-3">
      {icon}
    </div>
    <h3 className="text-base font-semibold text-charcoal">{title}</h3>
    <p className="text-sm text-softgray mt-1 max-w-md">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidth?: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, maxWidth = 'max-w-lg', children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/45 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} bg-white border border-hairline rounded-atelier shadow-elevated animate-modal-in max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-hairline shrink-0">
          <div>
            <h2 className="font-editorial text-xl text-charcoal">{title}</h2>
            {subtitle && <p className="text-xs text-softgray mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-softgray hover:text-charcoal hover:bg-mist transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export const Drawer: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  widthClass?: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, widthClass = 'sm:max-w-xl', children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-charcoal/40"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={`w-full ${widthClass} bg-porcelain h-full border-l border-hairline shadow-elevated flex flex-col animate-drawer-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 bg-white border-b border-hairline shrink-0">
          <div className="min-w-0">
            <h2 className="font-editorial text-xl text-charcoal truncate">{title}</h2>
            {subtitle && (
              <p className="text-xs text-softgray mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-softgray hover:text-charcoal hover:bg-mist transition-colors shrink-0"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
};

export const AccessRestricted: React.FC<{
  title: string;
  description: string;
  actionLabel: string;
  onReturn: () => void;
}> = ({ title, description, actionLabel, onReturn }) => (
  <div className="max-w-lg mx-auto my-12 bg-white border border-hairline rounded-atelier p-8 text-center">
    <div className="w-12 h-12 rounded-full bg-status-redBg text-status-red flex items-center justify-center mx-auto mb-4">
      <Lock className="w-5 h-5" />
    </div>
    <h2 className="font-editorial text-2xl text-charcoal">{title}</h2>
    <p className="text-sm text-softgray mt-2 leading-relaxed">{description}</p>
    <Button onClick={onReturn} className="mt-6">
      {actionLabel}
    </Button>
  </div>
);

export const ToastViewport: React.FC<{
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 sm:bottom-5 right-4 z-[60] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] no-print"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const Icon =
          toast.tone === 'error'
            ? AlertCircle
            : toast.tone === 'warning'
              ? AlertTriangle
              : toast.tone === 'info'
                ? Info
                : CheckCircle2;
        const border =
          toast.tone === 'error'
            ? 'border-status-red/50'
            : toast.tone === 'warning'
              ? 'border-status-amber/50'
              : toast.tone === 'info'
                ? 'border-sage'
                : 'border-status-green/50';
        const iconColor =
          toast.tone === 'error'
            ? 'text-status-red'
            : toast.tone === 'warning'
              ? 'text-status-amber'
              : toast.tone === 'info'
                ? 'text-olive'
                : 'text-status-green';

        return (
          <div
            key={toast.id}
            className={`bg-white border ${border} rounded-atelier shadow-elevated px-4 py-3 flex items-start gap-2.5 animate-toast-in`}
          >
            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
            <p className="text-sm text-charcoal flex-1 leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="text-softgray hover:text-charcoal p-0.5"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
