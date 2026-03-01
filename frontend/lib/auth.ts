'use client'

import { useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit'
import { useEffect, useMemo, useRef, useState } from 'react'
import { type User } from './supabase'

export function useAuth() {
  const account = useCurrentAccount()
  const { mutate: disconnectWallet } = useDisconnectWallet()
  const address = account?.address ?? null

  const ready = true
  const authenticated = !!address
  // Stable user object — only recreated when address actually changes
  const user = useMemo(
    () => (address ? { id: address, address } : null),
    [address]
  )
  const isWalletLogin = authenticated
  const privyWalletAddress = address

  const [dbUser, setDbUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const syncingRef = useRef(false)

  useEffect(() => {
    if (address) {
      syncUser()
    } else {
      setDbUser(null)
      setLoading(false)
    }
    // address is the only stable primitive dep we need
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  const syncUser = async () => {
    if (!address || syncingRef.current) return
    syncingRef.current = true
    setLoading(true)

    try {
      const res = await fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      })

      const json = await res.json()

      if (!res.ok) {
        return
      }

      const syncedUser: User = json.user
      setDbUser(syncedUser)
    } catch (error) {
      // silently handle sync errors
    } finally {
      setLoading(false)
      syncingRef.current = false
    }
  }

  const logout = () => {
    disconnectWallet()
    setDbUser(null)
  }

  return {
    ready,
    authenticated,
    user,
    dbUser,
    loading,
    logout,
    syncUser,
    isWalletLogin,
    privyWalletAddress,
  }
}
