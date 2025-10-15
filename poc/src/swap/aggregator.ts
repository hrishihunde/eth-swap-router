export type Token = {
  id: string;
  symbol: string;
  chain: string;
  address: string;
};

export type Edge = {
  to: Token;
  weight: number; // Represents swap cost (lower is better for pathfinding)
  rate: number;   // Actual exchange rate (how much output per input)
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
// TODO
// temp implementation, will revise below section
export const TOKENS: Token[] = [
  // Ethereum tokens
  { id: 'eth-usdc', symbol: 'USDC', chain: 'ethereum', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  { id: 'eth-weth', symbol: 'WETH', chain: 'ethereum', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
  { id: 'eth-dai', symbol: 'DAI', chain: 'ethereum', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' },
  
  // Polygon tokens
  { id: 'poly-usdc', symbol: 'USDC', chain: 'polygon', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' },
  { id: 'poly-wmatic', symbol: 'WMATIC', chain: 'polygon', address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' },
  { id: 'poly-dai', symbol: 'DAI', chain: 'polygon', address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063' },
  
  // Arbitrum tokens
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
        // Avail is simulated for bridge operations
        bridgeFee: 0.001, // 0.1% bridge fee
    }
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
    // STUB: In production, this would call Blockscout API
    // Example implementation:
    // const baseUrl = PARTNER_CONFIG.blockscout.baseUrls[chain];
    // const url = `${baseUrl}/v2/tokens/${tokenA.address}/transfers`;
    // const response = await fetch(url);
    // const data = await response.json();
    // ... parse pool data and calculate rate
    
    // Fallback to hardcoded demo values
    const hardcodedRates: Record<string, number> = {
      // Ethereum pairs
      'eth-usdc-eth-weth': 0.0005,   // ~2000 USDC per WETH
      'eth-weth-eth-usdc': 2000,
      'eth-usdc-eth-dai': 0.9998,
      'eth-dai-eth-usdc': 1.0002,
      'eth-weth-eth-dai': 1999.60,
      'eth-dai-eth-weth': 0.0005002,
      
      // Polygon pairs
      'poly-usdc-poly-wmatic': 1.25,
      'poly-wmatic-poly-usdc': 0.80,
      'poly-usdc-poly-dai': 0.9999,
      'poly-dai-poly-usdc': 1.0001,
      'poly-wmatic-poly-dai': 0.7999,
      'poly-dai-poly-wmatic': 1.2501,
      
      // Arbitrum pairs
      'arb-usdc-arb-weth': 0.0005,
      'arb-weth-arb-usdc': 2000,
    };
    
    const key = `${tokenA.id}-${tokenB.id}`;
    const rate = hardcodedRates[key] || 0;
    
    return {
      rate,
      partnerUsed: false, // Mark as false since we're using fallback
      detail: { 
        source: 'hardcoded-fallback', 
        reason: 'Blockscout API integration pending',
        pair: `${tokenA.symbol}/${tokenB.symbol}`
      }
    };
  } catch (error) {
    console.warn(`Blockscout fetch failed for ${tokenA.symbol}->${tokenB.symbol}:`, error);
    return { rate: 0, partnerUsed: false };
  }
}

/**
 * Pyth Integration
 * Fetches oracle price feeds for tokens
 * 
 * STATUS: Currently using fallback prices
 * TODO: Implement real-time Pyth API calls
 * 
 * To integrate real Pyth API:
 * 1. Identify relevant price feeds for each token
 * 2. Query Pyth API for real-time prices
 * 3. Update price fetching logic to use Pyth data
 * 4. Set partnerUsed to true when using real data
 */
export async function fetchPythPrice(
  token: Token
): Promise<{ price: number; partnerUsed: boolean; detail?: any }> {
  if (!PARTNER_CONFIG.pyth.enabled) {
    return { price: 0, partnerUsed: false };
  }

  try {
    // STUB: In production, call Pyth REST API using PARTNER_CONFIG.pyth.baseUrl
    // Example: const url = `${PARTNER_CONFIG.pyth.baseUrl}/prices/${PARTNER_CONFIG.pyth.priceIds[token.symbol]}`;
    // const resp = await fetch(url); const data = await resp.json(); return { price: data.price, partnerUsed: true };

    // Fallback hardcoded prices (USD denominated, relative scale)
    const hardcodedPrices: Record<string, number> = {
      'WETH': 2000,
      'USDC': 1,
      'DAI': 1,
      'WMATIC': 0.8,
    };

    const price = hardcodedPrices[token.symbol] || 0;
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

/**
 * Avail Bridge Simulation
 * Simulates cross-chain bridging rates and fees between chains
 */
export async function fetchAvailBridgeRate(
  tokenA: Token,
  tokenB: Token
): Promise<{ rate: number; partnerUsed: boolean; detail?: any }> {
  if (!PARTNER_CONFIG.avail.enabled) {
    return { rate: 0, partnerUsed: false };
  }

  try {
    // STUB: In production, compute bridge rates using liquidity and bridge operators
    // For now, simulate a small fee and 1:1 nominal transfer adjusted by chain-specific spread
    const baseRate = 1.0; // nominal 1:1 token amount across chains
    const bridgeFee = PARTNER_CONFIG.avail.bridgeFee || 0.001;

    // Simulate minor slippage/spread depending on chains (arbitrary demo factors)
    const chainSpread: Record<string, number> = {
      ethereum: 1.0,
      polygon: 0.9995,
      arbitrum: 0.9997,
    };

    const spreadA = chainSpread[tokenA.chain] || 1.0;
    const spreadB = chainSpread[tokenB.chain] || 1.0;

    let rate = baseRate * (spreadA / spreadB) * (1 - bridgeFee);

    // If tokens are same symbol but different chains, treat near-1 rate
    if (tokenA.symbol === tokenB.symbol) {
      // small adjustments already applied
    } else {
      // For different symbols, we can't determine a direct bridge rate here; return 0 to let callers use Pyth
      // However, provide a small non-zero value if caller wants to allow cross-chain+swap combos
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


// revise this file, improve the implemenation b4 wworking on client