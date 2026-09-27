import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

const buttonVariants = cva(
  'group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full border text-sm font-semibold transition-[transform,background-color,border-color,box-shadow] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121010] active:scale-[.97] disabled:pointer-events-none disabled:opacity-50 before:absolute before:inset-y-0 before:-left-[35%] before:w-[30%] before:-skew-x-12 before:bg-white/25 before:blur-md before:transition-transform before:duration-500 hover:before:translate-x-[520%] [&_svg]:relative [&_svg]:z-10 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-300 group-hover:[&_svg]:translate-x-0.5',
  {
    variants: {
      variant: {
        primary:
          'border-active-blue bg-active-blue text-white shadow-[0_9px_22px_-12px_rgba(0,98,255,.95)] hover:-translate-y-0.5 hover:bg-[#1670ff] hover:shadow-[0_14px_28px_-12px_rgba(0,98,255,1)] focus-visible:ring-active-blue',
        success:
          'border-succ-txt/20 bg-succ-btn text-succ-txt shadow-[0_8px_20px_-14px_rgba(22,163,74,.8)] hover:-translate-y-0.5 hover:bg-[#f1fbf4] focus-visible:ring-succ-txt',
        danger:
          'border-err-text/25 bg-err-text/10 text-err-text hover:-translate-y-0.5 hover:border-err-text/50 hover:bg-err-text/15 focus-visible:ring-err-text',
        ghost: 'border-white/10 bg-white/[.035] text-zinc-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[.09] focus-visible:ring-white/30',
      },
      size: {
        md: 'h-11 px-5',
        icon: 'size-11 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

export function Button({
  asChild = false,
  className,
  size,
  variant,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button'
  return <Component className={cn(buttonVariants({ size, variant }), className)} {...props} />
}
