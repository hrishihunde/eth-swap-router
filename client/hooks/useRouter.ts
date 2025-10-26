"use client";

import { useState, useEffect } from 'react';
import { RouteGraph } from '@/lib/core/router';
import { classicDijkstra } from '@/lib/core/algorithms/classic-dijkstra';
import { psbDijkstra } from '@/lib/core/algorithms/psb-dijkstra';
import { RouteComparisonService, RouteComparison } from '@/lib/core/route-comparison';

interface Token {
  token: string;
  chain: string;
  symbol: string;
  name: string;
  decimals: number;
}

interface RouteParams {
  from: Token;
  to: Token;
  amount: number;
}

export function useRouter() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<RouteComparison | null>(null);
  const [benchmarkGraph, setBenchmarkGraph] = useState<RouteGraph | null>(null);
  const [benchmarkLoaded, setBenchmarkLoaded] = useState(false);

  const comparisonService = new RouteComparisonService();

  // Load benchmark data on mount
  useEffect(() => {
    async function loadBenchmark() {
      try {
        const response = await fetch('/api/benchmark/data');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setBenchmarkGraph(data.graph);
            setBenchmarkLoaded(true);
            console.log('Benchmark data loaded:', data.stats);
          }
        }
      } catch (err) {
        console.error('Failed to load benchmark:', err);
      }
    }
    
    loadBenchmark();
  }, []);

  const computeRoute = async ({ from, to, amount }: RouteParams) => {
    setLoading(true);
    setError(null);

    try {
      const sourceKey = `${from.token}.${from.chain}`;
      const targetKey = `${to.token}.${to.chain}`;

      // Use pre-loaded benchmark graph if available, otherwise build minimal graph
      let graph = benchmarkGraph;
      
      if (!graph) {
        console.warn('Benchmark not loaded, using minimal graph');
        // Fallback: create a simple direct edge for testing
        graph = {
          [sourceKey]: [{
            target: targetKey,
            kind: 'swap',
            rate: 1.0,
            gas: 0.0003,
            dex: 'DirectSwap',
          }],
          [targetKey]: [],
        };
      }

      // Run both algorithms on the benchmark graph
      const classicResult = classicDijkstra(graph, sourceKey, targetKey, amount, 4);
      const psbResult = psbDijkstra(graph, sourceKey, targetKey, amount, 4);

      // Create comparison
      const comparison: RouteComparison = {
        timestamp: new Date().toISOString(),
        sourceToken: from.token,
        targetToken: to.token,
        amount: amount.toString(),
        classic: classicResult,
        psb: psbResult
      };

      // Save comparison
      await comparisonService.saveComparison(comparison);

      setRoute(comparison);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compute route');
      setRoute(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    route,
    loading,
    error,
    benchmarkLoaded,
    computeRoute
  };
}
