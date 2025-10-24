import { RouteGraph, TokenKey, RouteResult, Edge } from '../router';

export interface PSBDijkstraMetrics {
  executionTimeMs: number;
  gasEstimate: number;
  visitedNodes: number;
  pathLength: number;
  barrierCount: number;
}

export function psbDijkstra(
  graph: RouteGraph,
  source: TokenKey,
  target: TokenKey,
  maxHops: number = 4
): { route: RouteResult; metrics: PSBDijkstraMetrics } {
  const startTime = performance.now();
  
  // Initialize tracking metrics
  let visitedCount = 0;
  let barrierCount = 0;
  let gasTotal = 0;

  // Initialize distances and barriers
  const dist: Record<TokenKey, number> = {};
  const prev: Record<TokenKey, TokenKey | null> = {};
  const visited = new Set<TokenKey>();
  const barriers = new Set<number>();

  // Initialize all distances to infinity
  for (const token in graph) {
    dist[token] = Infinity;
  }
  dist[source] = 0;

  // Implementing Post-Sorting Barrier Dijkstra algorithm
  let levels: TokenKey[][] = [[source]];
  let currentLevel = 0;
  let hop = 0;

  while (levels.length > currentLevel && hop < maxHops) {
    const nextLevel: TokenKey[] = [];
    const currentBarrier = Math.floor(-Math.log(dist[target] || Infinity) * 1000);
    
    if (!barriers.has(currentBarrier)) {
      barriers.add(currentBarrier);
      barrierCount++;
    }

    const currentLevelNodes = levels[currentLevel] || [];
    for (const u of currentLevelNodes) {
      if (!u || visited.has(u)) continue;
      visited.add(u);
      visitedCount++;

      // Process edges for current vertex
      for (const edge of graph[u] || []) {
        const v = edge.target;
        if (visited.has(v)) continue;

        // Calculate edge weight with Post-Sorting Barrier optimization
        const rate = edge.rate || 0;
        const weight = rate > 0 ? -Math.log(rate) + (edge.gas || 0) : Number.MAX_VALUE / 2;
        
        // Update distance if better path found
        if (dist[u] + weight < dist[v]) {
          dist[v] = dist[u] + weight;
          prev[v] = u;
          nextLevel.push(v);
          
          if (edge.gas) {
            gasTotal += edge.gas;
          }
        }
      }
    }

    // Early termination if target reached with optimal path
    if (dist[target] < Infinity && nextLevel.every(v => dist[v] >= dist[target])) {
      break;
    }

    if (nextLevel.length > 0) {
      levels.push(nextLevel);
    }
    currentLevel++;
    hop++;
  }

  // Build the path and steps
  const path: TokenKey[] = [];
  const steps: RouteResult['steps'] = [];
  let current: TokenKey | null = target;

  while (current && prev[current]) {
    path.unshift(current);
    const prevToken = prev[current];
    if (prevToken && graph[prevToken]) {
      const edge = graph[prevToken].find((e: Edge) => e.target === current);
      if (edge) {
        steps.unshift({
          from: prevToken,
          to: current,
          weight: -Math.log(edge.rate || 0),
          kind: edge.kind || 'swap',
          details: edge
        });
      }
    }
    current = prev[current];
  }
  if (current) path.unshift(current);

  const endTime = performance.now();

  const metrics: PSBDijkstraMetrics = {
    executionTimeMs: endTime - startTime,
    gasEstimate: gasTotal,
    visitedNodes: visitedCount,
    pathLength: path.length - 1,
    barrierCount
  };

  return {
    route: {
      path,
      totalWeight: dist[target],
      estimatedOutput: Math.exp(-dist[target]),
      steps
    },
    metrics
  };
}