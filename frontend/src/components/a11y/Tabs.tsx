import * as RTabs from '@radix-ui/react-tabs';
import { cn } from '../../util/cn';

export const Tabs = RTabs.Root;

export function TabList({
  className,
  ...rest
}: React.ComponentProps<typeof RTabs.List>) {
  return (
    <RTabs.List
      className={cn('flex flex-wrap gap-1 border-b border-rule-soft', className)}
      {...rest}
    />
  );
}

export function Tab({
  className,
  ...rest
}: React.ComponentProps<typeof RTabs.Trigger>) {
  return (
    <RTabs.Trigger
      className={cn(
        'px-4 py-2.5 border-b-2 -mb-px text-sm font-semibold transition-colors outline-none cursor-pointer',
        'border-transparent text-ink-muted hover:text-ink-strong',
        'data-[state=active]:border-navy data-[state=active]:text-ink-strong',
        'focus-visible:ring-2 focus-visible:ring-navy/30 rounded-sm',
        className,
      )}
      {...rest}
    />
  );
}

export function TabPanel({
  className,
  ...rest
}: React.ComponentProps<typeof RTabs.Content>) {
  return (
    <RTabs.Content
      className={cn('outline-none', className)}
      {...rest}
    />
  );
}
