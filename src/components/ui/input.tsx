import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-[#434a58] bg-[#252b35] px-3 py-1 text-sm text-[#d8dfea] shadow-sm transition-colors placeholder:text-[#939dad] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#8d96a6] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
