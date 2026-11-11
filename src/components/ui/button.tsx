import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-black/20",
  {
    variants: {
      variant: {
        default: "bg-black text-white hover:bg-black/90 active:scale-[0.98]",
        destructive: "bg-[#e11900] text-white hover:bg-[#c41400]",
        outline:
          "border border-black/15 bg-white text-black hover:bg-black/5",
        secondary: "bg-[#eeeeee] text-black hover:bg-[#e2e2e2]",
        ghost: "hover:bg-black/5 text-black",
        link: "text-black underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-full gap-1.5 px-4 text-sm",
        lg: "h-12 rounded-full px-8 text-base",
        icon: "size-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
