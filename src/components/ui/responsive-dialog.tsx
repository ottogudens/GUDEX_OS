
"use client";

import * as React from 'react';
import { useMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';

interface ResponsiveDialogProps {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

/**
 * A responsive component that renders a Dialog on desktop and a Sheet on mobile.
 */
export function ResponsiveDialog({
  trigger,
  title,
  description,
  children,
  footer,
  isOpen,
  onOpenChange,
}: ResponsiveDialogProps) {
  const isMobile = useMobile();

  const commonContent = (
    <>
      <div className="p-6">{children}</div>
      {footer && (
        <div className="p-6 pt-0">
          {footer}
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="bottom" className="max-h-[90vh] flex flex-col">
          <SheetHeader className="text-left px-6">
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            {commonContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {commonContent}
      </DialogContent>
    </Dialog>
  );
}

// Exporting individual parts for potential custom composition
export {
  DialogClose as ResponsiveDialogClose,
  DialogFooter as ResponsiveDialogFooter,
};
