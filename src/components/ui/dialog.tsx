"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/30 duration-100 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-6 rounded-[min(var(--radius-4xl),24px)] bg-popover p-6 text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/5 duration-100 outline-none sm:max-w-md dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-4 right-4 h-10 w-10"
                size="icon"
              />
            }
          >
            <XIcon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-base leading-none font-medium",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

/**
 * Wide work surface for table and long-form workflows.
 *
 * This is intentionally a composition over the canonical Dialog primitive.
 * The base layout is an inset-free full-screen surface; from the `sm`
 * breakpoint onward it becomes a centered wide overlay with a tokenized
 * overlay radius. Header and footer remain fixed while the body scrolls.
 */
function WorkDialogContent({
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props & { showCloseButton?: boolean }) {
  return (
    <DialogContent
      data-slot="work-dialog-content"
      className={cn(
        "inset-0 top-0 left-0 grid h-[100dvh] min-w-0 max-h-none min-h-[100dvh] max-w-[100vw] translate-x-0 translate-y-0 overflow-x-hidden grid-rows-[auto_minmax(0,1fr)_auto] gap-0 rounded-none p-0",
        "sm:top-1/2 sm:left-1/2 sm:h-auto sm:min-h-0 sm:max-h-[min(96dvh,980px)] sm:max-w-[min(960px,calc(100%-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-overlay)]",
        className,
      )}
      {...props}
    >
      {children}
    </DialogContent>
  )
}

function WorkDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <DialogHeader
      data-slot="work-dialog-header"
      className={cn("shrink-0 border-b border-border px-6 py-5", className)}
      {...props}
    />
  )
}

function WorkDialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="work-dialog-body"
      className={cn("min-h-0 w-full min-w-0 max-w-full overflow-x-hidden overflow-y-auto px-6 py-5", className)}
      {...props}
    />
  )
}

function WorkDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <DialogFooter
      data-slot="work-dialog-footer"
      className={cn("shrink-0 border-t border-border bg-muted/30 px-6 py-4", className)}
      {...props}
    />
  )
}

const WorkDialog = Dialog
const WorkDialogTrigger = DialogTrigger

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  WorkDialog,
  WorkDialogBody,
  WorkDialogContent,
  WorkDialogFooter,
  WorkDialogHeader,
  WorkDialogTrigger,
}
