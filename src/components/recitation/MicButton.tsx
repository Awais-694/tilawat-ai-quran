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
      title={listening ? "Stop Reciting (Tap to Stop)" : "Start Reciting (Tap to Speak)"}
      aria-label={listening ? "Stop Reciting" : "Start Reciting"}
      className={`group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full transition-all duration-300 active:scale-95 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 -my-2.5 z-10 ${
        listening
          ? "shadow-[0_0_35px_rgba(244,63,94,0.75)] ring-4 ring-rose-500/30"
          : "shadow-[0_0_30px_rgba(16,185,129,0.65)] ring-4 ring-emerald-500/30 hover:ring-emerald-400/50 hover:shadow-[0_0_40px_rgba(16,185,129,0.85)]"
      }`}
    >
      {/* Outer ambient pulsing ripple for listening state */}
      {listening && (
        <>
          <span className="animate-ping absolute inset-0 rounded-full bg-rose-500 opacity-40" />
          <span className="animate-pulse absolute -inset-1 rounded-full bg-rose-400/20" />
        </>
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
          <span className="relative flex flex-col items-center justify-center z-20">
            {/* Crisp Stop Square */}
            <svg
              className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="6" y="6" width="12" height="12" rx="2.5" />
            </svg>
            <span className="text-[9px] font-bold text-white tracking-wider uppercase mt-0.5 select-none drop-shadow">
              STOP
            </span>
          </span>
        ) : (
          <span className="relative flex items-center justify-center z-20 transition-transform duration-200 group-hover:scale-110">
            {/* Unmistakable Real Studio Microphone with Acoustic Soundwaves */}
            <svg
              className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.35)]"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Left Sound Wave Bracket */}
              <path
                d="M5 10C4.1 11.2 3.6 12.5 3.6 14C3.6 15.5 4.1 16.8 5 18"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="opacity-80"
              />
              {/* Right Sound Wave Bracket */}
              <path
                d="M23 10C23.9 11.2 24.4 12.5 24.4 14C24.4 15.5 23.9 16.8 23 18"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="opacity-80"
              />

              {/* Central Mic Capsule */}
              <rect
                x="10.5"
                y="3.5"
                width="7"
                height="12"
                rx="3.5"
                fill="white"
              />

              {/* Realistic Studio Grille Slits */}
              <line
                x1="11.8"
                y1="7.5"
                x2="16.2"
                y2="7.5"
                stroke="#047857"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <line
                x1="11.8"
                y1="10"
                x2="16.2"
                y2="10"
                stroke="#047857"
                strokeWidth="1.2"
                strokeLinecap="round"
              />

              {/* U-Shaped Acoustic Cradle */}
              <path
                d="M8.5 12.5C8.5 15.54 10.96 18 14 18C17.04 18 19.5 15.54 19.5 12.5"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
              />

              {/* Vertical Mic Stem */}
              <line
                x1="14"
                y1="18"
                x2="14"
                y2="22.5"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
              />

              {/* Weighted Studio Base Stand */}
              <line
                x1="10.5"
                y1="22.5"
                x2="17.5"
                y2="22.5"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </span>
        )}
      </span>
    </button>
  );
}
