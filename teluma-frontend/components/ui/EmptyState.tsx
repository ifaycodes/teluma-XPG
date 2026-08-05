export function EmptyState({
  icon,
  title,
  subtitle,
  className = '',
}: {
  icon: string
  title: string
  subtitle?: string
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      <span className="material-symbols-outlined text-5xl text-[#1C1C1C]/15 mb-3">{icon}</span>
      <p className="text-[#2C1A0E]/60 text-sm">{title}</p>
      {subtitle && <p className="text-xs text-[#2C1A0E]/40 mt-1">{subtitle}</p>}
    </div>
  )
}
