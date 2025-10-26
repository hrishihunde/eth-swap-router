import { NextRequest, NextResponse } from 'next/server';
import { generateBenchmark, saveBenchmark, loadLatestBenchmark } from '@/lib/simulation/benchmarkGenerator';

export async function GET(request: NextRequest) {
  try {
    // Try to load existing benchmark
    const existing = loadLatestBenchmark();
    
    if (existing) {
      return NextResponse.json({
        success: true,
        cached: true,
        data: {
          timestamp: existing.timestamp,
          stats: existing.stats,
        }
      });
    }
    
    return NextResponse.json({
      success: false,
      message: 'No benchmark found. Generate one first.',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Starting benchmark generation...');
    
    const benchmark = await generateBenchmark();
    const filepath = saveBenchmark(benchmark);
    
    return NextResponse.json({
      success: true,
      filepath,
      stats: benchmark.stats,
      timestamp: benchmark.timestamp,
    });
  } catch (error) {
    console.error('Benchmark generation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
