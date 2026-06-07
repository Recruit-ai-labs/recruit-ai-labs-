"use client"

import { UserButton } from '@clerk/nextjs'
import { useState, useEffect } from 'react'

export default function UserButtonClient() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-8 h-8 rounded-full bg-muted" />
  return <UserButton />
}
