"use client";

import SwapPanel from '../components/swap/swapPanel';
import { RouteCard } from '../components/routeCard';
import { RouteGraph } from '../components/routeGraph';
import TestnetDashboard from '../components/testnet/TestnetDashboard';
import { useRouter } from '../hooks/useRouter';
import { useAccount } from 'wagmi';
import { useState } from 'react';

export default function Home() {
  const { route } = useRouter();
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<'swap' | 'testnet'>('swap');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">BetterETH Router</h1>
            <div className="flex items-center space-x-4">
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveTab('swap')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'swap' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Swap
                </button>
                <button
                  onClick={() => setActiveTab('testnet')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'testnet' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Testnet
                </button>
              </div>
              {address ? (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Connect wallet to start</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === 'swap' ? (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Swap Panel */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4">Swap Tokens</h2>
                  <SwapPanel />
                </div>
              </div>

              {/* Route Details */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4">Route Details</h2>
                  {route ? (
                    <div className="space-y-4">
                      {/* Route Summary */}
                      <div className="p-4 bg-card rounded-lg border">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-muted-foreground">Expected Output</span>
                          <span className="font-medium">
                            {route.totalExpectedOut.toFixed(6)} {route.outputToken.token}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-muted-foreground">Total Gas</span>
                          <span className="font-medium">${route.totalGasUSD.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Worst Case</span>
                          <span className="font-medium text-orange-500">
                            {route.worstCaseOut.toFixed(6)} {route.outputToken.token}
                          </span>
                        </div>
                      </div>

                      {/* Route Hops */}
                      <div className="space-y-2">
                        <h3 className="font-medium">Route Steps</h3>
                        {route.hops.map((hop, index) => (
                          <RouteCard key={index} hop={hop} />
                        ))}
                      </div>

                      {/* Route Visualization */}
                      <div className="p-4 bg-card rounded-lg border">
                        <h3 className="font-medium mb-2">Route Visualization</h3>
                        <RouteGraph route={route} />
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 bg-card rounded-lg border border-dashed text-center">
                      <p className="text-muted-foreground">
                        Find a route to see details here
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
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
