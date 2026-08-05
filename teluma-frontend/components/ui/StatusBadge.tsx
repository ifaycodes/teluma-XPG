interface StatusBadgeProps {
  status: string
  styles: Record<string, string>
  label?: string
  indicator?: 'pulse' | 'spin' | 'none'
}

export function StatusBadge({ status, styles, label, indicator = 'none' }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${styles[status] || Object.values(styles)[0]}`}>
      {indicator === 'pulse' && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {indicator === 'spin' && <span className="w-2 h-2 rounded-full border border-current border-t-transparent animate-spin" />}
      {label || status}
    </span>
  )
}
