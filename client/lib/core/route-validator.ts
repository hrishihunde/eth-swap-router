// client/lib/core/route-validator.ts

import { RouteResult, Edge } from './router';
import { 
  hasSufficientLiquidity, 
  getAcceptableSlippage,
  estimateGasCostUSD 
} from './amm-math';

export interface RouteValidationResult {
  isValid: boolean;
  score: number; // 0-100
  failures: ValidationFailure[];
  warnings: ValidationWarning[];
  estimatedSuccessRate: number; // 0-1
  qualityMetrics: RouteQualityMetrics;
}

export interface ValidationFailure {
  step: number;
  severity: 'critical' | 'high' | 'medium';
  reason: 'insufficient_liquidity' | 'excessive_slippage' | 'gas_too_high' | 'pool_unavailable' | 'rate_stale';
  details: string;
  recoverable: boolean;
}

export interface ValidationWarning {
  step: number;
  type: 'low_liquidity' | 'high_gas' | 'long_delay' | 'price_impact';
  message: string;
  impact: 'minor' | 'moderate' | 'significant';
}

export interface RouteQualityMetrics {
  outputEfficiency: number;      // actualOutput / theoreticalBest
  gasEfficiency: number;         // output / gasSpent
  priceImpactScore: number;      // 1 - totalSlippage
  liquidityScore: number;        // Average pool depth score
  diversificationScore: number;  // Uses multiple pools/DEXs
  riskScore: number;            // Bridge count, pool depths (lower is better)
  timeScore: number;            // Execution time score
  overallScore: number;         // Weighted composite (0-100)
}

/**
 * Validate a route for executability
 */
