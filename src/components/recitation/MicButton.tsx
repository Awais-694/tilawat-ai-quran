export function MicButton({
  listening,
  disabled,
  onClick,
}: {
  listening: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={listening ? "Stop Reciting (Tap to finish)" : "Start Reciting (Tap to speak)"}
      aria-label={listening ? "Stop Reciting" : "Start Reciting"}
      className={`group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full transition-all duration-300 active:scale-95 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 -my-2.5 z-10 ${
        listening
          ? "shadow-[0_0_40px_rgba(244,63,94,0.75),0_0_15px_rgba(251,113,133,0.5)]"
          : "shadow-[0_0_35px_rgba(16,185,129,0.65),0_0_15px_rgba(52,211,153,0.45)] hover:shadow-[0_0_50px_rgba(16,185,129,0.9)]"
      }`}
    >
      {/* Outer ambient pulsing sonar waves for active recitation */}
      {listening && (
        <>
          <span className="animate-ping absolute -inset-1 rounded-full bg-rose-500/40" />
          <span className="animate-pulse absolute -inset-2 rounded-full bg-rose-400/20" />
        </>
      )}

      {/* Luxury Metallic Chamfered Bezel */}
      <span
        className={`absolute inset-0 rounded-full p-[2.5px] transition-all duration-300 ${
          listening
            ? "bg-gradient-to-b from-rose-300 via-rose-500/60 to-rose-950 shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
            : "bg-gradient-to-b from-emerald-200 via-emerald-400/60 to-[#022c1e] shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
        }`}
      >
        <span className="block w-full h-full rounded-full bg-black/40" />
      </span>

      {/* Button Core: Deep Radiant Gemstone */}
      <span
        className={`relative z-10 overflow-hidden flex items-center justify-center w-[calc(100%-5px)] h-[calc(100%-5px)] rounded-full transition-all duration-300 shadow-inner ${
          listening
            ? "bg-[radial-gradient(ellipse_at_30%_25%,_var(--tw-gradient-stops))] from-rose-400 via-rose-600 to-rose-950 text-white"
            : "bg-[radial-gradient(ellipse_at_30%_25%,_var(--tw-gradient-stops))] from-[#4ade80] via-[#10b981] to-[#034426] text-white"
        }`}
      >
        {/* Curved 3D Sapphire Glass Reflection (Top Specular Highlight) */}
        <span className="absolute inset-x-2 top-0.5 h-[42%] rounded-t-full bg-gradient-to-b from-white/60 via-white/20 to-transparent pointer-events-none" />

        {/* Ambient bottom rim bounce light */}
        <span
          className={`absolute inset-x-3 bottom-0.5 h-[20%] rounded-b-full pointer-events-none ${
            listening ? "bg-rose-300/25 blur-[1px]" : "bg-emerald-200/30 blur-[1px]"
          }`}
        />

        {/* Icon Container */}
        {listening ? (
          <span className="relative flex items-center justify-center z-20">
            {/* Crisp Stop Square with soft bevel */}
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.5)]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="5.5" y="5.5" width="13" height="13" rx="3.5" />
            </svg>
          </span>
        ) : (
          <span className="relative flex items-center justify-center z-20 transition-transform duration-200 group-hover:scale-108">
            <svg
              className="w-6.5 h-6.5 sm:w-7 sm:h-7 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 14.5c1.93 0 3.5-1.57 3.5-3.5V5.5C15.5 3.57 13.93 2 12 2s-3.5 1.57-3.5 3.5v5.5c0 1.93 1.57 3.5 3.5 3.5z" />
              <path d="M18 11c0 3.07-2.32 5.61-5.3 5.95V20.5h3a.75.75 0 010 1.5H8.3a.75.75 0 010-1.5h3V16.95C8.32 16.61 6 14.07 6 11a.75.75 0 011.5 0 4.5 4.5 0 009 0 .75.75 0 011.5 0z" />
            </svg>
          </span>
        )}
      </span>
    </button>
  );
}
