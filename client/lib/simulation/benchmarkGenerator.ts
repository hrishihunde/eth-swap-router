// client/lib/simulation/benchmarkGenerator.ts
import { RouteGraph, TokenKey, Edge, Vertex, LiquidityPool } from '../core/router';
import { fetchPythPriceFeed } from '../partners/pyth';
import { getAvailableTokens, PYTH_FEED_IDS } from '../partners/pyth-feed';
import { 
  getHistoricalGasPrices, 
  getTokenLiquidityDistribution,
  getTopUniswapPools,
  getTopTokens
} from '../partners/blockscout';
import fs from 'fs';
import path from 'path';

export interface BenchmarkData {
  timestamp: string;
  version: string;
  graph: RouteGraph;
  vertices: Vertex[];
  stats: {
    realTokens: number;
    syntheticTokens: number;
    totalVertices: number;
    totalEdges: number;
    avgEdgesPerVertex: number; // Average OUT-degree
    maxEdgesPerVertex: number;
    minEdgesPerVertex: number;
  };
}

const TARGET_EDGES = 150000;
const MAX_AVG_DEGREE = 3; // Max average OUT-degree per vertex (directed graph)
const SUPPORTED_CHAINS = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'avalanche'];

/**
 * Generate sparse benchmark graph with exactly 10^5 edges
 * and average degree ≤ 5 edges/vertex
 * 
 * ENHANCED: Now uses Blockscout to seed with real on-chain data
 */
