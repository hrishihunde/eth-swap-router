import { NextRequest, NextResponse } from 'next/server';
import { buildRouteGraph, Vertex } from "@/lib/core/router";
import { getAllTokens } from "@/lib/core/token-config";

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

/**
 * GET /api/graph/validate
 * Returns graph structure and validates connectivity
 */
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Validating graph structure...');
    
    const vertices = getSupportedVertices();
    const graph = await buildRouteGraph(vertices, 4);
    
    // Collect statistics
    const allEdges = Object.values(graph).flat();
    const swapEdges = allEdges.filter((e: any) => e.kind === 'swap');
    const bridgeEdges = allEdges.filter((e: any) => e.kind === 'bridge');
    
    // List all bridge connections
    const bridges = bridgeEdges.map((e: any) => {
      const sourceKey = Object.keys(graph).find(key => 
        graph[key].some((edge: any) => edge === e)
      );
      return {
        from: sourceKey,
        to: e.target,
        bridge: e.bridge,
        fee: e.bridgeFee,
        timeDelaySeconds: e.timeDelay
      };
    });
    
    // Check connectivity per network
    const networks = [...new Set(vertices.map(v => v.chain))];
    const networkStats = networks.map(network => {
      const tokensInNetwork = vertices.filter(v => v.chain === network);
      const bridgesFromNetwork = bridges.filter(b => 
        b.from?.includes(`.${network}`)
      );
      const bridgesToNetwork = bridges.filter(b => 
        b.to?.includes(`.${network}`)
      );
      
      return {
        network,
        tokenCount: tokensInNetwork.length,
        bridgesOut: bridgesFromNetwork.length,
        bridgesIn: bridgesToNetwork.length,
        isConnected: bridgesFromNetwork.length > 0 || bridgesToNetwork.length > 0
      };
    });
    
    // Find tokens with no bridges
    const tokensWithNoBridges = vertices
      .filter(v => {
        const outBridges = bridges.filter(b => b.from === v.key);
        const inBridges = bridges.filter(b => b.to === v.key);
        return outBridges.length === 0 && inBridges.length === 0;
      })
      .map(v => v.key);
    
    // Find isolated nodes (no edges at all)
    const isolatedNodes = Object.keys(graph).filter(key => 
      graph[key].length === 0
    );
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      graph: {
        totalNodes: Object.keys(graph).length,
        totalEdges: allEdges.length,
        swapEdges: swapEdges.length,
        bridgeEdges: bridgeEdges.length,
      },
      networks: networkStats,
      bridges: bridges.slice(0, 50), 
      bridgeCount: bridges.length,
      issues: {
        isolatedNodes,
        tokensWithNoBridges: tokensWithNoBridges.slice(0, 20),
        totalDisconnected: tokensWithNoBridges.length
      },
      connectivity: {
        fullyConnected: isolatedNodes.length === 0 && tokensWithNoBridges.length === 0,
        networksCovered: networks.length,
        totalBridges: bridges.length
      }
    };
    
    console.log(`✅ Graph validation complete:`);
    console.log(`   Nodes: ${response.graph.totalNodes}`);
    console.log(`   Swap Edges: ${response.graph.swapEdges}`);
    console.log(`   Bridge Edges: ${response.graph.bridgeEdges}`);
    console.log(`   Isolated Nodes: ${isolatedNodes.length}`);
    console.log(`   Tokens Without Bridges: ${tokensWithNoBridges.length}`);
    
    return NextResponse.json(response);
    
  } catch (err: any) {
    console.error('❌ Graph validation failed:', err);
    return NextResponse.json({ 
      success: false,
      error: err.message 
    }, { status: 500 });
  }
}

/**
 * POST /api/graph/validate
 * Check if specific route is possible
 */
export async function POST(req: NextRequest) {
  try {
    const { source, target } = await req.json();
    
    if (!source || !target) {
      return NextResponse.json({ 
        error: "Missing source or target token" 
      }, { status: 400 });
    }
    
    const vertices = getSupportedVertices();
    const graph = await buildRouteGraph(vertices, 4);
    
    // Check if nodes exist
    if (!graph[source]) {
      return NextResponse.json({
        success: false,
        error: `Source token "${source}" not found in graph`,
        availableTokens: Object.keys(graph).filter(k => k.includes(source.split('.')[0])),
        suggestion: 'Check token key format: SYMBOL.network (e.g., ETH.ethereum)'
      }, { status: 404 });
    }
    
    if (!graph[target]) {
      return NextResponse.json({
        success: false,
        error: `Target token "${target}" not found in graph`,
        availableTokens: Object.keys(graph).filter(k => k.includes(target.split('.')[0])),
        suggestion: 'Check token key format: SYMBOL.network (e.g., USDT.arbitrum)'
      }, { status: 404 });
    }
    
    // Simple BFS to check connectivity
    const visited = new Set<string>();
    const queue = [source];
    visited.add(source);
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (current === target) {
        return NextResponse.json({
          success: true,
          pathExists: true,
          message: `Route from ${source} to ${target} is theoretically possible`
        });
      }
      
      for (const edge of graph[current] || []) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push(edge.target);
        }
      }
    }
    
    // No path found
    const sourceChain = source.split('.')[1];
    const targetChain = target.split('.')[1];
    const sameChain = sourceChain === targetChain;
    
    let suggestion = '';
    if (!sameChain) {
      suggestion = `No bridge path found between ${sourceChain} and ${targetChain}. Try using USDC, USDT, or WETH which have bridge support.`;
    } else {
      suggestion = `Tokens are on the same chain (${sourceChain}) but no swap path exists. This might be a liquidity issue.`;
    }
    
    return NextResponse.json({
      success: false,
      pathExists: false,
      error: `No route possible from ${source} to ${target}`,
      details: {
        sourceChain,
        targetChain,
        sameChain,
        sourceExists: !!graph[source],
        targetExists: !!graph[target],
        sourceEdgeCount: graph[source]?.length || 0,
        targetEdgeCount: graph[target]?.length || 0
      },
      suggestion
    });
    
  } catch (err: any) {
    console.error('Route validation failed:', err);
    return NextResponse.json({ 
      success: false,
      error: err.message 
    }, { status: 500 });
  }
}
