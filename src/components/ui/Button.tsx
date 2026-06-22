import React from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-sm text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50",
          {
            'bg-slate-900 text-slate-50 hover:bg-slate-900/90 shadow': variant === 'default',
            'border border-slate-200 bg-transparent hover:bg-slate-100 hover:text-slate-900 shadow-sm': variant === 'outline',
            'hover:bg-slate-100 hover:text-slate-900': variant === 'ghost',
            'bg-red-500 text-slate-50 hover:bg-red-500/90 shadow-sm': variant === 'destructive',
            'h-7 px-3 py-1.5': size === 'default',
            'h-6 rounded-sm px-2 text-[10px]': size === 'sm',
            'h-8 rounded-sm px-4': size === 'lg',
            'h-7 w-7': size === 'icon',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
