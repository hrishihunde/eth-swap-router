"use client";

import { EnhancedSwapPanel } from '@/components/swap/EnhancedSwapPanel';
import TestnetDashboard from '@/components/testnet/TestnetDashboard';
import { useAccount } from 'wagmi';
import { useState } from 'react';
import { Activity, Zap } from 'lucide-react';

export default function Home() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<'swap' | 'testnet'>('swap');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold">ZugZwang</h1>
                <p className="text-[10px] text-muted-foreground hidden sm:block">
                  Optimized Cross-Chain Swaps
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex space-x-1 bg-muted p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('swap')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'swap' 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Swap
                </button>
                <button
                  onClick={() => setActiveTab('testnet')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'testnet' 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Testnet
                </button>
              </div>
              {address ? (
                <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-green-900 dark:text-green-100">
                    {address.slice(0, 4)}...{address.slice(-3)}
                  </span>
                </div>
              ) : (
                <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 bg-muted rounded-lg">
                  <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Not Connected</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {activeTab === 'swap' ? (
          <div>
            <div className="mb-5 text-center space-y-1">
              <h2 className="text-2xl font-bold">Token Swap</h2>
              <p className="text-sm text-muted-foreground">
                Find the best route across multiple chains
              </p>
            </div>
            <EnhancedSwapPanel />
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            <TestnetDashboard />
          </div>
        )}
      </main>
    </div>
  );
}
