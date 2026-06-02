import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-white">
      {/* Left Column: Visual Panel */}
      <div className="login-visual-panel flex-1 flex flex-col justify-between p-12">
        <div className="visual-panel-grid"></div>
        <div className="visual-panel-orb"></div>

        {/* Brand Logo */}
        <a href="/" className="flex items-center gap-2.5 z-[2]">
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="#FFFFFF" />
            <path d="M8 14L12 10L16 14L12 18Z" fill="black" opacity="0.9" />
            <path d="M14 10L18 14L14 18" stroke="black" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </svg>
          <span className="font-extrabold text-[1.1rem] tracking-wide text-white">RECRUIT <span className="border border-white px-1 py-0 rounded text-[0.75rem] ml-1 font-extrabold">AI</span></span>
        </a>

        {/* Hero Visual Core */}
        <div className="z-[2] max-w-[440px] my-auto">
          <div className="w-[110px] h-[110px] mb-7 bg-white/[0.03] border border-white/10 rounded-[18px] flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative">
            <div className="absolute inset-[-2px] rounded-[18px] bg-gradient-to-br from-white/20 to-transparent -z-10"></div>
            <Image
              src="/recruit_ai_logo.png"
              alt="Recruit AI Logo"
              width={60}
              height={60}
              className="logo-pulse invert opacity-95"
            />
          </div>
          <h1 className="text-[2.1rem] font-extrabold leading-[1.2] tracking-tight mb-4 text-white">
            Hire Engineers on<br />
            <span className="font-[family-name:var(--font-instrument-serif)] italic font-normal opacity-95">Autopilot.</span>
          </h1>
          <p className="text-gray-400 text-[0.92rem] leading-relaxed">
            Automate resume screening, run deep smart integrity checkups, and dispatch dynamic robot chat interviews.
          </p>
        </div>

        {/* Left Column Footer */}
        <div className="z-[2] text-[0.72rem] text-gray-500">
          © 2026 Recruit AI Inc. All rights reserved. Secure access portal.
        </div>
      </div>

      {/* Right Column: Form Panel */}
      <div className="flex-1 flex items-center justify-center p-12 bg-gray-50 relative z-50">
        <div className="w-full max-w-[380px]">
          {children}
        </div>
      </div>
    </div>
  )
}
