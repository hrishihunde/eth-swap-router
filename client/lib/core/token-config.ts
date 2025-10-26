export interface TokenInfo {
  symbol: string;
  name: string;
  networks: NetworkDeployment[];
  logoUrl?: string;
  coingeckoId?: string;
  pythFeedId?: string;
}

export interface NetworkDeployment {
  network: 'ethereum' | 'polygon' | 'arbitrum' | 'optimism' | 'avalanche';
  address: string;
  decimals: number;
  isNative?: boolean;
}

/**
 * Real tokens available for swapping
 * Each token is deployed on specific networks only
 */
export const REAL_TOKENS: TokenInfo[] = [
  // Native & Wrapped Natives
  {
    symbol: 'ETH',
    name: 'Ethereum',
    pythFeedId: 'ETH/USD',
    coingeckoId: 'ethereum',
    networks: [
      { network: 'ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18, isNative: true },
      { network: 'arbitrum', address: '0x0000000000000000000000000000000000000000', decimals: 18, isNative: true },
      { network: 'optimism', address: '0x0000000000000000000000000000000000000000', decimals: 18, isNative: true },
    ]
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    pythFeedId: 'ETH/USD',
    coingeckoId: 'weth',
    networks: [
      { network: 'ethereum', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
      { network: 'arbitrum', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      { network: 'optimism', address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      { network: 'polygon', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18 },
    ]
  },
  {
    symbol: 'MATIC',
    name: 'Polygon',
    pythFeedId: 'MATIC/USD',
    coingeckoId: 'matic-network',
    networks: [
      { network: 'polygon', address: '0x0000000000000000000000000000000000000000', decimals: 18, isNative: true },
      { network: 'ethereum', address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', decimals: 18 },
    ]
  },
  {
    symbol: 'AVAX',
    name: 'Avalanche',
    pythFeedId: 'AVAX/USD',
    coingeckoId: 'avalanche-2',
    networks: [
      { network: 'avalanche', address: '0x0000000000000000000000000000000000000000', decimals: 18, isNative: true },
    ]
  },

  // Stablecoins
  {
    symbol: 'USDC',
    name: 'USD Coin',
    pythFeedId: 'USDC/USD',
    coingeckoId: 'usd-coin',
    networks: [
      { network: 'ethereum', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
      { network: 'arbitrum', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      { network: 'optimism', address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      { network: 'polygon', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6 },
      { network: 'avalanche', address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', decimals: 6 },
    ]
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    pythFeedId: 'USDT/USD',
    coingeckoId: 'tether',
    networks: [
      { network: 'ethereum', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
      { network: 'arbitrum', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 },
      { network: 'optimism', address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', decimals: 6 },
      { network: 'polygon', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
      { network: 'avalanche', address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', decimals: 6 },
    ]
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    coingeckoId: 'dai',
    networks: [
      { network: 'ethereum', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
      { network: 'arbitrum', address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18 },
      { network: 'optimism', address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18 },
      { network: 'polygon', address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', decimals: 18 },
    ]
  },

  // Major Tokens
  {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    pythFeedId: 'BTC/USD',
    coingeckoId: 'wrapped-bitcoin',
    networks: [
      { network: 'ethereum', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
      { network: 'arbitrum', address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8 },
      { network: 'optimism', address: '0x68f180fcCe6836688e9084f035309E29Bf0A2095', decimals: 8 },
      { network: 'polygon', address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', decimals: 8 },
    ]
  },
  {
    symbol: 'UNI',
    name: 'Uniswap',
    pythFeedId: 'UNI/USD',
    coingeckoId: 'uniswap',
    networks: [
      { network: 'ethereum', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18 },
      { network: 'arbitrum', address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0', decimals: 18 },
      { network: 'optimism', address: '0x6fd9d7AD17242c41f7131d257212c54A0e816691', decimals: 18 },
      { network: 'polygon', address: '0xb33EaAd8d922B1083446DC23f610c2567fB5180f', decimals: 18 },
    ]
  },
  {
    symbol: 'LINK',
    name: 'Chainlink',
    pythFeedId: 'LINK/USD',
    coingeckoId: 'chainlink',
    networks: [
      { network: 'ethereum', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18 },
      { network: 'arbitrum', address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4', decimals: 18 },
      { network: 'optimism', address: '0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6', decimals: 18 },
      { network: 'polygon', address: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39', decimals: 18 },
      { network: 'avalanche', address: '0x5947BB275c521040051D82396192181b413227A3', decimals: 18 },
    ]
  },
  {
    symbol: 'AAVE',
    name: 'Aave',
    pythFeedId: 'AAVE/USD',
    coingeckoId: 'aave',
    networks: [
      { network: 'ethereum', address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', decimals: 18 },
      { network: 'arbitrum', address: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196', decimals: 18 },
      { network: 'optimism', address: '0x76FB31fb4af56892A25e32cFC43De717950c9278', decimals: 18 },
      { network: 'polygon', address: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B', decimals: 18 },
    ]
  },
  {
    symbol: 'ARB',
    name: 'Arbitrum',
    pythFeedId: 'ARB/USD',
    coingeckoId: 'arbitrum',
    networks: [
      { network: 'arbitrum', address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18 },
    ]
  },
  {
    symbol: 'OP',
    name: 'Optimism',
    pythFeedId: 'OP/USD',
    coingeckoId: 'optimism',
    networks: [
      { network: 'optimism', address: '0x4200000000000000000000000000000000000042', decimals: 18 },
    ]
  },
];

/**
 * Get all available tokens as a flat list for UI
 */
export function getAllTokens(): Array<{
  key: string;
  symbol: string;
  name: string;
  network: string;
  address: string;
  decimals: number;
  isNative: boolean;
  pythFeedId?: string;
  coingeckoId?: string;
}> {
  const tokens: any[] = [];
  
  for (const tokenInfo of REAL_TOKENS) {
    for (const deployment of tokenInfo.networks) {
      tokens.push({
        key: `${tokenInfo.symbol}.${deployment.network}`,
        symbol: tokenInfo.symbol,
        name: tokenInfo.name,
        network: deployment.network,
        address: deployment.address,
        decimals: deployment.decimals,
        isNative: deployment.isNative || false,
        pythFeedId: tokenInfo.pythFeedId,
        coingeckoId: tokenInfo.coingeckoId,
      });
    }
  }
  
  return tokens;
}

/**
 * Get tokens for a specific network
 */
export function getTokensByNetwork(network: string) {
  return getAllTokens().filter(t => t.network === network);
}

/**
 * Get token info by key (e.g., "USDC.ethereum")
 */
export function getTokenByKey(key: string) {
  return getAllTokens().find(t => t.key === key);
}
