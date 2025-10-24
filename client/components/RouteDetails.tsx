import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { RouteComparison } from '../lib/core/route-comparison';

interface RouteDetailsProps {
  comparison: RouteComparison;
}

export default function RouteDetails({ comparison }: RouteDetailsProps) {
  const timestamp = new Date(comparison.timestamp).toLocaleString();
  const { classic, psb } = comparison;

  const improvement = {
    time: ((classic.metrics.executionTimeMs - psb.metrics.executionTimeMs) / classic.metrics.executionTimeMs * 100).toFixed(1),
    nodes: ((classic.metrics.visitedNodes - psb.metrics.visitedNodes) / classic.metrics.visitedNodes * 100).toFixed(1),
    gas: ((classic.metrics.gasEstimate - psb.metrics.gasEstimate) / classic.metrics.gasEstimate * 100).toFixed(1)
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Route Comparison</h3>
        <Badge variant="outline">{timestamp}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="font-medium">Classic Dijkstra</h4>
          <div className="text-sm text-muted-foreground">
            <p>Time: {classic.metrics.executionTimeMs.toFixed(2)}ms</p>
            <p>Nodes visited: {classic.metrics.visitedNodes}</p>
            <p>Gas estimate: {classic.metrics.gasEstimate.toFixed(6)} ETH</p>
            <p>Path length: {classic.metrics.pathLength}</p>
            <p>Output: {classic.route.estimatedOutput.toFixed(6)}</p>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">PSB Dijkstra</h4>
          <div className="text-sm text-muted-foreground">
            <p>Time: {psb.metrics.executionTimeMs.toFixed(2)}ms</p>
            <p>Nodes visited: {psb.metrics.visitedNodes}</p>
            <p>Gas estimate: {psb.metrics.gasEstimate.toFixed(6)} ETH</p>
            <p>Path length: {psb.metrics.pathLength}</p>
            <p>Barriers: {psb.metrics.barrierCount}</p>
            <p>Output: {psb.route.estimatedOutput.toFixed(6)}</p>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t">
        <h4 className="font-medium mb-2">Improvements with PSB</h4>
        <div className="text-sm text-muted-foreground">
          <p>⚡ {improvement.time}% faster execution</p>
          <p>🎯 {improvement.nodes}% fewer nodes visited</p>
          <p>💰 {improvement.gas}% gas savings</p>
        </div>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        Results saved to /results/route_comparison_{comparison.timestamp.replace(/[:.]/g, '_')}.json
      </div>
    </Card>
  );
}