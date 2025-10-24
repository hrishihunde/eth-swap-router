import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Create results directory if it doesn't exist
    const resultsDir = path.join(process.cwd(), 'results');
    await mkdir(resultsDir, { recursive: true });

    // Create a filename with timestamp
    const filename = `route_comparison_${Date.now()}.json`;
    const filepath = path.join(resultsDir, filename);

    // Save the comparison data
    await writeFile(filepath, JSON.stringify(data, null, 2));

    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error('Error saving comparison:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save comparison' },
      { status: 500 }
    );
  }
}