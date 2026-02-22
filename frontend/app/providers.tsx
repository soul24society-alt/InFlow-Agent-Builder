'use client'

import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import { useEffect, useState } from 'react'
import { ONECHAIN_RPC, ACTIVE_NETWORK } from '@/lib/onechain'

// Import dapp-kit default styles (wallet picker UI)
import '@mysten/dapp-kit/dist/index.css'

const queryClient = new QueryClient()

/**
 * Network map for SuiClientProvider.
 * Each entry needs `url` + `network` (a known Sui network identifier).
 * OneChain is a Sui fork so we use 'testnet'/'mainnet' as the network hint.
 */
const networks = {
  testnet: { url: ONECHAIN_RPC.testnet, network: 'testnet' as const },
  mainnet: { url: ONECHAIN_RPC.mainnet, network: 'mainnet' as const },
  devnet:  { url: ONECHAIN_RPC.devnet,  network: 'devnet'  as const },
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent SSR/hydration mismatch from wallet state
  if (!mounted) return null

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork={ACTIVE_NETWORK}>
        <WalletProvider autoConnect>
          {children}
          <Toaster />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  )
}
