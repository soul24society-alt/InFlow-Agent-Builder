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
  const [showPrivateKeySetup, setShowPrivateKeySetup] = useState(false)
  const [hasCheckedPrivateKey, setHasCheckedPrivateKey] = useState(false)
  const syncingRef = useRef(false)

  useEffect(() => {
    if (address) {
      syncUser()
    } else {
      setDbUser(null)
      setLoading(false)
      setHasCheckedPrivateKey(false)
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
        console.error('Error syncing user:', json)
        return
      }

      const syncedUser: User = json.user
      setDbUser(syncedUser)

      if (!syncedUser.private_key && !hasCheckedPrivateKey) {
        setShowPrivateKeySetup(true)
        setHasCheckedPrivateKey(true)
      }
    } catch (error) {
      console.error('Error syncing user:', error)
    } finally {
      setLoading(false)
      syncingRef.current = false
    }
  }

  const logout = () => {
    disconnectWallet()
    setDbUser(null)
    setHasCheckedPrivateKey(false)
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
    showPrivateKeySetup,
    setShowPrivateKeySetup,
  }
}
