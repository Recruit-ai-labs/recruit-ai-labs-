'use client'

import React, { useEffect, useState } from 'react'

interface ClerkErrorBoundaryProps {
  children: React.ReactNode
}

export function ClerkErrorBoundary({ children }: ClerkErrorBoundaryProps) {
  const [clerkError, setClerkError] = useState(false)

  useEffect(() => {
    const handleClerkError = (event: ErrorEvent) => {
      if (event.message.includes('Clerk') || event.message.includes('failed_to_load_clerk_js')) {
        setClerkError(true)
        console.warn('Clerk failed to load, using fallback auth mode')
      }
    }

    window.addEventListener('error', handleClerkError)
    return () => window.removeEventListener('error', handleClerkError)
  }, [])

  if (clerkError) {
    return (
      <div className="min-h-screen bg-yellow-50 p-4 flex items-center justify-center">
        <div className="bg-white border border-yellow-300 rounded-lg p-6 max-w-md">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">Auth Service Temporarily Unavailable</h2>
          <p className="text-sm text-yellow-700 mb-4">
            The authentication service is not responding. Some features may be limited. Public interview links will still work.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
