import React from 'react';
import { cn } from '../../utils/cn';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'warning' | 'info';
}

export function Alert({ className, variant = 'default', ...props }: AlertProps) {
  const variants = {
    default: 'bg-white text-slate-950',
    destructive: 'border-red-500/50 text-red-600 dark:border-red-500 [&>svg]:text-red-600 bg-red-50',
    warning: 'border-amber-500/50 text-amber-600 dark:border-amber-500 [&>svg]:text-amber-600 bg-amber-50',
    info: 'border-blue-500/50 text-blue-600 dark:border-blue-500 [&>svg]:text-blue-600 bg-blue-50',
  };

  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-slate-950",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      className={cn("mb-1 font-black leading-none tracking-tight", className)}
      {...props}
    />
  );
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <div
      className={cn("text-xs [&_p]:leading-relaxed font-bold opacity-90", className)}
      {...props}
    />
  );
}
