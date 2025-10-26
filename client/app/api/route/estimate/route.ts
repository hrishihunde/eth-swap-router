// client/app/api/route/estimate/route.ts
/**
 * Fast Route Estimation API
 * Uses only the winning algorithm (PSB-Dijkstra by default)
 * Returns route in <2 seconds for production use
 * Saves results to JSON files in /results directory
 */
import { NextRequest, NextResponse } from 'next/server';
import { buildRouteGraph, Vertex } from '@/lib/core/router';
import { getAllTokens } from '@/lib/core/token-config';
import { psbDijkstra } from '@/lib/core/algorithms/psb-dijkstra';
import { classicDijkstra } from '@/lib/core/algorithms/classic-dijkstra';
import { validateRoute } from '@/lib/core/route-validator';
import * as fs from 'fs';
import * as path from 'path';

// Cache for built graph (rebuilds every 5 minutes)
let cachedGraph: any = null;
let cachedVertices: Vertex[] = [];
let lastGraphBuild = 0;
const GRAPH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Route cache (stores recent route calculations)
const routeCache = new Map<string, { result: any; timestamp: number }>();
const ROUTE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get supported assets from real token configuration
function getSupportedVertices(): Vertex[] {
  const allTokens = getAllTokens();
  
  return allTokens.map(token => ({
    key: token.key,
    symbol: token.symbol,
    chain: token.network,
    address: token.address,
    decimals: token.decimals,
    priceUSD: 0,
  }));
}

async function getOrBuildGraph(): Promise<{ graph: any; vertices: Vertex[] }> {
  const now = Date.now();
  
  if (cachedGraph && (now - lastGraphBuild) < GRAPH_CACHE_TTL) {
    console.log('✅ Using cached graph');
    return { graph: cachedGraph, vertices: cachedVertices };
  }
  
  console.log('🔄 Rebuilding graph...');
  cachedVertices = getSupportedVertices();
  cachedGraph = await buildRouteGraph(cachedVertices, 4);
  lastGraphBuild = now;
  
  return { graph: cachedGraph, vertices: cachedVertices };
}

function saveRouteToFile(routeData: any): string {
  const resultsDir = path.join(process.cwd(), 'results');
  
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `route-${timestamp}.json`;
  const filepath = path.join(resultsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(routeData, null, 2));
  
  console.log(`✅ Route saved to: ${filepath}`);
  return filepath;
}

/**
 * Fast Route Estimation Endpoint
 * POST /api/route/estimate
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { source, target, amount, algorithm } = await request.json();
    
    if (!source || !target) {
      return NextResponse.json({ 
        error: "Missing source or target token" 
      }, { status: 400 });
    }

    const inputAmount = amount !== undefined && amount !== null ? Number(amount) : 1.0;
    const ethPrice = 2000; // Default ETH price for gas calculations
    const maxHops = 4;

    // Check route cache
    const cacheKey = `${source}-${target}-${inputAmount}`;
    const cached = routeCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < ROUTE_CACHE_TTL) {
      console.log(`⚡ Returning cached route for ${cacheKey}`);
      return NextResponse.json({
        ...cached.result,
        fromCache: true,
        cacheAge: Math.floor((Date.now() - cached.timestamp) / 1000)
      });
    }

    // Get or build graph
    const { graph, vertices } = await getOrBuildGraph();
    
    // Check if source and target exist in graph
    if (!graph[source]) {
      return NextResponse.json({ 
        error: `Source token "${source}" not found in graph. Available tokens: ${Object.keys(graph).slice(0, 10).join(', ')}...` 
      }, { status: 404 });
    }
    
    if (!graph[target]) {
      return NextResponse.json({ 
        error: `Target token "${target}" not found in graph. Available tokens: ${Object.keys(graph).slice(0, 10).join(', ')}...` 
      }, { status: 404 });
    }

    // Use specified algorithm or PSB-Dijkstra by default
    const useAlgorithm = algorithm === 'classic' ? 'classic' : 'psb';
    
    console.log(`\n🚀 Finding route: ${source} → ${target} (amount: ${inputAmount}, algorithm: ${useAlgorithm})`);
    
    let result;
    try {
      if (useAlgorithm === 'classic') {
        result = classicDijkstra(graph, source, target, inputAmount, maxHops);
      } else {
        // Try PSB first, fallback to classic if it fails
        try {
          result = psbDijkstra(graph, source, target, inputAmount, maxHops);
        } catch (psbError) {
          console.warn('⚠️ PSB-Dijkstra failed, falling back to Classic:', psbError);
          result = classicDijkstra(graph, source, target, inputAmount, maxHops);
        }
      }
    } catch (algoError) {
      const errorMsg = algoError instanceof Error ? algoError.message : 'Unknown error';
      console.error('❌ Route finding failed:', errorMsg);
      
      return NextResponse.json({ 
        error: `No route found: ${errorMsg}`,
        suggestion: `Try using a bridgeable token like USDC or WETH. Tokens must be on connected networks.`
      }, { status: 404 });
    }

    // Validate route
    const validation = validateRoute(
      result.route,
      inputAmount,
      ethPrice,
      {
        maxSlippage: 0.05,
        maxGasUSD: 100,
        maxTimeMs: 600000
      }
    );

    const executionTime = Date.now() - startTime;

    const response = {
      success: true,
      algorithm: useAlgorithm,
      executionTimeMs: executionTime,
      inputAmount,
      route: {
        path: result.route.path,
        estimatedOutput: result.route.estimatedOutput,
        steps: result.route.steps,
      },
      metrics: result.metrics,
      validation,
      fromCache: false
    };

    // Cache the result
    routeCache.set(cacheKey, { result: response, timestamp: Date.now() });

    // Save to JSON file
    const savedPath = saveRouteToFile({
      timestamp: new Date().toISOString(),
      request: { source, target, amount: inputAmount, algorithm: useAlgorithm },
      ...response
    });

    return NextResponse.json({
      ...response,
      savedTo: savedPath.replace(process.cwd(), '')
    });

  } catch (err: any) {
    console.error("❌ Route estimation API error:", err);
    return NextResponse.json({ 
      error: err.message || "Route estimation failed",
      executionTimeMs: Date.now() - startTime
    }, { status: 500 });
  }
}

/**
 * GET endpoint for graph statistics
 */
export async function GET(req: NextRequest) {
  try {
    const { graph, vertices } = await getOrBuildGraph();
    
    const swapEdges = Object.values(graph).flat().filter((e: any) => e.kind === 'swap').length;
    const bridgeEdges = Object.values(graph).flat().filter((e: any) => e.kind === 'bridge').length;
    
    return NextResponse.json({
      nodes: Object.keys(graph).length,
      vertices: vertices.length,
      swapEdges,
      bridgeEdges,
      totalEdges: swapEdges + bridgeEdges,
      cacheAge: Date.now() - lastGraphBuild,
      routeCacheSize: routeCache.size
    });
  } catch (err: any) {
    return NextResponse.json({ 
      error: err.message 
    }, { status: 500 });
  }
}
