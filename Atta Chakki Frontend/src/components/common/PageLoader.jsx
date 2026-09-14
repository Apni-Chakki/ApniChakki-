import React from 'react';
export function PageLoader({ fullScreen = false, message = 'Loading fresh quality...' }) {
  return (
    <div
      className={`flex items-center justify-center transition-all duration-300 ${fullScreen
          ? 'fixed inset-0 z-50 bg-[#faf8f5]/85 backdrop-blur-md'
          : 'min-h-[55vh] w-full py-16 px-4'
        }`}
    >
      <div className="relative flex flex-col items-center justify-center max-w-xs w-full">
        {/* Soft Ambient Glow Behind */}
        <div className="absolute -inset-4 bg-gradient-to-r from-amber-400/15 via-[#8b6f47]/20 to-amber-200/15 rounded-full blur-2xl pointer-events-none animate-gentle-pulse" />

        {/* Glassmorphic Brand Card */}
        <div className="relative z-10 w-full flex flex-col items-center p-7 sm:p-8 rounded-3xl bg-white/90 backdrop-blur-xl border border-amber-200/60 shadow-[0_14px_35px_rgba(139,111,71,0.09)]">
          {/* Animated Spinning Chakki / Grain Rings */}
          <div className="relative w-20 h-20 sm:w-22 sm:h-22 flex items-center justify-center mb-5">
            {/* Outer Slow-Dashed Orbit */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#8b6f47]/30 animate-spin-slow" />

            {/* Middle Reverse-Spinning Golden Arc */}
            <div className="absolute inset-1 rounded-full border-2 border-transparent border-t-[#8b6f47] border-r-[#c29d66] animate-spin-reverse" />

            {/* Inner Glowing Badge with Brand Wheat Logo */}
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#8b6f47] via-[#9e7f52] to-[#6d5535] p-0.5 shadow-md shadow-[#8b6f47]/35 flex items-center justify-center animate-grain-float">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-[#8b6f47] to-[#6e5635] flex items-center justify-center p-2.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-full h-full drop-shadow-sm"
                >
                  <path d="M2 22 16 8" />
                  <path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
                  <path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
                  <path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
                  <path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z" />
                </svg>
              </div>
            </div>

            {/* Orbiting Sparkle Dot */}
            <div className="absolute inset-0 animate-spin-slow">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] -top-1 left-1/2 -translate-x-1/2" />
            </div>
          </div>

          {/* Brand Name & Tagline */}
          <div className="text-center space-y-1 mb-4">
            <h3 className="text-base sm:text-lg font-extrabold tracking-wide text-gray-800 font-serif">
              Suchi Chakki
            </h3>
            <p className="text-[11px] font-medium text-amber-800/80 tracking-wider">
              خالص اور تازہ چکی آٹا
            </p>
          </div>

          {/* Shimmering Progress Bar */}
          <div className="w-36 sm:w-44 h-1.5 bg-amber-100/90 rounded-full overflow-hidden relative shadow-inner">
            <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-[#8b6f47] to-transparent animate-shimmer-sweep rounded-full" />
          </div>

          {/* Subtext */}
          <p className="mt-3 text-[11px] text-gray-500 font-medium animate-pulse">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

export default PageLoader;