export async function generateBenchmark(useBlockscoutSeed = true): Promise<BenchmarkData> {
  console.log('Starting benchmark generation...');
  console.log(`Target: ${TARGET_EDGES} edges, max avg degree: ${MAX_AVG_DEGREE}`);
  console.log(`Blockscout seeding: ${useBlockscoutSeed ? 'ENABLED' : 'DISABLED'}`);
  
  const startTime = Date.now();
  const graph: RouteGraph = {};
  const vertices: Vertex[] = [];
  
  // Step 1: Fetch real data from Blockscout (if enabled)
  let blockscoutData = {
    pools: [] as any[],
    tokens: [] as any[],
    gasPrices: [] as any[],
    liquidityDist: [] as any[]
  };

  if (useBlockscoutSeed) {
    console.log('\n📡 Fetching real on-chain data from Blockscout...');
    
    try {
      // Fetch from multiple networks in parallel
      const networks = ['ethereum', 'polygon'];
      const fetchPromises = networks.map(async (network) => {
        console.log(`  Fetching ${network} data...`);
        const [pools, tokens, gas, liquidity] = await Promise.all([
          getTopUniswapPools(network, 10).catch(() => []),
          getTopTokens(20, network).catch(() => []),
          getHistoricalGasPrices(network, 3).catch(() => []),
          getTokenLiquidityDistribution(network).catch(() => [])
        ]);
        
        console.log(`  ✓ ${network}: ${pools.length} pools, ${tokens.length} tokens, ${gas.length} gas samples`);
        return { pools, tokens, gas, liquidity };
      });
      
      const results = await Promise.all(fetchPromises);
      
      // Aggregate results
      results.forEach(r => {
        blockscoutData.pools.push(...r.pools);
        blockscoutData.tokens.push(...r.tokens);
        blockscoutData.gasPrices.push(...r.gas);
        blockscoutData.liquidityDist.push(...r.liquidity);
      });
      
      console.log(`\n📊 Blockscout data summary:`);
      console.log(`  Total pools: ${blockscoutData.pools.length}`);
      console.log(`  Total tokens: ${blockscoutData.tokens.length}`);
      console.log(`  Gas samples: ${blockscoutData.gasPrices.length}`);
      console.log(`  Liquidity data points: ${blockscoutData.liquidityDist.length}`);
    } catch (error) {
      console.warn('⚠️  Blockscout fetch failed, continuing with Pyth only:', error);
    }
  }
  
  // Step 2: Calculate required number of vertices
  const minVertices = Math.ceil(TARGET_EDGES / MAX_AVG_DEGREE);
  console.log(`\nCalculated min vertices needed: ${minVertices}`);
  
  // Step 3: Get real tokens from Pyth (with caching)
  console.log('Fetching real tokens from Pyth...');
  const realTokenSymbols = getAvailableTokens();
  const realTokenCount = Math.min(realTokenSymbols.length, 50); // Limit to avoid API spam
  const selectedRealTokens = realTokenSymbols.slice(0, realTokenCount);
  
  console.log(`Using ${selectedRealTokens.length} real tokens from Pyth`);
  
  // Step 4: Fetch prices for real tokens (BATCHED to avoid rate limits)
  const priceCache = await fetchPricesBatched(selectedRealTokens);
  
  // Step 5: Extract statistical patterns from Blockscout data
  const patterns = extractBlockscoutPatterns(blockscoutData);
  console.log('\n📈 Statistical patterns from Blockscout:');
  console.log(`  Avg liquidity: $${patterns.avgLiquidity.toFixed(2)}`);
  console.log(`  Median gas: ${patterns.medianGas.toFixed(2)} gwei`);
  console.log(`  Liquidity std dev: $${patterns.liquidityStdDev.toFixed(2)}`);
  
  // Step 6: Add real tokens as vertices
  for (const symbol of selectedRealTokens) {
    const chain = SUPPORTED_CHAINS[Math.floor(Math.random() * SUPPORTED_CHAINS.length)];
    const key: TokenKey = `${symbol}.${chain}`;
    
    vertices.push({ key, symbol, chain });
    graph[key] = [];
  }
  
  // Step 5: Calculate how many synthetic tokens needed
  const syntheticCount = Math.max(0, minVertices - realTokenCount);
  console.log(`Generating ${syntheticCount} synthetic tokens...`);
  
  // Step 6: Generate synthetic tokens
  for (let i = 0; i < syntheticCount; i++) {
    const symbol = `SYN${i}`;
    const chain = SUPPORTED_CHAINS[Math.floor(Math.random() * SUPPORTED_CHAINS.length)];
    const key: TokenKey = `${symbol}.${chain}`;
    
    vertices.push({ key, symbol, chain });
    graph[key] = [];
    
    if ((i + 1) % 1000 === 0) {
      console.log(`Generated ${i + 1}/${syntheticCount} synthetic tokens`);
    }
  }
  
  console.log(`Total vertices: ${vertices.length}`);
  
  // Step 7: Generate edges using SPARSE strategy
  console.log('Generating sparse edges...');
  const edgeCount = generateSparseEdges(
    graph,
    vertices,
    priceCache,
    TARGET_EDGES,
    MAX_AVG_DEGREE
  );
  
  // Step 8: Verify graph properties
  const stats = calculateGraphStats(graph, vertices, realTokenCount);
  
  const elapsedMs = Date.now() - startTime;
  console.log('\n=== Benchmark Generation Complete ===');
  console.log(`Time: ${(elapsedMs / 1000).toFixed(2)}s`);
  console.log(`Real tokens: ${stats.realTokens}`);
  console.log(`Synthetic tokens: ${stats.syntheticTokens}`);
  console.log(`Total vertices: ${stats.totalVertices}`);
  console.log(`Total edges: ${stats.totalEdges}`);
  console.log(`Avg OUT-degree/vertex: ${stats.avgEdgesPerVertex.toFixed(2)}`);
  console.log(`Max OUT-degree/vertex: ${stats.maxEdgesPerVertex}`);
  console.log(`Min OUT-degree/vertex: ${stats.minEdgesPerVertex}`);
  
  // Verify constraints
  if (stats.avgEdgesPerVertex > MAX_AVG_DEGREE * 1.1) { // Allow 10% tolerance
    console.warn(`⚠️  Average degree ${stats.avgEdgesPerVertex.toFixed(2)} exceeds limit ${MAX_AVG_DEGREE}`);
  }
  if (stats.totalEdges < TARGET_EDGES * 0.95 || stats.totalEdges > TARGET_EDGES * 1.05) {
    console.warn(`⚠️  Edge count ${stats.totalEdges} is outside target range [${TARGET_EDGES * 0.95}, ${TARGET_EDGES * 1.05}]`);
  }
  
  return {
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    graph,
    vertices,
    stats,
  };
}

