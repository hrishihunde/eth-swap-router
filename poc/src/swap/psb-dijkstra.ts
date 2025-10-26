import { 
  Token, 
  Edge, 
  Graph, 
  RouteHop, 
  RoutingResult,
  TOKENS,
  fetchBlockscoutRate,
  fetchPythPrice,
  fetchAvailBridgeRate
} from './aggregator';

import { printRoutingResult } from './classic';

export const PSB_CONFIG = {
  MAX_HOPS: 4,
  MIN_CUMULATIVE_RATE: 0.000001,
  MAX_PATHS_EXPLORED: 1000,
  MIN_EDGE_RATE: 0.0001,
  MAX_QUEUE_SIZE: 500,
};

export async function buildGraphPSB(): Promise<Graph> {
  const graph: Graph = {};
  
  console.log('Building PSB graph...\n');
  
  for (const token of TOKENS) {
    graph[token.id] = [];
  }
  
  for (const tokenA of TOKENS) {
    for (const tokenB of TOKENS) {
      if (tokenA.id === tokenB.id) continue;
      
      let edge: Edge | null = null;
      
      if (tokenA.chain === tokenB.chain) {
        const blockscoutData = await fetchBlockscoutRate(tokenA.chain, tokenA, tokenB);
        
        if (blockscoutData.rate > 0 && blockscoutData.rate >= PSB_CONFIG.MIN_EDGE_RATE) {
          edge = {
            to: tokenB,
            weight: 1 / blockscoutData.rate,
            rate: blockscoutData.rate,
            meta: {
              source: blockscoutData.partnerUsed ? 'blockscout' : 'hardcoded',
              partnerUsed: blockscoutData.partnerUsed,
              detail: blockscoutData.detail,
            }
          };
        }
      } else {
        const availData = await fetchAvailBridgeRate(tokenA, tokenB);
        
        if (availData.rate > 0) {
          const priceA = await fetchPythPrice(tokenA);
          const priceB = await fetchPythPrice(tokenB);
          
          let effectiveRate = availData.rate;
          if (priceA.price > 0 && priceB.price > 0) {
            effectiveRate *= (priceA.price / priceB.price);
          }
          
          if (effectiveRate >= PSB_CONFIG.MIN_EDGE_RATE) {
            edge = {
              to: tokenB,
              weight: 1 / effectiveRate,
              rate: effectiveRate,
              meta: {
                source: 'avail',
                partnerUsed: availData.partnerUsed,
                detail: {
                  ...availData.detail,
                  priceA: priceA.price,
                  priceB: priceB.price,
                }
              }
            };
          }
        }
      }
      
      if (edge && edge.rate > 0) {
        graph[tokenA.id]!.push(edge);
      }
    }
  }
  
  console.log(`PSB graph built with ${TOKENS.length} tokens\n`);
  return graph;
}

type QueueItem = {
  cost: number;
  tokenId: string;
  path: string[];
  hops: RouteHop[];
  hopCount: number;
  cumulativeRate: number;
};

