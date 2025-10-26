'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AlgorithmResult {
  route: string[];
  estimatedOutput: number;
  steps: RouteStep[];
  metrics: {
    executionTimeMs: number;
    gasEstimate: number;
    visitedNodes: number;
    pathLength: number;
    heapOperations?: number;
  };
  validation: {
    isValid: boolean;
    warnings: Array<{ type: string; message: string; impact: string }>;
    qualityMetrics: {
      overallScore: number;
      outputEfficiency: number;
      priceImpactScore: number;
      gasEfficiency: number;
      liquidityScore: number;
      riskScore: number;
      diversificationScore: number;
      timeScore: number;
    };
  };
}

interface RouteStep {
  from: string;
  to: string;
  kind: 'swap' | 'bridge';
  weight: number;
  details?: {
    inputAmount?: number;
    outputAmount?: number;
    rate?: number;
    gas?: number;
    dex?: string;
    bridge?: string;
    liquidity?: {
      liquidityUSD: number;
      reserveBase: number;
      reserveQuote: number;
      feePercent: number;
    };
  };
}

interface RouteComparisonProps {
  data: {
    comparison: {
      classic: AlgorithmResult;
      psb: AlgorithmResult;
      winner: 'classic' | 'psb' | 'tie';
      speedup: number;
      scoreDifference: number;
    };
  };
}

