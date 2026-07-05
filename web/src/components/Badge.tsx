export function Badge({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-border bg-surface-hi px-2.5 py-0.5 text-xs text-muted">
      {children}
    </span>
  )
}
