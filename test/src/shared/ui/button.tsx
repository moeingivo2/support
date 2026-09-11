import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-active-blue text-white hover:bg-active-blue/90 focus-visible:ring-active-blue',
        success:
          'bg-succ-btn text-succ-txt hover:bg-succ-btn/80 focus-visible:ring-succ-txt',
        danger:
          'bg-deactive-btn-gray text-err-text hover:bg-white/5 focus-visible:ring-err-text',
        ghost: 'bg-white/5 text-zinc-200 hover:bg-white/10 focus-visible:ring-white/30',
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