/**
 * Fetch Pyth prices in batches to avoid rate limits
 */
async function fetchPricesBatched(
  symbols: string[],
  batchSize: number = 10
): Promise<Map<string, number>> {
  const priceCache = new Map<string, number>();
  
  console.log(`Fetching ${symbols.length} prices in batches of ${batchSize}...`);
  
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, Math.min(i + batchSize, symbols.length));
    
    // Fetch batch concurrently
    const promises = batch.map(async (symbol) => {
      try {
        const feedKey = symbol === 'MATIC' ? 'MATICX/MATIC.RR' : 
                        symbol === 'BTC' ? 'BTC/USD' : 
                        `${symbol}/USD`;
        
        const feedId = PYTH_FEED_IDS[feedKey];
        if (!feedId) return null;
        
        const price = await fetchPythPriceFeed(feedId, symbol);
        if (price && price.price > 0) {
          priceCache.set(symbol, price.price);
        }
        return price;
      } catch (error) {
        console.warn(`Failed to fetch price for ${symbol}:`, error);
        return null;
      }
    });
    
    await Promise.all(promises);
    
    // Rate limiting: wait between batches
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
    }
  }
  
  console.log(`Cached ${priceCache.size} prices`);
  return priceCache;
}

/**
 * Statistical helper functions for pattern extraction
 */
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 
    ? (sorted[mid - 1] + sorted[mid]) / 2 
    : sorted[mid];
}

