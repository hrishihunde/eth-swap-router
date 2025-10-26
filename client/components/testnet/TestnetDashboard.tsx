"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import {
  runQuickTestnetCheck,
  TestnetTestResult
} from "@/lib/testnet/testnet-setup";
import NetworkStatus from './NetworkStatus';
import BenchmarkDashboard from './BenchmarkDashboard';

export default function TestnetDashboard() {
  const [testResults, setTestResults] = useState<TestnetTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'benchmark'>('status');

  const runTests = async () => {
    setIsRunning(true);
    try {
      const results = await runQuickTestnetCheck();
      setTestResults(results.results);
      setLastRun(new Date());
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    void runTests();
  }, []);

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Testnet Dashboard</h2>
          <div className="flex space-x-4 mt-2">
            <button
              onClick={() => setActiveTab('status')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                activeTab === 'status' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Network Status
            </button>
            <button
              onClick={() => setActiveTab('benchmark')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                activeTab === 'benchmark' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Route Benchmarks
            </button>
          </div>
        </div>
        {activeTab === 'status' && (
          <div className="flex items-center space-x-4">
            {lastRun && (
              <span className="text-sm text-muted-foreground">
                Last run: {lastRun.toLocaleTimeString()}
              </span>
            )}
            <Button
              onClick={runTests}
              disabled={isRunning}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Running...' : 'Run Tests'}</span>
            </Button>
          </div>
        )}
      </div>

      {activeTab === 'status' ? (
        <NetworkStatus testResults={testResults} />
      ) : (
        <BenchmarkDashboard />
      )}
    </main>
  );
}
