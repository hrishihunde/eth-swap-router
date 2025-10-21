import { createConfig, http } from 'wagmi'
import { mainnet, sepolia, polygon, polygonMumbai, arbitrum, arbitrumSepolia, avalanche, avalancheFuji } from 'wagmi/chains'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'

export const config = createConfig({
  chains: [mainnet, sepolia, polygon, polygonMumbai, arbitrum, arbitrumSepolia, avalanche, avalancheFuji],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID as string, // is this safe to write this way?
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [polygonMumbai.id]: http(),
    [arbitrum.id]: http(),
    [arbitrumSepolia.id]: http(),
    [avalanche.id]: http(),
    [avalancheFuji.id]: http()
  },
})