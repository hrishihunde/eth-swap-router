import { RouteGraph, TokenKey, RouteResult, Edge } from '../router';

export interface DijkstraMetrics {
  executionTimeMs: number;
  gasEstimate: number;
  visitedNodes: number;
  pathLength: number;
}

export function classicDijkstra(
  graph: RouteGraph,
  source: TokenKey,
  target: TokenKey,
  maxHops: number = 4,
): { route: RouteResult; metrics: DijkstraMetrics } {
  const startTime = performance.now();
  
  // Initialize data structures
  const dist: Record<TokenKey, number> = {};
  const prev: Record<TokenKey, TokenKey | null> = {};
  const visited = new Set<TokenKey>();
  let visitedCount = 0;

  // Initialize distances
  for (const token in graph) {
    dist[token] = Infinity;
  }
  dist[source] = 0;

  // Priority queue implementation (using array with distance-based sorting)
  const queue = Object.keys(graph).filter(token => token in dist);
  queue.sort((a, b) => dist[a] - dist[b]); // Initial sort by distance
  
  const totalNodes = Object.keys(graph).length;
  
  // Main Dijkstra loop
  while (queue.length > 0 && visitedCount < totalNodes) {
    // Get the vertex with minimum distance
    const u = queue.shift();
    if (!u || !graph[u]) continue;
    
    visitedCount++;

    if (u === target) break; // Target found
    if (visited.size >= maxHops) break; // Max hops reached
    
    visited.add(u);

    // Process neighbors
    for (const edge of graph[u] || []) {
      const v = edge.target;
      if (visited.has(v)) continue;
      
      const weight = edge.rate && edge.rate > 0 ? 
        -Math.log(edge.rate) + (edge.gas || 0) : 
        Number.MAX_VALUE / 2;

      if (dist[u] + weight < dist[v]) {
        dist[v] = dist[u] + weight;
        prev[v] = u;
      }
    }
  }

  // Build path
  const path: TokenKey[] = [];
  const steps: RouteResult['steps'] = [];
  let current: TokenKey | null = target;
  let gasTotal = 0;

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
        gasTotal += edge.gas || 0;
      }
    }
    current = prev[current];
  }
  if (current) path.unshift(current);

  const endTime = performance.now();

  const metrics: DijkstraMetrics = {
    executionTimeMs: endTime - startTime,
    gasEstimate: gasTotal,
    visitedNodes: visitedCount,
    pathLength: path.length - 1
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