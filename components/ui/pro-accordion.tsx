'use client';

import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { PlusIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

const ProAccordion = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Root ref={ref} className={cn('w-full', className)} {...props} />
));
ProAccordion.displayName = 'ProAccordion';

const ProAccordionItem = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item ref={ref} className={cn('border-b border-border transition-all', className)} {...props} />
));
ProAccordionItem.displayName = 'ProAccordionItem';

const ProAccordionTrigger = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex flex-1 items-center justify-between py-6 text-left text-base font-medium text-foreground outline-none transition-all hover:text-foreground/80',
        className,
      )}
      {...props}
    >
      {children}
      <div className="h-6 w-6 flex items-center justify-center rounded-full border border-border bg-background/80 shrink-0 group-data-[state=open]:rotate-45 group-data-[state=open]:border-primary transition-transform duration-200">
        <PlusIcon className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-45" />
      </div>
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
ProAccordionTrigger.displayName = 'ProAccordionTrigger';

const ProAccordionContent = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden transition-all"
    {...props}
  >
    <div className={cn('pb-6 pt-0 text-muted-foreground', className)}>{children}</div>
  </AccordionPrimitive.Content>
));
ProAccordionContent.displayName = 'ProAccordionContent';

export { ProAccordion, ProAccordionItem, ProAccordionTrigger, ProAccordionContent };
