import { OFFSET } from '@/lib/theme'

export function StatTile({ label, value, icon }: { label: string, value: number, icon: string }) {
  return (
    <div className={`bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-xl p-4 flex items-center gap-3 ${OFFSET}`}>
      <div className="w-10 h-10 rounded-lg bg-[#1C1C1C]/5 flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-[#A8192E] text-lg">{icon}</span>
      </div>
      <div>
        <div className="text-xl font-bold text-[#1C1C1C] leading-tight">{value}</div>
        <div className="text-xs text-[#2C1A0E]/60">{label}</div>
      </div>
    </div>
  )
}
