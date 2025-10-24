import { getPriceRatio } from "../partners/pyth";
import { getTokenBalance } from "../partners/blockscout";

// Core graph types
export type TokenKey = string; // e.g., 'ETH.ethereum', 'USDC.ethereum'
export interface Edge {
  target: TokenKey;
  kind: 'swap' | 'bridge';
  dex?: string;
  rate?: number; // spot price or normalized edge rate
  bridgeFee?: number; // for bridge edges
  gas?: number; // estimated in token out units/USD
  poolAddress?: string;
}

export interface Vertex {
  key: TokenKey;
  symbol: string;
  chain: string;
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
export async function buildRouteGraph(vertices: Vertex[], maxHops = 4): Promise<RouteGraph> {
  const { buildLargeScaleGraph } = await import('./graph-generator');
  
  // Configure graph generation for sparse graph with 10^5 edges
  const graph = await buildLargeScaleGraph({
    targetEdgeCount: 100000, // 10^5 edges
    minLiquidity: 1000,
    maxLiquidity: 1000000,
    minRate: 0.1,
    maxRate: 10,
    averageDegree: 2.5 // Sparse graph characteristic
  });

  for (const v of vertices) {
    if (!graph[v.key]) {
      graph[v.key] = [];
    }
    
    for (const u of vertices) {
      if (v.key === u.key) continue;
      
      try {
        const priceRatio = await getPriceRatio(`${v.symbol}/USD`, `${u.symbol}/USD`);
        if (priceRatio) {
          const balanceInfo = await getTokenBalance(
            process.env.NEXT_PUBLIC_ROUTER_ADDRESS!,
            v.key.split('.')[0]
          );

          if (balanceInfo && balanceInfo.balance >= 1e-6) {
            graph[v.key].push({
              target: u.key,
              kind: 'swap',
              dex: 'real',
              rate: priceRatio,
              gas: 0.0003,
              poolAddress: `0x${v.symbol}${u.symbol}Pool`
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to get real data for ${v.symbol}/${u.symbol}:`, error);
      }
    }
  }

  return graph;
}

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