export function validateRoute(
  route: RouteResult,
  inputAmount: number,
  ethPriceUSD: number = 2000,
  options: {
    maxSlippage?: number;
    maxGasUSD?: number;
    maxTimeMs?: number;
  } = {}
): RouteValidationResult {
  const failures: ValidationFailure[] = [];
  const warnings: ValidationWarning[] = [];
  
  const {
    maxSlippage = 0.05,      // 5% default
    maxGasUSD = 100,         // $100 default
    maxTimeMs = 600000       // 10 minutes default
  } = options;

  let currentAmount = inputAmount;
  let totalGasUSD = 0;
  let totalSlippage = 0;
  let totalTimeMs = 0;
  const poolDepths: number[] = [];
  const dexes = new Set<string>();

  // Validate each step
  route.steps.forEach((step, index) => {
    const edge = step.details as Edge;
    
    if (!edge) {
      failures.push({
        step: index,
        severity: 'critical',
        reason: 'pool_unavailable',
        details: 'Missing edge data for route step',
        recoverable: false
      });
      return;
    }

    // Check liquidity
    if (edge.liquidity) {
      const { reserveBase, liquidityUSD } = edge.liquidity;
      
      poolDepths.push(liquidityUSD);
      
      if (!hasSufficientLiquidity(currentAmount, reserveBase, 0.3)) {
        failures.push({
          step: index,
          severity: 'critical',
          reason: 'insufficient_liquidity',
          details: `Pool can only handle ${(reserveBase * 0.3).toFixed(2)} but trade requires ${currentAmount.toFixed(2)}`,
          recoverable: false
        });
      } else if (!hasSufficientLiquidity(currentAmount, reserveBase, 0.1)) {
        warnings.push({
          step: index,
          type: 'low_liquidity',
          message: `Using ${((currentAmount / reserveBase) * 100).toFixed(1)}% of pool reserves`,
          impact: 'moderate'
        });
      }

      // Track DEX diversity
      if (edge.dex) {
        dexes.add(edge.dex);
      }
    }

    // Check slippage
    if (edge.rate && edge.rate > 0) {
      // Estimate price impact (simplified)
      const expectedOutput = currentAmount * edge.rate;
      const priceImpact = edge.liquidity 
        ? Math.min(0.1, (currentAmount / edge.liquidity.reserveBase) ** 0.5 * 0.1)
        : 0.001; // Assume 0.1% if no liquidity data
      
      totalSlippage += priceImpact;
      
      if (priceImpact > maxSlippage) {
        failures.push({
          step: index,
          severity: 'high',
          reason: 'excessive_slippage',
          details: `Price impact ${(priceImpact * 100).toFixed(2)}% exceeds max ${(maxSlippage * 100).toFixed(2)}%`,
          recoverable: true
        });
      } else if (priceImpact > maxSlippage * 0.5) {
        warnings.push({
          step: index,
          type: 'price_impact',
          message: `Significant price impact: ${(priceImpact * 100).toFixed(2)}%`,
          impact: 'significant'
        });
      }

      currentAmount = expectedOutput * (1 - priceImpact);
    }

    // Check gas costs
    if (edge.gas) {
      const gasUSD = edge.gas * ethPriceUSD;
      totalGasUSD += gasUSD;
      
      if (gasUSD > maxGasUSD) {
        failures.push({
          step: index,
          severity: 'medium',
          reason: 'gas_too_high',
          details: `Gas cost $${gasUSD.toFixed(2)} exceeds max $${maxGasUSD.toFixed(2)}`,
          recoverable: true
        });
      } else if (gasUSD > maxGasUSD * 0.5) {
        warnings.push({
          step: index,
          type: 'high_gas',
          message: `High gas cost: $${gasUSD.toFixed(2)}`,
          impact: 'moderate'
        });
      }
    }

    // Check execution time
    if (edge.estimatedTimeMs) {
      totalTimeMs += edge.estimatedTimeMs;
    } else if (edge.kind === 'bridge') {
      totalTimeMs += 300000; // 5 min default bridge time
    } else {
      totalTimeMs += 30000; // 30 sec default swap time
    }
  });

  // Check total time
  if (totalTimeMs > maxTimeMs) {
    warnings.push({
      step: -1,
      type: 'long_delay',
      message: `Total execution time ${(totalTimeMs / 60000).toFixed(1)} min exceeds ${(maxTimeMs / 60000).toFixed(1)} min`,
      impact: 'significant'
    });
  }

  // Calculate quality metrics
  const qualityMetrics = calculateQualityMetrics({
    route,
    inputAmount,
    finalOutput: currentAmount,
    totalGasUSD,
    totalSlippage,
    poolDepths,
    dexCount: dexes.size,
    totalTimeMs
  });

  // Calculate success rate
  const criticalFailures = failures.filter(f => f.severity === 'critical').length;
  const estimatedSuccessRate = criticalFailures > 0 
    ? 0 
    : Math.max(0, 1 - (failures.length * 0.2 + warnings.length * 0.05));

  const isValid = failures.filter(f => f.severity === 'critical').length === 0;

  return {
    isValid,
    score: qualityMetrics.overallScore,
    failures,
    warnings,
    estimatedSuccessRate,
    qualityMetrics
  };
}

/**
 * Calculate comprehensive quality metrics for a route
 */
