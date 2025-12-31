/**
 * @file skeleton.tsx
 * @description Loading skeleton component for placeholder content during data fetching
 * @module components/ui
 */

import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200", className)}
      {...props}
    />
  )
}

export { Skeleton }
