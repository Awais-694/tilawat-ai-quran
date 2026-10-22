export function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon?: string;
}) {
  return (
    <div className="bg-white border border-[#e5ded0] rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-[0_2px_8px_rgba(20,50,30,0.04)] hover:border-[#c5a059] transition-all flex flex-col justify-between text-center sm:text-left">
      <div className="text-[10px] sm:text-xs font-semibold text-[#527060] uppercase tracking-wider truncate">
        {label}
      </div>
      <div className="text-lg sm:text-2xl font-bold text-[#112a1d] tracking-tight my-1 font-mono">
        {value}
      </div>
      {sublabel && (
        <div className="text-[9px] sm:text-[11px] text-[#718b7c] font-medium truncate">
          {sublabel}
        </div>
      )}
    </div>
  );

}
