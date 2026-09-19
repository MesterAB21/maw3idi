import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-button font-[600] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/15 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-primary text-white hover:bg-brand-primary-active focus-visible:ring-3 focus-visible:ring-ring/15",
        "primary-gradient":
          "bg-brand-gradient text-white hover:opacity-95 hover:bg-brand-gradient focus-visible:ring-3 focus-visible:ring-ring/15",
        secondary:
          "bg-canvas border border-hairline text-ink hover:bg-surface-soft focus-visible:ring-3 focus-visible:ring-ring/15",
        ghost:
          "bg-transparent text-brand-primary hover:bg-surface-soft focus-visible:ring-3 focus-visible:ring-ring/15",
        danger:
          "bg-danger text-white hover:bg-red-700 focus-visible:ring-3 focus-visible:ring-red-600/15",
        success:
          "bg-success text-white hover:bg-green-700 focus-visible:ring-3 focus-visible:ring-green-600/15",
        "icon-outline":
          "inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-hairline bg-canvas text-muted hover:bg-surface-soft hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/15",
        "icon-ghost":
          "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-card hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/15",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-5 py-[10px]",
        lg: "h-12 px-6 text-[15px]",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };