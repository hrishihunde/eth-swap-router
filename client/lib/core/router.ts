import { getPriceRatio } from "../partners/pyth";
import { getTokenBalance } from "../partners/blockscout";

// Core graph types
export type TokenKey = string; // e.g., 'ETH.ethereum', 'USDC.ethereum'

export interface LiquidityPool {
  reserveBase: number;          // Reserve of input token
  reserveQuote: number;         // Reserve of output token
  liquidityUSD: number;         // Total pool TVL
  feePercent: number;           // Pool fee (0.003 = 0.3%)
  poolType: 'constant_product' | 'stable_swap' | 'concentrated_liquidity';
  volume24h?: number;           // 24h trading volume
}

export interface Edge {
  target: TokenKey;
  kind: 'swap' | 'bridge';
  
  // Pricing
  rate?: number;                // Nominal spot price (for small trades)
  
  // Liquidity modeling (NEW)
  liquidity?: LiquidityPool;
  
  // Protocol details
  dex?: string;                 // e.g., 'UniswapV3', 'Curve', 'SushiSwap'
  bridge?: string;              // e.g., 'Across', 'Stargate', 'Hop'
  poolAddress?: string;
  
  // Costs
  gas?: number;                 // Gas cost in ETH
  bridgeFee?: number;           // Fixed bridge fee (e.g., 0.001 = 0.1%)
  timeDelay?: number;           // Bridge delay in seconds (e.g., 120 = 2 min)
  
  // Metadata
  estimatedTimeMs?: number;     // Execution time estimate
}

export interface Vertex {
  key: TokenKey;
  symbol: string;
  chain: string;
  address?: string;
  decimals?: number;
  priceUSD?: number;
}

export type RouteGraph = Record<TokenKey, Edge[]>;

export interface RouteResult {
  path: TokenKey[];
  totalWeight: number;
  estimatedOutput: number;
  steps: {
    from: TokenKey; to: TokenKey; weight: number;
    kind: string; details?: any;
  }[];
}

// Construct a graph using on-chain & oracle data (pool, price, gas, etc.)
export async function buildRouteGraph(
  vertices: Vertex[], 
  maxHops = 4,
  options?: { skipExternalData?: boolean }
): Promise<RouteGraph> {
  const graph: RouteGraph = {};

  if (options?.skipExternalData) {
    // In test mode, just return empty graph since we'll use simulation data
    return graph;
  }

  // Initialize all vertices
  console.log(`🔧 Building graph with ${vertices.length} vertices`);
  for (const v of vertices) {
    if (!v.key || !v.symbol || !v.chain) {
      console.warn('Skipping vertex with missing key/symbol/chain:', v);
      continue;
    }
    if (!graph[v.key]) {
      graph[v.key] = [];
    }
  }
  console.log(`✅ Initialized ${Object.keys(graph).length} nodes in graph`);

  // STEP 1: Add SWAP edges (same chain, different tokens)
  for (const v of vertices) {
    if (!v.key || !v.symbol || !v.chain) continue;
    
    for (const u of vertices) {
      if (v.key === u.key) continue;
      if (!u.key || !u.symbol || !u.chain) continue;
      
      // Only create swap edges for tokens on SAME chain
      if (v.chain !== u.chain) continue;
      
      try {
        const priceRatio = await getPriceRatio(`${v.symbol}/USD`, `${u.symbol}/USD`);
        if (priceRatio && priceRatio > 0) {
          const balanceInfo = await getTokenBalance(
            process.env.NEXT_PUBLIC_ROUTER_ADDRESS!,
            v.key.split('.')[0],
            v.chain
          );

          if (balanceInfo && balanceInfo.balance >= 1e-6) {
            graph[v.key].push({
              target: u.key,
              kind: 'swap',
              dex: 'UniswapV3',
              rate: priceRatio,
              gas: 0.0003, // ~150k gas units * 2 gwei
              poolAddress: `0x${v.symbol}${u.symbol}Pool`
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to get swap data for ${v.symbol}/${u.symbol}:`, error instanceof Error ? error.message : error);
      }
    }
  }

  // STEP 2: Add BRIDGE edges (same token, different chains)
  // Common bridgeable tokens
  const BRIDGEABLE_TOKENS = ['USDC', 'USDT', 'WETH', 'WMATIC', 'DAI', 'WBTC'];
  
  console.log(`\n🌉 Creating bridge edges for tokens: ${BRIDGEABLE_TOKENS.join(', ')}`);
  let bridgeCount = 0;
  
  for (const symbol of BRIDGEABLE_TOKENS) {
    // Find all vertices with this symbol
    const tokensWithSymbol = vertices.filter(v => 
      v.symbol === symbol && v.key && v.chain
    );
    
    console.log(`  ${symbol}: Found ${tokensWithSymbol.length} deployments - ${tokensWithSymbol.map(t => t.chain).join(', ')}`);
    
    // Create bridge edges between all pairs of chains for this token
    for (const fromToken of tokensWithSymbol) {
      for (const toToken of tokensWithSymbol) {
        if (fromToken.key === toToken.key) continue;
        if (fromToken.chain === toToken.chain) continue;
        
        // Add bridge edge
        graph[fromToken.key].push({
          target: toToken.key,
          kind: 'bridge',
          bridge: 'Across', // Example bridge protocol
          rate: 0.999, // 0.1% fee = 99.9% rate
          bridgeFee: 0.001, // 0.1% = 0.001
          timeDelay: 120, // 2 minutes in seconds
          gas: 0.0005, // ~200k gas for bridge tx
          estimatedTimeMs: 120000 // 2 minutes
        });
        
        bridgeCount++;
        console.log(`    ✓ ${fromToken.key} -> ${toToken.key}`);
      }
    }
  }
  
  console.log(`\n✅ Created ${bridgeCount} bridge edges`);
  
  // Log graph statistics
  const swapEdges = Object.values(graph).flat().filter(e => e.kind === 'swap').length;
  const bridgeEdges = Object.values(graph).flat().filter(e => e.kind === 'bridge').length;
  console.log(`\n📊 Graph Statistics:`);
  console.log(`   Nodes: ${Object.keys(graph).length}`);
  console.log(`   Swap Edges: ${swapEdges}`);
  console.log(`   Bridge Edges: ${bridgeEdges}`);
  console.log(`   Total Edges: ${swapEdges + bridgeEdges}`);

  return graph;
}

// Entry: Find shortest path using Duan et al. SSSP for a swap
export async function findBestRoute(
  graph: RouteGraph,
  source: TokenKey,
  target: TokenKey,
  maxHops: number = 4,
): Promise<RouteResult> {

  // --- Data structures for SSSP ---
  const n = Object.keys(graph).length;
  const dist: Record<TokenKey, number> = {};
  const prev: Record<TokenKey, TokenKey | null> = {};
  const visited: Set<TokenKey> = new Set();

  for (const token in graph) {
    dist[token] = Infinity;
    prev[token] = null;
  }
  dist[source] = 0;

  let levels: TokenKey[][] = [[source]];
  let currentLevel = 0, hop = 0;
  // Each level is a “frontier” in the recursive BMSSP framework (Duan et al.)

  // --- Main loop (multi-frontier/Bellman-Ford bulk relax, hop-limited) ---
  while (levels.length && hop < maxHops) {
    const nextLevel: TokenKey[] = [];
    for (const u of levels[currentLevel]) {
      if (visited.has(u)) continue;
      visited.add(u);

      for (const edge of graph[u] || []) {
        const v = edge.target;
        if (visited.has(v)) continue;
        // -ln(rate) is minimal for maximal output (add costs for bridges, gas etc if desired)
        const w = edge.rate && edge.rate > 0 ? -Math.log(edge.rate) : (Number.MAX_VALUE/2);

        if (dist[u] + w < dist[v]) {
          dist[v] = dist[u] + w;
          prev[v] = u;
          nextLevel.push(v);
        }
      }
    }
    // Early break if target reached
    if (dist[target] < Infinity) break;
    levels.push(nextLevel);
    currentLevel += 1;
    hop += 1;
  }

  // --- Path Backtracking ---
  if (dist[target] === Infinity) {
    throw new Error(`No route found from ${source} to ${target}`);
  }
  let path: TokenKey[] = [], steps: RouteResult['steps'] = [];
  let cur: TokenKey | null = target;
  while (cur !== null) {
    path.unshift(cur);
    cur = prev[cur];
  }
  let curToken = path[0];
  for (let i = 1; i < path.length; i++) {
    const nextToken = path[i];
    const edge = (graph[curToken] || []).find(e => e.target === nextToken);
    steps.push({ from: curToken, to: nextToken, weight: dist[nextToken] - dist[curToken], kind: edge?.kind || "swap", details: edge });
    curToken = nextToken;
  }

  // --- Output Calculation ---
  const totalWeight = dist[target];
  const estimatedOutput = Math.exp(-totalWeight); // For swap: exp(-sum(-ln(rate))) = product of rates

  return {
    path,
    totalWeight,
    estimatedOutput,
    steps,
  };
}

/*
  Usage (async):
  const graph = await buildRouteGraph(verticesList);
  const bestRoute = await findBestRoute(graph, "ETH.ethereum", "USDC.ethereum");
  console.log("Best Path:", bestRoute.path, "Estimated output:", bestRoute.estimatedOutput);
*/

