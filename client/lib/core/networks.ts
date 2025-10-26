// client/lib/core/networks.ts

import { NetworkConfig } from '../types/route';

/**
 * Network configurations for multi-chain routing
 */
export const NETWORKS: Record<string, NetworkConfig> = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum',
    nativeToken: 'ETH',
    avgBlockTime: 12,
    avgGasPrice: 30, // gwei
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    bridgeSupport: ['polygon', 'arbitrum', 'optimism', 'avalanche']
  },
  polygon: {
    chainId: 137,
    name: 'Polygon',
    nativeToken: 'MATIC',
    avgBlockTime: 2,
    avgGasPrice: 50, // gwei
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    bridgeSupport: ['ethereum', 'arbitrum', 'avalanche']
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum',
    nativeToken: 'ETH',
    avgBlockTime: 0.25,
    avgGasPrice: 0.1, // gwei (much cheaper)
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    bridgeSupport: ['ethereum', 'polygon', 'optimism', 'avalanche']
  },
  optimism: {
    chainId: 10,
    name: 'Optimism',
    nativeToken: 'ETH',
    avgBlockTime: 2,
    avgGasPrice: 0.001, // gwei (very cheap)
    rpcUrl: 'https://mainnet.optimism.io',
    explorerUrl: 'https://optimistic.etherscan.io',
    bridgeSupport: ['ethereum', 'arbitrum', 'avalanche']
  },
  avalanche: {
    chainId: 43114,
    name: 'Avalanche',
    nativeToken: 'AVAX',
    avgBlockTime: 2,
    avgGasPrice: 25, // gwei
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    explorerUrl: 'https://snowtrace.io',
    bridgeSupport: ['ethereum', 'polygon', 'arbitrum']
  }
};

/**
 * Get network by chain ID
 */
export function getNetworkByChainId(chainId: number): NetworkConfig | undefined {
  return Object.values(NETWORKS).find(n => n.chainId === chainId);
}

/**
 * Get network by name
 */
export function getNetwork(name: string): NetworkConfig | undefined {
  return NETWORKS[name.toLowerCase()];
}

/**
 * Check if two networks support bridging
 */
export function canBridge(fromNetwork: string, toNetwork: string): boolean {
  const network = getNetwork(fromNetwork);
  return network?.bridgeSupport.includes(toNetwork.toLowerCase()) ?? false;
}

/**
 * Estimate bridge time between networks (in milliseconds)
 */
export function estimateBridgeTime(fromNetwork: string, toNetwork: string): number {
  // Optimistic rollups have faster finality
  if (fromNetwork === 'optimism' || toNetwork === 'optimism') {
    return 60000; // 1 minute
  }
  
  if (fromNetwork === 'arbitrum' || toNetwork === 'arbitrum') {
    return 120000; // 2 minutes
  }
  
  // L2 to L2 via L1
  if (fromNetwork !== 'ethereum' && toNetwork !== 'ethereum') {
    return 600000; // 10 minutes (bridge to L1, then to target L2)
  }
  
  // Standard L1 <-> L2 bridge
  return 300000; // 5 minutes
}

/**
 * Get all supported networks as array
 */
export function getAllNetworks(): NetworkConfig[] {
  return Object.values(NETWORKS);
}

/**
 * Get network display name
 */
export function getNetworkDisplayName(network: string): string {
  return NETWORKS[network.toLowerCase()]?.name ?? network;
}
