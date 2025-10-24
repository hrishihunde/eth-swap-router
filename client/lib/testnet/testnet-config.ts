// Testnet configuration for all supported networks
export interface TestnetConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  testnet: boolean;
  faucetUrl?: string;
  blockscoutUrl?: string;
}

export const TESTNET_CONFIGS: Record<string, TestnetConfig> = {
  // Ethereum testnets
  sepolia: {
    name: 'Sepolia Testnet',
    chainId: 11155111,
    rpcUrl: 'https://sepolia.infura.io/v3/your-project-id',
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    testnet: true,
    faucetUrl: 'https://sepoliafaucet.com',
    blockscoutUrl: 'https://sepolia.blockscout.com',
  },

  // Polygon testnets
  mumbai: {
    name: 'Polygon Mumbai',
    chainId: 80001,
    rpcUrl: 'https://polygon-mumbai.infura.io/v3/your-project-id',
    blockExplorer: 'https://mumbai.polygonscan.com',
    nativeCurrency: {
      name: 'Polygon',
      symbol: 'MATIC',
      decimals: 18,
    },
    testnet: true,
    faucetUrl: 'https://faucet.polygon.technology',
    blockscoutUrl: 'https://mumbai.blockscout.com',
  },

  // Arbitrum testnets
  arbitrumSepolia: {
    name: 'Arbitrum Sepolia',
    chainId: 421614,
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    blockExplorer: 'https://sepolia.arbiscan.io',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    testnet: true,
    faucetUrl: 'https://faucet.arbitrum.io',
    blockscoutUrl: 'https://sepolia-rollup.arbitrum.blockscout.com',
  },

  // Avalanche testnets
  avalancheFuji: {
    name: 'Avalanche Fuji',
    chainId: 43113,
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    blockExplorer: 'https://testnet.snowtrace.io',
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18,
    },
    testnet: true,
    faucetUrl: 'https://faucet.avax.network',
    blockscoutUrl: 'https://avalanche-fuji.blockscout.com',
  },

  // Avail testnet
  avail: {
    name: 'Avail Testnet',
    chainId: 202402021700,
    rpcUrl: 'https://rpc.avail.tools',
    blockExplorer: 'https://explorer.avail.tools',
    nativeCurrency: {
      name: 'Avail',
      symbol: 'AVL',
      decimals: 18,
    },
    testnet: true,
    faucetUrl: 'https://faucet.avail.tools',
  },
};

// Testnet token configurations
export interface TestnetToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoUrl?: string;
}

export const TESTNET_TOKENS: TestnetToken[] = [
  // Sepolia tokens
  {
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    chainId: 11155111,
  },
  {
    address: '0xA0b86a33E6441c8C06DDD5e8B0c8C4c8C4c8C4c8', // USDC
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    chainId: 11155111,
  },

  // Mumbai tokens
  {
    address: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889', // WMATIC
    symbol: 'WMATIC',
    name: 'Wrapped Matic',
    decimals: 18,
    chainId: 80001,
  },
  {
    address: '0x3813e82e6f709802b4c044C7440720E3Ce09c0C5', // USDC
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    chainId: 80001,
  },

  // Arbitrum Sepolia tokens
  {
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    chainId: 421614,
  },

  // Avalanche Fuji tokens
  {
    address: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c', // WAVAX
    symbol: 'WAVAX',
    name: 'Wrapped AVAX',
    decimals: 18,
    chainId: 43113,
  },
  {
    address: '0x5425890298aed601595a70AB815c96711a31Bc65', // USDC
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    chainId: 43113,
  },

  // Avail tokens
  {
    address: '0x0000000000000000000000000000000000000000', // Native AVL
    symbol: 'AVL',
    name: 'Avail Token',
    decimals: 18,
    chainId: 202402021700,
  },
];

// Get testnet configuration by chain ID
export function getTestnetConfig(chainId: number): TestnetConfig | undefined {
  return Object.values(TESTNET_CONFIGS).find(config => config.chainId === chainId);
}

// Get testnet tokens by chain ID
export function getTestnetTokens(chainId: number): TestnetToken[] {
  return TESTNET_TOKENS.filter(token => token.chainId === chainId);
}

// Get all supported testnet chain IDs
export function getSupportedTestnetChainIds(): number[] {
  return Object.values(TESTNET_CONFIGS).map(config => config.chainId);
}

// Check if a chain ID is a supported testnet
export function isSupportedTestnet(chainId: number): boolean {
  return getSupportedTestnetChainIds().includes(chainId);
}

// Get testnet configuration by name
export function getTestnetConfigByName(name: string): TestnetConfig | undefined {
  return Object.values(TESTNET_CONFIGS).find(config => 
    config.name.toLowerCase().includes(name.toLowerCase())
  );
}

// Environment variables for API keys
export const API_KEYS = {
  INFURA_PROJECT_ID: process.env.NEXT_PUBLIC_INFURA_PROJECT_ID || '',
  ALCHEMY_API_KEY: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || '',
  WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
  PYTH_API_KEY: process.env.NEXT_PUBLIC_PYTH_API_KEY || '',
  BLOCKSCOUT_API_KEY: process.env.NEXT_PUBLIC_BLOCKSCOUT_API_KEY || '',
} as const;