export function RouteComparison({ data }: RouteComparisonProps) {
  const { classic, psb, winner, speedup, scoreDifference } = data.comparison;

  const calculatePriceImpact = (step: RouteStep): number => {
    if (!step.details?.inputAmount || !step.details?.outputAmount || !step.details?.rate) {
      return 0;
    }
    const { inputAmount, outputAmount, rate } = step.details;
    const expectedOutput = inputAmount * rate;
    const impact = ((expectedOutput - outputAmount) / expectedOutput) * 100;
    return Math.abs(impact);
  };

  const renderAlgorithmResult = (
    result: AlgorithmResult,
    algorithmName: string,
    isWinner: boolean
  ) => (
    <Card className={`p-5 ${isWinner ? 'ring-2 ring-green-500' : 'ring-1 ring-border'}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h4 className="text-lg font-bold">{algorithmName}</h4>
          {isWinner && (
            <Badge className="bg-green-500 hover:bg-green-600">
              Winner 🏆
            </Badge>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm bg-muted/30 p-3 rounded-lg">
          <div>
            <div className="text-muted-foreground text-xs mb-1">Output</div>
            <div className="font-mono font-semibold">
              {result.estimatedOutput.toFixed(6)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs mb-1">Time</div>
            <div className="font-mono font-semibold">
              {result.metrics.executionTimeMs.toFixed(2)}ms
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs mb-1">Quality</div>
            <div className="font-mono font-semibold">
              {result.validation.qualityMetrics.overallScore.toFixed(0)}/100
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs mb-1">Gas</div>
            <div className="font-mono font-semibold">
              ${(result.metrics.gasEstimate * 2000).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs mb-1">Nodes</div>
            <div className="font-mono font-semibold">
              {result.metrics.visitedNodes.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs mb-1">Hops</div>
            <div className="font-mono font-semibold">
              {result.metrics.pathLength}
            </div>
          </div>
        </div>

        {/* Route Path */}
        <div>
          <h5 className="text-sm font-semibold mb-2 text-muted-foreground">Route Path:</h5>
          <div className="flex flex-wrap items-center gap-2">
            {result.route.map((token, i) => (
              <div key={i} className="flex items-center">
                {i > 0 && (
                  <span className="text-muted-foreground mx-1">→</span>
                )}
                <Badge variant="secondary" className="font-mono text-xs">
                  {token}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Step-by-Step Breakdown */}
        <div>
          <h5 className="text-sm font-semibold mb-2 text-muted-foreground">
            Step-by-Step Breakdown:
          </h5>
          <div className="space-y-2">
            {result.steps.map((step, i) => (
              <Card key={i} className="p-3 bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-sm flex items-center gap-2">
                    <span className="text-muted-foreground">Step {i + 1}:</span>
                    <span>{step.from} → {step.to}</span>
                  </div>
                  <Badge 
                    variant={step.kind === 'swap' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {step.kind}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {step.details?.inputAmount !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Input:</span>
                      <span className="font-mono ml-1">
                        {step.details.inputAmount.toFixed(6)}
                      </span>
                    </div>
                  )}
                  {step.details?.outputAmount !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Output:</span>
                      <span className="font-mono ml-1">
                        {step.details.outputAmount.toFixed(6)}
                      </span>
                    </div>
                  )}
                  {step.details?.rate && (
                    <div>
                      <span className="text-muted-foreground">Rate:</span>
                      <span className="font-mono ml-1">
                        {step.details.rate.toFixed(4)}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Impact:</span>
                    <span className="font-mono ml-1">
                      {calculatePriceImpact(step).toFixed(3)}%
                    </span>
                  </div>
                  {step.details?.dex && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">DEX:</span>
                      <span className="ml-1">{step.details.dex}</span>
                    </div>
                  )}
                  {step.details?.bridge && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Bridge:</span>
                      <span className="ml-1">{step.details.bridge}</span>
                    </div>
                  )}
                  {step.details?.liquidity && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Pool TVL:</span>
                      <span className="font-mono ml-1">
                        ${step.details.liquidity.liquidityUSD.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Warnings */}
        {result.validation.warnings.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <h5 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2 flex items-center gap-1">
              <span>⚠️</span> Warnings
            </h5>
            <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
              {result.validation.warnings.map((w, i) => (
                <li key={i}>
                  <span className="font-semibold">[{w.type}]</span> {w.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Validation Status */}
        {!result.validation.isValid && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="text-sm font-semibold text-red-800 dark:text-red-200 flex items-center gap-1">
              <span>❌</span> Route validation failed
            </div>
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <div className="space-y-4 mt-6">
      {/* Winner Banner */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-500 rounded-lg p-4 text-center">
        <h3 className="text-xl font-bold text-green-800 dark:text-green-200">
          🏆 {winner === 'classic' ? 'Classic Dijkstra' : winner === 'psb' ? 'PSB-Dijkstra' : 'Tie'}
          {winner !== 'tie' && ' is better'}
        </h3>
        <div className="text-green-700 dark:text-green-300 mt-1 space-x-4">
          {speedup !== 1 && (
            <span>{speedup.toFixed(2)}x faster execution</span>
          )}
          {scoreDifference > 0 && (
            <span>•</span>
          )}
          {scoreDifference > 0 && (
            <span>{scoreDifference.toFixed(1)} points higher quality</span>
          )}
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderAlgorithmResult(classic, 'Classic Dijkstra', winner === 'classic')}
        {renderAlgorithmResult(psb, 'PSB-Dijkstra', winner === 'psb')}
      </div>

      {/* Quality Metrics Comparison */}
      <Card className="p-5">
        <h4 className="text-lg font-bold mb-4">Quality Metrics Comparison</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground text-xs mb-1">Output Efficiency</div>
            <div className="space-y-0.5">
              <div className="font-mono text-xs">
                Classic: {(classic.validation.qualityMetrics.outputEfficiency * 100).toFixed(1)}%
              </div>
              <div className="font-mono text-xs">
                PSB: {(psb.validation.qualityMetrics.outputEfficiency * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs mb-1">Price Impact</div>
            <div className="space-y-0.5">
              <div className="font-mono text-xs">
                Classic: {(classic.validation.qualityMetrics.priceImpactScore * 100).toFixed(1)}%
              </div>
              <div className="font-mono text-xs">
                PSB: {(psb.validation.qualityMetrics.priceImpactScore * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs mb-1">Gas Efficiency</div>
            <div className="space-y-0.5">
              <div className="font-mono text-xs">
                Classic: {classic.validation.qualityMetrics.gasEfficiency.toFixed(1)}
              </div>
              <div className="font-mono text-xs">
                PSB: {psb.validation.qualityMetrics.gasEfficiency.toFixed(1)}
              </div>
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs mb-1">Overall Score</div>
            <div className="space-y-0.5">
              <div className="font-mono text-xs font-semibold">
                Classic: {classic.validation.qualityMetrics.overallScore.toFixed(0)}/100
              </div>
              <div className="font-mono text-xs font-semibold">
                PSB: {psb.validation.qualityMetrics.overallScore.toFixed(0)}/100
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
