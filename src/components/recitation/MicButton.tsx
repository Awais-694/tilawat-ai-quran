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
          ? "shadow-[0_0_35px_rgba(244,63,94,0.7)] ring-4 ring-rose-500/30"
          : "shadow-[0_0_30px_rgba(16,185,129,0.65)] ring-4 ring-emerald-500/30 hover:ring-emerald-400/50 hover:shadow-[0_0_40px_rgba(16,185,129,0.85)]"
      }`}
    >
      {/* Outer ambient pulsing ripple for listening state */}
      {listening && (
        <span className="animate-ping absolute inset-0 rounded-full bg-rose-500 opacity-40" />
      )}

      {/* Button Core */}
      <span
        className={`relative z-10 flex items-center justify-center w-full h-full rounded-full transition-all duration-300 border-2 ${
          listening
            ? "bg-gradient-to-b from-rose-500 via-rose-600 to-rose-700 text-white border-rose-300/80 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]"
            : "bg-gradient-to-b from-[#34d399] via-[#10b981] to-[#047857] text-white border-emerald-200/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),0_4px_12px_rgba(0,0,0,0.3)]"
        }`}
      >
        {listening ? (
          <span className="relative flex items-center justify-center">
            {/* Crisp Stop Icon */}
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="6" y="6" width="12" height="12" rx="2.5" />
            </svg>
          </span>
        ) : (
          <svg
            className="w-6.5 h-6.5 sm:w-7 sm:h-7 text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.35)] transition-transform duration-200 group-hover:scale-110"
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
