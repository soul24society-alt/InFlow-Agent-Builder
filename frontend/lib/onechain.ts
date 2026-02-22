/**
 * OneChain network configuration for the frontend.
 * Used by @mysten/dapp-kit providers.
 */
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc'

// Network identifiers
export type OneChainNetwork = 'testnet' | 'mainnet' | 'devnet'

export const ONECHAIN_RPC: Record<OneChainNetwork, string> = {
  testnet: process.env.NEXT_PUBLIC_ONECHAIN_TESTNET_RPC || 'https://rpc-testnet.onelabs.cc:443',
  mainnet: process.env.NEXT_PUBLIC_ONECHAIN_MAINNET_RPC || 'https://rpc-mainnet.onelabs.cc:443',
  devnet:  process.env.NEXT_PUBLIC_ONECHAIN_DEVNET_RPC  || 'https://rpc-devnet.onelabs.cc:443',
}

export const ONECHAIN_EXPLORER: Record<OneChainNetwork, string> = {
  testnet: 'https://explorer-testnet.onelabs.cc',
  mainnet: 'https://explorer-mainnet.onelabs.cc',
  devnet:  'https://explorer-devnet.onelabs.cc',
}

export const ONECHAIN_FAUCET: Record<OneChainNetwork, string> = {
  testnet: 'https://faucet-testnet.onelabs.cc',
  mainnet: '',
  devnet:  'https://faucet-devnet.onelabs.cc',
}

export const ACTIVE_NETWORK: OneChainNetwork =
  (process.env.NEXT_PUBLIC_ONECHAIN_ACTIVE_NETWORK as OneChainNetwork) || 'testnet'

// Shared SuiJsonRpcClient instance pointing at OneChain
export const onechainClient = new SuiJsonRpcClient({ url: ONECHAIN_RPC[ACTIVE_NETWORK], network: ACTIVE_NETWORK })

// Package IDs (set after deploying Move contracts)
export const TOKEN_FACTORY_PACKAGE_ID = process.env.NEXT_PUBLIC_TOKEN_FACTORY_PACKAGE_ID || ''
export const NFT_FACTORY_PACKAGE_ID   = process.env.NEXT_PUBLIC_NFT_FACTORY_PACKAGE_ID   || ''
export const PAYMENT_PACKAGE_ID       = process.env.NEXT_PUBLIC_PAYMENT_PACKAGE_ID       || ''

// Native token symbol
export const NATIVE_TOKEN = 'OCT'
export const MIST_PER_OCT = 1_000_000_000n

/** Convert OCT string (e.g. "1.5") to MIST bigint */
export function octToMist(oct: string): bigint {
  const [whole, fraction = ''] = oct.split('.')
  const paddedFraction = fraction.padEnd(9, '0').slice(0, 9)
  return BigInt(whole) * MIST_PER_OCT + BigInt(paddedFraction)
}

/** Convert MIST bigint to OCT string (e.g. "1.500000000") */
export function mistToOct(mist: bigint): string {
  const whole = mist / MIST_PER_OCT
  const frac  = (mist % MIST_PER_OCT).toString().padStart(9, '0')
  return `${whole}.${frac}`
}

/** Build explorer URLs */
export function getTxExplorerUrl(digest: string): string {
  return `${ONECHAIN_EXPLORER[ACTIVE_NETWORK]}/txblock/${digest}`
}
export function getAddressExplorerUrl(address: string): string {
  return `${ONECHAIN_EXPLORER[ACTIVE_NETWORK]}/address/${address}`
}
export function getObjectExplorerUrl(objectId: string): string {
  return `${ONECHAIN_EXPLORER[ACTIVE_NETWORK]}/object/${objectId}`
}
