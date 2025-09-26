import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "outline" | "ghost";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", ...props }, ref) => {
        return (
            <button
                className={cn(
                    "px-4 py-2 rounded font-medium transition",
                    variant === "default"
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : variant === "outline"
                            ? "border border-gray-300 bg-white text-gray-900 hover:bg-gray-100"
                            : "bg-transparent text-gray-700 hover:bg-gray-200 border-none shadow-none",
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";
