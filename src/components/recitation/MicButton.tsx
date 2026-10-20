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
      className={`group relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full p-0.5 transition-all duration-300 active:scale-95 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 ${
        listening
          ? "bg-rose-500/20 shadow-[0_0_25px_rgba(244,63,94,0.5)] ring-1 ring-rose-400/70"
          : "bg-emerald-500/20 shadow-[0_4px_18px_rgba(16,185,129,0.35)] ring-1 ring-emerald-400/40 hover:ring-emerald-300/70 hover:shadow-[0_0_24px_rgba(16,185,129,0.5)]"
      }`}
    >
      {/* Outer ambient pulsing ripple for listening state */}
      {listening && (
        <>
          <span className="animate-ping absolute inset-0 rounded-full bg-rose-500 opacity-25" />
          <span className="animate-pulse absolute -inset-0.5 rounded-full bg-rose-400/20" />
        </>
      )}

      {/* Button Core */}
      <span
        className={`relative z-10 flex items-center justify-center w-full h-full rounded-full transition-all duration-300 shadow-sm ${
          listening
            ? "bg-gradient-to-b from-rose-500 to-rose-700 text-white border-t border-rose-300/60"
            : "bg-gradient-to-b from-[#2ce8a6] via-[#10b981] to-[#059669] text-white border-t border-emerald-200/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]"
        }`}
      >
        {listening ? (
          <span className="relative flex items-center justify-center">
            {/* Crisp Stop Icon */}
            <svg
              className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="6" y="6" width="12" height="12" rx="2.5" />
            </svg>
          </span>
        ) : (
          <svg
            className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform duration-200 group-hover:scale-105"
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
