import * as RDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../util/cn';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
  overlayClassName?: string;
  showCloseButton?: boolean;
  titleClassName?: string;
  containerPadding?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  contentClassName,
  overlayClassName,
  showCloseButton = true,
  titleClassName,
  containerPadding = 'p-7',
}: DialogProps) {
  return (
    <RDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <RDialog.Portal>
        <RDialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-ink-strong/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            overlayClassName,
          )}
        />
        <div className={cn('fixed inset-0 z-50 flex items-center justify-center', containerPadding)}>
          <RDialog.Content
            onOpenAutoFocus={(e) => {
              // Let the natural autoFocus inside the dialog win when present.
              const root = e.currentTarget as HTMLElement;
              if (root.querySelector('[autofocus]')) {
                e.preventDefault();
              }
            }}
            className={cn(
              'relative bg-paper-elevated border border-rule-soft rounded-xl shadow-lg p-7 max-w-[480px] w-full focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
              contentClassName,
            )}
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <RDialog.Title className={cn('heading-3', titleClassName)}>
                {title}
              </RDialog.Title>
              {showCloseButton && (
                <RDialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Close"
                    className="text-ink-muted hover:text-ink-strong p-1 rounded hover:bg-paper-tinted transition-colors"
                  >
                    <X size={18} />
                  </button>
                </RDialog.Close>
              )}
            </div>
            {description && (
              <RDialog.Description asChild>
                <p className="body-sm text-ink-muted mb-4">{description}</p>
              </RDialog.Description>
            )}
            {!description && (
              <RDialog.Description className="sr-only">{typeof title === 'string' ? title : 'Dialog'}</RDialog.Description>
            )}
            {children}
          </RDialog.Content>
        </div>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

export const DialogClose = RDialog.Close;
