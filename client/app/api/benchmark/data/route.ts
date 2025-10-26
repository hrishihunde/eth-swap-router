import { NextResponse } from 'next/server';
import { loadLatestBenchmark } from '@/lib/simulation/benchmarkGenerator';

export async function GET() {
  try {
    const benchmark = loadLatestBenchmark();
    
    if (!benchmark) {
      return NextResponse.json({
        success: false,
        message: 'No benchmark data found. Generate one first at /testnet',
      });
    }
    
    return NextResponse.json({
      success: true,
      graph: benchmark.graph,
      vertices: benchmark.vertices,
      stats: benchmark.stats,
      timestamp: benchmark.timestamp,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
