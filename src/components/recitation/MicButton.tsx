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
      className={`group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full p-1 sm:p-1.5 transition-all duration-300 active:scale-95 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 ${
        listening
          ? "bg-rose-500/20 shadow-[0_0_35px_rgba(244,63,94,0.65)] ring-2 ring-rose-400/80"
          : "bg-emerald-500/20 shadow-[0_8px_30px_rgba(16,185,129,0.45)] ring-2 ring-emerald-400/50 hover:ring-emerald-300 hover:shadow-[0_0_40px_rgba(16,185,129,0.7)]"
      }`}
    >
      {/* Outer ambient pulsing ripple for listening state */}
      {listening && (
        <>
          <span className="animate-ping absolute inset-0 rounded-full bg-rose-500 opacity-30" />
          <span className="animate-pulse absolute -inset-1 rounded-full bg-rose-400/20" />
        </>
      )}

      {/* Button Core */}
      <span
        className={`relative z-10 flex items-center justify-center w-full h-full rounded-full transition-all duration-300 shadow-inner ${
          listening
            ? "bg-gradient-to-b from-rose-500 via-rose-600 to-rose-800 text-white border-t border-rose-300/80 border-b border-rose-950/70 shadow-[inset_0_2px_4px_rgba(255,255,255,0.35),inset_0_-2px_4px_rgba(0,0,0,0.4)]"
            : "bg-gradient-to-b from-[#2ce8a6] via-[#10b981] to-[#047857] text-white border-t border-emerald-200/80 border-b border-emerald-950/80 shadow-[inset_0_2px_4px_rgba(255,255,255,0.45),inset_0_-2px_6px_rgba(0,0,0,0.4)]"
        }`}
      >
        {listening ? (
          <span className="relative flex items-center justify-center">
            {/* Crisp Stop Icon */}
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="5.5" y="5.5" width="13" height="13" rx="3" />
            </svg>
          </span>
        ) : (
          <svg
            className="w-6.5 h-6.5 sm:w-7 sm:h-7 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)] transition-transform duration-200 group-hover:scale-110"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 14.5c1.93 0 3.5-1.57 3.5-3.5V5.5C15.5 3.57 13.93 2 12 2s-3.5 1.57-3.5 3.5v5.5c0 1.93 1.57 3.5 3.5 3.5z" />
            <path d="M18 11c0 3.07-2.32 5.61-5.3 5.95V20.5h3a.75.75 0 010 1.5H8.3a.75.75 0 010-1.5h3V16.95C8.32 16.61 6 14.07 6 11a.75.75 0 011.5 0 4.5 4.5 0 009 0 .75.75 0 011.5 0z" />
          </svg>
        )}
      </span>
    </button>
  );
}
