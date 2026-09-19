import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border border-transparent px-3 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-brand-primary/10 text-brand-primary",
        secondary: "bg-surface-card text-muted",
        outline: "border-hairline bg-canvas text-body",
        success: "bg-status-confirmed-bg text-status-confirmed",
        danger: "bg-status-cancelled-bg text-status-cancelled",
        warning: "bg-status-pending-bg text-status-pending",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };