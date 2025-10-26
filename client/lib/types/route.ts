export type Chain = 'ethereum' | 'polygon' | 'arbitrum' | 'optimism' | 'avalanche' | 'avail' | string;

/**
 * Network configuration for multi-chain routing
 */
export interface NetworkConfig {
  chainId: number;
  name: string;
  nativeToken: string;
  avgBlockTime: number;        // in seconds
  avgGasPrice: number;          // in gwei
  rpcUrl?: string;
  explorerUrl?: string;
  bridgeSupport: Chain[];       // Chains this network can bridge to
}

/**
 * Token information with network details
 */
export interface TokenInfo {
  symbol: string;
  network: Chain;
  address: string;
  decimals: number;
  isNative: boolean;
  priceUSD?: number;
  logoURI?: string;
}

/**
 * Liquidity pool data for realistic AMM calculations
 */
export interface LiquidityPool {
  reserveBase: number;          // Reserve of base token
  reserveQuote: number;         // Reserve of quote token
  liquidityUSD: number;         // Total pool TVL
  feePercent: number;           // Pool fee (0.003 = 0.3%)
  poolType: 'constant_product' | 'stable_swap' | 'concentrated_liquidity';
  volume24h?: number;           // 24h trading volume
  apy?: number;                 // Annual percentage yield for LPs
}

export interface Token {
  token: string;
  chain: Chain;
  symbol?: string;
  name?: string;
  decimals?: number;
  address?: string;
  priceUSD?: number;
}

export interface Node {
  token: string; 
  chain: Chain;
}

/**
 * Enhanced route hop with detailed trade information
 */
export interface RouteHop {
  from: Node;
  to: Node;
  type: 'swap' | 'bridge';
  
  // Trade details
  inputAmount: number;
  expectedOut: number;
  priceImpact: number;          // Percentage (0.01 = 1%)
  effectiveRate: number;        // Actual rate after slippage
  
  // Costs
  feesUSD: number;
  gasUSD: number;
  bridgeFee?: number;
  
  // Pool/Protocol info
  dex?: string;                 // UniswapV3, Curve, etc.
  bridge?: string;              // Across, Stargate, etc.
  poolAddress?: string;
  liquidity?: LiquidityPool;
  
  // Metadata
  liquidityDepth: number;
  confidence: number;           // 0..1
  estimatedTimeMs: number;      // Execution time
  meta?: Record<string, any>;
}

export interface Route {
  id: string;
  input: { token: string; chain: Chain; amount: number };
  outputToken: { token: string; chain: Chain };
  hops: RouteHop[];
  totalExpectedOut: number;
  totalGasUSD: number;
  worstCaseOut: number;
  totalPriceImpact: number;     // Cumulative slippage
  totalExecutionTimeMs: number; // Estimated total time
  computedAt: string;
}

// Algorithm-specific route types
export interface DijkstraMetrics {
  executionTimeMs: number;
  gasEstimate: number;
  visitedNodes: number;
  pathLength: number;
}

export interface PSBDijkstraMetrics extends DijkstraMetrics {
  barrierCount: number;
}

export interface AlgorithmResult {
  route: Route;
  metrics: DijkstraMetrics | PSBDijkstraMetrics;
}

export interface RouteComparison {
  timestamp: string;
  sourceToken: string;
  targetToken: string;
  amount: string;
  classic: AlgorithmResult;
  psb: AlgorithmResult;
}
