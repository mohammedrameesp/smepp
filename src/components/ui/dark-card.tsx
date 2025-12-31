/**
 * @file dark-card.tsx
 * @description Dark themed card components for contrasting sections
 * @module components/ui
 */

import * as React from "react"
import { cn } from "@/lib/utils"

function DarkCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-slate-800/40 text-blue-50 border-slate-700/50 backdrop-blur-sm",
        "flex flex-col gap-6 rounded-xl border py-6 shadow-lg",
        "hover:bg-slate-800/50 transition-all duration-200",
        className
      )}
      {...props}
    />
  )
}

function DarkCardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        "border-slate-700/50",
        className
      )}
      {...props}
    />
  )
}

function DarkCardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold text-blue-50", className)}
      {...props}
    />
  )
}

function DarkCardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-blue-200 text-sm", className)}
      {...props}
    />
  )
}

function DarkCardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function DarkCardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function DarkCardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6 border-slate-700/50", className)}
      {...props}
    />
  )
}

export {
  DarkCard,
  DarkCardHeader,
  DarkCardFooter,
  DarkCardTitle,
  DarkCardAction,
  DarkCardDescription,
  DarkCardContent,
}
