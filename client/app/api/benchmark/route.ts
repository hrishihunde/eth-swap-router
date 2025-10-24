"use strict";

import { GraphSimulator } from '@/lib/simulation/GraphSimulator';
import { findBestRoute } from '@/lib/simulation/testRouter';
import { NextRequest } from 'next/server';

export interface BenchmarkConfig {
  numVertices: number;
  edgesPerVertex: number;
  numTests: number;
}

interface BenchmarkResult {
  config: BenchmarkConfig;
  graphStats: {
    vertices: number;
    edges: number;
    avgEdgesPerVertex: number;
    maxEdgesPerVertex: number;
    crossChainEdges: number;
  };
  performance: {
    graphGenerationMs: number;
    avgRouteSearchMs: number;
    maxRouteSearchMs: number;
    minRouteSearchMs: number;
    peakMemoryMb: number;
  };
  routeStats: {
    avgPathLength: number;
    maxPathLength: number;
    minPathLength: number;
    avgCrossChainHops: number;
  };
}

export async function GET(req: NextRequest) {
  try {
    // Default configurations for large-scale testing
    const configs: BenchmarkConfig[] = [
      { numVertices: 100, edgesPerVertex: 10, numTests: 10 },    // 1K edges
      { numVertices: 500, edgesPerVertex: 20, numTests: 10 },    // 10K edges
      { numVertices: 1000, edgesPerVertex: 100, numTests: 5 },   // 100K edges
      { numVertices: 2000, edgesPerVertex: 50, numTests: 5 },    // 100K edges different distribution
      { numVertices: 5000, edgesPerVertex: 20, numTests: 3 },    // 100K edges sparse
    ];

    const results: (BenchmarkResult & { timestamp: string })[] = [];

    for (const config of configs) {
      console.log(`\nRunning benchmark with ${config.numVertices} vertices and ${config.edgesPerVertex} edges per vertex...`);
      
      const genStart = performance.now();
      
      const simulator = new GraphSimulator({
        numVertices: config.numVertices,
        edgesPerVertex: config.edgesPerVertex,
        chains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'],
        priceRange: [0.98, 1.02], // Realistic price impacts
        liquidityRange: [1000, 1000000],
      });

      const genTime = performance.now() - genStart;
      const graph = simulator.getGraph();
      const vertices = simulator.getVertices();
      const stats = simulator.getStats();

      // Run multiple route findings
      const routeTimes: number[] = [];
      const pathLengths: number[] = [];
      const crossChainHops: number[] = [];

      for (let i = 0; i < config.numTests; i++) {
        const sourceIdx = Math.floor(Math.random() * vertices.length);
        let targetIdx = Math.floor(Math.random() * vertices.length);
        while (targetIdx === sourceIdx) {
          targetIdx = Math.floor(Math.random() * vertices.length);
        }

        const source = vertices[sourceIdx].key;
        const target = vertices[targetIdx].key;

        const routeStart = performance.now();
        const route = await findBestRoute(graph, source, target);
        routeTimes.push(performance.now() - routeStart);

        pathLengths.push(route.path.length - 1);
        crossChainHops.push(route.steps.filter(s => s.kind === 'bridge').length);
      }

      const avgRouteTime = routeTimes.reduce((a, b) => a + b, 0) / routeTimes.length;
      const avgPathLength = pathLengths.reduce((a, b) => a + b, 0) / pathLengths.length;
      const avgCrossChainHops = crossChainHops.reduce((a, b) => a + b, 0) / crossChainHops.length;

      const result = {
        config,
        timestamp: new Date().toISOString(),
        graphStats: {
          vertices: stats.numVertices,
          edges: stats.numEdges,
          avgEdgesPerVertex: stats.avgEdgesPerVertex,
          maxEdgesPerVertex: stats.maxEdgesPerVertex,
          crossChainEdges: stats.crossChainEdges,
        },
        performance: {
          graphGenerationMs: genTime,
          avgRouteSearchMs: avgRouteTime,
          maxRouteSearchMs: Math.max(...routeTimes),
          minRouteSearchMs: Math.min(...routeTimes),
          peakMemoryMb: process.memoryUsage().heapUsed / 1024 / 1024,
        },
        routeStats: {
          avgPathLength,
          maxPathLength: Math.max(...pathLengths),
          minPathLength: Math.min(...pathLengths),
          avgCrossChainHops,
        },
      };

      results.push(result);

      console.log('Graph:', {
        vertices: result.graphStats.vertices,
        totalEdges: result.graphStats.edges,
        crossChainRatio: (result.graphStats.crossChainEdges / result.graphStats.edges).toFixed(2),
      });
      
      console.log('Performance:', {
        graphGenMs: Math.round(result.performance.graphGenerationMs),
        avgRouteMs: Math.round(result.performance.avgRouteSearchMs),
        memoryMb: Math.round(result.performance.peakMemoryMb),
      });
    }

    return new Response(JSON.stringify({ results }, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Benchmark failed:', error);
    return new Response(JSON.stringify({ error: 'Benchmark failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}