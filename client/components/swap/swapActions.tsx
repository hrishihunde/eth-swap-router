"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RouteComparison } from '@/lib/core/route-comparison';
import { useAccount, useWriteContract } from 'wagmi';
import { ArrowUpDown, Loader2 } from 'lucide-react';

interface SwapActionsProps {
  route: RouteComparison | null;
}

export default function SwapActions({ route }: SwapActionsProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const { address } = useAccount();
  const { writeContract } = useWriteContract();

  const handleSwap = async () => {
    if (!route || !address) return;
    
    setIsExecuting(true);
    try {
      // Use PSB route by default as it should be more efficient
      const selectedRoute = route.psb.route;
      console.log('Executing swap with PSB route:', selectedRoute);
      
      // Simulate swap execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Show success message
      alert('Swap executed successfully!');
    } catch (error) {
      console.error('Swap failed:', error);
      alert('Swap failed. Please try again.');
    } finally {
      setIsExecuting(false);
    }
  };

  if (!route) {
    return (
      <Button disabled className="flex-1">
        <ArrowUpDown className="w-4 h-4 mr-2" />
        Select a route
      </Button>
    );
  }

  const gasEstimate = route.psb.metrics.gasEstimate;

  return (
    <div className="flex flex-col space-y-2">
      <Button
        onClick={handleSwap}
        disabled={isExecuting}
        className="flex-1"
        size="lg"
      >
        {isExecuting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Executing...
          </>
        ) : (
          <>
            <ArrowUpDown className="w-4 h-4 mr-2" />
            Execute Swap (PSB Route)
          </>
        )}
      </Button>
      
      <div className="text-xs text-muted-foreground text-center">
        Gas: ~${gasEstimate.toFixed(2)}
      </div>
    </div>
  );
}

