import { RouteResult } from './router';
import { DijkstraMetrics } from './algorithms/classic-dijkstra';
import { PSBDijkstraMetrics } from './algorithms/psb-dijkstra';

export interface RouteComparison {
  timestamp: string;
  sourceToken: string;
  targetToken: string;
  amount: string;
  classic: {
    route: RouteResult;
    metrics: DijkstraMetrics;
  };
  psb: {
    route: RouteResult;
    metrics: PSBDijkstraMetrics;
  };
}

export class RouteComparisonService {
  private readonly storageKey = 'swaply_route_comparisons';

  constructor() {
    // Initialize storage if needed
    if (typeof window !== 'undefined' && !localStorage.getItem(this.storageKey)) {
      localStorage.setItem(this.storageKey, JSON.stringify([]));
    }
  }

  async saveComparison(comparison: RouteComparison): Promise<string> {
    const id = `route_comparison_${Date.now()}`;
    
    if (typeof window !== 'undefined') {
      // Save to localStorage
      const comparisons = this.getStoredComparisons();
      comparisons.push({ id, ...comparison });
      
      // Keep only last 50 comparisons to manage storage size
      while (comparisons.length > 50) {
        comparisons.shift();
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(comparisons));

      // Save to filesystem via API
      try {
        const response = await fetch('/api/save-comparison', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(comparison),
        });

        if (!response.ok) {
          console.warn('Failed to save comparison to filesystem');
        }
      } catch (error) {
        console.warn('Error saving comparison to filesystem:', error);
      }
    }

    return id;
  }

  getComparison(id: string): RouteComparison | null {
    if (typeof window === 'undefined') return null;
    
    const comparisons = this.getStoredComparisons();
    const found = comparisons.find(c => c.id === id);
    return found ? this.removeId(found) : null;
  }

  listComparisons(): { id: string; timestamp: string }[] {
    if (typeof window === 'undefined') return [];
    
    return this.getStoredComparisons().map(c => ({
      id: c.id,
      timestamp: c.timestamp
    }));
  }

  downloadComparisons() {
    if (typeof window === 'undefined') return;

    const data = this.exportComparisons();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `swaply_route_comparisons_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private getStoredComparisons(): (RouteComparison & { id: string })[] {
    if (typeof window === 'undefined') return [];
    
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  private removeId(comparison: RouteComparison & { id: string }): RouteComparison {
    const { id, ...rest } = comparison;
    return rest;
  }

  private exportComparisons(): string {
    if (typeof window === 'undefined') return '[]';
    
    const comparisons = this.getStoredComparisons();
    return JSON.stringify(comparisons, null, 2);
  }

  static formatMetrics(classic: DijkstraMetrics, psb: PSBDijkstraMetrics) {
    return {
      executionTime: {
        classic: `${classic.executionTimeMs.toFixed(2)}ms`,
        psb: `${psb.executionTimeMs.toFixed(2)}ms`,
        improvement: `${(100 * (classic.executionTimeMs - psb.executionTimeMs) / classic.executionTimeMs).toFixed(1)}%`
      },
      gasEstimate: {
        classic: `${classic.gasEstimate.toFixed(6)} ETH`,
        psb: `${psb.gasEstimate.toFixed(6)} ETH`,
        difference: `${(psb.gasEstimate - classic.gasEstimate).toFixed(6)} ETH`
      },
      efficiency: {
        classicNodesVisited: classic.visitedNodes,
        psbNodesVisited: psb.visitedNodes,
        nodeReduction: `${(100 * (classic.visitedNodes - psb.visitedNodes) / classic.visitedNodes).toFixed(1)}%`
      },
      pathDetails: {
        classicLength: classic.pathLength,
        psbLength: psb.pathLength,
        psbBarriers: psb.barrierCount
      }
    };
  }
}