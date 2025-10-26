export type Token = {
  id: string;
  symbol: string;
  chain: string;
  address: string;
};

export type Edge = {
  to: Token;
  weight: number;
  rate: number;
  meta: {
    source: string;
    partnerUsed: boolean;
    detail?: any;
  };
};

export type Graph = Record<string, Edge[]>;

export type RouteHop = {
  from: Token;
  to: Token;
  rate: number;
  source: string;
  detail?: any;
};

export type RoutingResult = {
  path: Token[];
  hops: RouteHop[];
  totalRate: number;
  totalCost: number;
};

export const TOKENS: Token[] = [
  { id: 'eth-usdc', symbol: 'USDC', chain: 'ethereum', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  { id: 'eth-weth', symbol: 'WETH', chain: 'ethereum', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
  { id: 'eth-dai', symbol: 'DAI', chain: 'ethereum', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' },
  { id: 'poly-usdc', symbol: 'USDC', chain: 'polygon', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' },
  { id: 'poly-wmatic', symbol: 'WMATIC', chain: 'polygon', address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' },
  { id: 'poly-dai', symbol: 'DAI', chain: 'polygon', address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063' },
  { id: 'arb-usdc', symbol: 'USDC', chain: 'arbitrum', address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8' },
  { id: 'arb-weth', symbol: 'WETH', chain: 'arbitrum', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' },
];

export const PARTNER_CONFIG = {
  blockscout: {
    enabled: true,
    baseUrls: {
      ethereum: 'https://eth.blockscout.com/api',
      polygon: 'https://polygon.blockscout.com/api',
      arbitrum: 'https://arbitrum.blockscout.com/api',
    }
  },
  pyth: {
    enabled: true,
    baseUrl: 'https://hermes.pyth.network/api',
    priceIds: {
      'WETH': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
      'USDC': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
      'DAI': '0xb0948a5e5313200c632b51bb5ca32f6de0d36e9950a942d19751e833f70dabfd',
      'WMATIC': '0x5de33a9112c2b700b8d30b8a3402c103578ccfa2765696471cc672bd5cf6ac52',
    }
  },
  avail: {
    enabled: true,
    bridgeFee: 0.001,
  }
};

const BLOCKSCOUT_RATES: Record<string, number> = {
  'eth-usdc-eth-weth': 0.0005,
  'eth-weth-eth-usdc': 2000,
  'eth-usdc-eth-dai': 0.9998,
  'eth-dai-eth-usdc': 1.0002,
  'eth-weth-eth-dai': 1999.60,
  'eth-dai-eth-weth': 0.0005002,
  'poly-usdc-poly-wmatic': 1.25,
  'poly-wmatic-poly-usdc': 0.80,
  'poly-usdc-poly-dai': 0.9999,
  'poly-dai-poly-usdc': 1.0001,
  'poly-wmatic-poly-dai': 0.7999,
  'poly-dai-poly-wmatic': 1.2501,
  'arb-usdc-arb-weth': 0.0005,
  'arb-weth-arb-usdc': 2000,
};

const PYTH_PRICES: Record<string, number> = {
  'WETH': 2000,
  'USDC': 1,
  'DAI': 1,
  'WMATIC': 0.8,
};

const CHAIN_SPREADS: Record<string, number> = {
  ethereum: 1.0,
  polygon: 0.9995,
  arbitrum: 0.9997,
};

export async function fetchBlockscoutRate(
  chain: string,
  tokenA: Token,
  tokenB: Token
): Promise<{ rate: number; partnerUsed: boolean; detail?: any }> {
  if (!PARTNER_CONFIG.blockscout.enabled) {
    return { rate: 0, partnerUsed: false };
  }

  try {
    const key = `${tokenA.id}-${tokenB.id}`;
    const rate = BLOCKSCOUT_RATES[key] || 0;

    return {
      rate,
      partnerUsed: false,
      detail: {
        source: 'hardcoded-fallback',
        pair: `${tokenA.symbol}/${tokenB.symbol}`
      }
    };
  } catch (error) {
    console.warn(`Blockscout fetch failed for ${tokenA.symbol}->${tokenB.symbol}:`, error);
    return { rate: 0, partnerUsed: false };
  }
}

export async function fetchPythPrice(
  token: Token
): Promise<{ price: number; partnerUsed: boolean; detail?: any }> {
  if (!PARTNER_CONFIG.pyth.enabled) {
    return { price: 0, partnerUsed: false };
  }

  try {
    const price = PYTH_PRICES[token.symbol] || 0;
    return {
      price,
      partnerUsed: false,
      detail: { source: 'hardcoded-pyth-fallback', symbol: token.symbol }
    };
  } catch (error) {
    console.warn(`Pyth fetch failed for ${token.symbol}:`, error);
    return { price: 0, partnerUsed: false };
  }
}

export async function fetchAvailBridgeRate(
  tokenA: Token,
  tokenB: Token
): Promise<{ rate: number; partnerUsed: boolean; detail?: any }> {
  if (!PARTNER_CONFIG.avail.enabled) {
    return { rate: 0, partnerUsed: false };
  }

  try {
    const bridgeFee = PARTNER_CONFIG.avail.bridgeFee;
    const spreadA = CHAIN_SPREADS[tokenA.chain] || 1.0;
    const spreadB = CHAIN_SPREADS[tokenB.chain] || 1.0;
    
    let rate = (spreadA / spreadB) * (1 - bridgeFee);

    if (tokenA.symbol !== tokenB.symbol) {
      rate = 0.0;
    }

    return {
      rate,
      partnerUsed: false,
      detail: { source: 'avail-simulated', bridgeFee, spreadA, spreadB }
    };
  } catch (error) {
    console.warn(`Avail bridge simulation failed for ${tokenA.symbol}->${tokenB.symbol}:`, error);
    return { rate: 0, partnerUsed: false };
  }
}