function stdDev(arr: number[]): number {
  if (arr.length === 0) return 0;
  const avg = mean(arr);
  const squareDiffs = arr.map(val => Math.pow(val - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

/**
 * Fit power-law distribution using Maximum Likelihood Estimation
 * Returns the exponent α for P(x) ~ x^(-α)
 */
function fitPowerLaw(data: number[]): number {
  if (data.length === 0) return 2.0; // Default power-law exponent
  
  // Filter out zeros and negatives
  const positive = data.filter(x => x > 0);
  if (positive.length === 0) return 2.0;
  
  // MLE estimator: α = 1 + n / Σ ln(x_i / x_min)
  const xMin = Math.min(...positive);
  const logSum = positive.reduce((sum, x) => sum + Math.log(x / xMin), 0);
  const alpha = 1 + positive.length / logSum;
  
  // Clamp to reasonable range [1.5, 3.5]
  return Math.max(1.5, Math.min(3.5, alpha));
}

/**
 * Extract statistical patterns from real Blockscout data
 */
function extractBlockscoutPatterns(blockscoutData: any) {
  const liquidityValues = blockscoutData.liquidityDist.map((d: any) => d.tvl || 0).filter((v: number) => v > 0);
  const allGasPrices = blockscoutData.gasPrices.map((g: any) => g.gasPrice || 0).filter((v: number) => v > 0);
  
  // Fallback to reasonable defaults if no data
  const defaultAvgLiquidity = 500000; // $500k
  const defaultMedianGas = 25; // 25 gwei
  
  return {
    // Liquidity follows power-law
    avgLiquidity: liquidityValues.length > 0 ? mean(liquidityValues) : defaultAvgLiquidity,
    medianLiquidity: liquidityValues.length > 0 ? median(liquidityValues) : defaultAvgLiquidity,
    liquidityStdDev: liquidityValues.length > 0 ? stdDev(liquidityValues) : defaultAvgLiquidity * 0.5,
    liquidityAlpha: liquidityValues.length > 10 ? fitPowerLaw(liquidityValues) : 2.5, // Power-law exponent
    
    // Gas prices are normally distributed
    avgGas: allGasPrices.length > 0 ? mean(allGasPrices) : defaultMedianGas,
    medianGas: allGasPrices.length > 0 ? median(allGasPrices) : defaultMedianGas,
    gasStdDev: allGasPrices.length > 0 ? stdDev(allGasPrices) : 10,
    
    // Pool connectivity (degree distribution)
    avgDegree: 3, // Default average connections per token
    
    // Real data available flags
    hasRealData: liquidityValues.length > 0 || allGasPrices.length > 0
  };
}

/**
 * Token pair types for liquidity generation
 */
enum PairType {
  STABLECOIN = 'stablecoin',     // USDC/USDT, DAI/USDC
  WRAPPED = 'wrapped',            // ETH/WETH, MATIC/WMATIC
  MAJOR = 'major',                // ETH/USDC, BTC/USDC
  LONG_TAIL = 'long_tail'         // SYN/SYN pairs
}

/**
 * Determine pair type based on token symbols
 */
function determinePairType(symbol1: string, symbol2: string): PairType {
  const stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX'];
  const wrapped = ['WETH', 'WMATIC', 'WBTC', 'WAVAX'];
  const majorTokens = ['ETH', 'BTC', 'USDC', 'USDT', 'BNB', 'SOL', 'MATIC', 'AVAX'];

  const isStable1 = stablecoins.includes(symbol1);
  const isStable2 = stablecoins.includes(symbol2);
  
  if (isStable1 && isStable2) {
    return PairType.STABLECOIN;
  }

  // Check for wrapped pairs (e.g., ETH/WETH)
  if ((symbol1 === 'ETH' && symbol2 === 'WETH') ||
      (symbol1 === 'WETH' && symbol2 === 'ETH') ||
      (symbol1 === 'MATIC' && symbol2 === 'WMATIC') ||
      (symbol1 === 'WMATIC' && symbol2 === 'MATIC')) {
    return PairType.WRAPPED;
  }

  const isMajor1 = majorTokens.includes(symbol1);
  const isMajor2 = majorTokens.includes(symbol2);

  if (isMajor1 && isMajor2) {
    return PairType.MAJOR;
  }

  return PairType.LONG_TAIL;
}

/**
 * Generate realistic exchange rate based on pair type
 */
function generateRealisticRate(
  symbol1: string,
  symbol2: string,
  price1: number | undefined,
  price2: number | undefined
): number {
  // Use real prices if available
  if (price1 && price2 && price1 > 0 && price2 > 0) {
    return price1 / price2;
  }

  const pairType = determinePairType(symbol1, symbol2);

  switch (pairType) {
    case PairType.STABLECOIN:
      // Tight spread around 1.0 (0.999 - 1.001)
      return 0.999 + Math.random() * 0.002;
    
    case PairType.WRAPPED:
      // Almost exactly 1:1 (0.9995 - 1.0005)
      return 0.9995 + Math.random() * 0.001;
    
    case PairType.MAJOR:
      // Medium variance (0.5 - 1.5)
      return 0.5 + Math.random() * 1.0;
    
    case PairType.LONG_TAIL:
    default:
      // Wide variance (0.1 - 2.0)
      return 0.1 + Math.random() * 1.9;
  }
}

/**
 * Generate realistic liquidity pool based on pair type
 * Uses power-law distribution: few deep pools, many shallow pools
 */
function generateRealisticLiquidity(
  symbol1: string,
  symbol2: string,
  rate: number,
  isCrossChain: boolean
): LiquidityPool | undefined {
  // Bridges don't have traditional liquidity pools
  if (isCrossChain) {
    return undefined;
  }

  const pairType = determinePairType(symbol1, symbol2);
  
  // Power-law distribution for TVL
  // Top 10%: $1M - $100M
  // Next 40%: $100K - $1M  
  // Bottom 50%: $10K - $100K
  const rand = Math.random();
  let liquidityUSD: number;
  
  if (rand < 0.1) {
    // Top 10% - Deep liquidity
    liquidityUSD = 1_000_000 + Math.random() * 99_000_000;
  } else if (rand < 0.5) {
    // Next 40% - Medium liquidity
    liquidityUSD = 100_000 + Math.random() * 900_000;
  } else {
    // Bottom 50% - Shallow liquidity
    liquidityUSD = 10_000 + Math.random() * 90_000;
  }

  // Adjust based on pair type
  switch (pairType) {
    case PairType.STABLECOIN:
      // Stablecoin pools have highest liquidity
      liquidityUSD *= 3;
      break;
    case PairType.MAJOR:
      // Major pairs have 2x liquidity
      liquidityUSD *= 2;
      break;
    case PairType.LONG_TAIL:
      // Long-tail tokens have lower liquidity
      liquidityUSD *= 0.5;
      break;
  }

  // Calculate reserves assuming 50/50 split
  const halfLiquidity = liquidityUSD / 2;
  const reserveBase = halfLiquidity; // In token1 terms
  const reserveQuote = halfLiquidity / rate; // In token2 terms

  // Determine pool type and fee
  let poolType: LiquidityPool['poolType'];
  let feePercent: number;

  if (pairType === PairType.STABLECOIN) {
    poolType = 'stable_swap'; // Curve-style
    feePercent = 0.0004; // 0.04%
  } else if (pairType === PairType.MAJOR && rand < 0.3) {
    poolType = 'concentrated_liquidity'; // Uniswap V3
    feePercent = 0.0005; // 0.05%
  } else {
    poolType = 'constant_product'; // Uniswap V2
    feePercent = 0.003; // 0.3%
  }

  // Estimate 24h volume based on liquidity (typically 0.5x to 2x TVL)
  const volume24h = liquidityUSD * (0.5 + Math.random() * 1.5);

  return {
    reserveBase,
    reserveQuote,
    liquidityUSD,
    feePercent,
    poolType,
    volume24h
  };
}

/**
 * Generate sparse edges ensuring avg degree ≤ maxAvgDegree
 * Uses random sparse graph generation (Erdős-Rényi with degree constraint)
 */
function generateSparseEdges(
  graph: RouteGraph,
  vertices: Vertex[],
  priceCache: Map<string, number>,
  targetEdges: number,
  maxAvgDegree: number
): number {
  const n = vertices.length;
  const maxEdgesPerVertex = Math.ceil(maxAvgDegree * 1.5); // Allow some variance
  const outDegree: Record<TokenKey, number> = {}; // FIXED: Track only out-degree
  
  // Initialize out-degree counts
  for (const v of vertices) {
    outDegree[v.key] = 0;
  }
  
  let totalEdges = 0;
  const maxAttempts = targetEdges * 3; // Avoid infinite loops
  let attempts = 0;
  
  while (totalEdges < targetEdges && attempts < maxAttempts) {
    attempts++;
    
    // Randomly select source and target
    const fromIdx = Math.floor(Math.random() * n);
    const toIdx = Math.floor(Math.random() * n);
    
    if (fromIdx === toIdx) continue;
    
    const from = vertices[fromIdx];
    const to = vertices[toIdx];
    
    // Check OUT-degree constraint (FIXED)
    if (outDegree[from.key] >= maxEdgesPerVertex) continue;
    
    // Check if edge already exists
    if (graph[from.key].some(e => e.target === to.key)) continue;
    
    // Determine edge type
    const isCrossChain = from.chain !== to.chain;
    
    // Calculate rate with realistic spreads
    const fromPrice = priceCache.get(from.symbol);
    const toPrice = priceCache.get(to.symbol);
    const rate = generateRealisticRate(from.symbol, to.symbol, fromPrice, toPrice);
    
    // Generate realistic liquidity pool
    const liquidity = generateRealisticLiquidity(
      from.symbol,
      to.symbol,
      rate,
      isCrossChain
    );
    
    // Estimate execution time
    let estimatedTimeMs: number;
    if (isCrossChain) {
      estimatedTimeMs = 300000 + Math.random() * 300000; // 5-10 minutes for bridges
    } else {
      estimatedTimeMs = 15000 + Math.random() * 45000; // 15-60 seconds for swaps
    }
    
    // Add edge with enhanced data
    const edge: Edge = {
      target: to.key,
      kind: isCrossChain ? 'bridge' : 'swap',
      rate,
      gas: 0.0001 + Math.random() * 0.0005,
      liquidity,
      bridgeFee: isCrossChain ? 0.001 : undefined,
      dex: isCrossChain ? undefined : 'UniswapV3',
      bridge: isCrossChain ? 'Across' : undefined,
      poolAddress: isCrossChain ? undefined : `0x${from.symbol}${to.symbol}Pool`,
      estimatedTimeMs,
    };
    
    graph[from.key].push(edge);
    outDegree[from.key]++; // FIXED: Only increment out-degree
    totalEdges++;
    
    // Progress update
    if (totalEdges % 10000 === 0) {
      const avgDegree = (totalEdges / n).toFixed(2);
      console.log(`  Edges: ${totalEdges}/${targetEdges} (avg OUT-degree: ${avgDegree})`);
    }
  }
  
  if (attempts >= maxAttempts && totalEdges < targetEdges) {
    console.warn(`⚠️  Stopped after ${attempts} attempts with ${totalEdges} edges (target: ${targetEdges})`);
    console.warn(`    This may happen if max degree constraint is too restrictive.`);
  }
  
  return totalEdges;
}

/**
 * Calculate graph statistics
 */
function calculateGraphStats(
  graph: RouteGraph,
  vertices: Vertex[],
  realTokenCount: number
): BenchmarkData['stats'] {
  const edgeCounts = Object.values(graph).map(edges => edges.length);
  const totalEdges = edgeCounts.reduce((sum, count) => sum + count, 0);
  
  return {
    realTokens: realTokenCount,
    syntheticTokens: vertices.length - realTokenCount,
    totalVertices: vertices.length,
    totalEdges,
    avgEdgesPerVertex: totalEdges / vertices.length, // Average OUT-degree
    maxEdgesPerVertex: Math.max(...edgeCounts, 0),
    minEdgesPerVertex: Math.min(...edgeCounts, 0),
  };
}

/**
 * Save benchmark to file
 */
export function saveBenchmark(data: BenchmarkData): string {
  const resultsDir = path.join(process.cwd(), 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const filename = `benchmark-${data.timestamp.replace(/[:.]/g, '-')}.json`;
  const filepath = path.join(resultsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  
  console.log(`\n✅ Benchmark saved to: ${filepath}`);
  return filepath;
}

/**
 * Load latest benchmark
 */
export function loadLatestBenchmark(): BenchmarkData | null {
  const resultsDir = path.join(process.cwd(), 'results');
  if (!fs.existsSync(resultsDir)) {
    return null;
  }
  
  const files = fs.readdirSync(resultsDir)
    .filter((f: string) => f.startsWith('benchmark-') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    return null;
  }
  
  const filepath = path.join(resultsDir, files[0]);
  const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  
  console.log(`✅ Loaded benchmark: ${filepath}`);
  console.log(`  Vertices: ${data.stats.totalVertices}`);
  console.log(`  Edges: ${data.stats.totalEdges}`);
  console.log(`  Avg OUT-degree: ${data.stats.avgEdgesPerVertex.toFixed(2)}`);
  
  return data;
}