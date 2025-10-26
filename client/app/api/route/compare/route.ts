// /client/app/api/route/compare/route.ts
import { NextRequest, NextResponse } from "next/server";
import { buildRouteGraph, Vertex } from "@/lib/core/router";
import { getAllTokens } from "@/lib/core/token-config";
import { classicDijkstra } from "@/lib/core/algorithms/classic-dijkstra";
import { psbDijkstra } from "@/lib/core/algorithms/psb-dijkstra";
import { validateRoute } from "@/lib/core/route-validator";

// Get supported assets from real token configuration
function getSupportedVertices(): Vertex[] {
  const allTokens = getAllTokens();
  
  return allTokens.map(token => ({
    key: token.key,
    symbol: token.symbol,
    chain: token.network,
    address: token.address,
    decimals: token.decimals,
    priceUSD: 0, // Will be fetched dynamically if needed
  }));
}

/**
 * Algorithm Comparison API
 * Runs both Classic Dijkstra and PSB-Dijkstra side-by-side
 * Returns detailed metrics for both algorithms
 */
export async function POST(req: NextRequest) {
  try {
    const { source, target, amount, hops, ethPriceUSD } = await req.json();
    
    if (!source || !target) {
      return NextResponse.json({ 
        error: "Missing source or target token" 
      }, { status: 400 });
    }

    // Default amount to 1.0 if not provided
    const inputAmount = amount !== undefined && amount !== null ? Number(amount) : 1.0;
    const maxHops = hops || 4;
    const ethPrice = ethPriceUSD || 2000; // Default ETH price for gas calculations

    // Build graph dynamically from supported tokens
    const supportedVertices = getSupportedVertices();
    const graph = await buildRouteGraph(supportedVertices, maxHops);

    // Run both algorithms
    const classicResult = classicDijkstra(graph, source, target, inputAmount, maxHops);
    const psbResult = psbDijkstra(graph, source, target, inputAmount, maxHops);

    // Debug logging for route steps
    console.log('\n=== ROUTE COMPARISON DEBUG ===');
    console.log(`Source: ${source} → Target: ${target}, Amount: ${inputAmount}`);
    console.log('\nClassic Dijkstra Route:');
    console.log('Path:', classicResult.route.path.join(' → '));
    console.log('Steps:', JSON.stringify(classicResult.route.steps.map(s => ({
      from: s.from,
      to: s.to,
      input: s.details.inputAmount,
      output: s.details.outputAmount,
      rate: s.details.rate,
      liquidity: s.details.liquidity ? {
        poolType: s.details.liquidity.poolType,
        reserveBase: s.details.liquidity.reserveBase,
        reserveQuote: s.details.liquidity.reserveQuote,
        feePercent: s.details.liquidity.feePercent,
        liquidityUSD: s.details.liquidity.liquidityUSD
      } : null,
      dex: s.details.dex,
      poolAddress: s.details.poolAddress
    })), null, 2));
    
    console.log('\nPSB-Dijkstra Route:');
    console.log('Path:', psbResult.route.path.join(' → '));
    console.log('Steps:', JSON.stringify(psbResult.route.steps.map(s => ({
      from: s.from,
      to: s.to,
      input: s.details.inputAmount,
      output: s.details.outputAmount,
      rate: s.details.rate,
      liquidity: s.details.liquidity ? {
        poolType: s.details.liquidity.poolType,
        reserveBase: s.details.liquidity.reserveBase,
        reserveQuote: s.details.liquidity.reserveQuote,
        feePercent: s.details.liquidity.feePercent,
        liquidityUSD: s.details.liquidity.liquidityUSD
      } : null,
      dex: s.details.dex,
      poolAddress: s.details.poolAddress
    })), null, 2));
    console.log('=== END DEBUG ===\n');

    // Validate both routes
    const classicValidation = validateRoute(
      classicResult.route,
      inputAmount,
      ethPrice,
      {
        maxSlippage: 0.05,
        maxGasUSD: 100,
        maxTimeMs: 600000
      }
    );
    const psbValidation = validateRoute(
      psbResult.route,
      inputAmount,
      ethPrice,
      {
        maxSlippage: 0.05,
        maxGasUSD: 100,
        maxTimeMs: 600000
      }
    );

    // Determine winner based on quality scores (already calculated in validation)
    const classicScore = classicValidation.qualityMetrics.overallScore;
    const psbScore = psbValidation.qualityMetrics.overallScore;
    
    const winner = classicScore > psbScore 
      ? 'classic' 
      : psbScore > classicScore 
        ? 'psb' 
        : 'tie';

    return NextResponse.json({
      success: true,
      inputAmount,
      maxHops,
      comparison: {
        classic: {
          route: classicResult.route.path,
          estimatedOutput: classicResult.route.estimatedOutput,
          steps: classicResult.route.steps,
          metrics: classicResult.metrics,
          validation: classicValidation,
        },
        psb: {
          route: psbResult.route.path,
          estimatedOutput: psbResult.route.estimatedOutput,
          steps: psbResult.route.steps,
          metrics: psbResult.metrics,
          validation: psbValidation,
        },
        winner,
        scoreDifference: Math.abs(classicScore - psbScore),
        speedup: classicResult.metrics.executionTimeMs / psbResult.metrics.executionTimeMs,
      },
    });
  } catch (err: any) {
    console.error("Route comparison API error:", err);
    return NextResponse.json({ 
      error: err.message || "Comparison failed" 
    }, { status: 500 });
  }
}
