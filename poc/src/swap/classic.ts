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

export async function buildGraph(): Promise<Graph> {
  const graph: Graph = {};

  console.log('Building routing graph...\n');

  for (const token of TOKENS) {
    graph[token.id] = [];
  }

  for (const tokenA of TOKENS) {
    for (const tokenB of TOKENS) {
      if (tokenA.id === tokenB.id) continue;

      let edge: Edge | null = null;

      if (tokenA.chain === tokenB.chain) {
        const blockscoutData = await fetchBlockscoutRate(tokenA.chain, tokenA, tokenB);

        if (blockscoutData.rate > 0) {
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

      if (edge && edge.rate > 0) {
        graph[tokenA.id]!.push(edge);
      }
    }
  }

  console.log(`Graph built with ${TOKENS.length} tokens\n`);
  return graph;
}

type QueueItem = {
  cost: number;
  tokenId: string;
  path: string[];
  hops: RouteHop[];
};

export function classicDijkstra(
  graph: Graph,
  startTokenId: string,
  endTokenId: string
): RoutingResult | null {
  const queue: QueueItem[] = [{
    cost: 0,
    tokenId: startTokenId,
    path: [startTokenId],
    hops: []
  }];

  const visited = new Set<string>();
  const costs: Record<string, number> = { [startTokenId]: 0 };

  let exploredPaths = 0;

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);

    const current = queue.shift()!;
    exploredPaths++;

    if (current.tokenId === endTokenId) {
      console.log(`Classic explored ${exploredPaths} paths\n`);

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
          }]
        });
      }
    }
  }

  console.log(`Classic explored ${exploredPaths} paths - no route found\n`);
  return null;
}

export function printRoutingResult(result: RoutingResult | null, title: string): void {
  console.log('='.repeat(80));
  console.log(title);
  console.log('='.repeat(80));

  if (!result) {
    console.log('No route found!\n');
    return;
  }

  console.log('\nROUTE PATH:');
  const pathStr = result.path.map(t => `${t.symbol} (${t.chain})`).join(' -> ');
  console.log(`   ${pathStr}\n`);
  
  console.log('SWAP HOPS:');
  result.hops.forEach((hop, idx) => {
    console.log(`\n   Hop ${idx + 1}: ${hop.from.symbol} -> ${hop.to.symbol}`);
    console.log(`   ├─ Rate: ${hop.rate.toFixed(6)}`);
    console.log(`   ├─ Source: ${hop.source}`);
    if (hop.source === 'avail') {
      console.log(`   ├─ Bridge: ${hop.from.chain} -> ${hop.to.chain}`);
    }
    if (hop.detail) {
      console.log(`   └─ Detail: ${JSON.stringify(hop.detail, null, 2).replace(/\n/g, '\n      ')}`);
    }
  });

  console.log(`\nTOTAL OUTPUT RATE: ${result.totalRate.toFixed(6)}`);
  const inputSymbol = result.path[0]?.symbol ?? 'N/A';
  const outputSymbol = result.path[result.path.length - 1]?.symbol ?? 'N/A';
  console.log(`   (For 1 ${inputSymbol}, you get ${result.totalRate.toFixed(6)} ${outputSymbol})`);
  console.log(`\nTOTAL COST: ${result.totalCost.toFixed(6)}`);
  console.log('\n' + '='.repeat(80) + '\n');
}

export async function runClassicRouter() {
  console.log('\nCLASSIC DIJKSTRA ROUTER\n');

  const graph = await buildGraph();

  const scenarios = [
    { from: 'eth-usdc', to: 'eth-weth', desc: 'Ethereum USDC -> WETH' },
    { from: 'eth-usdc', to: 'poly-wmatic', desc: 'Ethereum USDC -> Polygon WMATIC' },
    { from: 'poly-usdc', to: 'arb-weth', desc: 'Polygon USDC -> Arbitrum WETH' },
  ];

  for (const scenario of scenarios) {
    console.log(`\nScenario: ${scenario.desc}\n`);
    const result = classicDijkstra(graph, scenario.from, scenario.to);
    printRoutingResult(result, `CLASSIC: ${scenario.from} -> ${scenario.to}`);
  }
}