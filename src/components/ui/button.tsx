import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border-2 border-border bg-background hover:bg-muted hover:border-primary/40",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm",
        ghost: "hover:bg-muted",
        link: "text-primary underline-offset-4 hover:underline rounded-none",
        hero: "bg-gradient-cta text-accent-foreground shadow-glow-cta hover:shadow-glow-cta hover:brightness-110 hover:-translate-y-0.5 font-display tracking-tight",
        impact: "bg-gradient-impact text-primary-foreground shadow-glow-primary hover:brightness-110 hover:-translate-y-0.5 font-display tracking-tight",
        trust: "bg-gradient-trust text-secondary-foreground shadow-glow-trust hover:brightness-110 hover:-translate-y-0.5 font-display tracking-tight",
        soft: "bg-primary/10 text-primary hover:bg-primary/15 border border-primary/15",
        glass: "bg-white/15 backdrop-blur-md text-white border border-white/25 hover:bg-white/25",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-13 px-8 text-base py-3",
        xl: "h-14 px-10 text-base",
        icon: "h-11 w-11",
        pill: "h-9 px-4 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
