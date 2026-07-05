import type { ButtonHTMLAttributes } from 'react'

type Variant = 'default' | 'primary' | 'danger'

const variants: Record<Variant, string> = {
  default: 'border-border bg-surface-hi text-ink hover:border-amber hover:text-amber',
  primary: 'border-amber bg-amber text-amber-ink hover:brightness-110',
  danger: 'border-border bg-surface-hi text-ink hover:border-red hover:text-red',
}

export function Button({
  variant = 'default',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={[
        'rounded-lg border px-4 py-2 text-sm font-medium cursor-pointer transition-all duration-150 active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant],
        className,
      ].join(' ')}
      {...props}
    />
  )
}