export function calculateQualityMetrics(params: {
  route: RouteResult;
  inputAmount: number;
  finalOutput: number;
  totalGasUSD: number;
  totalSlippage: number;
  poolDepths: number[];
  dexCount: number;
  totalTimeMs: number;
}): RouteQualityMetrics {
  const {
    route,
    inputAmount,
    finalOutput,
    totalGasUSD,
    totalSlippage,
    poolDepths,
    dexCount,
    totalTimeMs
  } = params;

  // Output efficiency (actual vs theoretical)
  const theoreticalOutput = route.estimatedOutput;
  const outputEfficiency = theoreticalOutput > 0 
    ? Math.min(1, finalOutput / theoreticalOutput)
    : 0;

  // Gas efficiency (output value per dollar spent on gas)
  const gasEfficiency = totalGasUSD > 0 
    ? Math.min(100, finalOutput / totalGasUSD)
    : 100;

  // Price impact score (1 = no slippage, 0 = 100% slippage)
  const priceImpactScore = Math.max(0, 1 - totalSlippage);

  // Liquidity score (based on average pool depth)
  const avgPoolDepth = poolDepths.length > 0
    ? poolDepths.reduce((a, b) => a + b, 0) / poolDepths.length
    : 0;
  const liquidityScore = Math.min(1, Math.log10(avgPoolDepth + 1) / 6); // Log scale, max at $1M

  // Diversification score (using multiple DEXs is better)
  const diversificationScore = Math.min(1, dexCount / 3); // Max score at 3+ DEXs

  // Risk score (bridges and low liquidity increase risk)
  const bridgeCount = route.steps.filter(s => (s.details as Edge)?.kind === 'bridge').length;
  const riskScore = Math.max(0, 1 - (bridgeCount * 0.2 + (1 - liquidityScore) * 0.3));

  // Time score (faster is better)
  const timeScore = Math.max(0, 1 - (totalTimeMs / 600000)); // Normalize to 10 min max

  // Overall score (weighted average)
  const weights = {
    outputEfficiency: 0.35,
    gasEfficiency: 0.15,
    priceImpactScore: 0.25,
    liquidityScore: 0.10,
    diversificationScore: 0.05,
    riskScore: 0.05,
    timeScore: 0.05
  };

  const overallScore = (
    outputEfficiency * weights.outputEfficiency +
    (gasEfficiency / 100) * weights.gasEfficiency +
    priceImpactScore * weights.priceImpactScore +
    liquidityScore * weights.liquidityScore +
    diversificationScore * weights.diversificationScore +
    riskScore * weights.riskScore +
    timeScore * weights.timeScore
  ) * 100;

  return {
    outputEfficiency,
    gasEfficiency,
    priceImpactScore,
    liquidityScore,
    diversificationScore,
    riskScore,
    timeScore,
    overallScore: Math.round(overallScore * 10) / 10 // Round to 1 decimal
  };
}

/**
 * Compare two routes and determine winner
 */
export function compareRoutes(
  route1: RouteValidationResult,
  route2: RouteValidationResult
): {
  winner: 'route1' | 'route2' | 'tie';
  scoreDifference: number;
  reason: string;
} {
  const diff = route1.qualityMetrics.overallScore - route2.qualityMetrics.overallScore;
  
  // Within 2 points is considered a tie
  if (Math.abs(diff) < 2) {
    return {
      winner: 'tie',
      scoreDifference: diff,
      reason: 'Routes have similar quality scores'
    };
  }
  
  if (diff > 0) {
    return {
      winner: 'route1',
      scoreDifference: diff,
      reason: `Route 1 scores ${diff.toFixed(1)} points higher (${route1.qualityMetrics.overallScore} vs ${route2.qualityMetrics.overallScore})`
    };
  }
  
  return {
    winner: 'route2',
    scoreDifference: Math.abs(diff),
    reason: `Route 2 scores ${Math.abs(diff).toFixed(1)} points higher (${route2.qualityMetrics.overallScore} vs ${route1.qualityMetrics.overallScore})`
  };
}

/**
 * Get human-readable validation summary
 */
export function getValidationSummary(result: RouteValidationResult): string {
  if (!result.isValid) {
    return `❌ Route is not executable: ${result.failures[0]?.details || 'Unknown error'}`;
  }
  
  if (result.failures.length > 0) {
    return `⚠️ Route has ${result.failures.length} issue(s) but may be executable`;
  }
  
  if (result.warnings.length > 0) {
    return `✓ Route is valid with ${result.warnings.length} warning(s)`;
  }
  
  return `✅ Route is fully validated (Score: ${result.qualityMetrics.overallScore}/100)`;
}
