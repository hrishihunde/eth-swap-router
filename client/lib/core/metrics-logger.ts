import fs from 'fs';
import path from 'path';
import { DijkstraMetrics } from './algorithms/classic-dijkstra';
import { PSBDijkstraMetrics } from './algorithms/psb-dijkstra';

export interface PerformanceMetrics {
  timestamp: string;
  graphStats: {
    nodeCount: number;
    edgeCount: number;
    averageDegree: number;
    sparsityRatio: number;
  };
  classic: DijkstraMetrics;
  psb: PSBDijkstraMetrics;
  improvement: {
    timeReduction: number; // percentage
    visitedNodesReduction: number; // percentage
    gasEfficiency: number; // percentage
  };
}

export class MetricsLogger {
  private readonly metricsPath: string;

  constructor() {
    this.metricsPath = path.join(process.cwd(), 'results', 'performance_metrics');
    this.ensureMetricsDirectory();
  }

  private ensureMetricsDirectory() {
    if (!fs.existsSync(this.metricsPath)) {
      fs.mkdirSync(this.metricsPath, { recursive: true });
    }
  }

  async logMetrics(graph: Record<string, Array<{ target: string }>>, classic: DijkstraMetrics, psb: PSBDijkstraMetrics) {
    const nodeCount = Object.keys(graph).length;
    const edgeCount = Object.values(graph).reduce((sum, edges) => sum + edges.length, 0);
    
    const metrics: PerformanceMetrics = {
      timestamp: new Date().toISOString(),
      graphStats: {
        nodeCount,
        edgeCount,
        averageDegree: edgeCount / nodeCount,
        sparsityRatio: edgeCount / (nodeCount * (nodeCount - 1))
      },
      classic,
      psb,
      improvement: {
        timeReduction: ((classic.executionTimeMs - psb.executionTimeMs) / classic.executionTimeMs) * 100,
        visitedNodesReduction: ((classic.visitedNodes - psb.visitedNodes) / classic.visitedNodes) * 100,
        gasEfficiency: ((classic.gasEstimate - psb.gasEstimate) / classic.gasEstimate) * 100
      }
    };

    const filename = `metrics_${Date.now()}.json`;
    await fs.promises.writeFile(
      path.join(this.metricsPath, filename),
      JSON.stringify(metrics, null, 2)
    );

    console.log('Performance comparison:');
    console.log(`Graph size: ${nodeCount} nodes, ${edgeCount} edges`);
    console.log(`Classic Dijkstra: ${classic.executionTimeMs.toFixed(2)}ms, ${classic.visitedNodes} nodes visited`);
    console.log(`PSB Dijkstra: ${psb.executionTimeMs.toFixed(2)}ms, ${psb.visitedNodes} nodes visited`);
    console.log(`Improvement: ${metrics.improvement.timeReduction.toFixed(1)}% faster`);
  }

  async getAggregateStats(): Promise<{
    averageImprovement: number;
    averageNodesReduction: number;
    averageGasEfficiency: number;
    totalRuns: number;
  }> {
    const files = await fs.promises.readdir(this.metricsPath);
    const metrics = await Promise.all(
      files
        .filter(f => f.startsWith('metrics_'))
        .map(async f => {
          const content = await fs.promises.readFile(
            path.join(this.metricsPath, f),
            'utf8'
          );
          return JSON.parse(content) as PerformanceMetrics;
        })
    );

    return {
      averageImprovement: metrics.reduce((sum, m) => sum + m.improvement.timeReduction, 0) / metrics.length,
      averageNodesReduction: metrics.reduce((sum, m) => sum + m.improvement.visitedNodesReduction, 0) / metrics.length,
      averageGasEfficiency: metrics.reduce((sum, m) => sum + m.improvement.gasEfficiency, 0) / metrics.length,
      totalRuns: metrics.length
    };
  }
}