import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '../../util/cn';

export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;
export const MenuPortal = DropdownMenu.Portal;
export const MenuGroup = DropdownMenu.Group;
export const MenuSeparator = ({ className }: { className?: string }) => (
  <DropdownMenu.Separator
    className={cn('h-px my-1 bg-rule-soft', className)}
  />
);
export const MenuSub = DropdownMenu.Sub;

export function MenuContent({
  className,
  sideOffset = 4,
  align = 'start',
  ...rest
}: React.ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          'z-50 min-w-[180px] bg-paper-elevated border border-rule-soft rounded-md shadow-md py-1 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          className,
        )}
        {...rest}
      />
    </DropdownMenu.Portal>
  );
}

export function MenuItem({
  className,
  ...rest
}: React.ComponentProps<typeof DropdownMenu.Item>) {
  return (
    <DropdownMenu.Item
      className={cn(
        'flex items-center gap-2 px-3 py-2 text-sm text-ink-default cursor-pointer outline-none data-[highlighted]:bg-paper-tinted data-[highlighted]:text-ink-strong data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
        className,
      )}
      {...rest}
    />
  );
}

export function MenuSubTrigger({
  className,
  ...rest
}: React.ComponentProps<typeof DropdownMenu.SubTrigger>) {
  return (
    <DropdownMenu.SubTrigger
      className={cn(
        'flex items-center gap-2 px-3 py-2 text-sm text-ink-default cursor-pointer outline-none data-[highlighted]:bg-paper-tinted data-[highlighted]:text-ink-strong data-[state=open]:bg-paper-tinted',
        className,
      )}
      {...rest}
    />
  );
}

export function MenuSubContent({
  className,
  sideOffset = 4,
  ...rest
}: React.ComponentProps<typeof DropdownMenu.SubContent>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.SubContent
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[180px] bg-paper-elevated border border-rule-soft rounded-md shadow-md py-1 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          className,
        )}
        {...rest}
      />
    </DropdownMenu.Portal>
  );
}