export function psbDijkstra(
  graph: Graph,
  startTokenId: string,
  endTokenId: string
): RoutingResult | null {
  const queue: QueueItem[] = [{
    cost: 0,
    tokenId: startTokenId,
    path: [startTokenId],
    hops: [],
    hopCount: 0,
    cumulativeRate: 1.0
  }];
  
  const visited = new Set<string>();
  const costs: Record<string, number> = { [startTokenId]: 0 };
  
  let exploredPaths = 0;
  let prunedByHops = 0;
  let prunedByRate = 0;
  let prunedByQueueLimit = 0;
  
  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    
    if (queue.length > PSB_CONFIG.MAX_QUEUE_SIZE) {
      const pruned = queue.length - PSB_CONFIG.MAX_QUEUE_SIZE;
      queue.splice(PSB_CONFIG.MAX_QUEUE_SIZE);
      prunedByQueueLimit += pruned;
    }
    
    const current = queue.shift()!;
    exploredPaths++;
    
    if (exploredPaths > PSB_CONFIG.MAX_PATHS_EXPLORED) {
      console.log(`PSB early termination at ${PSB_CONFIG.MAX_PATHS_EXPLORED} paths\n`);
      break;
    }
    
    if (current.tokenId === endTokenId) {
      console.log(`PSB explored ${exploredPaths} paths`);
      console.log(`  ├─ Pruned by hops: ${prunedByHops}`);
      console.log(`  ├─ Pruned by rate: ${prunedByRate}`);
      console.log(`  └─ Pruned by queue: ${prunedByQueueLimit}`);
      console.log(`  Total pruned: ${prunedByHops + prunedByRate + prunedByQueueLimit}\n`);
      
      const totalRate = current.hops.reduce((acc, hop) => acc * hop.rate, 1);
      
      return {
        path: current.path.map(id => TOKENS.find(t => t.id === id)!),
        hops: current.hops,
        totalRate,
        totalCost: current.cost
      };
    }
    
    if (visited.has(current.tokenId)) continue;
    visited.add(current.tokenId);
    
    const edges = graph[current.tokenId] || [];
    for (const edge of edges) {
      const nextTokenId = edge.to.id;
      const newCost = current.cost + edge.weight;
      const newHopCount = current.hopCount + 1;
      const newCumulativeRate = current.cumulativeRate * edge.rate;
      
      if (newHopCount > PSB_CONFIG.MAX_HOPS) {
        prunedByHops++;
        continue;
      }
      
      if (newCumulativeRate < PSB_CONFIG.MIN_CUMULATIVE_RATE) {
        prunedByRate++;
        continue;
      }
      
      if (!costs[nextTokenId] || newCost < costs[nextTokenId]) {
        costs[nextTokenId] = newCost;
        
        const fromToken = TOKENS.find(t => t.id === current.tokenId)!;
        
        queue.push({
          cost: newCost,
          tokenId: nextTokenId,
          path: [...current.path, nextTokenId],
          hops: [...current.hops, {
            from: fromToken,
            to: edge.to,
            rate: edge.rate,
            source: edge.meta.source,
            detail: edge.meta.detail
          }],
          hopCount: newHopCount,
          cumulativeRate: newCumulativeRate
        });
      }
    }
  }
  
  console.log(`PSB explored ${exploredPaths} paths - no route found`);
  console.log(`  Pruned: ${prunedByHops + prunedByRate + prunedByQueueLimit} paths\n`);
  return null;
}

export async function runPSBRouter() {
  console.log('\nPSB-OPTIMIZED DIJKSTRA ROUTER\n');
  console.log('Optimizations:');
  console.log(`  • Max Hops: ${PSB_CONFIG.MAX_HOPS}`);
  console.log(`  • Min Cumulative Rate: ${PSB_CONFIG.MIN_CUMULATIVE_RATE}`);
  console.log(`  • Max Paths: ${PSB_CONFIG.MAX_PATHS_EXPLORED}`);
  console.log(`  • Min Edge Rate: ${PSB_CONFIG.MIN_EDGE_RATE}`);
  console.log(`  • Max Queue: ${PSB_CONFIG.MAX_QUEUE_SIZE}\n`);
  
  const graph = await buildGraphPSB();
  
  const scenarios = [
    { from: 'eth-usdc', to: 'eth-weth', desc: 'Ethereum USDC -> WETH' },
    { from: 'eth-usdc', to: 'poly-wmatic', desc: 'Ethereum USDC -> Polygon WMATIC' },
    { from: 'poly-usdc', to: 'arb-weth', desc: 'Polygon USDC -> Arbitrum WETH' },
  ];
  
  for (const scenario of scenarios) {
    console.log(`\nScenario: ${scenario.desc}\n`);
    const result = psbDijkstra(graph, scenario.from, scenario.to);
    printRoutingResult(result, `PSB: ${scenario.from} -> ${scenario.to}`);
  }
}