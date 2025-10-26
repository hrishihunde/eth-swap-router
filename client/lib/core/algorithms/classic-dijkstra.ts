import { RouteGraph, TokenKey, RouteResult, Edge } from '../router';
import { 
  getOutputAmountConstantProduct,
  getOutputAmountStableSwap,
  SwapOutput
} from '../amm-math';

export interface DijkstraMetrics {
  executionTimeMs: number;
  gasEstimate: number;
  visitedNodes: number;
  pathLength: number;
  heapOperations: number; 
}

/**
 * Classic Dijkstra's Algorithm with Proper Min-Heap and Trade-Size Awareness
 * Complexity: O(m + n log n) with binary heap
 */
export function classicDijkstra(
  graph: RouteGraph,
  source: TokenKey,
  target: TokenKey,
  inputAmount: number,      // NEW: Trade size parameter
  maxHops: number = 4,
): { route: RouteResult; metrics: DijkstraMetrics } {
  const startTime = performance.now();
  
  // Priority queue implementation (min-heap)
  class MinHeap {
    private heap: Array<{ token: TokenKey; dist: number }> = [];
    private positions: Map<TokenKey, number> = new Map();
    public operations = 0;

    private parent(i: number): number {
      return Math.floor((i - 1) / 2);
    }

    private leftChild(i: number): number {
      return 2 * i + 1;
    }

    private rightChild(i: number): number {
      return 2 * i + 2;
    }

    private swap(i: number, j: number): void {
      this.operations++;
      const temp = this.heap[i];
      this.heap[i] = this.heap[j];
      this.heap[j] = temp;
      this.positions.set(this.heap[i].token, i);
      this.positions.set(this.heap[j].token, j);
    }

    private heapifyUp(i: number): void {
      while (i > 0 && this.heap[i].dist < this.heap[this.parent(i)].dist) {
        this.swap(i, this.parent(i));
        i = this.parent(i);
      }
    }

    private heapifyDown(i: number): void {
      let minIndex = i;
      const left = this.leftChild(i);
      const right = this.rightChild(i);

      if (left < this.heap.length && this.heap[left].dist < this.heap[minIndex].dist) {
        minIndex = left;
      }

      if (right < this.heap.length && this.heap[right].dist < this.heap[minIndex].dist) {
        minIndex = right;
      }

      if (i !== minIndex) {
        this.swap(i, minIndex);
        this.heapifyDown(minIndex);
      }
    }

    insert(token: TokenKey, dist: number): void {
      this.operations++;
      const pos = this.heap.length;
      this.heap.push({ token, dist });
      this.positions.set(token, pos);
      this.heapifyUp(pos);
    }

    extractMin(): { token: TokenKey; dist: number } | null {
      if (this.heap.length === 0) return null;
      
      this.operations++;
      const min = this.heap[0];
      const last = this.heap.pop()!;
      
      if (this.heap.length > 0) {
        this.heap[0] = last;
        this.positions.set(last.token, 0);
        this.heapifyDown(0);
      }
      
      this.positions.delete(min.token);
      return min;
    }

    decreaseKey(token: TokenKey, newDist: number): void {
      const pos = this.positions.get(token);
      if (pos === undefined) {
        this.insert(token, newDist);
        return;
      }

      this.operations++;
      if (newDist < this.heap[pos].dist) {
        this.heap[pos].dist = newDist;
        this.heapifyUp(pos);
      }
    }

    isEmpty(): boolean {
      return this.heap.length === 0;
    }

    size(): number {
      return this.heap.length;
    }
  }

  const dist: Record<TokenKey, number> = {};
  const prev: Record<TokenKey, TokenKey | null> = {};
  const visited = new Set<TokenKey>();
  const hopCount: Record<TokenKey, number> = {}; // Track hops for maxHops limit
  const tradeAmounts: Record<TokenKey, number> = {}; 
  let visitedCount = 0;

  for (const token in graph) {
    dist[token] = Infinity;
    prev[token] = null;
    hopCount[token] = Infinity;
    tradeAmounts[token] = 0;
  }
  dist[source] = 0;
  hopCount[source] = 0;
  tradeAmounts[source] = inputAmount; 

  // Initialize min-heap with source
  const pq = new MinHeap();
  pq.insert(source, 0);

  // Main Dijkstra loop
  while (!pq.isEmpty()) {
    const current = pq.extractMin();
    if (!current) break;

    const { token: u, dist: currentDist } = current;

    // Skip if already visited (stale entry)
    if (visited.has(u)) continue;
    
    // Early termination if target reached
    if (u === target) break;

    // Skip if exceeded max hops
    if (hopCount[u] >= maxHops) continue;

    visited.add(u);
    visitedCount++;

    // Relax all outgoing edges
    for (const edge of graph[u] || []) {
      const v = edge.target;
      
      // Skip if already visited
      if (visited.has(v)) continue;

      const currentAmount = tradeAmounts[u];
      
      // Calculate dynamic weight based on trade size using AMM formulas
      let weight: number;
      let outputAmount: number;
      let effectiveRate: number;

      // BRIDGE EDGES: Different cost model (0.1% fee + time penalty)
      if (edge.kind === 'bridge') {
        const bridgeFee = edge.bridgeFee || 0.001; // 0.1% default
        outputAmount = currentAmount * (1 - bridgeFee);
        effectiveRate = 1 - bridgeFee;
        
        // Weight = fee cost + time penalty + normalized gas
        // Time penalty: 120s bridge delay → ~0.0012 weight
        // Gas normalization: divide by 1e9 to match log scale
        weight = -Math.log(1 - bridgeFee) 
               + (edge.timeDelay || 0) * 0.00001
               + (edge.gas || 0) / 1e9;
      }
      // SWAP EDGES: AMM calculation with liquidity
      else if (edge.liquidity && currentAmount > 0) {
        // Use AMM formula for realistic price impact
        try {
          let result: SwapOutput;
          
          if (edge.liquidity.poolType === 'stable_swap') {
            // Use Curve StableSwap for stablecoin pairs
            result = getOutputAmountStableSwap(
              currentAmount,
              edge.liquidity.reserveBase,
              edge.liquidity.reserveQuote,
              100, // Amplification coefficient
              edge.liquidity.feePercent
            );
          } else if (edge.liquidity.poolType === 'concentrated_liquidity') {
            // Concentrated liquidity with 30% active range
            const activeRangeLiquidity = 0.3;
            const effectiveReserveIn = edge.liquidity.reserveBase * activeRangeLiquidity;
            const effectiveReserveOut = edge.liquidity.reserveQuote * activeRangeLiquidity;
            
            result = getOutputAmountConstantProduct(
              currentAmount,
              effectiveReserveIn,
              effectiveReserveOut,
              edge.liquidity.feePercent
            );
          } else {
            // Default: Constant product (Uniswap V2)
            result = getOutputAmountConstantProduct(
              currentAmount,
              edge.liquidity.reserveBase,
              edge.liquidity.reserveQuote,
              edge.liquidity.feePercent
            );
          }
          
          outputAmount = result.outputAmount;
          effectiveRate = result.effectiveRate;
          
          // Weight = negative log of effective rate + NORMALIZED gas cost
          // Gas normalization: divide by 1e9 (wei → gwei scale adjustment)
          weight = -Math.log(effectiveRate) + (edge.gas || 0) / 1e9;
          
        } catch (error) {
          // If AMM calculation fails (e.g., trade too large), use fallback
          console.warn(`AMM calculation failed for ${u} -> ${v}:`, error);
          outputAmount = currentAmount * (edge.rate || 1);
          weight = edge.rate && edge.rate > 0 
            ? -Math.log(edge.rate) + (edge.gas || 0) / 1e9
            : Number.MAX_VALUE / 2;
        }
      } else {
        // Fallback to static rate if no liquidity data
        outputAmount = currentAmount * (edge.rate || 1);
        weight = edge.rate && edge.rate > 0 
          ? -Math.log(edge.rate) + (edge.gas || 0) / 1e9
          : Number.MAX_VALUE / 2;
      }

      const newDist = currentDist + weight;
      const newHops = hopCount[u] + 1;

      // Relaxation step
      if (newDist < dist[v] && newHops <= maxHops) {
        dist[v] = newDist;
        prev[v] = u;
        hopCount[v] = newHops;
        tradeAmounts[v] = outputAmount; // Store output amount for next hop
        pq.decreaseKey(v, newDist);
      }
    }
  }

  // Check if target is reachable
  if (dist[target] === Infinity) {
    const endTime = performance.now();
    throw new Error(`No route found from ${source} to ${target}`);
  }

  // Build path by backtracking
  const path: TokenKey[] = [];
  const steps: RouteResult['steps'] = [];
  let gasTotal = 0;
  let current: TokenKey | null = target;

  while (current && prev[current]) {
    path.unshift(current);
    const prevToken = prev[current];
    
    if (prevToken && graph[prevToken]) {
      const edge = graph[prevToken].find((e: Edge) => e.target === current);
      if (edge) {
        // Use the same weight calculation logic for consistency
        const prevAmount = tradeAmounts[prevToken] || 0;
        let weight: number;
        
        if (edge.kind === 'bridge') {
          const bridgeFee = edge.bridgeFee || 0.001;
          weight = -Math.log(1 - bridgeFee) 
                 + (edge.timeDelay || 0) * 0.00001
                 + (edge.gas || 0) / 1e9;
        } else if (edge.rate && edge.rate > 0) {
          weight = -Math.log(edge.rate) + (edge.gas || 0) / 1e9;
        } else {
          weight = 0;
        }
        
        // Include trade amounts in step details
        steps.unshift({
          from: prevToken,
          to: current,
          weight,
          kind: edge.kind || 'swap',
          details: {
            ...edge,
            inputAmount: tradeAmounts[prevToken],
            outputAmount: tradeAmounts[current]
          }
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
    pathLength: path.length - 1,
    heapOperations: pq.operations
  };

  // Calculate final output (use accumulated amount at target)
  const finalOutput = tradeAmounts[target] || Math.exp(-dist[target]);

  return {
    route: {
      path,
      totalWeight: dist[target],
      estimatedOutput: finalOutput,
      steps
    },
    metrics
  };
}