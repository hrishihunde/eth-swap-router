"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Database, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export default function BenchmarkDashboard() {
  const [generating, setGenerating] = useState(false);
  const [benchmarkInfo, setBenchmarkInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/benchmark/generate', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setBenchmarkInfo(data);
        // Reload the page to update the benchmark in useRouter
        window.location.reload();
      } else {
        setError(data.error || 'Failed to generate benchmark');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate benchmark');
    } finally {
      setGenerating(false);
    }
  }

  async function checkExisting() {
    try {
      const response = await fetch('/api/benchmark/data');
      const data = await response.json();
      
      if (data.success) {
        setBenchmarkInfo({
          stats: data.stats,
          timestamp: data.timestamp,
          filepath: 'results/' + data.timestamp,
        });
      }
    } catch (err) {
      console.error('Failed to check existing benchmark:', err);
    }
  }

  useEffect(() => {
    checkExisting();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2">Benchmark Generator</h2>
        <p className="text-muted-foreground">
          Generate and manage routing benchmark data with ~100,000 edges
        </p>
      </div>

      {/* Status Card */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              benchmarkInfo ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <Database className={`w-6 h-6 ${
                benchmarkInfo ? 'text-green-600' : 'text-gray-400'
              }`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Benchmark Status</h3>
              <p className="text-sm text-muted-foreground">
                {benchmarkInfo ? 'Active benchmark loaded' : 'No benchmark generated yet'}
              </p>
            </div>
          </div>
          {benchmarkInfo && (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="w-3 h-3 mr-1" />
              Ready
            </Badge>
          )}
        </div>

        {benchmarkInfo && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-4 bg-muted rounded-lg">
            <div>
              <div className="text-2xl font-bold">{benchmarkInfo.stats?.realTokens || 0}</div>
              <div className="text-sm text-muted-foreground">Real Tokens</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{benchmarkInfo.stats?.syntheticTokens || 0}</div>
              <div className="text-sm text-muted-foreground">Synthetic Tokens</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{benchmarkInfo.stats?.totalEdges?.toLocaleString() || 0}</div>
              <div className="text-sm text-muted-foreground">Total Edges</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{benchmarkInfo.stats?.avgEdgesPerVertex?.toFixed(1) || 0}</div>
              <div className="text-sm text-muted-foreground">Avg Edges/Vertex</div>
            </div>
          </div>
        )}

        {benchmarkInfo && (
          <div className="mt-4 flex items-center text-sm text-muted-foreground">
            <Clock className="w-4 h-4 mr-2" />
            Generated: {new Date(benchmarkInfo.timestamp).toLocaleString()}
          </div>
        )}
      </Card>

      {/* Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Actions</h3>
        
        <div className="space-y-4">
          <div>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              size="lg"
              className="w-full"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating Benchmark...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  {benchmarkInfo ? 'Regenerate Benchmark' : 'Generate Benchmark'}
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Creates ~100,000 edges from real Pyth tokens + synthetic data. Takes 30-60 seconds.
            </p>
          </div>

          {generating && (
            <div className="space-y-2">
              <Progress value={undefined} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">
                Fetching token prices and generating graph...
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <div className="font-medium text-red-900">Error</div>
              <div className="text-sm text-red-700">{error}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Info Card */}
      <Card className="p-6 border-blue-200 bg-blue-50">
        <h3 className="font-semibold text-blue-900 mb-2">How it works</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start">
            <span className="mr-2">1.</span>
            <span>Fetches real tokens from Pyth price feeds</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">2.</span>
            <span>Creates edges between real tokens using actual price ratios</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">3.</span>
            <span>Generates synthetic tokens and edges to reach ~100,000 total edges</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">4.</span>
            <span>Saves the graph to a JSON file with timestamp in results/ folder</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">5.</span>
            <span>The swap page automatically uses this benchmark for routing</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}