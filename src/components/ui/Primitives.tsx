import React, { useEffect } from 'react';
import { X, Lock, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import type { ToastItem } from '../../services/store';

export const LVBMonogram: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  inverted?: boolean;
}> = ({ size = 'md', inverted = false }) => {
  const dims =
    size === 'sm'
      ? 'w-8 h-8 text-xs'
      : size === 'lg'
        ? 'w-16 h-16 text-2xl'
        : 'w-10 h-10 text-sm';

  return (
    <div
      className={`${dims} rounded-lg flex items-center justify-center font-editorial tracking-wider select-none shrink-0 border ${
        inverted
          ? 'bg-navy text-champagne-soft border-champagne/40'
          : 'bg-navy-deep text-champagne-soft border-champagne/50'
      }`}
      aria-hidden="true"
    >
      LVB
    </div>
  );
};

export type BadgeTone = 'sage' | 'amber' | 'terracotta' | 'slate' | 'navy' | 'champagne';

const BADGE_CLASSES: Record<BadgeTone, string> = {
  sage: 'bg-sage-light text-sage-dark border-sage/30',
  amber: 'bg-amberwarm-light text-amberwarm-dark border-amberwarm/30',
  terracotta: 'bg-terracotta-light text-terracotta-dark border-terracotta/30',
  slate: 'bg-ivory text-slatewarm border-borderwarm',
  navy: 'bg-navy text-white border-navy',
  champagne: 'bg-champagne-light text-navy border-champagne/40',
};

export const Badge: React.FC<{
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}> = ({ children, tone = 'slate', className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${BADGE_CLASSES[tone]} ${className}`}
  >
    {children}
  </span>
);

export type ButtonVariant = 'primary' | 'champagne' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-navy text-white hover:bg-navy-deep active:scale-[0.99] border border-navy',
  champagne:
    'bg-champagne text-white hover:bg-[#a68950] active:scale-[0.99] border border-champagne',
  secondary:
    'bg-white text-navy hover:bg-ivory active:scale-[0.99] border border-borderwarm',
  ghost:
    'bg-transparent text-navy hover:bg-ivory active:scale-[0.99] border border-transparent',
  danger:
    'bg-terracotta text-white hover:bg-terracotta-dark active:scale-[0.99] border border-terracotta',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
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
    ? 'cursor-pointer hover:border-champagne/60 hover:shadow-card transition-all duration-150'
    : '';
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-borderwarm rounded-card shadow-subtle ${interactive} ${className}`}
    >
      {children}
    </div>
  );
};

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  phase?: 'Phase 1' | 'Phase 2' | string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, phase, actions }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
    <div className="min-w-0">
      <div className="flex items-center gap-2.5 flex-wrap">
        <h1 className="font-editorial text-[26px] sm:text-[32px] leading-tight text-navy tracking-tight">
          {title}
        </h1>
        {phase && (
          <Badge tone="champagne" className="text-[11px] uppercase tracking-wider">
            {phase}
          </Badge>
        )}
      </div>
      {subtitle && (
        <p className="text-sm text-slatewarm mt-1 max-w-2xl">{subtitle}</p>
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
  const accentBar =
    tone === 'sage'
      ? 'bg-sage'
      : tone === 'amber'
        ? 'bg-amberwarm'
        : tone === 'terracotta'
          ? 'bg-terracotta'
          : 'bg-champagne';

  return (
    <Card onClick={onClick} className="p-4 sm:p-5 relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${accentBar} opacity-75`} />
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-slatewarm">
          {label}
        </span>
        {icon && (
          <span className="text-champagne shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2.5 text-2xl sm:text-[26px] font-semibold text-navy tabular-nums tracking-tight">
        {value}
      </div>
      {subtext && <p className="mt-1 text-xs text-slatewarm">{subtext}</p>}
    </Card>
  );
};

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-white border border-borderwarm rounded-card">
    <div className="w-12 h-12 rounded-full bg-ivory text-champagne flex items-center justify-center mb-3">
      {icon}
    </div>
    <h3 className="text-base font-semibold text-navy">{title}</h3>
    <p className="text-sm text-slatewarm mt-1 max-w-md">{description}</p>
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/45 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} bg-white border border-borderwarm rounded-card shadow-elevated animate-modal-in max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-borderwarm shrink-0">
          <div>
            <h2 className="font-editorial text-xl text-navy">{title}</h2>
            {subtitle && <p className="text-xs text-slatewarm mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slatewarm hover:text-navy hover:bg-ivory transition-colors"
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
      className="fixed inset-0 z-50 flex justify-end bg-navy/40"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={`w-full ${widthClass} bg-porcelain h-full border-l border-borderwarm shadow-elevated flex flex-col animate-drawer-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 bg-white border-b border-borderwarm shrink-0">
          <div className="min-w-0">
            <h2 className="font-editorial text-xl text-navy truncate">{title}</h2>
            {subtitle && (
              <p className="text-xs text-slatewarm mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slatewarm hover:text-navy hover:bg-ivory transition-colors shrink-0"
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
  <div className="max-w-lg mx-auto my-12 bg-white border border-borderwarm rounded-card p-8 text-center shadow-subtle">
    <div className="w-12 h-12 rounded-full bg-terracotta-light text-terracotta-dark flex items-center justify-center mx-auto mb-4">
      <Lock className="w-5 h-5" />
    </div>
    <h2 className="font-editorial text-2xl text-navy">{title}</h2>
    <p className="text-sm text-slatewarm mt-2 leading-relaxed">{description}</p>
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
            ? 'border-terracotta/60'
            : toast.tone === 'warning'
              ? 'border-amberwarm/60'
              : toast.tone === 'info'
                ? 'border-champagne/60'
                : 'border-sage/60';
        const iconColor =
          toast.tone === 'error'
            ? 'text-terracotta'
            : toast.tone === 'warning'
              ? 'text-amberwarm'
              : toast.tone === 'info'
                ? 'text-champagne'
                : 'text-sage-dark';

        return (
          <div
            key={toast.id}
            className={`bg-white border ${border} rounded-xl shadow-elevated px-4 py-3 flex items-start gap-2.5 animate-toast-in`}
          >
            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
            <p className="text-sm text-navy flex-1 leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="text-slatewarm hover:text-navy p-0.5"
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
