export function StatusDot({ live }: { live: boolean }) {
  return (
    <span
      className={[
        'inline-block h-2 w-2 rounded-full transition-all duration-200',
        live ? 'bg-green shadow-[0_0_8px_var(--color-green)]' : 'bg-border',
      ].join(' ')}
      title={live ? 'connected' : 'connecting…'}
    />
  )
}
