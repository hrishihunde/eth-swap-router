import { createConfig, http } from 'wagmi'
import { mainnet, sepolia, polygon, polygonMumbai, arbitrum, arbitrumSepolia, avalanche, avalancheFuji } from 'wagmi/chains'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'

// Custom Avail testnet configuration
const availTestnet = {
  id: 202402021700,
  name: 'Avail Testnet',
  nativeCurrency: { name: 'Avail', symbol: 'AVL', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.avail.tools'] },
    public: { http: ['https://rpc.avail.tools'] },
  },
  blockExplorers: {
    default: { name: 'Avail Explorer', url: 'https://explorer.avail.tools' },
  },
  testnet: true,
} as const

export const config = createConfig({
  chains: [mainnet, sepolia, polygon, polygonMumbai, arbitrum, arbitrumSepolia, avalanche, avalancheFuji, availTestnet],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your-project-id',
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
    [avalancheFuji.id]: http(),
    [availTestnet.id]: http(),
  },
})