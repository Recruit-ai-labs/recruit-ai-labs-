'use client'

import { SignUp } from '@clerk/nextjs'

const clerkAppearance = {
  baseTheme: undefined,
  elements: {
    rootBox: 'w-full',
    card: 'bg-transparent shadow-none border-0 p-0 rounded-none',
    header: 'hidden',
    headerTitle: 'hidden',
    headerSubtitle: 'hidden',
    socialButtonsBlockButton: 'rounded-md border-gray-200 bg-white hover:border-black',
    dividerRow: 'hidden',
    dividerLine: 'bg-gray-200',
    dividerText: 'text-gray-400',
    formFieldLabel: 'text-gray-600 font-semibold text-[0.78rem]',
    formFieldInput: 'rounded-md border-gray-200 bg-gray-50 focus:border-black focus:bg-white',
    formButtonPrimary: 'bg-black border-black hover:bg-gray-800 rounded-md',
    footerActionLink: 'text-black font-semibold',
    footer: 'hidden',
    alternativeMethods: 'hidden',
    phoneField: 'hidden',
    phoneFieldInput: 'hidden',
    phoneFieldLabel: 'hidden',
    phoneFieldShowPasswordButton: 'hidden',
  },
}

export default function SignUpPage() {
  return (
    <>
      {/* Form Header */}
      <div className="mb-[22px]">
        <h2 className="text-[1.65rem] font-extrabold text-[#09090B] tracking-tight mb-1.5">Create Console Account</h2>
        <p className="text-[0.85rem] text-gray-500">Set up a private developer seat with zero subscription bills</p>
      </div>

     

      {/* Divider */}
      <div className="flex items-center text-center text-gray-400 text-[0.7rem] font-semibold uppercase tracking-wide mb-4">
        <span className="flex-1 border-b border-gray-200 mr-3"></span>
        or continue with email
        <span className="flex-1 border-b border-gray-200 ml-3"></span>
      </div>

      {/* Clerk SignUp Component */}
      <SignUp appearance={clerkAppearance} />
    </>
  )
}
